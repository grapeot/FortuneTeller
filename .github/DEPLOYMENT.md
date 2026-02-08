# GitHub Actions → Koyeb 部署指南

通过 GitHub Actions 实现测试通过后自动部署到 Koyeb。适用于任何 Docker 化的应用。

## 核心原则

1. **关闭 Koyeb Autodeploy**——部署时机由 GitHub Actions 控制
2. **`needs` 门控**——所有测试通过后才触发部署
3. **显式指定 `git-builder: "docker"`**——否则 Koyeb 会检测到 Python/Node 文件而回退到 buildpack

## 前提

- Koyeb 控制台已创建应用和服务，且 **Autodeploy 已关闭**（Settings → Source → Autodeploy）
- 项目根目录有 `Dockerfile`，包含 `EXPOSE` 和 `CMD`
- `Dockerfile` 的 `CMD` 使用 `${PORT:-8000}` 以适配 Koyeb 动态端口

## 配置步骤

### 1. GitHub Secret

在 GitHub 仓库 Settings → Secrets and variables → Actions 中添加：

| Name | Value |
|------|-------|
| `KOYEB_API_TOKEN` | 从 Koyeb 控制台 Settings → API Tokens 获取 |

### 2. 获取应用名和服务名

通过控制台 URL（`https://app.koyeb.com/apps/<app-name>`）或 CLI：

```bash
koyeb apps list
koyeb services list --app <app-name>
```

### 3. Workflow 配置

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [master]
  pull_request:
    branches: [master]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      # ... 你的测试步骤

  docker:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker build -t test-image .

  deploy:
    needs: [test, docker]
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/master'
    steps:
      - uses: actions/checkout@v4

      - name: Install Koyeb CLI
        uses: koyeb-community/koyeb-actions@v2
        with:
          api_token: "${{ secrets.KOYEB_API_TOKEN }}"

      - name: Deploy
        uses: koyeb/action-git-deploy@v1
        with:
          app-name: "<app-name>"                # ← 替换
          service-name: "<service-name>"         # ← 替换
          git-branch: "master"
          git-builder: "docker"                  # ⚠️ 必须显式指定
          git-docker-dockerfile: "Dockerfile"    # ⚠️ 必须显式指定
          service-regions: "na"                  # na / eu / ap
          service-ports: "8000:http"             # 容器端口:协议
          service-routes: "/:8000"               # 路由路径:端口
```

## 参数速查

| 参数 | 格式 | 说明 |
|------|------|------|
| `git-builder` | `"docker"` | 必须设为 `docker`，否则可能使用 buildpack |
| `git-docker-dockerfile` | `"Dockerfile"` | Dockerfile 路径（相对仓库根目录） |
| `service-regions` | `"na"` | `na` / `eu` / `ap`，不可混合大陆与都市区域 |
| `service-ports` | `"8000:http"` | `端口:协议`，协议为 `http` 或 `tcp` |
| `service-routes` | `"/:8000"` | `路径:端口`，子路径如 `"/api:8000"` |

## Dockerfile 示例

```dockerfile
# Python FastAPI
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD sh -c "uvicorn app:app --host 0.0.0.0 --port ${PORT:-8000}"
```

```dockerfile
# Node.js
FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3000
CMD sh -c "node server.js --port ${PORT:-3000}"
```

## 常见报错

| 症状 | 原因 | 修复 |
|------|------|------|
| 日志显示 `Installing Python 3.x` 而非 Docker 构建 | 未指定 `git-builder: "docker"` | 添加 `git-builder: "docker"` |
| `cannot mix continental and metropolitan regions` | 混用了 `na` 与 `fra` 等 | 只用大陆区域（`na`/`eu`/`ap`） |
| `no command to run your application` | Dockerfile 缺少 `CMD` | 添加 `CMD` 指令 |
| 502 错误 | 端口或路由配置不匹配 | 确认 `service-ports` 与 `EXPOSE` 一致，应用监听 `0.0.0.0` |
| deploy job 未触发 | Autodeploy 未关闭 / 不是 push 到主分支 | 关闭 Autodeploy，检查 `if` 条件 |

## 参考

- [koyeb/action-git-deploy](https://github.com/koyeb/action-git-deploy)
- [koyeb-community/koyeb-actions](https://github.com/koyeb-community/koyeb-actions)
- [Koyeb Build & Deploy 文档](https://www.koyeb.com/docs/build-and-deploy)
