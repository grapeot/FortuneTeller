# 微软春节庙会AI算命方案

## 项目背景

### 基本信息
- **场合**：微软春节联欢会 - 庙会
- **身份**：赞助商（AI Course Developer，AI课程开发商）
- **时间**：明天（需快速部署）
- **地点**：庙会现场（流动人群，热闹喜庆）
- **受众**：微软员工（程序员为主）

### 核心需求
1. **强交互性**：观众能够深度参与，不只是看
2. **低门槛**：快速上手，不需长时间等待
3. **节日氛围**：结合春节元素，喜庆热闹
4. **品牌关联**：可结合AI Course Developer定位
5. **高能级**：适合庙会流动人群，快速参与
6. **多模态**：展示摄像头+视觉AI能力

---

## 产品需求文档（PRD）

### 产品概述
**产品名称**：AI算命师
**产品定位**：基于人脸分析的趣味AI算命游戏
**核心价值**：用微软黑话娱乐，展示AI多模态能力

### 目标用户
- **主要用户**：微软工程师、PM、产品经理
- **用户特点**：熟悉微软文化，对职级体系敏感，幽默感强
- **使用场景**：庙会现场，快速体验，多人围观

### 核心功能

#### 1. 待机模式
```
- 显示摄像头实时画面
- 实时人脸检测框
- 提示文字："AI算命师等您一卦"
- 背景音乐：轻快春节音乐
```

#### 2. AI算命
```
步骤1：人脸分析（2秒）
- 显示"正在分析您的面相..."
- 显示分析进度条
- 显示模拟分析数据（职级、气质、运势等）

步骤2：算命结果（3秒）
- 使用微软黑话进行趣味解读
- 随机生成算命文案（基于预设模板）
- 显示"算命结果"大标题

步骤3：祝福语（2秒）
- 春节祝福
- 品牌植入
```

### 算命文案设计

算命文案采用三段式结构：**面相观察 → 职业解读 → 马年祝福**。每段都应当能独立成立，组合后效果加倍。文案设计原则：只说好话（庙会场景没人想听坏消息），但好话要说得有趣、有层次，避免泛泛的"祝你成功"。

#### 面相观察句（第一段：建立"专业感"）
```
- "天庭饱满，眉宇开阔——"
- "眼神坚毅，颧骨挺拔——"
- "面相方正，下巴有力——"
- "印堂发亮，双目有神——"
- "鼻梁高挺，唇形方正——"
- "耳垂厚实，额头宽广——"
- "眉骨突出，目光深远——"
- "两颧饱满，神采奕奕——"
```

#### 职业解读句（第二段：微软黑话核心笑点）
```
# 职级类
- "必是L65以上的Principal！这骨相，Connect评分想低都难。"
- "一看就是Senior级别，写的Design Doc能当教材。"
- "L63体质，代码一把过，On-call从不翻车。"
- "面相至少L67，CVP见了都得客气三分。"
- "IC路线天花板体质！Staff Engineer转世。"
- "这是刚拿到Exceed Expectations的面相。"

# 职位类
- "天生SDE命格，架构图信手拈来。"
- "PM面相无疑——用户需求，一眼看穿。"
- "Manager气场拉满，1:1的时候下属都不敢摸鱼。"
- "Data Scientist骨相，P-value想不显著都难。"
- "这面相做Applied Scientist，paper产量翻倍。"

# 能力类
- "System Design面试官看了都想给Strong Hire。"
- "写Code Review Comments的气质，一针见血型。"
- "天生Oncall体质——但所有alert都是false positive。"
- "Sprint Planning的时候，Story Points估得又准又快。"
```

#### 马年祝福句（第三段：蛇年→马年过渡 + 程序员梗）
```
# 马年成语谐音梗
- "马到成功，新Feature一次上线！"
- "一马当先，Performance Review拿S！"
- "万马奔腾，Pipeline全绿！"
- "马年大吉，Bug全消，代码质量UP！"
- "龙马精神，Deploy从不Rollback！"

# 程序员祝福
- "新年PR秒Approve，零Comments！"
- "马年运势：prod零incident，pager从不响！"
- "祝您马年 git push --force 都不出事！"
- "新春快乐，Tech Debt今年全还清！"
- "马年offer满天飞，TC翻倍不是梦！"
```

