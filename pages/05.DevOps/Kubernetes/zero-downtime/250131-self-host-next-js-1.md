---
title: Next.js self-host 무중단 배포 - 1
date: 2025-01-30
cssclasses:
  - review2
created: 2025-02-09T20:34
updated: 2025-02-11T10:12
---
# 무중단 배포
**무중단 배포**란 말 그대로 신규 배포시 서비스가 중단되지 않도록 배포하는 기술이다.
다시 말하면 서비스하는 application을 내리지 않고, 새로운 application을 올리는 것이다.
이와 관련해 두 가지를 이야기하고 싶다.

하나는 배포 전략에 관련된 것이다.
신규로 배포를 하고 그 pod가 정상적으로 동작을 하면 서서히 트래픽을 이 신규 pod로 흘려보내는 측면에서 보는 무중단 배포인데, 이것은 Blue/Green 배포, Canary 배포, 우리가 선택 중인 **Rolling Update**가 여기에 해당한다. (배포 전략에 대해 정리가 잘 된 블로그: https://onlywis.tistory.com/10)

두번째는 SSR을 지원하는 Frontend framework의 application을 배포하는 문제이다.
강조하고 싶은 것은, 이 문제는 방금 위에서 말한 배포 전략과 관련은 있지만 다른 이야기다.
(흔하게 발생되는 문제일 것 같은데 구글링해보면 누가 정리해놓은 글이 없다.)
밑에 더 자세히 설명하겠지만, 이는 FO의 정적 파일을 storage (CDN 혹은 다른 외부저장소)에서 제공해주어야하기 때문이다.

## 1. Rolling Update
Rolling update는 health check를 마친 pod를 하나씩 생성하면서 기존의 pod를 하나씩 소멸시키는 방법이다.
이 방법의 장점 : 시스템을 무중단으로 업데이트 할 수 있다.
이 방법의 단점 : 새 버전의 pod들로 트래픽이 이전되기 전까지 이전 버전과 새 버전의 pod가 동시에 존재할 수 있다.
![center|500](_images/Pasted%20image%2020250416184554.png)

### health check 종류
헬스체크 종류에 대해서 알아보자. 
공식 문서: https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/
#### Startup Probe
- 시작시에만 확인
- pod container가 완전히 start up (load data, cache) 되었는지 확인한다. 이 시간동안 liveness와 readiness는 체크를 잠시 중단한다. X2bee MSA의 경우 평균 2분 정도 소요된다.
#### Liveness Probe
- container에 deadlock이 있으면 container를 재시작할 것인지 점검하고 결정
#### Readiness probe
- container가 traffic을 받을 수 있는 지 체크 → readiness가 실패한다면 K8s는 `svc`의 load balancing에서 연결을 끊는다. → 즉, 실패시 liveness처럼 재시작하지는 않고 연결만 해제한다.

즉, Rolling update는 3가지 health check를 마친 신규 pod가 생성되고나서, 기존 pod 하나가 제거된다.

## 2. Next.js static files
### npm build
Next.js application에서 
```sh
> npm run build
```
를 하게 되면 아래 그림처럼 `.next` 폴더가 생기게 된다.
![](_images/Pasted%20image%2020250131132814.png)
1. SSG를 위한 pre-rendered HTML
2. ISR을 위한 동적으로 재생성되는 HTML 파일들
3. SSR를 위해 pre-compile된 번들
4. 미들웨어와 API route는 `.next/server`에 저장
5. RSC 번들 파일들
그리고 가장 문제가 되는
6. 정적 파일들 : `.css` 파일, `.js` chunks, 그리고 이미지 파일들이 최적화 되어 `.next/static` 폴더에 저장된다. (public 폴더에 있는 것도 원래는 여기 저장된다.)
### hashed file names
이 `.next/static` 폴더 안을 보면 파일 이름들이 전부 hashed 되어있다.
![](_images/Pasted%20image%2020250131135721.png)
소스 코드 수정이 없어도 다시 `npm run build`를 하게 되면 이 hashed 파일명은 또 바뀌게 된다. (hash를 위해 build timestamp도 쓰이기 때문)
#### 파일명 해시의 이유
- 브라우저는 기본적으로 사용자에게 성능을 보강하기 위하여 pre-rendering된 `.js` `.css` 파일을 브라우저에 저장하기 위해 서버에 요청한다.
- 이 파일명이 만약 바뀌지 않는다면 브라우저는 캐시가 된 stale version의 파일들을 사용할 수 있으므로 대부분 frontend framework에서 취하는 전략이다. 다시 빌드가 될 때 새로운 업데이트된 최신 파일들의 fetch를 보장하는 프레임워크의 전략이다.
#### `_next`
- `npm run build`를 하면 `.next`라는 폴더가 생기지만, 이것을 *browser*가 액세스할 때는 `_next`라는 virtual public-facing URL로 접근하도록 Next.js의 라우팅 메카니즘이 정해져있다.
- 즉 browser가 `_next/`로 요청을 하면 서버는 `.next`로 응답한다.
### 문제점
![center](_images/Pasted%20image%2020250416184621.png)

1. AS-IS pod가 2개라고 가정할 때, (Rolling Update를 위해 MaxSurge를 50%로 설정하면) 신규 pod가 한 개씩 교체가 된다. 
2. 이렇게 신규 배포가 하나씩 생성될 때 기존 pod와 신규 pod가 동시에 존재하는 시간이 생김.
3. 이미 로그인하고 있던 사용자는 브라우저에서는 새로운 페이지로 이동시 서버에 `aaaa.js`와 `bbbb.css`를 요청
4. 쿠버네티스의 load balancer의 역할을 하고 있는 **svc**는 이를 각 pod에 분산시킨다. **하나의 브라우저에서의 요청이라도** svc는 `aaaa.js`는 기존 살아있는 pod에 요청, `bbbb.css`는 신규 pod에 요청을 한다.
5. 이 때 신규pod는 다른 파일명을 가지고 있어서 `bbbb.css`의 요청을 받아들일 수 없고, 이 때 백화현상이나 404에러가 브라우저에서 발생하게 된다.

위에서 보았듯이 이 문제는 단지 Blue/Green방법으로 트래픽을 조절한다고 해결되는 문제가 아니고, 기존 정적파일과 새로 생성된 정적파일을 CDN에 전부 밀어넣던지, 혹은 위에서 보이는 쿠버네티스보다 더 앞단에서 정적파일 요청은 외부 스토리지로 트래픽을 보내는 방법을 써야한다.

### 해결방법 1
Jenkins에서 Next.js를 빌드할 때 정적인 파일을 CDN으로 올리는 방법이 있다.
이는 Tech구씨의 글 https://x2bee.tistory.com/459 에 자세히 설명되어있다.

### 해결방법 2
PV(Persistent Volume), PVC(Persistent Volume Claim), 그리고 SC(Storage Class)를 사용하는 방법이 있다. 그러나 이는 CDN보다 느려서 몇 초간 오류가 나서 추천하지 않는다.

### 해결방법 3
이건 chatGPT도 제안하지 않은 방법이고 내가 고민해낸 방법인데, 어차피 Next.js의 pod container에서 파일들을 배포하는 것이다. 그래서 Dockerfile에서 빌드를 할 때 기존 정적인 파일들은 VM에 임시 저장을 하고, 이전 빌드에서 저장해놓은 정적인 파일들을 저장해서 배포하는 방법이 있다.