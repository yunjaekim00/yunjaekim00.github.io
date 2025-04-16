---
title: Istio에서 IP whitelist 적용
date: 2025-01-19
---
# Istio에서 IP whitelist 적용하기
## 문제의 발단
![center](<Istio/_images/2025-01-19_.excalidraw.svg>)
### 목적
- 특정 IP 주소를 제외한 모든 IP 주소의 접속을 차단한다.
- 다른 모든 IP에서 접속시 공지사항 html을 웹페이지를 띄운다. (이하 customized error page라고 하겠다.)
### 처리 방법
#### 위 그림 1번 방법
- WAF와 연동된 Application Gateway단에서 IP를 차단해주고 error page로 redirection 시켜준다.
- 당연하고 가장 쉬운 방법이다.
- 장점은 cluster나 다른 서비스에 들어오기 전에 차단을 시켜주니, Azure AKS로 들어오는 로드를 줄여주고, X-forwarded-for 적용 필요없이 바로 중앙에서 처리해줄 수 있다. 또한 Edge level에서 적용하면 속도도 빠르다.
#### 문제의 발단
- TA(Infra/Network) 담당자들이 **1번 방법**을 못하겠다고 선언했다. 해당 회사도 팀장도 두 손 들었다고 한다. 여태까지도 Infra관련 어떤 것을 부탁하면 외주업체에게 부탁하느라 간단한 요청도 시간이 걸렸다. 그래서 무작정 우리보고 해달라고 하는데, 정작 중요한 것은 우리에게 Azure Portal에 접속권한이 없다는 것이다. 이건 뭐 자유로운 기병이 손발이 묶인 보병에게 적을 물리치라는 격이다. 그보다도 애시당초 이건 AKS를 설치하는 DevOps의 분야가 아니다.
#### 해결 방법
- root domain인 `i-screammall.co.kr`과 `www.i-screammall.co.kr`를 Nginx가 설치된 VM instance의 IP 주소로는 변경해줄 수 있다고 한다.
- 그래서 위 **2번 방법**으로 Nginx의 기본 기능 중에 domain별로 IP whitelist를 적용하고, 만족하지 않을시 error page를 customize할 수 있는 기능이 있다.
- 그러나 이번에도 금요일 밤12시에 위 도메인을 보내달라고 했는데, 밤12시47분에나 완료가 되었다. 나중에 오픈하는 시점에는 트래픽을 다시 Azure AKS의 Load Balancer로 바꿔야하는데 TA쪽에서 이것도 지연이 될 것 같았다.
- Istio내에 Layer 7 routing 기능이 들어있기 때문에 TA쪽에는 위의 **3번 방법**으로 아예 Azure AKS로 쏘아주고 내가 Istio로 IP 차단을 설정하기로 하였다.
#### 3번 방법시 가장 큰 난이도
- Nginx는 **x-forwarded-for** 기능이 들어가있는데, Istio에는 기본적으로 이전 단계의 IP만 바라본다. 즉, Istio에서는 우리가 설정해놓은 `istio-system` namespace의 Load Balancer의 IP주소만 일괄적으로 들어온다.
## 처리과정

### 1. Patch the Service to use `externalTrafficPolicy: Local`
- `externalTrafficPolicy`는 Ingress Gateway가 client source IP를 어떻게 핸들링할 것인지를 결정한다.
- default는 `Cluster`로 되어있는데 → `Local`로 바꾼다.
- `Local`로 바꾸면 `x-forwarded-for`가 보존이 되면서 실제 client IP가 적용된다.

```sh
kubectl patch service istio-ingressgateway \
  -n istio-system \
  --type merge \
  -p '{"spec":{"externalTrafficPolicy":"Local"}}'
```

적용 확인
```sh
k describe svc istio-ingressgateway -n istio-system
```

### 2. Create Telemtery Resource for the Ingress Gateway
Ingress gateway의 log를 보기 위해 다음 파일을 적용한다.
```sh
echo 'apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: ingressgateway-logging
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  accessLogging:
    - providers:
        - name: file' > istio-logging.yaml
```

