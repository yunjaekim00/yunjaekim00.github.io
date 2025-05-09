---
title: Nginx buffer 이슈
date: 2025-05-09
---
# Nginx buffer 이슈
### 현상
api-bo에서 socket 통신을 SSE 통신으로 변경하면서
브라우저엥서 bo를 접속하면 개발자 도구에서 다음 에러 메세지가 뜸

```
net::ERR_INCOMPLETE_CHUNKED_ENCODING 200 (OK)
```

### 문제점
위 에러는 거의 대부분 reverse-proxy인 Nginx가 닫혔거나, chunk된 upstream response를 브라우저가 다 read 하기 전에 종료된 경우이다.
Nginx는 디폴트로 응답을 통채로 buffering한다. Buffer를 disable 시키지 않으면 브라우저 간 connection이 끊어지면 incomplete stream이 전달된다.

### 해결 방법
Local에서는 문제없지만 Dev 서버에서 생기는 문제로 Nginx 문제였다. 그래서 Nginx의 api-bo를 수정하였다.

```conf
location / {
   ...
	 proxy_buffering             off;
	 chunked_transfer_encoding   off;
	 ...
```

Nginx의 api-bo-dev conf 파일에 위 두 줄을 추가하였다.

- **proxy_buffering off** : proxy_cache off → Nginx 통신이 app에서 client에 도착하자마자 data를 flush 하도록 설정
    
- **chunked_transfer_encoding off** : partial chunk 에러가 나지 않도록 Nginx에게 upstream chunk를 re-chunk하거나 buffer 하지 않도록 한다