---
title: Installing Karpenter on an existing EKS
date: 2025-04-18
---
# Existing AWS EKS에 Karpenter 설치하기
## 서두
Azure AKS는 노드의 auto-scaling이 out-of-the-box로 제공이 되지만, AWS는 기본적으로 제공이 되지 않는다.
AWS EKS에서의 worker node의 auto-scaling을 위해서는
상대적으로 설치가 좀 더 쉬운 *Cluster Autoscaler(CA) with EKS Managed Node Groups* (이하 CA)를 설치하는 방법도 있지만, 이 CA 보다 그래도 조금 더 최근에 나온 *Karpenter*가 더 flexible 하기 때문에 더 많이 선호된다.

공식문서: https://karpenter.sh/docs/getting-started/getting-started-with-karpenter/ 

문제는 이 공식문서에 딱 2가지 케이스밖에 없다.
1. EKS cluster 자체를 `eksctl`로 완전히 신규로 생성할 때의 설치법
2. EKS에 CA가 설치된 경우 Karpenter로 migration하는 방법

그러나 대부분의 경우는 CA도 설치없이, 미리 AWS EKS를 설치한 상태에서 후에 Karpenter를 설치하게 되는데 이 경우는 공식문서에 없다. 그래서 이 방법에 대해서 나열하겠다.
![](./_images/Pasted%20image%2020250418110234.png)
기본적으로 위 **공식문서의 첫번째 메뉴(Getting Started with Karpenter)** 와 **두번째 메뉴(Migrating from Cluster Autoscaler)** 를 왔다갔다하면서 부족한 것은 보완할 것이다.

## 설치
### 미리 설치되어있어야 하는 것
나는 내 local 맥북에서 AWS EKS에 연결해 `kubectl`을 하기 때문에
내 맥북에 Karpenter를 설치할 것인데 우선은 다음 4가지가 전부 설치되어있어야한다. (이 4가지의 설치 방법은 생략)

1. AWS CLI
2. kubectl
3. eksctl (≥ v.202.0)
4. helm - package manager for K8s

AWS에 어떤 계정으로 연결되어있는지 확인한다.

```sh
aws sts get-caller-identity
```

### 변수 선언
다 알겠지만 아래 export는 현재 Terminal session이 열려있는 동안만 유효한 변수이므로 Terminal창을 죽이고 다시 생성하면 없어지는 변수들이다.

아래 변수 3개는 정확하게 적어주고 나머지 변수는 복사붙이기해도 된다.

```sh
export KARPENTER_VERSION="1.3.3"
export TEMPOUT="$(mktemp)"
export CLUSTER_NAME=MOON-STAGE
export K8S_VERSION=1.31
export KARPENTER_NAMESPACE=kube-system
export AWS_PARTITION="aws"
```

```sh
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query 'Account' \
    --output text)
export AWS_REGION="$(aws configure list | grep region | tr -s " " | cut -d" " -f3)"
export ALIAS_VERSION="$(aws ssm get-parameter --name "/aws/service/eks/optimized-ami/${K8S_VERSION}/amazon-linux-2023/x86_64/standard/recommended/image_id" --query Parameter.Value | xargs aws ec2 describe-images --query 'Images[0].Name' --image-ids | sed -r 's/^.*(v[[:digit:]]+).*$/\1/')"
```

변수들이 세션에 잘 저장되었는지 몇 개만 출력해보자.
```sh
echo -e "Region: ${AWS_REGION} \nAWS_ACCOUNT_ID: ${AWS_ACCOUNT_ID} \nALIAS_VERSION: ${ALIAS_VERSION}"
```

### CloudFormation 생성
다음 명령어로 CloudFormation을 생성한다.

