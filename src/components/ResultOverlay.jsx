import { motion } from 'framer-motion'

/**
 * ResultOverlay - displays the fortune result with animations.
 * Dismissed manually by pressing Space/Enter or clicking the dismiss hint.
 */
export default function ResultOverlay({ fortune, onDismiss }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8"
    >
      {/* Decorative top - horse icon - mobile responsive */}
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        className="mb-2 md:mb-4"
      >
        <img
          src="/assets/horse.jpg"
          alt=""
          className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full border-2 border-yellow-400/30 object-cover"
        />
      </motion.div>

      {/* Title - mobile responsive */}
      <motion.h2
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-xl sm:text-2xl md:text-3xl text-yellow-400 font-bold mb-4 md:mb-8"
      >
        ✨ 您的算命结果 ✨
      </motion.h2>

      {/* Fortune text - three sections - mobile responsive */}
      <div className="max-w-4xl text-center space-y-3 md:space-y-4 px-4">
        {/* Face reading */}
        <motion.p
          initial={{ x: -40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-xl sm:text-2xl md:text-3xl lg:text-4xl text-yellow-200 font-bold leading-relaxed"
        >
          {fortune.face}
        </motion.p>

        {/* Career reading */}
        <motion.p
          initial={{ x: 40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-white font-bold leading-relaxed text-glow"
        >
          {fortune.career}
        </motion.p>

        {/* Blessing */}
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.1 }}
          className="text-xl sm:text-2xl md:text-3xl lg:text-4xl text-red-400 font-bold leading-relaxed"
        >
          🎊 {fortune.blessing} 🎊
        </motion.p>
      </div>

      {/* Dismiss hint */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        onClick={onDismiss}
        className="mt-12 text-lg text-gray-400 hover:text-gray-200 transition-colors cursor-pointer"
      >
        按 空格键 继续下一位 →
      </motion.button>

      {/* Brand footer */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-6 text-sm text-gray-500"
      >
        Powered by Superlinear Academy · 马年大吉
      </motion.p>
    </motion.div>
  )
}
