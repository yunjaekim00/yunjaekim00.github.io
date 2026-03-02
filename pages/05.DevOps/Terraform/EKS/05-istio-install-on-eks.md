---
title: 05. AWS EKS에 Istio 설치
date: 2025-08-19
---
# 05. AWS EKS에 Istio 설치
## Istio
Istio는 Service Mesh의 하나로 MSA 구조를 위한 트래픽 운영과 보안 측면에서 우수하며 mTLS와 Canary 배포 기능도 제공한다.

Istio는 **IstioCTL**이라는 CLI command로도 설치가 가능하나, Terraform에서는 보통 helm으로 설치한다.
혹시 EKS에 Istio를 사용하지 않고 Nginx Ingress 혹은 AWS App Mesh를 사용할 수도 있기 때문에 그냥 별도의 폴더에 분리해서 작성하였다.
별도의 폴더에 작성했기 때문에 provider를 다시 선언해줘야한다.

## 파일 구조
```sh
02-istio-terraform/
├── 0-helm-provider.tf          # Provider configurations
├── 1-istio-base.tf             # Istio foundation (CRDs)
├── 2-istiod.tf                 # Istio control plane
├── 3-istio-gateway.tf          # Istio ingress gateway + AWS resources
├── 4-route53.tf                # DNS configuration
├── istio-ingress-values.yaml.tftpl  # Gateway configuration template
├── terraform.tfvars            # 변수 값 할당
├── variables.tf                # 변수 값 선언
└── outputs.tf                  # Output values
```

참고로 변수 값의 파일 이름을 표준인 `terraform.tfvars`로 만들었다면, 실행 시에 `-var-file="terraform.tfvars"` 명령어를 생략해도 된다. 그래서 적용시에는 다음 명령어만 입력하면 된다.

```sh
terraform init
terraform apply --auto-approve
```

## Providers
앞 글까지의 기본 EKS cluster를 생성하고 다음 명령어로 연결했기 때문에

```sh
aws eks update-kubeconfig --name cluster_name --region ap-northeast-2
```

`data`를 이용해 EKS cluster 이름부터 가져온다.

`0-helm-provider.tf`
```hcl
data "aws_eks_cluster" "main" {
  name = var.eks_cluster_name
}

data "aws_eks_cluster_auth" "main" {
  name = var.eks_cluster_name
}
```

그리고 위에서 가져온 cluster 이름으로
쿠버네티스에 연결하고 helm을 사용할 수 있도록 설정해준다.

```hcl
# Connect to existing EKS cluster and configure Kubernetes provider with EKS credentials
provider "kubernetes" {
  host                   = data.aws_eks_cluster.main.endpoint
  cluster_ca_certificate = base64decode(data.aws_eks_cluster.main.certificate_authority[0].data)
  token                  = data.aws_eks_cluster_auth.main.token
}

provider "helm" {
  kubernetes {
    host                   = data.aws_eks_cluster.main.endpoint
    cluster_ca_certificate = base64decode(data.aws_eks_cluster.main.certificate_authority[0].data)
    token                  = data.aws_eks_cluster_auth.main.token
  }
}
```


## Istio 설치
Istio는 다음 3가지 component를 설치해야한다.
#### 1. Istio Base
CRD(Custom Resource Definitions)를 포함한 리소스를 설치한다. VirtualServices, Gateways, DestinationRules과 다른 Istio 리소스들을 포함한다.
#### 2. Istiod
Istio의 control plane → service mesh를 설정하고 운영
#### 3. Istio Gateway
Istio의 data plane에 속함. Ingress traffic을 담당. Envoy proxy를 포함.

3가지 설치 순서가 있다.
우선은 Istiod와 Istio Gateway에서 Istio base에 있는 CRD를 참조하기 때문에 *Istio base*가 먼저 설치되어야 한다.
그래서 Istiod의 코드를 보면

```hcl
depends_on = [helm_release.istio_base]
```

이것을 넣어줘서 base 설치가 끝난 후에 설치가 되도록 한다.

`1-istio-base.tf` 전체 코드
```hcl
resource "helm_release" "istio_base" {
  name = "my-istio-base-release"

  repository       = "https://istio-release.storage.googleapis.com/charts"
  chart            = "base"
  namespace        = "istio-system"
  create_namespace = true
  version          = var.istio_version

  set {
    name  = "global.istioNamespace"
    value = "istio-system"
  }
}
```

위 코드의 
```hcl
  set {
    name  = "global.istioNamespace"
    value = "istio-system"
  }
```

이 부분은 전역 parameter로 모든 Istio component에게 istio의 control plane(Istiod)이 `istio-system` namespace이 있다고 알려주는 역할이다.

