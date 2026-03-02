---
title: 01. Create Azure AKS with Terraform
date: 2025-09-04
---
# 01. Create Azure AKS with Terraform
### 서두
AWS는 resource type으로 Terraform 코드를 작성하면 생성할 것들이 많았다.
하지만 Azure의 경우는 managed defaults, built-in options들이 많다. 
느낌상 AWS는 순수 IaaS같고 Azure는 PaaS 스러운 IaaS 느낌이다.
그러니깐 Azure는 IGW, RT, NAT gateway, subnet도 만들 필요가 없다.
게다가 Cluster Autoscaler도 설치할 필요가 없고, metrics server도 설치할 필요가 없다.
그래서 이 전 글 → [11-resource-type](../EKS/11-resource-type.md) 은 13개의 `.tf`로 AWS EKS의 기본 뼈대를 구성했지만
이와 똑같은 기능의 Terraform 파일은 Azure로 6개의 `.tf`파일로 구성할 수 있다.

### 01-provider

우선 local 변수
`00-locals.tf`

providers
Terraform provider for Azure RM (Resource Manager)
https://github.com/hashicorp/terraform-provider-azurerm

`01-providers.tf`

```hcl title:01-providers.tf
provider "azurerm" {
  features {}
  subscription_id = local.subscription_id
}

data "azurerm_client_config" "current" {}

provider "helm" {
  kubernetes = {
    host                   = azurerm_kubernetes_cluster.this.kube_config.0.host
    client_certificate     = base64decode(azurerm_kubernetes_cluster.this.kube_config.0.client_certificate)
    client_key             = base64decode(azurerm_kubernetes_cluster.this.kube_config.0.client_key)
    cluster_ca_certificate = base64decode(azurerm_kubernetes_cluster.this.kube_config.0.cluster_ca_certificate)
  }
}

terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "=4.0.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = ">= 2.1.0"
    }
  }
}
```

- 위 3번 6번 line은 subscription id를 미리 정하고, local CLI 환경에서 이미 인증된 Azure client를 가져와서 terraform apply 할 시 재차 확인하지 않는다.
- `provider "helm"`은 뒤에 설치할 Keda를 helm chart로 설치하기 위해서 필요하다.
### 02-resource-group
Azure에서 RG(Resource Group)이란 life cycle이 똑같은 리소스들끼리 묶어놓는 그룹

```hcl
resource "azurerm_resource_group" "this" {
  name     = local.resource_group_name
  location = local.region
}
```

### 03-vnet
VNet → Azure의 VPC란 AWS VPC의 simplified version이다 : IGW, RT, NAT gateway, subnet(필수로)을 따로 지정하거나 만들 필요없다. 

```hcl
resource "azurerm_virtual_network" "this" {
  name                = local.vnet_name
  address_space       = local.vnet_cidr
  location            = azurerm_resource_group.this.location
  resource_group_name = azurerm_resource_group.this.name

  tags = {
    env = local.env
  }
}
```

### 04-subnets
AWS는 하나의 subnet이 하나의 AZ이지만 Azure는 구조가 그렇지 않고 하나의 region에 퍼져있다.
게다가 Azure subnet은 전부 default으로 internet access가 있다. 단지 public IP 주소를 필요로 하는지만 정한다.
여기서는 우선 하나만 쓸 것이지만 Subnet은 2개 생성하였다.

```hcl
resource "azurerm_subnet" "subnet1" {
  name                 = local.subnet1_name
  address_prefixes     = local.subnet1_cidr
  resource_group_name  = azurerm_resource_group.this.name
  virtual_network_name = azurerm_virtual_network.this.name
}

resource "azurerm_subnet" "subnet2" {
  name                 = local.subnet2_name
  address_prefixes     = local.subnet2_cidr
  resource_group_name  = azurerm_resource_group.this.name
  virtual_network_name = azurerm_virtual_network.this.name
}
```

### 05-aks
create Azure AKS
- UAI: Azure credentials를 위한 User-assigned Managed Identity를 생성 -> AWS EKS cluster에는 필수지만 Azure AKS에는 필수는 아니지만 private LB를 생성하려면 설치해야됨. 
- 밑에 코드에서 이 identity를 AKS cluster에 attach해서 private LB, NIC, RT과 같은 AKS의 네트워크 리소스에 추가 생성할 수 있는 권한을 얻기 위함.

```hcl
resource "azurerm_user_assigned_identity" "base" {
  name                = "base"
  location            = azurerm_resource_group.this.location
  resource_group_name = azurerm_resource_group.this.name
}
```


