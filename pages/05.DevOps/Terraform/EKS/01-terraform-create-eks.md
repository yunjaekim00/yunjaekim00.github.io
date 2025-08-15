---
title: 01. Terraform으로 AWS EKS 구축
date: 2025-07-17
---
# 01. Terraform으로 AWS EKS 구축
### 문제점
한 고객업체에 Azure Cloud로 DevOps를 구성했는데
bastion 서버에 다음과 같은 파일을 남겨둔 적이 있다.

```sh
> ls
01.istio  02.argocd  03.fluentd  04.tls-certs  05.grafana  06.ip-block  cronicle  redis
```

저 폴더 하나에도 여러 파일들이 있다.
위처럼 구성한 이유는 이 고객사의 현업 인프라 파트에서 웹 브라우저로 CLI 환경만 접속할 수 있는 권한이 우리에게 주어져서 CLI command로 하나하나 설치했기 때문이다.

그리고 인수인계를 위한 documentation에도 수십가지의 명령어를 순서대로 실행해야된다라고 적어놓았다.
예를들어 argocd를 위해서는 Helm을 설치하고 values.yaml 파일을 받아 수정하고 override해서 설치하고 등.
이렇게되면 운영 측면에서도 업그레이드나 유지가 꽤나 복잡해진다.

그래서 Terraform이 필요하다. 

### Terraform은 그냥 단기적 생성 및 삭제에만 좋은 것 아닌가
`terraform apply`로 리소스를 자동으로 생성하고, `terraform destroy`로 리소스를 자동으로 삭제한다면, 단기적으로 생성 삭제시에만 Terraform이 필요한 것 아닌가?라고 생각할 수 있지만 실제 사용해보면 이것은 Terraform의 큰 **장점 중의 하나**인 것인지 이것 때문에 사용하는 것은 아니다.

### Single Source of Truth
Single source of truth. 영어권 개발자들 사이에서는 자주 쓰는 말인데 한글로 뭐라 번역되는 지 잘 모르겠다. '단일 정보 원천? 유일 진실 출처? 

현재 우리 부서에서 사용하는 Jenkins의 파이프라인 코드가 바로 single source of truth의 예이다. 이 pipeline code는 배포와 삭제를 쉽게하는 것이 제1의 목적이 아니다. 제1의 목적은 누군가 `kubectl` 명령어로 **임의로** replica를 늘리지 못하게 하는 것이다. 만약 누군가 kubectl로 replica를 늘린다면, ArgoCD에서 sync를 하면 다시 pipeline code의 상태로 원복이 된다.

현재 우리가 사용하는 이 pipeline코드는 크게 Jenkinsfile과 ArgoCD helm chart 두 부분으로 나뉘고 이 코드는 Gitlab에 올려서 운영개발자 누구든지 gitlab 소스만 보면 현재 배포 상황과 Jenkins pipeline 코드를 알기 쉽고 수정도 용이하다. 즉, single source of truth가 Gitlab repository에 올려진 사례다.

즉, AWS EKS 혹은 Azure AKS 서비스를 설치하고 수정하는 것도 이처럼 **Gitlab repo**에, 즉 single source of truth로 관리할 필요가 있다.
이는 부수적인 여러 장점이 많다. Terraform 자체가 **가독성**이 좋기 때문에 이 자체로도 **documentation 역할을 대체**할 수 있을 정도이기 때문이다.

잡설 : 
여기서부터 Terraform을 이용해 AWS EKS을 구축할 것이고 시리즈로 쓸 예정이다.
IaC에 가장 많이 쓰이는 것은 단연 Terraform과 Ansible이다.
개인적으로 둘 다 싫어한다.
그 이유는 if-else나 for loop만 알아도 정말 여러가지 로직을 짤 수 있는 프로그래밍 언어와 달리,
Terraform과 Ansible은 기본적인 코드라도 한 줄 한 줄 짤때마다 사전을 찾아보듯이 공식문서를 뒤적여봐야하기 때문이다.
그럼에도 짜놓기만 하면 읽는 사람의 입장에서는 가독성이 굉장히 높은 장점이 있다.
그러기에 짜놓기만 하면 운영 관리가 용이한 면이 있다.
  
### resource vs. module
우선 Terraform 기초를 공부하고 나면 고민이 생긴다.
`resource "aws_eks_cluster`를 사용해야할까, 아니면 `module "eks"`를 써야할까에 대한 고민이다.
`resource`라는 것은 내가 일일이 하나 다 설정해주어야해서 기본 EKS 구성에도 코드가 수백줄이 될 수 있다.
반면 커뮤니티 `module`은 전세계 법인에서 많이 사용하는만큼 battle-tested 되어 best-practice가 내재된 코드가 숨겨져있는 장점이 있지만, `resource`처럼 내가 어떤 것이 생성되는지 완벽히 알 지 못한다는 단점이 있다.
선호야 취향이지만 커뮤니티 module도 설정을 override하는 방식으로 세부 설정이 된다.
나는 주로 `module` 방식을 사용할 예정이다.
우선 VPC부터 설정해준다.

### Provider
우선 provider부터 설정
`01-main-eks.tf`

```hcl
provider "aws" {
  region     = var.aws_region
  access_key = var.aws_access_key_id
  secret_key = var.aws_secret_access_key
  default_tags {
    tags = var.tags
  }
}
```

access_key는 `terraform.tfvars`에 넣어주되 내 AWS 계정이 아닌, terraform을 위한 전용 계정을 만들고 해당 access_key를 넣어준다. → 이유는 다음 글 RBAC에서 설명

`02-providers.tf`에도 명시

```hcl
terraform {
  required_version = ">= 1.3"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.34"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.37"
    }
  }
}
```

### VPC
```hcl ln:true
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"
  
  name = var.name
  cidr = var.vpc_cidr_block
  
  azs             = data.aws_availability_zones.azs.names
  private_subnets = var.private_subnet_cidr_blocks
  public_subnets  = var.public_subnet_cidr_blocks
  
  enable_nat_gateway = true
  single_nat_gateway = true
}
```

위와 같이 하고 변수를 `variables.tf`에 선언하고 `terraform.tfvars`에 변수 값을 준다.

EKS는 생성할 수 있는 최소의 조건은 2개의 subnet이기 때문에 위 변수 값에 최소 2개를 array로 넣어주면

- 1 VPC
- 1 Internet Gateway (IGW)
- 2 Public Subnets (one per AZ)
- 2 Private Subnets (one per AZ)
- 1 NAT Gateway (in the first public subnet)
- 1 Elastic IP for the NAT Gateway
- 3 Route Tables (default, public, private)
가 자동으로 생긴다.

NAT Gateway와 Elastic IP의 조합 한 세트만으로 약 14만원/월 정도의 과금이 매겨진다.
과거에는 private subnet 하나당 하나의 NAT gateway를 만들어야된다는 적도 있었지만 요즘에는 다들 subnet이 2개건 3개건 NAT Gateway는 1개만 만든다.

Ingress는
	Internet → IGW → ALB (public subnet) → EKS Istio Gateway로 들어오고
Egress는
	AZ-1에서 : EKS Nodes → NAT Gateway(AZ-1) → IGW → Internet으로 가고
	AZ-2에서 : EKS Nodes → private Route Table → NAT Gateway(AZ-1로 cross-AZ traffic) → IGW → Internet으로 가게 된다.

생성 후 VPC 모습:
![](./_images/Pasted%20image%2020250717150331.png)