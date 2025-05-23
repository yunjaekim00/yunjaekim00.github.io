---
title: Next.js self-host 무중단 배포 - 2 (AWS 끝왕판)
date: 2025-04-13
cssclasses:
  - review2
---
# AWS EKS에 Next.js application 무중단 배포 적용
## 서두
AWS 환경에서 Next.js application (version 14와 15에서 다 테스트 해봤는데 성공)을 Jenkins와 ArgoCD를 이용해 무중단 배포하는 것을 설명할 것이다.
여기서 말하는 **무중단 배포**란 지난 글에서 설명했지만 Rolling Update 그 자체가 아니고, Rolling Update를 하면서 build된 hashed filename의 정적 파일을 교체하면서 생기는 중단 현상을 해결하는 방법이다.

## 전략
1. Next.js application을 Jenkins로 빌드한다.
2. 빌드에서 나온 정적 파일(static files)을 AWS S3에 올린다.
3. S3에 올린 정적 파일은 AWS CloudFront를 통해 CDN으로 제공한다.
4. 배포된 Next.js application이 정적 파일은 이 CDN endpoint를 바라보게 한다.
5. 지난 글에서도 봤듯이 정적인 파일은 최근 2개 배포만 필요하다. Last two builds의 정적 파일을 제외하고 나머지는 삭제한다.

이렇게만 해주면 된다.
우선은 3. AWS S3 bucket의 한 폴더를 CloudFront를 통해 CDN으로 배포하는 것을 해보자.

## 1. AWS CloudFront
#### S3 bucket folder 생성
AWS S3 bucket은 만들어져 있다고 가정하겠다.
AWS console에 들어가 bucket의 root folder에 폴더를 하나 만든다.
나는 `Create folder` 버튼을 누르고 `static`이라는 폴더를 생성해보았다.

![](./_images/Pasted%20image%2020250413155002.png)
테스트를 위해 이 `static` 폴더 안에 `abc.jpg` 파일을 하나 업로드 해놓는다.

#### Create CloudFront distribution
이제 AWS CloudFront 메뉴로 간다.
우측 상단에 `Create distribution`을 클릭.

![](./_images/Pasted%20image%2020250414093141.png)

`Origin domain`을 누르면 S3 bucket 목록이 drop down 메뉴로 뜨는데 선택하면 `Name`도 채워진다.
`Origin path - optional`에는 만든 폴더의 이름인 `/static`이라고 적는다. → 이것을 적으면 CDN 주소에 `/static`을 생략할 수 있다. 즉, 브라우저에 `https://{cdn-url}/static/abc.jpg`가 아닌 `https://{cdn-url}/abc.jpg`로 access 할 수 있다.
위 값을 입력하고 나면 아래 메뉴가 뜬다.

![](./_images/Pasted%20image%2020250414093935.png)

1~2년전까지는 세번째 메뉴인 `Legacy access identities`인 OAI를 이용했지만 이제는 보안상 더 안전한 두번째 메뉴인 `Origin access control settings (recommended)`를 택하고 드랍다운 메뉴에서 S3 bucket을 선택하고 `Create new OAC`를 클릭한다.
(S3 bucket policy 경고가 나오는데 이건 추후에 설정한다.)

밑으로 나오는 옵션들에게 대해는 default로 하고
![](./_images/Pasted%20image%2020250414094345.png)
WAF 메뉴에서 아무거나 선택 가능하지만 첫번째 `Enable security protections`를 선택하면 천만 request마다 14달러 금액이 추가 지불된다.

![](./_images/Pasted%20image%2020250414095532.png)
이 메뉴를 조정해주지 않으면 `https://ddddexample.cloudfront.net`라는 URL이 자동으로 설정되는데, 내 도메인으로 연결하고 싶으면 설정한다. 예: `https://cdn.example.com`으로 설정할 수 있다.
그러나 여기에만 입력하면 자동으로 DNS가 적용되는 것이 아니고, AWS Route53에 A record를 설정해야 적용된다. (추후에 할 예정)

