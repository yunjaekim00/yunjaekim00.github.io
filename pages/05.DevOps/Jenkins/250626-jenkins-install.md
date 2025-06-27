---
title: JCasC를 이용한 Jenkins 설치 자동화
date: 2025-06-26
---
# JCasC를 이용한 Jenkins 설치 자동화
Ubuntu OS에서 적용
### JCasC
Ansible이 광범위한 기능때문에 많이 사용을 하지만 솔직히 syntax가 좀 짜증나는 면이 많다.
직관적이기 보다 필요한 기능이 있을 때마다 하나씩 하나씩 사전을 찾아봐야하는 느낌이랄까.
그래서 이번에는 JCasC를 이용해 설치를 자동화해보기로 한다.
JCasC는 **Jenkins Configuration as a Code**의 약자로 Ansible처럼 yaml 파일을 사용하고 기능이 Jenkins 설정에만 국한되어있지만 코드가 조금은 더 직관적이다.

### 1. docker-compose.yml
우선은 `docker-compose.yml`에서 출발해서 하나씩 하나씩 기능을 추가해보자.

파일 구조
```sh
└── docker-compose.yml
```

`docker-compose.yml`
```yaml
services:
  jenkins:
    image: jenkins/jenkins:2.516-jdk21
    restart: always
    user: root
    container_name: jenkins
    environment:
      - TZ=Asia/Seoul
    volumes:
      - "/data/jenkins/jenkins_home:/var/jenkins_home"
      - "/usr/bin/docker:/usr/bin/docker:ro"
      - "/var/run/docker.sock:/var/run/docker.sock"
    ports:
      - "80:8080"
      - "50000:50000"
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:8080/login || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

```

현재 사용 중인 위 코드에서 출발하겠다.
위 코드는 다른 포스팅에 설명하겠지만 간략히
`- "/usr/bin/docker:/usr/bin/docker:ro"`: 이 코드는 jenkins docker image가 docker CLI가 built-in 되어있지 않기 때문에 host OS의 Docker CLI (docker client library)를 사용하기 위함이고 `ro`는 read-only의 약자로 container가 host OS의 file을 수정할 수 없게 해준다.
`- "/var/run/docker.sock:/var/run/docker.sock"`: 이 코드는 host OS의 Docker daemon API socket을 container에 mount 시켜줌으로서, container가 host OS의 `docker.sock`라는 socket을 사용하여 Docker API를 사용할 수 있게 한다.

### 2. env 파일 분리
파일이 많아 질 것 같으니 env 파일로 변수를 분리해서 재사용 가능하게 한다.

```sh
├── argocd-jenkins.env    # Configuration variables
└── docker-compose.yml   
```

`argocd-jenkins.env`
```env
# Jenkins Configuration
JENKINS_IMAGE=jenkins/jenkins:2.516-jdk21
JENKINS_HOME=/data/jenkins/jenkins_home
JENKINS_HTTP_PORT=80
JENKINS_AGENT_PORT=50000
JENKINS_TIMEZONE=Asia/Seoul

# ArgoCD Configuration
ARGOCD_VERSION=v3.0.5
```

`docker-compose.yml`은 다음과 같이 변경
```yaml
services:
  jenkins:
    image: ${JENKINS_IMAGE}
    restart: always
    user: root
    container_name: jenkins
    environment:
      - TZ=${JENKINS_TIMEZONE}
    volumes:
      - "${JENKINS_HOME}:/var/jenkins_home"
      - "/usr/bin/docker:/usr/bin/docker:ro"
      - "/var/run/docker.sock:/var/run/docker.sock"
    ports:
      - "${JENKINS_HTTP_PORT}:8080"
      - "${JENKINS_AGENT_PORT}:50000"
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:8080/login || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
```

