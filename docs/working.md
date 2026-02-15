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

### 验证结果
- 前端测试：`npm test` 全量通过（80 tests）。
- 前端构建：`npm run build` 通过。
- 后端语法：`python -m py_compile server/routes.py server/models.py` 通过。

### 下一步（按 dev_plan_v2 执行）
1. 实现三 Tab 容器与路由：相面 / 相面学指南 / 内部实现。
2. 实现相面学指南双栏导航与章节锚点跳转（基于 `Face_Reading_Mastery.md`）。
3. 实现内部实现页外链卡片（AI Builder Space / GitHub / 课程链接）。
4. 补齐对应前端测试（Tab 切换、目录跳转、链接可达）。
