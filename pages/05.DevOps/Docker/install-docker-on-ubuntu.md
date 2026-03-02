---
title: Ubuntu에 docker와 docker-compose v2 설치하기
date: 2025-04-30
---
# Ubuntu에 docker와 docker-compose v2 설치하기
참고: docker-compose v1은 `docker-compose up -d`과 같이 실행하지만 v2는 `-`를 안 해도 된다. 즉 `docker compose up -d`로 설치한다.

### 설치
Install Docker's official GPG key.

```sh
$ curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker.gpg
```

Run the following command to add the Docker repository.

```sh
$ echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

Update the system to include Docker's repository.

```sh
$ sudo apt update
```

Install Docker and the Docker compose plugin.

```sh
$ sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
```

This will be using the Docker Compose v2 plugin instead of the older legacy binary. Therefore, the command for running it has changed from `docker-compose` to `docker compose`and this is reflected here.
Docker runs with elevated privileges so you will need to use `sudo` frequently to run commands. The better option is to add your Linux user account to the `docker` user group.

```Plain
$ sudo usermod -aG docker ${USER}
```

The `${USER}` variable picks up the currently logged-in system account. If you are not logged in with the user you want to give privileges to, replace `${USER}` with the username.
To apply for the new group membership, log out of the server and back in, or use the following command. You will be prompted for the user's password.

```Plain
$ su - ${USER}
```
