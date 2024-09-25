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
![](./_images/Pasted%20image%2020240925162331.png)
  
수정 후 :  
![](./_images/Pasted%20image%2020240925162441.png)