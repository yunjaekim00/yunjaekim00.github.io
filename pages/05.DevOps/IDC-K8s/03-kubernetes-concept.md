---
title: 03. (이론) Kubernetes basic concepts
date: 2025-06-10
---
# 03. Kubernetes 기본 개념
## 요약
### Master node와 Worker node에 공통적으로 설치
- Container Runtime 설치 : 여기서는 **Containerd** 설치
- **Kubelet** 설치
- **Kubeadm** 설치
- kube-proxy application 설치
### Master node에만 설치
- Kube API server
- Kube Controller Manager
- Kube Scheduler
- ETCD
위 4가지는 `kubeadm init`으로 설치
- CNI network plugin : 여기서는 **Calico** 설치
### Worker node에만 설치
- `kubeadm join`으로 cluster에 worker node를 join

## K8s master node
### K8s cluster와의 상호작용은 어떻게 하는가?
Kubernetes는 다음 managing processes를 어떻게 하는가?
- schedule a pod
- monitor
- re-schedule / re-start a pod
- join a new Node
=> 모두 **master node (= the Control Plane)** 에서 처리된다. 
Control plane과 Master node는 동의어.

### Master node's processes
Master node는 worker node와 다른 master node만의 processes를 가지고 있다. 
아래 4가지 processes는 cluster state와 worker node를 제어한다.
#### 1. API Server
- Master node에서 모든 initial request를 받는 것은 API Server 역할이다.
- API server는 cluster gateway로서의 역할을 한다.
- 즉 K8s cluster로의 인증을 위한 gatekeeper 역할
- Request → API Server → validates request → other processes → pod의 순서로 통신이 이루어진다.
- 그러므로 cluster의 유일한 entry point
#### 2. Scheduler
- Schedule a new Pod → API Server → Scheduler → 어느 worker node에 pod를 schedule 할 지 판단 → Kubelet이 이 결정을 받아 pod를 띄운다
- Scheduler는 각 node가 사용중인 CPU, memory를 보고 어느 node에 new pod를 schedule 할 지 본다.
- 각 worker node의 Kubelet이 이 schedule을 받는다.
- Scheduler는 단지 어떤 node에 new pod가 schedule 될 지를 결정 → 실제 pod를 start시키는 것은 각 node의 Kubelet
#### 3. Controller Manager
- 어느 하나의 worker node에서 pod가 죽으면 → pod의 **crash**를 감지하여 → Scheduler에게 어떤 node에서 이 pod를 restart할 지 결정해달라고 요청을 보낸다 → 다시 Scheduler는 결정해서 Kubelet에 전달 → Kubelet에서 pod start
#### 4. ETCD
- 발음: 엣씨디
- Cluster의 두뇌 역할
- Cluster 상태에 대한 모든 변화가 key-value storage 형태로 ETCD에 저장된다.
![](./_images/Pasted%20image%2020250610135533.png)
일반적으로 master node는 worker node에 비해 리소스를 덜 먹는다
### Static Pods
모든 master node components는 pod로 배포.
그러나 pod를 배포하려면 **1.** API server로 요청 보내고 → **2.** Scheduler component는 pod가 *어떤 node*에 배포되는지 정하고 → **3.** Kubelet은 pod를 scheduling하고 → **4.** pod 배포 관련 data는 Etcd에 써진다.

그러나 처음에 API server도 Scheduler도 Kubelet도 아무것도 설치가 안 되어있는 상황에서, 어떻게 처음에 이 주요 pod들이 설치되는가? → 그것은 *Static Pod* 로 설치가 된다.

- Static Pod는 Kubelet daemon으로 직접 manage되어 API server, Scheduler, Etcd가 필요없다
- 그러므로 **Container Runtime**과 **Kubelet**만 설치되어 있으면 **Static Pods를 배포**할 수 있다.
#### How
어떻게 Kubelet은 Static Pod를 설치하는가? Kubelet은 특정 이름의 폴더를 본다 → 바로`/etc/kubernetes/manifests` 이 폴더에 manifest(yaml 파일)가 있다면 자동으로 Kubelet이 찾아서 Static Pod로 배포하게 된다.
#### Static pod의 특성
Static pod도 API server에서 보이지만 거기서 control 할 수는 없다. 즉, Controller Manager가 이 pod를 manage하지 않고 Kubelet이 manage한다. 그러므로 이 static pod가 crash하면 Scheduler가 아닌 **Kubelet**이 re-scheduling하는 책임을 진다. 
그리고 이 pod들은 이름에 node name이 들어간다. 이름만으로도 static pod인 것을 알 수 있다.

