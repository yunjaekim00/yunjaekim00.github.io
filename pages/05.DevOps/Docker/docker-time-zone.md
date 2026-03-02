---
title: Docker container의 time zone
date: 2025-01-18
---
### Docker Compose file
#### 증상
- docker container로 cronicle을 띄웠는데 브라우저에서 보니 UTC time zone으로 되어있었다.
- Azure VM instance에 ssh 접속하여 조회해보았다.

```sh
> timedatectl
               Local time: Fri 2025-01-17 11:11:23 KST
           Universal time: Fri 2025-01-17 02:11:23 UTC
                 RTC time: Fri 2025-01-17 02:11:23
                Time zone: Asia/Seoul (KST, +0900)
System clock synchronized: yes
              NTP service: active
          RTC in local TZ: no
```

Seoul로 되어있다고 나온다. → 즉, Ubuntu가 설치된 VM, 그러니깐 docker의 host OS는 time zone이 서울로 되어있다.
그러나 docker container 안에서는
```sh
> docker exec -it cronicle /bin/sh
> date
Fri Jan 17 02:18:08 UTC 2025
```

여전히 UTC로 나온다.

#### 해결방법
`docker-compose.yaml`에 다음 코드 추가
```yaml
    volumes:
      - /etc/localtime:/etc/localtime:ro
      - /usr/share/zoneinfo:/usr/share/zoneinfo:ro
    environment:
      - TZ=Asia/Seoul
```

container로 들어가서
```sh
> docker exec -it cronicle /bin/sh
> date
Fri Jan 17 23:05:44 KST 2025
```
하면 적용이 된다.

#### 설명
`- /etc/localtime:/etc/localtime:ro`
host OS인 Ubuntu의 `/etc/localtime`이 있다. 여기에 Read Only권한으로 읽어온다.

`- /usr/share/zoneinfo:/usr/share/zoneinfo:ro`
host OS인 Ubuntu의 `/usr/share/zoneinfo`에는 세계 각 지역의 time zone이 들어있다. 만약 docker container내의 app이 다른 time zone의 library를 이용한다면 이 코드를 넣어야하지만 

