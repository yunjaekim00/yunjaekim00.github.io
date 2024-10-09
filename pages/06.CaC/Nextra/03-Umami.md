---
title: Umami 설치
date: "2024-09-16"
---
# Umami 설치

블로그에 통계를 보기 위해 Google Analytics를 연동 시키는 것은  
왠지 오버 엔지니어링의 느낌이 든다.  
이 블로그로 수익을 창출할 것이 아니고 그냥 단순히 조회수가 궁금해서 설치하는 것 뿐인데  
그래서 umami라는 사이트 https://us.umami.is 를 이용해보기로 하였다.

umami cloud를 위해 회원가입하고 인증 절차를 마치면  
어떤 `<script>` 코드를 `<head>`에 넣으라고 나온다.

현재 이 Nextra의 코드의 `pages` 폴더에 javascript 파일이 전혀없는 상태이지만  
Nextra 공식 문서에 기본 파일을 오버라이딩하는 방법이 나와있다.  
참조: https://nextra.site/docs/guide/custom-css

그래서 umami에서 알려준 코드를 `pages/_app.js` 파일에 다음과 같이 넣었다.

```js
import Script from 'next/script';  // Import Script from Next.js

function MyApp({ Component, pageProps }) {
	return (
		<>
			<Script
				src="https://cloud.umami.is/script.js"
				data-website-id="xxxxx-xxxx-xxxx"  {/* 제시된 코드 */}
				strategy="lazyOnload"
			/>
			{/* children 넘겨주기 */}
			<Component {...pageProps} />
		</>
	);
}

export default MyApp;
```

배포한 후 내가 내 블로그를 조회하니 실시간으로 통계가 나온다.

![](<./_images/20240916045106.png>)

설치하고 보니 그렇게 자주 접속해보지는 않게 된다.
차라리 GA가 훨씬 나은 듯 보인다.
아니면 나중에 post글마다 조회수가 나오게 하는 기능을 넣어야겠다.