우리는 AWS ACM에 인증서를 등록했기 때문에
![](./_images/Pasted%20image%2020250414094612.png)
인증서를 선택하면 자동으로 cdn endpoint를 `https://`로 접속할 수 있다.

위에 설정이 다 끝났으면 나머지는 default setting으로 하고 우측 하단의 `Create distribution`을 클릭하여 생성한다.

#### Update S3 policy
CloudFront distribution이 생성된 후 클릭하고
위에 탭 중 Origins → Edit를 클릭하면
![500](./_images/Pasted%20image%2020250414102903.png)
중간에 다음 버튼이 보인다.
여기서 Copy policy를 클릭하고
![250](./_images/Pasted%20image%2020250414102949.png)
설정해놓은 S3 bucket의 policy를 edit한다.

```json
{
    "Version": "2012-10-17",
    "Id": "VpcSourceIp",
    "Statement": [
        {
            "Sid": "VpcSourceIp",
						... 이미 설정이 되어있는 부분 밑에 추가
        },
        {
            "Sid": "AllowCloudFrontServicePrincipal",
            ... 여기다가 추가해준다.
        }
    ]
}
```

위에처럼 이미 설정이 되어있는 policy가 있다면 복사한 것을 밑에 추가해준다.

#### AWS Route53
Route53에 들어가 A record를 등록해준다.
![](./_images/Pasted%20image%2020250414103428.png)
Record type을 `A`로 지정하고
Alias를 선택하고, `Alias to CloudFront distribution`을 선택하고 설정해준다.

#### CORS
이 CDN을 Next.js의 웹 페이지에서 액세스하기 위해 CORS설정을 해준다.
다시 AWS CloudFront 메뉴로 가서
좌측메뉴에 **Policies** 선택
위 메뉴에서 **Response headers** 선택
밑에 *Create response headers policy* 클릭

![](./_images/Pasted%20image%2020250414104349.png)

설정에서 아래와 같은 방식으로 allow 해준다.
![](./_images/Pasted%20image%2020250414104627.png)

위와 같이 생성된 custom policy를 이제 CloudFront distribution에 할당해주면 된다.
다시 좌측메뉴 에서 Distribution 선택 → 해당 선택
*Behaviors* 탭에서 선택하고 Edit
*Response headers policy - optional* 에서 위에서 만든 것 적용 → Save

이제 브라우저에서 엑세스가 되는지 테스트 해본다.
`https://cdn.example.com/abc.jpg` 제대로 뜨면 CDN 설정은 완료되었다.


## 2. keeping static files of the last two builds
#### 전략적 고민
진행하기 전에 이 문제에 대해서 고민을 해보자.
지난 글에서 봤듯이 **무중단 배포**를 위해서 우리는 
기존에 배포되어있는 정적파일 → **노란색, N-1번째 배포 파일**라고 부르자
그리고 새로 배포가 된 정적파일 → **파란색, N번째 배포 파일**라고 부르자
이 두 개만 유지하면 되고
그 이전에 배포되어있던 정적파일 → **빨간색, N-2번째 배포 파일**라고 부르자
이것은 필요가 없으니 삭제해주는 것이 좋다.
만약 배포를 딱 3번만 했다면 이 3가지가 한 폴더에 섞여있을 것이다.

![center|200](./_images/cdn002.png)

저 CDN이라는 이름의 컵에 필요없는 N-2번째 빨간색 파일을 어떻게 삭제해 줄 것인가?
저 구슬(정적 파일) 하나만 없어도 웹페이지가 `client error`라는 문구와 함께 blank page가 떠버리는 모든 파일이 소중하지만, 사실 용량 자체는 별로 되지 않는다.
한 개당 kb단위. 그래서 무한정 쌓아둘 수도 있겠다.