`2-istiod.tf` 전체 코드
```hcl
resource "helm_release" "istiod" {
  name = "my-istiod-release"

  repository       = "https://istio-release.storage.googleapis.com/charts"
  chart            = "istiod"
  namespace        = "istio-system"
  create_namespace = true
  version          = var.istio_version

  set {
    name  = "telemetry.enabled"
    value = "true"
  }

  set {
    name  = "global.istioNamespace"
    value = "istio-system"
  }

  set {
    name  = "meshConfig.ingressService"
    value = "istio-gateway"
  }

  set {
    name  = "meshConfig.ingressSelector"
    value = "gateway"
  }

  depends_on = [helm_release.istio_base]
}
```

`3-istio-gateway.tf` 코드
```hcl
resource "helm_release" "gateway" {
  name = var.gateway_name

  repository       = "https://istio-release.storage.googleapis.com/charts"
  chart            = "gateway"
  namespace        = var.istio_namespace
  create_namespace = true
  version          = var.istio_version

  depends_on = [
    helm_release.istio_base,
    helm_release.istiod
  ]

  # overrides - change default CLB to NLB
  values = [templatefile("istio-ingress-values.yaml.tftpl", {
    lb_security_group_id               = aws_security_group.istio-gateway-lb.id
    lb_healthcheck_healthy_threshold   = var.lb_healthcheck_healthy_threshold
    lb_healthcheck_unhealthy_threshold = var.lb_healthcheck_unhealthy_threshold
    lb_healthcheck_timeout             = var.lb_healthcheck_timeout
    lb_healthcheck_interval            = var.lb_healthcheck_interval
  })]
}
```

아래쪽 values 부분:
우선 일반적인 `.yaml` 파일에는 변수를 넣을 수 없다. 
변수를 넣기 위해서는 똑같이 `.yaml` 파일로 같은 문법으로 작성하되 확장자만 `.yaml.tftpl`로 작성하고 위처럼 사용할 변수를 인자로 넣어준다.

`istio-ingress-values.yaml.tftpl`
```hcl
labels:
  istio: gateway

# Ensure proper resources for the gateway
resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 1000m
    memory: 1024Mi

# Configure service for AWS NLB with ACM certificate
service:
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: nlb
    service.beta.kubernetes.io/aws-load-balancer-scheme: internet-facing
    service.beta.kubernetes.io/aws-load-balancer-attributes: load_balancing.cross_zone.enabled=true
    service.beta.kubernetes.io/aws-load-balancer-security-groups: ${lb_security_group_id}
    service.beta.kubernetes.io/aws-load-balancer-nlb-target-type: ip
    # Increase health check threshold for more stability
    service.beta.kubernetes.io/aws-load-balancer-healthcheck-healthy-threshold: "${lb_healthcheck_healthy_threshold}"
    service.beta.kubernetes.io/aws-load-balancer-healthcheck-unhealthy-threshold: "${lb_healthcheck_unhealthy_threshold}"
    service.beta.kubernetes.io/aws-load-balancer-healthcheck-timeout: "${lb_healthcheck_timeout}"
    service.beta.kubernetes.io/aws-load-balancer-healthcheck-interval: "${lb_healthcheck_interval}"
  type: LoadBalancer
  ports:
  - name: http
    port: 80
    targetPort: 80
  - name: https
    port: 443
    targetPort: 443
```

Azure혹은 GCP는 default가 NLB로 알고 있는데, AWS는 기본적으로 Istio를 설치하면 자동으로 CLB(Classic Load Balancer)가 설치가 되는데, AWS에서는 NLB 혹은 ALB의 설치를 권장한다. 이를 위해 위에서처럼 `nlb`를 annotation으로 위와 같이 명시해 주어야지 설치가 된다.
이전 글에 설명한대로 `80`포트와 `443`포트는 Istio Gateway에 TLS termination을 시켜주기 위해 그대로 통과시킨다.

`3-istio-gateway.tf` 추가 코드
```hcl
resource "null_resource" "cleanup_loadbalancer" {
  triggers = {
    gateway_name = helm_release.gateway.name
    namespace    = helm_release.gateway.namespace
  }

  provisioner "local-exec" {
    when    = destroy
    command = <<-EOT
      echo "Cleaning up LoadBalancer services in istio-ingress namespace..."
      kubectl delete svc -n istio-ingress --all --timeout=60s || true
      echo "Waiting for LoadBalancer cleanup..."
      sleep 30
    EOT
  }

  depends_on = [helm_release.gateway]
}
```

위 Terraform 코드에서 우리가 `helm_release`를 통해 Istio gateway를 설치하면 자동으로 Load Balancer가 붙여지는 구조이고, 우리가 명시적으로 Load Balancer를 생성하는 `resource`구문을 사용하지 않기 때문에, 생성할 때는 잘 되지만, `terraform destroy`시 LB가 삭제가 안 되는 경우가 생긴다. 그래서 `terraform destory`시에 자동으로 생성된 LB가 삭제될 수 있도록 LB를 handle 해주는 null resource를 만든다.