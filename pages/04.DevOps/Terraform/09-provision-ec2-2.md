---
title: 09 Provision EC2 - 2
date: 2024-11-30
---
### EC2
#### AMI ID
AMI id가 우선 필요 → AWS console에 나온다.
![](<./_images/Pasted image 20241126113400.png>)

주의: 
- 같은 OS여도 Region마다 ID가 다르다.
- 게다가 같은 이미지여도 이미지가 업데이트되면 id가 달라진다.

그러므로 terraform `data`를 이용해 최신 정보를 query 한다.
우선 AWS console에서 EC2 메뉴에 AMI 메뉴에서 필요한 OS의 AMI를 검색하고 filter를 걸어 원하는 이미지의 AMI id를 가져온다.
테스트를 위해 `data`와 `output`만으로 짜보자.

```hcl title:main.tf
data "aws_ami" "latest-amazon-linux-image" {
	most_recent = true
	owners = ["amazon"]
	filter {
		name = "name"
		values = ["amzn2-ami-kernel-*-x86_64-gp2"]
	}
	filter {
		name = "virtualization-type"
		values = ["hvm"]
	}
}

output "aws_ami_id" {
	value = data.aws_ami.latest-amazon-linux-image.id
}
```

```sh hl:1
> terraform plan
Changes to Outputs:
  + aws_ami_id     = "ami-0d5239870cadff63c"
```


#### Instance type
`terraform.tfvars`에 필요한 이미지를 변수로 빼두고
```hcl title:terraform.tfvars
instance_type = "t3.micro"
```

위 정보들을 이용해 EC2 instance를 생성.
subnet, SG, AZ는 지정을 해주지 않으면 default에 생기므로 지정해주는 것이 좋다.

```hcl title:main.tf
variable instance_type {}

resource "aws_instance" "myapp-server" {
	ami = data.aws_ami.latest-amazon-linux-image.id
	instance_type = var.instance_type
	# specify otherwise created in the default space
	subnet_id = aws_subnet.myapp-subnet-1.id
	vpc_security_group_ids = [aws_default_security_group.default-sg.id]
	availability_zone = var.avail_zone

	associate_public_ip_address = true
	key_name = "server-key-pair-tyoko"

	tags = {
		Name = "${var.env_prefix}-server"
	}
}
```

명시할 attribute : ami, instance_type, vpc

AWS console에서 key pair 생성
![400](<./_images/Pasted image 20241126135000.png>)
다운로드받은 `.pem`파일은 (어떤 폴더이건 상관없지만 관행상 내 맥북의) `~/.ssh` 폴더로 옮긴다

```sh
mv server-key-pair-tyoko.pem ~/.ssh/
cd ~/.ssh
chmod 400 server-key-pair-tyoko.pem
```

```sh
terraform plan
terraform apply --auto-approve
```

AWS console에서 보면
![](<./_images/Pasted image 20241126142246.png>)
EC2의 IP는 subnet의 cidr에서 IP를 따온 것을 볼 수 있다

### key pair
위와 같이 AWS console에서 다운로드받은 pem 파일로 접속할 수도 있지만
만약 Gitlab 접속할 때와 같이 local의 `~/.ssh`에 `id_rsa`를 미리 만들어놓았다면 이것을 그대로 사용할 수도 있다.

```sh
cd ~/.ssh
ls
```

하면 `id_rsa`는 private key이고, `id_rsa.pub`는 public key

아직 없으면 다음 명령어로 생성
```sh
ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa
```


```sh hl:1
cat id_rsa.pub
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQDeDeM2G8xjV6d5O3zmErRoBTJ6K/uSTcmY2uJOagIiUxyS2jbqgOOP+7tHJC0R...(몇 줄 더 )...wb68onatQQZe3xSoUthhcTvTFBw== yjkim@plateer.com
```

복사하고 → `terraform.tfvars`에 위 문구를 하드코딩해도 되지만, file location으로 넣어도 된다
```hcl title:terraform.tfvars
public_key_location = "/Users/yunjaekim/.ssh/id_rsa.pub"
```

```hcl title:main.tf
variable public_key_location {}
```

```hcl ln:130
key_name = aws_key_pair.ssh-key.key_name
```

```hcl ln:137
# ---- create key pair -----
resource "aws_key_pair" "ssh-key" {
	key_name = "server-key-tyoko"
	# need public_key for AWS to create a key pair
	public_key = file(var.public_key_location)
}

output "ec2_public_ip" {
	value = aws_instance.myapp-server.public_ip
}
```

이제 `terraform apply`후에 내 `id_rsa`로 ssh 접속 가능
```sh
ssh -i ~/.ssh/id_rsa ec2-user@13.231.209.68
```

위에 `-i ~/.ssh/id_rsa`는 default 설정이므로 이제 
```sh
ssh ec2-user@13.231.209.68
```
로 접속 가능 → advantage of using local key pair

