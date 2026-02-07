# 自主决策记录 (Assumptions)

在独立实现过程中，我做了以下自主决策。如有不合适的地方请告诉我调整。

## 架构决策

1. **AI API 直连浏览器端调用**
   - Fortune 生成直接从浏览器 fetch 调用 AI Builder Space API，不经过后端代理
   - 理由：这是庙会现场的 kiosk 应用，只在一台机器上跑，token 暴露风险可控
   - 如果后续需要公开部署，应改为通过后端中转

2. **AI 调用 + 本地池双引擎**
   - AI 调用失败（网络、超时、解析错误）时自动 fallback 到本地随机池
   - AI 超时设为 8 秒；分析动画最少 2.5 秒
   - 实际等待时间 = max(2.5s, AI 响应时间)，上限 8 秒

3. **Grok 作为默认模型，可配置**
   - 通过 `VITE_AI_MODEL` 环境变量切换，支持 `grok-4-fast`、`gemini-3-flash-preview`、`gpt-5` 等
   - 默认 `grok-4-fast`

## UI/UX 决策

4. **结果展示时间改为 8 秒**（原先 6 秒）
   - AI 生成的文案通常比固定池更长，需要更多阅读时间
   - 现场体验优先，宁可展示久一些

5. **灯笼图片改为透明 PNG**
   - 重新用 Gemini 生成纯白底 → Pillow 抠图为透明 PNG
   - 白色像素阈值 230，边缘做了渐变透明度平滑处理
   - 提高灯笼在深色背景上的叠加效果（opacity 从 0.4 提升到 0.6）

6. **AI 生成来源标记**
   - 结果页右上角显示 "✦ AI Generated" 小标记（绿色，不太显眼）
   - 方便调试时确认是 AI 还是 fallback，正式使用时可以移除

7. **键盘快捷键保留**
   - Space / Enter 键触发算命，方便操作员使用

## 品牌

8. **全部署名改为 Superlinear Academy**
   - IdleOverlay 底部 watermark
   - ResultOverlay 底部 footer
   - 通过 `config.js` 中的 `BRAND.name` 集中管理

## 文案/Prompt 设计

9. **AI System Prompt 策略**
   - 给 AI 完整的上下文：微软庙会场景、马年、面相术语词库、微软黑话词库
   - 要求返回严格 JSON 格式，便于解析
   - temperature 设为 1.2（偏高），鼓励创意多样性
   - 每次请求都是独立的（无 conversation history），确保每次结果不同

10. **本地池保留完整内容**
    - 即使切换到 AI 生成，本地 fortune.js 的 8×15×10 池仍然保留
    - 作为可靠 fallback，也作为 AI prompt 中文案风格的参考
