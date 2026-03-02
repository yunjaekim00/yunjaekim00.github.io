---
title: 06. Route53에 A record 추가하기
date: 2025-08-21
---
# 06. Route53에 A record 추가하기
## 목적
위 글까지 Terraform을 이용해 Istio까지 설치를 하고, NLB(Network Load Balancer)를 설치하였다.
그렇기 때문에 Route53의 A record를 만들 수 있는 조건을 다 갖추었다.
domain names을 list로 받아 terraform으로 A record를 추가하고 이를 전부 Istio Ingress Gateway의 NLB에 연결해주면 된다.

`4-route53.tf`
```hcl
data "aws_route53_zone" "main" {
  name         = var.hosted_zone_name
  private_zone = false
}
```

현재 AWS Route53에 Hosted zone이 많다. `x2bee.com`도 있고, `plateer.io`도 있다. 이 각각의 도메인을 hosted zone이라 부른다. `terraform.tfvars`에 `hosted_zone_name`을 plateer.io로 놓고 이 hosted zone을 찾는다.

```hcl
data "aws_lb" "istio_nlb" {
  depends_on = [helm_release.gateway]

  tags = {
    "kubernetes.io/service-name" = "${var.istio_namespace}/${var.gateway_name}"
  }
}
```

이미 설치되어있는 NLB도 찾는다. 위에 명시된 tags 이름으로 특정 LB를 찾는다.

위의 정보를 가지고, 그리고 variables에 있는 list로 된 domain names를 가져와, Route53에 A record를 각각 생성시킨다.

```hcl
resource "aws_route53_record" "app_records" {
  for_each = toset(var.domain_names)

  zone_id = data.aws_route53_zone.main.zone_id
  name    = each.value
  type    = "A"

  alias {
    name                   = data.aws_lb.istio_nlb.dns_name
    zone_id                = data.aws_lb.istio_nlb.zone_id
    evaluate_target_health = true
  }

  depends_on = [helm_release.gateway]
}
```

`variables.tf`
```hcl
# DNS Configuration
variable "domain_names" {
  description = "A list of domain names"
  type        = list(string)
  default     = []
}
```

`terraform.tfvars`
```hcl
domain_names = [
	"app1.plateer.io", 
	"app2.plateer.io"
]
```

