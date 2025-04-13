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
우선은 AWS S3 bucket의 한 폴더를 CloudFront를 통해 CDN으로 배포하는 것을 해보자.

## 1. AWS CloudFront
AWS S3 bucket은 만들어져 있다고 가정하겠다.
AWS console에 들어가 bucket의 root folder에 폴더를 하나 만든다.
나는 `Create folder` 버튼을 누르고 `static`이라는 폴더를 생성해보았다.

![](./_images/Pasted%20image%2020250413155002.png)

