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