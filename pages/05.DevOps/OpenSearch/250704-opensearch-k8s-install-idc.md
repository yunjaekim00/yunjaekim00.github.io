---
title: OpenSearch 3.0을 K8s pod로 설치하기
date: 2025-07-04
---
# OpenSearch 3.0을 on-prem K8s cluster에 설치하고 fluentd 연결
## 목표
- OpenSearch 3.0.0을 AWS PaaS 혹은 별도의 서버에 docker container로 실행하지 않고 Kubernetes pod로 배포한다.
- 테스트 목적으로 minimal resource를 이용하기 위해 Single node로 구성한다.
- 클라우드가 아닌 on-premise 서버 용으로 구성
- Pod가 재시작되도 데이터가 없어지지 않도록 Persistent Volume을 이용하여 배포한다.
- Dashbaord(kibana)는 nginx와 Istio Gateway, VirtualService로 액세스한다.
## Prerequisites

- Kubernetes cluster with Istio installed
- Available resources (at least 4GB RAM and 2 CPU cores available)

## Step 1: Create Namespace

```bash
kubectl create namespace opensearch
```

## Step 2: Create ConfigMap for OpenSearch Configuration

Create a file named `/svc/07.opensearch/01.cm.yaml`:
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: opensearch-config
  namespace: opensearch
data:
  opensearch.yml: |
    cluster.name: opensearch-cluster
    node.name: opensearch-node1
    network.host: 0.0.0.0
    discovery.type: single-node
    plugins.security.disabled: true
    bootstrap.memory_lock: false
```

`ConfigMap`은 pod가 사용하는 configuration data를 저장하는 곳이다.

Apply the ConfigMap:

```bash
kubectl apply -f 01.cm.yaml
```

## Step 3:  StorageClass
Production에서는 NFS 서버 혹은 클라우드 스토리지를 이용하는 것이 좋지만 여기서는 local storage를 이용한다. 그러기 위해서는 worker node를 하나 지정해서 storage directory를 준비한다. 나는 aespa-2 worker node를 이용할 것이다.

Create folder on the AESPA-2 worker node → 접속해서 폴더 만들어놓는다.
```sh
ssh tech@10.10.10.13
sudo mkdir -p /mnt/opensearch-data
sudo chmod 777 /mnt/opensearch-data
```

Return to the Master node and check again the name of the worker node

```sh
k get nodes
NAME                  STATUS   ROLES           AGE   VERSION
k8s-master-node-ive   Ready    control-plane   32d   v1.33.1
k8s-worker-1-ive      Ready    worker          32d   v1.33.1
k8s-worker-2-aespa    Ready    worker          32d   v1.33.1
k8s-worker-3-aespa    Ready    worker          32d   v1.33.1
```

create `/svc/07.opensearch/02.sc-setup.yaml`
```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: local-storage
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: kubernetes.io/no-provisioner
volumeBindingMode: WaitForFirstConsumer
---
apiVersion: v1
kind: PersistentVolume
metadata:
  name: opensearch-pv
spec:
  capacity:
    storage: 10Gi   # storage 용량 설정
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  storageClassName: local-storage
  local:
    path: /mnt/opensearch-data # Create this directory first
  nodeAffinity:
    required:
      nodeSelectorTerms:
        - matchExpressions:
            - key: kubernetes.io/hostname
              operator: In
              values:
                - k8s-worker-2-aespa # Replace with actual node name
```

위에 node affinity를 통해서 설정한 worker node에 설치되게 한다. 용량은 10 Gi로 설정했다.

apply
```sh
kubectl apply -f 02.sc-setup.yaml
```

## Step 4: Update PVC to Use StorageClass
pod는 PVC를 통해 이 만큼의 용량이 필요하다고 요청한다. 여기서는 위에 설정해준 값 10Gi를 다 요청한다.
create file `/svc/07.opensearch/03.pvc.yaml`

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: opensearch-data-pvc
  namespace: opensearch
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: local-storage  # Use the StorageClass name you created
```

apply
```sh
kubectl apply -f 03.pvc.yaml
```
### Verify Storage Setup

```bash
# Check StorageClass
kubectl get storageclass

# Check PersistentVolume
kubectl get pv

# After creating PVC, check its status
kubectl get pvc -n opensearch
```

## Step 5: Create OpenSearch Deployment