## Configuring K8s cluster
### Kubeadm
#### Bootstrapping the K8s cluster
위에 적힌 모든 과정을 수동을 설치하려면 굉장히 복잡할 것이다.
→ *Kubeadm*이라는 CLI tool이 이 모든 걸 bootstrap 해준다.
→ Kubernetes에서 유지보수하는 tool → 그러므로 Kubernetes 공식문서에 있다.
공식 홈피: https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/install-kubeadm/
### Swap memory
위 공식홈페이지를 보면 Kuberenetes 모든 node에서 swap memory 기능을 꺼놔야만 동작한다.
### Ports
위 공식홈페이지를 보면 K8s cluster는 다음 포트를 쓰기 때문에 AWS EKS는 자동으로 설정해주지만, 예를 들어 EC2 instance에 수동으로 설치하거나 한다면 Security Group에 다음 포트들을 개방시켜놔야한다.
#### Master node
- **port open** → https://kubernetes.io/docs/reference/networking/ports-and-protocols/ 이 페이지에 있는 포트를 open 해야함
![](./_images/Pasted%20image%2020250610150620.png)
- 6443 포트는 외부에서도 접속해야함 → 전부 개방
- 나머지 포트는 내부에서만 (private network) 통신
#### Worker nodes
![](./_images/Pasted%20image%2020250610150837.png)
- 위에 두 개는 cluster 내부에서 통신, 아래 2개는 브라우저에서 worker node를 통신하는 포트라서 전부 오픈.
- 위에 보이듯이 Kubernetes는 대부분 TLS통신이지만 UDP도 사용한다. CoreDNS에서 DNS query를 할 때, 위에서 설치했던 VXLAN도 UDP encapsulation을 사용, 그리고 Service mesh도 telemetry를 위해 UDP를 사용한다.
### Container Runtime
첫번째 설치할 것은 Container Runtime
공식문서: https://kubernetes.io/docs/setup/production-environment/container-runtimes/
- Container runtime은 K8s object가 아님
- app pod 뿐 아니라 **K8s processes** (API-server, scheduler, controller-manager, etcd)도 runtime 위에서 동작하는 container이다. → 그러므로 master, worker 둘 다 runtime이 필요하다.
- 쿠버네티스 초기에는 런타임은 Kubelet code에 있었고, docker만 지원되었다.
- 처음에는 **Docker runtime**이 **CRI rules**를 만족하지 않아서 CRI와 runtime 중간에 dockershim을 넣었다. → Dockershim lets Kubelet talk to Docker
- Docker component는 K8s에서 사용하지 않는 UI, Server, CLI 등 많은 것은 제공하지만, 막상 K8s에서는 container runtime만 사용함 → 그래서 더 가벼운 runtime이 등장 → containerd, CRI-O
- Kubernetes는 Dockershim을 1.20 버전부터 deprecated 시킴 → **중요**: Docker runtime을 사용하지 않는다고 docker images를 쓸 수 없는 것이 아니다 → 다른 runtime으로 docker image를 pull, run 할 수 있음 → **Azure, AWS, Google 모두 containerd 를 선택**
- 그래서 containerd와 cri-o가 나오고, 더 flexible하게 하기 위해 common interface가 개발되었다 → 이 interface plug-in을 **CRI(Container Runtime Interface)** 라고 부른다. → (이 인터페이스 규약을 지키는 어떤 container runtime을 설치해도 상관없도록)
- CRI는 container runtime이 갖추어야 할 규칙을 정해놓은 집합이다.
- 이 interface Kubelet이 런타임과 통신 and pull images etc.
![](./_images/Pasted%20image%2020250610151437.png)
CRI에 대한 공식문서: https://kubernetes.io/docs/setup/production-environment/container-runtimes/