apply
```sh
k apply -f istio-logging.yaml
```

### 3. Istio 재설치
`meshConfig.accessLogFile`로 Istioctl 재설치하여 logging이 제대로 나오게 한다.
```sh
./istio-1.24.1/bind/istioctl install -y \
  --set profile=default \
  --set meshConfig.accessLogFile=/dev/stdout
```

### 4. HPA 조정
원래 Istio 처음 설치할 때 높은 TPS (traffic spikes)에 대응하기 위해 hpa를 늘려주었는데 위에 재설치를 하면서 다시 초기화 되었다. → 다시 늘려준다.

hpa 조정
```sh
kubectl edit hpa istio-ingressgateway -n istio-system
```
min:4 , max:12

### 5.  log 조회
아래 명령어로 ingress의 log를 볼 수 있다.
```sh
k get pod -n istio-system
k logs -f istio-ingressgateway-5545758668-2r6hg -n istio-system -c istio-proxy
```

### 6. Create Error page
- 아래 yaml 파일로 customizing된 공지사항 error-page를 만든다.
- 현업에서 보내준 html파일에 `charset="utf-8"`가 없어 한글이 깨져서 추가하였다.
- 현업에서 보내준 이미지 파일은 2Mb가 넘어서 CDN에 올려놓고 링크를 걸었다.
- 혹시나 트래픽이 몰릴까봐 pod가 아닌 Deployment와 HPA를 적용했지만 사실상 nginx pod는 그렇게 많은 scale out이 필요없다. (동시에 1만번 찔러보았으나 CPU가 미동이 별로 없다.)


```yaml ln:true
echo 'apiVersion: apps/v1
kind: Deployment
metadata:
  name: error-page
  namespace: istio-system
  labels:
    app: error-page
spec:
  replicas: 1
  selector:
    matchLabels:
      app: error-page
  template:
    metadata:
      labels:
        app: error-page
    spec:
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
              - matchExpressions:
                  - key: agentpool
                    operator: In
                    values:
                      - userpool
      containers:
      - name: nginx
        image: nginx:alpine
        volumeMounts:
        - name: errorhtml
          mountPath: /usr/share/nginx/html
        - name: nginxconfig
          mountPath: /etc/nginx/conf.d/default.conf
          subPath: nginx.conf
        ports:
        - containerPort: 80
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 256Mi
      volumes:
      - name: errorhtml
        configMap:
          name: error-page-cm
      - name: nginxconfig
        configMap:
          name: error-nginx-cm
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: error-page-cm
  namespace: istio-system
data:
  nginx.conf: |
    server {
        listen 80;
        server_name localhost;

        # Serve index.html for all paths
        location / {
            try_files $uri /index.html;
        }

        # Default error page
        location = /index.html {
            root /usr/share/nginx/html;
        }
    }
  index.html: |
    <!DOCTYPE html>
    <html lang="ko">
    <!--사이트접속제한안내페이지-->
      <head>
        <meta name="viewport" charset="utf-8" content="width=device-width, initial-scale=1">
      </head>
      
      <body>
        <style>
          @media (min-width:300px) and (max-width: 768px) {
              .desktop {
                display: none !important;
              }
              .mobile{
                display: block;
                visibility: visible !important;
              }
            }
      
            @media (769px <= width <= 2160px){
              .desktop{
                display: block;
              }
              .mobile {
                display: none !important;
              }
        </style>
      
        <div style="text-align:center; margin:auto;">
          <img src="https://cdn.i-screammall.co.kr/files/data/sigong/250108_RenewalNoticepc.png" alt="리뉴얼사이트접속제한안내페이지" style="max-width:90vw !important; height:auto; margin:auto;" class="desktop">
          <img src="https://cdn.i-screammall.co.kr/files/data/sigong/250108_RenewalNoticemo.png" alt="리뉴얼사이트접속제한안내페이지" style="max-width:100% !important; width:auto; margin:auto; visibility: hidden;" class="mobile">
        </div>
      </body>
    </html>
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: error-nginx-cm
  namespace: istio-system
data:
  nginx.conf: |
    server {
      listen 80;
      server_name localhost;

      location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri /index.html;
      }

      error_page 403 404 500 502 503 504 /index.html;
      location = /index.html {
        root /usr/share/nginx/html;
      }
    }
---
apiVersion: v1
kind: Service
metadata:
  name: error-page-service
  namespace: istio-system
spec:
  selector:
    app: error-page
  ports:
  - name: http
    port: 80
    targetPort: 80
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: error-page-hpa
  namespace: istio-system
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: error-page
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 50' > error-page.yaml
```

