---
title: 1. Introduction to Rust
date: 2025-01-27
---
## Introduction to Rust
### What is Rust
- Rust는 C, C++, Golang처럼 **Systems programming**을 위한 언어 중 하나이다.
- 장점: safety와 stability가 강화됨

### Rust compiler
- **Compiler**는 소스코드를 컴퓨터가 이해할 수 있는 binary executable로 변환해주는 translator와 같은 것이다
- Rust는 다른 언어에 비해서도 특히 syntax가 strict하다 → 맞지 않으면 compile 에러가 난다

## Installing XCode on Mac
난 맥북만 쓰니깐 맥북 설치만 쓴다.
### XCode command line tools
- Rust compiler는 또 하나의 소프트웨어를 이용해서 실행된다 → 이를 dependency라고 부른다.
- Rust를 설치하기 전에 **XCode command line tools**라는 dependency를 설치해야한다.
- **Xcode**(Xcode.app)는 Mac에서 앱 개발하는 텍스트 데이터같은 것인데 지금 설치할 *XCode command line tools*는 같은 것은 아니고 Xcode 부분 집합 격인데 다른 언어 설치할 때도 필요하다.

설치 되어있는지 확인

```sh
> xcode-select version
xcode-select version 2409.
```

난 이미 설치가 되어있지만 → 설치가 안 되어있으면 다음 명령어로 설치한다.

```sh
> xcode-select --install
```

## Install Rust on Mac
공식 홈피로 간다.
https://www.rust-lang.org/tools/install
여기 있는 명령어는 **rustup**이라는 update tool을 이용한 설치인데 그대로 복사 붙이기를 한다.

```sh
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

위 명령어를 치고 나오는 설명을 보면 Cargo도 설치한다고 한다.
**Cargo**는 Rust의 package manager이다. (node의 npm과 같다고 보면 된다.)
3가지 옵션이 나오면 그냥 Enter를 눌러 표준 설치를 한다.

```sh
1) Proceed with standard installation (default - just press enter)
2) Customize installation
3) Cancel installation
```

#### 설치 확인
터미널을 닫고 다시 연 후

```sh
> rustc --version
rustc 1.84.0 (9fc6b4312 2025-01-07)
```

`rustc`는 Rust compiler를 뜻함

## VS code extension
VS code에서 필요한 extension은 딱 하나
![500](./_images/Pasted%20image%2020250128131806.png)

#### **Shell command** 설치
이건 VS code 설치하면서 자동으로 되는 경우도 있는 것 같은데
옆에 이번에 맥미니 사신 분을 보니 자동으로 설치가 안 된 것 같다.
아무튼 터미널에서 해당 폴더에서 `code .`을 누르면 VS code이 열리는 기능을 활성화하는 것이다.

VS code에서 `Cmd` + `Shift` + `P`를 누르면 command palette이 나오고
여기에 다음을 검색해서 클릭하면 하면 설치된다.
![600](./_images/Pasted%20image%2020250128153944.png)

## Rustup
- **rustup** 은 CLI command로 동작하는 utility tool이다.
- `rustup`으로 할 수 있는 것은 다음과 같다.

#### version update
```sh
> rustup update
```

#### uninstall
```sh
> rustup self uninstall
```

#### documentation 보기
```sh
> rustup doc
```

을 하게되면 local에 저장되어있는 Rust documentation 내용의 index.html을 하나 브라우저에 띄운다.
이 페이지의 본문에 `The Rust PRogramming Language`라는 링크를 클릭하면 Rust 언어 가이드가 나온다.