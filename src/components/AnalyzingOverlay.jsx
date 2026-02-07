import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'

// Face reading terms that scroll during analysis
const ANALYSIS_TERMS = [
  '扫描天庭...',
  '分析眉骨...',
  '检测印堂...',
  '解读颧骨...',
  '测量鼻梁...',
  '识别耳垂...',
  '计算面相指数...',
  '匹配职级数据库...',
  '查询Connect评分...',
  '预测马年运势...',
]

/**
 * AnalyzingOverlay - shown during the 2.5s analysis animation.
 * Shows scrolling face-reading terms and a progress bar.
 */
export default function AnalyzingOverlay() {
  const [currentTermIndex, setCurrentTermIndex] = useState(0)
  const [progress, setProgress] = useState(0)

  // Cycle through terms
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTermIndex((prev) => (prev + 1) % ANALYSIS_TERMS.length)
    }, 400)
    return () => clearInterval(interval)
  }, [])

  // Animate progress bar
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 2, 100))
    }, 50)
    return () => clearInterval(interval)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center gap-8"
    >
      {/* Scanning animation circle */}
      <div className="relative w-48 h-48">
        <motion.div
          className="absolute inset-0 rounded-full border-4 border-yellow-400/30"
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute inset-2 rounded-full border-2 border-dashed border-yellow-400/50"
          animate={{ rotate: -360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-6xl">🔮</span>
        </div>
      </div>

      {/* Title */}
      <h2 className="text-4xl font-bold text-yellow-400 text-glow">
        正在分析您的面相...
      </h2>

      {/* Scrolling terms */}
      <div className="h-10 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.p
            key={currentTermIndex}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="text-2xl text-yellow-200/80 text-center"
          >
            {ANALYSIS_TERMS[currentTermIndex]}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Progress bar */}
      <div className="w-80 h-3 bg-gray-800 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-red-500 via-yellow-400 to-red-500 rounded-full"
          style={{ width: `${progress}%` }}
          transition={{ duration: 0.1 }}
        />
      </div>
    </motion.div>
  )
}
