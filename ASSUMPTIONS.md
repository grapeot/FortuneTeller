# 自主决策记录 (Assumptions)

在独立实现过程中，我做了以下自主决策。如有不合适的地方请告诉我调整。

## 架构决策

1. **后端代理模式（生产环境）**
   - 新增 `server.py` (FastAPI) 作为薄代理：`POST /api/fortune` 调用 AI API，token 留在服务端
   - 生产部署时，AI Builder Space 自动注入 `AI_BUILDER_TOKEN`，前端 JS 中不含任何密钥
   - 前端只调用相对路径 `/api/fortune`，无需知道 token

2. **三级 fallback 策略**
   - 优先级：后端代理 → 前端直连 API（仅本地开发）→ 本地随机池
   - 后端代理不可用时，如果 `VITE_AI_API_TOKEN` 存在则尝试直连（方便本地调试）
   - 全部失败则用 8×15×10 = 1200 组合的本地池

3. **Grok 作为默认模型，可配置**
   - 通过 `AI_MODEL` 环境变量切换，支持 `grok-4-fast`、`gemini-3-flash-preview`、`gpt-5` 等
   - 默认 `grok-4-fast`

4. **Dockerfile 多阶段构建**
   - Stage 1: Node.js 构建前端静态文件
   - Stage 2: Python slim 运行 FastAPI 服务
   - 使用 `${PORT:-8000}` shell form，兼容 Koyeb 动态端口

## UI/UX 决策

5. **结果展示时间 8 秒**（原先 6 秒）
   - AI 生成的文案通常比固定池更长，需要更多阅读时间

6. **灯笼图片改为透明 PNG**
   - Gemini 生成纯白底 → Pillow 抠图（阈值 230，边缘渐变平滑）
   - opacity 从 0.4 提升到 0.6

7. **AI 来源标记**
   - 结果页右上角显示 "✦ AI Generated" 小标记，方便调试

8. **键盘快捷键**
   - Space / Enter 触发算命，方便操作员使用

## 品牌

9. **署名 Superlinear Academy**
   - 通过 `config.js` 的 `BRAND` 对象集中管理

## 文案/Prompt 设计

10. **System Prompt**
    - temperature 1.2（偏高），鼓励创意多样性
    - 要求严格 JSON 返回，便于解析
    - 包含完整的微软黑话词库和马年成语词库

11. **本地池保留**
    - fortune.js 的完整内容池作为可靠 fallback 和 prompt 风格参考
