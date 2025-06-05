---
layout: post
title: "StatefulSet과 Deployment의 차이"
date: 2025-06-05 14:39:20 +0900
categories: [blog]
---
# StatefulSet이란?

먼저, k8s 한국어 문서의 설명을 보도록 하자.

```text
스테이트풀셋은 애플리케이션의 스테이트풀을 관리하는데 사용하는 워크로드 API 오브젝트이다.

파드 집합의 디플로이먼트와 스케일링을 관리하며, 파드들의 순서 및 고유성을 보장한다 .

디플로이먼트와 유사하게, 스테이트풀셋은 동일한 컨테이너 스펙을 기반으로 둔 파드들을 관리한다. 디플로이먼트와는 다르게, 스테이트풀셋은 각 파드의 독자성을 유지한다. 이 파드들은 동일한 스팩으로 생성되었지만, 서로 교체는 불가능하다. 다시 말해, 각각은 재스케줄링 간에도 지속적으로 유지되는 식별자를 가진다.

스토리지 볼륨을 사용해서 워크로드에 지속성을 제공하려는 경우, 솔루션의 일부로 스테이트풀셋을 사용할 수 있다. 스테이트풀셋의 개별 파드는 장애에 취약하지만, 퍼시스턴트 파드 식별자는 기존 볼륨을 실패한 볼륨을 대체하는 새 파드에 더 쉽게 일치시킬 수 있다.
```
여기서 읽어낼 수 있는 사실은 아래와 같다.

a. 파드들의 순서 및 고유성 보장
b. 파드들은 동일한 스펙으로 생성되나 스케줄링 시 개별 식별자로 관리
c. PV(Persistent Volume)을 통해 지속성 제공이 가능(Persistent Pod 식별자)

파드들은 개별적인 식별자로 관리되며, 역시 PV를 이용한 지속성 제공을 지원한다.
스테이트풀셋은 파드를 생성하기 위한 명세의 일종이며 **개별 파드의 독립성을 강조한다**, 가 적절한 요약일 것 같다.

# Deployment란?
다시 k8s 한국어 문서를 보도록 하자.

```text
디플로이먼트(Deployment) 는 파드와 레플리카셋(ReplicaSet)에 대한 선언적 업데이트를 제공한다.

디플로이먼트에서 의도하는 상태 를 설명하고, 디플로이먼트 컨트롤러(Controller)는 현재 상태에서 의도하는 상태로 비율을 조정하며 변경한다. 새 레플리카셋을 생성하는 디플로이먼트를 정의하거나 기존 디플로이먼트를 제거하고, 모든 리소스를 새 디플로이먼트에 적용할 수 있다. 
```

여기까지만 봐선 파드와 레플리카셋을 업데이트하고, 의도된 상태에 맞게 관리한다고 하면 스테이트풀셋과의 차이를 알기 힘들다.
따라서 문서의 유스케이스 항목을 살펴봐야 한다.

## 유스케이스

다음은 디플로이먼트의 일반적인 유스케이스이다.

- 레플리카셋을 롤아웃 할 디플로이먼트 생성. 레플리카셋은 백그라운드에서 파드를 생성한다. 롤아웃 상태를 체크해서 성공 여부를 확인한다.
- 디플로이먼트의 PodTemplateSpec을 업데이트해서 파드의 새로운 상태를 선언한다. 새 레플리카셋이 생성되면, 디플로이먼트는 파드를 기존 레플리카셋에서 새로운 레플리카셋으로 속도를 제어하며 이동하는 것을 관리한다. 각각의 새로운 레플리카셋은 디플로이먼트의 수정 버전에 따라 업데이트한다.
- 만약 디플로이먼트의 현재 상태가 안정적이지 않은 경우 디플로이먼트의 이전 버전으로 롤백한다. 각 롤백은 디플로이먼트의 수정 버전에 따라 업데이트한다.
- 더 많은 로드를 위해 디플로이먼트의 스케일 업.
- 디플로이먼트 롤아웃 일시 중지로 PodTemplateSpec에 여러 수정 사항을 적용하고, 재개하여 새로운 롤아웃을 시작한다.
- 롤아웃이 막혀있는지를 나타내는 디플로이먼트 상태를 이용.
- 더 이상 필요 없는 이전 레플리카셋 정리.
*레플리카셋은 파드의 스케줄링 개수 등을 설정하여 파드의 갑작스런 중단이나 상태 변경에 유연하게 대응하기 위한 오브젝트이다.*

