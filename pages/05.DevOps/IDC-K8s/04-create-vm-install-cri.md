---
title: 04. VM 생성 및 네트워크 설정 (Master Worker 공통)
date: 2025-06-10
---
# 04. VM 생성 및 네트워크 설정 (Master Worker 공통)
다음은 Master Node와 Worker Node를 생성 설치할 때 공통으로 하는 작업
## Prerequisite

```sh
df -hT
```

를 통해 `/var`에 용량이 충분한지를 보고, 아니라면 추후 VM 생성시 qcow 파일 (VM의 volume mount)이 다른 폴더(`/data`)에 mount 되도록 한다.
## Create VM
### Download Ubuntu

```
cd /var/lib/libvirt/boot
wget https://releases.ubuntu.com/22.04/ubuntu-22.04.5-live-server-amd64.iso
```

용량 약2Gb 다운로드한다.

다운로드 확인
```sh
ls
ubuntu-22.04.5-live-server-amd64.iso
```

위와 같이 `.iso` 파일만 다운로드받고 **Virtual Machine Manager(KVM)** 을 실행시킨다.
(미리 CLI로 .qcow2 파일(VM의 volume)을 생성할 수 있지만 CLI가 아닌 Virtual Machine Manager로 생성하면 생성할 필요가 없다. → 생략)

### Virtual Machine Manager
KVM으로 생성
오른쪽 위 아이콘으로 생성
![300](./_images/Pasted%20image%2020250519125051.png)

다운로드 받았으니 첫번째 옵션 ISO image로 설치를 선택
![300](./_images/Pasted%20image%2020250519130238.png)
→ Forward → (다음 그림을 처음 설정시에만 뜨는 화면이다) 왼쪽 밑 `+`(Add pool) 
![450|left](./_images/Pasted%20image%2020250531041659.png)
→ Finish → iso 선택 → Choose Volume


이미지 선택, OS 자동 감지 못하면 수동 선택 (그러나 항상 자동 감지함)
![300](./_images/Pasted%20image%2020250515104354.png)

메모리는 계획대로 14336, CPU는 10개
![300](./_images/Pasted%20image%2020250523124804.png)

앞서 CLI로 `qcow2` volume을 생성했으면 여기서 선택하면 되지만
첫번째 메뉴 'Create a disk image'로 그냥 여기서 만들면 된다.
![300](./_images/Pasted%20image%2020250519135844.png)

이름 설정, 네트워크 선택(**network selection**) → Virtual networks 'default' **NAT**로 선택
![300](./_images/Pasted%20image%2020250519140039.png)

설치
![](./_images/Pasted%20image%2020250515104714.png)
전부 default로 하고 

이번에 master는 : `k8s-master-node`로 설정 (IVE)
worker는 : `k8s-worker-2-aespa`로 설정함

![](./_images/Pasted%20image%2020250515105205.png)
아이디와 비번을 설정

![](./_images/Pasted%20image%2020250515105239.png)
이 다음 자동설치 단계가 10분 넘게 걸린다.

설치가 끝난 후 `Reboot Now`가 뜨면 재부팅하지 말고 바로 **host OS**에서

```sh
virsh list --all
```

sda unmount
```sh
> virsh domblklist k8s-worker-3-aespa
 Target   Source
----------------------------------------------------------------------
 vda      /var/lib/libvirt/images/k8s-worker.qcow2
 sda      /var/lib/libvirt/boot/ubuntu-22.04.5-live-server-amd64.iso

> virsh change-media k8s-worker-3-aespa sda --eject
Successfully ejected media
```

위와 같이 설치 이미지를 unmount 시킨 후에
재부팅 한다.
![](./_images/Pasted%20image%2020250523130355.png)

## VM의 Network 설정
### Host OS에서
**host OS**에서 
```sh
# Gracefully shut off the VM
sudo virsh shutdown k8s-worker-1-ive
# wait for it to fully power off (or force off if it hangs)
sudo virsh list --all
 Id   Name              State
---------------------------------
 20   k8s-master-node   running
 -    k8s-worker-1-ive   shut off
```

shut off 상태 확인 후

```sh
sudo virsh attach-interface \
  --domain k8s-worker-1-ive \
  --type bridge \
  --source br1 \
  --model virtio \
  --config
```

```sh
# Boot it back up
sudo virsh start k8s-worker-1-ive
```

계속 **host OS**에서
```sh
virsh domiflist k8s-worker-1-ive
 Interface   Type      Source    Model    MAC
-------------------------------------------------------------
 vnet26      network   default   virtio   52:54:00:9e:3b:85
 vnet27      bridge    br1       virtio   52:54:00:c6:f7:8a
```