#### 完整文案示例（三段拼接）
```
示例1："天庭饱满，眉宇开阔——必是L65以上的Principal！这骨相，Connect评分想低都难。马到成功，新Feature一次上线！"

示例2："眼神坚毅，颧骨挺拔——天生SDE命格，架构图信手拈来。一马当先，Performance Review拿S！"

示例3："印堂发亮，双目有神——System Design面试官看了都想给Strong Hire。马年大吉，Bug全消，代码质量UP！"

示例4："面相方正，下巴有力——PM面相无疑，用户需求一眼看穿。万马奔腾，Pipeline全绿！"

示例5："耳垂厚实，额头宽广——这是刚拿到Exceed Expectations的面相。龙马精神，Deploy从不Rollback！"

示例6："鼻梁高挺，唇形方正——Manager气场拉满，1:1的时候下属都不敢摸鱼。祝您马年 git push --force 都不出事！"
```

### 面相学术语速查（文案创作参考）

面相术语的核心价值是让随机生成的结果听起来有"专业感"。不需要真的懂面相学，只需要用对术语即可。

**常用术语 → 微软职场映射：**
- **天庭饱满**（额头宽广）→ 智慧型，Principal/Architect体质
- **印堂发亮**（两眉之间）→ 运势旺，今年有升职相
- **颧骨挺拔**（两颊骨）→ 执行力强，SDE/IC路线走得稳
- **鼻梁高挺** → 决策果断，Manager/Lead面相
- **双目有神** → 洞察力强，PM/产品思维
- **耳垂厚实** → 福气深厚，TC涨幅可观
- **下巴方正** → 意志力强，Oncall不翻车的体质

**文案生成逻辑：** 程序从上面三个池（面相观察句、职业解读句、马年祝福句）各随机抽一条拼接。池子足够大的情况下，重复概率低，且每条都能独立成立。

### 现场互动与气氛调动

#### 主持人话术方向

**开场吸引（待机模式）：**
- "来来来，AI算命师免费算一卦！看看您今年能不能升L63！"
- "微软黑话算命，看看您是SDE还是PM！"
- "马年运势预测，AI算命师等您来测！"
- "程序员专属算命，看看您的代码运势！"

**引导参与（有人走近）：**
- "有朋友过来了！AI算命师已经看到您了，要不要算一卦？"
- "来来来，站近一点，让AI算命师看清楚您的面相！"
- "别怕，AI算命师只看面相不看代码——您的Bug是安全的。"

**分析过程（分析中）：**
- "AI正在分析您的面相...看看您是L几的！"
- "正在扫描...检测到技术大牛气质！"
- "分析中...看看您今年能不能升职！"

**结果展示（算命结果）：**
- "哇！AI算命师说您是L65的Principal！"
- "看看看！AI说您今年Q1项目上线！"
- "不得了！AI预测您今年技术突破，薪资暴涨！"
- "AI算命师说您是PM面相，产品思维拉满！"

**互动引导（结果后）：**
- "怎么样？准不准？要不要再算一次？"
- "看看旁边同事的面相，对比一下！"
- "拍照发朋友圈，看看AI怎么说！"
- "扫码领AI课程优惠券，学AI，算得更准！"

#### 气氛调动策略

**1. 制造悬念**
- 分析过程中显示"正在检测职级..."，增加期待感
- 结果展示前有短暂停顿，制造悬念
- 可以显示"检测到特殊面相..."增加趣味

**2. 鼓励围观**
- 大屏幕显示，吸引路过的人围观
- 结果展示时，可以鼓励围观人群一起看
- 可以设计"围观模式"，多人一起看结果

**3. 互动游戏**
- 可以设计"猜职级"游戏：围观人群先猜，再看AI结果
- 可以设计"对比模式"：两个人一起算，对比结果
- 可以设计"挑战模式"：看看AI能不能猜对真实职级

**4. 拍照分享**
- 结果展示时，鼓励拍照分享
- 可以设计"算命证书"样式，方便分享
- 可以添加二维码，扫码查看详细结果

**5. 幽默互动**
- 如果AI说错了，主持人可以幽默化解："AI也有Bug的时候！"
- 可以设计"AI算命师也会出错"的梗
- 可以鼓励用户"纠正"AI，增加互动

