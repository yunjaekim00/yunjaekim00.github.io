---
title: 08. Metal LB와 Istio 설치
date: 2025-06-11
---
# 08. Metal LB와 Istio 설치
## Metal LB
Master Node에 `kubectl`을 설치했으니 Master node에서 다음을 이제 설치할 수 있다.

공식문서: https://metallb.io/installation/

```sh
kubectl edit configmap -n kube-system kube-proxy
```

```yaml hl:20,5
    ipvs:
      excludeCIDRs: null
      minSyncPeriod: 0s
      scheduler: ""
      strictARP: false
      syncPeriod: 0s
      tcpFinTimeout: 0s
      tcpTimeout: 0s
      udpTimeout: 0s
    kind: KubeProxyConfiguration
    logging:
      flushFrequency: 0
      options:
        json:
          infoBufferSize: "0"
        text:
          infoBufferSize: "0"
      verbosity: 0
    metricsBindAddress: ""
    mode: ""
```

위 line 5 수정, line 20을 수정
```yaml
	ipvs:
		strictARP: true
	...
	mode: "ipvs"
```

Install by manifest
```sh
kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.14.9/config/manifests/metallb-native.yaml
```

→ `metallb-system` namespace에 리소스 생성됨

파일 생성 `metallb-config.yaml`

```yaml
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: default-pool
  namespace: metallb-system
spec:
  addresses:
  - 10.10.10.220-10.10.10.250
---
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: l2-default
  namespace: metallb-system
spec:
  ipAddressPools:
  - default-pool
```

```sh
k apply -f metallb-config.yaml
```

## Istio
### Istioctl로 설치
역시나 `kubectl`을 설치한 Master node에서 설치.
1.24.1 버전부터는 `istioctl operator init`이 없어짐
최신 버전 1.26.1은 K8s 1.32까지 테스트 되었지만 최신이니 설치.
참고: https://istio.io/latest/docs/setup/install/istioctl/
```sh
# 처음 설치시 순서대로 실행
curl -L https://istio.io/downloadIstio | sh -
export PATH="$PATH:/svc/01.istio/istio-1.26.1/bin"
cd istio-1.26.1/bin
./istioctl install
```

Load Balancer IP 확인
```sh hl:1
k get svc -n istio-system
NAME                           TYPE           CLUSTER-IP       EXTERNAL-IP    PORT(S)                                      AGE
service/istio-ingressgateway   LoadBalancer   10.109.43.29     10.10.10.220   15021:32134/TCP,80:30347/TCP,443:30377/TCP   72s
service/istiod                 ClusterIP      10.101.164.164   <none>         15010/TCP,15012/TCP,443/TCP,15014/TCP        94s
```

Istio injection
```sh
k create namespace x2bee-stg
k label namespace x2bee-stg istio-injection=enabled
```

Gateway 생성
`istio-gateway.yaml` 생성
```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: istio-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 80
      name: http-wildcard
      protocol: HTTP
    hosts:
    - "*.x2bee.com"
```

```sh
k apply -f istio-gateway.yaml
```

### istio hpa 수정
Istio hpa 수정
```sh
kubectl edit hpa istio-ingressgateway -n istio-system
```

```yaml hl:2,10
spec:
  maxReplicas: 15
  metrics:
  - resource:
name: cpu
target:
averageUtilization: 80
type: Utilization
    type: Resource
  minReplicas: 5
```

default 
min : 1
max : 5
를 다음과 같이 수정
min : 5
max : 15
성능테스트 경험상 위와 같이 수정하면 TPS 1200에서 9개까지 늘어남 → 에러율 줄어듦

확인
```sh
kubectl get hpa -n istio-system
kubectl get deploy istio-ingressgateway -n istio-system
```

### (선택) 테스트 배포 해보기
빠르게 hello-world로 테스트
`hello-world.yaml`
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: echo
  namespace: x2bee-stg
spec:
  replicas: 1
  selector:
    matchLabels:
      app: echo
  template:
    metadata:
      labels:
        app: echo
    spec:
      containers:
      - name: echo
        image: hashicorp/http-echo:0.2.3
        args:
        - "-text=🎉 Hello from my custom web page! 🎉"
        - "-listen=:5678"
        ports:
        - containerPort: 5678
---
apiVersion: v1
kind: Service
metadata:
  name: echo
  namespace: x2bee-stg
spec:
  type: ClusterIP
  selector:
    app: echo
  ports:
  - port: 80
    targetPort: 5678
```

```sh
k apply -f hello-world.yaml
```

`hello-world-vs.yaml`생성
```yaml
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: echo
  namespace: x2bee-stg
spec:
  hosts:
  - hello-idc.x2bee.com
  gateways:
  - istio-system/istio-gateway
  http:
  - route:
    - destination:
        host: echo.x2bee-stg.svc.cluster.local
        port:
          number: 80
```

### Traffic 정의
debugging
우선 **master node**에서 포트 확인
```sh
k get svc -n istio-system
NAME                   TYPE           CLUSTER-IP       EXTERNAL-IP    PORT(S)                                      AGE
istio-ingressgateway   LoadBalancer   10.109.43.29     10.10.10.220   15021:32134/TCP,80:30347/TCP,443:30377/TCP   10m
```

80포트에서 30347포트로 간다.

on IVE host OS → **host OS**에서 설정

```sh
iptables -t nat -A PREROUTING -p tcp --dport 30347   -j DNAT --to-destination 10.10.10.11:30347
iptables -A FORWARD -p tcp -d 10.10.10.11 --dport 30347 -j ACCEPT
```

traffic 재정의 : `hello-idc.x2bee.com` → `IVE host OS (217.37.14.73)` → `VM (10.10.10.11:30347)` → `Istio Gateway` → `Your application`

Nginx `hello-idc.conf` 파일
```conf
server {
  listen 80;
  server_name hello-idc.x2bee.com;
  return 301 https://$host$request_uri;
}

server {
  listen 443 ssl;
  server_name hello-idc.x2bee.com;
  location / {
    proxy_buffer_size 128k;
    proxy_buffers  4 256k;
    proxy_busy_buffers_size 256k;
    proxy_redirect off;
    proxy_http_version 1.1;
    proxy_pass_header Server;
    proxy_set_header Host $http_host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Scheme $scheme;
    proxy_pass http://10.10.10.11:30148;
  }
}
```