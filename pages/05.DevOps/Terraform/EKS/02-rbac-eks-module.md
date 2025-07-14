---
title: Creating AWS EKS with RBAC configuration
date: 2025-07-14
---
# Creating AWS EKS with RBAC configuration
### 기본 개념
Security를 위한 best practice 중 하나는, Admin user라고 무작정 admin privilege를 주지 않고 admin 이어도 kubectl과 같은 명령어로 system에 직접적으로 수정할 수 없게하고, kubectl로는 조회(describe, get)만 가능하게 하고 오직 Terraform과 같은 IaC로만 변경할 수 있게 한다.

![center|400](./_images/Pasted%20image%2020250714173710.png)

또한 least priviledge rule에 충실하게 특정 유저에게는 K8s cluster 전체에서 하나의 namespace를 조회할 권한만 줄 수 있다. (→ 이름은 상관없지만 여기서는 이를 위해 `developer`라는 유저를 만들 것이다.)
특정 namespace에만 주는 역할은 `Role`이라는 K8s object가 있고, Admin user처럼 cluster 전체에 대한 권한(cluster-wide access)을 줄 때는 `ClusterRole`을 사용한다.
그리고 이 `Role`을 유저에게 부여하는 것을 `RoleBinding`이 하게 되고, `ClusterRole`을 유저에게 부여하는 것을 `ClusterRoleBinding`을 통해 하게 된다.

여기서는 
→ Admin 한테도 cluster-wide read only access를 준다 → **ClusterRole** for admin을 생성
Developer는 **Role** (read only)만 부여 (혹은 특정 namespace) → then add config that maps Role with IAM

### 기존 방식 v.19
#### aws-auth ConfigMap
기존 방식 (`terraform-aws-modules/eks/aws` version 19까지)은 AWS EKS를 생성하는 순간
EKS가 master node의 API Server안에 `aws-auth`라는 ConfigMap을 박아놓는다.

K8s cluster의 모든 요청은 이 master node의 API Server로 들어가는데 AWS 계정에 대한 인증은 이 `aws-auth`에서 이루어진다. 과거에 생성했던 EKS에 조회를 해보면

```sh
❯ kubectl get cm -A | grep aws-auth
kube-system       aws-auth
```

존재한다. EKS를 생성한 유저 (즉, EKS creator)에게는 이 CM에 EKS에 대한 admin 권한이 **자동적으로** 주어졌다.

우리가 RBAC과 IAM principals를 추가하기 위해서는 이 CM(ConfigMap)을 수정해야한다.

```sh
kubectl edit cm aws-auth -n kube-system
```

해서 권한을 주고 싶은 IAM user의 ARN주소를 넣으면 admin 권한을 줄 수가 있다.

