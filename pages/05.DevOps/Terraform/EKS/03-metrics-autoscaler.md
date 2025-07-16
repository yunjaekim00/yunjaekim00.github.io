---
title: 03. Install Metrics Server and Cluster Autoscaler using Terraform and EKS blueprints
date: 2025-07-16
---
# 03. Install Metrics Server and Cluster Autoscaler using EKS Blueprints
## 1. EKS blueprints
- AWS EKS의 복잡한 설정때문에 AWS에서 이를 좀 더 수월하게 bootstrap으로 설치하기 위해 2022년 쯤 open source project인 EKS blueprints라는 것을 시작했다.
- 소개 문서 참조: https://aws.amazon.com/ko/blogs/containers/bootstrapping-clusters-with-eks-blueprints/
- EKS blueprints란 IaC(Infrastructure as Code) modules의 집합이다.
- Terraform EKS blueprints: https://registry.terraform.io/modules/aws-ia/eks-blueprints-addons/aws/latest
- Terraform에 Prometheus라던지 Keda와 같은 오픈소스 addon을 true, false 한 줄로 설치가 가능하다
- 단 한 줄로 자동으로 설치되니, 매번 설치시마다 개발자가 원하는 사양으로 consistent하게 설치가 되려면 DevOps 개발자가 세부 configuration을 조정해줘야하는 데 이도 할 수 있다.
- 이 글에서는 `kubectl top`을 위한 **Metrics Server**와 worker node의 auto-scaling을 위한 **CA(Cluster Autoscaler)** 두 가지를 설치해보겠다.
## 2. Add ons
### Kubernetes Cluster Autoscaler
- K8s version 1.8부터 출시되었고, worker node auto-scaling을 하게 해준다.
- Azure, GCP는 K8s cluster를 console에서 생성할 때 checkbox를 클릭만 하면 자동으로 node auto-scaling이 된다.
- 하지만 AWS EKS는 기본적으로 built-in되지 않고 2가지 도구를 지원만 한다 → **Karpenter**, **CA** → EKS Blueprints에서는 둘 다 설치를 제공한다. 
- K8s master node의 Scheduler가 pod가 배포할 공간이 없으면 pending state가 되고 'unschedulable'로 label하면 CA(Cluster Autoscaler)가 이를 가져와 node를 늘려주는 도구이다.
### Kubernetes Metrics Server
- 이 metrics server도 EKS에 default로 설치되어있지 않다.
- It's an Aggregator of resource usage data
- Kubelet에서 resource metrics 수집해 Metrics API 를 통해 K8s API server에 정보를 제공해준다.
- Horizontal and Vertical Pod Autoscaler use these data to make scaling decisions → 그러나 VPA는 아직도 베타 단계라 안정적이지 않다.
- 비슷한 것으로 **Kube-State-Metrics Service**라는 것도 있는데, 이것은 node와 pod의 health에 초점을 맞춘다. (여기서는 설치하지 않음)

## 3. Configure EKS add ons in Terraform
https://registry.terraform.io/modules/aws-ia/eks-blueprints-addons/aws/latest
위 링크에 있는 샘플 코드를 참조하였다.

```hcl
module "eks_blueprints_addons" {
  source = "aws-ia/eks-blueprints-addons/aws"
  version = "~> 1.21" #ensure to update this to the latest/desired version

  cluster_name      = module.eks.cluster_name
  cluster_endpoint  = module.eks.cluster_endpoint
  cluster_version   = module.eks.cluster_version
  oidc_provider_arn = module.eks.oidc_provider_arn

  enable_cluster_autoscaler              = true
  enable_metrics_server                  = true
}
```

- OIDC는 EKS내 entity에 AWS identity를 주는 역할 → OIDC provider acts as intermediary between AWS and EKS entities → 자동으로 생성해준다.
### Helm charts
위 addon(cluster_autoscaler와 metrics_server)은 코드의 background에서 Helm charts로 설치가 된다. 그런데 Helm으로 설치될 때 우리는 이 Helm에게 EKS cluster에 권한을 주어야한다.
이전에 kubernetes코드와 똑같이 해주면 된다.

`01-main-eks.tf`에 다음 코드 추가
```hcl
provider "helm" {
  kubernetes {
    host = module.eks.cluster_endpoint 
    cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data) 
    exec {
      api_version = "client.authentication.k8s.io/v1beta1"
      command = "aws"
      args = ["eks", "get-token", "--cluster-name", module.eks.cluster_name]
    }
  }
}
```

