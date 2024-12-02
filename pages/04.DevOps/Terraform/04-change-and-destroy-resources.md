---
title: 04 Change and Destroy Resources
date: 2024-11-28
---
### Change Resources
resource에 name을 주려면 tag(key-value pairs)를 준다.
어떠한 key-value도 넣을 수 있지만, `Name`이란 이름의 key는 reserved 값


예시:
```hcl ln:true
provider "aws" {
	region = "ap-northeast-1"    # Tokyo region
}

resource "aws_vpc" "development-vpc" {
	cidr_block = "10.0.0.0/16"
	tags = {
		Name: "development"
		vpc_env: "dev"
	}
}

resource "aws_subnet" "dev-subnet-1" {
	vpc_id = aws_vpc.development-vpc.id   # .id는 여러 개 attribute중 id만 가져오겠다는 뜻
	cidr_block = "10.0.10.0/24"  # subset of VPC's CIDR
	availability_zone = "ap-northeast-1a"
	tags = {
		Name: "development"
	}
}
```

```sh
terraform apply --auto-approve
```

실행 시 나오는 메세지 중 
`+`: 신규 생성
`~`(tilde): 변경
`#`: 변경 없음
`-`: 제거
생성 후 AWS console에서 보면 VPC와 Subnet에 이름이 붙은 것을 확인할 수 있다.

### Destroying resources
리소스 제거 방법은 두 가지가 있다.
- 한 가지는 코드를 그냥 삭제하면 current state와 비교를 해서 지운다.
- 또 하나는 terraform command로 이름을 명시한다.

```sh
terraform destroy -target <resource_type>.<resource_name>
terraform destroy -target aws_subnet.dev-subnet-1
```

그러나 destroy command을 하면 configuration file은 그대로이므로, 첫번째 방법(코드 삭제)을 추천한다.

소스코드에 있는 전체를 올바른 순서로 *전부* 지우고 싶으면
```sh
terraform destroy
```

를 사용해도 된다.