Create a file named `/svc/07.opensearch/04.deploy.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: opensearch
  namespace: opensearch
spec:
  replicas: 1
  selector:
    matchLabels:
      app: opensearch
  template:
    metadata:
      labels:
        app: opensearch
    spec:
      initContainers:
        - name: sysctl
          image: busybox
          command: ["sh", "-c", "sysctl -w vm.max_map_count=262144"]
          securityContext:
            privileged: true
        - name: fix-permissions
          image: busybox
          command: ["sh", "-c", "chown -R 1000:1000 /usr/share/opensearch/data"]
          volumeMounts:
            - name: opensearch-data
              mountPath: /usr/share/opensearch/data
          securityContext:
            runAsUser: 0
      containers:
        - name: opensearch
          image: opensearchproject/opensearch:3.0.0
          ports:
            - containerPort: 9200
              name: http
              protocol: TCP
            - containerPort: 9300
              name: transport
              protocol: TCP
          env:
            - name: OPENSEARCH_JAVA_OPTS
              value: "-Xms2g -Xmx2g"
            - name: DISABLE_SECURITY_PLUGIN
              value: "true"
            - name: DISABLE_INSTALL_DEMO_CONFIG
              value: "true"
            - name: discovery.type
              value: "single-node"
            - name: bootstrap.memory_lock
              value: "false"
          resources:
            requests:
              memory: "2Gi"
              cpu: "1"
            limits:
              memory: "4Gi"
              cpu: "2"
          volumeMounts:
            - name: opensearch-data
              mountPath: /usr/share/opensearch/data
            - name: config
              mountPath: /usr/share/opensearch/config/opensearch.yml
              subPath: opensearch.yml
          securityContext:
            runAsUser: 1000
            runAsGroup: 1000
          livenessProbe:
            httpGet:
              path: /_cluster/health
              port: 9200
              scheme: HTTP
            initialDelaySeconds: 60
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /_cluster/health
              port: 9200
              scheme: HTTP
            initialDelaySeconds: 30
            periodSeconds: 10
      volumes:
        - name: opensearch-data
          persistentVolumeClaim:
            claimName: opensearch-data-pvc
        - name: config
          configMap:
            name: opensearch-config
```

위 9200포트는 client와 REST API를 위한 포트, 9300은 opensearch node 간의 내부 통신용으로 shard 분산 할 때 사용. → single node 일 때도 자기 자신과 통신할 때는 9300 포트를 사용하므로 설정해둔다.

Apply the deployment:

```bash
kubectl apply -f 04.deploy.yaml
```

## Step 6: Create Service
내부 통신을 위한 service라는 K8s object는 필수.

Create a file named `/svc/07.opensearch/05.svc.yaml`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: opensearch
  namespace: opensearch
  labels:
    app: opensearch
spec:
  type: ClusterIP
  selector:
    app: opensearch
  ports:
  - name: http
    port: 9200
    targetPort: 9200
  - name: transport
    port: 9300
    targetPort: 9300
  - name: metrics
    port: 9600
    targetPort: 9600
```

Apply the service:

```bash
kubectl apply -f 05.svc.yaml
```

Wait for all opensearch pods to get ready.
## Step 7: Dashboard (kibana)

Create file `/svc/07.opensearch/06.dashboard.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: opensearch-dashboards
  namespace: opensearch
spec:
  replicas: 1
  selector:
    matchLabels:
      app: opensearch-dashboards
  template:
    metadata:
      labels:
        app: opensearch-dashboards
    spec:
      containers:
        - name: opensearch-dashboards
          image: opensearchproject/opensearch-dashboards:3.0.0
          ports:
            - containerPort: 5601
          env:
            - name: OPENSEARCH_HOSTS
              value: '["http://opensearch:9200"]'
            - name: DISABLE_SECURITY_DASHBOARDS_PLUGIN
              value: "true"
          resources:
            requests:
              memory: "512Mi"
              cpu: "500m"
            limits:
              memory: "1Gi"
              cpu: "1"
---
apiVersion: v1
kind: Service
metadata:
  name: opensearch-dashboards
  namespace: opensearch
spec:
  selector:
    app: opensearch-dashboards
  ports:
    - port: 80
      targetPort: 5601
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: opensearch-dashboards-vs
  namespace: opensearch
spec:
  hosts:
    - kibana.x2bee.com # Replace with your domain
  gateways:
    - istio-system/istio-gateway
  http:
    - match:
        - uri:
            prefix: /
      route:
        - destination:
            host: opensearch-dashboards.opensearch.svc.cluster.local
            port:
              number: 80
