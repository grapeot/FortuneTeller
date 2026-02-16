# 代码审查（性能与架构）

日期：2026-02-15
范围：`msft_game` 全仓静态审查（前端、后端、测试）

## 高优先级问题

### 1) 前端双检测循环常驻，CPU/GPU 压力大（高）

- 问题：`face detection` 与 `holistic detection` 同时跑 `requestAnimationFrame` 循环，且都做实时推理和绘制，容易导致掉帧、风扇转速升高、移动端发热。
- 证据：`src/App.jsx:47`、`src/App.jsx:52`、`src/hooks/useFaceDetection.js:140`、`src/hooks/useHolisticDetection.js:69`
- 建议：合并为单循环并做分频（如 holistic 每 2-3 帧），或者给骨架可视化加开关并默认关闭。

### 2) `faceCount` 每帧 setState，触发高频重渲染（高）

- 问题：检测循环中每帧调用 `setFaceCount`，会频繁触发上层组件与 overlay 更新。
- 证据：`src/hooks/useFaceDetection.js:148`、`src/App.jsx:211`
- 建议：仅在值变化时更新，或做 100-200ms 节流更新 UI。

### 3) AI 调用是串行 fallback，尾延迟风险高（高）

- 问题：先走后端代理，失败再走直连；若后端慢而非立即失败，会拖慢总体响应。
- 证据：`src/lib/ai-fortune.js:117`、`src/lib/ai-fortune.js:121`、`src/lib/ai-fortune.js:131`
- 建议：分阶段超时 + 竞速策略（如后端 3-5s 无首包则并发直连），并使用独立 `AbortController`。

### 4) 图片走 base64 JSON 多跳传输，开销偏大（高）

- 问题：图像在前后端与上游模型间多次 base64 编解码，体积膨胀与内存复制明显。
- 证据：`src/App.jsx:111`、`src/lib/ai-fortune.js:70`、`server/models.py:11`、`server/routes.py:124`、`server/ai.py:23`
- 建议：改为 `Blob/FormData` 上传，后端尽量走流式/临时对象 URL，减少 JSON 大字符串传递。

### 5) L2 分析接口存在缓存击穿窗口（高）

- 问题：`/api/analysis/l2` 在冷缓存并发场景会重复触发昂贵模型调用。
- 证据：`server/routes.py:282`、`server/routes.py:291`、`server/routes.py:295`
- 建议：加 `share_id` 级互斥（singleflight/事务锁/任务队列），确保同一 share 只计算一次。

## 中优先级问题

### 6) 后端 `httpx.AsyncClient` 重建频繁，连接复用不足（中）

- 问题：多个路由/服务内临时创建 client，影响 keep-alive 与连接池收益。
- 证据：`server/ai.py:46`、`server/ai.py:113`、`server/routes.py:127`、`server/routes.py:156`
- 建议：在 FastAPI 生命周期初始化共享 client，统一超时、重试、连接池参数。

### 7) 实时循环错误处理策略不统一（中）

- 问题：有的地方静默吞错，有的地方可能高频 warn，定位困难且可能日志噪声大。
- 证据：`src/hooks/useFaceDetection.js:151`、`src/hooks/useHolisticDetection.js:101`
- 建议：按错误类型分级；初始化失败直接上报并停止循环，帧级错误限频记录。

### 8) 前端异步请求缺少真正取消（中）

- 问题：组件卸载后主要依赖本地 `cancelled` 标记，网络请求本身未中止，仍消耗资源。
- 证据：`src/components/ResultOverlay.jsx:30`、`src/components/ResultOverlay.jsx:66`、`src/components/SharePage.jsx:31`
- 建议：统一接入 `AbortController`，在 cleanup 时 `abort()`，并做 in-flight 去重。

### 9) 检测模块通过 `window` 全局桥接，耦合偏高（中）

- 问题：`useFaceDetection` 与 `useHolisticDetection` 通过全局变量互相协作，可维护性/可测试性差。
- 证据：`src/hooks/useFaceDetection.js:74`、`src/hooks/useHolisticDetection.js:109`、`src/hooks/useHolisticDetection.js:119`
- 建议：改成显式数据流（共享 renderer 或 context/store），避免全局可变状态。

### 10) 关键性能与并发场景测试不足（中）

- 问题：hooks 性能行为、`/api/pixelate` 边界、`/api/analysis/l2` 并发击穿缺专项测试。
- 证据：`src/components/__tests__/SharePage.test.jsx:37`（以组件行为为主）；`tests/test_api.py:384`（未覆盖并发互斥）
- 建议：补三类测试：
  - hooks：状态更新频率与节流行为；
  - pixelate：大图输入、上游超时、失败降级；
  - l2：同 `share_id` 并发只触发一次模型调用。

## 建议的优先落地顺序

1. 先做前端检测循环降载（问题 1 + 2）。
2. 再做 AI 链路竞速与超时拆分（问题 3）。
3. 同步修 L2 并发互斥（问题 5）。
4. 后续分批治理传输格式与 client 复用（问题 4 + 6）。
