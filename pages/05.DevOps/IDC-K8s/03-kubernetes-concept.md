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