그러나 N-2번째 파일들을 지우면 좋겠는데 어떻게 지울까?
혹시나... CDN이라는 컵 자체를 싹 비워버리고 N-1과 N번째 구슬만 담자라는 생각은 동작하지 않는다. 왜냐하면 CDN을 비우는 순간 바로 웹페이지가 에러가 나기 때문이다.
즉, 빨간 구슬이 담겨있는 상태에서 노란 구슬과 파란 구슬을 다 **담은 후**에 빨간 구슬을 빼내야한다.

여러 가지 방법이 있을 수 있겠다.
내가 생각해 낸 방법은 처음부터 폴더로 정리하는 방법이다.

![center|200](./_images/cdn001.png)
폴더별로 담아놓고 빨간 폴더만 삭제해주면 된다. (참고: 위 두 이미지는 GPT로 그린 그림)

그러나 이 방법도 단점이 있다.
1. Next.js application이 어떤 폴더를 바라보는지 알아야하고
2. Jenkins가 어떤 폴더에 업로드를 해야하는지 알아야하고
3. ArgoCD(K8s pod)가 어떤 폴더를 봐야하는지
이 세 가지를 다 약속을 해서 통일해줘야 가능한 일이다.

그래서 통일을 시켜주어서 배포하였다. 방법은 아래 정리하겠다.

#### pipeline code 수정
우리가 사용하는 pipeline 코드에서 다른 application에는 영향을 주지 않기 위해 우선 `scm_scripts/moonstore-next-fo-vanilla.properties`파일을 수정해두자

```
# -----------------------------------
ENABLE_S3_UPLOAD_YN         = Y
ENABLE_S3_CACHE_YN          = N
ENABLE_BUILD_YN             = N
ENABLE_DOCKER_YN            = N
ENABLE_DOCKER_NODE_YN       = N
ENABLE_DOCKER_NUXT_YN       = N
ENABLE_DOCKER_NODE_PNPM_YN  = Y
ENABLE_DEPLOY_YN            = Y
# -----------------------------------
```

위에는 전부 수동으로 설정한 변수로 Dockerfile 다른 것을 쓰기 위해 위에처럼 설정해놓았다.

`pipeline/pipline.groovy`파일의 516번째 line에 아래 코드 추가해주었다.
```groovy
    } else if (ENABLE_DOCKER_NODE_PNPM_YN == "Y") {
        this.buildDockerNext()
```

그리고 265번째 line에 다음을 추가하였다.
```groovy ln:265
def buildDockerNext() {
    stage('Docker Image') {
        dir("project") {
            retry(3) {
                def img = docker.build(
                    "${DOCKER_IMAGE_NAME}:latest",
                    "-f \"Dockerfile\" . \
                    --build-arg NEXT_BUILD_NUM=${env.BUILD_NUMBER} \
                    --build-arg BUILD_PROFILE=${BUILD_PROFILE} \
                    --build-arg START_PROFILE=${START_PROFILE} \
                    "
                )
                docker.withRegistry("${DOCKER_REPO_URL}", "${DOCKER_REPO_CREDENTIALS_ID}") {
                    retry(5) {
                        try{
                            img.push("latest")
                        } catch (e) {
                            sleep(10)
                            throw e
                        }
                    }
                }
            }
        }
    }
}
```

일반 FO에서 쓰던 코드 대비 딱 한 줄이 추가되었다.

```
		--build-arg NEXT_BUILD_NUM=${env.BUILD_NUMBER} \
```

코드의 다른 곳에 아무데도 `BUILD_NUMBER`라는 변수를 선언해주지 않았다. Jenkins의 고유 syntax로 저렇게 `${env.BUILD_NUMBER}`이것만 사용해주면 Jenkins 현재 Item에서 사용되는 현재 build number를 가져온다. 이것을 Dockerfile에 인자로 전달해주는 것이다.

#### Next.js 코드 수정
Next.js code를 git clone한 후에
테스트하기 위한 새로운 feature branch를 하나 딴다.

