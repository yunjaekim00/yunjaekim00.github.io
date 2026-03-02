---
title: Route53에 도메인 등록 및 ACM 인증서 사용
date: 2025-07-04
---
# Route53에 도메인 등록 및 ACM 인증서 사용
### Domain 구입
도메인을 후이즈에서 구매를 하였다.
처음 구매를 했을 때 후이즈에서 네임서버가 다음과 같이 보인다.
![](./_images/Pasted%20image%2020250704100240.png)
### AWS Route53
AWS console에서 Route53에서 > Hosted Zone 메뉴에서 > Create hosted zone을 누르고
구매한 도메인명을 입력하고 > Create hosted zone 버튼을 누르면
![](./_images/Pasted%20image%2020250704102118.png)
NS(Name Server) 4개와 SOA 1개가 자동으로 생긴다.

다시 도메인을 구입했던 사이트로 와서 네임서버 변경을 해주고
![](./_images/Pasted%20image%2020250704102757.png)
AWS에서 자동 생성된 NS 4개를 등록해준다.

### AWS ACM
AWS console에서 ACM(AWS Certificate Manager) 메뉴로 간다.
우측 상단 'Request(요청)' 버튼을 클릭
도메인명을 입력하면

![](./_images/Pasted%20image%2020250704103243.png)
**Enable export**라는 새로운 메뉴가 생겼다.
과거에는 ACM에 SSL 인증서가 pem 파일로 export가 안 되어 AWS 리소스 내에서만 사용 가능했는데 이제는 export가 된다. 
이 신규 기능은 2025년 6월 17일에 새로 생겼다고 한다. 개별 도메인당 14달러, 와일드카드 인증서는 149달러 (부가가가치세 미포함이겠지)이라고 한다.
그러나 Disable export를 선택하면 무료다. → 이 옵션으로 우선 생성하였다.

생성한 후에 조회를 다시 하고
![](./_images/Pasted%20image%2020250704104016.png)
위 버튼을 누르면 자동으로 Route53에 ACM validation 관련 CNAME이 추가 된다.
이 상태에서 Pending 상태가 약 5분정도 진행된 다음 verification이 알아서 끝나면 자동으로 Status가 Pending에서 → Success로 바뀐다.

이 인증서의 ARN 주소를 복사해둔다.

### ALB
기존에 x2bee.com으로 쓰던 ALB에 이 신규 도메인을 같이 사용할 것이기 때문에
설정 파일에 인증서 arn 부분에 comma (`,`) 하나로 구분해서 추가하고 붙여넣어준다.

```yaml
alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:ap-northeast-2:318000004903:certificate/864x6x65-5631-46dd-ba04-63404x535x66,arn:aws:acm:ap-northeast-2:318000004903:certificate/5607x351-3883-4x3e-b061-7aff7c8b6xx2
```

수정 후 `kubectl apply` 해주면 적용된다.

### Istio Gateway
기존에 사용하던 EKS cluster에 이 신규 도메인을 같이 사용할 것이라 
기존에 사용하던 istio gateway 가장 밑에 한 줄만 추가해주고 `kubectl apply`를 해준다.

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: istio-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 80
      name: http-wildcard
      protocol: HTTP
    hosts:
    - "*.x2bee.com"
    - "*.plateer.io"
```

그리고 Jenkins와 ArgoCD를 설정해주고 배포하면 끝.