**6. 品牌植入**
- 结果展示后，自然引导到AI课程
- "AI算命师建议：学AI，算得更准！"
- "扫码领AI课程优惠券，提升AI技能！"

#### 现场应急预案

**如果算命结果不够准确：**
- 主持人："AI也有Bug的时候，但娱乐第一！"
- 可以设计"AI算命师也会出错"的幽默梗

**如果现场冷场：**
- 主持人主动示范，自己先算一卦
- 可以邀请工作人员先算，吸引围观
- 可以设计"AI算命师自测"模式，展示AI能力

**如果技术故障：**
- 准备备用方案：手动算命模式
- 可以准备"AI算命师离线版"：预设文案随机展示
- 可以准备"AI算命师Demo版"：展示预设结果

#### 现场氛围营造

**视觉元素：**
- 大屏幕显示，吸引眼球
- 春节元素（马年、灯笼、祥云）增加节日氛围
- AI算命师形象（可选卡通形象）增加趣味性

**音效设计：**
- 待机模式：轻快春节音乐
- 检测到人脸：提示音效
- 分析过程：神秘音效
- 结果展示：欢快音效
- 祝福语：喜庆音效

**互动节奏：**
- 快速体验：每个用户2-3分钟完成
- 结果展示：3-5秒，然后自动返回待机
- 鼓励连续体验：可以设计"连续算命"模式

#### 传播策略

**现场传播：**
- 鼓励拍照分享朋友圈
- 可以设计"算命证书"样式，方便分享
- 可以添加二维码，扫码查看详细结果

**后续传播：**
- 可以录制"AI算命师Demo视频"
- 可以制作"AI算命师精彩瞬间"合集
- 可以设计"AI算命师挑战"：看看AI能不能猜对真实职级

### 视觉设计

#### 主界面
```
- 深色背景（科技感）
- 春节元素（马年、灯笼、祥云）
- AI算命师形象（可选卡通形象）
- 大屏幕友好（考虑围观人群）
```

#### 算命结果页面
```
- 大标题"您的算命结果"
- 算命文案（大字体，清晰可见）
- 背景动画（烟花、祥云等）
- 声音提示（欢快音效）
```

### 用户流程

```
用户走近大屏幕
    ↓
摄像头实时显示画面 + 人脸检测框
    ↓
用户点击"开始算命"按钮（或主持人触发）
    ↓
播放分析动画（2-3秒，显示面相术语滚动）
    ↓
显示算命结果（面相观察 + 职业解读 + 马年祝福）
    ↓
停留展示5秒 → 自动返回待机模式
```

### 非功能需求

#### 性能需求
- 人脸检测延迟 < 200ms
- 算命结果生成 < 1s
- 页面切换流畅，无卡顿

#### 兼容性需求
- 支持现代浏览器（Chrome/Edge最新版）
- 支持大屏幕显示（1920x1080及以上）
- 支持摄像头调用

#### 用户体验需求
- 操作简单，无需学习成本
- 流程完整，每步有明确提示
- 音效丰富，增强沉浸感

---

## 技术设计方案（RFC）

### 技术选型

| 层面 | 选择 | 备选 | 理由 |
|------|------|------|------|
| 前端框架 | **React 19** | — | 生态成熟，AI辅助编码效率最高 |
| 构建工具 | **Vite** | — | HMR快，零配置启动 |
| 样式 | **Tailwind CSS v4** | — | 原子化CSS，大屏适配快 |
| 人脸检测 | **MediaPipe Face Detection** | face-api.js | Google官方维护，WASM+GPU，延迟<200ms |
| 动画 | **framer-motion** | CSS transitions | React生态首选，声明式动画 |
| 部署 | **Vercel** | 本地 `npm run dev` | Git push即部署；庙会现场也可本地跑 |

**关于人脸检测的补充说明：** 本项目中人脸检测的核心作用是"表演性的"——在摄像头画面上画出检测框，让用户感觉AI在"分析"。算命结果本身是随机生成的，不依赖人脸数据。因此不需要landmark、表情识别等高级功能，MediaPipe的基础Face Detection（BlazeFace短距模型，~3MB）完全够用。备选face-api.js仅在MediaPipe加载失败时考虑。

