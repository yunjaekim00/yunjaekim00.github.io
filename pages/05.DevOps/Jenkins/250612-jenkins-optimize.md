---
title: Jenkins 빌드 개선
date: 2025-06-12
---
# Jenkins 빌드 개선
## 문제점
#### 1. 빌드 속도
IDC에 docker container로 설치한 Jenkins (stage기)에서 x2bee-bo라는 Next.js application이
"Docker Image Node build"단계가 25분 이상
"Docker Image Node push"단계가 13분 이상 소요가 되었다.
이는 EC2에 설치한 Jenkins (prd기)보다 조금 더 느린 상태였다.
#### 2. Docker image 크기
x2bee-bo가 docker build를 하고 Nexus에 push하는 이미지 크기가 6.96Gb이다. 
하나의 application 치고는 큰 사이즈다.

## 빌드 속도 개선
### Docker-Buildx란
**Docker BuildKit**은 2023년 Docker **23**버전부터 디폴트로 들어가게 된 비교적 최신 엔진으로 
- 병렬로 layer를 빌드할 수 있고
- cache mechanism도 좀 더 효율적이다

현재 docker container에는 
```sh
docker exec -it jenkins bash
docker --version
Docker version 28.2.1, build 879ac3f
```

28버전이기 때문에 이미 BuildKit은 내장되어있다.

**Docker Buildx**는 docker version 24 이후로는 내장(built-in)되어있다. → **그러므로 따로 설치할 필요는 없다**.
Buildx를 이용하면 BuildKit 기능에 추가로 **registry-based caching** 기능을 지원한다. 그러므로 Buildx를 이용해 빌드 시간을 save 해본다.

### Jenkinsfile (groovy) 수정
Groovy pipeline code에서 'Build docker node'와 'push' stage 두 단계(기존 코드)에서 buildkit를 사용하도록 수정하고 이 두 단계를 하나로 합쳤다.

`docker.groovy`파일 코드 일부
```groovy ln:true
def buildDockerNode() {
    stage('Docker Build and Push') {
        dir("project") {
            retry(2) {
                withCredentials([usernamePassword(
                    credentialsId: "${DOCKER_REPO_CREDENTIALS_ID}",
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh """
                        # Login to registry
                        echo \$DOCKER_PASS | docker login ${DOCKER_REPO_URL} -u \$DOCKER_USER --password-stdin
                        
                        # Use buildx for better performance
                        docker buildx create --use --name jenkins-builder --driver docker-container || docker buildx use jenkins-builder
                        
                        # Build and push in one step with registry caching
                        docker buildx build \
                            --cache-from type=registry,ref=${DOCKER_IMAGE_NAME}:buildcache \
                            --cache-to type=registry,ref=${DOCKER_IMAGE_NAME}:buildcache,mode=max \
                            --cache-from ${DOCKER_IMAGE_NAME}:latest \
                            --build-arg BUILD_PROFILE=${BUILD_PROFILE} \
                            --build-arg START_PROFILE=${START_PROFILE} \
                            --push \
                            -t ${DOCKER_IMAGE_NAME}:latest \
                            -f Dockerfile \
                            .
                    """
                }
            }  
        }
    }
}
```

위 수정된 코드를 살펴보자면 

**line 15**: `docker buildx create --use --name jenkins-builder --driver docker-container || docker buildx use jenkins-builder` → 이미 *jenkins-builder*가 있으면 그것을 재사용하고, 없으면 jenkins-builder라는 이름의 builder를 사용한다. 별도의 *docker-container* driver로 dedicated cache 공간을 지녀서 캐싱을 좀 더 효율적으로 관리해준다.

**line 18~27**:
간략히 보자면, 기본적으로 기존 pipeline 코드에서는 
```sh
docker build -t myimage .
docker push myimage  
```
빌드 후에 local에 이미지를 load하고, 두번째 단계에서 push를 했다면
위의 개선된 코드는 기본적으로
```sh
docker buildx build --push -t myimage .
```
위와 같이 local에 load하는 단계없이 빌드와 push가 동시에 이루어진다

**line 19~20**:
```sh
--cache-from type=registry,ref=${IMAGE}:buildcache
--cache-to type=registry,ref=${IMAGE}:buildcache
```
이 코드는 캐시를 레지스트리에 저장한다.

