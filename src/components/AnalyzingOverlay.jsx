import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'

// Face reading terms that scroll during analysis — traditional Chinese face reading terminology
const ANALYSIS_TERMS = [
  '观天庭...',
  '察印堂...',
  '看山根...',
  '审五官...',
  '量三停...',
  '观颧骨...',
  '察法令...',
  '看田宅宫...',
  '审夫妻宫...',
  '综合论断...',
]

/**
 * AnalyzingOverlay - shown during the analysis animation.
 * Shows scrolling face-reading terms and a progress bar, with Chinese styling.
 */
export default function AnalyzingOverlay() {
  const [currentTermIndex, setCurrentTermIndex] = useState(0)

  // Cycle through terms — interval doubled (1500ms → 3000ms) for slower pace
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTermIndex((prev) => (prev + 1) % ANALYSIS_TERMS.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="absolute inset-0 bg-gradient-to-b from-[#1a0a0a]/85 via-black/80 to-[#1a0a0a]/85 flex flex-col items-center justify-center gap-8"
    >
      {/* Scanning animation circle */}
      <div className="relative w-48 h-48">
        <motion.div
          className="absolute inset-0 rounded-full border-4 border-yellow-400/30"
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute inset-2 rounded-full border-2 border-dashed border-red-400/40"
          animate={{ rotate: -360 }}
          transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-calligraphy text-6xl text-yellow-400/80">相</span>
        </div>
      </div>

      {/* Title */}
      <h2 className="font-calligraphy text-3xl sm:text-4xl text-yellow-400 text-glow-warm tracking-wider">
        正在观面...
      </h2>

      {/* Scrolling terms */}
      <div className="h-10 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.p
            key={currentTermIndex}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="font-serif-cn text-xl sm:text-2xl text-yellow-200/70 text-center tracking-wide"
          >
            {ANALYSIS_TERMS[currentTermIndex]}
          </motion.p>
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
