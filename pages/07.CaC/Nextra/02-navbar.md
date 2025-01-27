---
title: Nav bar
date: "2024-09-16"
---

# Nav bar 구성
### `_meta.json` 수정
현재 내 폴더 구조는 아래와 같다.  
![](<./_images/20240916020133.png>)

그러나 나중에 글 이 많아질 경우 하나의 사이드바에 너무 많은 폴더가 생기면 정신없으니
큰 분류는 nav bar에서 나눠주는 게 좋을 듯한데 Nextra에 이 기능이 있다.
단순히 pages 폴더에 있는 `_meta.json`을 다음과 같이 정리해주면 된다.

```json
{
  "*": {
    "type": "page"
  },
  "index": "Welcome",
  "06.IT-etc": "IT 잡다",
  "07.Book-review": "Books"
}
```

그러나 혹시 나중에 각 폴더별로 테사(theme)을 따로 가져가는 것을 대비해서  
json 파일 코드는 조금 더 길어지겠지만 각각 다음과 같이 분리해 주었다.

```json
{
  "index": {
    "title": "Welcome",
    "type": "page",
    "theme": {
      "sidebar": false,
      "layout": "full"
    }
  },
  "06.IT-etc": {
    "title": "IT 잡다",
    "type": "page"
  },
  "07.Book-review": {
    "title": "Books",
    "type": "page"
  }
}
```

위 코드와 동일하지만 Welcome 페이지에만 사이드바를 없앨 수 있다.  
`"layout": "full"`은 전체 width를 사용한다는 뜻.  

