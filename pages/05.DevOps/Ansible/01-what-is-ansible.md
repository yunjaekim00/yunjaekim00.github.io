---
title: 01 What is Ansible
date: 2025-02-24
---
## What is Ansible
IT 작업을 자동화 할 수 있는 도구

## Why use Ansible
- 반복적인 작업에 좋다 → 여러 서버를 동시에 운영할 수 있다
- 반복하다가 human error (하나씩 놓치고 실행하는 실수)를 줄일 수 있다
- Terraform으로 shell script를 실행하면 어디서 에러가 나는지 보이지 않지만 Ansible로 하면 보인다
- Ansible은 **agentless**하다 → target server에 어떤 것도 설치할 필요없이 ssh 접속만 된다면 loacl(control server)에만 Ansible을 설치하면 된다
- 변수를 이용해 dev/stg/prd에서 재사용이 가능하다

## Ansible architecture
예시: 
```yaml
# First Play
- name: Install Docker
  hosts: ec2
  become: yes
  tasks:
    - name: Install Docker
      yum:
        name: docker
        update_cache: yes
        state: present
    - name: Start Docker Daemon
      systemd:
        name: docker
        state: started
```

큰 단위 → 작은 단위 순서로 보자.
### Playbook
- 큰 단위부터 보자면 YAML 파일 하나를 Playbook으로 보면 된다.
- 여러 개의 *Play*로 구성되어있다.
### Play
- 위의 예시 코드가 하나의 Play이다. 이런 Play가 하나의 yaml파일에 여러가지 나열될 수 있다.
- 어떤 host에서 어떤 계정(user)으로 어떤 task를 할 지를 나열한다.
### Task
- 하나 또는 여러 개의 module로 구성되어있다.
- 여러 개 모듈로 구성되어 있는 task를 → *one configuration*이라고 부르기도 한다.
### Module
- 위 코드에서는 `yum`이 하나의 module이고, `systemd`도 하나의 모듈이다.
### Argument
- 위 코드에서 `name`, `update_cache`, `state`가 각각 하나의 argument이다.
## Hosts
위 예시에서 어떤 서버에 접속하는지는 어떻게 정하는가 → **Ansible Inventory List**라 불리는 hosts file에서 가져오는데 `ansible.cfg`에서도 가져올 수 있고 IP주소나 hostname으로도 가져올 수 있다 → 추후에 더 자세히 보기로 한다.
