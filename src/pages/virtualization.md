---
created: 2024-04-13T04:35
updated: 2024-07-18T10:37
cssclasses:
  - daily-eng
---
## 005. What is a Virtual Machine?
### VM
- No separate hardware needed
- e.g.) Windows OS위에 Linux, 혹은 Linux OS 위에 Windows를 사용할 수 있다 → this is done using a **hypervisor**
- *hypervisor* is a technology that allows hosting multiple computers on a physical computer

#### hypervisors : 예시
- VirtualBox by Oracle → most popular (because it's open-source and 모든 OS 지원) 
- VirtualBox takes hardware resources from Host OS and creates virtual CPU, virtual RAM, virtual storage for each VM

### Type 1 vs Type 2 hypervisor
#### Type 2
위에서 다루었던 Host OS 위에 hypervisor 놓는 방식이 Type 2. 개인 PC에서 쓰는 방식. *Hosted hypervisors* 라고도 불림
![center|600](_images/Pasted%20image%2020240714154344.png)
#### Type 1
Cloud 업체에서 쓰는 방식은. Host OS대신에 Hardware에 hypervisor가 직접 설치됨. Hardware에 직접 설치된다고 해서 Bare Metal hypervisor라고도 불림.
Type 1 예시 : **VMware ESXi**, **Microsoft Hyper-V**, AWS, Azure, GCP 등

#### Virtualization
- without virtualization - one point of failure → OS is tightly coupled to the hardware
- with virtualization - OS is a portable file → Virtual Machine Image → includes OS and all apps on it → can take *snapshots* which also contain all the configurations


## 006. Virtual Box installation
- download VirtualBox → install
- MacOS에서는 Security & Privacy에서 'Allow Oracle'을 해야 설치됨
- we need Ubuntu images → usually `.iso` extension
- Ubuntu는 오픈소스라 무료
- VirtualBox에서 종료시
![center|250](_images/Pasted%20image%2020240717212244.png)
Save the machine state는 열린 창까지 그대로 유지해서 다음에 시작
- host에서 복사/붙이기가 되기 위해서 General > Advanced > Shared Clipboard > Bidirectional 선택 → 추가로 VM VirtualBox Extension Pack을 설치해야함 → 추가로 VM안에서 상단메뉴 > Devices > Insert Guest Additions CD image 클릭 → 자동으로 installer를 찾아 설치함