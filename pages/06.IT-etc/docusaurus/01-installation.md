---
title: installation
date: "2024-08-05"
---

# Docusaurus Installation

공식문서 참조 : https://docusaurus.io/docs/installation

## 설치

node version 18.0 이상

```sh
npx create-docusaurus@latest my-blog-docusarus classic --typescript
```

위 명령어가 아닌

```sh
pnpm create docusaurus
```

를 해도 똑같이 classic(recommended)로 할 것이냐 typescript 쓸 것인가 질문이 나온다.

## 실행

local에서 실행은

```sh
pnpm start
```

소스를 수정하면 실시간을 변경되는 것을 볼 수 있음

## 버전 업데이트

```json title="package.json"
{
  "dependencies": {
    "@docusaurus/core": "3.5.1",
    "@docusaurus/preset-classic": "3.5.1"
    // ...
  }
}
```

package.json에서 두 가지의 버전을 고쳐주고 다시 npm install하면 된다.