`next.config.js` 파일에 33번째 line에 다음 코드를 추가
```js
const cdnUrlforStatic = 'cdn-fo.x2bee.com'
```

61번째 line부터 전부 `${cdnUrlforStatic}`을 추가하였다.
```js
const contentSecurityPolicy = `
  default-src 'self';
  script-src 'self' ${cdnUrlforStatic} 'unsafe-inline' 'unsafe-eval' blob: repo.whatap-browser-agent.io/rum/prod/ static.nid.naver.com developers.kakao.com  appleid.cdn-apple.com t1.daumcdn.net t1.kakaocdn.net stdpay.inicis.com stdux.inicis.com nice.checkplus.co.kr umami.x2bee.com js.tosspayments.com;
  connect-src 'self' rum-ap-northeast-2.whatap-browser-agent.io nice.checkplus.co.kr umami.x2bee.com event.tosspayments.com apigw-sandbox.tosspayments.com apigw.tosspayments.com google-analytics.com overbridgenet.com;
  style-src 'self' ${cdnUrlforStatic} 'unsafe-inline' stdpay.inicis.com;
  font-src ${cdnUrlforStatic} 'self' data:;
  worker-src 'self' ${cdnUrlforStatic} blob:;
  img-src ${cdnUrlforStatic} ${imgSrcPolicy}
  media-src ${cdnUrlforStatic} ${mediaSrcPolicy}
  frame-src ${cdnUrlforStatic} ${frameSrcPolicy}
  frame-ancestors ${cdnUrlforStatic} ${frameAncestorsPolicy}
  form-action 'self' stdpay.inicis.com nice.checkplus.co.kr mobile.inicis.com inilite.inicis.com  sharer.kakao.com accounts.kakao.com;
`
```

(물론 refactoring의 여지는 남아있지만 일단 추가)
위 코드는 외부 도메인에서 파일을 가져오는 것을 허용해주기 위해서 CSP(Content Security Policy)를 설정하는 것으로 Next.js에서 꼭 필요하다.

그리고 `next.config.js` 파일의 가장 밑에 다음을 추가하였다.
```js
  },
  assetPrefix: (() => {
    switch (process.env.APP_ENV) {
      case 'development':
        if (process.env.CI === 'true') {
          return process.env.NEXT_ASSET_PREFIX || ''
        }
        return ''
      default:
        return ''
    }
  })()
}

module.exports = withNextIntl(nextConfig)
```

위 코드에서 새로 등장한 `NEXT_ASSET_PREFIX` 와 `CI`라는 환경변수는 Next.js에 있는 `.env.development.set` 혹은 다른 `.env` 파일에 정의해놓지 않고 저렇게 둔다. → 왜냐하면 이건 Dockerfile에서 돌릴 때 주입해 줄 환경변수이라 local에서는 필요없다.

`CI`를 추가한 이유는 개발자들이 local 환경에서 `npm run build:dev`를 돌릴 때 잘 작동하도록 해노았다. local에서는 `CI`값을 설정 안 해놨으니 당연히 `true`가 아닐 것이고 이건 Dockerfile에서 true를 주입해 줄 것이다.

#### 다시 pipeline 코드
129번째 line에 다음을 추가해주었다.
```groovy
    } else if (ENABLE_DOCKER_NODE_PNPM_YN == "Y") {
        sh """#!/bin/bash
        cp -r scm/docker/DockerfileForNodePnpm project/Dockerfile &> /dev/null
        cp -r scm/license/ project/ &> /dev/null
        """
```

