---
title: 05. (이론) CNI basic concepts
date: 2025-06-10
---
# 05. CNI 기본 개념
## CNI(Container Network Interface)
### Networking between pods (pod to pod communication)
- K8s는 네트워크에 대해 built-in solution으로 설치되지 않는다.
- 즉, K8s는 설치하는 엔지니어가 직접 네트워크 솔루션을 설치해야한다.
- 그러나 K8s는 이런 여러 네트워크 솔루션에 대한 기본 요구사항을 정의해놓는다 → 이런 set of rules를 **CNI**라고 부른다.
- Kubernetes가 containerd건 cri-o건 어떤 container runtime을 plugin해도 되는 **CRI**(Container Runtime Interface)를 만들었듯이 CNI도 같은 개념이다.
### K8s requirements for CNI plugins
1. Cluster 전체 내에서 모든 pod는 고유의 IP address를 갖는다. (예: 10.244.x.x)
2. 같은 node 내부에 있는 pod들은 해당 IP 주소로 통신한다.
3. 서로 다른 node에 있는 pod들끼리는 **NAT를 거치지 않고** 해당 IP 주소로 통신한다.

위 사항들을 **Kubernetes network model**이라 부른다: https://kubernetes.io/docs/concepts/services-networking/#the-kubernetes-network-model
- network solutions에는 Calico, Flannel, Weaveworks의 Weavenet, Cilium, Vmware NSX 등이 있다.
- 여기서는 Calico를 설치할 것이다.
### CNI plugins가 이를 적용하는 방법
- 각 Node도 IP주소를 VPC (혹은 LAN)의 CIDR block range에서 받는다
- pod 자체도 private network를 가진, 자체의 독립적인 machine이라고 볼 수 있다.
- 각 node에서 private network with a **different IP range** 가 생성된다.
- 이 IP range는 node 자체의 IP주소와 겹치면 안 됨 (즉, 우리는 node는 10.10.x.x, pod는 10.244.x.x를 준다.) → pod는 `kubeadm init`할 때 지정
- 이 IP range는 private bridge가 있어서 pod끼리 통신함
