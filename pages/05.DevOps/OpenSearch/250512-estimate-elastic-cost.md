---
title: "\bElasticSearch 예상 비용 산정"
date: 2025-05-12
---
# ElasticSearch 예상 비용 산정
### 설치 방법
ElasticSearch를 AWS Cloud에서 사용하는 방법은 크게 3가지일 것 같다.
#### 1. self-host (EC2)
EC2 instance를 생성해서 OpenSearch 혹은 ElasticSearch를 자체 설치하는 방법
#### 2. AWS OpenSearch
AWS에서 제공하는 OpenSearch PaaS 서비스를 이용하는 방법
#### 3. Elastic Cloud
Elastic Cloud에 비용 결제를 따로 하고, 플랫폼 종류(AWS)와 Region(서울)을 알려주면 해당 리젼에 설치해주는 형태의 Elastic Cloud

구글에 price calculator를 검색해서 대략적인 비용을 비교해보았다.

### 예상 비용
#### 1. self-host (EC2)
AWS OpenSearch 서비스와 최대한 비슷한 조건으로 비교하기 위해 
instance type는 `r7i.large` 3개로 계산하였다. EBS는 총 300GiB

349.52 + 82.08 (EBS) = **431.6 USD**

혹시 master node를 따로 3개 추가하려면, 위 비용에 추가로
271.34 + 16.42 (EBS) = 287.76 USD

#### 2. AWS OpenSearch
Dev 환경에서는 data node만 설치하지만 이 node가 master node도 같이 한다.

data nodes
r7g.large.search (2 CPU, 16 GiB) x 3개  각각 100GiB EBS

468.66 USD + 41.73 USD (EBS) = **510.39 USB**

Prd 환경은 다운 타임을 최소하기 위해 디폴트로 dedicated master node 3개가 추가된다.
storage minimal
m7g.large.search  (2 CPU, 8 GiB) x 3개  각각 20GiB EBS
위 Dev 환경에 추가로 드는 비용

363.54 USD + 8.35 USD (EBS) = 371.89

#### 3. Elastic Cloud
https://cloud.elastic.co/pricing?elektra=pricing-page 여기서 예상 비용 볼 수 있다.
위와 비슷한 환경을 계산해보자면 (예상비용 계산시 스토리지는 선택권이 없는듯 → 720 GB)
![300](_images/Pasted%20image%2020250512101459.png)
시간당 0.7464 USB x 720시간하면 = **537.4 USD**

### 결론
사실 Elastic Cloud는 비용 계산식이 복잡해서 (실시간 RAM 메모리 사용 기준 등)
실제 사용한다면 비용은 위와 많이 다를 수 있다. (더 저렴할 수 있다)
위 AWS 자체 서비스도 모두 Network Transfer 가격이 불포함된 가격이라서 
대략적으로 계산한 것이다.
아무튼 instance type large를 3개 사용했을 때 예상 비용은

1. self-host EC2 : **431.6 USD**
2. AWS OpenSearch : **510.4 USD**
3. Elastic Cloud : **537.4 USD**

PaaS 서비스에 대한 프리미엄이 10만원 정도 더 붙는다고 생각하면 될 듯.