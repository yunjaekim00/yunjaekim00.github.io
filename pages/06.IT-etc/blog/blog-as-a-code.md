---
date: "2024-08-05"
---

# Docusaurus를 Github Pages에 배포하기

## 어떤 플랫폼을 블로그로 사용할까

Medium, WordPress, 네이버, Wix, Notion 여러가지를 고려하다가
티스토리를 쓴 지 1년 정도 되었다.

티스토리의 단점은

1. Folder의 sub-folder를 2단 이상으로 생성 기능이 지원이 되지 않는다.
2. TOC(Table of Contents) plugin을 import해서 적용할 수는 있지만 반응형으로 구현하기는 raw CSS 파일을 수정해야하는데 아주 어렵다.

그리고 모든 블로그 플랫폼의 한계점 - 포스팅한 글이나 임시 저장한 글이 내 **로컬**에 저장되지 않는다.

기본적으로 나는 로컬에 내 글이 저장이 되어야 진짜 내 것인 느낌이 들고  
로컬에 글을 저장하는 장점은  
특정 플랫폼이 마음에 들지 않을 때 쉽고 유연하게 옮겨탈 수 있는 장점이 있다.  
(내 네이버 블로그에 일괄 html export이 없으니 옮기고 싶어도 못 옮기는 상황)

## Open source SSG

### Framework 고민

가장 좋은 것은 내 입맛에 맞게 내가 Next.js 15로 내 개인블로그를 scratch에서부터 짜서 만드는 것이겠지만,  
어마어마한 도금질 노가다가 필요하다.  
(예를들면 모바일 환경에서 볼 때 TOC가 햄버거 메뉴로 바뀌게 하는 기능 등)

예전에 열심히 구글링해서 Jekyll과 Hugo를 사용해서 블로그를 생성해보았지만  
언어가 각각 Ruby와 Go로 되어있어서 배포에만 겨우 성공 했다뿐 커스터마이징이 어려웠다.

요즘 Next.js는 SSG(static site generation)가 되니 Javascript 기반으로 있으면 좋겠다 싶었다.

### CMS

직접 만들어서 쓴다는 것에 큰 문제점 중 하나가 CMS(Content Management System)

글이야 VS code에 markdown으로 쓰면 되지만, print screen한 이미지를 블로그 글에 붙여넣기를 할 때  
ctrl-c, ctrl-v를 지원해주지 않는다면 엄청나게 불편하다.  
Next.js에 붙일 수 있는 가장 유명한 CMS는 Sanity, Contentful, Strapi 정도인데 Sanity를 가장 많이 쓰는 것 같기도 하다.

CMS란 단순 web editor라기 보다 백엔드까지 고려된 확장된 개념이지만, 그건 잘 모르겠고,  
그냥 Obsidian으로 내가 편집한 거 바로 블로그에 자동으로 올려지는 거 뭐 없을까?하는 생각이 든다.

### 검색의 방향

**내 기준**에서 **블로그**란 여기 사이트처럼 왼쪽에 Sidebar에 메뉴가 sub-folder처럼 계속 nested되는 구조의 블로그를 원했지만, 검색어에 계속 'blog'만 검색하면 sidebar menu가 없는 사이트만 나온다.  
그 이유는 외국에서는 'blog'이라고 하면 대부분 side bar 메뉴가 없고, 태그로만 글 카테고리를 구분하고, 글 목록은 바둑판처럼 나열되있는 모양을 'blog'라고 칭하는 것 같다.  
지금 이 페이지처럼 side bar에 sub-folder 같은 메뉴가 있는 블로그는 blog가 아닌 **Documentation** 이라고 부른다.  
(외국인들의 정서인가 sidebar가 없으면 불편한 내가 문제인가)

Documentation 형식의 블로그로는 GitBook 정도가 있는 것 같은데, SaaS 인데다가 오픈소스도 아니고 느리고, 게다가 완전 무료도 아니다. (누가 쓰냐)
그래서 사이드바가 있는 GitBook과 같은 형태를 localhost에서 실행할 수 있는 오픈소스 SSG를 검색해보았다.

