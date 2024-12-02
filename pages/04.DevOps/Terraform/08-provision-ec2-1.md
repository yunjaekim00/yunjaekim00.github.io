---
cssclasses:
  - review2
title: 08 Provision EC2 - 1
date: 2024-11-28
---
### VPC & Subnet
VPC와 Subnet 생성부터 시작
추후에 dev환경과 prd환경의 이름은 prefix만 변경해서 적용하기 위해서 이름에 변수 사용
변수를 이름에 넣을 때 **따옴표 안**에 들어오는 것에 유의 : `"${var.env_prefix}-vpc`

`main.tf`
```hcl title:main.tf
provider "aws" {
	region = "ap-northeast-1"    # Tokyo region
}

variable vpc_cidr_block {}
variable subnet_cidr_block {}
variable avail_zone {}
variable env_prefix {}

resource "aws_vpc" "myapp-vpc" {
	cidr_block = var.vpc_cidr_block
	tags = {
		Name: "${var.env_prefix}-vpc"
	}
}

resource "aws_subnet" "myapp-subnet-1" {
	vpc_id = aws_vpc.myapp-vpc.id
	cidr_block = var.subnet_cidr_block
	availability_zone = var.avail_zone
	tags = {
		Name: "${var.env_prefix}-subnet-1"
	}
}
```

`terraform.tfvars`
```hcl title:terraform.tfvars
vpc_cidr_block = "10.0.0.0/16"
subnet_cidr_block = "10.0.1.0/24"
avail_zone = "ap-northeast-1a"
env_prefix = "dev"
```

```sh
terraform plan
terraform apply --auto-approve
```


### 용어 정리
AWS console에 들어가면 위 코드로 자동으로 생성되는 것이 있다
Route table, Network ACL, Security Group 등
![](<./_images/Pasted image 20241129155247.png>)
#### Internet Gateway 
- 가상 모뎀과 비슷한 개념

#### Security Group
- firewall on a server level
- *closed* by default
#### NACL (Network ACL)
- firewall on a subnet level
- *open* by default
#### Route table
 VPC 내에서 트래픽이 어디가는지 결정, 가상 라우터라 생각하면 된다.

### IGW 생성
IGW internet gateway는 다음처럼 생성하면 된다.
```hcl title:main.tf
resource "aws_internet_gateway" "myapp-igw" {
	vpc_id = aws_vpc.myapp-vpc.id
	tags = {
		Name: "${var.env_prefix}-igw"
	}
}
```

### Route Table
그러나 
```hcl
resource "aws_route_table"
```
을 이용해 Route Table을 새로 만들면,
VPC를 새로 생성할 때 자동으로 만들어지는 default RT은 그대로 자동으로 생성된 채, 새로운 RT이 만들어진다.

#### Using the default Route Table
default RT이 있기 때문에 이것을 그대로 사용할 수도 있다
`resource "aws_route_table"` 대신
```hcl
resource "aws_default_route_table"
```
을 사용하면 된다.

이 default RT은 attribute으로 자동으로 생성된 default RT의 id가 필요하다.
이를 조회하기 위해서 다음을 실행해본다.

```sh hl:1
❯ terraform state show aws_vpc.myapp-vpc
# aws_vpc.myapp-vpc:
resource "aws_vpc" "myapp-vpc" {
    arn                                  = "arn:aws:ec2:ap-northeast-1:318919594903:vpc/vpc-0f213ce3621f2bb30"
    assign_generated_ipv6_cidr_block     = false
    cidr_block                           = "10.0.0.0/16"
    default_network_acl_id               = "acl-078da35393228a5ac"
    default_route_table_id               = "rtb-062c02cb56901819a"
    default_security_group_id            = "sg-0101949a0d403e94b"
    dhcp_options_id                      = "dopt-09c4c0f4d76e54f49"
    enable_dns_hostnames                 = false
    enable_dns_support                   = true
    enable_network_address_usage_metrics = false
    id                                   = "vpc-0f213ce3621f2bb30"
    instance_tenancy                     = "default"
    ipv6_association_id                  = null
    ipv6_cidr_block                      = null
    ipv6_cidr_block_network_border_group = null
    ipv6_ipam_pool_id                    = null
    ipv6_netmask_length                  = 0
    main_route_table_id                  = "rtb-062c02cb56901819a"
    owner_id                             = "318919594903"
    tags                                 = {
        "Name" = "dev-vpc"
    }
    tags_all                             = {
        "Name" = "dev-vpc"
    }
}
```

위의 결과를 보면 `aws_vpc.myapp-vpc.default_route_table_id`로 access 할 수 있다.

```hcl title:main.tf ln:true hl:1,2
resource "aws_default_route_table" "main-rtb" {
	default_route_table_id = aws_vpc.myapp-vpc.default_route_table_id
	route {
		cidr_block = "0.0.0.0/0"
		gateway_id = aws_internet_gateway.myapp-igw.id
	}
	tags = {
		Name: "${var.env_prefix}-main-rtb"
	}
}
```


### Security Group
incoming traffic are configured by attribute called *Ingress*
security group은 Azure의 NSG와 마찬가지로
4가지 값이 필요하다 : from_port, to_port, protocol, cidr_blocks
`cidr_blocks`는 open을 할 source로 내 IP 하나만 지정할 때는 끝에 `/32`를 붙여준다.

Security Group도 위의 Route Table과 마찬가지로
```hcl
resource "aws_security_group"
```
이것으로 생성을 한다면 default SG는 여전히 자동으로 생성되고
별도의 SG이 만들어진다.

만약 위의 코드를 이용해 만들고 AWS console을 보면 
![500](<./_images/Pasted image 20241126101651.png>)
이처럼 2개가 생긴다.
그래서 Route Table처럼 SG도 default를 이용해준다.

#### Using the default SG
default를 사용하려면 `aws_default_security_group`을 사용하면 된다.
```hcl title:main.tf ln:true
resource "aws_default_security_group" "default-sg" {

	vpc_id = aws_vpc.myapp-vpc.id

	ingress {
		from_port = 22
		to_port = 22
		protocol = "tcp"
		cidr_blocks = [var.my_ip]
	}
	ingress {
		from_port = 80
		to_port = 80
		protocol = "tcp"
		cidr_blocks = ["0.0.0.0/0"]
	}
	egress {
		from_port	= 0
		to_port = 0
		protocol = "-1"  # any
		cidr_blocks = ["0.0.0.0/0"]
		prefix_list_ids = []  # just allowing access to VPC endpoints
	}
	tags = {
		Name: "${var.env_prefix}-default-sg"
	}
}
```

위에서 port 22는 내 IP에서만 로그인 가능, 
http인 port 80은 전부 가능
그리고 밖으로 나가는 egress는 전부 가능으로 설정하였다