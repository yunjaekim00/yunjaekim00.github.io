---
title: 05. State, Output
date: 2024-11-28
---
### State
- `terraform apply` 할 때 자동 생성된 `terraform.tfstate`은 현재의 state를 json 형태로 저장함
- `terraform.tfstate.backup`은 terraform apply를 하기 전의 상태를 백업한 것

```sh
terraform state
```
를 치면 모든 sub-command 들이 나온다

```sh
terraform state list
```
를 실행하면 현재 상태를 보여준다.

list에 있는 목록을 선택해서
```sh
terraform state show aws_subnet.dev-subnet-1
```
하면 자세한 정보 표시

위 `terraform state show`는 꽤 자주 사용하는 명령어니 꼭 기억한다.
예를들어 생성된 VPC를 조회하면
```sh hl:1
> terraform state show aws_vpc.myapp-vpc             
# aws_vpc.myapp-vpc:
resource "aws_vpc" "myapp-vpc" {
    arn                                  = "arn:aws:ec2:ap-northeast-1:318919594903:vpc/vpc-0a3486057f30d8df3"
    assign_generated_ipv6_cidr_block     = false
    cidr_block                           = "10.0.0.0/16"
    default_network_acl_id               = "acl-07db380a87c453cd2"
    default_route_table_id               = "rtb-0258a12ebcee442ee"
    default_security_group_id            = "sg-00248d764d7f2fb58"
    dhcp_options_id                      = "dopt-09c4c0f4d76e54f49"
    enable_dns_hostnames                 = false
    enable_dns_support                   = true
    enable_network_address_usage_metrics = false
    id                                   = "vpc-0a3486057f30d8df3"
    instance_tenancy                     = "default"
    ipv6_association_id                  = null
    ipv6_cidr_block                      = null
    ipv6_cidr_block_network_border_group = null
    ipv6_ipam_pool_id                    = null
    ipv6_netmask_length                  = 0
    main_route_table_id                  = "rtb-0258a12ebcee442ee"
    owner_id                             = "318919594903"
    tags                                 = {
        "Name" = "dev-vpc"
    }
    tags_all                             = {
        "Name" = "dev-vpc"
    }
}
```

추후 hcl 코드에서 `aws_vpc.myapp-vpc`뒤에 `.id`를 붙일 수 있는지, 조회할 수 있는 목록은 무엇인지 목록을 볼 수 있다.

### Output
Terraform 소스 (main.tf)에 어떤 값을 output 할 것인지 지정할 수 있다.
Javascript에서 `console.log`랑 비슷하다.
코드의 syntax는 one output value for each attribute 형식이다.

```hcl title:main.tf ln:22
output "dev-vpc-id" {
	value = aws_vpc.development-vpc.id
}

output "dev-subnet-1" {
	value = aws_subnet.dev-subnet-1.id
}
```

```sh title:result
> terraform apply -auto-approve

Outputs:

dev-subnet-1 = "subnet-09d9df57b35b3e33f"
dev-vpc-id = "vpc-0af86aa72c2b8a0fc"
```

뒤 글에 쓰겠지만 내가 EC2를 생성하고 그 EC2에 접속하기 위해서 public IP 주소가 필요한데, AWS console에 다시 로그인할 필요없이 Output으로 출력해주면 좋다.