새로 생성한 VM의 IP주소를 알기 위해
```sh
> virsh net-dhcp-leases default
 Expiry Time           MAC address         Protocol   IP address          Hostname              Client ID or DUID
----------------------------------------------------------------------------------------------------------------------------------------------------------
 2025-05-23 05:26:41   51:53:00:11:13:dc   ipv4       192.168.122.68/24   k8s-master-node-ive   ff:56:50:3d:98:00:02:00:00:ab:11:41:db:50:00:c1:a5:1c:2e
 2025-05-23 05:37:14   51:53:00:9e:3b:85   ipv4       192.168.122.69/24   k8s-worker-1-ive      ff:56:50:3d:98:00:02:00:00:ab:11:1c:7b:76:5c:b6:2a:2b:94
```

참고:
```sh
k8s-master-node-ive : 192.168.122.176
k8s-worker-1-ive : 192.168.122.63
k8s-worker-2-aespa : 192.168.122.15
k8s-worker-3-aespa : 192.168.122.118
```

host OS에서 VM 접속
```sh
ssh tech@192.168.122.118
```

### VM 내부에서
```sh
ip link show
```

결과
```sh
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN mode DEFAULT group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
2: enp1s0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP mode DEFAULT group default qlen 1000
    link/ether 52:54:00:47:dd:02 brd ff:ff:ff:ff:ff:ff
3: enp7s0: <BROADCAST,MULTICAST> mtu 1500 qdisc noop state DOWN mode DEFAULT group default qlen 1000
    link/ether 52:54:00:61:6a:ec brd ff:ff:ff:ff:ff:ff
```

`enp1s0`은 NAT'd가 운영, `enp7s0`는 br-1 connected interface이다.

•	**Cluster NIC**라는 것은 worker node의 pod와 master node간의, 즉, inter-node 통신을 위함 (10.10.10.x only) → 위에서는 `enp7s0`를 사용할 예정
•	**Management NIC** 이라는 것은 위를 제외한 모든 통신을 위함 (예: SSH 접속, package installs, DNS, Internet).

다음 입력
AESPA의 **worker node VM**에서
```sh
sudo su
cd /etc/netplan
mv 50-cloud-init.yaml 50-cloud-init.yaml.bk
nano 01-cluster.yaml
```

22번째 줄로 IP 설정, 나머지는 동일
```yaml ln:true hl:22
network:
  version: 2
  renderer: networkd

  ethernets:
    # ────────────────────────────────────────────────────────────────
    enp1s0:   # Management (NAT) NIC—Internet access via libvirt default
      dhcp4: true
      dhcp4-overrides:
        use-dns: false
        use-routes: true
      nameservers:
        addresses:
          - 210.219.173.151
        search:
          - 210.220.163.82

    # ────────────────────────────────────────────────────────────────
    enp7s0:   # Cluster (VXLAN/br1) NIC—private 10.10.10.x network
      dhcp4: no
      addresses:
        - 10.10.10.14/24
      routes:
        - to: 10.10.10.0/24
          scope: link      # “on-link” route so 10.10.10.13 is reachable
      # no default gateway here—Internet stays on enp1s0
```

```sh
chmod 400 01-cluster.yaml
netplan generate
netplan apply
```

확인: VM에서
```sh
ip addr
ip route
```
에서 확인한다.

### Host OS에서
확인: **hostOS**에서
```sh
ping -c3 10.10.10.14
```

성공했으면 **host OS**에서 다시 접속해본다.

```sh
ssh tech@10.10.10.14
```

#### Disable rp_filter in each VM
**VXLAN으로 통신이 들어올 때**
- **Physical NIC** (eno1 혹은 enp1s0)는 IDC network에 plugged된 것
- **Overlay NIC** (vxlan42 → br1)은 물리적 네트워크에서의 UDP packet 안에 cluster의 CIDR (10.10.10.10/24)을 가지는 것.

예를들어 AESPA 서버에서 VXLAN으로 packet을 보낼 때 처음에는 'Physical NIC'에 먼저 도달하고 이것이 decapsulated 되면서 br1으로 들어온다. 그러나 `rp_filter=1`로 되어있으면 스누핑 트래픽으로 오인하고 차단한다. → 그래서 rp_filter를 disable한다.

```sh
# Immediately disable RPF: (하는 방법도 있고)
sudo sysctl -w net.ipv4.conf.all.rp_filter=0
sudo sysctl -w net.ipv4.conf.default.rp_filter=0
sudo sysctl -w net.ipv4.conf.enp7s0.rp_filter=0
```

위 명령어는 일시적으로 disable 시키므로
영구적으로 disable 시키기 위해 `/etc/sysctl.d/99-disable-rpfilter.conf` 생성
```
nano /etc/sysctl.d/99-disable-rpfilter.conf
```

```sh
net.ipv4.conf.all.rp_filter = 0
net.ipv4.conf.default.rp_filter = 0
net.ipv4.conf.enp7s0.rp_filter = 0
```

