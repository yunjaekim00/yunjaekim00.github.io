---
cssclasses:
  - review2
title: 03 Resources and Data Sources
date: 2024-11-27
---
### Resources
새로운 resource를 생성하는 방법은 `resource` key를 통해서.
resource name을 공식문서에서 찾아 작성한다
참조: https://registry.terraform.io/providers/hashicorp/aws/latest/docs

다음과 같은 형태로 생성을 한다.
```hcl
resource "<provider>_<resourceType>" "variableName" {
	parameters 필수/옵션 적는 부분
}
```

#### VPC 생성
```hcl
resource "aws_vpc" "development-vpc" {
	cidr_block = "10.0.0.0/16"
}
```

공식문서: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc 에 다른 attribute를 더할 수 있는 설명이 있다.

#### Subnet 생성
vpc_id는 필수 attribute
공식문서: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/subnet 를 보면 어떤 인수(argument)가 필수(Required)이고 선택(Optional)인지 나온다. `aws_subnet`의 경우 `vpc_id`만 필수이다.
하지만 필수가 아니라고 해도 입력을 해주지 않으면 자동으로 알아서 배정해주는 값들 때문에 선택사항도 우리가 필요한 경우 명시해주는 것이 좋다 (예시 `cidr_block`이나 `availability zone`)

아직 생성되지 않은 VPC를 어떻게 reference 하는가? → 아래와 같이 참조
그리고 subnet은 VPC의 CIDR의 부분집합을 가지게 한다.
```hcl ln:true
resource "aws_subnet" "dev-subnet-1" {
	vpc_id = aws_vpc.development-vpc.id   # .id는 여러 개 attribute중 id만 가져오겠다는 뜻
	cidr_block = "10.0.10.0/24"  # subset of VPC's CIDR
	availability_zone = "ap-northeast-1a"
}
```

### Terraform plan
resource를 생성/삭제하지 않고 current state와 desired state를 비교만 하고 싶을 때 사용.

```sh
> terraform plan
  # aws_vpc.development-vpc will be created
  + resource "aws_vpc" "development-vpc" {
      + arn                                  = (known after apply)
      + cidr_block                           = "10.0.0.0/16"
      + default_network_acl_id               = (known after apply)
      + default_route_table_id               = (known after apply)
      + default_security_group_id            = (known after apply)
      + dhcp_options_id                      = (known after apply)
      + enable_dns_hostnames                 = (known after apply)
      + enable_dns_support                   = true
      + enable_network_address_usage_metrics = (known after apply)
      + id                                   = (known after apply)
      + instance_tenancy                     = "default"
      + ipv6_association_id                  = (known after apply)
      + ipv6_cidr_block                      = (known after apply)
      + ipv6_cidr_block_network_border_group = (known after apply)
      + main_route_table_id                  = (known after apply)
      + owner_id                             = (known after apply)
      + tags_all                             = (known after apply)
    }
```

위에 나오는 attribute들이 사용할 수 있는 것 → 우리는 위에서 `id`를 사용함

Terraform은 어떤 리소스가 먼저 실행됟 지를 정하는데 이를 테라폼 내부의 **dependency graph**를 생성한다.
![](<./_images/Pasted image 20241104180825.png>)
생성 **후**에 알 수 있는 값은  `terraform plan` 실행 시 위와 같이 `(known after apply)`가 뜬다.

### Terraform apply
```sh
terraform apply
```
를 하면 어떤 것은 생성할 것인지 위의 plan의 내용이 다시 나온다.

```sh
Enter a value: yes
```

yes를 입력하면 생성 시작 → console에서 생성 확인

`terraform plan`의 내용을 다시 보지 않고, 자동으로 apply되게 하려면
```sh
terraform apply -auto-approve
```

### Data Sources
위에서처럼 생성 예정인 `vpc_id = aws_vpc.development-vpc.id`이 아닌,
생성이 이미 된 VPC 안에 subnet을 생성하기 위해서는 AWS console에 들어가서 확인하고 그 id를 복사해오는 방법도 있다.
그러나 이 방법도 굉장히 번거롭다.
이런 번거로움을 피하기 위해 query를 하는 방법이 있고 이를 `data`로 한다.
- `resource`: create new resources
- `data` : query existing AWS resources
둘 다 Provider에서 제공해준다.
위 공식문서 링크에 들어가면
![](<./_images/Pasted image 20241103211508.png>)
각 메뉴에 Resources와 Data Sources로 나뉜다.
참조: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/vpc

```hcl ln:true
# the result of query is exported under your given name
data "aws_vpc" "existing_vpc" { 
	default = true
}
```

이것을 사용하면 위의 subnet 생성 코드에서 이를 이용할 수 있다.

```hcl
# 기존코드 (비교용)
	vpc_id = aws_vpc.development-vpc.id   # .id는 여러 개 attribute중 id만 가져오겠다는 뜻
# 수정된 코드의 형태
	vpc_id = data.aws_vpc.existing_vpc.id
```

### Idempotency
위에서 VPC와 Subnet을 생성해보았다.
더 정확히는 생성(create)이 아니고 원하는 state를 declarative하게 선언하는 것 → terraform apply는 현재 상태와 원하는 상태를 비교한다 → 그러므로 terraform의 장점 중 하나는 **idempotency**이다.
- `idempotent`: (사전적 의미)relating to or being a mathematical quantity which when applied to itself under a given binary operation (such as multiplication) equals itself
- 여기서의 뜻 - it can be applied multiple times without changing the result beyond the initial application.
즉, 단지 리소스 생성 소멸 뿐 아니라 중간에 다른 누가 변경한 사항이 있는지 확인 가능.
참고로 *Ansible*도 idempontent한 tool이다.

### Summary
- provider : 각 플랫폼에서 제공하는 library를 import 하는 것
- resource = function call of library that creates sth
- data = function call of library that returns sth
- arguments = parameters of function
