# Working Log

## 2026-02-16

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