기존 코드에서는
```sh
docker exec -it jenkins bash
```
한 후에

```sh
docker buildx ls
NAME/NODE DRIVER/ENDPOINT STATUS  BUILDKIT             PLATFORMS
default * docker
  default default         running v0.11.6+616c3f613b54 linux/amd64, linux/amd64/v2, linux/amd64/v3, linux/386
```
해보면 default builder만 있지만

개선된 코드로 Jenkins를 돌린 후에 해보면
```sh
docker buildx ls
NAME/NODE              DRIVER/ENDPOINT                   STATUS    BUILDKIT   PLATFORMS
jenkins-builder*       docker-container                                       
 \_ jenkins-builder0    \_ unix:///var/run/docker.sock   running   v0.22.0    linux/amd64, linux/amd64/v2, linux/386
default                docker                                                 
 \_ default             \_ default                       running   v0.22.0    linux/amd64, linux/amd64/v2, linux/38
```

`jenkins-builder`가 추가된 것을 볼 수 있다.

### 효과
Buildx를 사용하지 않았던 기존 코드는
1. local에서 이미지를 빌드 (~19분)
2. docker daemon에 빌드한 image를 load (~3분)
3. push to registry (~7분)
정도의 시간이 소요되었다면
  
개선된 코드는 위에 2번 단계가 없으며
1~3번이 동시에 이루어질 수 있도록 하나의 단계로 합친다.
그러나 처음 빌드시에는 시간이 많이 소요 (IDC서버에서는 38분 정도) 되지만
그 다음 빌드부터는 캐시를 이용해 속도가 훨씬 빨라진다.

→ 어차피 최초 빌드는 DevOps인 내가 돌리므로 추후 Jenkins 돌리는 개발자들에게 무관

## docker image 크기 개선
### **Multi-stage** dockerfile로 수정
Multi-stage Dockerfile이 왜 이미지 크기를 줄이기 위해서 필수인지는 내가 팀블로그에 쓴 글을 참조 → https://x2bee.tistory.com/479

우선 큰 그림을 보자면 `Dockerfile`을 다음과 같이 3단계로 구현할 것이다.
```Dockerfile
# Stage 1: Dependencies
FROM node:20.10.0-alpine3.18 AS deps
# Installs all dependencies

# Stage 2: Builder  
FROM node:20.10.0-alpine3.18 AS builder
# Builds the application

# Stage 3: Runner
FROM node:20.10.0-alpine3.18 AS runner
# Only includes what's needed to run
```

Buildx는 위 3가지 stage를 **병렬(simultaneous)** 로 실행할 수 있다.

전체 코드는 다음과 같다.
`Dockerfile_node_yarn`을 다음과 같이 수정한다.

```Dockerfile ln:true
# syntax=docker/dockerfile:1
FROM node:20.10.0-alpine3.18 AS deps

WORKDIR /app

COPY package.json ./
# 아래 폴더는 우리가 따로 만든 library
COPY src/lib ./src/lib

# Install dependencies with local packages available
RUN --mount=type=cache,target=/root/.yarn \
    --mount=type=cache,target=/root/.npm \
    yarn install --network-timeout 100000 || npm install

# Build stage
FROM node:20.10.0-alpine3.18 AS builder

ARG BUILD_PROFILE=${BUILD_PROFILE:-build}
ENV NODE_OPTIONS="--max-old-space-size=12288"

WORKDIR /app

# Copy from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./

COPY . .

# Build the application
RUN --mount=type=cache,target=/app/.next/cache \
    yarn ${BUILD_PROFILE} --no-lint

# Start stage
FROM node:20.10.0-alpine3.18 AS runner

ARG START_PROFILE
ENV START_PROFILE ${START_PROFILE}
ENV NODE_OPTIONS="--max-old-space-size=12288"
ENV HOST 0.0.0.0

WORKDIR /app

COPY --from=builder /app .

EXPOSE 80

CMD yarn ${START_PROFILE}
```

