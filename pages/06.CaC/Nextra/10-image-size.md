---
title: 10-image-size
date: 2024-10-10
---
## Image resize
이 블로그를 만들고나서부터 딜레마.
Obsidian으로 편집하면서 Obsidian에 보이는대로 브라우저에 랜더링 되는 것.
이것이 참 어렵다.
`<img>` 태그부터 막히기 시작한다.
분명 마크다운은 HTML 코드가 먹히는 구조인데 이미지 태그가 잘 동작을 안 한다.
그렇다고 모든 파일을 `.mdx`로 바꾸고 `next/image`의 `<Image>` 태그를 쓰기는 번거롭다.
사실 이미지 태그가 문제라기 보다 `<img src="`에서 상대경로가 먹히질 않는다.
아무리 구글링과 챗GPT에게 물어봐도 원인을 알 수가 없다.

그러나 마크다운 방식의 image를 embedding하는 syntax는

```md
![alt text](image path)
```

우선은 이 방식으로 이미지를 넣고 이미지를 resizing하고 싶은데
크기 넣는 부분이 없다.

검색해도 안 나오지만 꼼수를 생각해냈다.
alt text값을 CSS에서 가져와서 크기를 조절하는 방식이다.

간단하게 `globals.css`에 다음 코드만 추가했다.
하드코딩으로 좀 무식한 방법이지만 가장 간단한 방법이기도 하다.

```css
img[alt*="center"],
img[alt*="centre"] {
  display: block;
  margin-left: auto;
  margin-right: auto;
}
img[alt*="200"] {
  width: 200px;
}
img[alt*="250"] {
  width: 250px;
}
img[alt*="300"] {
  width: 300px;
}
img[alt*="350"] {
  width: 300px;
}
img[alt*="400"] {
  width: 400px;
}
img[alt*="450"] {
  width: 450px;
}
```

