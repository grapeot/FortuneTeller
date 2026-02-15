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

### 下一步（按 dev_plan_v2 执行）
1. 实现三 Tab 容器与路由：相面 / 相面学指南 / 内部实现。
2. 实现相面学指南双栏导航与章节锚点跳转（基于 `Face_Reading_Mastery.md`）。
3. 实现内部实现页外链卡片（AI Builder Space / GitHub / 课程链接）。
4. 补齐对应前端测试（Tab 切换、目录跳转、链接可达）。
