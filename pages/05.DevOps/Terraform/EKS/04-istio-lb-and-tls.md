---
title: 04. Istio, Load Balancer와 TLS 인증서
date: 2025-08-19
---
# 04. Istio, Load Balancer와 TLS 인증서
## 서두
다음 단계로는 Terraform으로 Istio를 설치할 예정인데, Istio 자체가 Layer 7 기능을 가지고 있다.
그래서 Istio를 사용할 것이라면, 그 전에 큰 그림에서

1. 어떤 Load Balancer를 어떻게 배치할 것인지
2. TLS termination은 어디서 해야할 지

고민을 해봐야한다.

## 기존 방식
기존에 우리 AWS EKS에 설치했던 (지금은 삭제한) 방식은 다음과 같다.

![center](./_images/Pasted%20image%2020250819152302.png)

AWS ALB는 무료 ACM 인증서의 endpoint만으로 TLS termination을 할 수 있는 장점이 있다.
그리고 AWS ALB (Application Load Balancer)를 설치하면 AWS WAF와 연동이 잘 되는 이점이 있지만 위의 구조는 layer 7의 중복때문에 비효율적인 구조다.

게다가 AWS 공식문서에서는 이제 CLB (Classic Load Balancer) 사용을 권장하지 않는다.

## NLB
AWS에는 엄청나게 latency가 적은 NLB(Network Load Balancer)가 있다.
순수 layer 4 Load Balancer이다. 이것을 다음처럼 쓰면 어떨까?

![center](./_images/Pasted%20image%2020250819152941.png)

AWS NLB에도 ACM endpoint를 annotation을 이용해 TLS termination 시킬 수는 있다.
하지만, NLB가 순수 layer 4이므로 들어오는 port 80을 port443으로 redirection해주는 기능이 없다.
그렇다면 문제가 생긴다.
브라우저에서 수동으로 `http://`르 치면 그대로 인증서 거치지 않고 port 80으로 들어가게 되고, Istio 입장에서는 이 통신이 원래 HTTP 80으로 들어온 통신인지, `https://`를 통해 들어와서 NLB에서 TLS termination으로 80 port로 바뀌어서 들어온 트래픽인지 구분할 방법이 없다.

## NLB + Istio + 인증서 architecture
그래서 여기서는 다음 그림처럼 설치할 것이다.

![center](./_images/Pasted%20image%2020250819153509.png)

즉, NLB(Network Load Balancer, layer 4)에서는 그대로 80과 443 통신을 통과시키고, Istio Gateway에서 TLS termination을 시켜줄 것이다. 여기서는 self-signed 인증서를 사용하겠다. 쿠버네티스에서 Self-signed 인증서는 단지 개인 테스트용이 아닌 stage, production으로 사용할 수 있다. 유효기간이 90일인데 만료 30일에 자동으로 연장되게 할 수가 있다.