### 3. Docker Buildx 설치
우리는 나중에 `Jenkinsfile`에 `docker buildx`를 사용할 것인데
Docker Buildx 기능은 docker engine 24 버전부터 built-in이 되어있다고 하는데, host OS 설정에 따라 설치가 안 되어있는 경우도 있다. 확실히 해주기 위해 명시적으로 docker buildx를 설치해준다. 이는 `Dockerfile.jenkins`라는 코드로 분리해서 설치해주겠다.

```sh
├── Dockerfile.jenkins  # Install docker buildx
├── argocd-jenkins.env
└── docker-compose.yml   
```

`docker-compose.yml`에서 다음 코드를 삭제하고
```yaml
image: ${JENKINS_IMAGE}
```

삭제한 부분을 다음 코드로 대체한다.

```yaml
    build:
      context: .
      dockerfile: Dockerfile.jenkins
      args:
        JENKINS_IMAGE: ${JENKINS_IMAGE}
```

그리고 `Dockerfile.jenkins`파일을 생성해서 다음 코드를 넣어준다.

```Dockerfile
# syntax=docker/dockerfile:1.4
ARG JENKINS_IMAGE=jenkins/jenkins:2.511-jdk21
FROM ${JENKINS_IMAGE}

USER root

# Install Docker Buildx
RUN mkdir -p ~/.docker/cli-plugins && \
    curl -L https://github.com/docker/buildx/releases/download/v0.10.5/buildx-v0.10.5.linux-amd64 \
    -o ~/.docker/cli-plugins/docker-buildx && \
    chmod +x ~/.docker/cli-plugins/docker-buildx

# Also install it for the jenkins user
RUN mkdir -p /var/jenkins_home/.docker/cli-plugins && \
    cp ~/.docker/cli-plugins/docker-buildx /var/jenkins_home/.docker/cli-plugins/docker-buildx && \
    chmod +x /var/jenkins_home/.docker/cli-plugins/docker-buildx && \
    chown -R jenkins:jenkins /var/jenkins_home/.docker

USER root
```

### 4. Initial username 설정
여태까지는 JCasC와 전혀 관련이 없는 준비 작업이었고 이제 JCasC를 이용해볼 것이다.
Jenkins를 수동으로 설치해보면 다 알겠지만
위 상태까지만 하고 `docker compose up`을 하면 → browser에서 접속하면 WebUI에서 initial password를 넣으라고 하면 `docker logs`로 초기 admin 암호 조회해서 복사 붙이기하면 → 새로운 패스워드 설정하라고 나오고, 이거 입력하면 → 추천 플러그인 설치하겠습니까 나오는데 이 작업을 skip하고 자동으로 설정해주는 것을 구현할 것이다.

`docker-compose.yml`에 다음 부분을 추가
```yaml
		environment:
      - JAVA_OPTS=-Djenkins.install.runSetupWizard=false
			- CASC_JENKINS_CONFIG=/var/jenkins_config/jenkins.yml
	    - JENKINS_ADMIN_USERNAME=${JENKINS_ADMIN_USERNAME:-admin}
      - JENKINS_ADMIN_PASSWORD=${JENKINS_ADMIN_PASSWORD:-admin}
    volumes:
      - "./jenkins-config:/var/jenkins_config"
```

위의 `JAVA_OPTS=-Djenkins.install.runSetupWizard=false` 이 부분에 방금 적은 WebUI에서의 번거로운 절차를 skip 하겠다는 뜻이다.
`JENKINS_ADMIN_USERNAME=${JENKINS_ADMIN_USERNAME:-admin}`이 것은 .env 파일에 이 변수가 없다면 default로 admin을 쓰겠다는 뜻인데 굳이 안 넣어도 된다.

`Dockerfile.jenkins`에 다음 부분을 추가
```Dockerfile ln:7
# install Role-based authorization strategy plugin
RUN jenkins-plugin-cli --plugins \
    configuration-as-code \
    role-strategy \
    git \
    workflow-aggregator \
    github
```

