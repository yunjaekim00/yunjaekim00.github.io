---
title: github actions
date: "2024-08-05"
---
# Github Pages에 배포
## Github Actions
Github repository이름을 `[github id].github.io`로 만들고  
public repo로 해놓으면 자동으로 배포는 되지만  
Github Pages가 Ruby기반이라 그런지 몰라도 Jekyll은 자동으로 될 지 몰라도  
React framework을 사용하는 Docusaurus같은 경우에는 workflow 코드를 추가로 구성해주어야 한다.

## Github Workflow
하나의 yaml 파일에 써도 되지만 그냥 2개 파일로 나누어보았다.  

```yaml title=".github/workflows/setup-node/action.yml" showLineNumbers
name: setup-node
description: "Setup Node.js and install dependencies"
runs:
  using: "composite"
  steps:
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: 20

    - name: Install dependencies
      shell: bash
      run: npm install
```

Node version을 명시해주고 npm install을 한다.  
여기에 추가로 다음과 같이 node_modules를 cache하는 방법도 있으나  

```yaml title="이것도 가능하지만 생략"
name: setup-node
description: "Setup Node.js - Cache dependencies - Install dependencies"
runs:
  using: "composite"
  steps:
    - name: Setup Node.js ⚙️
      uses: actions/setup-node@v4
      with:
        node-version: 20

    - name: Cache dependencies
      id: cache_dependencies
      uses: actions/cache@v3
      with:
        path: node_modules
        key: node-modules-${{ hashFiles('package-lock.json') }}

    - name: Install dependencies
      shell: bash
      if: steps.cache_dependencies.outputs.cache-hit != 'true'
      run: npm install
```

cache를 안 할 때는 빌드시간 1분30초, cache를 할 때는 1분 10초 정도라서 그냥 생략했다.

그 다음은 메인 yaml 파일  

```yaml title=".github/workflows/publish.yml" showLineNumbers
name: publish-to-github-pages
on:
  push:
    branches:
      - main

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js and install dependencies
        uses: ./.github/workflows/setup-node

      - name: Build with React
        run: npm build

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./build

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}

    runs-on: ubuntu-latest
    needs: build

    steps:
      - name: Publish to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

`npm build`를 하게 되면 정적인 파일들이 `./build` 폴더에 생기게되어 이를 명시해주는 코드다.