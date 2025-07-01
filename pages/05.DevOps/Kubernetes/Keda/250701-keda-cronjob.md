---
title: Keda를 이용한 cron job 설정
date: 2025-07-01
---
# Keda를 이용한 cron job 설정
### Autoscaler에 대해
Kubernetes에서 우리는 보통 metrics API를 설치한 후 Kubernetes에 내장된 HPA(HorizontalPodAutoscaler)를 통해 CPU와 메모리의 사용률에 따라 auto scale-out이 가능하다.

그러나 모든 pod가 CPU와 메모리 사용량만으로 scale out이 필요한 것은 아니다.
다른 환경에서도 scale-out이 필요한 경우도 많다.
대표적인 예로는 SSR(Server-side rendering)을 많이 사용하는 Next.js의 app의 경우 보통 requested CPU가 다 차기도 전에 latency가 늘어나게된다.
그래서 scale out을 하기 위해 모니터링하는 4가지 metric을 **4 golden signals**이라고 부른다 → Latency, Errors, Traffic, Saturation
이 외에 다른 이유도 있는 경우가 있다.

다음 그림은 플래티어가 구축한 e-commerce 웹사이트 중 하나이다.
24시간동안 트래픽의 패턴이 매일 똑같다.
![](./_images/Pasted%20image%2020250701170554.png)
Kubernetes의 scale out은 (환경에 따라 다르지만) 일반적으로 3분이상의 시간이 걸릴 수 있다.
위와 같이 패턴이 일정한 경우, 갑자기 늘어나는 트래픽의 자동 scale out에 의존하는 것보다, 미리 몇 분전에 트래픽을 예측하고 늘리는 것이 더 효율적이다.

cron job으로 트래픽이 늘어나기 시작하는 오전7시경 미리 하나씩 늘어나게 설정하는 방법을 사용하는 것이다. 이는 Keda를 설치하여 구현할 수 있다. Keda는 다른 의존적인 도구없이 설치도 간단하다.

**Keda**는 Kafka와 병렬해서 쓰기도 하는데, request message의 queue가 많으면 이를 감지해 pod를 늘리고, 없을 때는 줄이는 용도로도 사용되기도 한다. 여기서는 Keda를 설치하고 cron job으로 시간대별로 pod 수를 늘리고 줄이는 것을 설정해 볼 것이다.

### Install Keda
install Helm : https://helm.sh/docs/intro/install/

```sh
$ curl -fsSL -o get_helm.sh https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3
$ chmod 700 get_helm.sh
$ ./get_helm.sh
```


공식 홈피 : https://keda.sh/docs/2.17/deploy/#helm

```sh
helm repo add kedacore https://kedacore.github.io/charts  
helm repo update
```

install

```sh
helm install keda kedacore/keda --namespace keda --create-namespace
```

verify
```
k get all -n keda
```

### ScaledObject
HPA와 ScaledObject는 서로 쫑이 난다. 그래서 Keda로 ScaledObject를 사용하려면 template에서 `hpa.yaml` template 파일에 if 조건을 넣고 다음과 같이 삭제한다.

`hpa.yaml`

```yaml
{{- if ne .Values.keda.enabled true }}
apiVersion: autoscaling/v1
kind: HorizontalPodAutoscaler
...
{{- end }}
```

하고 `scaled-object.yaml` 파일을 생성한다.

```yaml
{{- if eq .Values.keda.enabled true}}
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: {{ .Values.application.name }}-cron-scaler
  namespace: {{ .Values.application.namespace }}
  labels:
    app: {{ .Values.application.name }}
spec:
  scaleTargetRef:
    name: {{ .Values.application.name }}-deploy
  pollingInterval: 10
  cooldownPeriod: 60 
  minReplicaCount: {{ .Values.application.containers.replicas.min }}
  maxReplicaCount: {{ .Values.application.containers.replicas.max }}
  advanced:
    restoreToOriginalReplicaCount: true
    horizontalPodAutoscalerConfig:
      behavior:
        scaleDown:
          stabilizationWindowSeconds: 30
          policies:
          - type: Percent
            value: 50
            periodSeconds: 30
        scaleUp:
          stabilizationWindowSeconds: 0
          policies:
          - type: Percent
            value: 200
            periodSeconds: 15
  triggers:
  {{- range .Values.keda.cron.windows }}
    - type: cron
      metadata:
        timezone: "Asia/Seoul"
        start: "{{ .start }}"
        end: "{{ .end }}"
        desiredReplicas: "{{ .replicas }}"
  {{- end }}
    - type: cpu
      metadata:
        type: Utilization
        value: "{{ .Values.keda.cpu.targetUtilization }}"
{{- end }}
```

위에 `scaleDown:`과 `scaleUp:`은 얼마나 빨리 pod를 줄이고 늘릴지 속도를 조절하는 factor들이다.

이제 `values.yaml`파일에 다음으르 추가해서 테스트해본다.

```yaml
keda:
	enabled: true
  cron:
    windows:
      - start: "30 17 * * *"
        end: "32 17 * * *"
        replicas: 3
      - start: "33 17 * * *" # 앞의 end와 1분 차이 둔다.
        end: "35 17 * * *"
        replicas: 2
  cpu:
    targetUtilization: 80
```

5시30분에 pod가 3개로 늘어나고 5시33분30초에 (`stabilizationWindowSeconds: 30`로 인해) pod가 다시 2개로 줄어드는 것을 확인할 수 있다.
