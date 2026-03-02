---
cssclasses:
  - review2
title: 02 Install Terraform
date: 2024-11-27
---
### Install Terraform locally
설치는 Hashicorp 공식 문서를 참조 : https://developer.hashicorp.com/terraform/tutorials/aws-get-started/install-cli

설치 확인
```sh
terraform -v
# or
terraform version
```

만약 특정 버전을 설치하고 싶다면 공식 홈페이지에서 직접 다운로드한다.
참조: https://developer.hashicorp.com/terraform/install

### Providers
Terraform 사용의 첫 단계는 platform에 접속하는 것
![400](<./_excalidraw/2024-09-08_terraform-to-aws.excalidraw.svg>)
Provider란 각 플랫폼(AWS, Azure 등)과 코드가 소통할 수 있는 라이브러리와 같은 개념이다.
공식 홈피: https://registry.terraform.io/browse/providers
→ Official은 전부 hashicorp에서 만든 provider이고, 밑에 보면 Parter사에서 만든 3rd party provider도 있고, 커뮤니티에서 개발된 것도 있다 → jenkins, grafana(hashicorp 꺼가 없음)를 검색하면 파트너사/커뮤니티가 개발한 것이 나온다

### Install and connect to Provider
local 테미널에서 `aws configure`를 했다면 `main.tf`에서
```hcl
provider "aws" {
	region = "ap-northeast-1"
}
```
와 같이 Region만 명시해주면 된다.

access_key와 secret_key는 맥북 `~/.aws`폴더의 `credentials`에서 볼 수 있다.

### Terraform init
- Providers는 종류가 너무 많기 때문에 Terraform에 설치되어있지 않다.
- 위 코드처럼 provider를 써주고 설치해야한다.
- 이 Provider를 설치하는 command가 `terraform init`이다. (→ npm install 과 비슷)

```sh
> terraform init
Initializing the backend...
Initializing provider plugins...
- Finding latest version of hashicorp/aws...
- Installing hashicorp/aws v5.66.0...
- Installed hashicorp/aws v5.66.0 (signed by HashiCorp)
```

`terrafrom init`하는 순간 Terraform은 main.tf 코드의 provider를 보고 자동으로 설치한다.
그리고 자동으로 `.terraform` 폴더와 `.terraform.lock.hcl`이라는 파일이 생성시킨다.
`.terraform.lock.hcl`은 어떤 버전의 provider가 설치되어있는지 트래킹한다.
