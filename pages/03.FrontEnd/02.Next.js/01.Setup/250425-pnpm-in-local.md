---
title: local 맥북 환경에서 pnpm 사용
date: 2025-04-25
---
# Local 맥북 환경에서 pnpm 사용
### 현상
Next.js 프로젝트 안에서 `pnpm` 명령어를 사용 시 계속 `package.json`에 계속

```json
"packageManager":"pnpm@10.8.1+sha512.c50088ba998c67b8ca8c99df8a5e02fd2ae2e2b29aaf238feaa9e124248d3f48f9fb6db2424949ff901cffbb5e0f0cc1ad6aedb602cd29450751d11c35023677"
```

이런 코드가 자동으로 생긴다. → pnpm을 사용하지 않는 팀원들이 많은데 이런 게 생기는 게 싫다. 이유를 봤더니 `corepack`에는 기본적으로 pnpm을 설치하지 않아도 pnpm을 사용할 수가 있는데, 이 때 corepack이 자동으로 사용한 이 특정 버전의 pnpm을 `package.json`에 pin 해버린다.

### 해결 방법 1
corepack을 이용하지 않고 pnpm을 globally 설치해서 사용하는 방법

```sh
> corepack disable
> npm install -g pnpm@latest
```

설치 확인

```
> npm list -g
```

### 해결 방법 2
맥북에서 `~/.zshrc`에 이 auto pin을 해제시키는 방법

```sh
> nano ~/.zshrc
```

그리고 다음 줄 추가

```sh
export COREPACK_ENABLE_AUTO_PIN=0
```

그리고 reloading

```sh
source ~/.zshrc
```

그러면 `corepack enable`을 해도 pnpm 실행시 자동으로 package.json에 auto pin이 들어가지 않는다.