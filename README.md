# AI 相面师 🔮

微软春节庙会互动应用——用 AI 给员工相面，基于面相学知识体系生成专业的面相分析与职场建议（融入微软文化黑话和马年祝福）。

## 功能

- **实时人脸检测**：MediaPipe Face Detection，浏览器端 WebAssembly + WebGL
- **478 点面部特征标注**：MediaPipe FaceLandmarker 检测面部关键特征点，绘制三停分区、十二宫位等面相学标注图
- **AI 面相分析**：调用 Grok（可切换 Gemini / GPT-5）基于真实面部照片和测量数据生成专业面相解读
- **职场扬长避短建议**：从面相推导性格优劣势，给出科技公司职场发展策略
- **像素头像生成**：AI Builder Space 图像编辑 API 生成像素风格卡通头像
- **分享功能**：结果页自动生成二维码，扫码可查看匿名化的相面结果（Firestore 存储）
- **三级 Fallback**：后端代理 → 前端直连 → 本地 1200 组合随机池
- **隐私保护**：原始面部图像仅用于分析后立即销毁，分享仅使用匿名化像素头像和面相标注图（不含真实人脸）

## 界面说明（当前）

- 主界面采用上中下三段：顶部标题+Tab、中部预览/结果区、底部免责声明区
- `开始相面` 按钮固定在下边栏上方，避免遮挡中部预览内容
- 顶部模型名为轮播展示（`Gemini 3 Flash` / `DeepSeek` / `Kimi K2.5`）
- 结果出现时直接替换预览区，不使用半透明覆盖

## 过程文档维护

- 日常改动与踩坑记录维护在 `docs/working.md`
- 性能与架构审查记录维护在 `docs/code_review.md`

## 技术栈

| 层 | 技术 |
|------|------|
| 前端 | React 19 · Vite · Tailwind CSS v4 · framer-motion |
| AI 文案 | Grok (via AI Builder Space) · 可配置切换模型 |
| AI 图像 | AI Builder Space `/v1/images/edits` · Pillow 像素化处理 |
| 人脸检测 | MediaPipe Face Detection + FaceLandmarker (WASM + WebGL) |
| 后端 | FastAPI (AI 代理 + 分享 API + 静态文件) |
| 存储 | Firebase Firestore (分享数据) |
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

# 3. 创建虚拟环境、安装后端依赖并启动（新终端）
uv venv .venv              # 若无 .venv 则创建（项目目录下，避免路径错乱）
source .venv/bin/activate  # 激活虚拟环境
uv pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001

# 4. 启动前端开发服务器
npm run dev       # 默认端口 5173，自动代理 /api → 8001
```

打开 http://localhost:5173 即可使用。

### 配置 Firebase（可选，启用分享功能）

1. 创建 Firebase 项目并启用 Firestore
2. 下载服务账号 JSON 密钥
3. 放置到 `config/firebase-credentials.json`（已被 .gitignore 忽略）
4. 或设置环境变量 `FIREBASE_CREDENTIALS`（JSON 内容）或 `FIREBASE_CREDENTIALS_PATH`（文件路径）

### 仅前端模式（无需后端）

如果不想启动后端，在 `.env` 中设置 `VITE_AI_API_TOKEN`，前端会直接调用 AI API：

```bash
npm run dev
```

注意：此模式下 token 会暴露在浏览器端，仅适合本地开发。

### 运行测试

```bash
npm test          # 运行所有测试
npm run test:watch  # 观察模式
```

## 部署到 AI Builder Space

部署通过 GitHub Actions CI/CD 流程自动触发：
1. 推送代码到 `master` 分支
2. GitHub Actions 运行所有测试（frontend、backend、docker）
3. 测试通过后自动部署到 Koyeb

```bash
# 推送到 GitHub（自动触发 CI/CD）
git push origin master
```

运行时环境变量（在 AI Builder Space 控制台设置）：
- `AI_BUILDER_TOKEN` — 自动注入
- `FIREBASE_CREDENTIALS` — Firestore 服务账号 JSON（启用分享功能）

Dockerfile 使用多阶段构建：Node.js 编译前端 → Python slim 运行 FastAPI。

## 项目结构

```
├── server/                # FastAPI 后端 (AI 代理 + 像素化 + 分享 + 静态文件)
├── Dockerfile             # 多阶段构建
├── index.html             # 入口
├── vite.config.js         # Vite + Tailwind + dev proxy
├── src/
│   ├── main.jsx           # 路由 (/ → App, /share/:id → SharePage)
│   ├── App.jsx            # 主状态机 (IDLE → ANALYZING → RESULT)
│   ├── hooks/
│   │   └── useFaceDetection.js  # MediaPipe hook
│   ├── lib/
│   │   ├── ai-fortune.js  # AI 文案生成 (三级 fallback)
│   │   ├── face-annotator.js  # 面部标注 + 测量 (FaceLandmarker)
│   │   ├── fortune.js     # 本地文案池 (1200 组合)
│   │   └── config.js      # 集中配置
│   └── components/
│       ├── CameraView.jsx
│       ├── IdleOverlay.jsx
│       ├── AnalyzingOverlay.jsx
│       ├── ResultOverlay.jsx  # 结果 + 自动分享 + 二维码
│       ├── SharePage.jsx      # 分享页面
│       └── QRCodeIcon.jsx
├── config/                # Firebase 凭据（gitignored）
├── docs/                  # 面相学知识库
├── public/assets/         # 视觉素材
├── test-assets/           # 测试用人脸图片
└── plan.md                # 完整方案文档
```

## 配置

通过环境变量配置（见 `.env.example`）：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `AI_BUILDER_TOKEN` | AI API 密钥（后端用） | — |
| `AI_MODEL` | AI 模型 | `grok-4-fast` |
| `AI_API_BASE_URL` | API 地址 | `https://space.ai-builders.com/backend/v1` |
| `FIREBASE_CREDENTIALS` | Firestore 服务账号 JSON（启用分享） | — |
| `FIREBASE_CREDENTIALS_PATH` | Firestore 凭据文件路径 | `config/firebase-credentials.json` |
| `PORT` | 服务端口（部署时由平台设置） | `8001` (dev) / `8000` (prod) |

## 隐私

- 摄像头仅在分析时获取一帧影像，分析后立即丢弃
- 面相标注图仅包含特征点线框，不含真实面部像素
- 分享功能使用 AI 生成的像素风格头像，无法识别真人身份
- 原始照片不会被保存、上传或存储

## Credits

- **Superlinear Academy**
- MediaPipe Face Detection & FaceLandmarker by Google
- AI Fortune Generation by Grok (X.AI) via AI Builder Space
