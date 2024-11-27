---
title: 01 What is Terraform
date: 2024-11-26
cssclasses:
  - review2
---
### Terraform
#### Tool for infrastructure provisioning
- Terraform은 Go언어로 짜여진 command line executable 프로젝트로 **HCL**(HashiCorp Configuration Language)이라는 언어로 짠 소스코드를 실행하여 인프라를 관리해준다.

#### 선언형 언어(declarative) vs 명령형 언어(imperative)
##### 비교
- declarative(선언형) : define *what* end result you want - 어떤 결과를 원하는가 결과만 적는다.
- declarative(선언형 언어)의 반대는 imperative(명령형 언어)로 *how*에 초점이 맞춰져있다. 내가 원하는 결과를 위해 어떠한 논리로 어떠한 절차를 거쳐야하는지를 프로그래밍한다. (예시: C, Java, Python)
##### 예를 들자면
- declarative approach : I need 7 servers → i need 5 servers
- imperative approach : Create 7 servers → remove 2 servers 
##### 역사
- open source : 2023년 8월부터는 HashiCorp가 MPL(Mozilla Public License) 2.0 에서 → BSL(Business Source License)로 전환 → commercial use에서는 유료 
- **BSL**에 대해서 좀 더 구체적으로 말하자면 내가 SI 파견을 나가서 내 local PC에서 Terraform을 이용해 AWS cloud infra를 생성하건 AWS console에서 버튼 클릭으로 수동으로 생성하건 이것은 알 방법이 없다. 단지 Terraform으로 짜여진 DevOps 자동화 플랫폼을 상업적으로 팔려고 할 때 competitive use라고 판단한다.
- HCL이 대세가 되기 전에는 명령형 언어도 시도가 된 적이 있었다. 그러나 nested 구조, 현재 state checking 등으로 코드가 너무 쉽게 스파게티 코드가 되어 유지가 힘들었다. 자연스럽게 industry standard format인 JSON이나 YAML형태와 같은 선언형 코드가 대세가 되었다. → 그러나 이 형태도 for loop이나 annotation이 필요한 경우 구현하기 힘들었다. 이에 Terraform은 선언형을 바탕에 두면서도 loop 등의 기능, top-down 접근 방식 등을 택하였다.

#### Ansible과 Terraform의 차이점
- 둘 다 IaC (Infrastructure as a Code)
- both used to automate provisioning, configuring and managing the infrastructure
- 그러나 **Terraform**은 mainly *infrastructure provisioning tool* (main power), but can also deploy apps
- **Ansible** is mainly a *configuration tool* - once the infrastructure is there, Ansible can configure that infrastructure, deploy apps or install/update software
- 그래서 이 두 가지 도구가 겹치는 영역이 있기는 하다.
- Ansible is more mature, and Terraform is relatively new (and thus changing dynamically) and more advanced in orchestration

### How does Terraform work?
AWS와 같은 곳에 접속해서 infra 구성을 어떻게 할까? Terraform has 2 main components
#### 1. two inputs
![center|400](<./_images/Pasted image 20241126170527.png>)
Core가 current state와 config file (desired state)를 비교하고 무엇이 created/updated/destroyed 되야 하는지 순서를 정해서 실행 → 그래서 code block의 순서가 바뀌어도 Terraform이 알아서 순서를 스스로 정함
#### 2. providers
AWS / Azure 등 IaaS providers도 있고
Kubernetes 등 PaaS providers,
Fastly 같은 SaaS providers도 있다.
there are over 100 providers → can access over 1,000 resources

### Terraform commands for different stages
#### refresh
- query infrastructure provider to get current *state*
#### plan
- create an execution plan → determines what actions are necessary to achieve the desired state 
- just a preview, no changes to real resources
#### apply
- execute the plan
#### destroy
- destroy the resources / infrastructure

### VS Code extensions
VS code에 Terraform extension 설치
syntax highlighting과 autocompletion 기능 등을 제공해준다.

아래 공식 플러그인도 좋지만
![center|400](<./_images/Pasted image 20241126164243.png>)

아래 플러그인이 별점이 더 높다
![center|400](<./_images/Pasted image 20241126164256.png>)

### Terraform summary
- universal IaC tool
- Terraform이라는 도구 하나로 여러 Provider를 이용해 AWS, Azure와 같은 클라우드는 물론 on-premise까지 통합하여 자동화 할 수 있는 장점이 있다.