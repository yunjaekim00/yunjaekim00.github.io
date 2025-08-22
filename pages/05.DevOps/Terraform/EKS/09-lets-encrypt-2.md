---
title: 09. Lets Encrypt 인증서 2
date: 2025-08-22
---
# 09. Lets Encrypt 인증서 2
### Cert manager
Cert manager를 우선 설치해야하는데, 최신 버전은 여기서 확인할 수 있다.
최신 버전 : https://github.com/cert-manager/cert-manager/releases

CLI로 최신버전 확인하기
```sh
curl -s https://api.github.com/repos/cert-manager/cert-manager/releases/latest | grep tag_name
```

버전 확인 후 다운로드 받기
```sh
curl -L -o cert-manager.yaml https://github.com/cert-manager/cert-manager/releases/download/v1.18.2/cert-manager.yaml
```

위처럼 yaml 파일을 다운로드 받고 `kubectl apply -f`를 할 수도 있지만 여기서는 Terraform을 이용해서 설치하겠다. Terraform으로 위와 동등한 방식은

`4-cert-manager.tf`생성
```hcl ln:true
resource "helm_release" "cert_manager" {
  name = "cert-manager"

  repository       = "https://charts.jetstack.io"
  chart            = "cert-manager"
  namespace        = "cert-manager"
  create_namespace = true
  version          = "v1.18.2"

  set {
    name  = "installCRDs"
    value = "true"
  }

  # Used for the DNS-01 challenge.
  set {
    name  = "serviceAccount.name"
    value = "cert-manager"
  }

  # Used for the DNS-01 challenge.
  set {
    name  = "serviceAccount.annotations.eks\\.amazonaws\\.com/role-arn"
    value = aws_iam_role.dns_manager.arn
  }
}
```

HTTP-01 챌린지를 위해서는 line 14까지만 필요하지만 DNS-01을 위해서는 위 주석내용에 썼듯이 추가적인 SA와 role 설정이 더 필요하다.

`5-irsa.tf`
```hcl
# Used for the DNS-01 challenge.
data "tls_certificate" "eks" {
  url = data.aws_eks_cluster.cluster.identity[0].oidc[0].issuer
}

data "aws_iam_openid_connect_provider" "eks" {
  url = data.aws_eks_cluster.cluster.identity[0].oidc[0].issuer
}
```

`6-dns-manager.tf`
DNS-01 챌린지는 Route53에 임시로 TXT record을 생성해야하기 때문에, 앞에 설정한 OIDC를 이용해 AWS Route53에 다음과 같이 IAM permission을 관리한다.
```hcl
# Used for the DNS-01 challenge.

data "aws_iam_policy_document" "dns_manager" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    effect  = "Allow"

    condition {
      test     = "StringEquals"
      variable = "${replace(data.aws_iam_openid_connect_provider.eks.url, "https://", "")}:sub"
      values   = ["system:serviceaccount:cert-manager:cert-manager"]
    }

    principals {
      identifiers = [data.aws_iam_openid_connect_provider.eks.arn]
      type        = "Federated"
    }
  }
}

resource "aws_iam_role" "dns_manager" {
  assume_role_policy = data.aws_iam_policy_document.dns_manager.json
  name               = "${var.env}-${var.eks_cluster_name}-dns-manager"
}

resource "aws_iam_policy" "dns_manager" {
  name = "dns_manager"
  path = "/"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "route53:GetChange",
        ]
        Effect   = "Allow"
        Resource = "arn:aws:route53:::change/*"
      },
      {
        Action = [
          "route53:ChangeResourceRecordSets",
          "route53:ListResourceRecordSets"
        ]
        Effect   = "Allow"
        Resource = "arn:aws:route53:::hostedzone/*"
      },
      {
        Action = [
          "route53:ListHostedZonesByName",
          "route53:ListHostedZones"
        ]
        Effect   = "Allow"
        Resource = "*"
      },
    ]
  })
}

resource "aws_iam_role_policy_attachment" "dns_manager" {
  policy_arn = aws_iam_policy.dns_manager.arn
  role       = aws_iam_role.dns_manager.name
}
```

아래 두 개 파일은 `.tf`파일이 아니고 `.yaml` 파일이다.

`issuer-production.yaml`생성
```yaml
---
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: production-cluster-issuer
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    privateKeySecretRef:
      name: production-cluster-issuer
    solvers:
      - dns01:
          route53:
            {}
        selector:
          dnsZones:
            - "plateer.io"
```

`certificate.yaml`
```yaml
---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: api-cert
  namespace: istio-ingress
spec:
  secretName: app-cert-secret
  dnsNames:
    - "*.plateer.io"
  issuerRef:
    name: production-cluster-issuer
    kind: ClusterIssuer
    group: cert-manager.io
  privateKey:
    rotationPolicy: Always
```

위 두 파일을 생성하고 둘 다 적용한다.
```sh
kubectl apply -f issuer-production.yaml
kubectl apply -f certificate.yaml
```

위에 Terraform으로 cert-manager를 설치하고도 적용까지 시간이 조금 걸리고 약 1~2분
그리고 ACME challenge도 약 2~3분 정도 시간이 걸린다.
그러므로 위 명령어로 실행시 에러가 나오면 조금 기다렸다가 다시 실행해본다.

#### Staging 과 Production Issuer의 차이

| Staging Issuer                                              | Production Issuer                                   |
| ----------------------------------------------------------- | --------------------------------------------------- |
| URL: https://acme-staging-v02.api.letsencrypt.org/directory | URL: https://acme-v02.api.letsencrypt.org/directory |
| Rate Limits: Very high (for testing)                        | Rate Limits: Strict (20 certs/week per domain)      |
| Certificates: Not trusted by browsers                       | Certificates: Trusted by all browsers               |
| Purpose: Testing and development                            | Purpose: Production use                             |
Production은 일주일에 20번 발급이 한도다. (충분하지만 무한 테스팅은 불가능)

#### 최종 확인
```sh
kubectl get Certificate -A
```

를 해서 Certificate의 READY 상태가 `true` 이면 챌린지를 통과하여 발급이 된 상태다.