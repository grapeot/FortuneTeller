import { motion } from 'framer-motion'

/**
 * IdleOverlay - shown when the app is waiting for the user to start.
 * Displays readiness status.
 */
export default function IdleOverlay({ faceCount, isReady }) {
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
      </div>
    </motion.div>
  )
}
