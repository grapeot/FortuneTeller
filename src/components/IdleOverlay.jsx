import { motion } from 'framer-motion'

/**
 * IdleOverlay - shown when the app is waiting for the user to start.
 * Displays readiness status and start button.
 */
export default function IdleOverlay({ faceCount, isReady, onStart }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full w-full flex flex-col items-center justify-center pointer-events-none px-4"
    >
      <div className="text-center flex flex-col items-center">
        <img
          src="/assets/fortune-teller.jpg"
          alt="AI相面"
          className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full border-2 sm:border-4 border-yellow-400/50 shadow-lg shadow-yellow-400/20 mb-4 object-cover"
        />

        <div className="flex flex-col items-center gap-4">
          {faceCount > 0 ? (
            <p className="font-serif-cn text-base sm:text-lg md:text-xl text-green-400">
              ✨ 检测到 {faceCount} 张面相 ✨
            </p>
          ) : isReady ? (
            <p className="font-serif-cn text-base sm:text-lg md:text-xl text-yellow-200/60">请面向摄像头...</p>
          ) : (
            <p className="font-serif-cn text-base sm:text-lg md:text-xl text-yellow-200/60">
              正在加载<span className="font-en">AI</span>模型...
            </p>
          )}
        </div>

        <div className="pointer-events-auto flex flex-col items-center gap-3 mt-5">
          <button
            onClick={onStart}
            disabled={!isReady}
            className="relative px-8 py-4 sm:px-12 sm:py-5 md:px-16 md:py-7 bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-calligraphy text-2xl sm:text-3xl md:text-4xl lg:text-5xl rounded-xl sm:rounded-2xl shadow-2xl transition-all duration-200 hover:scale-105 active:scale-95 animate-pulse-ring tracking-widest"
          >
            开始相面
          </button>
        </div>
      </div>
    </motion.div>
  )
}
