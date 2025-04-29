---
title: Sentry에 Next.js Project 설정하기
date: 2025-04-26
---
# Sentry에 Next.js Project 설정하기
### Sentry
Self-host로 배포된 sentry 콘솔에서 `Create Project`를 누르고, Next.js를 선택한다.

그러면 '자동 설치'와 '수동 설치' 안내가 나오는데, 자동 설치를 추천하기 때문에 자동으로 한다.

```sh
npx @sentry/wizard@latest -i nextjs --org sentry --project 프로젝트이름
```

안내에 따라 설치를 하게 되면 11개 파일이 신규생성되거나 코드가 추가가 된다.
조금 refactoring을 해줄 필요가 있다.

### Next.js 환경변수 정리
`sentry-build-plugin`에 있는 코드를 `.env.development.set`로 옮기고 `sentry-build-plugin`파일은 삭제한다. (공식문서에도 옮겨도 된다고 되어있음.)
(Jenkins에 Credentials에 암호화해서 넣어도 되지만, 우리는 private self-hosted gitlab을 사용하므로 상관없다)
`next.config.js`에 자동으로 생성된 코드는 전부 하드코딩되어있는데 이것을 환경변수로 옮긴다.
결국 `.env.development.set`에는 다음 코드를 추가

```env
SENTRY_ORG=sentry
SENTRY_PROJECT=moonstore-next-fo
SENTRY_URL=https://dev-sentry.x2bee.com
SENTRY_AUTH_TOKEN=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
NEXT_PUBLIC_SENTRY_DSN=https://ba7a5b1daa3163ea1f392b4b9e96@sentry-dev.x2bee.com/36
```

그리고 `next.config.js`에는 다음과 같이 수정한다.

```js
module.exports = withSentryConfig(module.exports, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  sentryUrl: process.env.SENTRY_URL,
```

### 추가 리팩토링
우리 프로젝트는 `/src/app`에 root layout 파일이 없고 `/src/app/[locale]`에 root layout이 있는데, 자동 설치 프로그램이 이를 인지 못하고 `layout.tsx` 파일을 생성해버린다. → 이 파일을 삭제한다. (공식문서에도 삭제하라고 되어있음.) 그리고 `/src/app/sentry-example-page`폴더를 `src/app/[locale]/sentry-example-page`안으로 옮긴다.

VS code와 같은 IDE에서 전부 찾아바꾸기를 한다.
`"https://ba7a5b1daa3163ea2a4asd332b4b9e96@dev-sentry.x2bee.com/16"` 이렇게 된 것을 전부 `process.env.NEXT_PUBLIC_SENTRY_DSN`으로 변경한다. (3군데 정도가 바뀜)

그리고 마지막으로 프론트엔드 개발자들... ESLint를 그렇게 맞추라고 해도 안 잡는다.
`next.config.js`에 다음 코드를 넣어서 Jenkins 오류가 안 나게 한다.

```js
	eslint: {
    ignoreDuringBuilds: true
  }
```

### 확인
위에서 자동설치를 했을 때 일부러 에러를 내게 하는 페이지도 자동으로 추가가 되는데, 브라우저에 `https://dev-sentry.x2bee.com/api/sentry-example-api` 혹은 `https://dev-sentry.x2bee.com/sentry-example-page`를 접속하게 되면 자동으로 아래와 같이 에러가 기록된다. 

![center](./_images/Pasted%20image%2020250426165913.png)