`02-providers.tf`에 추가 → 참고: https://github.com/aws-ia/terraform-aws-eks-blueprints-addons?tab=readme-ov-file#provider_helm
위 공식문서에 3.0이상에서는 지원을 하지 않기 때문에 아래처럼 설정한다.
```hcl
    helm = {
      source = "hashicorp/helm"
      version = ">= 2.9, < 3.0"
    }
```

실행
```sh
terraform apply -var-file="terraform.tfvars" --auto-approve
```

### Verification
이전 설정 코드에서 `min:1, desired:2`로 설정했는데 이게 잘 적용되고 있는지 다음 코드로 확인을 한다.
```sh
k logs cluster-autoscaler-aws-cluster-autoscaler-asdf -n kube-system
```

분명 Scheduler를 체크는 계속하지만 막상 min:1 사이즈로 줄이지 않는다 → 추가 설정을 해줘야한다.

이 추가 설정을 위해 과연 저 EKS Blueprint가 내부에서 어떤 helm chart에서 설치를 하는지 알아본다.
Autoscaler는 https://github.com/kubernetes/autoscaler 이 소스를 통해서 설치가 되는데, 
`values.yaml`을 보면 https://github.com/kubernetes/autoscaler/blob/master/charts/cluster-autoscaler/values.yaml
line 204에 쯤에
```yaml
  # scale-down-unneeded-time: 10m
```

이것이 default 값인데 CA같은 경우 10분으로 되어있다.
즉, workder node에 CPU 사용량이 없어도 10분을 기다린 후에 node가 줄어든다.
이것이 terraform apply를 하고도 `min:1`개 node로 줄어들지 않는 이유였다.

다음 속성도 바꿔줘야한다.

```yaml
# skip-nodes-with-system-pods: true
```

위를 false로 해놔야 worker-node마다 배포되어있는 system pod인 `aws-node`혹은 `kube-proxy`가 있어도 worker-node가 삭제된다.

다른 모든 add on에서도 같은 syntax로 설정할 수 있다.
앞에 `enable_`을 제외하고,
위 Github의 `values.yaml`파일을 보면서,
다음과 같이 세팅한다. (line 14 ~ 25까지를 추가해주었다.)

`05-eks-blueprints.tf`
```hcl ln:true
module "eks_blueprints_addons" {
  source = "aws-ia/eks-blueprints-addons/aws"
  version = "~> 1.21" #ensure to update this to the latest/desired version

  cluster_name      = module.eks.cluster_name
  cluster_endpoint  = module.eks.cluster_endpoint
  cluster_version   = module.eks.cluster_version
  oidc_provider_arn = module.eks.oidc_provider_arn

  enable_aws_load_balancer_controller    = true
  enable_cluster_autoscaler              = true
  enable_metrics_server                  = true

	cluster_autoscaler = {
		set = [
			{
				name = "extraArgs.scale-down-unneeded-time"
				value = "1m"  # default is 10m
			},
			{
				name = "extraArgs.skip-nodes-with-system-pods"
				value = "false"  # default is true
			}
		]	
	}
}
```

apply
```sh
terraform apply -var-file="terraform.tfvars" --auto-approve
```

1분후에 조회해보면
```sh
❯ k get node                   
NAME                                            STATUS                     ROLES    AGE   VERSION
ip-10-0-2-248.ap-northeast-2.compute.internal   Ready                      <none>   79m   v1.33.0-eks-802817d
ip-10-0-3-117.ap-northeast-2.compute.internal   Ready,SchedulingDisabled   <none>   31m   v1.33.0-eks-802817d
```

성공적으로 삭제 중인 걸로 나온다.

재확인을 위해 Deployment를 확인해보면
```sh
kubectl edit deploy -n kube-system cluster-autoscaler-aws-cluster-autoscaler
```

```sh hl:9-10
    spec:
      containers:
      - command:
        - ./cluster-autoscaler
        - --cloud-provider=aws
        - --namespace=kube-system
        - --node-group-auto-discovery=asg:tag=k8s.io/cluster-autoscaler/enabled,k8s.io/cluster-autoscaler/prd-eks
        - --logtostderr=true
        - --scale-down-unneeded-time=1m
        - --skip-nodes-with-system-pods=false
```

설정해놓은 코드가 들어가 있는 것을 확인할 수 있다.

