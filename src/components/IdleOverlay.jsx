import { motion } from 'framer-motion'
import { BRAND } from '../lib/config'

/**
 * IdleOverlay - shown when the app is waiting for the user to start.
 * Displays title, face count indicator, privacy notice, and the start button.
 */
export default function IdleOverlay({ faceCount, isReady, onStart }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 flex flex-col items-center justify-between py-4 sm:py-8 md:py-12 pointer-events-none px-4"
    >
      {/* Top: Avatar + Title + subtitle */}
      <div className="text-center flex flex-col items-center">
        <img
          src="/assets/fortune-teller.jpg"
          alt="AI相面师"
          className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full border-2 sm:border-4 border-yellow-400/50 shadow-lg shadow-yellow-400/20 mb-2 sm:mb-3 md:mb-4 object-cover"
        />
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-yellow-400 text-glow tracking-wider">
          AI 相面师
        </h1>
        <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-yellow-200/80 mt-2 sm:mt-3">{BRAND.tagline}</p>
      </div>

      {/* Middle: Face detection status */}
      <div className="flex flex-col items-center gap-4">
        {faceCount > 0 ? (
          <p className="text-base sm:text-lg md:text-xl text-green-400 animate-pulse">
            ✨ 检测到 {faceCount} 张面相 ✨
          </p>
        ) : isReady ? (
          <p className="text-base sm:text-lg md:text-xl text-yellow-200/60">请面向摄像头...</p>
        ) : (
          <p className="text-base sm:text-lg md:text-xl text-yellow-200/60 animate-pulse">
            正在加载AI模型...
          </p>
        )}
      </div>

      {/* Bottom: Start button + Privacy notice */}
      <div className="pointer-events-auto flex flex-col items-center gap-3">
        <button
          onClick={onStart}
          disabled={!isReady}
          className="relative px-8 py-4 sm:px-12 sm:py-5 md:px-16 md:py-7 bg-red-600 hover:bg-red-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold rounded-xl sm:rounded-2xl shadow-2xl transition-all duration-200 hover:scale-105 active:scale-95 animate-pulse-ring"
        >
          开始相面
        </button>
        <p className="text-xs text-gray-500 max-w-xs text-center leading-relaxed">
          本过程会获取一帧影像用于面相分析，分析后立即销毁，不会保存。分享功能仅使用匿名化、像素化的风格图像。
        </p>
      </div>
    </motion.div>
  )
}
