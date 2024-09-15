---
title: Content as Code
date: "2024-08-05"
---

# Nextra로 만든 블로그 Github Pages에 배포하기

## 1. 어떤 플랫폼을 블로그로 사용할까

Medium, WordPress, 네이버, Wix, Notion 여러가지를 고려하다가
티스토리를 쓴 지 1년 정도 되었다.

티스토리의 단점은

1. Folder의 sub-folder를 2단 이상으로 생성 기능이 지원이 되지 않는다.
2. TOC(Table of Contents) plugin을 import해서 적용할 수는 있지만 반응형으로 구현하기에는 쌩 HTML과 raw CSS 파일을 수정해야하는데 아주 어렵다. → 그냥 티스토리에서 더 이상 개발을 하지 않는 것 같다. → 그래서 커뮤니티도 거의 없음

그리고 모든 블로그 플랫폼의 한계점 - 포스팅한 글이나 임시 저장한 글이 내 **로컬**에 저장되지 않는다.

기본적으로 나는 로컬에 내 글이 저장이 되어야 진짜 내 것인 느낌이 들고  
로컬에 글을 저장하는 장점은  
특정 플랫폼이 마음에 들지 않을 때 쉽고 유연하게 옮겨탈 수 있는 장점이 있다.  
(내 네이버 블로그에 일괄 html export이 없으니 옮기고 싶어도 못 옮기는 상황)

## 2. CaC (Content as Code)
글을 로컬에 저장하면 여러가지 이점들이 있다.  
### Decoupling content from backend
다시 위의 내용을 정리해서 말하자면 기존 방식들은 Cloud 내에 있는 GUI-based CMS로 글을 쓰는 방식이다.  
WordPress, Tistory, Medium, Naver blog 전부 그런 방식이다.  
이 들의 장점은 software engineer가 아닌 사람도 쉽게 글과 이미지를 올릴 수 있는 장점이 있다.
그러나 HTML, CSS, Javascript와 같은 언어는 이미 30년을 살아남았지만  
대부분 클라우드 플랫폼이 수년을 지속하지도 않고 싫증이 나기도 한다.  

이 걸 좀 더 멋드러지게 쓰자면  
CaC의 장점은 내 글이 text 형태로 local 저장되므로 네이버, 티스토리처럼 특정 플랫폼에 국한된  
양식에 구애받지 않고 플랫폼으로부터 decoupling 된다.  

그래서 CaC (Content as Code)로 블로그를 작성하려고 한다.  
CaC의 Content는 blog, article, documentation을 총괄하는 단어다. 

### Version Control
너무 복잡하게 얘기했는데 다시 요약하자면  
그냥 단순하게 블로그의 ‘글’도 프로그래밍 언어처럼  
Markdown (`.md` 혹은 `.mdx`)로 코드로 글을 작성해서 git push해서 배포하는 방식을 택하는 것이다.  
Jekyll, Hugo, 그리고 지금 내가 사용하는 Next.js 기반의 Nextra도 이에 해당된다.  

예전에 외국에서 공동저자가 여러 명인 어떤 소설을 git을 이용해 쓰는 팀가 있다고 들은 적이 있다.  
물론 블로그는 나 혼자 쓰지만 version control은 내가 삭제한 글을 되살리고 싶을 때 유용하다.  

### SSG (Static Site Generators)
내가 로딩 속도는 뭐 크게 중요한 factor는 아니지만  
네이버, 티스토리, 워드프레스가 대부분 dynamic site generation방식을 이용하는 것 같은 데  
SSG는 서버에 배포할 때 이미 빌드된 상태로 배포되므로 속도가 무지하게 빠르다.


## 3. Open source SSG

### Framework 고민
3년전쯤에 Jekyll과 Hugo로 개인블로그를 잠깐 만들어보았다.  
CMS없이 만들어서 VS code로 글을 작성하자니, 이미지를 첨부하기가 너무 너무 불편했다.  
언어가 각각 내가 잘 모르는 Ruby와 Go로 되어있어서 배포에만 겨우 성공 했다뿐 커스터마이징이 어려웠다.  

가장 좋은 것은 내 입맛에 맞게 내가 Next.js 15로 내 개인블로그를 scratch에서부터 짜서 만드는 것이겠지만,  
어마어마한 도금질과 노가다가 필요하다.  
(예를들면 반응형으로 모바일 환경에서는 TOC를 햄버거 메뉴로 바뀌게 하는 기능 등)

### CMS
만약에 Next.js를 이용해 블로그를 from scratch에 만든다해도 CMS를 골라야 할 것이다.  
Next.js에 붙일 수 있는 가장 유명한 CMS는 Sanity, Contentful, Strapi 정도인데 Sanity를 가장 많이 쓰는 것 같기도 하다.  
그러나 단순 개인블로그에 Sanity를 도입하는 것은 확실히 오버 엔지니어링같다.  

**그러나 이제는 내가 평소에 잘 활용하고 있는 Obsidian이 있다!** → 모든 글이 로컬에 저장된다.  
이것이 **게임 체인저**가 되었다.  
게다가 요즘 Next.js는 SSG기능을 지원한다는 것을 적극 홍보하고 있다.  
이제는 CaC로 다시 블로그를 시도해 볼 수 있다.  

