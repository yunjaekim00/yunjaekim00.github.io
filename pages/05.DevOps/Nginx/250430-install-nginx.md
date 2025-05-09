---
title: Ubuntu 22에 Nginx 설치하기
date: 2025-04-30
---
# Ubuntu 22에 Nginx 설치하기
Ubuntu 22.04는 `sudo apt install nginx`를 해도 예전 버전의 Nginx가 설치된다. 그래서 Nginx 공식 레포지터리에서 설치해야된다. 
### 설치
#### 1. Import the Nginx signing key
아래 command로 Nginx의 public GPG key(in ASCII-armored format)를 다운로드 받는다. 이는 패키지가 공식 nginx.org에서 다운로드 받는다는 것을 확인하기 위함.

```sh
$ curl https://nginx.org/keys/nginx_signing.key | gpg --dearmor \
| sudo tee /usr/share/keyrings/nginx-archive-keyring.gpg >/dev/null
```

위 `gpg --dearmor`는 ASCII-armored key를 raw binary로 변환하기 위함.

#### 2. Register the official Nginx APT repository
Nginx의 stable version을 위한 repository를 추가.

```sh
$ echo "deb [signed-by=/usr/share/keyrings/nginx-archive-keyring.gpg arch=amd64] \
http://nginx.org/packages/ubuntu `lsb_release -cs` nginx" \
| sudo tee /etc/apt/sources.list.d/nginx.list
```

#### 3. Update cache and install Nginx
Update the system repositories.

```sh
$ sudo apt update
```

Install Nginx.

```sh
$ sudo apt install nginx
```

Verify the installation.

```sh
$ nginx -v
nginx version: nginx/1.26.1
```

Start the Nginx server.

```
$ sudo systemctl start nginx
```

브라우저에 IP 주소 넣어서 확인