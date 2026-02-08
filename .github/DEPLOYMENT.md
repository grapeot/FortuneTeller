# Koyeb 部署配置指南

## 前提条件

1. ✅ 已在 Koyeb 控制台关闭 **Autodeploy** 选项
2. ✅ 已在 Koyeb 创建应用和服务

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
4. 添加以下 Secret：
   - **Name**: `KOYEB_API_TOKEN`
   - **Value**: 粘贴刚才复制的 Koyeb API Token
5. 点击 **Add secret**

### 3. 获取应用名称和服务名称

#### 方法一：通过 Koyeb 控制台

1. 登录 Koyeb 控制台
2. 进入你的应用页面
3. **应用名称**：在应用列表或应用详情页的 URL 中可以看到，例如 `https://app.koyeb.com/apps/your-app-name`
4. **服务名称**：进入应用后，在 **Services** 标签页可以看到服务列表，服务名称通常是应用名称加上 `-service` 后缀

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

### 4. 更新 GitHub Actions 配置

编辑 `.github/workflows/test.yml` 文件，找到 `deploy` job 中的以下行：

```yaml
app-name: "fortune-teller"  # 替换为你的实际应用名称
service-name: "fortune-teller-service"  # 替换为你的实际服务名称
```

将占位符替换为你从步骤 3 获取的实际值。

## 工作流程

配置完成后，工作流程如下：

1. **推送代码到 master 分支**
2. **GitHub Actions 自动触发**
3. **并行运行三个测试任务**：
   - Frontend Tests (Vitest)
   - Backend Tests (pytest)
   - Docker Build
4. **所有测试通过后**，自动触发 Koyeb 部署
5. **部署完成**

## 验证配置

1. 推送一个 commit 到 master 分支
2. 在 GitHub 仓库的 **Actions** 标签页查看运行状态
3. 确认所有测试通过后，`deploy` job 开始运行
4. 在 Koyeb 控制台查看部署状态

## 故障排查

### 问题：部署 job 没有运行

- 检查是否已关闭 Koyeb 的 Autodeploy
- 确认 `needs: [frontend, backend, docker]` 中的所有测试都通过
- 确认是在 `master` 分支的 `push` 事件，而不是 PR

### 问题：Koyeb API Token 错误

- 检查 GitHub Secrets 中的 `KOYEB_API_TOKEN` 是否正确
- 确认 Token 没有过期（Koyeb Token 通常不会过期，除非手动撤销）

### 问题：应用名称或服务名称错误

- 使用 `koyeb apps list` 和 `koyeb services list` 命令确认正确的名称
- 注意大小写和特殊字符

## 参考链接

- [Koyeb GitHub Actions](https://github.com/koyeb/action-git-deploy)
- [Koyeb API Documentation](https://www.koyeb.com/docs/developer/api)
