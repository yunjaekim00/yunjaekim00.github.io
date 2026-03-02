---
title: 07. Worker Node 추가 설치
date: 2025-06-11
---
# 07. Worker Node 추가 설치
다음은 [4. VM 생성 및 네트워크 설정 (Master Worker 공통)](04-create-vm-install-cri.md)에 이어서 Worker Node 설치에만 적용되는 사항.
## install kubeadm

공식문서: https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/install-kubeadm/#installing-kubeadm-kubelet-and-kubectl

Kubernetes 1.33 설치
Update the `apt` package index and install packages needed to use the Kubernetes `apt` repository:
```sh
sudo apt-get update -y
# apt-transport-https may be a dummy package; if so, you can skip that package
sudo apt-get install -y apt-transport-https ca-certificates curl gpg
```

```sh
# If the directory `/etc/apt/keyrings` does not exist, it should be created before the curl command, read the note below.
sudo mkdir -p -m 755 /etc/apt/keyrings
curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.33/deb/Release.key | sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg
```

```sh
# This overwrites any existing configuration in /etc/apt/sources.list.d/kubernetes.list
echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.33/deb/ /' | sudo tee /etc/apt/sources.list.d/kubernetes.list
```

```sh
sudo apt-get update -y
sudo apt-get install -y kubelet kubeadm kubectl
sudo apt-mark hold kubelet kubeadm kubectl
```

(Optional) Enable the kubelet service before running kubeadm:
```sh
sudo systemctl enable --now kubelet
```


## worker node join
Calico라는 CNI (pod network)를 master node에 설치했으니 이제 worker node를 join할 수 있다.
위 메세지대로 이제 worder node VM에서 (**다음 명령어 입력하지 않기!!! 설명용**)

```sh
kubeadm join 10.10.10.11:6443 --token 12xgms.mw6legd1toal8f35 \
        --discovery-token-ca-cert-hash sha256:2213e705350f94abe9b47ee4a1f29d8e59c19f37833fe17bd8f302297f7629bd 
```

하면 preflight 단계에서 멈추고 진행이 안 된다.
join이 안되면 끝에 `--v=5`를 하면 log를 볼 수 있다.

계속 에러가 나는 이유는 GPT:
```txt
What you’re seeing—TCP connect working but the TLS handshake (and thus curl -k) hanging—is almost always a PMTU/fragmentation issue on an overlay network with a smaller MTU.

Why this happens
	•	Your VXLAN bridge on the hosts is running at an MTU of 1450 bytes (1500 − 50 bytes VXLAN overhead).
	•	But inside the VM, enp7s0 stayed at the default 1500 bytes.
	•	When the API server tries to send its TLS certificate chain (often >1200 bytes) in one packet with the “Don’t Fragment” bit set, it exceeds the outer MTU and needs to be fragmented.
	•	If ICMP “Fragmentation needed” messages aren’t making it back through your overlay or are being dropped, the packet never arrives, and the handshake just stalls.
```

위 문제가 맞는 지 확인하려면 WORKER node에서
```sh
# Try pinging with large packets and DF set
ping -c1 -s 1400 10.10.10.11      # should succeed
ping -c1 -s 1460 10.10.10.11      # likely fails or errors with “Frag needed”
```

결과:
```sh
root@k8s-worker-2-aespa:/home/tech# ping -c1 -s 1400 10.10.10.11
PING 10.10.10.11 (10.10.10.11) 1400(1428) bytes of data.
1408 bytes from 10.10.10.11: icmp_seq=1 ttl=64 time=2.60 ms

--- 10.10.10.11 ping statistics ---
1 packets transmitted, 1 received, 0% packet loss, time 0ms
rtt min/avg/max/mdev = 2.603/2.603/2.603/0.000 ms
root@k8s-worker-2-aespa:/home/tech# ping -c1 -s 1460 10.10.10.11
PING 10.10.10.11 (10.10.10.11) 1460(1488) bytes of data.

--- 10.10.10.11 ping statistics ---
1 packets transmitted, 0 received, 100% packet loss, time 0ms
```

위 문제가 맞다

두 개의 node에 (master와 worker) 모두 수정 (master는 이미 해놓음)
```sh
nano /etc/netplan/01-cluster.yaml
```

**Lower the VM's interface MTU**
다음 한 줄 추가 `mtu:1450`
```yaml
...
    enp7s0:   # Cluster (VXLAN/br1) NIC—private 10.10.10.x network
      dhcp4: no
      mtu: 1450
...
```

```sh
netplan apply
```

join 시도
```sh
kubeadm join 10.10.10.11:6443 --token 12xgms.mw6legd1toal8f35 \
        --discovery-token-ca-cert-hash sha256:2213e705350f94abe9b47ee4a1f29d8e59c19f37833fe17bd8f302297f7629bd 
```

join이 성공했으면 아래 3개는 skip

---

(선택-에러시에만) 위 코드를 잃어버린 경우에는 → Master node에서
```sh
sudo kubeadm token create --print-join-command
```

Worker node에서 테스트
```sh
curl -k https://10.10.10.11:6443/version
```

만약 위에 실패했다면 다시 join 시도
```sh
sudo kubeadm reset -f
kubeadm join 10.10.10.11:6443 --token wpn9o5.ykv14s187evkodm3 --discovery-token-ca-cert-hash sha256:6b7e84a88e1f4e49f51fe2701e8130f2f3c71796da840d63ad35bd709fc35aa4
```