```sh
curl -fsSL https://raw.githubusercontent.com/aws/karpenter-provider-aws/v"${KARPENTER_VERSION}"/website/content/en/preview/getting-started/getting-started-with-karpenter/cloudformation.yaml  > "${TEMPOUT}" \
&& aws cloudformation deploy \
  --stack-name "Karpenter-${CLUSTER_NAME}" \
  --template-file "${TEMPOUT}" \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides "ClusterName=${CLUSTER_NAME}"
```

AWS console에 CloudFormation에 들어가 잘 생성되었는지 확인한다.
*Resource* 탭에 가면 어떤 리소스가 생성되었는지 보인다.

![center|500](./_images/Pasted%20image%2020250418124124.png)

자동으로 IAM role도 생성되고 policies도 할당 된 것을 확인할 수 있다.
예를들어 위 그림에 보이는 것처럼 KarpenterControllerPolicy의 ID를 클릭하면 IAM 메뉴로 가는데, 이 새로 생성된 role에 필요한 policy들이 제대로 붙어있는지 조회해 볼 수 있다.

중요한 것은 이 CloudFormation에서 필요한 IAM role을 자동으로 생성해주었기 때문에 공식문서 두번째 메뉴에 있는 복잡한 IAM role 생성은 건너뛰어도 된다.

이제 공식문서 첫번째 메뉴를 보면 다음 코드가 있는데

```yaml hl:8-9
---
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig
metadata:
  name: ${CLUSTER_NAME}
  region: ${AWS_DEFAULT_REGION}
  version: "${K8S_VERSION}"
  tags:
    karpenter.sh/discovery: ${CLUSTER_NAME}
```

여기서 우리는 새로 EKS를 생성할 것은 아니지만 tag는 해야한다.
왜냐하면 Karpenter는 어느 subnet에 있는 지 모르므로 tag를 보고 판단하기 때문이다.
그래서 cluster, subnet, security group에 이 Karpenter관련 tag를 붙여야한다.

그러나 위 코드로 생성을 하면 전부 다 tag가 붙지만 이미 생성한 cluster에는 붙지 않는다.
그래서 여기서부터는 공식문서 두번째 메뉴인 Migrating from Cluster Autoscaler의 
Add tags to subnets and security groups 섹션을 참조한다.

### Add tags to subnet and SG
공식문서 두번째 메뉴에서 오른쪽 TOC에서도 두번째인 `Add tags to subnet and SG`부터 하면 된다.

tagging
```sh
for NODEGROUP in $(aws eks list-nodegroups --cluster-name "${CLUSTER_NAME}" --query 'nodegroups' --output text); do
    aws ec2 create-tags \
        --tags "Key=karpenter.sh/discovery,Value=${CLUSTER_NAME}" \
        --resources $(aws eks describe-nodegroup --cluster-name "${CLUSTER_NAME}" \
        --nodegroup-name "${NODEGROUP}" --query 'nodegroup.subnets' --output text )
done
```

EKS security group을 cluster 레벨로만 설정했다면 공식문서의 반까지만 실행
```sh
NODEGROUP=$(aws eks list-nodegroups --cluster-name "${CLUSTER_NAME}" \
    --query 'nodegroups[0]' --output text)

LAUNCH_TEMPLATE=$(aws eks describe-nodegroup --cluster-name "${CLUSTER_NAME}" \
    --nodegroup-name "${NODEGROUP}" --query 'nodegroup.launchTemplate.{id:id,version:version}' \
    --output text | tr -s "\t" ",")

# If your EKS setup is configured to use only Cluster security group, then please execute -

SECURITY_GROUPS=$(aws eks describe-cluster \
    --name "${CLUSTER_NAME}" --query "cluster.resourcesVpcConfig.clusterSecurityGroupId" --output text)
aws ec2 create-tags \
    --tags "Key=karpenter.sh/discovery,Value=${CLUSTER_NAME}" \
    --resources "${SECURITY_GROUPS}"
```

아래 그림처럼 AWS console의 EKS에서 Networking 탭에서 보이는 Security Group과 Subnet을 클릭해보면
`karpenter.sh`라는 태그가 붙은 것을 확인할 수 있다.

