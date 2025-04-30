---
title: docker compose로 jenkins 설치하기
date: 2025-04-30
---
# docker compose로 jenkins 설치하기
#### docker-compose.yaml 작성
적당한 폴더에 새로 작성
```yaml
version: "2"

services:
  jenkins:
    image: jenkins/jenkins:2.504-jdk17
    restart: always
    user: root
    container_name: jenkins
    environment:
      - TZ=Asia/Seoul
    volumes:
      - "/data/jenkins/jenkins_home:/var/jenkins_home"
      - "/usr/local/bin/helm:/usr/local/bin/helm"
      - "/usr/bin/argocd:/usr/bin/argocd"
      - "/data/argocd_config:/root/.argocd"
      - "/usr/bin/docker:/usr/bin/docker"
      - "/var/run/docker.sock:/var/run/docker.sock"
    ports:
      - "80:8080"
      - "50000:50000"
```

```sh
docker compose up -d
```

1. 최초 암호 넣고 → `docker logs jenkins` 하면 나온다
2. 플러그인은 첫 화면에 아무것도 설치하지 말고 넘어간 뒤
3. URL 등록 (`http://jenkins.example.co.kr`) 하여 진행한다.
기존 Jenkins를 설치할 때 필요한 플러그인을 메모해둔 뒤에 필요한 플러그인 설치를 진행한다.
→ 플러그인 설치에 에러나는 경우는 크게 두 가지인데
- 선행되는 플러그인이 없는 경우
- 그냥 네트워크 상태때문에 timeout 걸려서 안 되는 경우
이 경우 그냥 다시 그 플러그인 설치하면 된다.

필요한 플로그인 설치가 끝나면 
```sh
docker compose down
```
을 하고 data_backup에서 하나씩 하니씩 옮겨온다.
(폴더 전부를 복사해오면 동작하지 않는다.)
백업한 데이터 목록을 보면

```sh
> cd /data_backup/jenkins/jenkins_home
> ls
caches                                          nodeMonitors.xml
config.xml                                      org.jenkinsci.plugins.docker.commons.tools.DockerTool.xml
copy_reference_file.log                         org.jenkinsci.plugins.gitclient.JGitApacheTool.xml
credentials.xml                                 org.jenkinsci.plugins.gitclient.JGitTool.xml
fingerprints                                    org.jenkinsci.plugins.workflow.flow.FlowExecutionList.xml
hudson.model.UpdateCenter.xml                   plugins
hudson.plugins.git.GitTool.xml                  queue.xml
hudson.tasks.Ant.xml                            queue.xml.bak
hudson.tasks.Maven.xml                          secret.key
identity.key.enc                                secret.key.not-so-secret
jenkins-jobs                                    secrets
jenkins.install.InstallUtil.lastExecVersion     tools
jenkins.install.UpgradeWizard.state             updates
jenkins.model.JenkinsLocationConfiguration.xml  userContent
jenkins.mvn.GlobalMavenConfig.xml               users
jenkins.telemetry.Correlator.xml                war
jobs                                            workspace
logs
```

위와 같이 나오는데
`credentials.xml` 와 `secrets`폴더에는 기존에 gitlab이나 docker에 연결해놓은 credentials가 들어있으니 복사
```sh
cp /data_backup/jenkins/jenkins_home/credentials.xml /data/jenkins/jenkins_home/credentials.xml
cp /data_backup/jenkins/jenkins_home/secret.key /data/jenkins/jenkins_home/secret.key
cp -r /data_backup/jenkins/jenkins_home/secrets /data/jenkins/jenkins_home/
```

기존 Jenkins에 Item으로 등록했던 정보들도 전부 복사해온다.
```sh
cp -r /data_backup/jenkins/jenkins_home/jenkins-jobs /data/jenkins/jenkins_home/
cp -r /data_backup/jenkins/jenkins_home/jobs /data/jenkins/jenkins_home/
cp -r /data_backup/jenkins/jenkins_home/workspace /data/jenkins/jenkins_home/
```

만약 Jenkins에 Views(폴더처럼 탭으로 구분하는 목록)를 설정했다면 이 정보는 `config.xml`에 들어있다.
`/data/jenkins/jenkins_home/config.xml`을 편집기로 열어서 기존 `config.xml`의 `<listView>`를 복사해온다.

```xml
  <views>
    <hudson.model.AllView>
		  ...
    </hudson.model.AllView>
    <listView>
      ....
			## 여기 해당하는 부분 전부 복사 붙이기
		</listView>
	</views>
```

### ArgoCD
Jenkins가 있는 instance를 비용 절약을 위해 꺼두고, 나중에 재시작하면 argocd 정보가 풀린다. 
이를 유지하기 위해 다음 작업을 한다.
우선 host machine에서

```sh
curl -LO https://github.com/argoproj/argo-cd/releases/download/v2.10.6/argocd-linux-amd64
```

version은 argocd client (웹 페이지)를 설치한 버전과 통일시켜야한다.

목적은 docker container 안에서 argocd 명령어를 먹게 하는 것이기 때문에
volume mount할 폴더로 이동시킨다.

```sh
mv argocd-linux-amd64 /usr/bin/argocd
chmod 755 /usr/bin/argocd
```

실행파일이 `/usr/bin`에 있어야 어느 위치에서도 실행이 된다

CLI 환경에서 ArgoCD를 설치하고 내 ArgoCD에 로그인을 하면 default로 로그인 정보가 `~/.argocd/confg`라는 파일에 저장되지만 이 경로에 저장이 안 되고 수동으로 다른 위치에 저장하도록 다음 명령으로 강요할 수 있다.
host machine에서

```sh
argocd login argocd.example.co.kr --grpc-web --insecure --config /data/argocd_config
```

위처럼 로그인을 하고 조회하면

```sh
> cat /data/argo_config/config
contexts:
- name: argocd.example.co.kr
  server: argocd.example.co.kr
  user: argocd.example.co.kr
current-context: argocd.example.co.kr
servers:
- grpc-web: true
  grpc-web-root-path: ""
  insecure: true
  server: argocd.example.co.kr
users:
- auth-token: eyJhbGcXXXXXXXXXXXXXXcCI6IkpXVCJ9.eyJpc3MiOiJhcmdvY2QiLCJzdWIiOiJhZG1pbjpsb2dpbiIsImV4cCI6MTc0NDIzOTQ4MSwibmJmXXXXXXXXXXXXXXXXiOjE3NDQxNTMwOxxxxxxxxXXXXXXXXXXXXLTU3ZDMtNDM2Zi04ZmZmLTFlMDdmMzE5MDg5YyJ9.H_I8DaUx5IHSzU2EVTrlXXXXXXXXXXXXXXxxx
  name: argocd.example.co.kr
```

그리고 이 config 파일이 600 권한을 갖지 않으면 Jenkins내에서 또 아예 접속이 안 된다.

```sh
> sudo chmod 600 /data/argo_config/config
```

이제 이 `config` 정보와 `argocd`의 실행 파일을 volume mount 해주면 이제 Jenkins container를 restart해도 ArgoCD에 접속할 수 있다. → `docker-compose.yml`파일의 volume mount에 다음 두 줄은 이를 위해 존재.

```yaml
    volumes:
      - "/usr/bin/argocd:/usr/bin/argocd"
      - "/data/argocd_config:/root/.argocd"
```

(물론 회사에서 쓰는 Maven 플러그인 및 설정을 추가로 해줘야하지만 → https://x2bee.tistory.com/23)
이제 다시 container를 시작해주면 복구가 완료된다.

```sh
docker compose up -d
```

