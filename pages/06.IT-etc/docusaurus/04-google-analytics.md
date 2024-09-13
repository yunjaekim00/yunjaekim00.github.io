---
title: "google-analytics"
date: "2024-08-05"
---

# Google Analytics 추가하기
공식문서 (https://docusaurus.io/docs/api/plugins/@docusaurus/plugin-google-gtag) 에 나온대로 config.js에 추가해도 되지만,  
나는 그냥 `src/pages/index.js`에다가  

```js title="index.js"
import Head from '@docusaurus/Head';  // import해주고
...
<Layout>
  <Head>
        {/* Google Tag Manager (gtag.js) */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-004XXXXXXX"></script>
        <script>
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-004XXXXXXX');
          `}
        </script>
      </Head>
```

이렇게 추가해주어도 잘 동작한다.  