reload
```sh
sudo sysctl --system
```

확인:
```
> sysctl net.ipv4.conf.all.rp_filter
```

`0`이 출력되면 다음 단계로

### swap off
생성한 VM의 swap memory 기능 상태 체크
```sh
free -h
swapon --show
```

swap 끄기

```sh
sudo swapoff -a
```

재부팅시에도 swap 이 살아나지 않게 하려면
```sh
sudo sed -i.bak '/\bswap\b/ s/^/#/' /etc/fstab
```

verify
```sh
grep -v '^#' /etc/fstab | grep swap   # 아무것도 안 나와야한다.
cat /etc/fstab
```

확인해보면 아래 부분이 주석처리가 되어있다.
```
#/swap.img      none    swap    sw      0       0
```

### enable packet forwarding
공식문서대로 따라한다 : https://kubernetes.io/docs/setup/production-environment/container-runtimes/#containerd-systemd

**개념**:
Network Interface라고 하는 것은 machine의 가상NIC 혹은 물리적 NIC을 이야기하는데, packet forwarding이란 하나의 NIC로 들어오고 내꺼가 아니면 다른 NIC으로 보내는 것을 허용해준다는 뜻이다.
(default는 자기가 아닌 다르 곳으로 가는 packet은 그냥 버린다.)
아래 **bridge-nf**가 필요한 이유는 K8s에서 사용하는 가상 네트워크(bridge)를 통과하는 패킷(Calico와 같은 CNI에서의 packet)도 iptables 규칙을 거치게해서 보안 정책이나 네트워크 정책을 제대로 적용할 수 있게 하기 위함이다.

값이 1인지 확인한다.

```sh
sysctl net.ipv4.ip_forward
```

default는 0인데 1로 바꿔줘야한다.

enable packet forwarding

```bash
# sysctl params required by setup, params persist across reboots
cat <<EOF | sudo tee /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward = 1
EOF

# Apply sysctl params without reboot
sudo sysctl --system
```

다시 확인
```sh
> sysctl net.ipv4.ip_forward
net.ipv4.ip_forward = 1
```

### Containerd 설치
#### Installing Containerd
공식문서(공식문서에 링크된 주소) 참조: https://github.com/containerd/containerd/blob/main/docs/getting-started.md

현재 최신 버전인 containerd 2.1.0을 다운로드한다.
```sh
mkdir -p /svc/kubectl
cd /svc/kubectl
wget https://github.com/containerd/containerd/releases/download/v2.1.0/containerd-2.1.0-linux-amd64.tar.gz
tar Cxzvf /usr/local containerd-2.1.0-linux-amd64.tar.gz
```

systemd로 containerd를 시작하기 위해서
```sh
wget https://raw.githubusercontent.com/containerd/containerd/main/containerd.service
ls
mkdir -p /usr/local/lib/systemd/system
mv containerd.service /usr/local/lib/systemd/system/containerd.service
systemctl daemon-reload
systemctl enable --now containerd
```

설치 확인
```sh
service containerd status
```

containerd는 모든 노드(VM)에 설치한다.

공식문서에서는 위와 같이 containerd를 tarball로 설치시, runc도 같이 설치해야된다. 
(이거 빼놓고 설치해봤는데 Containerd가 동작을 하지 않는다. 여기 써놓은 모든 step들은 다 필수)
그러므로 계속 공식문서대로 따라하면 :

#### install runc
```sh
wget https://github.com/opencontainers/runc/releases/download/v1.3.0/runc.amd64
install -m 755 runc.amd64 /usr/local/sbin/runc
```

확인 → 가끔 설치가 뻑나니 확인 또 확인
```sh
which runc
runc --version
```

#### install CNI plugins
```sh
wget https://github.com/containernetworking/plugins/releases/download/v1.7.1/cni-plugins-linux-amd64-v1.7.1.tgz
ls
mkdir -p /opt/cni/bin
tar Cxzvf /opt/cni/bin cni-plugins-linux-amd64-v1.7.1.tgz
```

확인
```sh
containerd --version
```

generate default config : https://github.com/containerd/containerd/blob/main/docs/getting-started.md#advanced-topics

```sh
sudo mkdir -p /etc/containerd
containerd config default | sudo tee /etc/containerd/config.toml
```

수정
```sh
vim /etc/containerd/config.toml
```

`runc.options`문구를 찾아 바로 밑에 다음 한 줄을 넣어준다.
```toml
[plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc]
  ...
  [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc.options]
    SystemdCgroup = true
```

→ 이는 Containerd가 Kubelet과 같은 Cgroup driver를 사용하게 되는 것을 보장해준다.

저장 후 다음 실행
```sh
sudo systemctl daemon-reload
sudo systemctl restart containerd
sudo systemctl status containerd
```