![](./_images/Pasted%20image%2020250420135419.png)
subnet에 붙은 tag
![](./_images/Pasted%20image%2020250420135445.png)

### EKS Pod Identity Associations
이 개념을 이해하기 위해서는 블로그 하나의 글을 할애해야한다.
일단 보안 강화를 위해 몇 년전에 도입된 개념이라 하자.
`eksctl`을 통해 CLI로도 설치할 수 있지만
난 우선 AWS console 창에서 Add-on 메뉴에서 설치하겠다.

![450](./_images/Pasted%20image%2020250420211301.png)
위 Add-on 설치
그리고 `config.yaml` 파일을 만들어준다.

```yaml
---
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig
metadata:
  name: ${CLUSTER_NAME}
  region: ${AWS_DEFAULT_REGION}
  version: "${K8S_VERSION}"
  tags:
    karpenter.sh/discovery: ${CLUSTER_NAME}

iam:
  withOIDC: true
  podIdentityAssociations:
  - namespace: "${KARPENTER_NAMESPACE}"
    serviceAccountName: karpenter
    roleName: ${CLUSTER_NAME}-karpenter
    permissionPolicyARNs:
    - arn:${AWS_PARTITION}:iam::${AWS_ACCOUNT_ID}:policy/KarpenterControllerPolicy-${CLUSTER_NAME}

iamIdentityMappings:
- arn: "arn:${AWS_PARTITION}:iam::${AWS_ACCOUNT_ID}:role/KarpenterNodeRole-${CLUSTER_NAME}"
  username: system:node:{{EC2PrivateDNSName}}
  groups:
  - system:bootstrappers
  - system:nodes
```

위에서 `{{EC2PrivateDNSName}}`를 제외하고 모든 변수를 수동으로 입력해준다.
수동 입력 후 두 가지를 다 적용해준다.

```sh
eksctl create podidentityassociation -f config.yaml
eksctl create iamidentitymapping -f config.yaml
```

위를 적용하므로 `aws-auth`라는 ConfigMap도 수정이 된 것을 확인할 수 있다.
```sh
kubectl get cm -n kube-system
```
하면 ConfigMaps 목록을 볼 수 있다.

```sh
kubectl describe cm aws-auth -n kube-system
```

을 하면 아래의 9~13번째 줄이 더해진 것을 확인할 수 있다.

```yaml ln:true hl:9-13
apiVersion: v1
data:
  mapRoles: |
    - groups:
      - system:bootstrappers
      - system:nodes
      rolearn: arn:aws:iam::218919594802:role/ROLE-X2CO-EKS-NDE
      username: system:node:{{EC2PrivateDNSName}}
    - groups:
      - system:bootstrappers
      - system:nodes
      rolearn: arn:aws:iam::218919594802:role/KarpenterNodeRole-MOON-STAGE
      username: system:node:{{EC2PrivateDNSName}}
  mapUsers: |
    - groups:
      - system:masters
      userarn: arn:aws:iam::218919594802:user/jeongzm
kind: ConfigMap
```

### Karpenter 설치
드디어 본격 설치.
다음 명령어로 우선 `karpenter.yaml`에 저장한다.

```sh
helm template karpenter oci://public.ecr.aws/karpenter/karpenter --version "${KARPENTER_VERSION}" --namespace "${KARPENTER_NAMESPACE}" \
    --set "settings.clusterName=${CLUSTER_NAME}" \
    --set "settings.interruptionQueue=${CLUSTER_NAME}" \
    --set "serviceAccount.annotations.eks\.amazonaws\.com/role-arn=arn:${AWS_PARTITION}:iam::${AWS_ACCOUNT_ID}:role/KarpenterControllerRole-${CLUSTER_NAME}" \
    --set controller.resources.requests.cpu=1 \
    --set controller.resources.requests.memory=1Gi \
    --set controller.resources.limits.cpu=1 \
    --set controller.resources.limits.memory=1Gi > karpenter.yaml
```

