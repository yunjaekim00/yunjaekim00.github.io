---
title: 09. ArgoCD 설치
date: 2025-06-11
---
# 09. ArgoCD 설치
## Create namespace
kubectl을 설치한 **master node** VM에서 작업

작업할 폴더
```sh
cd /svc
mkdir 04.argocd
cd 04.argocd
```

```sh
k create ns argocd
```

download install yaml
```sh
wget https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

```sh
vim install.yaml
```

디음 코드를 찾아 가장 밑에 `- --insecure` 한 줄을 추가
```yaml ln:true hl:36
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app.kubernetes.io/component: server
    app.kubernetes.io/name: argocd-server
    app.kubernetes.io/part-of: argocd
  name: argocd-server
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: argocd-server
  template:
    metadata:
      labels:
        app.kubernetes.io/name: argocd-server
    spec:
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - podAffinityTerm:
              labelSelector:
                matchLabels:
                  app.kubernetes.io/name: argocd-server
              topologyKey: kubernetes.io/hostname
            weight: 100
          - podAffinityTerm:
              labelSelector:
                matchLabels:
                  app.kubernetes.io/part-of: argocd
              topologyKey: kubernetes.io/hostname
            weight: 5
      containers:
      - args:
        - /usr/local/bin/argocd-server
        - --insecure
```

적용 (뒤에 namespace 명시에 주의)

```sh
k apply -f install.yaml -n argocd
```

## Create VirtualService
`02.argocd-vs.yaml`생성
```sh
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: argocd-server-vs
  namespace: argocd
spec:
  hosts:
  - argocd-stg.x2bee.com
  gateways:
  - istio-system/istio-gateway
  http:
  - route:
    - destination:
        host: argocd-server.argocd.svc.cluster.local
        port:
          number: 80
---
apiVersion: networking.istio.io/v1alpha3
kind: DestinationRule
metadata:
  name: argocd-server-dtrl
  namespace: argocd
spec:
  host: argocd-server.argocd.svc.cluster.local
  trafficPolicy:
    tls:
      mode: DISABLE
```

적용
```sh
k apply -f 02.argocd-vs.yaml
```

초기 admin 패스워드 확인
```sh
k -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d; echo
```

브라우저로 접속하여 비번 바꾸기

### Jenkins login 설정
Jenkins가 있는 instance를 비용 절약을 위해 꺼두고, 나중에 재시작하면 argocd 정보가 풀린다. 
이를 유지하기 위해 다음 작업을 한다.

우선 **Jenkins가 설치된** host machine에서
`docker-compose.yaml`의 volume mount가 경로가 제대로 되어있는지 확인
```yaml
version: "2"
 
services:
  jenkins:
    image: jenkins/jenkins:2.511-jdk21
    restart: always
    user: root
    container_name: jenkins
    environment:
      - TZ=Asia/Seoul
    volumes:
      - "/data/jenkins/jenkins_home:/var/jenkins_home"
      - "/usr/local/bin/argocd:/usr/bin/argocd"
      - "/data/argocd_config:/root/.argocd"
      - "/usr/bin/docker:/usr/bin/docker"
      - "/var/run/docker.sock:/var/run/docker.sock"
    ports:
      - "127.0.0.1:8080:8080"
      - "127.0.0.1:50000:50000"
```

ArgoCD를 다운로드 받는다.
```sh
curl -sSL -o argocd-linux-amd64 https://github.com/argoproj/argo-cd/releases/download/v3.0.5/argocd-linux-amd64
```

version은 argocd client (웹 페이지)를 설치한 버전과 통일시켜야한다.

목적은 docker container 안에서 argocd 명령어를 먹게 하는 것이기 때문에
volume mount할 폴더로 이동시킨다.

```sh
sudo install -m 555 argocd-linux-amd64 /usr/local/bin/argocd 
rm argocd-linux-amd64
```

실행파일이 `/usr/local/bin`에 있어야 어느 위치에서도 실행이 된다

CLI 환경에서 ArgoCD를 설치하고 내 ArgoCD에 로그인을 하면 default로 로그인 정보가 `~/.argocd/config`라는 파일에 저장되지만 이 경로에 저장이 안 되고 수동으로 다른 위치에 저장하도록 다음 명령으로 강요할 수 있다.
우선 현재 (Jenkins가 설치된) host machine에서

volume mount가 된 `/data/argocd_config`가 600 permission을 가져야 된다.
```sh
chmod 600 /data/argocd_config
```

```sh
argocd login argocd-stg.x2bee.com --skip-test-tls --grpc-web --insecure --config /data/argocd_config/config
```

위처럼 로그인을 하고 조회하면
```sh
> cat /data/argo_config/config
contexts:
- name: argocd-stg.x2bee.com
  server: argocd-stg.x2bee.com
  user: argocd-stg.x2bee.com
