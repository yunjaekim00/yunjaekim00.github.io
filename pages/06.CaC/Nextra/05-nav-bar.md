---
title: Nav bar customization
date: 2024-09-25
---

# Nav bar customization

default로 세팅된 Nav bar에 메뉴들이 font size가 좀 작아보여서  
font size도 키우고, 우측 검색 component와 간격을 조금 수정하였다.  
  
앞에서 설정이 된 `globals.css`에 Nav bar에 해당하는  
class 이름에 대해 다음과 같이 스타일을 override 시켰다.  

```CSS
nav.nx-flex.nx-items-center .nx-block {
  margin-left: 1.75rem;
}
nav.nx-flex.nx-items-center a.nx-text-sm {
  margin: 0 1rem 0 1rem;
  padding: 0.4rem 0 0 0;
  font-size: 1.125rem;
}
```

수정 전 :  
![](<./_images/Pasted image 20240925162331.png>)
  
수정 후 :  
![](<./_images/Pasted image 20240925162441.png>)

이런... Nextra 2.14.3에서 3.0.6으로 업데이트하였더니 
Nav bar 클래스명이 전부 바뀌어서 먹히지가 않는다.
그래서 업그레이드 후 위 코드를 다음으로 바꾸었다.

```css
.nextra-nav-container img {
  position: absolute;
  top: -0.5rem;
}
.nextra-nav-container .nextra-focus {
  padding: 0 0.5rem 0 0.5rem;
  font-size: 1.125rem;
}
```