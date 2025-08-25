---
title: 10. Install Keda
date: 2025-08-25
---
# 10. Install Keda
### Keda
이 블로그의 '[Keda를 이용한 cronjob 설정](../../Kubernetes/Keda/250701-keda-cronjob.md)'을 보면 Keda를 이용해 cronjob으로 replica를 설정하는 방법을 설명했다.
위 글에서는 Keda를 CLI commands를 이용해 helm chart로 설치했는데, 여기서는 Terraform으로 설치해본다.

최신 버전은 여기서 확인한다 : https://github.com/kedacore/charts

`06-keda.tf`파일 생성

```hcl
resource "helm_release" "keda" {
  name = "keda"

  repository       = "https://kedacore.github.io/charts"
  chart            = "keda"
  namespace        = "keda"
  create_namespace = true
  version          = "2.17.2"

	depends_on = [
		module.eks_blueprints_addons
	]
}
```

Terraform으로 helm chart를 통해 설치하는 것이라 간단하다.
단, Keda는 metrics server가 설치된 후에 설치되어야하고, 우리는 metrics server를 EKS Blueprint를 통해 설치했으므로 `depends_on`을 위와 같이 추가해준다.

