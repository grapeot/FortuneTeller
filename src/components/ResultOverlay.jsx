import { motion } from 'framer-motion'

/**
 * ResultOverlay - displays the fortune result with the annotated face image.
 * Dismissed manually by pressing Space/Enter or clicking the dismiss hint.
 */
export default function ResultOverlay({ fortune, annotatedImage, onDismiss }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 overflow-y-auto"
    >
      {/* Title - mobile responsive */}
      <motion.h2
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-xl sm:text-2xl md:text-3xl text-yellow-400 font-bold mb-3 md:mb-4 shrink-0"
      >
        ✨ 您的算命结果 ✨
      </motion.h2>

      {/* Main content: annotated image + fortune text */}
      <div className="max-w-5xl w-full flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-8">

        {/* Annotated face image (left on desktop, top on mobile) */}
        {annotatedImage && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
            className="shrink-0"
          >
            <img
              src={annotatedImage}
              alt="面相分析"
              className="w-48 sm:w-56 md:w-64 lg:w-72 rounded-lg border-2 border-yellow-400/30 shadow-2xl"
            />
          </motion.div>
        )}

        {/* Fortune text - three sections */}
        <div className="text-center md:text-left space-y-3 md:space-y-4 flex-1 min-w-0">
          {/* Face reading */}
          <motion.p
            initial={{ x: -30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-yellow-200 font-bold leading-relaxed"
          >
            {fortune.face}
          </motion.p>

          {/* Career reading */}
          <motion.p
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-xl sm:text-2xl md:text-3xl lg:text-4xl text-white font-bold leading-relaxed text-glow"
          >
            {fortune.career}
          </motion.p>

          {/* Blessing */}
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.1 }}
            className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-red-400 font-bold leading-relaxed"
          >
            🎊 {fortune.blessing} 🎊
          </motion.p>
        </div>
      </div>

      {/* Dismiss hint */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        onClick={onDismiss}
        className="mt-6 md:mt-10 text-lg text-gray-400 hover:text-gray-200 transition-colors cursor-pointer shrink-0"
      >
        按 空格键 继续下一位 →
      </motion.button>

      {/* Brand footer */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-4 text-sm text-gray-500"
      >
        Powered by Superlinear Academy · 马年大吉
      </motion.p>
    </motion.div>
  )
}
