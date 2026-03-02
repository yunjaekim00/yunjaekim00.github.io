---
title: 07. Terraform으로 ArgoCD 설치
date: 2025-08-21
---
# 07. Terraform으로 ArgoCD 설치
추후 ArgoCD가 아닌 Flux 혹은 Jenkins X와 같은 CD 도구를 사용할 수도 있기에 또 다시 새로운 폴더를 생성해서 작성해보았다.
### 1. provider
새로운 폴더에서 작성하기 때문에 `0-providers.tf`를 생성하고 전과 마찬가지로 각종 provider를 넣었다.

### 2. ArgoCD
`1-argocd.tf`
```hcl
resource "helm_release" "argocd" {
  name             = "argocd"
  repository       = "https://argoproj.github.io/argo-helm"
  chart            = "argo-cd"
  version          = "8.1.3"
  namespace        = "argocd"
  create_namespace = true
  values = [file("values/argocd.yaml")]
}
```

ArgoCD의 최신 버전은 여기서 https://artifacthub.io/packages/helm/argo/argo-cd 확인이 가능하다.
다른 방법으로는 다음과 같이 내 맥북 터미널에서 helm repo를 받아 update 하고 조회해봐도 된다.

```sh
helm repo add argo https://argoproj.github.io/argo-helm
helm repo update
helm search repo argo/argo-cd --versions | head -10
```

그러면 다음처럼 helm chart version과 argocd version을 같이 보여준다.

```sh
NAME        	CHART VERSION	APP VERSION	DESCRIPTION
argo/argo-cd	8.1.3        	v3.0.11    	A Helm chart for Argo CD, a declarative, GitOps...
argo/argo-cd	8.1.2        	v3.0.6     	A Helm chart for Argo CD, a declarative, GitOps...
```

위 `1-argocd.tf`파일에서 ArgoCD의 default 값을 override 해주고 싶다면 별도의 values 파일을 다음과 같이 생성한다.
```yaml
---
global:
  image:
    tag: "v3.0.12"

server:
  extraArgs:
    - --insecure
  config:
    url: "https://test-argocd.plateer.io"
    application.instanceLabelKey: argocd.argoproj.io/instance
  ingress:
    enabled: false # We're using Istio instead
  service:
    type: ClusterIP
```

Istio gateway에서 TLS termination이 일어나 ArgoCD 자체 TLS 인증서를 사용하지 않을 것이라 `--insecure`를 추가하였다.

`2-istio-resource.tf`
```hcl
# Istio Gateway
resource "kubectl_manifest" "istio_gateway" {
  yaml_body = file("${path.module}/gateway.yaml.tftpl")

  depends_on = [
    helm_release.argocd
  ]
}

# Istio VirtualService
resource "kubectl_manifest" "istio_virtualservice" {
  yaml_body = templatefile("${path.module}/virtual-service.yaml.tftpl", {
    argocd_domain = var.argocd_domain
  })

  depends_on = [
    kubectl_manifest.istio_gateway,
    helm_release.argocd
  ]
}
```

설치된 ArgoCD를 배포하기 위해 Gateway와 VirtualService를 apply 해준다.
`kubectl apply -f`라는 명령어 대신 위처럼 작성하면 Terraform에서 yaml template file을 실행해준다.

`gateway.yaml.tftpl`
```yaml
---
apiVersion: networking.istio.io/v1alpha3
kind: Gateway
metadata:
  name: istio-gateway
  namespace: istio-ingress
spec:
  selector:
    istio: gateway # Updated for Istio 1.26+
  servers:
    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - "*.plateer.io"
      tls:
        httpsRedirect: true
    - port:
        number: 443
        name: https
        protocol: HTTPS
      hosts:
        - "*.plateer.io"
      tls:
        credentialName: plateer-tls-crt
        mode: SIMPLE
```


`virtual-service.yaml.tftpl`
```yaml
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: argocd-server-vs
  namespace: argocd
spec:
  hosts:
    - ${argocd_domain}
  gateways:
    - istio-ingress/istio-gateway
  http:
    - match:
        - uri:
            prefix: /
      route:
        - destination:
            host: argocd-server.argocd.svc.cluster.local
            port:
              number: 80
```