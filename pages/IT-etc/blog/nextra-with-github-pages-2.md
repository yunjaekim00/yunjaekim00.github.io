---
gitTimestamp: "2024-08-05"
---
# Nextra installation
참조: https://nextra.site/docs/docs-theme/start  

```sh filename="Terminal" showLineNumbers
mkdir my-blog
cd my-blog
pnpm add next react react-dom nextra nextra-theme-docs
```

`package.json`에 추가
```json filename="package.json"
"scripts": {
  "dev": "next",
  "build": "next build",
  "start": "next start"
},
```

`next.config.js` 생성
```js filename="next.config.js"
const withNextra = require("nextra")({
	theme: "nextra-theme-docs",
	themeConfig: "./theme.config.jsx",
});

const nextConfig = {
	//basePath: "/",
	images: {
		unoptimized: true,
	},
	output: 'export',
	reactStrictMode: true,
}

module.exports = {
	...withNextra(),
	...nextConfig,
};
```

수정 중....

