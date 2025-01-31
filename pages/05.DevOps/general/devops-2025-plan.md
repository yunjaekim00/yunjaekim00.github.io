---
title: 2025년 DevOps 공부 아이템
date: 2025-01-01
---
# 2025 DevOps 연구(역량 강화) 계획
### 1. GitOps / IaC(Infrastructure as a Code)
**IaC** - Terraform, Ansible 등 git의 코드로 동작하는 DevOps 전반
**GitOps** – the practice of using Git repositories to manage infrastructure configurations and operations – has been gaining popularity and is expected to become a standard practice.
  
### 2. Multi-Cloud DevOps / SA와 인프라 업무
AWS, Azure 공부
#### Redis PaaS
VM에 docker container로 올리는 대신 다음 PaaS로 변경 (가격이 비슷함)
- AWS Elasticache for Redis / Memcached
- Azure Cache for Redis 
#### SK렌터카
Azure / DevOps
#### Rolling update시 404 error 해결 후보들
금천미트에서 해결하지 않은 것
##### 1. Blue/Green Canary deployments

#### 2. Serve static assets from an external CDN (or external storage)

##### 3. Layer 7 LB (Load Balancer)
- AWS ALB, Azure Application Gateway와 session stickiness 기능


### 3. Serverless Architecture
AWS Lambda, serverless Aurora 등, 기존 infrastructure overhead를 줄일 수 있다.

### 4. Python
for automation such as AWS Lambda - gitOps에 여러 부분을 자동화

### 5. Kubernetes Maturity
Container orchestration에서 쿠버네티스는 계속 표준이 될 것이고 기능이 강화될 것 (아이스크림미디어는 1.29, 현재 1.32 나오는 중)
#### 5-1. Telemetry
Prometheus, Grafana, Kiali, Jaeger
AWS CloudWatch를 통한 모니터링 서비스
#### 5-2. Service Mesh
Istio 기능 고도화
#### 5-3. Adaptive Scaling
Dynamic resource scaling based on predictive analytics will become a core capability.

### 6. Network
VPN 구성, Load Balancer, Firewall, Azure NIC, Azure NSG, Azure PrivateLink
AWS와 Azure의 Kubernetes의 Network Plugin / Network Policy
CNI 종류 Calico / Cilium / AWS VPC CNI / Azure CNI → which supports virtual node?
 
### 7. AI Cloud Services / GenAI adoption in AIOps
AWS Bedrock - foundation model과 multi-modal integration
AWS SageMaker - 학습에 필요한 리소스

### 8. DevSecOps / Cybersecurity
오픈 이전에 모의해킹이 아닌 개발 단계에서 꾸준한 보안 체크 필요

#### 참고: Cybersecurity Trends for 2025
https://youtu.be/kqaMIFEz15s
1. (unauthorized) Shadow AI - pull from a cloud instance and go away (data leakage)
2. Deepfake - $25million $35million
3. Exploits/Malware - GenAI can write malware
Amazon has reported a significant increase in potential cyber threats in 2024, detecting nearly 1 billion possible incidents daily, up from 100 million earlier this year. This surge is partly attributed to the growing use of artificial intelligence by attackers. https://www.wsj.com/articles/the-ai-effect-amazon-sees-nearly-1-billion-cyber-threats-a-day-15434edd?utm_source=chatgpt.com
Similarly, British telecom company BT has observed a substantial rise in cyber-attack signals, detecting 2,000 potential attacks per second on its network. In July 2024, BT noted a 1,200% increase in malicious scanning activities compared to the same month the previous year.
https://www.reuters.com/technology/cybersecurity/bt-spots-2000-potential-attacks-its-network-second-2024-09-12/?utm_source=chatgpt.com
4. **Prompt injection attack** → OWASP에서 LLM을 상대로한 1위 공격 방법이 될 것이다. 2025년 보안의 최대 이슈.
5. Increase of Attack Surface
6. AI phishing
7. (1-6까지는 Risk, 6은 강화) AI 추천 response for cyberattacks → 추천 대응 방안을 내놓으면 전문가가 택해서 실행

### 9. Edge computing / Distributed Cloud
Unlike a centralized environment, Edge Computing distributes processing and data collection across various points at the network’s edge, reducing latency and, consequently, increasing efficiency.
Distributed Cloud(중앙+edge) > Edge > CDN
CDN에서 확장 개념 - 동적 real-time processing. ioT 환경에서 우선 도입 중.

### 10. gRPC
REST API vs. gRPC vs. GraphQL의 아키텍쳐 스타일 공부