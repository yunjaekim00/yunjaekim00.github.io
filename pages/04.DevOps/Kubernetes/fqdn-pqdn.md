---
title: FQDN, PQDN이란
date: 2024-10-11
---

## FQDN

- FQDN : Fully Qualified Domain Name
- 우리말로는 '완전 정규화 도메인 이름'
- service name, namespace, cluster domain, type of resource, top-level domain
- 예: `myservice.mynamespace.svc.cluster.local`
  - `myservice`: 서비스 이름
  - `mynamespace` : namespace 이름
  - `svc` : 리소스 type
  - `cluster.local` : K8s 클러스터의 default DNS suffix
- domain을 TLD(top-level domain)까지 전부 적어주는 DNS 용어에서 따온 이름
- FQDN은 pod나 service가 K8s cluster 어디에서든지 도달할 수 있게 해준다.

## PQDN

- PQDN : Partially Qualified Domain Name
- 우리말로는 '부분 정규화 도메일 이름'
- 예: `myservice`
- 같은 namespace에 있다면 `myservice`만 가지고도 DNS가 resolve된다.

### 예시

```sh
❯ nslookup argocd-metrics.argocd.svc.cluster.local
Server:		204.242.252.2
Address:	204.242.252.2#53

Name:	argocd-metrics.argocd.svc.cluster.local
Address: 216.40.137.28
```