## 차이점

유스케이스 비교를 하면 비로소 두 스케줄링 방식의 결정적인 차이를 알 수 있다.
디플로이먼트는 상태 일시 중지, 수정 후 재개 등 유연한 상태 관리가 가능하며, **파드는 하나의 묶음처럼 관리되어** 서비스 노출 시 무엇을 노출해도 상관이 없기에 **랜덤 선택**되어 포워딩하게 된다.

**보다 통합적인 파드 묶음 관리**로의 특성을 보이는 것이다.

# 둘의 YAML 코드 비교

## Deployment
이것 역시 한국어 문서에서 가져온 예시 코드이다.
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
  labels:
    app: nginx
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.14.2
        ports:
        - containerPort: 80
```

3개의 파드를 스케줄링하는 레플리카셋을 디플로이먼트로 묶어 관리하는 형태이다.
이 때, 각각의 레플리카셋 내의 컨테이너에서 80번의 포트를 열어 nginx가 컨테이너 외부로 나갈 수 있게 허가한다. *(이것은 nginx 프록시 설정에 따라 바뀐다.)*

## StatefulSet (Persistent)

```yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx
  labels:
    app: nginx
spec:
  ports:
  - port: 80
    name: web
  clusterIP: None
  selector:
    app: nginx
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: web
spec:
  selector:
    matchLabels:
      app: nginx # .spec.template.metadata.labels 와 일치해야 한다
  serviceName: "nginx"
  replicas: 3 # 기본값은 1
  minReadySeconds: 10 # 기본값은 0
  template:
    metadata:
      labels:
        app: nginx # .spec.selector.matchLabels 와 일치해야 한다
    spec:
      terminationGracePeriodSeconds: 10
      containers:
      - name: nginx
        image: registry.k8s.io/nginx-slim:0.8
        ports:
        - containerPort: 80
          name: web
        volumeMounts:
        - name: www
          mountPath: /usr/share/nginx/html
  volumeClaimTemplates:
  - metadata:
      name: www
    spec:
      accessModes: [ "ReadWriteOnce" ]
      storageClassName: "my-storage-class"
      resources:
        requests:
          storage: 1Gi
```

이것 역시 nginx의 80 포트를 서비스한다. 이 StatefulSet은 PVC(Persistent Volume Claim) 템플릿을 가진 **퍼시스턴트 스테이트풀셋이다.**

# 결론

StatefulSet은 파드를 생성 후 개별 파드가 서로 다른 형태로 변경되고 분화되어야 하는 경우에 적용 가능할 것이다. 초기 3개의 파드를 만들고 개별로 관리하고 변경하려면 묶음 관리하는 Deployment의 방식은 좋지 않다.

Deployment는 여러 파드들을 통일감있게, 여분의 레플리카 리소스 등을 균일하게 관리해야 할 때 적합하다. 무중단, 고가용성 서비스를 위해 프록시 설정을 하고, 동일한 프록시가 레플리카로 구비되어있어야 한다면 이것이 적합할 것이다.

# 참조

[Deployment](https://kubernetes.io/ko/docs/concepts/workloads/controllers/deployment/)
[ReplicaSet](https://kubernetes.io/ko/docs/concepts/workloads/controllers/replicaset/)
[StatefulSet](https://kubernetes.io/ko/docs/concepts/workloads/controllers/statefulset/)