### 系统架构

```
┌──────────────────────────────────────────────────┐
│     React App (Vite + Tailwind CSS)              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐ │
│  │  待机模式   │  │  分析动画   │  │  结果展示   │ │
│  │  (摄像头+   │→│  (面相术语  │→│  (三段式    │ │
│  │  检测框)    │  │   滚动)     │  │   文案)     │ │
│  └────────────┘  └────────────┘  └────────────┘ │
├──────────────────────────────────────────────────┤
│  MediaPipe Face Detection (WASM + WebGL)         │
│  @mediapipe/tasks-vision v0.10.x                 │
├──────────────────────────────────────────────────┤
│  Web Camera API (getUserMedia)                   │
├──────────────────────────────────────────────────┤
│  文案引擎：三个池随机抽取拼接                      │
│  面相观察句 × 职业解读句 × 马年祝福句              │
└──────────────────────────────────────────────────┘
```

### 核心模块

#### 1. 摄像头 + 人脸检测
```
输入：getUserMedia视频流
处理：MediaPipe FaceDetector.detectForVideo()
输出：检测框坐标（用于Canvas叠加绘制）
注意：检测仅用于视觉展示，不影响算命逻辑
```

#### 2. 状态机
```
IDLE（待机）→ ANALYZING（分析动画）→ RESULT（结果展示）→ IDLE
        ↑                                              │
        └──────────── 5秒自动返回 ──────────────────────┘

触发方式：用户点击按钮 / 主持人点击 / 键盘快捷键
```

#### 3. 文案引擎
```
三个独立文案池，随机各抽一条拼接：
  Pool A: 面相观察句（8条）
  Pool B: 职业解读句（15条）
  Pool C: 马年祝福句（10条）
组合数：8 × 15 × 10 = 1200种不重复结果
```

### 数据流程

```
摄像头视频流 → Canvas实时绘制
                ↓
    MediaPipe持续检测 → 画检测框（纯展示）
                ↓
    用户/主持人点击"开始算命"
                ↓
    播放分析动画（2-3秒）
    - 面相术语快速滚动
    - 进度条推进
    - 音效：神秘感
                ↓
    从三个文案池各随机抽一条 → 拼接
                ↓
    显示算命结果（framer-motion渐入）
    - 音效：欢快
                ↓
    停留5秒 → 自动返回待机
```

### 技术实现

#### 项目初始化
```bash
npm create vite@latest msft-fortune-teller -- --template react
cd msft-fortune-teller

npm install @mediapipe/tasks-vision framer-motion
npm install -D tailwindcss @tailwindcss/vite
```

#### 人脸检测 Hook
```jsx
// hooks/useFaceDetection.js
import { useRef, useEffect, useState, useCallback } from 'react'
import { FilesetResolver, FaceDetector } from '@mediapipe/tasks-vision'

export function useFaceDetection(videoRef, canvasRef) {
  const detectorRef = useRef(null)
  const [isReady, setIsReady] = useState(false)
  const animFrameRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    async function init() {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm'
      )
      if (cancelled) return

      detectorRef.current = await FaceDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        minDetectionConfidence: 0.5,
      })

      // 启动摄像头
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'user' },
      })
      if (cancelled) return

      videoRef.current.srcObject = stream
      await videoRef.current.play()
      setIsReady(true)
      detectLoop()
    }

    function detectLoop() {
      if (cancelled || !detectorRef.current || !videoRef.current) return
      const result = detectorRef.current.detectForVideo(
        videoRef.current,
        performance.now()
      )
      drawDetections(result.detections)
      animFrameRef.current = requestAnimationFrame(detectLoop)
    }

    function drawDetections(detections) {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (const det of detections) {
        const box = det.boundingBox
        ctx.strokeStyle = '#facc15' // Tailwind yellow-400
        ctx.lineWidth = 3
        ctx.strokeRect(box.originX, box.originY, box.width, box.height)
      }
    }

    init()

    return () => {
      cancelled = true
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((t) => t.stop())
      }
    }
  }, [videoRef, canvasRef])

  return { isReady }
}
```

