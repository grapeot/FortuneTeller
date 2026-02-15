# 面相系统升级 PRD + RFC（评审稿）

本文档覆盖三个升级方向：
1) 隐私化可视化（仅关键点轮廓 + 保留测量）；
2) 面相知识 SOP 化并反哺 Prompt/推理链；
3) 用户流程从双层升级为三层（现场→扫码→邮箱三模型）。

当前阶段：**先完成可独立验证的脚本改造与文档建设，主业务代码后续按本 RFC 分批落地。**

---

## 一、PRD：行为与体验设计

### 1. 目标
- 提升隐私安全感：结果页与分享页不出现真实脸像素；
- 提升“准度感知”：增加结构化测量覆盖，输出证据链；
- 提升转化：通过分层内容深度，推动扫码与邮箱订阅。

### 2. 用户旅程（新版三层）

#### Layer 1：现场速览（保持快节奏）
- 输入：摄像头单帧 + landmark + 简版 prompt
- 输出：像素头像 + 轮廓可视化 + Grok 简版结论
- CTA：`扫码获取详细解读`

#### Layer 2：扫码详版（拉开信息差）
- 输入：同一份结构化事实包
- 输出：Gemini 3 Flash 详细报告 + 交叉验证说明
- CTA：`输入邮箱查看 DeepSeek、Grok、Gemini 三模型完整解读`

#### Layer 3：邮箱深度版（价值交付）
- 输入：share_id 关联事实包 + 三模型并行推理
- 输出：三份独立报告 + 聚合共识/分歧摘要（邮件送达）

### 3. 文案与品牌展示
- CTA 一次性明确三模型全名：DeepSeek、Grok、Gemini；
- App 名称区域可做动态轮播（一次显示一个模型，循环切换）；
- 视觉层“主标题简洁、模型名动态”，避免信息噪音。

### 4. 成功指标
- 扫码率（L1→L2）
- 邮箱提交率（L2→L3）
- 结果页平均停留时长
- 用户对“专业度/可信度”的主观评分

---

## 二、RFC：工程设计

## 1. 现状与问题
- 已有 `face-annotator.js`（前端）和 `tools/visualize_face.py`（离线脚本）两条可视化链路；
- 主链路已有隐私化方向，但 standalone 脚本此前仍依赖原图底图；
- 分享页与订阅流已存在，但模型分层和文案层级尚未工程化。

### 2. 目标架构（统一事实包）

```text
Capture -> Landmark Detection -> Measurement Engine -> Fact Bundle
                                              |-> L1 Prompt (Grok)
                                              |-> L2 Prompt (Gemini 3 Flash)
                                              |-> L3 Prompts (DeepSeek/Grok/Gemini)
                                              |-> HTML/SVG Wireframe Renderer
```

`Fact Bundle` 建议字段：
- `landmarks_norm`: `float32[N][2]`（N=478）
- `contour_indices`: 轮廓索引字典
- `measurements_v2`: 扩展测量 JSON
- `quality_flags`: 光照/遮挡/角度质量
- `version`: 数据与规则版本

### 3. 可视化：从图片存储转为 HTML 渲染

实现建议：
- 后端仅存 landmarks + measurements；
- 前端分享页实时渲染 SVG（或 Canvas）；
- 若需导出图片，客户端按需截图，不作为主存储。

存储估算（单条记录）：
- 478 点 * 2 维 * 4 字节（float32）约 3.8KB（原始）
- JSON 后通常 8-20KB（含元数据）
- 对比 JPG/PNG 常见 80KB-400KB，节省显著。

### 4. 发际线问题的工程解法
- 短期：使用“发际线估计点”（几何外推）修正上庭起点；
- 中期：增加轻量发丝分割（或前额头发边界检测）提升精度；
- 输出文案必须标记“估计”状态，避免伪确定性。

### 5. 测量扩展（coverage 提升）

在现有五项基础上新增：
- 面宽高比
- 双眼开合比（左右）
- 眉峰高低差
- 人中长度占脸高
- 口宽占眼距
- 下庭占脸高比例

输出分层策略：
- L1 显示核心 5+1 项（防信息过载）；
- L2/L3 全量使用，并给出证据置信度。

### 6. Prompt 编排与调用策略

建议把 prompt 模板拆为：
- `prompt_common_evidence.txt`（证据规则、风格约束）
- `prompt_l1_grok.txt`
- `prompt_l2_gemini_flash.txt`
- `prompt_l3_deepseek.txt` / `prompt_l3_grok.txt` / `prompt_l3_gemini.txt`

并统一注入：
- `fact_bundle`
- `measurement_summary`
- `uncertainty_flags`

### 7. API 与数据模型变更建议

新增字段（`/api/share` 写入、`/api/share/{id}` 返回）：
- `visualization_data`：landmarks + contour_indices + measurements
- `summary_level`：`l1 | l2 | l3`
- `model_meta`：模型名、版本、生成时间

新增端点建议：
- `POST /api/analysis/l2`：按 share_id 生成 Gemini 详版
- `POST /api/analysis/l3`：触发三模型深度分析任务

### 8. 前端改造点（后续实施）
- `ResultOverlay.jsx`：二维码文案改为 L2 引导语；
- `SharePage.jsx`：默认展示 L2 详版 + 邮箱 CTA 指向三模型；
- 新增 `VisualizationCanvas/Svg` 组件：直接渲染 `visualization_data`；
- App 标题区域加入模型名轮播动效。

### 9. 分阶段实施计划

Phase A（已启动）
- standalone 脚本隐私化 + 扩展测量 + 发际线估计

Phase B（主链路数据化）
- 前后端接入 `Fact Bundle`
- 分享页改为 HTML/SVG 渲染

Phase C（三层体验）
- L1/L2/L3 prompt 分层上线
- 邮件三模型聚合上线

Phase D（评估与调参）
- 采集反馈
- 调整阈值、文案与转化策略

### 10. 风险与缓解
- 耳部特征不足：当前正脸 landmark 无法可靠支持，先降级；
- 发际线误差：短期“估计+标注”，中期接入分割；
- 模型风格漂移：通过固定输出 schema 与证据约束抑制；
- 前端性能：SVG 节点数控制在可见轮廓，避免全网格渲染。

---

## 三、本轮已完成（可立即验收）

- `tools/visualize_face.py` 已改为：
  - 不显示真人脸像素；
  - 仅绘制关键点轮廓线（无点标记）；
  - 保留并扩展测量；
  - 上庭改为“发际线估计”起点；
  - 可输出 measurements JSON。

验收样例：`test-assets/test-face-1-visualized-privacy.jpg`