그리고 다음 명령어로 적용

```sh
kubectl create -f \
    "https://raw.githubusercontent.com/aws/karpenter-provider-aws/v${KARPENTER_VERSION}/pkg/apis/crds/karpenter.sh_nodepools.yaml"
kubectl create -f \
    "https://raw.githubusercontent.com/aws/karpenter-provider-aws/v${KARPENTER_VERSION}/pkg/apis/crds/karpenter.k8s.aws_ec2nodeclasses.yaml"
kubectl create -f \
    "https://raw.githubusercontent.com/aws/karpenter-provider-aws/v${KARPENTER_VERSION}/pkg/apis/crds/karpenter.sh_nodeclaims.yaml"
kubectl apply -f karpenter.yaml
```

```sh
kubectl get all -n kube-system
```
으로 생성 확인

### Creating NodePool
공식문서의 좌측메뉴에 보면 `Concepts`에 NodeClass와 NodePool이 있다.
NodeClass는 어떤 AMI family를 worker node로 쓰느냐에 관련된 것이다.
NodePool은 이런 NodeClass를 어떤 아키텍처로 가져가느냐에 관련된 것이다.

공식 문서에서 다음 파일을 복사해왔지만 수정한 것은 `${CLUSTER_NAME}`과 `{ALIAS_VERSION}` 변수를 전부 수동 입력해야되고, 
17번째 줄에 있는 `spot`을 `on-demand`로 수정해준다.
19-21번째 줄은 Karpenter 공식문서에는 없고 AWS 공식문서( https://docs.aws.amazon.com/eks/latest/best-practices/karpenter.html )에서 가져왔다. (Karpenter 공식문서는 instance family만 지정해주기 때문에 어떤 type의 instance가 생길지 모른다. 여기서는 딱 한 가지로 지정해주었다.)

다음 실행

```yaml ln:true hl:5,18-21,42-43 title:node-pool.yaml
cat <<EOF | envsubst | kubectl apply -f -
apiVersion: karpenter.sh/v1
kind: NodePool
metadata:
  name: default
spec:
  template:
    spec:
      requirements:
        - key: kubernetes.io/arch
          operator: In
          values: ["amd64"]
        - key: kubernetes.io/os
          operator: In
          values: ["linux"]
        - key: karpenter.sh/capacity-type
          operator: In
          values: ["on-demand"]
        - key: node.kubernetes.io/instance-type
          operator: In
          values: ["m5.2xlarge"]
        - key: karpenter.k8s.aws/instance-generation
          operator: Gt
          values: ["2"]
      nodeClassRef:
        group: karpenter.k8s.aws
        kind: EC2NodeClass
        name: default
      expireAfter: 720h # 30 * 24h = 720h
  limits:
    cpu: 1000
  disruption:
    consolidationPolicy: WhenEmptyOrUnderutilized
    consolidateAfter: 1m
---
apiVersion: karpenter.k8s.aws/v1
kind: EC2NodeClass
metadata:
  name: default
spec:
  role: "KarpenterNodeRole-MOON-STAGE"
  tags:
    Name: "MOON-PRD-eks-node"
  amiSelectorTerms:
    - alias: "al2023@v20250410"
  subnetSelectorTerms:
    - tags:
        karpenter.sh/discovery: "MOON-STAGE"
  securityGroupSelectorTerms:
    - tags:
        karpenter.sh/discovery: "MOON-STAGE"
EOF
```

참고: 위를 uninstall 할 때는 `apply`를 `delete`로만 바꾸면 된다.

확인
```sh
k describe nodepool.karpenter.sh/default
```

AWS console에서 원하는 숫자로 세팅하고 적용하면 끝 (물론 CLI를 선호하면 `eksctl` min max를 조정할 수 있다. )

![400](./_images/Pasted%20image%2020250420225103.png)