**JCasC** 설치 부분은 `configuration-as-code` 
`role-strategy`는 권한을 제어하는 추가 계정 사용시 RBAC에 필요한 plugin
나머지는 IaC에 필요한 필수 plugin들

`argocd-jenkins.env`에
```env
JENKINS_ADMIN_USERNAME=jenkins
JENKINS_ADMIN_PASSWORD=xxxxxxxx
```
추가하고

이제 `jenkins-config/jenkins.yml` 생성한다.
```yaml
jenkins:
  numExecutors: 0
  mode: NORMAL

  securityRealm:
    local:
      allowsSignup: false
      users:
        - id: "${JENKINS_ADMIN_USERNAME}"
          password: "${JENKINS_ADMIN_PASSWORD}"

  authorizationStrategy:
    loggedInUsersCanDoAnything:
      allowAnonymousRead: false
```

이제 폴더 구조는
```sh
├── jenkins-config/
│   └── jenkins.yml       # JCasC configuration file
├── argocd-jenkins.env    # Configuration variables
├── Dockerfile.jenkins    # Install docker buildx
└── docker-compose.yml    # Docker Compose configuration
```

이렇게 바뀌었다.

이제부터 이후 단계에서 docker compose up은 다음 명령어로 실행한다.

```sh
docker compose --env-file argocd-jenkins.env up --build -d
```

실행하고 browser에서 접속하면 바로 Jenkins 메인 로그인화면이 뜨고, `.env`에 설정한 아이디와 패스워드를 입력하면 admin으로 접속이 된다.

접속이 확인되었으면 
```sh
docker compose --env-file argocd-jenkins.env down
```
로 다시 컨테이너를 내린다. 
(위 두 명령어는 계속 사용할 명령어)

### 5. Develop 계정 추가하기
모든 개발자에게 admin 계정을 줄 수 없으니 job 실행 read권한만 있는 `develop`계정도 추가기능을 넣어본다.

`docker-compose.yml`에 다음 2줄 추가
```yaml
    environment:
      - DEVELOP_USERNAME=${DEVELOP_USERNAME}
      - DEVELOP_PASSWORD=${DEVELOP_PASSWORD}
```

`argocd-jenkins.env`에 다음 추가
```env
# Jenkins Developer User 
DEVELOP_USERNAME=develop
DEVELOP_PASSWORD=xxxxxxxx
```

`jenkins-config/jenkins.yml`를 RBAC을 위해 전체 재작성
```yaml
jenkins:
  mode: NORMAL
  numExecutors: 0

  securityRealm:
    local:
      allowsSignup: false
      users:
        - id: ${JENKINS_ADMIN_USERNAME}
          password: ${JENKINS_ADMIN_PASSWORD}
        - id: ${DEVELOP_USERNAME}
          password: ${DEVELOP_PASSWORD}

  authorizationStrategy:
    roleBased:
      roles:
        global:
          - name: admin
            permissions:
              - Overall/Administer
            entries:
              - user: ${JENKINS_ADMIN_USERNAME}
          - name: develop
            permissions:
              - Overall/Read
              - Agent/Connect
              - Agent/Disconnect
              - Agent/Build
            entries:
              - user: ${DEVELOP_USERNAME}

  projectNamingStrategy:
    roleBased: {}
```

바로 위 코드에 보이듯이 develop 계정에는 read권한을 admin 계정에는 RBAC 형태로 admin 권한을 주었다.
다시 위의 docker compose up 명령어를 실행하면 'develop' 계정이 생성된 것을 확인할 수 있다.

### 6. Plugins 세팅
수동 설치시에 이 부분이 가장 시간이 많이 걸리는 부분이다. 수많은 플로그인을 다 설치하기에는 시간도 많이 소모가 되고, 내 Jenkinsfile에 필요한 플로그인만 설치하고 싶은데 그 목록을 적어놨다고 해도 하나하나 찾는데 오래걸린다.

