# 工作记录（持续更新）

## 2026-02-15

### 已完成
- 完成 standalone 可视化隐私改造：仅语义轮廓线、无真人像素、保留测量输出。
- 修正轮廓绘制语义分组，去除跨区域错误连线。
- 将颧骨强断言改为“横向三宽”趋势表达，降低误判风险。
- 将 Prompt 架构改为模板化：`guideline + evidence + task template`。
- 新增并更新开发计划文档：`docs/dev_plan_v2.md`（含三 Tab 设计与 Test Plan）。

### 本次更新
- 细化 `server/prompt_templates/parts/face_reading_guideline.txt`：
  - 新增“特征 -> 性格/阶段运势”具体映射；
  - 补充眉、眼、鼻、口、田宅宫、横向三宽、三停阶段窗口的具体解释模板；
  - 明确命运类措辞边界（倾向表达，禁止绝对断言）。

### 正在推进（无须人工交互）
- 已开始实现三 Tab 前端：
  - 新增 `AppTabs`；
  - 新增 `FaceReadingGuidePage`（左索引 + 右正文 + 章节跳转）；
  - 新增 `InsidePage`（三条外链卡片）。
- 已新增对应前端测试：
  - `AppTabs.test.jsx`
  - `FaceReadingGuidePage.test.jsx`
  - `InsidePage.test.jsx`

### 本轮新增落地（继续推进）
- `App.jsx` 已接入三 Tab 容器，支持 `?tab=guide` / `?tab=inside` 状态。
- 新增 L2 后端接口：`POST /api/analysis/l2`（按 share_id 生成/读取 Gemini 3 Flash 详版）。
- `SharePage` 已改为三层表达：
  - 现场速览（Grok）
  - 扫码详版（Gemini 3 Flash，异步拉取）
  - 邮箱三模型（Gemini 3 Flash / DeepSeek / Kimi K2.5）
- `ResultOverlay` 二维码提示文案已更新为“扫码获取 Gemini 3 Flash 详细解读”。
- 分享链路已支持结构化可视化存储：
  - `captureAndAnnotate` 返回 `visualizationData`（landmarks + contour_indices + measurements）；
  - `/api/share` 持久化 `visualization_data`；
  - `SharePage` 增加 `LandmarkVisualization`（SVG HTML 渲染），不依赖位图展示轮廓。
- 首页品牌区新增模型动态轮播：`Gemini 3 Flash / DeepSeek / Kimi K2.5`（`IdleOverlay`）。
- 指南页补充移动端目录跳转下拉（`章节跳转` select）。
- `App.jsx` 已对指南页/内部实现页启用懒加载（`React.lazy + Suspense`），减少首屏主包压力。
- 新增分享页回归测试：`visualization_data` 存在时，确保渲染 HTML/SVG 隐私轮廓图。
- 后端 API 测试已补齐：
  - `/api/share` 新增 `visualization_data` 持久化回归；
  - `/api/share/{id}` 新增 `visualization_data` 返回回归；
  - `/api/analysis/l2` 新增 5 组测试（无 token / 无 Firestore / share 不存在 / 缓存命中 / 新生成并写回缓存）。
- 按最新交互反馈完成 UI/文案修正：
  - 指南页 Markdown 行内语法支持（`**粗体**`、`*斜体*`、`` `代码` ``）已渲染为语义元素；
  - 内部实现页文案去掉“怎么做出来”引号并重写为更自然表达；
  - 首页将模型轮播并入主标题，改为 `{模型名} AI + 相面` 组合展示；
  - 轮播节奏放慢到 5 秒/次，移除“模型支持”单独提示行；
  - 为避免顶部 Tab 遮挡首页 Logo，已将首页主视觉块整体下移。

### 验证结果
- 前端测试：`npm test` 全量通过（83 tests）。
- 前端构建：`npm run build` 通过。
- 后端语法：`python -m py_compile server/routes.py server/models.py` 通过。
- 后端测试：`pytest tests/test_api.py` 通过（23 passed）。
- 前端测试：`npm test` 全量通过（83 passed）。

### 下一步（按 dev_plan_v2 执行）
1. 继续优化前端分包（若仍有 chunk 告警，拆分首屏逻辑与检测逻辑）。
2. 评估 `/api/analysis/l2` 在 AI 失败时的后端回退策略（当前依赖 `generate_deep_analysis` 的失败文案兜底）。
3. 清理仓库中与当前任务无关的历史改动（待确认来源后再处理）。
