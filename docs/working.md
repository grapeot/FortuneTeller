# Working Log

## 2026-02-16

- 例行维护：复核 `docs/working.md` 是否遗漏近期改动，确认并补记本轮 L1 布局重排、超时参数调整、构建版本号注入与移动端指南目录优化，保证后续可追溯。
- L1（Grok）结果页版式调整：改为品字形三卡布局（上：面相特征检测大图；下左：像素画像；下右：二维码），移除“测量结果”卡片，并以下方 Fortune 文本宽度收窄整体容器：更新 `src/components/ResultOverlay.jsx`、`src/components/__tests__/ResultOverlay.test.jsx`。
- L1 覆盖层不透明度提高：结果页背景改为更深纯色（接近全遮挡），尽量不透出后景视频画面：更新 `src/components/ResultOverlay.jsx`。
- Grok 超时策略放宽：后端模型调用超时从 25s 调整到 40s；前端整体 AI 超时从 30s 调整到 50s，降低冷启动或弱网时误触发 fallback 概率：更新 `server/ai.py`、`src/lib/config.js`。
- 增加构建版本展示：右下角品牌文案改为 `Superlinear Academy, v...`；Docker 前端构建阶段默认注入 `VITE_BUILD_VERSION=$(date -u +%Y%m%d.%H%M%S)`（支持 `BUILD_VERSION` 覆盖）：更新 `src/App.jsx`、`src/lib/config.js`、`Dockerfile`、`README.md`。
- 相面学指南移动端交互优化：将原下拉选择改为 hamburger 目录抽屉（点击右上角“目录”弹出章节索引，可关闭、可点章节跳转），解决手机端滚动后无法便捷跳转问题：更新 `src/components/FaceReadingGuidePage.jsx`、`src/components/__tests__/FaceReadingGuidePage.test.jsx`。
- 修复短结果页反复创建分享链接问题：`onShareCreated` 的回调引用变化会触发 `ResultOverlay` 反复执行 `/api/share`，导致二维码“狂变”；已在 `App` 中改为 `ref` 去重，并在 `ResultOverlay` 增加分享签名去重，保证单次结果只发一次 share 请求：更新 `src/App.jsx`、`src/components/ResultOverlay.jsx`、`src/components/__tests__/ResultOverlay.test.jsx`。
- 顶部标题布局微调：模型轮播与 `AI相面` 改为右对齐并收紧左侧留白；底部右下角移除 `MediaPipe Face Detection` 文案，仅保留品牌：更新 `src/App.jsx`。
- CI 修复：后端测试 `tests/test_helpers.py::TestBuildEmailHtml::test_basic_output` 期望值仍是旧标题“相面先生”，与邮件模板新文案“AI相面”不一致；已更新断言并复跑前端/后端/Docker 流程。
- 新增短结果页浏览器历史能力：生成结果后写入 `history.state`（含 `shareId`），支持后退/前进恢复 overlay；不依赖 URL 参数：更新 `src/App.jsx`、`src/components/ResultOverlay.jsx`。
- 新增前端回归测试覆盖：验证 `history.state` 下结果页可恢复行为；并补充二维码创建回调测试：更新 `src/__tests__/AppHistory.test.jsx`、`src/components/__tests__/ResultOverlay.test.jsx`。
- 后端在 `/api/share` 写入成功后异步回填 Gemini L2（fire-and-forget），并在 `/api/analysis/l2` 统一走“优先缓存、未命中再生成再写回”逻辑：更新 `server/routes.py`。
- 分享页兼容优化：`/api/share/{id}` 返回 `analysis_l2` 时直接展示，不再重复调用 `/api/analysis/l2`；若无缓存仍保持实时生成 fallback：更新 `src/components/SharePage.jsx`、`src/components/__tests__/SharePage.test.jsx`。

- 根据现场反馈优化首页可读性：顶部标题改为黑体风格，`AI相面` 与模型名使用同字号体系并贴近排布；模型展示改为轮播单模型（`Gemini 3 Flash` / `DeepSeek` / `Kimi K2.5`），避免一次性长串文本：更新 `src/App.jsx`、`src/index.css`。
- 去掉主画面左右灯笼装饰，降低顶部噪点，避免误判为布局错位：更新 `src/App.jsx`。
- 将“开始相面”按钮从中部移到下边栏上方，并增加下边栏高度，避免遮挡预览主体：更新 `src/App.jsx`、`src/components/IdleOverlay.jsx`。
- 调整 IdleOverlay 测试用例以匹配按钮位置变更：更新 `src/components/__tests__/IdleOverlay.test.jsx`。
- 使用 Playwright 做本地移动端/桌面端截图复核，确认顶部栏与主内容不再相互挤压（临时截图输出到 `/tmp`）。
- 结果页可读性增强：短结果页背景改为完全不透明覆盖，移除“分享二维码”标题文案，交互提示改为“按空格键或点击此处继续下一位”：更新 `src/components/ResultOverlay.jsx`。
- 修复“面相特征检测结果”大图弹层在小屏不可滚动问题：为结果页和分享页弹层增加滚动能力（`overflow-y-auto` + `max-h`）：更新 `src/components/ResultOverlay.jsx`、`src/components/SharePage.jsx`。
- 邮件模板品牌文案统一：邮件头部“相面先生”调整为“AI相面”：更新 `server/email_service.py`。
- 讨论项（暂不改代码）：结果页 URL 回退与 Gemini 3 Flash 缓存/预回填方案，等待本轮 UX 全部稳定后单独设计。

## 2026-02-15

- 对齐印堂定义：将前端测量规则从三档（开阔/适中/较窄）扩展为四档（过宽/开阔/适中/较窄），并同步更新 `src/lib/face-annotator.js` 与 `docs/dev_face_recognition.md`。
- 新增测试覆盖“过宽”标签透传：更新 `src/lib/face-annotator.test.js`。
- 在结果页二维码文案下新增可点击直达链接，指向二维码对应的分享 URL：更新 `src/components/ResultOverlay.jsx` 与测试 `src/components/__tests__/ResultOverlay.test.jsx`。
- 首页布局重构为“上中下三段”：顶部标题+Tab、中部主内容、底部免责声明；并在出结果时直接替换预览区（不再半透明覆盖摄像头）：更新 `src/App.jsx`、`src/components/AppTabs.jsx`、`src/components/IdleOverlay.jsx`。
- 分享页按钮主次调整：强化“留邮箱获取三模型完整解读”按钮，弱化“我也要相面”按钮，减少误触：更新 `src/components/SharePage.jsx`。

## 踩坑与经验

- git 索引曾指向不可读对象，导致 `git diff` 失败；通过 `git restore --staged .` 清空暂存区后恢复可操作状态，后续仅按文件精确 `git add`。
- UI 重构时如果沿用“结果层叠加在预览之上”的结构，容易与“结果出现即隐藏预览”目标冲突；改为在 `App` 层做条件分支（结果态直接渲染结果页）更清晰。
- 动画节奏改动容易引起测试不稳定；涉及 `setInterval` 的测试应使用 fake timers + `act`，或在需求变更后删掉不再必要的轮播测试。
- 多轮需求迭代下，先保持“小步提交 + 单点回归测试”比一次性大改更稳，回滚与定位问题也更快。
- 对移动端布局问题，优先用自动化截图（如 Playwright）做前后对比，比只看 DOM/CSS 更快定位“看起来怪”的真实来源。
