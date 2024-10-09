---
title: AMI 백업과 복원
date: 2024-10-08
---

## 개요

### AMI vs. Snapshot

EC2 instance를 생성하게 되면 자동으로 root EBS volume이라는 것이 붙게된다.
여기서 EBS volume이란 물리적인 저장소가 아닌 네트워크상의 HDD(SSD)같은 존재라고 보면 된다.
물리적으로는 SATA나 USB에 꼽지만, 네트워크 상으로는 EBS volume을 같은 AZ에 있는 EC2에 꼽는다고 보면 된다.
즉, EBS volume을 EC2 instance에 붙여서 동작시키려면 같은 **AZ(Availability Zone)** 에서만 붙는다.
(latency를 줄이기 위해 제약을 둔 것으로 보임)

#### Snapshot

- Snapshot이란 EBS volume의 특정 시간(point-in-time)에 백업하는 것을 말한다.
- 백업을 하면 자동으로 내 계정의 S3에 저장이 되지만 S3 bucket에서 조회할 수는 없다. S3에 보이지 않는 곳(under the hood)에 저장이 된다.
- S3라는 것은 기본적으로 global service이지만 Snapshot은 특정 Region에 묶인다. 즉, Snapshot을 다른 Region에 복원할 수 없다. (물론 Snapshot 자체를 다른 Region에 복사해서 복원하면 된다.)

#### AMI(Amazon Machine Image)

- AMI는 기본적으로 EC2 instance + EBS volume을 동시에 묶음으로 백업하는 것이라 보면 된다.
- Snapshot은 단순히 데이터를 백업하는 것이지만, AMI는 단순 데이터 이상으로 EC2에 딸린 권한같은 metadata, launch configuration등 여러 컴포넌트를 백업하는 것이라서 S3에 저장되는 것은 아니다.
- AMI도 Snapshot처럼 Region에 묶이게 된다.

### AMI 백업하기
- AWS console에서 백업할 EC2를 선택한 후 → Actions > Image and templates > Create image 를 하면 된다.
  ![centre|450](<./_images/20241008105956.png>)
  내가 백업하려는 instance에는 200Gb의 EBS가 붙어있는데,
  AMI 이미지가 Pending 상태에서 Ready가 되는데 약 1시간 쯤 걸렸다.

![center|200](<./_images/20241008113901.png>)


Pending상태는 AWS console > EC2 > Images → AMIs 에서 확인할 수 있고
백업의 **진행상태**는 AWS console > EC2 > Elastic Block Store → Snapshots에서 확인할 수 있다.

### AMI 복원하기
