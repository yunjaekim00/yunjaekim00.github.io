---
title: 02. Host OS에 Network 설정
date: 2025-06-09
---
# 02. Host OS에 Network 설정
보안상 public IP주소를 다르게 적음
## VXLAN 네트워크 설정 가이드
KVM을 이용해 생성한 VM에서의 Network 설정은 뒤에 다른 글에서 다루겠다.
이 글은 오직 host OS에서의 네트워크 설정에 관한 글이다
### 1. 기본 준비 작업
**모든 서버에서 공통 실행:** 즉, master node가 설치될 host OS이냐, worker node가 설치될 host OS이냐에 상관없이 공통으로 아래 사항을 실행.
우선 **IP forwarding을 활성화** 시킨다.
Linux는 기본적으로 라우터 역할을 하지 않는다. VM에서 나온 packet이 다른 네트워크로 전달되려면 host OS가 packet을 forwarding해야 하는데, 이 설정이 없으면 VM들이 서로 통신할 수 없다.

```bash
# IP 포워딩 활성화
sudo sysctl -w net.ipv4.ip_forward=1
echo "net.ipv4.ip_forward = 1" | sudo tee -a /etc/sysctl.conf

# DNS 설정 (선택)
sudo tee /etc/resolv.conf <<EOF
nameserver 8.8.8.8
nameserver 1.1.1.1
EOF
```

`ip addr`을 치면, 보통 
PCI Express interface의 경우 `ens33` 이런 것이 나오고, 
PCI bus는 `enp3s0` 이런게 나오지만,
onboard Ethernet services라서 `eno1` `eno2` 이런 것이 나온다.
이 중 어떤 interface를 쓸 지를 정하기 위해서는 우선 현재 연결이 된 것, 즉 `ip addr`할 때 public IP 주소가 할당된 bridge를 찾는다. 여러가지 중에 밑에 보면 `en01`에 public IP인 `217.37.14.89/27`가 할당된 것을 볼 수 있다.

```sh
> ip addr
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
    inet6 ::1/128 scope host 
       valid_lft forever preferred_lft forever
2: eno1: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc mq state UP group default qlen 1000
    link/ether f8:bc:12:50:f6:30 brd ff:ff:ff:ff:ff:ff
    altname enp1s0f0
    inet 218.38.15.89/27 brd 218.38.15.95 scope global eno1
       valid_lft forever preferred_lft forever
    inet6 fe80::fabc:12ff:fe50:f630/64 scope link 
       valid_lft forever preferred_lft forever
```

### 2. Bridge 네트워크 설정
**각 서버별로 설정:**
```bash
cd /etc/netplan
mv 00-installer-config.yaml 00-installer-config.yaml.backup
nano 01-bridge.yaml
```

**IVE 서버 설정 (`/etc/netplan/01-bridge.yaml`):**

```yaml title:01-bridge.yaml
network:
  version: 2
  ethernets:
    eno1:
      dhcp4: no
      dhcp6: no
  bridges:
    br0:
      interfaces: [eno1]
      addresses:
        - 217.37.14.73/27
      routes:
        - to: default
          via: 217.37.14.65
      nameservers:
        addresses:
        - 210.219.173.151
        search:
        - 210.220.163.82
      parameters:
        stp: false
        forward-delay: 0
```

**AESPA 서버 설정 (`/etc/netplan/01-bridge.yaml`):**

```yaml
network:
  version: 2
  ethernets:
    eno1:
      dhcp4: no
      dhcp6: no
  bridges:
    br0:
      interfaces: [eno1]
      addresses:
        - 217.37.14.89/27
      routes:
        - to: default
          via: 217.37.14.65
      nameservers:
        addresses:
        - 210.219.173.151
        search:
        - 210.220.163.82
      parameters:
        stp: false
        forward-delay: 0
```

**설정 적용:**

```bash
sudo chmod 600 /etc/netplan/*.yaml
sudo netplan generate
sudo netplan apply

# 확인
ip addr show br0
ping -c2 210.219.173.151
```

### 3. VXLAN 터널 설정

**IVE 서버에서:**

```bash
# VXLAN 인터페이스 생성 (중요: dev br0 사용)
sudo ip link add vxlan42 type vxlan id 42 \
  dev br0 \
  local 217.37.14.73 remote 217.37.14.89 dstport 4789
sudo ip link set vxlan42 up

# 프라이빗 브리지 생성 및 VXLAN 연결
sudo ip link add name br1 type bridge
sudo ip link set br1 up
sudo ip link set vxlan42 master br1

# 프라이빗 IP 할당
sudo ip addr add 10.10.10.1/24 dev br1
```

**AESPA 서버에서:**

```bash
# VXLAN 인터페이스 생성 (중요: dev br0 사용)
sudo ip link add vxlan42 type vxlan id 42 \
  dev br0 \
  local 217.37.14.89 remote 217.37.14.73 dstport 4789
sudo ip link set vxlan42 up

# 프라이빗 브리지 생성 및 VXLAN 연결
sudo ip link add name br1 type bridge
sudo ip link set br1 up
sudo ip link set vxlan42 master br1

# 프라이빗 IP 할당
sudo ip addr add 10.10.10.2/24 dev br1
```

위 명령어로 VXLAN tunnel이 → public traffic이 통신하는 bridge (`br1`)과 같은 bridge로 연결(bind)시켜주는 것이다. 그래서 Linux(Ubuntu)가 어떤 interface로 UDP/4789 packets를 보내야할 지 알고 overlay가 일반 L2 switch처럼 동작하게 된다. 외부로 나가는 UDP도 이제 public traffic 
### 4. libvirt 방화벽 규칙 추가

**양쪽 서버에서:**

```bash
# 10.10.10.0/24 네트워크 허용 규칙 추가
sudo iptables -I LIBVIRT_FWO 1 -s 10.10.10.0/24 -j ACCEPT
sudo iptables -I LIBVIRT_FWI 1 -d 10.10.10.0/24 -j ACCEPT
```

### 5. 연결 테스트

```bash
# 브리지 인터페이스 확인
ip addr show br1

# 연결 테스트
# IVE에서: 
ping -c2 10.10.10.2
# AESPA에서: 
ping -c2 10.10.10.1
# 즉, ping -c2 10.10.10.<상대방-IP>
```

## 핵심 포인트
1. **VXLAN을 `dev br0`에 바인딩**: 공용 IP가 br0에 있으므로 VXLAN도 br0에 바인딩해야 패킷이 올바르게 라우팅된다.
2. **네트워크 인터페이스 확인**: `ip addr`로 현재 사용 중인 인터페이스(eno1)를 확인하고 설정에 반영한다.
3. **방화벽 규칙**: libvirt의 기본 방화벽이 VXLAN 트래픽을 차단할 수 있으므로 허용 규칙을 추가한다.