#### Dockerfile
그리고 `docker/DockerfileForNodePnpm`이라는 파일을 새로 생성하였다.
```Dockerfile
FROM node:lts-alpine3.21

ARG BUILD_PROFILE=build:dev
ENV BUILD_PROFILE ${BUILD_PROFILE}
ARG START_PROFILE=start:dev
ENV START_PROFILE ${START_PROFILE}
ARG NEXT_BUILD_NUM
ENV NEXT_BUILD_NUM ${NEXT_BUILD_NUM}
ARG NEXT_ASSET_PREFIX
ENV NEXT_ASSET_PREFIX ${NEXT_ASSET_PREFIX}
ENV CI=true
ENV NODE_OPTIONS="--max-old-space-size=8192"

USER root
WORKDIR /app
ADD . /app/

# Install dependencies
RUN corepack enable && \
    corepack prepare pnpm@latest --activate

# Set npm to use the private registry
RUN npm config set registry http://10.0.2.208:8081/repository/npm-proxy/

RUN pnpm install

# Build the application
RUN NEXT_ASSET_PREFIX=https://cdn-fo.x2bee.com/${NEXT_BUILD_NUM} npm run ${BUILD_PROFILE}

# Expose application port
EXPOSE 3000

# Start the application
CMD npm run ${START_PROFILE}
```

위 코드를 보면 `CI=true`를 해놓고
pipeline.groovy에서 받은 `${NEXT_BUILD_NUM}` 인자를 가지고
`RUN NEXT_ASSET_PREFIX=https://cdn-fo.x2bee.com/${NEXT_BUILD_NUM} npm run ${BUILD_PROFILE}`
URL을 생성하여 환경변수를 주입시켰다.

추가로 pipeline에 넣어 줄 코드가 더 있지만 그 전에 필요한 Jenkins plugin을 설치해주자.


## 3. Jenkins plugin 설치
#### Jenkins plugin 설치
Jenkins에서 AWS S3 bucket에 파일을 업로드하기 위해서
Jenkins를 설치한 Docker container에 AWS CLI를 설치하여 `aws s3`라는 명령어를 pipeline의 stage에 shell script로 적용하는 방법도 있다.
그러나 이럴 시 문제점은 Terraform도 마찬가지지만 shell script을 넣으면 에러가 나서 실행이 안 되도 다음 단계로 넘어가버리는 문제가 있는데 이것은 다른 글에 더 자세히 설명하기로 하고,
중요한 것은 다음 Jenkins plugin을 설치하면 pipeline 코드 내에서 `s3Upload`라는 명령어를 사용할 수 있게 된다. 
그래서 docker container에 AWS CLI를 설치할 필요없이 다음 플러그인을 설치한다.
![](./_images/Pasted%20image%2020250414123951.png)
그리고 추가로 다음 플러그인을 설치해주면 AWS access key를 Jenkins 내에 저장할 수 있다.
![](./_images/Pasted%20image%2020250414123526.png)
#### AWS Credentials 등록
위 두 플러그인을 설치하고 `Jenkins관리 > Credentials`를 가면 다음과 같이 AWS Credentials를 저장할 수 있는 메뉴가 drop down 메뉴에 생긴다.

![](./_images/Pasted%20image%2020250414124215.png)
pipeline code에서 사용해야하니 생성하고 `id` 이름을 잘 기억해둔다.
다시 pipeline code로 돌아온다.

## 4. S3로 upload
#### pipeline code for S3 upload
`pipeline/pipline.groovy` 522번째 line에 다음 코드를 추가하였다.

```groovy ln:522
    if (ENABLE_S3_UPLOAD_YN == "Y") {
        this.extractNext()
        this.uploadToS3()
        this.cleanupOldStaticFiles()
    }
```

세 가지 함수를 만들 것이다.

**1. extractNext()**
Dockerfile로 말아서 Nexus에서 올린 image 파일에서 정적 파일(static file)을 추출해서 임시의 workspace에 저장해주는 일을 할 것이다.
**2. uploadToS3()**
추출해 낸 정적인 파일을 Build Number에 해당하는 폴더에 업로드할 함수이다.
**3. cleanupOldStaticFiles()**
전전 (N-2번째 빌드)에서 S3에 업로드한 폴더를 삭제해 줄 함수이다.

