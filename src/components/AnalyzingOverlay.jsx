import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'

const SCAN_TERMS = [
  '观天庭…',
  '察印堂…',
  '看山根…',
  '审五官…',
  '量三停…',
  '观颧骨…',
  '察法令…',
  '看田宅宫…',
  '审夫妻宫…',
  '综合论断…',
]

const CONCEPT_CARDS = [
  {
    heading: '三停',
    sub: '少年 · 中年 · 晚年',
    body: '额头到眉、眉到鼻准、鼻准到下巴——三段比例，对应人生三段运势。均衡者，一生平稳；各有偏重，自有命数。',
  },
  {
    heading: '478 个特征点',
    sub: 'MediaPipe 面部网格',
    body: '计算机视觉实时捕捉 478 个三维坐标，精确量化五眼宽度、三停比例、印堂间距……让古老相学有了现代度量。',
  },
  {
    heading: '十二宫位',
    sub: '各主一事',
    body: '命宫主运、财帛宫主财、官禄宫主事业、夫妻宫主感情……十二宫位布局面部，每处特征都是一扇窗。',
  },
  {
    heading: '三模型交叉验证',
    sub: 'Gemini · DeepSeek · Kimi',
    body: '同一张面、三套视角——用 AI 的方式重现相面先生"交叉印证"的核心方法论，结论更可信，洞察更全面。',
  },
  {
    heading: '科技与传统',
    sub: 'Superlinear AI 理念',
    body: '我们相信：当千年积累的观察智慧遇上现代 AI，不是替代，而是放大——让每个人都能得到一位有阅历的先生的指引。',
  },
]

export default function AnalyzingOverlay() {
  const [scanIndex, setScanIndex] = useState(0)
  const [cardIndex, setCardIndex] = useState(0)

  useEffect(() => {
    const scanTimer = setInterval(() => {
      setScanIndex((prev) => (prev + 1) % SCAN_TERMS.length)
    }, 3200)
    return () => clearInterval(scanTimer)
  }, [])

  useEffect(() => {
    const cardTimer = setInterval(() => {
      setCardIndex((prev) => (prev + 1) % CONCEPT_CARDS.length)
    }, 4500)
    return () => clearInterval(cardTimer)
  }, [])

  const card = CONCEPT_CARDS[cardIndex]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-5"
      style={{ backgroundColor: 'rgba(245,244,240,0.97)', backdropFilter: 'blur(8px)' }}
    >
      {/* Rotating rings */}
      <div className="relative w-32 h-32 shrink-0">
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ border: '1.5px solid rgba(28,26,22,0.10)' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute inset-3 rounded-full"
          style={{ border: '1px solid rgba(28,26,22,0.14)' }}
          animate={{ rotate: -360 }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute inset-6 rounded-full"
          style={{ border: '1px dashed rgba(155,107,42,0.35)' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 11, repeat: Infinity, ease: 'linear' }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-calligraphy text-4xl" style={{ color: 'var(--text-primary)' }}>相</span>
        </div>
      </div>

      {/* Scrolling scan term */}
      <div className="h-6 overflow-hidden flex items-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={scanIndex}
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -12, opacity: 0 }}
            transition={{ duration: 0.28 }}
            className="font-hei-cn text-sm text-center tracking-widest"
            style={{ color: 'var(--text-muted)' }}
          >
            {SCAN_TERMS[scanIndex]}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Concept card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={cardIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.45 }}
          className="w-full max-w-xs rounded-2xl px-5 py-4"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-baseline gap-2 mb-2">
            <span className="font-calligraphy text-base" style={{ color: 'var(--amber)' }}>{card.heading}</span>
            <span className="font-hei-cn text-[10px]" style={{ color: 'var(--text-muted)' }}>{card.sub}</span>
          </div>
          <p className="font-serif-cn text-xs leading-6" style={{ color: 'var(--text-secondary)' }}>
            {card.body}
          </p>
          {/* Progress dots */}
          <div className="flex justify-center gap-1.5 mt-3">
            {CONCEPT_CARDS.map((_, i) => (
              <span
                key={i}
                className="rounded-full transition-all duration-300"
                style={{
                  width: i === cardIndex ? '14px' : '4px',
                  height: '4px',
                  backgroundColor: i === cardIndex ? 'var(--amber)' : 'var(--border)',
                }}
              />
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}