line 30: `--no-lint` ESLint warning 뜨는 것으로만 빌드 시간을 최소 4~5분 더 잡아먹는다. 개발자들이 1년이 넘도록 lint 수백개 못 잡고 Jenkins 느리다고 불만 중이다. 포기했다. 그래서 Jenkins에서는 lint 체크 안 하도록 추가해주었다.

## 결과
### Jenkins의 docker build 속도
기존 Jenkins-prd (AWS EC2)에서 두 개의 stage (docker build와 push)로 나누었던 단계를
(아래는 `moon-x2bee-bo (prd)`)
![center](./_images/Pasted%20image%2020250613100032.png)
하나로 합쳤다.

처음 빌드는 38분이 걸렸지만 두 번째 빌드부터는 registry cache를 이용하여 시간이 반으로 줄었다.
(아래는 개선된 `moon-x2bee-bo (stg)`)
![center](./_images/Pasted%20image%2020250613100153.png)
storefront (fo)는 다음과 같이 감소하였다.
![](./_images/Pasted%20image%2020250613102317.png)

### docker image 크기
- Docker build는 `yarn install`자체가 많이 차이가 나서 큰 변화를 없지만 → 이미 Docker 28버전이라 default로 BuildKit를 사용 중이라 그럴 수 있다. (그래도 명시적으로 사용해 봤다는 것이 중요하니 → 위에 대부분 의미없는 작업을 한 듯.) 그러나! 캐시 메카니즘은 좀 더 효율적으로 바뀐 것은 사실.
- 그래도 Docker image의 크기는 확실히 multi-stage Dockerfile로 작아졌다.
- **Multi-stage Dockerfile** 전과 후에 빌드된 이미지 크기를 비교해보자면

#### Multi-stage 이전
```sh
> docker images
> REPOSITORY                                                         TAG                  IMAGE ID       CREATED         SIZE
docker.x2bee.com/x2bee-backend/moon-x2bee-bo_stg               latest               1ad3349f46d8   About an hour ago   6.96GB
docker.x2bee.com/x2bee-backend/moonstore-next-fo_stg           latest               e215aaeaf672   About an hour ago   4.32GB
docker-dev.x2bee.com/moon-stg/moon-x2bee-cc_stg                             latest               d8adc716431f   7 days ago          6.94GB
```

#### Multi-stage 이후
```sh
> docker images
> REPOSITORY                                                         TAG                  IMAGE ID       CREATED         SIZE
docker.x2bee.com/x2bee-backend/moon-x2bee-bo_stg               latest               583341119d27   33 minutes ago      1.49GB
docker-dev.x2bee.com/moon-stg/moonstore-next-fo_stg            latest               16dc99beff53   51 minutes ago      2.35GB
docker.x2bee.com/x2bee-backend/moon-x2bee-po_stg                            latest               fcf40df21a2d   16 minutes ago      1.49GB
```

`bo`: **6.96** GB → **1.49** GB로 줄어들었고
`fo` : **4.32** GB → **2.34** GB로 줄어들었다.

### 참고
혹시나 Jenkins 빌드 시 `docker buildx` 명령어가 없어서 error가 난다면

`docker-compose.yml`파일에서
```yaml
  image: jenkins/jenkins:2.511-jdk21
```

이 한 줄을 다음으로 수정하고

```yaml
    build:
      context: .
      dockerfile: Dockerfile.jenkins
```

`Dockerfile.jenkins`라는 파일을 하나 생성하여
다음을 적어준다.

```Dockerfile
FROM jenkins/jenkins:2.511-jdk21

USER root

# Install Docker Buildx
RUN mkdir -p ~/.docker/cli-plugins && \
    curl -L https://github.com/docker/buildx/releases/download/v0.10.5/buildx-v0.10.5.linux-amd64 \
    -o ~/.docker/cli-plugins/docker-buildx && \
    chmod +x ~/.docker/cli-plugins/docker-buildx

# Also install it for the jenkins user
RUN mkdir -p /var/jenkins_home/.docker/cli-plugins && \
    cp ~/.docker/cli-plugins/docker-buildx /var/jenkins_home/.docker/cli-plugins/docker-buildx && \
    chmod +x /var/jenkins_home/.docker/cli-plugins/docker-buildx && \
    chown -R jenkins:jenkins /var/jenkins_home/.docker

USER root
```