**1. extractNext()**
각각의 코드를 보자면, pipline.groovy의 322번째 줄에 추가하였다.
```groovy
def extractNext(){
    stage('Extract .next Folder') {
        script {
            sh """#!/bin/bash
                rm -rf /var/jenkins_home/mnt/${APP_NAME}-next-${PRJ_TARGET}
                rm -rf /var/jenkins_home/mnt/${APP_NAME}-next-${PRJ_TARGET}@tmp
                mkdir -p /var/jenkins_home/mnt/${APP_NAME}-next-${PRJ_TARGET}/_next/static
                chmod -R 777 /var/jenkins_home/mnt/${APP_NAME}-next-${PRJ_TARGET}
            """

            sh """
                if docker ps -a --format '{{.Names}}' | grep -q '^${APP_NAME}-temp-container-${PRJ_TARGET}\$'; then
                    echo "Removing existing container '${APP_NAME}-temp-container-${PRJ_TARGET}'"
                    docker rm -f ${APP_NAME}-temp-container-${PRJ_TARGET}
                fi

                docker create --name ${APP_NAME}-temp-container-${PRJ_TARGET} ${DOCKER_IMAGE_NAME}:latest
                # docker cp ${APP_NAME}-temp-container-${PRJ_TARGET}:/app/public /var/jenkins_home/mnt/${APP_NAME}-next-${PRJ_TARGET}/
                docker cp ${APP_NAME}-temp-container-${PRJ_TARGET}:/app/.next/static /var/jenkins_home/mnt/${APP_NAME}-next-${PRJ_TARGET}/_next/

                if [ -d "/var/jenkins_home/mnt/${APP_NAME}-next-${PRJ_TARGET}/_next/static" ]; then
                    echo "Copy completed, checking files..."
                    until [ \$(ls -1 /var/jenkins_home/mnt/${APP_NAME}-next-${PRJ_TARGET}/_next/static | wc -l) -gt 0 ]; do
                        echo "Waiting for files to be available in /var/jenkins_home/mnt/${APP_NAME}-next-${PRJ_TARGET}/_next/static..."
                        sleep 1
                    done
                    echo "Files are now available in /var/jenkins_home/mnt/${APP_NAME}-next-${PRJ_TARGET}/_next/static"
                else
                    echo "Directory /var/jenkins_home/mnt/${APP_NAME}-next-${PRJ_TARGET}/_next/static does not exist!"
                    exit 1
                fi
            """
        }
    }
}
```

코드를 보면 docker image에서 임시의 container를 만들고, 정적인 파일을 추출하여, `jenkins_home`에 임시의 폴더를 만들어서 저장한다.

**2. uploadToS3()**
다음 코드를 만들기 전에 코드의 확장성을 위해
`scm_scripts/moonstore-net-fo-vanilla.properties`에 다음 변수를 선언해준다.
```
# Object Storage Repository Setting
S3_SOURCE_DIRS          = ./static
S3_BUCKET_NAME_DEV      = static-s3-bucket
S3_KEY_DEV              = /_next/static
```
(위에서 S3_KEY는 키가 아니고 destination folder 명인데 이름을 조금 잘못 지었다)

위 변수들은 `pipeline/Jenkinsfile`에서 `_DEV`라는 이름을 다음 코드로 떼게 된다.
```
        stage('Prepare') {
            steps{
                script {
                    switch("${PRJ_TARGET}"){
                        case "dev":
                            JAVA_OPS                = "${JAVA_OPS_DEV}"
                            GIT_BRANCH              = "${params.BRANCH}"
                            S3_BUCKET_NAME          = "${S3_BUCKET_NAME_DEV}"
                            S3_PROFILE              = "${S3_PROFILE_DEV}"
                            S3_KEY                  = "${S3_KEY_DEV}"
```