#### 文案引擎
```jsx
// lib/fortune.js

const faceReadings = [
  '天庭饱满，眉宇开阔——',
  '眼神坚毅，颧骨挺拔——',
  '面相方正，下巴有力——',
  '印堂发亮，双目有神——',
  '鼻梁高挺，唇形方正——',
  '耳垂厚实，额头宽广——',
  '眉骨突出，目光深远——',
  '两颧饱满，神采奕奕——',
]

const careerReadings = [
  '必是L65以上的Principal！这骨相，Connect评分想低都难。',
  '一看就是Senior级别，写的Design Doc能当教材。',
  'L63体质，代码一把过，On-call从不翻车。',
  '面相至少L67，CVP见了都得客气三分。',
  'IC路线天花板体质！Staff Engineer转世。',
  '这是刚拿到Exceed Expectations的面相。',
  '天生SDE命格，架构图信手拈来。',
  'PM面相无疑——用户需求，一眼看穿。',
  'Manager气场拉满，1:1的时候下属都不敢摸鱼。',
  'Data Scientist骨相，P-value想不显著都难。',
  'System Design面试官看了都想给Strong Hire。',
  '写Code Review Comments的气质，一针见血型。',
  '天生Oncall体质——但所有alert都是false positive。',
  'Sprint Planning的时候，Story Points估得又准又快。',
  '这面相做Applied Scientist，paper产量翻倍。',
]

const blessings = [
  '马到成功，新Feature一次上线！',
  '一马当先，Performance Review拿S！',
  '万马奔腾，Pipeline全绿！',
  '马年大吉，Bug全消，代码质量UP！',
  '龙马精神，Deploy从不Rollback！',
  '新年PR秒Approve，零Comments！',
  '马年运势：prod零incident，pager从不响！',
  '祝您马年 git push --force 都不出事！',
  '新春快乐，Tech Debt今年全还清！',
  '马年offer满天飞，TC翻倍不是梦！',
]

const usedCombos = new Set()

export function generateFortune() {
  let combo
  // 避免短期内重复（1200种组合足够一次活动）
  do {
    const a = Math.floor(Math.random() * faceReadings.length)
    const b = Math.floor(Math.random() * careerReadings.length)
    const c = Math.floor(Math.random() * blessings.length)
    combo = `${a}-${b}-${c}`
  } while (usedCombos.has(combo) && usedCombos.size < 100)

  usedCombos.add(combo)
  const [a, b, c] = combo.split('-').map(Number)

  return {
    face: faceReadings[a],
    career: careerReadings[b],
    blessing: blessings[c],
    full: `${faceReadings[a]}${careerReadings[b]}${blessings[c]}`,
  }
}
```

#### 主界面组件
```jsx
// App.jsx
import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useFaceDetection } from './hooks/useFaceDetection'
import { generateFortune } from './lib/fortune'

const PHASES = { IDLE: 'idle', ANALYZING: 'analyzing', RESULT: 'result' }

export default function App() {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const { isReady } = useFaceDetection(videoRef, canvasRef)
  const [phase, setPhase] = useState(PHASES.IDLE)
  const [fortune, setFortune] = useState(null)

  const startFortune = () => {
    if (phase !== PHASES.IDLE) return
    setPhase(PHASES.ANALYZING)

    // 2.5秒分析动画后显示结果
    setTimeout(() => {
      setFortune(generateFortune())
      setPhase(PHASES.RESULT)

      // 5秒后自动返回待机
      setTimeout(() => {
        setPhase(PHASES.IDLE)
        setFortune(null)
      }, 5000)
    }, 2500)
  }

  return (
    <div className="relative h-screen w-screen bg-black overflow-hidden">
      {/* 摄像头画面 */}
      <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover mirror" autoPlay playsInline muted />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" width={1280} height={720} />

      {/* 待机模式 */}
      {phase === PHASES.IDLE && (
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-20">
          <h1 className="text-6xl font-bold text-yellow-400 drop-shadow-lg mb-8">
            AI 算命师
          </h1>
          <button
            onClick={startFortune}
            disabled={!isReady}
            className="px-12 py-6 bg-red-600 hover:bg-red-500 text-white text-3xl font-bold rounded-2xl shadow-2xl transition-all"
          >
            开始算命
          </button>
        </div>
      )}

      {/* 分析动画 */}
      <AnimatePresence>
        {phase === PHASES.ANALYZING && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center"
          >
            <p className="text-4xl text-yellow-400 animate-pulse">
              正在分析您的面相...
            </p>
            {/* 这里可以加面相术语快速滚动动画 */}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 算命结果 */}
      <AnimatePresence>
        {phase === PHASES.RESULT && fortune && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-12"
          >
            <h2 className="text-3xl text-yellow-400 mb-8">您的算命结果</h2>
            <p className="text-5xl text-white font-bold text-center leading-relaxed max-w-4xl">
              {fortune.full}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
```

