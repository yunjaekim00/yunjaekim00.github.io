---
title: 10 Provision EC2 - 2
date: 2024-12-02
---

### Run entry point script to start Docker container
`user_data`라는 attribute는 EC2가 생성되고 실행이 될 수 있는 script
```hcl
resource "aws_instance" "myapp-server" {
	user_data = <<EOF
        [여기에 shell script 코드]
							EOF
}
```

EOF 사이에 shell script를 넣어서 실행할 수 있다.

```hcl title:main.tf
resource "aws_instance" "myapp-server" {


	user_data = <<EOF
		#!/bin/bash
		sudo yum update -y && sudo yum install -y docker
		sudo systemctl start docker
		sudo usermod -aG docker ec2-user
		docker run -p 80:80 nginx
	EOF


}
```

나중에 다른 코드를 변경해도 위 script는 한 번만 실행됨

```sh
terraform apply --auto-approve
```

script가 더 길다면 이전처럼 분리하고 file location을 적어주는 방법도 있다.

### shell script file
위 코드를 다음과 같이 파일 경로로 바꿈
```hcl
user_data = file("./sh-script/entry-script.sh")
```

`./sh-script/entry-script.sh` 생성
```sh title:entry-script.sh
		#!/bin/bash
		sudo yum update -y
		sudo yum install -y docker
		sudo systemctl start docker
		sudo usermod -aG docker ec2-user
		docker run -p 8080:80 nginx
```

```sh
terraform plan
terraform apply --auto-approve
```

### Configuring Infrastructures not Servers
위의 과정을 요약하면, Infra가 생성되고 나면 Terraform이 아닌 일반 shell script로 docker를 설치했다. Shell script는 Terraform이 아니기 때문에, 예를들어 `-y`를 넣지 않아 다음 script가 진행되지 않을 때 Terraform이 알 방법이 없다.
즉, infra는 현재 `state`가 어떤 지 Terrafom이 control하고 모니터링 할 수 있지만, **shell script** 자체는 실행이 제대로 되고 있는지 아닌지 Terraform이 control이나 모니터링을 할 수 없다. 디버깅을 위해서 다시 직접 EC2에 ssh 접속을 해서 들어가봐야한다. 

이 영역을 커버하기 위한 도구는 다음과 같은 것이 있다.
- Chef
- Puppet
- Ansible

이를 Configuration Management Tools라 부른다.

