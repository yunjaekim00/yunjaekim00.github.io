---
title: 06. Variables
date: 2024-11-28
---
### Introduction
CIDR 주소를 변수로 놓고 *재사용*하고 싶을 때 사용
용도:
- 가독성을 위해 가변적인 변수만 하나의 파일로 분리
- 여러 군데 동시에 들어가는 변수를 분리해서 관리
- dev와 prd 환경에 prefix나 suffix만 다르고 비슷한 이름을 사용하고 싶을 때
결론:
- 무조건 변수는 분리해서 쓰자

`main.tf`에 추가
```hcl
variable "subnet_cidr_block" {
	description = "subnet cidr block"
}
```
귀찮으면 description도 안 적어도 된다.

```hcl
variable "subnet_cidr_block" {}
```
이렇게 놓고 사용

선언하고 다음을 수정 → `var.<variable_name>`
```hcl
#cidr_block = "10.0.10.0/24"  # 기존 코드
cidr_block = var.subnet_cidr_block  # 바꿀 코드
```

#### Value
값 넣는 방법은 세 가지
1. 위 코드를 그대로 실행(terraform apply)하면 변수 값을 입력하라고 나옴
```sh
terraform apply
```

2. command line argument를 이용하는 방법

```sh
terraform apply -var "subnet_cidr_block=10.0.20.0/24"
```

이러면 변수 입력하는 메세지는 뜨지 않음.
위 두 가지 방법은 가능하다는 얘기지 저렇게 쓰지는 않을 것이다.

3. best practice이며 대부분 사용하게 될 방법
→ 변수를 따로 파일에 지정
Terraform이 자동으로 읽어올 파일명은 `terraform.tfvars`

```hcl title:terraform.tfvars
subnet_cidr_block = "10.0.20.0/24"
```

```sh
terraform apply
```

vpc cidr block도 변수로 빼자
```hcl title:main.tf ln:10
variable "vpc_cidr_block" {
	description = "vpc cidr block"
}

resource "aws_vpc" "development-vpc" {
	#cidr_block = "10.0.0.0/16"
	cidr_block = var.vpc_cidr_block
```

```hcl title:terraform.tfvars
vpc_cidr_block = "10.0.0.0/16"
```

### Use case for variables
React에서는 `.env.dev`와 `.env.production`으로 하듯이
dev와 prd 환경 둘로 구분해서
dev환경: `terraform-dev.tfvars`
prod환경: `terraform-prod.tfvars`
으로 할 수 있다.

그러나 테라폼의 default 파일명은 `terraform.tfvars`이기 때문에
이 경우에는 테라폼 실행 시 파일 이름을 parameter로 넘겨야한다.

```sh
terraofrm apply -var-file terraform-dev.tfvars
```

### Default value
```hcl title:main.tf hl:3
variable "subnet_cidr_block" {
	description = "subnet cidr block"
	default = "10.0.10.0/24"
}
```

default 값을 적어주면 Terraform이 변수 값을 찾지 못하거나 지정해놓은 것이 없을 때 사용한다.

### Type Constraints
팀에서 공통으로 개발할 때 typescript처럼 변수에 type을 지정할 수도 있다.
#### String
```hcl title:main.tf hl:4
variable "subnet_cidr_block" {
	description = "subnet cidr block"
	default = "10.0.10.0/24"
	type = string
}
```

- type으로 `number, bool, list(<TYPE>), object` 등 가능
- 대부분 string이라 지정해주지 않아도 됨

#### List
`type = list(string)`으로 바꿀 수 있다.
```
cidr_block = ["10.0.0.0/16", "10.0.10.0/24"]
# 참조시에는
var.cidr_block[0]  # 첫번째 값
```

#### Object
object도 가능

```hcl title:예시
cidr_blocks = [
	{cidr_block = "10.0.0.0/16", name = "dev-vpc"},
	{cidr_block = "10.0.10.0/24", name = "dev-subnet"}
]
```

이 경우에는 
```hcl
variable "cidr_blocks" {
	description = "cidr blocks for vpc and subnet"
	type = list(object({
		cidr_block = string
		name = string
	}))
}
```
으로 type을 선언한다.

reference 할 때는
```hcl
resource "aws_vpc" "dev-vpc" {
	cidr_block = var.cidr_blocks[0].cidr_block
```

