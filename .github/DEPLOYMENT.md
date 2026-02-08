# Koyeb 部署完整指南

本指南提供了通过 GitHub Actions 将应用部署到 Koyeb 的完整配置方案。这是一个经过验证的、可复用的 pattern，适用于任何使用 Docker 的应用。

## 核心 Pattern

**成功的部署 pattern 包含三个关键要素：**

1. ✅ **关闭 Koyeb Autodeploy**：让 GitHub Actions 完全控制部署时机
2. ✅ **测试通过后才部署**：使用 `needs` 确保所有测试通过
3. ✅ **明确指定 Docker builder**：避免 Koyeb 自动选择 buildpack

## 前提条件

1. ✅ 已在 Koyeb 控制台创建应用和服务
2. ✅ 已在 Koyeb 控制台**关闭 Autodeploy**（Settings > Source > Autodeploy）
3. ✅ 项目根目录有 `Dockerfile`

## 配置步骤

### 1. 获取 Koyeb API Token

1. 登录 [Koyeb 控制台](https://app.koyeb.com)
2. 进入 **Settings** > **API Tokens**
3. 点击 **Create API Token**
4. 复制生成的 Token（只显示一次，请妥善保存）

### 2. 配置 GitHub Secrets

1. 进入你的 GitHub 仓库
2. 点击 **Settings** > **Secrets and variables** > **Actions**
3. 点击 **New repository secret**
4. 添加：
   - **Name**: `KOYEB_API_TOKEN`
   - **Value**: 你的 Koyeb API Token
5. 点击 **Add secret**

### 3. 获取应用名称和服务名称

#### 方法一：通过 Koyeb 控制台

1. 登录 Koyeb 控制台
2. 进入你的应用页面
3. **应用名称**：在 URL 中可以看到，例如 `https://app.koyeb.com/apps/your-app-name`
4. **服务名称**：在应用的 **Services** 标签页可以看到

#### 方法二：通过 Koyeb CLI

```bash
# 安装 Koyeb CLI
curl -fsSL https://www.koyeb.com/cli.sh | sh

# 登录
koyeb auth login

# 列出所有应用
koyeb apps list

# 列出应用的服务
koyeb services list --app your-app-name
```

### 4. 创建 GitHub Actions Workflow

在 `.github/workflows/deploy.yml`（或你的测试 workflow）中添加部署 job：

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [master]  # 或你的主分支名称
  pull_request:
    branches: [master]

jobs:
  # 测试任务（根据你的项目调整）
  test:
    name: Run Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      # ... 你的测试步骤

  # Docker 构建测试（可选，但推荐）
  docker-build:
    name: Docker Build Test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build Docker image
        run: docker build -t test-image .

  # 部署任务（关键部分）
  deploy:
    needs: [test, docker-build]  # 等待所有测试通过
    runs-on: ubuntu-latest
    # 只在 push 到主分支时部署，PR 时不部署
    if: github.event_name == 'push' && github.ref == 'refs/heads/master'
    steps:
      - uses: actions/checkout@v4

      - name: Install and configure the Koyeb CLI
        uses: koyeb-community/koyeb-actions@v2
        with:
          api_token: "${{ secrets.KOYEB_API_TOKEN }}"

      - name: Trigger Deployment on Koyeb
        uses: koyeb/action-git-deploy@v1
        with:
          app-name: "your-app-name"           # 替换为你的应用名称
          service-name: "your-service-name"   # 替换为你的服务名称
          git-branch: "master"                 # 或你的主分支名称
          git-builder: "docker"                # ⚠️ 关键：明确指定 Docker
          git-docker-dockerfile: "Dockerfile"  # ⚠️ 关键：指定 Dockerfile 路径
          service-regions: "na"                # 区域：na (North America), eu, ap 等
          service-ports: "8000:http"           # 端口映射：容器端口:协议
          service-routes: "/:8000"             # 路由：路径:端口（根路径用 /）
```

## 关键配置说明

### ⚠️ 必须配置的参数

1. **`git-builder: "docker"`**
   - **作用**：强制使用 Docker builder，避免 Koyeb 自动选择 buildpack
   - **为什么重要**：如果不指定，Koyeb 可能检测到 Python/Node.js 文件而使用 buildpack

2. **`git-docker-dockerfile: "Dockerfile"`**
   - **作用**：指定 Dockerfile 路径
   - **默认值**：如果项目根目录有 `Dockerfile`，可以不指定，但明确指定更安全

3. **`needs: [test, docker-build]`**
   - **作用**：确保所有测试通过后才部署
   - **为什么重要**：这是 CI/CD 的核心，防止有问题的代码被部署

4. **`if: github.event_name == 'push' && github.ref == 'refs/heads/master'`**
   - **作用**：只在 push 到主分支时部署，PR 时不部署
   - **为什么重要**：避免 PR 触发部署，节省资源

### 端口和路由配置

- **`service-ports: "8000:http"`**
  - 格式：`容器端口:协议类型`
  - 协议类型：`http` 或 `tcp`
  - 示例：`"8000:http"`、`"3000:http"`、`"5432:tcp"`

- **`service-routes: "/:8000"`**
  - 格式：`路径:端口`
  - 根路径：`"/:8000"` 表示所有请求都转发到 8000 端口
  - 子路径：`"/api:8000"` 表示 `/api/*` 请求转发到 8000 端口
  - 多个路由：`"/:8000,/api:8000"`（逗号分隔）

### 区域配置

- **`service-regions: "na"`**
  - `na`：North America（北美）
  - `eu`：Europe（欧洲）
  - `ap`：Asia Pacific（亚太）
  - 多个区域：`"na,eu"`（逗号分隔，但注意不能混合大陆和都市区域）

## Dockerfile 要求

你的 `Dockerfile` 应该：

1. **暴露正确的端口**：使用 `EXPOSE` 指令
2. **设置启动命令**：使用 `CMD` 或 `ENTRYPOINT`
3. **处理 PORT 环境变量**：Koyeb 会设置 `PORT` 环境变量

### Dockerfile 示例

```dockerfile
# 示例：Python FastAPI 应用
FROM python:3.11-slim
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# 使用 shell 形式以便 ${PORT} 在运行时展开
CMD sh -c "uvicorn app:app --host 0.0.0.0 --port ${PORT:-8000}"
```

```dockerfile
# 示例：Node.js 应用
FROM node:20-slim
WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .

EXPOSE 3000

# 使用 shell 形式以便 ${PORT} 在运行时展开
CMD sh -c "node server.js --port ${PORT:-3000}"
```

## 完整示例：Python FastAPI + React

这是一个实际使用的完整配置示例：

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [master]
  pull_request:
    branches: [master]

jobs:
  frontend:
    name: Frontend Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - run: npm test

  backend:
    name: Backend Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install -r requirements.txt
      - run: pip install pytest pytest-asyncio
      - run: pytest tests/ -v

  docker:
    name: Docker Build Test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build Docker image
        run: docker build -t test-image .

  deploy:
    needs: [frontend, backend, docker]
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/master'
    steps:
      - uses: actions/checkout@v4

      - name: Install and configure the Koyeb CLI
        uses: koyeb-community/koyeb-actions@v2
        with:
          api_token: "${{ secrets.KOYEB_API_TOKEN }}"

      - name: Trigger Deployment on Koyeb
        uses: koyeb/action-git-deploy@v1
        with:
          app-name: "my-app"
          service-name: "my-service"
          git-branch: "master"
          git-builder: "docker"
          git-docker-dockerfile: "Dockerfile"
          service-regions: "na"
          service-ports: "8000:http"
          service-routes: "/:8000"
```

## 常见问题和解决方案

### ❌ 问题 1：Koyeb 使用 buildpack 而不是 Docker

**症状**：日志显示 "Installing Python 3.x" 或 "Installing Node.js"，而不是 Docker 构建

**原因**：没有明确指定 `git-builder: "docker"`

**解决方案**：
```yaml
git-builder: "docker"  # ⚠️ 必须添加
git-docker-dockerfile: "Dockerfile"
```

### ❌ 问题 2：部署 job 没有运行

**症状**：测试通过了，但 deploy job 没有启动

**可能原因**：
1. Koyeb Autodeploy 没有关闭
2. 不是在主分支的 push 事件
3. `needs` 中的某个 job 失败了

**解决方案**：
- 检查 Koyeb 控制台：Settings > Source > Autodeploy（必须关闭）
- 检查 workflow 条件：`if: github.event_name == 'push' && github.ref == 'refs/heads/master'`
- 检查所有测试 job 是否都成功

### ❌ 问题 3：区域配置错误

**症状**：`cannot mix continental and metropolitan regions`

**原因**：不能混合使用大陆区域（如 `na`）和都市区域（如 `fra`）

**解决方案**：
- 只使用大陆区域：`service-regions: "na"` 或 `service-regions: "eu"`
- 不要混合：避免 `service-regions: "na,fra"`

### ❌ 问题 4：端口配置错误

**症状**：应用无法访问或返回 502 错误

**原因**：端口映射或路由配置不正确

**解决方案**：
- 确保 `service-ports` 中的端口与 Dockerfile 的 `EXPOSE` 一致
- 确保 `service-routes` 格式正确：`路径:端口`
- 检查应用是否监听 `0.0.0.0` 而不是 `localhost`

### ❌ 问题 5：应用启动失败

**症状**：部署成功但应用无法启动，日志显示 "no command to run"

**原因**：Dockerfile 没有 `CMD` 或 `ENTRYPOINT`

**解决方案**：
```dockerfile
# 添加 CMD 指令
CMD ["your", "start", "command"]
# 或使用 shell 形式以支持环境变量
CMD sh -c "your-command --port ${PORT:-8000}"
```

## 验证部署

1. **推送代码到主分支**
2. **查看 GitHub Actions**：
   - 进入仓库的 **Actions** 标签页
   - 查看最新的 workflow 运行
   - 确认所有测试通过
   - 确认 `deploy` job 成功
3. **查看 Koyeb 控制台**：
   - 进入你的服务页面
   - 查看 **Activity** 或 **Deployments** 标签页
   - 确认新的部署正在运行
   - 查看 **Logs** 确认应用正常启动

## 最佳实践

1. ✅ **始终先运行测试**：使用 `needs` 确保测试通过
2. ✅ **明确指定 Docker builder**：避免自动检测导致的意外行为
3. ✅ **在 Dockerfile 中使用环境变量**：`${PORT:-8000}` 支持 Koyeb 的动态端口
4. ✅ **PR 时不部署**：使用 `if` 条件避免 PR 触发部署
5. ✅ **关闭 Koyeb Autodeploy**：让 GitHub Actions 完全控制部署时机
6. ✅ **测试 Docker 构建**：在 CI 中测试 Docker 构建，提前发现问题

## 参考资源

- [Koyeb GitHub Actions](https://github.com/koyeb/action-git-deploy)
- [Koyeb API Documentation](https://www.koyeb.com/docs/developer/api)
- [Koyeb CLI Reference](https://www.koyeb.com/docs/build-and-deploy/cli/reference)
- [Koyeb Build and Deploy Guide](https://www.koyeb.com/docs/build-and-deploy)

## 总结

**成功的部署 pattern 核心要素：**

1. ✅ 关闭 Koyeb Autodeploy
2. ✅ 测试通过后才部署（`needs`）
3. ✅ 明确指定 Docker builder（`git-builder: "docker"`）
4. ✅ 只在主分支 push 时部署（`if` 条件）
5. ✅ 正确的端口和路由配置

遵循这个 pattern，你就能建立一个可靠的、自动化的 CI/CD 流程。
