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
![](./_images/Pasted%20image%2020250414102903.png)
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
진행하기 전에 이 문제에 대해서 고민을 해보자.
지난 글에서 봤듯이 **무중단 배포**를 위해서 우리는 
기존에 배포되어있는 정적파일 → **노란색, N-1번째 배포 파일**라고 부르자
그리고 새로 배포가 된 정적파일 → **파란색, N번째 배포 파일**라고 부르자
이 두 개만 유지하면 되고
그 이전에 배포되어있던 정적파일 → **빨간색, N-2번째 배포 파일**라고 부르자
이것은 필요가 없으니 삭제해주는 것이 좋다.
만약 배포를 딱 3번만 했다면 이 3가지가 한 폴더에 섞여있을 것이다.

![center|200](_images/cdn002.png)

저 CDN이라는 이름의 컵에 필요없는 N-2번째 빨간색 파일을 어떻게 삭제해 줄 것인가?
저 구슬(정적 파일) 하나만 없어도 웹페이지가 `client error`라는 문구와 함께 blank page가 떠버리는 모든 파일이 소중하지만, 사실 용량 자체는 별로 되지 않는다.
한 개당 kb단위. 그래서 무한정 쌓아둘 수도 있겠다.

그러나 N-2번째 파일들을 지우면 좋겠는데 어떻게 지울까?
혹시나... CDN이라는 컵 자체를 싹 비워버리고 N-1과 N번째 구슬만 담자라는 생각은 동작하지 않는다. 왜냐하면 CDN을 비우는 순간 바로 웹페이지가 에러가 나기 때문이다.
즉, 빨간 구슬이 담겨있는 상태에서 노란 구슬과 파란 구슬을 다 **담은 후**에 빨간 구슬을 빼내야한다.

여러 가지 방법이 있을 수 있겠다.
내가 생각해 낸 방법은 처음부터 폴더로 정리하는 방법이다.

![center|200](_images/cdn001.png)
폴더별로 담아놓고 빨간 폴더만 삭제해주면 된다.

그러나 이 방법도 단점이 있다.
1. Next.js application이 어떤 폴더를 바라보는지 알아야하고
2. Jenkins가 어떤 폴더에 업로드를 해야하는지 알아야하고
3. ArgoCD(K8s pod)가 어떤 폴더를 봐야하는지
이 세 가지를 다 약속을 해서 통일해줘야 가능한 일이다.



