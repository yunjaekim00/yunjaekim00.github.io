---
title: Custom CSS 1(font style)
date: 2024-09-24
---
# Custom CSS로 font style 변경
`.css`파일을 아무데나 생성한다.  
나는 root에 `styles/globals.css`를 생성하고  
`pages/_app.js`에 이를 import하였다.  

```js
import '../styles/globals.css';
```

`globals.css`에 내가 좋아하는 영문 폰트인 Comic Neue와  
내가 좋아하는 한글 폰트인 ‘교보핸드2019’를 CDN으로 import하고  
적용시킨다.  

```css
@import url("https://fonts.googleapis.com/css2?family=Comic+Neue:ital,wght@0,300;0,400;0,700;1,300;1,400;1,700&display=swap");
@import url("https://webfontworld.github.io/kyobobook/KyoboHandwriting2019.css");

body {
  font-family: "Comic Neue", "KyoboHandwriting2019";
}

/* 일반 텍스트 스타일 */
.nextra-content p,
.nextra-content li {
  font-size: 1.1rem;
  font-weight: 400;
  line-height: 1.8rem;
}

/* inline code 스타일 */
.nextra-content p code,
.nextra-content li code {
  font-family: "Comic Neue", "KyoboHandwriting2019";
  font-size: 1.1rem;
  font-weight: bold;
  letter-spacing: 0.03rem;
}
```

#### Safari에서 KyoboHand2019
위의 코드대로 했더니 Chrome 브라우저에서는 잘 뜨는데
Safari browser에서는 뜨지 않는다.
다음과 같이 `font-face` rule로 지정을 해주니 Safari 브라우저에서도 보인다.

```css
@font-face {
  font-family: "KyoboHandwriting2019";
  src: url("https://cdn.jsdelivr.net/gh/webfontworld/kyobobook/KyoboHandwriting2019.eot");
  src: url("https://cdn.jsdelivr.net/gh/webfontworld/kyobobook/KyoboHandwriting2019.eot?#iefix")
      format("embedded-opentype"),
    url("https://cdn.jsdelivr.net/gh/webfontworld/kyobobook/KyoboHandwriting2019.woff2")
      format("woff2"),
    url("https://cdn.jsdelivr.net/gh/webfontworld/kyobobook/KyoboHandwriting2019.woff")
      format("woff"),
    url("https://cdn.jsdelivr.net/gh/webfontworld/kyobobook/KyoboHandwriting2019.ttf")
      format("truetype");
  font-display: swap;
}
```

`font-display: swap`은 폰트가 로딩이 되는 동안 fallback font로 일단 rendering 되는 것을 보장해준다.

#### Comic Neue 
Safari에서 Comic Neue도 안 뜬다.
`/pages/` 폴더 안에 `_documents.js` 파일을 생성한다. 다음 코드를 붙여넣어준다.

```jsx
import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
	return (
		<Html lang="en">
			<Head>
				<link
					href="https://fonts.googleapis.com/css2?family=Comic+Neue:ital,wght@0,300;0,400;0,700;1,300;1,400;1,700&display=swap"
					rel="stylesheet"
				/>
			</Head>
			<body>
				<Main />
				<NextScript />
			</body>
		</Html>
	);
}
```

