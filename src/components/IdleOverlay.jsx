import { motion } from 'framer-motion'
import { BRAND } from '../lib/config'

/**
 * IdleOverlay - shown when the app is waiting for the user to start.
 * Displays title, face count indicator, and the start button.
 */
export default function IdleOverlay({ faceCount, isReady, onStart }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 flex flex-col items-center justify-between py-12 pointer-events-none"
    >
      {/* Top: Avatar + Title + subtitle */}
      <div className="text-center flex flex-col items-center">
        <img
          src="/assets/fortune-teller.jpg"
          alt="AI算命师"
          className="w-24 h-24 rounded-full border-4 border-yellow-400/50 shadow-lg shadow-yellow-400/20 mb-4 object-cover"
        />
        <h1 className="text-7xl font-bold text-yellow-400 text-glow tracking-wider">
          AI 算命师
        </h1>
        <p className="text-2xl text-yellow-200/80 mt-3">{BRAND.tagline}</p>
      </div>

      {/* Middle: Face detection status */}
      <div className="flex flex-col items-center gap-4">
        {faceCount > 0 ? (
          <p className="text-xl text-green-400 animate-pulse">
            ✨ 检测到 {faceCount} 张面相 ✨
          </p>
        ) : isReady ? (
          <p className="text-xl text-yellow-200/60">请面向摄像头...</p>
        ) : (
          <p className="text-xl text-yellow-200/60 animate-pulse">
            正在加载AI模型...
          </p>
        )}
      </div>

      {/* Bottom: Start button */}
      <div className="pointer-events-auto">
        <button
          onClick={onStart}
          disabled={!isReady}
          className="relative px-16 py-7 bg-red-600 hover:bg-red-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-4xl font-bold rounded-2xl shadow-2xl transition-all duration-200 hover:scale-105 active:scale-95 animate-pulse-ring"
        >
          开始算命
        </button>
      </div>
    </motion.div>
  )
}