---

Master node에서 조회
```sh
> k get node
NAME                  STATUS   ROLES           AGE    VERSION
k8s-master-node-ive   Ready    control-plane   21h    v1.33.1
k8s-worker-2-aespa    Ready    <none>          109s   v1.33.1
```

저 `<none>`을 없애려면
Master node에서
```sh
kubectl label node k8s-worker-3-aespa node-role.kubernetes.io/worker="worker"
```

그러나 이 상태에서 
```sh
k get node -o wide
```

를 하면 node 주소가 10.x.x.x가 나오지 않고 192.x.x.x로 나오게 된다 → 다음 단계 진행

## vxlan 주소 등록
###  이 과정은 master node의 Calico 설치 후에 진행
확인
```sh
> k top node
NAME                  CPU(cores)   CPU(%)      MEMORY(bytes)   MEMORY(%)   
k8s-master-node-ive   485m         4%          1653Mi          12%         
k8s-worker-2-aespa    188m         1%          1847Mi          13%         
k8s-worker-1-ive      <unknown>    <unknown>   <unknown>       <unknown>   
```
아직 안 된다
Master에는 설치가 되어있다. **Worker Node**에 접속해서 다음을 해준다.

이유는 디폴트로 해당 node의 kubelet이 자신의 주 인터페이스(DHCP로 할당된 NAT)를 Internal IP로 등록했기 때문에, Metrics Server가 정확히 그 주소를 사용해서 통계를 수집하려고 하는데, Calico 내부에서는 그곳으로 라우팅할 수 없기 때문이다.
이는 앞의 글(이론)에서 살펴보았듯이 NAT 대신 실제 클러스터 네트워크에서 접근 가능한 IP를 사용하도록 kubelet을 구성해야 하기 때문이다.
→ 각 node의 Kubelet 에게 VXLAN 주소 (10.10.10.x) 를 node 내부IP로 쓰게 해줘야한다.
Then Metrics Server will connect to 10.10.10.12:10250, which is routable.

다음 명령어를 **Master**와 **Worker**에서 둘 다 해준다.
(아래 과정을 거치면, 쿠버네티스 노드(해당 마스터/워커 VM)는 “10.10.10.11” (또는 실제 추출된 IP)로 API 서버와 통신하고, 클러스터 내에서 Node 객체가 올바른 IP로 등록되도록 보장할 수 있습니다.)

```sh
IP=$(ip -4 addr show enp7s0 | awk '/inet /{print $2}' | cut -d/ -f1)
echo ${IP}
```
이유 요약:
	•	쿠버네티스 kubelet에게 “이 노드가 사용할 로컬 IP”를 명시적으로 알려 주기 위해,
	•	시스템 상에 인터페이스(enp7s0)에 실제로 할당된 IP를 스크립트로 자동 추출하고,
	•	그 값을 이후 설정에 곧바로 활용하기 위해서입니다.

```sh
sudo tee /etc/default/kubelet <<EOF
KUBELET_EXTRA_ARGS="--node-ip=${IP}"
EOF
```

이유 요약:
	•	물리 서버(또는 VM)에 여러 네트워크 인터페이스가 있거나, 기본적으로 바인딩되는 IP와 다르게 “Kubernetes 노드 IP”를 따로 지정하고 싶을 때,
	•	kubelet 데몬이 시작될 때 --node-ip 옵션을 받아 해당 IP로 광고(advertise)하도록 강제하기 위해서입니다.
	•	이를 통해 컨트롤 플레인(특히 kube-apiserver)이 “이 노드를 네트워크 상에서 어떻게 찾을지” 정확하게 알 수 있습니다.

```sh
sudo systemctl daemon-reload
sudo systemctl restart kubelet
```

확인: Master node에서
```sh
> k get node -o wide
NAME                  STATUS   ROLES           AGE     VERSION   INTERNAL-IP   EXTERNAL-IP   OS-IMAGE             KERNEL-VERSION       CONTAINER-RUNTIME
k8s-master-node-ive   Ready    control-plane   4h16m   v1.33.1   10.10.10.11   <none>        Ubuntu 22.04.5 LTS   5.15.0-140-generic   containerd://2.1.0
k8s-worker-1-ive      Ready    worker          11m     v1.33.1   10.10.10.12   <none>        Ubuntu 22.04.5 LTS   5.15.0-140-generic   containerd://2.1.0
k8s-worker-2-aespa    Ready    worker          4h12m   v1.33.1   10.10.10.13   <none>        Ubuntu 22.04.5 LTS   5.15.0-140-generic   containerd://2.1.0
k8s-worker-3-aespa    Ready    worker          11m     v1.33.1   10.10.10.14   <none>        Ubuntu 22.04.5 LTS   5.15.0-140-generic   containerd://2.1.0
```

node IP가 private IP로 바뀌어있는 것을 확인

이제 확인
```sh
> k top nodes
NAME                  CPU(cores)   CPU(%)   MEMORY(bytes)   MEMORY(%)   
k8s-master-node-ive   382m         3%       1986Mi          14%         
k8s-worker-1-ive      100m         1%       1117Mi          8%          
k8s-worker-2-aespa    102m         1%       1263Mi          9%          
k8s-worker-3-aespa    126m         1%       1278Mi          9%
```

