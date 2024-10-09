---
title: 09-font-color
date: 2024-10-08
---
## Font color 변경
마크다운에서 `**` 별표 두 개로 묶으면 강조 표시가 되는데
default로 font-weight만 강조가 되서 생각보다 돋보이지가 않는다.
그래서 색도 바꾸고 싶다.

별표 두 개면 `<b>` 태그가 붙을 줄 알았는데, `<strong>` 태그가 붙는다.
이에 `globals.css`를 수정하였는데 
이왕이면 light mode와 dark mode에서 색을 각기 다르게 가져가고 싶었다.

그래서 다음 코드를 추가

```css
:root {
  --font-strong-color: darkslateblue;
}
.dark {
  --font-strong-color: skyblue;
}
.nextra-content strong {
  color: var(--font-strong-color);
}
```

변수를 선언하면서 light mode 값으로 주고,
dark mode에서 사용할 색을 지정해주고
strong 태그에서 적용될 이 변수를 지정해준다.



