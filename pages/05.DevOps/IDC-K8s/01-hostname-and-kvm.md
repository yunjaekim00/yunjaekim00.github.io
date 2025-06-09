---
title: 01. Hostname 설정과 KVM 설치
date: 2025-06-09
---
# 01. IDC 서버에 hostname 설정 및 KVM 설치
## 목표
​
호스트 센터에서 IDC 서버에 Ubuntu 22.04 OS를 설치해주었다. 이제
​
1\. hostname을 바꾸고
​
2\. KVM(가상화 환경)을 설치해보자.
​
## Hostname 변경
​
이유: IP주소의 끝자리로 서버를 부르면 (예: 242서버, 244서버) 더 알기 쉽지만, '베몬'서버, '아이브'서버로 부르면  팀 문화가 좀 더 밝아질까에 대한 기대 외에는 딱히 없음.
​
### 001\. SSH 접속
​
에스파를 좋아하니 에스파로 변경해보겠다.
​
```
hostnamectl set-hostname AESPA
```
​
\`hostnamectl\`명령으로 호스트명을 한 번에 바꿔줍니다.
​
확인
​
```
> cat /etc/hostname
AESPA
> nano /etc/hosts
127.0.1.1. AESPA
> hostnamectl
```
​
/etc/hosts는 자동으로 매핑이 안 되어있는 경우가 있으니 수동으로 바꿔준다.
​
터미널 닫고 다시 열면 프롬프트가 바뀐 것을 볼 수 있다.
​
```
tech@AESPA:~$
```
​
## KVM
​
KVM 설치 이유: VM(가상 머신)을 띄워, 논리적으로 분리된 환경을 손쉽게 만들 수 있습니다.
​
### 002\. CPU 가 가상장비를 지원하는지 확인
​
```
egrep -c '(vmx|svm)' /proc/cpuinfo ## 숫자가 0보다 크면 된다.  
```
​
`vmx` : Intel VT-x (Intel Virtualization Technology)  
`svm` : AMD-V (AMD Virutalization)
​
즉, 이 서버의 CPU가 가상화를 지원하는지 체크하기 위함.  
결과값이 0이면 virtualization flag가 없으니 가상화 안 됨.  
`64` → 결과값 : virtualization flag의 개수이지 CPU개수가 아님. 이 서버는 32 CPU.
​
결과가 0이면 BIOS/UEFI에서 VT-x/AMD-V를 켜야함.
​
다음에는 `kvm-ok`라는 utility를 설치해서 KVM acceleration이 지원되는 지 알아본다.
​
```
sudo apt update  
sudo apt install cpu-checker -y
```
​
cpu-checker 패키지 안에 kvm-ok라는 tool이 내장되어있다.
​
위 cpu-checker를 설치해서 이제 kvm-ok를 사용할 수 있다.
​
```
> kvm-ok ## 이 명령어를 실행했을 때 아래처럼 출력  
INFO: /dev/kvm exists  
KVM acceleration can be used
```
​
### 003\. KVM 설치
​
#### 1\. KVM 및 필수 유틸리티 설치
​
```
sudo apt install -y qemu-kvm libvirt-daemon-system libvirt-clients bridge-utils virtinst virt-manager
```
​
`qemu-kvm` : KVM tool 자체 (hypervisor)  
`libvirt-daemon-system, libvirt-clients` : VM 운영을 위한 daemon과 client  
`bridge-utils` 네트워크 브리지 인터페이스를 위함 (VM이 외부 네트워크 access를 위함)  
`virtinst`: CLI로 VM을 control하거나 CLI script로 VM을 생성할 때 필요한 tool  
`virt-manager`: GUI for managing VM
​
```
sudo usermod -aG libvirt $(whoami)
```
​
root 계정으로 쓸 거면 이 명령어는 생략
​
#### 2\. libvirtd 서비스 상태 확인 및 시작
​
```
> sudo systemctl status libvirtd
Active: inactive (dead)
```
​
처음에는 위처럼 inactive 상태. 아래처럼 자동 시작을 설정해준다.
​
```
sudo systemctl enable libvirtd
sudo systemctl start libvirtd
sudo systemctl status libvirtd
```
​
### 004\. 사용자 계정을 Libvirt 및 Kvm 에 추가
​
확인
​
```
> getent group libvirt
libvirt:x:140:tech
> id root
uid=0(root) gid=0(root) groups=0(root)
```
​
```
> adduser $USER libvirt
Adding user `root' to group `libvirt' ...
Adding user root to group libvirt
Done.
```
​
확인
​
```
> getent group libvirt
libvirt:x:140:tech,root
> id root
uid=0(root) gid=0(root) groups=0(root),140(libvirt)
```
​
KVM도 마찬가지로 더해줌
​
```
sudo adduser $USER kvm  
```
​
위 명령어는 `sudo usermod -aG libvirt,kvm $USER`와 동일한 명령어
​
### 005\. KVM 설치 확인
​
```
> virsh list --all
 Id   Name   State
--------------------
```
​
### 006\. 재부팅
​
```
sudo systemctl reboot  
```
​
이제 KVM을 실행시켜서 VM을 생성할 수 있다.