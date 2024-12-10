---
title: OpenSearch Retention Period 설정
date: 2024-12-10
---
### PRD 설정
#### 1. ISM 설치 확인
OpenSearch PRD 접속
```sh hl:1
curl -X GET "localhost:9200/_cat/plugins?v" | grep index
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100  3082  100  3082    0     0  1517k      0 --:--:-- --:--:-- --:--:-- 3009k
opensearch-node1 opensearch-index-management          2.17.1.0
opensearch-node2 opensearch-index-management          2.17.1.0
```

OpenSearch에 default으로 ISM(Index State Manaement)가 설치되어있다.

#### 2. `/svc`에 파일 생성
```json title:delete_policy.json ln:true
cat << EOF > delete_policy.json
{
    "policy": {
        "policy_id": "delete_policy",
        "description": "Policy to delete indices older than 30 days",
        "schema_version": 21,
        "error_notification": null,
        "default_state": "hot",
        "states": [
            {
                "name": "hot",
                "actions": [],
                "transitions": [
                    {
                        "state_name": "delete",
                        "conditions": {
                            "min_index_age": "30d"
                        }
                    }
                ]
            },
            {
                "name": "delete",
                "actions": [
                    {
                        "retry": {
                            "count": 3,
                            "backoff": "exponential",
                            "delay": "1m"
                        },
                        "delete": {}
                    }
                ],
                "transitions": []
            }
        ],
        "ism_template": [
            {
                "index_patterns": ["logstash-*"],
                "priority": 100
            },
        ]
    }
}
EOF
```

upload the policy
```sh
curl -X PUT "http://localhost:9200/_plugins/_ism/policies/delete_policy" \
-H "Content-Type: application/json" \
-d @./delete_policy.json
```

assign the policy to indices matching `logstash-*`
```sh
curl -X POST "localhost:9200/_plugins/_ism/add/logstash-*" -H 'Content-Type: application/json' -d'{
    "policy_id": "delete_policy"
}'
```

결과가
```sh
{"updated_indices":5,"failures":false,"failed_indices":[]}
```
이렇게 나오면 failures가 false이니 성공했다는 뜻.


### DEV 설정
#### 1. ISM 설치 확인
OpenSearch PRD 접속
```sh hl:1
curl -u admin:iScreammall\!1 -X GET "localhost:9200/_cat/plugins?v" | grep index
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100  1354  100  1354    0     0   423k      0 --:--:-- --:--:-- --:--:--  661k
26114a15e89b opensearch-index-management          2.14.0.0
```

OpenSearch에 default으로 ISM(Index State Manaement)가 설치되어있다.

#### 2. `/svc`에 파일 생성
```json title:delete_policy.json
cat << EOF > delete_policy.json
{
    "policy": {
        "policy_id": "delete_policy",
        "description": "Policy to delete indices older than 30 days",
        "schema_version": 21,
        "error_notification": null,
        "default_state": "hot",
        "states": [
            {
                "name": "hot",
                "actions": [],
                "transitions": [
                    {
                        "state_name": "delete",
                        "conditions": {
                            "min_index_age": "30d"
                        }
                    }
                ]
            },
            {
                "name": "delete",
                "actions": [
                    {
                        "retry": {
                            "count": 3,
                            "backoff": "exponential",
                            "delay": "1m"
                        },
                        "delete": {}
                    }
                ],
                "transitions": []
            }
        ],
        "ism_template": [
            {
                "index_patterns": ["logstash-*"],
                "priority": 100
            },
            {
                "index_patterns": ["security-auditlog-*"],
                "priority": 100
            }
        ]
    }
}
EOF
```

upload the policy
```sh
curl -u admin:iScreammall\!1 -X PUT "http://localhost:9200/_plugins/_ism/policies/delete_policy" \
-H "Content-Type: application/json" \
-d @./delete_policy.json
```

assign the policy to indices matching `logstash-*`
```sh
curl -u admin:iScreammall\!1 -X POST "localhost:9200/_plugins/_ism/add/logstash-*" -H 'Content-Type: application/json' -d'{
    "policy_id": "delete_policy"
}'
```

assign the policy to indices matching `security-auditlog-*`
```sh
curl -u admin:iScreammall\!1 -X POST "localhost:9200/_plugins/_ism/add/security-auditlog-*" -H 'Content-Type: application/json' -d'{
    "policy_id": "delete_policy"
}'
```

Check which indices have the policy applied
```sh
curl -u admin:iScreammall\!1 -X GET "localhost:9200/_plugins/_ism/explain/security-auditlog-*" | jq '.'

curl -u admin:iScreammall\!1 -X GET "localhost:9200/_plugins/_ism/explain/logstash-*" | jq '.'
```

Check policy status
```sh
curl -u admin:iScreammall\!1 -X GET "localhost:9200/_plugins/_ism/policies/delete_policy" | jq '.'
```

