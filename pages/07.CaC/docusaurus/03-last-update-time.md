---
title: "last update time"
date: "2024-08-05"
---

# last update time 넣기
여기 글 맨 아래 오른쪽으로 보면  
 
![](<./_images/Pasted image 20240806225329.png>)  

위와 같이 나온다. 이를 위해 해줘야할 configuration은 다음과 같다.  
공식 문서 : https://docusaurus.io/docs/api/plugins/@docusaurus/plugin-content-docs#showLastUpdateTime  

| Name                 | Type    | Default | Description                                                                                                                                                                                                                                        |
| -------------------- | ------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `showLastUpdateTime` | boolean | false   | Whether to display the last date the doc was updated. This requires access to git history during the build, so will not work correctly with shallow clones (a common default for CI systems). With GitHub `actions/checkout`, use`fetch-depth: 0`. |
  
우선 `docusaurus.config.js` 파일에 다음을 추가  
  
```js title="docusaurus.config.js" {6}
const config = {
...
  presets: [
    [
      docs: {
        showLastUpdateTime: true,
```
  
그리고 Github Actions에 사용하는 yaml 파일에 다음을 추가  
  
```yml title=".github/workflows/publish.yml" {4,5}
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
```

local에서 실행할 때는 `pnpm start`로 실시간 보기할 때는 나오지 않고 `pnpm build` → `pnpm serve`해야지 최종 수정 날짜가 표시된다.  
  
마지막으로 모든 markdown 글마다 front matter를 다음과 같이 넣어주면 default(오늘 날짜)가 overriding된다.  
(생략해도 자동으로 오늘 날짜에 업데이트 된 것으로 나온다.)  
  
```md
---
last_update:
  date: 2024-08-06
---
```