current-context: argocd-stg.x2bee.com
prompts-enabled: false
servers:
- grpc-web: true
  grpc-web-root-path: ""
  insecure: true
  server: argocd-stg.x2bee.com
users:
- auth-token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJhcmdvY2QiLCJzdWIiOiJhZG1pbjpsb2dpbiIsImV4cCI6MTc0ODMyMDc3NywibmJmIjoxNzQ4MjM0Mzc3LCJpYXQiOjE3NDgyMzQzNzcsImp0aSI6ImYxMWM5N2ZkLTBhY2QtNDA2OC04MGEyLTU1NDc0MDI3YTEwNiJ9.yXoPVcMsR6hoObhzn8CTLM8h_prWeuiAOrq4RQPUooo
  name: argocd-stg.x2bee.com
```

## ArgoCD CLI
**Master node**에도 Argocd CLI를 설치해주자.(선택)

```sh
curl -sSL -o argocd-linux-amd64 https://github.com/argoproj/argo-cd/releases/download/v3.0.5/argocd-linux-amd64
sudo install -m 555 argocd-linux-amd64 /usr/local/bin/argocd 
rm argocd-linux-amd64
argocd login argocd-stg.x2bee.com --skip-test-tls --grpc-web --insecure
```

## ArgoCD의 developer 계정
여전히 Master node에서
현재 어느 argocd에 로그인 되어있나 확인
```sh
argocd context
```

만약 list에 필요없는 서버가 있다면
```sh
nano ~/.config/argocd/config
```
로 삭제해준다.

현재 account 상황 조회
```sh
argocd account list
NAME   ENABLED  CAPABILITIES
admin  true     login
```

get the configmap
```
kubectl get configmap argocd-cm -n argocd -o yaml > 03.argocd-cm.yaml
```

```sh
nano 03.argocd-cm.yaml
```

가장 밑에 다음 코드 추가 (1주일 = 604800초)

```yaml
data:
  accounts.develop: login
  session.expire: "604800"
```

적용
```sh
k apply -n argocd -f 03.argocd-cm.yaml 
```

- configure RBAC for user
```sh
kubectl get configmap argocd-rbac-cm -n argocd -o yaml > 04.argocd-rbac-cm.yml
```

수정
```
nano 04.argocd-rbac-cm.yml
```

```
data:
  policy.csv: |
    p, role:readonly, applications, get, *, allow
    g, develop, role:readonly
```

apply
```
kubectl apply -n argocd -f 04.argocd-rbac-cm.yml
```

- assign new password
```
argocd account update-password --account develop --current-password X2commerce\!1 --new-password develop123\!
```

## ArgoCD configuration
#### ArgoCD 브라우저 로그인
- Project 생성
Settings > Project > 생성
![](./_images/Pasted%20image%2020250526141840.png)
- Gitlab 연동
Settings > Repositories > git 등록
![400](./_images/Pasted%20image%2020250531224036.png)

- Repositories
	- Settings > Projects > x2bee-stg에서 Source Repositories 선택, Destinations 선택
![600](./_images/Pasted%20image%2020250526145909.png)

- Roles
Settings > Projects > x2bee-stg로 와서
`+ ADD ROLE` 클릭
![400](./_images/Pasted%20image%2020250526164514.png)
(Jenkins pipeline code에서 argocd create이 있다면 위 3가지에 추가해서 `create`도 생성해준다.)
→ Create

→ Create
다시 Roles 선택 → JWT token 생성 → 복사하고

```txt
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJhcmdvY2QiLCJzdWIiOiJwcm9qOngyYmVlLXN0ZzphcmdvQtcm9sZS1zdGciLCJuYmYiOjE3N2MzAsImlhdCI6MTc0ODI0NTYzMCwianRpIjoiZTExZjUxYzQtNGM2Yy00N2U4LWE1ZTUtYmIyMDBiZmEwYzI2In0.YIKuKGdetzwbGXH_Jkwkt_OKT6KFFU9c7V-wUSpCsq8
```


브라우저에서 Jenkins에 로그인 > Jenkins 관리 > Credentials
`argocd-role-stg`에 Secret text로 패스워드 업데이트.
Credentials에 git과 jenkins도 생성
