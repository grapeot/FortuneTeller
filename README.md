# AI 算命师 🔮

微软春节庙会互动应用——用 AI 给员工"看面相"，生成趣味算命结果（融入微软文化黑话和马年祝福）。

## 功能

- **实时人脸检测**：MediaPipe Face Detection，浏览器端 WebAssembly + WebGL
- **AI 算命文案**：调用 Grok（可切换 Gemini / GPT-5）生成独一无二的面相解读
- **三段式结果**：面相观察 → 职业解读（微软黑话）→ 马年祝福
- **三级 Fallback**：后端代理 → 前端直连 → 本地 1200 组合随机池
- **春节视觉主题**：Gemini 生成的灯笼、祥云、金马、算命师头像

## 技术栈

| 层 | 技术 |
|------|------|
| 前端 | React 19 · Vite · Tailwind CSS v4 · framer-motion |
| AI | Grok (via AI Builder Space) · 可配置切换模型 |
| 人脸检测 | MediaPipe Face Detection (WASM + WebGL) |
| 后端 | FastAPI (薄代理，保护 API Token) |
| 部署 | Docker 多阶段构建 → AI Builder Space (Koyeb) |
| 测试 | Vitest · @testing-library/react |

## 快速开始

### 本地开发

```bash
# 1. 安装前端依赖
npm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env，填入 AI_BUILDER_TOKEN

# 3. 启动后端（新终端）
pip install -r requirements.txt
python server.py  # 默认端口 8001

# 4. 启动前端开发服务器
npm run dev       # 默认端口 5173，自动代理 /api → 8001
```

打开 http://localhost:5173 即可使用。

### 仅前端模式（无需后端）

如果不想启动后端，在 `.env` 中设置 `VITE_AI_API_TOKEN`，前端会直接调用 AI API：

```bash
npm run dev
```

注意：此模式下 token 会暴露在浏览器端，仅适合本地开发。

### 运行测试

```bash
npm test          # 运行所有 37 个测试
npm run test:watch  # 观察模式
```

### 人脸检测集成测试

```bash
npm run dev
# 浏览器打开 http://localhost:5173/test-face-detection.html
```

使用 Gemini 生成的测试人脸图片验证 MediaPipe 检测。

## 部署到 AI Builder Space

```bash
# 1. 推送到 GitHub
git push origin main

# 2. 通过 AI Builder Space API 部署
# AI_BUILDER_TOKEN 会自动注入为运行时环境变量
# 无需额外配置
```

Dockerfile 使用多阶段构建：Node.js 编译前端 → Python slim 运行 FastAPI。

## 项目结构

```
├── server.py              # FastAPI 后端 (AI 代理 + 静态文件)
├── Dockerfile             # 多阶段构建
├── index.html             # 入口
├── vite.config.js         # Vite + Tailwind + dev proxy
├── src/
│   ├── App.jsx            # 主状态机 (IDLE → ANALYZING → RESULT)
│   ├── hooks/
│   │   └── useFaceDetection.js  # MediaPipe hook
│   ├── lib/
│   │   ├── ai-fortune.js  # AI 文案生成 (三级 fallback)
│   │   ├── fortune.js     # 本地文案池 (1200 组合)
│   │   └── config.js      # 集中配置
│   └── components/
│       ├── CameraView.jsx
│       ├── IdleOverlay.jsx
│       ├── AnalyzingOverlay.jsx
│       └── ResultOverlay.jsx
├── public/assets/         # Gemini 生成的视觉素材
├── test-assets/           # 测试用人脸图片
├── tools/
│   ├── generate_assets.py # 素材批量生成
│   └── fix_lantern.py     # 灯笼透明化处理
└── plan.md                # 完整方案文档
```

## 配置

通过环境变量配置（见 `.env.example`）：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `AI_BUILDER_TOKEN` | AI API 密钥（后端用） | — |
| `AI_MODEL` | AI 模型 | `grok-4-fast` |
| `AI_API_BASE_URL` | API 地址 | `https://space.ai-builders.com/backend/v1` |
| `PORT` | 服务端口（部署时由平台设置） | `8001` (dev) / `8000` (prod) |

## 素材生成

项目包含两个 Python 工具，基于 Google Gemini 图像生成：

```bash
# 批量生成全部素材（测试人脸 + 装饰图）
python tools/generate_assets.py

# 单独修复灯笼（白底生成 → 透明化）
python tools/fix_lantern.py
```

## Credits

- **Superlinear Academy** — AI Course Developer
- MediaPipe Face Detection by Google
- AI Fortune Generation by Grok (X.AI) via AI Builder Space