- Managed identity를 Network Contributor role에 할당(network 리소스 권한 부여). Scope는 VNET과 subnet을 생성한 Resource group에 할당. AKS identity는 AKS 자체가 생성한 독립적인 Resource Group에만 권한이 있기 때문.

```hcl
resource "azurerm_role_assignment" "base" {
  scope                = azurerm_resource_group.this.id
  role_definition_name = "Network Contributor"
  principal_id         = azurerm_user_assigned_identity.base.principal_id
}
```

- Azure AKS 생성
- control plane은 초기 RG에 생성되고, Node pool을 위한 또 하나의 RG이 생성됨.
- dns_prefix는 control plane의 FQDN(Fully Qualified Domain Name)을 생성할 때 사용하는 이름 => 즉, 아래와 같이 설정하면 `devaks1-<random>.koreacentral.azmk8s.io`와 같이 생성된다. 즉, DNS 이름이 아닌 FQDN이라는 AKS API endpoint이름에만 영향을 미친다.
- automatic_upgrade_channel은 자동 업데이트를 위한 채널을 설정하는데 stable이 default, 설정 해제하려면 none으로 한다. 
- bastion server가 없으면 private_cluster_enabled는 false로 설정 -> 즉, false로 설정해놓으면 API server가 public으로 인터넷에서 접속 가능 (예: 내 맥북에서)
- 아래 node_resource_group이란 이름으로 생성되는 Resource Group은 AKS가 cluster-owned Node Pool을 생성할 때 사용되는 별도의 독립적 Resource Group이다. - AKS는 이 RG을 control하고 운영한다.

```hcl
resource "azurerm_kubernetes_cluster" "this" {
  name                = "${local.env}-${local.aks_name}"
  location            = azurerm_resource_group.this.location
  resource_group_name = azurerm_resource_group.this.name
  dns_prefix          = "devaks1"

  kubernetes_version        = local.aks_version
  automatic_upgrade_channel = "stable"
  private_cluster_enabled   = false
  node_resource_group       = "${local.resource_group_name}-${local.env}-${local.aks_name}-aks-managed"
```

  - For production change to "Standard" 

  ```hcl
  sku_tier = "Free"
  ```

  - AWS에서는 OpenID Connect provider를 위해 수동으로 certificate thumbprint와 IssuerURL로 생성하지만 Azured에서는 checkbox 클릭 하나로 된다. 

  ```hcl
  oidc_issuer_enabled       = true
  workload_identity_enabled = true
  ```

  - Azure CNI plugin (= "azure")을 사용하도록 설정
  - Network plugin을 Cilium이나 다른 것으로 변경하려면 다르게 설정
  - K8s service와 coreDns를 위한 virutal IP range - VNet/subnet과 안 겹치게 할당

  ```hcl
  network_profile {
    network_plugin = "azure"
    dns_service_ip = "10.0.64.10"
    service_cidr   = "10.0.64.0/19"
  }

  default_node_pool {
    name                 = "general"
    vm_size              = "Standard_D2_v2"
    vnet_subnet_id       = azurerm_subnet.subnet1.id
    orchestrator_version = local.aks_version
    type                 = "VirtualMachineScaleSets"
    auto_scaling_enabled = true
    node_count           = 1
    min_count            = 1
    max_count            = 4

    node_labels = {
      role = "general"
    }
  }
  ```

  - 위에서 생성한 User Assigned Managed Identity를 부여해주어, 이를 이용해 AKS cluster를 실행하게 한다. 

  ```hcl
  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.base.id]
  }

  tags = {
    env = local.env
  }

  - Autoscaling enable 시켰으므로 ignore node count
  lifecycle {
    ignore_changes = [default_node_pool[0].node_count]
  }

  depends_on = [
    azurerm_role_assignment.base
  ]
}
```

### 06-keda.tf

Keda 설치

```hcl
resource "helm_release" "keda" {
  name = "keda"

  repository       = "https://kedacore.github.io/charts"
  chart            = "keda"
  namespace        = "keda"
  create_namespace = true
  version          = "2.17.2"

  depends_on = [
    azurerm_kubernetes_cluster.this
  ]
}
```


### 설치 결과
Azure Portal에서 확인
- Subscription내에 다음 RG이 생성되었다.
![](./_images/Pasted%20image%2020250904150538.png)
`tutorial-rg` RG는 다음으로 구성되어있고
![](./_images/Pasted%20image%2020250904150636.png)
`tutorial-rg-dev-demo-aks-managed` RG은 다음으로 구성되어있다.
![](./_images/Pasted%20image%2020250904150913.png)
