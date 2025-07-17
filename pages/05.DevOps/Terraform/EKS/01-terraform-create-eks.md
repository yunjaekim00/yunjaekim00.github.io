---
title: 01. Terraform으로 AWS EKS 구축
date: 2025-07-17
---
# 01. Terraform으로 AWS EKS 구축
### 서두
Terraform을 이용해 AWS EKS을 구축할 것이고 시리즈로 쓸 예정.
IaC에 가장 많이 쓰이는 것은 단연 Terraform과 Ansible이다.
개인적으로 둘 다 싫어한다.
그 이유는 if-else나 for loop만 알아도 정말 여러가지 로직을 짤 수 있는 프로그래밍 언어와 달리,
Terraform과 Ansible은 무슨 기본적인 코드라도 한 줄 한 줄 짤때마다 사전을 찾아보듯이 공식문서를 뒤적여봐야하기 때문이다.
그럼에도 짜놓기만 하면 읽는 사람의 입장에서는 가독성이 굉장히 높은 장점이 있다.
그러기에 짜놓기만 하면 운영 관리가 용이한 면이 있는 것 같다.
### resource vs. module
우선 기초 강의는 듣고 처음 코드를 짜려고 하는데, 고민이 생긴다.
`resource "aws_eks_cluster`를 사용해야할까, 아니면 `module "eks"`를 써야할까?
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