#### Vercel 部署配置
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite"
}
```

**本地运行备选：** 庙会现场如果网络不稳定，也可以直接在笔记本上 `npm run dev`，浏览器全屏打开即可。MediaPipe 模型文件会在首次加载后被浏览器缓存。

### 开发计划

#### 第一阶段：项目搭建（30分钟）
- [ ] `npm create vite@latest` + React模板
- [ ] 安装依赖：`@mediapipe/tasks-vision`, `framer-motion`, `tailwindcss`
- [ ] Tailwind配置、基础布局
- [ ] Vercel连接GitHub仓库

#### 第二阶段：核心功能（2.5小时）
- [ ] 摄像头 + MediaPipe人脸检测（1小时）
- [ ] 状态机（IDLE → ANALYZING → RESULT → IDLE）（30分钟）
- [ ] 文案引擎（三池随机抽取）（30分钟）
- [ ] 结果展示页 + framer-motion动画（30分钟）

#### 第三阶段：打磨（1.5小时）
- [ ] 分析动画（面相术语滚动 + 进度条）（30分钟）
- [ ] 音效集成（30分钟）
- [ ] 大屏幕适配 + 视觉优化（30分钟）

#### 第四阶段：上线（30分钟）
- [ ] Vercel部署 + 现场摄像头测试

**总计约5小时**（含缓冲），可在半天内完成。

### 风险与应对

| 风险 | 影响 | 应对 |
|------|------|------|
| 摄像头权限被拒 | 无画面 | 提前在Chrome设置中允许；备用USB摄像头 |
| MediaPipe加载慢/失败 | 无检测框 | 降级为纯按钮触发模式（不影响核心算命功能） |
| 现场网络差 | 模型加载失败 | 提前缓存模型文件；或用本地 `npm run dev` |
| 大屏分辨率异常 | 布局错乱 | Tailwind响应式 + 现场调试 |
| 文案重复 | 体验差 | 1200种组合 + usedCombos去重 |

---

## 品牌植入

### AI Course Developer植入方式

#### 1. 算命文案植入
```
"马年大吉，AI Course Developer祝您技术突破！"
"新春快乐，来AI Course Developer学AI，天下我有！"
```

#### 2. 课程优惠植入
```
算命结束后显示：
"AI算命师建议：新学AI，扫码领AI课程优惠券"
```

#### 3. 技术展示
```
"基于MediaPipe + WebAssembly的实时人脸检测"
"完全在浏览器端运行，保护您的隐私"
```

---

## 实施建议

### 推荐方案：**AI算命师**

**理由：**
1. **互动性强**：用户主动参与，不是被动观看
2. **多模态展示**：摄像头+视觉AI，技术展示度高
3. **趣味性强**：微软黑话+算命，娱乐效果好
4. **节日氛围浓**：春节祝福+算命文化
5. **适合程序员**：无需尝试，直接看效果
6. **品牌植入自然**：算命文案+祝福语自然植入

### 备选方案
无，此方案为唯一推荐方案。

---

## 总结

**推荐方案：AI算命师**

**核心优势：**
1. 摄像头人脸检测，多模态交互
2. 微软黑话趣味算命，娱乐性强
3. 春节祝福+算命文化，节日气氛浓
4. 浏览器端运行，保护隐私
5. 快速体验，适合流动人群
6. 技术展示度高，符合品牌定位

**预期效果：**
- 热闹喜庆，符合庙会氛围
- 观众积极参与，不冷场
- 自然展示AI多模态能力
- 有效植入AI Course Developer品牌
- 后续可传播（算命录像、截图分享）

---

*创建时间：2026年2月6日*
*最后更新：2026年2月7日*
