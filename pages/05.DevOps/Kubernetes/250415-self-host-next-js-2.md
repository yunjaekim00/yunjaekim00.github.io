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



