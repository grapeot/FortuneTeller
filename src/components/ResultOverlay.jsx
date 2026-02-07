import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

/**
 * ResultOverlay - displays the fortune result with animations.
 *
 * @param {{ fortune: { face: string, career: string, blessing: string } }} props
 */
export default function ResultOverlay({ fortune, secondsLeft }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-8"
    >
      {/* Decorative top - horse icon */}
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        className="mb-4"
      >
        <img
          src="/assets/horse.jpg"
          alt=""
          className="w-24 h-24 rounded-full border-2 border-yellow-400/30 object-cover"
        />
      </motion.div>

      {/* Title */}
      <motion.h2
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-3xl text-yellow-400 font-bold mb-8"
      >
        ✨ 您的算命结果 ✨
      </motion.h2>

      {/* Fortune text - three sections */}
      <div className="max-w-4xl text-center space-y-4">
        {/* Face reading */}
        <motion.p
          initial={{ x: -40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-4xl text-yellow-200 font-bold leading-relaxed"
        >
          {fortune.face}
        </motion.p>

        {/* Career reading */}
        <motion.p
          initial={{ x: 40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-5xl text-white font-bold leading-relaxed text-glow"
        >
          {fortune.career}
        </motion.p>

        {/* Blessing */}
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.1 }}
          className="text-4xl text-red-400 font-bold leading-relaxed"
        >
          🎊 {fortune.blessing} 🎊
        </motion.p>
      </div>

      {/* Countdown */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="mt-12 text-lg text-gray-400"
      >
        {secondsLeft > 0 && `${secondsLeft}秒后返回`}
      </motion.div>

      {/* Brand footer */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-6 text-sm text-gray-500"
      >
        Powered by AI Course Developer · 马年大吉
      </motion.p>
    </motion.div>
  )
}
