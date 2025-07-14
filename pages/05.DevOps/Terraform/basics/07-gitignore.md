---
created: 2024-11-15T15:01
updated: 2024-11-18T15:51
title: 07. gitignore
date: 2024-11-28
---
#### .gitignore
git commit 하기 전에 `.gitignore` 파일을 추가한다.
```.gitignore
# local .terraform directory
.terraform
.terraform.lock.hcl

# tf state files
*.tfstate
*.tfstate.backup
# *.tfstate.*로 해도 됨

# 전체는 아니더라도 민감한 데이터가 있는 변수 파일은 선택적으로 추가
*.tfvars
```

#### 현재까지 코드
`main.tf` 코드
```hcl title:main.tf
provider "aws" {
	region = "ap-northeast-1"    # Tokyo region
}

variable "subnet_cidr_block" {
	description = "subnet cidr block"
	default = "10.0.10.0/24"
	type = string
}

variable "vpc_cidr_block" {
	description = "vpc cidr block"
}

resource "aws_vpc" "development-vpc" {
	#cidr_block = "10.0.0.0/16"
	cidr_block = var.vpc_cidr_block
	tags = {
		Name: "development"
	}
}

resource "aws_subnet" "dev-subnet-1" {
	vpc_id = aws_vpc.development-vpc.id
	cidr_block = var.subnet_cidr_block
	availability_zone = "ap-northeast-1a"
	tags = {
		Name: "development"
	}
}

output "dev-vpc-id" {
	value = aws_vpc.development-vpc.id
}

output "dev-subnet-1" {
	value = aws_subnet.dev-subnet-1.id
}
```

```hcl title:terraform.tfvars
vpc_cidr_block = "10.0.0.0/16"
subnet_cidr_block = "10.0.10.0/24"
```