```


```sh
kubectl apply -f 06.dashboard.yaml
```

## Step 8: fluentd
password 없애고 주소는 FQDN으로 변경

modify `/svc/03.istio/fluentd.yaml`

```yaml
# Fluentd Configuration for HTTP OpenSearch

```yaml
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluentd-config
  namespace: logging
  labels:
    k8s-app: fluentd-logging
data:
  fluent.conf: |
    <match fluent.**>
      @type null
    </match>
    
    # TCP input source for receiving logs
    <source>
      @type tcp
      port 24220
      format json
      tag applog
      bind 0.0.0.0
      <parse>
        @type json
        time_key timestamp
        time_format %Y-%m-%dT%H:%M:%S.%L%z
      </parse>
    </source>
    
    # Forward logs to OpenSearch
    <match applog>
      @type copy
      <store>
        @type opensearch
        host "opensearch.opensearch.svc.cluster.local"  # Internal service name
        port 9200
        scheme "http"  # Changed to HTTP
        ssl_verify false  # No SSL needed
        # Remove user/password since security is disabled
        reload_connections true
        reconnect_on_error true
        reload_on_failure true
        log_es_400_reason true
        logstash_format true
        logstash_prefix "logstash-stg"
        logstash_dateformat %Y%m%d
        include_tag_key true
        tag_key @log_name
        request_timeout 30s
        slow_flush_log_threshold 300.0
        flush_mode interval
        suppress_type_name true
        <buffer>
          flush_thread_count "2"
          flush_interval "5s"
          chunk_limit_size "1M"
          queue_limit_length "32"
          retry_max_interval "10"
          retry_forever true
          retry_type exponential_backoff
          retry_timeout 60m
        </buffer>
      </store>
    </match>
    
  config-copy.sh: |
    #!/bin/sh
    cp -a /config-volume/..data/fluent.conf /fluentd/etc/fluent.conf
    tini -- /fluentd/entrypoint.sh

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: fluentd
  namespace: logging
  labels:
    k8s-app: fluentd-logging
spec:
  replicas: 1
  selector:
    matchLabels:
      k8s-app: fluentd-logging
  template:
    metadata:
      labels:
        k8s-app: fluentd-logging
    spec:
      tolerations:
      - key: "CriticalAddonsOnly"
        operator: "Exists"
        effect: "NoSchedule"
      containers:
        - name: fluentd
          command: ["sh", "-c", "/config-volume/..data/config-copy.sh"]
          image: fluent/fluentd-kubernetes-daemonset:v1.16-debian-opensearch-1
          env:
            - name: FLUENT_ELASTICSEARCH_HOST
              value: "opensearch.opensearch.svc.cluster.local"
            - name: FLUENT_ELASTICSEARCH_PORT
              value: "9200"
            - name: FLUENT_ELASTICSEARCH_SCHEME
              value: "http"
            - name: FLUENTD_SYSTEMD_CONF
              value: "disable"
            - name: FLUENT_UID
              value: "0"
            - name: FLUENT_ELASTICSEARCH_SSL_VERIFY
              value: "false"
            # No authentication needed - remove user/password env vars
          resources:
            limits:
              cpu: 1000m
              memory: 400Mi
            requests:
              cpu: 100m
              memory: 200Mi
          ports:
            - name: fluentd-source
              containerPort: 24220
              protocol: TCP
          volumeMounts:
            - name: config-volume
              mountPath: /config-volume
      terminationGracePeriodSeconds: 30
      volumes:
        - name: config-volume
          configMap:
            name: fluentd-config
            defaultMode: 0777

---
apiVersion: v1
kind: Service
metadata:
  name: fluentd-svc
  namespace: logging
  labels:
    k8s-app: fluentd-logging
spec:
  type: ClusterIP
  selector:
    k8s-app: fluentd-logging
  ports:
    - name: fluentd-source
      port: 24220
      targetPort: fluentd-source
      protocol: TCP
```

apply
```sh
kubectl apply -f fluentd.yaml
```

## Step 9. Nginx와 Route53 설정
Nginx와 Route53에 적절하게 구성을 추가하고 바꾼다.

### PV가 잘 동작하는 지 테스트
```sh
kubectl rollout restart deployment opensearch -n opensearch
```

pod를 재시작하고 dashboard에 접속해서 data가 안 날라가고 잘 있는지 확인해본다.

git test
