---
title: gitlab-ce docker 버전 업하기
date: 2024-10-23
---
# gitlab-ce docker 버전 업하기
## 개요
내가 여기 입사하기도 전에 AWS EC2 instance에 설치되어있던,
그리고 현재 개발용으로 사용중인 Gitlab은 버전 13.10.5이다.
2021년 6월 버전이다. 
고작 3년밖에 안 되었지만 gitlab 생태계에는 고물 버전에 가깝다.

최신 버전으로 업데이트 요청사항이 있었다.
얼핏 드는 생각은
Postgresql 마이그레이션 할 때처럼
기존 configuration과 data dump 떠놓고
최신 이미지로 docker container 올리고 데이터 이관시키면 된다고 생각했다.

그러나 시행착오 끝에 이 방법은 통하지 않는다는 것을 알았다.
이 방법은 똑같은 버전으로 다른 곳에 이관시킬 때나 써먹는 방법이다.
그 이유는 major 버전 뿐만 아니라 minor 버전도 data 이관시
안에 여러가지 복잡한 컴포넌트들(내부 postgres, prometheus 등)이 같이 업데이트 되기 때문이다.

## 업데이트
### docker-compose 작성
입사 전 설치된 것이라 `docker-compose.yaml` 파일이 없다.
아마도 그냥 `docker run` command로 설치된 것 같다.
일단 EC2에 mount되어있는 volume 경로를 살피고 
현재 설치되어있는 docker container가 다음 형태의 파일일 것이라 예측하고 작성하였다.

`docker-compose.yaml` (url은 보안상 변경)
```yaml
version: '3.8'

services:
  gitlab:
    image: gitlab/gitlab-ce:13.10.5-ce.0
    container_name: gitlab
    restart: always
    hostname: 'gitlab.example.com'
    environment:
      GITLAB_OMNIBUS_CONFIG: |
        external_url 'gitlab.example.com'
        gitlab_rails['gitlab_shell_ssh_port'] = 8022
    ports:
      - '8001:80'
      - '443:443'
      - '8022:22'
    volumes:
      - '/data/gitlab/config:/etc/gitlab'
      - '/data/gitlab/logs:/var/log/gitlab'
      - '/data/gitlab/data:/var/opt/gitlab'
    shm_size: '512m'
```

```sh
docker stop gitlab
docker rm gitlab
```
을 하고 
```sh
docker compose up -d
```
실행 → 기존 Gitlab이 잘 유지 되면서 실행이 되었다.

### 단계적 업데이트
다음 페이지에 가면 추천 업데이트 단계가 나온다.
https://gitlab-com.gitlab.io/support/toolbox/upgrade-path/?current=13.10.5&target=17.4.2&distro=docker&edition=ce

요약하면
![](<./_images/Pasted image 20241023153816.png>)
이러한 13단계를 거쳐서 업그레이드 해야 한다.
중요한 것은 major 버전 업그레이드를 위해서 이전 major 버전의 마지막 버전까지 업그레이드를 해야한다.

```sh
docker compose up -d
```
를 하면 container가 뜨는데 약3분20초쯤 소요된다.
웹페이지에 접속을 한다.

**중요** : 성공적으로 뜨면 바로 `docker compose down`을 하면 안 된다.
(이거 몰라서 무한 삽질)

### Background Migrations
13버전까지는 웹페이지만 뜨면 container를 바로 죽이고 업그레이드 해도 된다.
그러나 14버전부터는 달라졌다.
다음 페이지를 보면
https://gitlab-docs.infograb.net/ee/update/versions/gitlab_14_changes.html
이런 문구가 써있다.

> 
> - 이전 GitLab 14 릴리스에서 14.3.Z로 업그레이드하기 전에 일괄 배경 마이그레이션이 완료 되었는지 확인하세요.
> - 배치된 배경 마이그레이션 상태를 확인하려면:
> 1. 왼쪽 사이드바에서 가장 아래에서 **관리 영역**을 선택합니다.
> 2. **모니터링 > 배경 마이그레이션**을 선택합니다.
> 3. 미완료된 마이그레이션을 보려면 **대기 중** 또는 **완료 중**을 선택하고, 완료되지 않은 마이그레이션에 대해서는 **실패함**을 선택합니다.
> 

이것이 무슨 뜻이냐면
13.12 버전까지는 Admin 메뉴 > Monitoring에 들어가면 화면이 다음과 같다.
![](<./_images/Pasted image 20241023160846.png>)
Background Jobs에서 '예약' 탭에서 자동으로 마이그레이션해주는 작업들이 container가 뜨고 나서도 진행된다.

14버전부터는 Admin 메뉴 > Monitoring에 다음과 같이 아예 `Background Migrations`라는 메뉴가 따로 생겼다. 

![](<./_images/Pasted image 20241023161308.png>)
docker container가 뜨고, 웹페이지에 접속이 되더라도
여기서 Background Migrations 작업이 전부 완료가 되어야지만
다음 단계로 버전 업그레이드를 할 수 있다. (보통 한 버전당 약20~30분쯤 소요된다.)
만약 중간에 끊고 업그레이드하면 data migration이 완료되지 않았으니
CLI command를 통해 수동으로 마이그레이션하라고 나오는데 실행해도 잘 되지 않는다.

위 작업들이 완료되면 우선 다음 명령을 한 번 해준다.
```sh
> docker exec -it gitlab gitlab-ctl reconfigure
```
위 명령어는 업그레이드 될 때 자동으로 실행되는 것 같지만
설정도 업데이트되었는지 확인하기 위해 한 번 더 실행해주는 것.

이제 비로소
```sh
docker compose down
```

`docker-compose.yaml` file을 에서 base image 한 줄 수정
```yaml
    image: gitlab/gitlab-ce:14.3.6-ce.0
```

그리고 다시 
```
docker compose up -d
```

그리고 버전 단계마다 위 절차를 계속 반복해주면 된다.
나같은 경우는 13단계 x 30분 = 6시간 30분이 걸렸다.


