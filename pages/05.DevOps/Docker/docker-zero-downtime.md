---
title: Docker container update with zero downtime (rolling update)
date: 2024-12-12
---
### 테스트 환경
1. local 맥북
2. Docker Desktop을 설치 후 실행 중
인 환경

### Test
터미널을 열어 docker swarm을 초기화 한다.
```sh
> docker swarm init
```

용량이 큰 이미지로 테스트해 보기 위해 moon fo dev와 prd를
내 로컬에 pull 받는다.
```
> docker pull docker.x2bee.com/x2bee-backend/moon-x2bee-fo_dev:latest
> docker pull docker.x2bee.com/x2bee-backend/moon-x2bee-fo_prd:latest
```

`Dockerfile`을 새로 작성한다.
```sh
> nano Dockerfile
```

```txt
FROM docker.x2bee.com/x2bee-backend/moon-x2bee-fo_dev:latest
RUN apk add --no-cache curl
HEALTHCHECK --interval=5s --timeout=3s --start-period=20s --retries=20 CMD curl -f http://localhost:3000/api/management/health || exit 1
```
코드 설명:
	base image는 dev-fo이고
	이 이미지에 curl이 설치 안 되서 curl 설치해주고
	`--start-period=20s`: 첫 20초간 health check 안 함
	`--interval=5s`: 그 후로 5초에 한 번씩 체크
	`--timeout=3s`: 매번 체크때 3초동안 응답 없으면 fail
	`--retires=20`: fail하면 20번 다시 체크, 즉 20 + 5 x 20 = 120초간 계속 체크
	```:3000```: docker container 내부에서 진행되는 체크니 80포트가 아닌 3000포트

새로운 이미지 생성
```sh
docker build -t health-check-image-old:latest .
```
코드 설명:
	`health-check-image-new:latest`: 이건 이미지의 이름과 태그
	`.`: 현재 폴더에 있는 Dockerfile로 이미지를 말으라는 뜻. Dockerfile의 경로를 지정해준다. 

새로운 `Dockerfile` 생성
```sh
FROM docker.x2bee.com/x2bee-backend/moon-x2bee-fo_prd:latest
RUN apk add --no-cache curl
HEALTHCHECK --interval=5s --timeout=3s --start-period=20s --retries=20 CMD curl -f http://localhost:3000/api/management/health || exit 1
```
base image만 prd로 바뀜

말아준다. (뭘 말아?)
```sh
docker build -t health-check-image-new:latest .
```

docker images가 4개가 생겼다.
```sh
❯ docker images
REPOSITORY                                         TAG                 IMAGE ID       CREATED          SIZE
health-check-image-new                             latest              1df96036d871   26 minutes ago   2.28GB
health-check-image-old                             latest              6d31bfa4c07b   28 minutes ago   3.85GB
docker.x2bee.com/x2bee-backend/moon-x2bee-fo_prd   latest              555861903b3a   3 days ago       2.27GB
docker.x2bee.com/x2bee-backend/moon-x2bee-fo_dev   latest              c0026e1eee22   2 months ago     3.85GB
```


#### 도커 띄우기
```sh
docker service create \
  --name fo \
  --replicas 1 \
  --publish 80:3000 \
  docker.x2bee.com/x2bee-backend/moon-x2bee-fo_dev:latest
```

#### 모니터링을 위해 새로운 터미널 창을 하나 띄운다
모니터링
```sh
watch -n 1 docker service ps nginx-service
```

#### 업데이트 (다시 기존 터미널 창)
```sh
docker service update \
  --image health-check-image-new:latest \
  --update-parallelism 1 \
  --update-delay 10s \
  --update-order start-first \
  fo
```

모니터링 터미널을 지켜본다.
```sh
Every 1.0s: docker service ps fo                                                                  yunjaekimui-MacBookPro.local: Thu Dec 12 19:38:20 2024

ID             NAME       IMAGE                           NODE             DESIRED STATE   CURRENT STATE             ERROR     PORTS
xrz0ooebisc4   fo.1       health-check-image-new:latest   docker-desktop   Running         Running 23 minutes ago
jpuiu8536wvx    \_ fo.1   health-check-image-old:latest   docker-desktop   Shutdown        Shutdown 23 minutes ago
```

브라우저도 http://localhost 를 계속 새로고침 해본다.

#### rollback(optional)
심심하면 기존 old(dev)로 롤백도 해본다.
```
docker service rollback fo
```

#### Clean up
```sh
docker service rm fo
```


### 삭제 3종 세트
위 clean up으로 container는 다 죽었으니 3종 세트 중
```sh
docker stop [id]
docker rm [id]
```
는 필요없고
docker image 삭제

```sh
docker rmi [id]
```

... CLI말고 그냥 Docker Destop에서 전체 선택하고 삭제하는 게 더 편함