우선 기존에 잘 사용하던 Jenkins console에 들어가 
'Jenkins 관리' > Script Console에 들어가 아래 코드를 입력하고 실행한다.

```sh
Jenkins.instance.pluginManager.plugins.each{
  plugin ->
    println ("${plugin.getShortName()}")
}
```


![](./_images/Pasted%20image%2020250626124517.png)

그러면 위와 같이 간단한 리스트가 나오는데
하단에 `Result: [Plugin:antisamy-markup-formatter, Plugin`로 시작하는 부분말고 그 위까지를 복사하여
`jenkins-config/plugins.txt`파일을 생성하여 붙여넣기 한다.

필요한 plugin들을 이제 text 파일 목록으로 설치할 것이므로 위에서 작성한 `Dockerfile.jenkins`에 다음 코드를 추가한다.

```Dockerfile
# Install plugins from plugins.txt
COPY jenkins-config/plugins.txt /usr/share/jenkins/ref/plugins.txt
RUN jenkins-plugin-cli -f /usr/share/jenkins/ref/plugins.txt
```

`plugins.txt`를 복사하는 이유는 jenkins의 volume mount가 되기 전에 위의 설치가 이루어지기 때문.

이제는 파일 구조가 다음과 같다.

```sh
├── jenkins-config/
│   ├── plugins.txt       # Jenkins plugin 목록
│   └── jenkins.yml       # JCasC configuration file
├── argocd-jenkins.env    # Configuration variables
├── Dockerfile.jenkins    # Install docker buildx
└── docker-compose.yml    # Docker Compose configuration
```

### 7. URL과 admin 이메일 주소 넣기
짜잘한 설정
Jenkins System에 URL 넣기.
`argocd-jenkins.env`에 추가
```env
JENKINS_URL=http://15.165.75.30
JENKINS_ADMIN_EMAIL=admin@example.com
```

`docker-compose.yml`파일에 추가
```yaml
    environment:
      - JENKINS_URL=${JENKINS_URL}
      - JENKINS_ADMIN_EMAIL=${JENKINS_ADMIN_EMAIL}
```

`jenkins-config/jenkins.yml` 제일 밑에 추가
```yaml
unclassified:
  location:
    adminAddress: ${JENKINS_ADMIN_EMAIL}
    url: ${JENKINS_URL}
```

### 8. Jenkins 관리 Tool에 Maven 추가
`jenkins-config/jenkins.yml`에 다음 추가
```yaml
tool:
  maven:
    installations:
      - name: "Maven 3.5.4"
        properties:
          - installSource:
              installers:
                - maven:
                    id: "3.5.4"
```

이제 
```sh
docker compose --env-file argocd-jenkins.env up --build -d
```
를 하면 설치가 완료된다.

Jenkins console에서 WebUI로 수동으로 plugin 설치하면 오래걸리는데 CLI에서는 plugin 설치 시간이 조금 더 빠르다.

환경의 인터넷 속도에 따라 다르지만 전체 프로세스가 약 5~8분내에 완료된다.

### 9. ArgoCD CLI 설치
Jenkins에는 ArgoCD CLI도 설치가 안 되어있고, Jenkins plugin 목록에도 ArgoCD CLI가 없다.
그래서 설치시 따로 설치해줄 필요가 있다.

`docker-compose.yml`에 다음 한 줄을 추가해주고
```yaml
  args:
     ARGOCD_VERSION: ${ARGOCD_VERSION}
```

`Dockerfile.jenkins`에 다음 코드 추가
```Dockerfile
ARG ARGOCD_VERSION

...

# Install ArgoCD CLI
RUN curl -sSL -o /usr/local/bin/argocd https://github.com/argoproj/argo-cd/releases/download/${ARGOCD_VERSION}/argocd-linux-amd64 && \
    chmod +x /usr/local/bin/argocd
```