## 후보

### 1. docusaurus.io

React를 개발한 Meta에서  
React로 개발한 오픈소스  
https://docusaurus.io/  
Meta에서 만들었으니 믿을 수 있고, 꾸준히 업데이트 되는 것 같다.  
기본으로 제공하는 UI가 살짝 마음에 안 들었지만 Nextra보다 업데이트가 최신이라 이것으로 선택  
최신 버전이 3.4.0인데 올해(2024년) 5월에 업데이트 된 듯.  
라인의 블록체인 부서에서 사용 → https://docs-blockchain.line.biz/overview/

### 2. VuePress

https://v2.vuepress.vuejs.org/guide/getting-started.html  
꾸준히 개발 중인듯하고 UI도 깔끔하다.  
그러나 Vue기반은 그냥 싫다.  
라인에서는 이거 쓰나보다. https://developers.line.biz/en/

### 3. MkDocs

https://www.mkdocs.org/  
Python으로 만들어졌다. Python은 일단 나느 패스

### 4. Nextra

https://nextra.site/docs/docs-theme/start  
Vercel에서 만든 Next.js 기반이라 믿을 수 있는데  
문제는 Next.js 14.2 page router 방식에서 개발을 멈추었다.  
App Router가 나온 지 1년이 넘었는데 App Router방식이 아직도 출시 안 된 걸로 봐서  
개발할 생각이 없는 것 같다.  
그런데 그래도 기본 UI가 깔쌈해서 이걸로 설치해보았다. → 그러나 다시 Docusaurus로 변경

## 배포

내가 DevOps니깐 회사의 Kubernetes cluster에 그냥 배포할 수도 있겠지만  
그래도 개인 블로그니깐 개인적으로 외부에 배포하고 싶다.  
Next.js니깐 당연히 Vercel이 1번픽이긴 한데

1. **Vercel**과 **Netlify**는 한 달에 5시간의 빌드타임까지만 무료다 - 개인블로그로는 충분한 시간이지만 그래도 조금 불안
2. **GitHub Pages**는 1시간 당 10분의 build time이 무료다 - 그러니깐 매시간마다 배포할 수 있다. (Repo는 1Gb 용량 제한이 있다. 소규모로는 충분)

그래서 GitHub Pages에 배포하는 것으로 정했는데, 아뿔사, 정하고 보니 여기는 Ruby 기반이라서 먼가 좀 더 세팅을 더 해줘야한다. 그래도 한 번 정했으니 밀어붙이자.

## 결론

너무 중구난방 썼는데 요약하자면 다음과 같다.

1. 개인 블로그를 생성하고 싶다.
2. 블로그의 Editor로는 web editor가 아닌 로컬(내 노트북)에서 Obsidian으로 글을 쓰고 싶다.
3. 내가 쓰는 글이 전부 (첨부파일까지) 로컬에 저장되어야 한다.
4. 무료여야 한다.

Notion으로 쓰고 Notion을 공개모드로 하면 되지 않는가? → 3번 조건을 충족하지 못한다.  
Tistory 블로그는? → 2번 조건을 충족하지 못한다.  
Obsidian Publish를 사용하면 되지 않는가? → 한 달에 $10다. 비싸다. 4번 조건 불충족  
Obisidian을 블로그로 바꿔주는 오픈소스인 Quartz 혹은 Digital Garden을 이용하면 되지 않은가? → 개인이 제작한 거라서 공식문서가 아주 부실하다.

위와 같은 욕구에서 출발해서 생각해낸 해법은 그렇다면  
개인 블로그를, 프레임워크는 상관없지만 이왕이면 조금 더 친숙한 React 혹은 Next.js로 만들까 생각만 하다가  
우선 오픈소스를 찾게된 것이다.  
현재 그래서 Nextra와 Docusaurus를 둘 다 GitHub Pages에 배포는 성공했는데.... 뭔가 심각하게 현타가 온다.  
그래서 내가 왜 이 고생을 하고 있지?  
이런 거 삽질할 시간에 그냥 티스토리를 계속 쓸 걸 그랬나...