이제 pipeline.groovy코드의 358번째 line에 추가하였다.
```groovy

def uploadToS3() {
    stage('Upload Static Files To S3') {
        script {
            // Create a deployment-specific folder using the Jenkins BUILD_NUMBER
            def deploymentFolder = "static/${env.BUILD_NUMBER}${S3_KEY}"  
            s3Upload(
                bucket: "${S3_BUCKET_NAME}",
                path: deploymentFolder,
                workingDir: "/var/jenkins_home/mnt/${APP_NAME}-next-${PRJ_TARGET}/_next/static",
                includePathPattern: '**/*' 
            ) 
        }
    }
}
```
Jenkins item의 build number를 이용해 그 폴더에 업로드 해준다.
위에서 얘기한 것처럼 AWS CLI를 설치한 것이 아니라 plugin을 설치했기 때문에 `aws s3 sync`라는 명령어는 먹히지 않고, Jenkins 고유의 플러그인인 `S3Uploader`의 고유의 syntax인 `s3Upload`라는 명령어를 사용한다.

**3. cleanupOldStaticFiles()**
이제 전전벌드의 폴더를 S3에서 삭제해준다.
```groovy
def cleanupOldStaticFiles() {
    stage('Cleanup Old Static Files') {
        script {
            // Step 1: List objects in the S3 bucket to find deployment folders
            def s3Objects = s3FindFiles(
                bucket: "${S3_BUCKET_NAME}",
                path: "static/",
                onlyDirectories: true
            )
            
            // Step 2: Extract folder names and sort them
            def folders = []
            s3Objects.each { item ->
                // Extract the folder name (build number) from the path
                def folderName = item.name.replaceAll('static/', '').replaceAll('/', '')
                if (folderName) {
                    folders.add(folderName)
                }
            }
            
            // Step 3: Sort folders numerically (assuming they are build numbers)
            folders.sort { a, b -> 
                try {
                    return Integer.parseInt(a) <=> Integer.parseInt(b)
                } catch (NumberFormatException e) {
                    // Fallback to string comparison if not numeric
                    return a <=> b
                }
            }
            
            // Step 4: Keep only the oldest folders (all except the 2 most recent)
            def foldersToDelete = []
            if (folders.size() > 2) {
                foldersToDelete = folders[0..(folders.size() - 3)]
            }
            
            echo "Found deployment folders: ${folders.join(', ')}"
            echo "Folders to delete: ${foldersToDelete.join(', ')}"
            
            // Step 5: Delete each old folder
            foldersToDelete.each { folder ->
                echo "Deleting static/${folder}/"
                s3Delete(
                    bucket: "${S3_BUCKET_NAME}",
                    path: "static/${folder}/",
                    recursive: true
                )
            }
        }
    }
}
```


#### helm chart
간과하기 쉬운 것인데, docker container로 뜨는 것이 아니라 K8s pod로 뜨는 것이기 때문에 K8s pod에도 URL을 주입시켜주어야한다.
다음 코드는 `char/stable/templates/deployment.yaml`파일인데, **다음 코드는 Jenkins에서 실행되는 것이 아니라, ArgoCD에서 실행되는 것이다.** 
그러므로 `${env.BUILD_NUMBER}`가 먹히지 않는다.
대신 ArgoCD는 Jenkins와 이 build number를 공유하고, 이 번호는 `build_number`에 저장되게 된다.
즉, `char/stable/templates/deployment.yaml` 이 파일에 다음 코드를 추가한다. (line 44)

```yaml
            {{ if eq .Values.application.name "moonstore-next-fo-vanilla" }}
            - name: NEXT_ASSET_PREFIX
              value: "https://cdn-fo.x2bee.com/{{ .Values.application.build_number }}"
            {{ end }}
```

이제 모든 준비가 끝났다.

## 검증
`dev-values.yaml`에 min pod를 최소 2보다 크게하고
ArgoCD에 기존 pod와 신규 pod가 공존할 때 새로고침을 해서 에러가 발생하는지 확인한다.

![](./_images/Pasted%20image%2020250414131251.png)