Obsidian으로 내가 편집한 글을 바로 git push하면 블로그에 자동으로 올려지는 거 뭐 없을까?하는 생각이 든다.  
게다가 처음부터 짜지 않도록 Next.js 기반의 라이브러리는 없을까 검색을 시작하였다.  

### 검색의 방향

**내 기준**에서 **블로그**란 여기 사이트처럼 왼쪽에 Sidebar에 메뉴가 sub-folder처럼 계속 nested되는 구조의 블로그를 원했지만, 검색어에 계속 'blog'만 검색하면 sidebar menu가 없는 사이트만 나온다.  
그 이유는 외국에서는 **'blog'**라고 하면 대부분 side bar 메뉴가 없고, 태그로만 글 카테고리를 구분하고, 글 목록은 바둑판처럼 나열되있는 모양을 'blog'라고 칭하는 것 같다.  
지금 이 페이지처럼 side bar에 sub-folder 같은 메뉴가 있는 블로그는 blog가 아닌 **Documentation** 이라고 부른다.  
(외국인들의 정서인가 sidebar가 없으면 불편한 내가 문제인가)

Documentation 형식의 블로그로는 GitBook 정도가 있는 것 같은데,  
SaaS 인데다가 오픈소스도 아니고 느리고, 게다가 완전 무료도 아니다. (누가 쓰냐)  
그래서 사이드바가 있는 GitBook과 같은 형태를 localhost에서 실행할 수 있는 오픈소스 SSG를 검색해보았다.  
 
별 내용 아닌 데도 두서없이 쓰다보니 글이 쓸데없이 길어지는 느낌이다. 아무튼 검색한 후보들.

## 4. 후보

### Docusaurus

React를 개발한 Meta에서  
React로 개발한 오픈소스  
https://docusaurus.io/  
Meta에서 만들었으니 믿을 수 있고, 꾸준히 업데이트 되는 것 같다.  
기본으로 제공하는 UI가 살짝 마음에 안 들었지만 Nextra보다 업데이트가 최신이라 이것으로 선택  
최신 버전이 3.5.2인데 이번 달(2024년 9월)에 업데이트 된 듯.  
라인(LINE)의 블록체인 부서에서도 사용 → https://docs-blockchain.line.biz/overview/  
그냥 이것으로 정착할까하고 이것저것 설치해봤는데  
영… UI 디자인이 마음에 안 든다.  

### VuePress

https://v2.vuepress.vuejs.org/guide/getting-started.html  
꾸준히 개발 중인듯하고 UI도 깔끔하다.  
그러나 Vue기반은 그냥 싫다.  
라인에서는 이거 쓰나보다. https://developers.line.biz/en/

### MkDocs

https://www.mkdocs.org/  
Python으로 만들어졌다.  
설치가 굉장히 쉽고, 다른 프레임워크처럼 지저분한 파일들이 생겨나지 않는다.  
커뮤니티 플러그인을 통해 마크다운의 callout UI도 구현할 수 있지만  
아직 Python은 내가 익숙하지가 않아서 패스…  

### Nextra

https://nextra.site/docs/docs-theme/start  
Vercel에서 만든 Next.js 기반이라 믿을 수 있는데  
문제는 Next.js 14.2 page router 방식에서 개발을 멈추었다.  
App Router가 나온 지 1년이 넘었는데 App Router방식이 아직도 출시 안 되었다.  
오픈소스라서 Github에 가봤더니 여전히 App Router방식으로 개발하고 있는 흔적은 보인다.  
그러나 App Router는 folder-based routing방식이고, Page Router는 파일 이름 based routing 방식이라  
아무래도 파일 이름으로 가지고 글을 쓰는 방식이 더 구현하기 쉬워서가 아닐까?  
(풀스택 프레임워크으로 변신하고 욕먹는 Next.js는 Vercel 자체 내에서도 헤매는 것일까)  
그런데 그래도 기본 UI가 깔쌈해서 이걸로 설치해보았다.  
이것으로 당분간 정착할 것 같다.  

## 5. 배포

내가 DevOps니깐 회사의 Kubernetes cluster에 그냥 배포할 수도 있겠지만  
그래도 개인 블로그니깐 개인적으로 외부에 배포하고 싶다.  
Next.js니깐 당연히 Vercel이 1번픽이긴 한데

1. **Vercel**과 **Netlify**는 한 달에 5시간의 빌드타임까지만 무료다 - 개인블로그로는 충분한 시간이지만 그래도 조금 불안
2. **GitHub Pages**는 1시간 당 10분의 build time이 무료다 - 그러니깐 매시간마다 배포할 수 있다. (Repo는 1Gb 용량 제한이 있다. 소규모로는 충분)

그래서 GitHub Pages에 배포하는 것으로 정했는데, 아뿔사, 정하고 보니 여기는 Ruby 기반이라서 먼가 좀 더 세팅을 더 해줘야한다. 그래도 한 번 정했으니 밀어붙이자.

## 6. 결론

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
현재 그래서 Nextra와 Docusaurus를 둘 다 써보고 UI가 Nextra가 더 마음에 들어 쓰게 되었다.  
