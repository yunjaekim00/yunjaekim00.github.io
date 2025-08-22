---
title: 08. Lets Encrypt 인증서 1
date: 2025-08-21
---
# 08. Lets Encrypt 인증서
이번 글에서는 Let's Encrypt 인증서에 대해 질문 답변 형식으로 블로그를 써보겠습니다.
### Let's Encrypt
**Q:** Let's Encrypt에서 발급받는 TLS 인증서는 self-signed 인증서의 한 종류인가? 만약 그렇다면 개인 연습용 혹은 내부 시스템용 아닌가?
**A:** 아니다. CA 인증서이다. 
- Self-signed 인증서 - 말 그대로 자체 인증(자신이 발급한 key pair로 sign)된 key 공용으로 신뢰할 수 없는 인증서
- Let's Encrypt 인증서 - CA (Certificate Authority)에서 발급된 **publicy trusted 인증서**이다.

**Q:** 그럼 Let's Encrypt으로 발급받은 인증서를 production에서 사용할 수 있나?
**A:** Production에서도 사용할 수 있다.

**Q:** 우리가 사용하는 CrossCert에서 발급한 TuringSign 인증서는 Java Truststore에 default로 신뢰되지 않는 인증서인데, Let's Encrypt는 어떤가?
**A:** OpenJDK/Oracle JDK의 2017년 버전 이후부터 포함이 되어있다.

**Q:** Let's Encrypt의 장점은 무엇인가?
**A:** 
1. 공짜다.
2. 한 번 발급하면 90일후에 만료되지만, 자동으로 만료 30일전인 60일부터 자동으로 갱신된다 → 즉, '수동' 업데이트 없이도 계속 사용이 가능하다.

**Q:** Let's Encrypt 인증서가 공짜이고, 무한 갱신되며, production에서 쓰일 수 있는 공인CA의 인증서이면, 왜 기업들이 비싼 돈을 내고 유료CA 인증서를 구입하는가?
**A:** Let's Encrypt는 DV(Domain Validation)만 진행을 한다. 유료 CA 인증서는 DV에 추가로 OV(Organization Validation)도 제공한다. (어떤 auditor는 유료CA를 요구할 수 있다.) 또한 유료 CA는 SLA와 같은 warrantly를 제공해준다. 유료 CA 인증서의 단점은 1~2년(구입 타입에 따라)에 한 번씩 수동으로 인증서를 교체해주어야한다. 무엇보다 Let's Encrypt는 설치가 조금 더 복잡해서 전문성을 필요로 한다.

### Let's Encrypt 발급 절차
아래 그림과 같은 방식이다.
![center](./_images/Pasted%20image%2020250821134833.png)
CSR : Certificate Signing Request로 공개키가 포함되며 이것으로 CA에 전송해 '서명 요청'을 하게 된다.
도메인 증명하는 절차를 ACME Challenge라고 부른다.

### Let's Encrypt 종류
#### HTTP-01 챌린지
이 챌린지를 위해서는 단일 도메인(예: `app1.plateer.io`)을 테스트한다.

![center](./_images/Pasted%20image%2020250822024816.png)

HTTP-01은 상대적으로 간단하지만
조건이 위에 3번을 보면 HTTP endpoint가 있어야한다.
HTTP로 발급한 토큰(예시로 `SECRET123`)을 HTTP의 endpoint로 제공해야한다. (아직 인증서가 없으니깐 당연한 얘기지만)
그러나 이 얘기인즉슨 설치과정에서, TLS termination을 해주는 Istio Gateway의 다음 코드에서

```yaml
    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - "app1.plateer.io"
      # tls:
      #   httpsRedirect: true
```

TLS redirection을 해주면 안 된다. (어차피 인증서가 없는 상태에서는 https로 redirect해도 아무것도 표시가 안 되니)
즉, 위와 같이 **주석 처리**를 하고 우선 챌린지를 인증받고 인증서를 받은 후에 다시
위 두 줄을 **주석 해제**를 하고 다시 적용해주어야 하는 번거로움이 있다.

게다가 여러 개의 도메인 (예: `app1.plateer.io`, `app2.plateer.io`)을 사용할 시 Certificate 자체에 일일이 적어주고 다시 적용해주어야 한다.

#### DNS-01 챌린지
Wildcard domain을 위해 사용한다. (예: `*.plateer.io`)
Wildcard 도메인을 위한 ACME 챌린지는 위의 HTTP-01처럼 특정 도메인(예: `app1.plateer.io`)의 HTTP endpoint를 요구하지 않는다. 대신 `plateer.io`의 소유자를 TXT record 생성으로 증명하게 한다.
![](./_images/Pasted%20image%2020250822131909.png)
즉, `http://`에 노출하지 않고 TXT record만 Route53에 생성하면 되니 
주석처리했다가 다시 주석을 해제하지 않아도 된다.
임시로 챌린지를 위해 생성된 TXT record는 인증 직후에 자동 삭제되므로, 인증서가 발급된 후에 AWS console의 Route53에 들어가면 보이지는 않는다.
게다가 단일 도메인이 아니기 때문에, 도메인이 추가 될 때마다 다시 Certificate을 적용하고 ACME challenge를 하지 않아도 된다.

```yaml
kind: Certificate
spec:
  dnsNames:
    - "*.plateer.io"
```

대신 HTTP-01 방법보다 조금 복잡하다. AWS Route53에 임시 TXT record를 생성해주어야하는데 그것을 위해서 IAM role 설정을 해줘야하기 때문이다.