기존(v.19)에도 Terraform으로 RBAC 설정을 위해서는 이 cm(ConfigMap)을 수정해야주어야했고, version 20에는 ConfigMap과 API 방식을 혼용해서 사용해도 되지만 version 21에서는 완전히 API방식으로 바뀐다고 하니 (참조: https://github.com/terraform-aws-modules/terraform-aws-eks/blob/master/docs/UPGRADE-20.0.md) API 방식을 이용해보자. Syntax도 version 19에 비해서 몇 가지 변경되었다. 기존 버전은 이제 알 필요없으니 바로 version 20의 API 방식으로 코딩해보자.

기존 RBAC 방식에서 ConfigMap이 Access entry API로 바뀐 점 하나밖에 없지만, RBAC을 사용해보지 않았던 개발자라면 우선 RBAC 방식에 대해 이해할 필요가 있다. 그래야지만 복잡한 RBAC을 헷깔리지 않는다.
가장 **중요한 점**은 어떤 것이 Kubernetes native 영역이고, 어디가 AWS EKS 고유의 영역이며, 어떤 영역이 AWS IAM 영역인지를 구분하는 일이다. 위 그림을 한 단계 더 자세히 보자면 (그리고 실제로 여기서 구현할 Terraform 코드의 계획) 다음과 같다.

![400|center](./_images/Pasted%20image%2020250714173804.png)

Kubernetes cluster 내의 이름은 당연히 절대 IAM user의 이름이 아니다. 그래서 'admin'이라는 Kubernetes의 user_name에 IAM user yjkim을 K8s role mapping을 해주어야 한다. K8s role mapping 기존 ConfigMap 방식때 이름이었고, 개념은 똑같지만 새로운 공식명칭은 **Access Entry**이다. 이름이 변경된 이유는 K8s role mapping은 실제로 AWS IAM의 user 혹은 roled을 K8s의 role에 mapping하는 것이지만 너무 기니깐 줄인 것이 K8s role mapping인데 이 단어에는 IAM이 안 들어가니 의미가 왜곡되서 그런 것. 아무튼 중요하지 않으니 여기서 줄이고.

위에 그림처럼 'developer'는 K8s 내에서의 이름이다. 이것을 'hcche'라는 IAM user와 연결할 것이다. K8s group이라고 하는 것은 K8s cluster 내부의 group인데 큰 의미는 없다. 만약 여러 명을 같은 K8s group으로 놓는다면 (위 그림의 'cluster-viewer' K8s group처럼 각각의 user_name이 아닌 그 group 자체에 ClusterRole 혹은 Role을 줄 수 있다.

### Terraform code with eks ver.20
#### Access keys
우선 이 Terraform 코드에서 출발해본다.
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

위에 `access_key`와 `secret_key`는 AWS console에서 Terraform과 같은 IaC가 전용으로 사용하는 user를 (예를들어 `devops_admin`이라는 계정을) 생성하고 거기서 key를 생성해와서 `terraform.tfvars`에 입력한다. (물론 `variables.tf`에 선언도 한다.)

#### EKS Module
그리고 다음 기본 EKS 생성 코드에서 출발하자.
`01-main-eks.tf`
```hcl ln:true
# EKS Cluster
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.0"

  cluster_name                   = var.name
  cluster_version                = var.k8s_version
  cluster_endpoint_public_access = true
  
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  create_cluster_security_group = false
  create_node_security_group    = false
  
  eks_managed_node_groups = {
    initial = {
      instance_types = ["t3.micro"]
      min_size     = 1
      max_size     = 10
      desired_size = 2
    }
  }

  tags = var.tags
}
```

위 코드를 보면 `module`로 시작을 한다. 
어떤 테라폼 코드는 `resource`로 시작하는 것을 볼 수 있다.
이 둘의 차이는 `resource`는 일일이 개인이 수동으로 설정하는 방식이고, `module`은 이미 있는 라이브러리를 쓰는 개념이다. 즉, 코드의 길이 자체는 `module`을 쓰는 것이 훨씬 적지만 장단점이 있다. 마치 `eksctl`을 사용해서 자동으로 vpc, subnet 생성하는 것과 `aws` cli 명령어로 내가 원하는 리소스만 생성하는 것과 유사하다.

#### EKS Addons
EKS module 안에 설치할 addon을 추가해보자. kube-proxy, vpc-cni, coredns 3가지는 거의 필수 3총사라 할 수 있고, `Pod Identity Agent`는 추후 사용할 addon인데 미리 설치해두자. 그래서 다음 코드를 추가한다.

```hcl
  cluster_addons = {
    kube-proxy = {
      most_recent = true
    }
    vpc-cni = {
      most_recent = true
    }
    coredns = {
      most_recent = true
      configuration_values = jsonencode({
        computeType = "EC2"
      })
    }
    eks-pod-identity-agent = {
      most_recent = true
    }
  }
```

위에 `computeType = "EC2"`는 자동으로 Fargate를 사용하지 않는다고 명시해주는 용도고 필수는 아니지만 넣어준다.

#### API mode
EKS module 안에 다음 두 줄 추가
```hcl
  authentication_mode = "API"  
  enable_cluster_creator_admin_permissions = true
```

위에 언급했듯이 ConfigMap이 아닌 `API` only 모드로 명시하고
위에서 세팅한 `devops_admin`이라는 AWS IAM user의 access key를 이용하므로 admin permission을 true로 한다. → 사실 EKS 생성시 admin 권한이 없으면 생성조차 안 되니 당연히 true.

#### Access Entries
같은 파일 내에서 코딩을 해도 되지만 `01-main-eks.tf`에다가 다음 코드를 추가하고

```hcl
access_entries = local.access_entries
```

local 변수를 이용해서 선언하자.
Terraform은 변수를 `variables.tf`에 정의하고 변수 값을 `terraform.tfvars`에 주입하는 방식도 있지만, Terraform 자체는 같은 폴더에 있는 모든 `.tf`파일을 하나의 `.tf`파일로 간주하므로 어떠한 .tf 파일에도 그냥 `locals {` (여기는 `s`가 들어감에 유의)에 선언하면 그냥 그 변수를 `local.`이라는 변수로 불러올 수 있다.

순서가 좀 헷깔리겠지만 저 `local.access_entries`는 나중에 선언해주기로 하고 우선 IAM roles를 만들어보자.

#### 전체 RBAC 구성도

![center](./_images/Pasted%20image%2020250714173844.png)

위 그림은 AWS 공식문서에 있는 그림이다. 우선 저 빨간 모자 모양의 Role부터 만들어줄 것이다.

#### IAM roles
`03-iam-roles.tf` 생성 → 공식문서: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role

중요한 것 - Kubernetes의 role이 아닌 AWS의 role이다.
`eks-external-admin`의 role 이름으로 만들어본다.

```hcl
resource "aws_iam_role" "eks-external-admin" {
  name = "eks-external-admin"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Sid    = ""
        Principal = {
          AWS = var.user_for_admin_role
        }
      },
    ]
  })
}
```

user의 arn 주소를 변수로 assume role을 해준다.
Assume Role이란 AWS에서 중요한 개념으로 코드에 `Principal`에 IAM user를 명시하고, 이 user가 이 IAM role을 assume(역할을 맡다)할 수 있도록 허용해주는 것.

`variables.tf`에 선언해준다.
```hcl
variable user_for_admin_role {}
```

`terraform.tfvars`에 IAM user의 ARN 주소를 넣어준다.
```hcl
user_for_admin_role="arn:aws:iam::11111111111111:user/yjkim"
```

그리고 위 role에 이어서 바로 inline policy를 붙여준다. Inline이라 함은 AWS console에서 policy를 검색해도 따로 보이지 않지만 role에 붙여주는 policy를 말한다. 

`03-iam-role.tf` 코드
```hcl ln:true
resource "aws_iam_role_policy" "eks-external-admin-policy" {
  name = "eks-external-admin-policy"
  role = aws_iam_role.eks-external-admin.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action   = ["eks:DescribeCluster"] 
        Effect   = "Allow"
        Resource = "*"
      },
    ]
  })
}
```

위에 보이듯이 DescribeCluster (Read 권한)만 admin에게 준다. `eks:`에서 보이듯이 이 또한 Kubernetes 자체의 권한이 아닌 AWS EKS에 대한 권한이다.

### Mapping to K8s
이제 IAM user의 role에 Kubernetes user에 mapping 시켜보자. → 위에 local 변수로 만들었던 것을 선언해본다.
`04-kube-resources.tf`를 생성

```hcl
locals {
	access_entries = {
		# Admin user access entry
		admin = {
			principal_arn = aws_iam_role.eks-external-admin.arn
			
			kubernetes_groups = ["cluster-viewer"]  # system:masters는 제외하고 명명
			
			user_name = "admin"
			
			# Type of access entry
			type = "STANDARD"
		}
	}
}
```

`kubernetes_groups`는 자유롭게 이름을 설정할 수 있지만 `system:masters`라고 쓰면 K8s root 권한이 주어진다.
위의 `user_name`은 K8s의 user로 설정하는 값.

### Create IAM Policy
AWS console → IAM 내 아이디에 → 다음과 같이 create *policy*

![center|400](./_images/Pasted%20image%2020250714173913.png)

```json
{
	"Version": "2012-10-17",
	"Statement": [
		{
			"Sid": "Statement1",
			"Effect": "Allow",
			"Action": [
			        "sts:AssumeRole"
			    ],
			"Resource": "*"
		}
	]
}
```

→ name : 'assume-role-policy'으로 만들었다.
더 정확하게 하기 위해서는 위의 `Resource`에 `*`가 아닌 `eks-external-admin` role의 ARN 주소를 넣으면 되지만 내 아이디는 Admin이니 굳이 국한하지 않는다. 중요한 것은 아까 생성한 `eks-external-admin`의 inline policy는 내 아이디를 허용하는 것이고, 위의 policy의 AssumeRole을 설정해서 서로 더블체크를 하는 개념이다. 단지 AdministratorAccess가 있다고 이 계정의 모든 EKS에 접속할 수 있는 것이 아니라는 점이 중요하다.

`terraform.tfvars`에 추가

#### Providers
`eksctl` version 20의 공식문서를 보면 테라폼에 대한 최소 요구사항이 나온다. 이걸 참조해서 provider를 작성.
`04-kube-resources.tf`에서는 Kubernetes를 사용할 것이기 때문에 Provider에 Kubernetes를 아래와 같이 추가한다.
Kubernetes의 테라폼 버전은 여기서 확인 → 공식문서: https://registry.terraform.io/providers/hashicorp/kubernetes/latest

```hcl
terraform {
  required_version = ">= 1.3"  # Updated minimum version for v20
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.34"  # Updated minimum version for v20
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.37"
    }
  }
}
```

#### certificate
테라폼의 코드 실행 단계에서는 아직 EKS가 만들어진 상태가 아닐 것이기에, `.kube/config`도 처음부터는 없다. 만들어진 후에 `eks`의 enpoint를 가져오고, 동적으로 이 인증 configuration을 가져오자.

`04-kube-resources.tf`
```hcl
provider "kubernetes" {
  host = module.eks.cluster_endpoint  # output에서 가져옴
	cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)  # terraform 공식문서에 있는 attribute "https://registry.terraform.io/modules/terraform-aws-modules/eks/aws/latest"
	# base64decode는 테라폼 명령어
	# EKS에 접속하기 위해 eks에서 발행하는 client token도 필요 -> 여기서 생성
	exec {  # execution block -> executed locally so AWS CLI is required
		api_version = "client.authentication.k8s.io/v1beta1"
		command = "aws"
		args = ["eks", "get-token", "--cluster-name", module.eks.cluster_name]
	}
}
```

`cluster_ca_certificate`은 K8s의 인증서

### ClusterRole and ClusterRoleBinding
`03-iam-roles.tf`는 AWS resources를 생성했고
https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/cluster_role
위 페이지를 참조해서 `04-kube-resources.tf`에서 코딩

```hcl
# create Cluster Role
resource "kubernetes_cluster_role" "cluster-viewer" {
  metadata {
    name = "cluster-viewer"
  }

  rule {
    api_groups = [""]
    resources  = ["*"]
    verbs      = ["get", "list", "watch", "describe"]
  }
}

# create Cluster Role Binding
resource "kubernetes_cluster_role_binding" "cluster-viewer-group" {
  metadata {
    name = "cluster-viewer-group"
  }
  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "ClusterRole"
    name      = "cluster-viewer"
  }
  subject {
    kind      = "Group"
    name      = "cluster-viewer"
    api_group = "rbac.authorization.k8s.io"
  }
}
```

modify, update 권한은 주지 않았다.

Role과 RoleBinding도 위와 마찬가지로 하면 되고, Kubernetes Group이 아닌 user를 사용하려면 위 `kind`를 `Group`에서 `User`로 변경하면 된다.
