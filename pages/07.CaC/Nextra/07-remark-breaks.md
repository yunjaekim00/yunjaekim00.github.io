---
title: 07-remark-breaks
date: 2024-09-28
---
# Next.js에 remark-breaks plugin 설치
## 개요
일반적인 markdown 파일은 줄 바꿈을 어떻게 할까?

```md
lorem ␠ ␠   
ipsum

lorem\
ipsum
```

위에는 sp라고 작게 썼지만 일반 공백(스페이스바)이라는 뜻 (공백을 표시할 수가 없으니)

- 단순히 'Enter'를 치면 줄이 안 바뀐다
1. 첫번째 방법은 스페이스바 2번 치고 → Enter 누르는 방법
2. 두번째 방법은 백슬래시 후 → Enter 누르는 방법

이렇게되면 Obsidian에서 편집한 내 글이 git push하는 순간 줄바꿈이 안 된 상태로 브라우저에 rendering 되게 된다.
이 문제를 해결하기 위해 remark-breaks 플러그인을 설치한다.
그러나 설치하기 전에 왜 이러는 건지 간단히 배경지식을 조사해보자.

## Markdown
### CommonMark and GFM
John Gruber가 만들어 2004년에 출시.  
초기 버전이 인기를 얻자 많은 사람들이 이용했고,
이에 더 많은 기능이 필요하자 여러가지 버전이 생겼다.
표준화의 필요성에 Jeff Atwood와 John MacFarlane이 표준화 작업을 하여 2014년에 발표하였다.  
그러나 Gruber가 이 표준화 버전에 Markdown이름을 사용하지 못하게 하여,  
표준화 버전은 **CommonMark**라는 브랜드로 출시되었다.  
그리고 이 CommonMark를 base로 또 많은 variant가 출시되었다.  
그 중 가장 유명한 것은 **GFM**(Github Flavored Markdown)으로 CommonMark를 연장해서 만든 것.  
중요한 것은 이 GFM이나 CommonMark가 단순한 'Enter'로 줄바꿈을 줄바꿈으로 인식하지 않는다는 것이다.  
아주 아주 불편하다.

- Nextra : MDX based인데 → 이 MDX는 CommonMark에 기반 (MDX란 CommonMark에 JSX가 더해진 것)
- Obsidian : GFM(Github Flavored Markdown)을 사용한다
- Notion : 기본 Markdown의 syntax를 수용하긴 하지만 CommonMark가 아닌 자체적인 WYSIWYG 인터페이스를 사용하여 바로 rich-text block으로 바꿔주는 형태

(Obsidian을 쓰다보면 Enter만 쳐도 줄바꿈이 된다고하겠지만 우측상단의 '읽기 모드'를 누르면 줄이 바뀌지 않는다는 것을 알 수 있다.)

글이 길어졌는데 이 문단에서 하고 싶은 얘기를 다시 요약하자면
1. 보통 Next.js를 from scratch에서 새로운 MDX 블로그를 만들 때 remark-gfm등 다양하게 설치하지만 Nextra에 이미 설치가 되어있으니 다시 설치할 필요가 없다.
2. 그러나 CommonMark를 따라 '스페이스 바 2개' 혹은 '역슬래시'가 없이는 줄바꿈이 rendering이 되지 않으니 remark-breaks 설치가 필요.

설치 전에 추가로 용어를 알아볼 필요가 있음

### 추가 용어 설명
- **allow Strict line breaks** : 스페이스 2개로 줄바꿈되는 rule을 무시하고, text editor상에서 줄바꿈이 되어있으면 줄 바꿈 되게하라는 뜻
- **make single line break visible** : 위와 같은 뜻이다. Enter를 쳐서 줄바꿈을 한 것은 CommonMark에서 무시되지만, 무시하지 않고 보이게(visible)하게 하라는 뜻 → treat single line breaks as actual line breaks

위의 용어 뜻을 알았다면 이제 Obisidian 설정에 다음이 어떤 뜻인지 알게 된다.

![](<./_images/Pasted image 20240929212948.png>)
위 옵션을 off 해야지 '읽기모드'에서도 줄 바꿈이 나타난다.

## remark-breaks 설치 
### install
내가 질문을 구체적으로 안 해서 일지도 모르겠으나
정말 챗GPT도 답변을 제대로 안 주고, 구글링해도 답이 안 나오는 경우는 정말 삽질이 많이 필요하다.
이 경우도 마찬가지였다.

우선 플러그인 설치

```sh
pnpm add remark-breaks
```

### .js 와 .mjs
위 플러그인의 npmjs 페이지를 보자.
https://www.npmjs.com/package/remark-directive 

설명에 이런 부분이 있다.
![](<./_images/Pasted image 20240929214500.png>)
`next.config.js`
→ import를 위해 `require()` syntax를 지원
`next.config.mjs`
→ **ESM**(ECMAScript module)을 사용
→ `import`와 `export`를 지원한다
그렇기 때문에 .mjs를 사용해야 설치가 된다는 뜻이다.

### configuration
`next.config.js` → `next.config.mjs`로 이름 변경 (확장자만 변경하면 자동으로 적용된다)

이제 전체 `.mjs` 파일은 다음과 같이 바꿔준다.

```js
import nextra from "nextra";
import remarkBreaks from "remark-breaks";

const withNextra = nextra({
	theme: "nextra-theme-docs",
	themeConfig: "./theme.config.jsx",
	mdxOptions: {
		remarkPlugins: [remarkBreaks],
	},
});

const nextConfig = {
	images: {
		unoptimized: true,
	},
	output: "export",
	reactStrictMode: false,
};

export default withNextra(nextConfig);
```

마지막 줄의 `module.exports`가 `export default`으로 바뀌었고,
위에 `require`가 `import`로 바뀌었고,
`mdxOptions`에 설치한 remark-breaks를 넣어주었다

이제 내 블로그에 있는 .md 파일을 Obsidian으로 편집할 때 
줄 바꿈하고 싶을 때 Enter만 치면 된다.

