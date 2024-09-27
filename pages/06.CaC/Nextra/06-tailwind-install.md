---
title: 06-tailwind-install
date: 2024-09-28
---
# Tailwind CSS 설치
### 왜 Tailwind CSS를 설치하는가?
Markdown 파일은 HTML 태그를 포함할 수 있다.  
Markdown parser가 .md 파일에 쌩 HTML 코드를 embed 할 수 있게 되어있다.  

위에 `globals.css`를 import하긴 했지만  
가끔 마크다운 파일에 직접 inline 스타일링처럼 간편하게 하고 싶을 때도 있고  
`globals.css` 조차도 단순 CSS보다 Tailwind CSS 문법을 쓰는 것이 더 편하기 때문에 설치하였다.  

위에서 이미 `_app.js`에 `globals.css`를 import 해주었으니 나머지 설치 절차를 알아보자.  

### Installation
다음 세 가지를 install

```sh
pnpm add --save-dev tailwindcss postcss autoprefixer
```

그리고 다음을 실행하면  

```sh
npx tailwindcss init -p
```


`tailwind.config.js`와 `postcss.config.js` 파일이 자동으로 생성된다.  
우선 `globals.css`에 다음 3줄을 입력해주고

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

`tailwind.config.js` 파일을 다음 코드로 대체해준다.

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,jsx,ts,tsx,md,mdx}',
    './components/**/*.{js,jsx,ts,tsx,md,mdx}',
  ],
  theme: {
    extend: {}
  },
  plugins: []
}
```

components 폴더가 없다면 위에 5째줄은 빼줘도 된다.  

이렇게 이미 있는 Next.js 프로젝트에 Tailwind CSS 설치 끝.  