apply
```sh
kubectl apply -f error-page.yaml
```

확인
```sh
k get all -n istio-system
```

### 7. Envoy Filter
- Istio의 표준 VirtualService raw source IP를 지원하지 않는다. 
- 그러나 우리는 아래 EnvoyFilter를 통해 real client IP를 추출해내 `x-forwarded-for` header를 custom HTTP header에 추가해줄 수 있다. → 이 `x-forwarded-for` header는 그 다음에 `VirtualService`에서 라우팅 결정을 하는데 사용된다.

```sh
cat << EOF > envoyfilter-sourceip.yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: source-ip-filter
  namespace: istio-system
spec:
  workloadSelector:
    labels:
      istio: ingressgateway
  configPatches:
  - applyTo: HTTP_FILTER
    match:
      context: GATEWAY
      listener:
        filterChain:
          filter:
            name: "envoy.filters.network.http_connection_manager"
    patch:
      operation: INSERT_BEFORE
      value:
        name: set-real-source-header
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.http.lua.v3.Lua
          inlineCode: |
            function envoy_on_request(handle)
              -- Retrieve the connection's remote IP address (e.g., "219.240.45.245:12345")
              local remoteAddress = handle:connection():remoteAddress()
              -- Extract just the IP part from the string (remove port if present)
              local ipOnly = string.match(remoteAddress, "([^:]+)")
              -- Add it as a header
              handle:headers():add("x-forwarded-for", ipOnly)
            end
EOF
```

적용
```sh
kubectl apply -f envoyfilter-sourceip.yaml
```

### 8. VirtualService에 테스트
pipeline code의 template에 있는 `virtual-service.yaml`에 다음 코드를 추가하였다.
```yaml ln:15
http:
    {{ if and (or (eq .Values.application.name "x2bee-fo") (eq .Values.application.name "x2bee-hi-store")) (eq .Values.application.namespace "x2bee-prd") }}
    - match:
      - headers:
          x-forwarded-for:
            regex: "^(219\\.240\\.45\\.245|218\\.237\\.59\\.80|211\\.118\\.93\\.202|112\\.223\\.14\\.90|20\\.200\\.224\\.180|20\\.(([0-2][0-9])|(3[0-1]))\\.[0-9]{1,3}\\.[0-9]{1,3})$"
      route:
        - destination:
            host: {{ .Values.application.name }}-svc
            subset: v1
      timeout: 60s
      retries:
        attempts: 0
    - route:
      - destination:
          host: error-page-service.istio-system.svc.cluster.local
          port:
            number: 80
    {{ else }}
    - name: "{{ .Values.application.name }}-http"
      route:
        - destination:
            host: {{ .Values.application.name }}-svc
            subset: v1
      timeout: 60s
      retries:
        attempts: 0
    {{ end }}
```

- 중요한 것은 위 pipeline code는 순서대로 적용되니 다른 `- match`가 있다면 가장 하단에 위 코드가 위치해야된다.
- virutal service는 기본적으로 CIDR notation을 허용하지 않는다. 그러나 정규표현식을 통하면 `20\\.(([0-2][0-9])|(3[0-1]))\\.[0-9]{1,3}\\.[0-9]{1,3})`와 같이 CIDR notation을 대체할 수 있다.