import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import QRCode from 'qrcode'

/**
 * ResultOverlay - displays the fortune result with pixelated avatar.
 * Auto-shares to backend and shows QR code. Dismissed by Space/Enter or click.
 */
export default function ResultOverlay({
  fortune,
  pixelatedImage,
  onDismiss,
}) {
  const hasImages = pixelatedImage
  const [shareQr, setShareQr] = useState(null)

  // Auto-share: POST to /api/share and generate QR code for the share URL
  useEffect(() => {
    if (!fortune) return
    let cancelled = false

    async function autoShare() {
      try {
        const resp = await fetch('/api/share', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pixelated_image: pixelatedImage || null,
            fortune: { face: fortune.face, career: fortune.career, blessing: fortune.blessing },
          }),
        })
        if (!resp.ok) return
        const data = await resp.json()
        const shareUrl = `${window.location.origin}/share/${data.id}`
        const qrDataUrl = await QRCode.toDataURL(shareUrl, { width: 200, margin: 2 })
        if (!cancelled) setShareQr(qrDataUrl)
      } catch {
        // Share is best-effort; don't break the experience
      }
    }

    autoShare()
    return () => { cancelled = true }
  }, [fortune, pixelatedImage])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="absolute inset-0 bg-black/85 flex flex-col items-center p-4 sm:p-6 md:p-8 overflow-y-auto"
    >
      {/* Scrollable content wrapper */}
      <div className="flex flex-col items-center justify-center min-h-full w-full max-w-5xl gap-4 md:gap-6 py-6">

        {/* Title */}
        <motion.h2
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-xl sm:text-2xl md:text-3xl text-yellow-400 font-bold shrink-0"
        >
          ✨ 您的相面结果 ✨
        </motion.h2>

        {/* Visual combo: Pixelated avatar + QR code side by side */}
        {(pixelatedImage || shareQr) && (
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
            className="flex flex-row items-center justify-center gap-4 md:gap-6 shrink-0"
          >
            {/* Pixelated avatar */}
            {pixelatedImage && (
              <div className="flex flex-col items-center gap-1">
                <div className="relative">
                  <img
                    src={pixelatedImage}
                    alt="像素头像"
                    className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 rounded-xl border-2 border-yellow-400/40 shadow-2xl"
                    style={{ imageRendering: 'pixelated' }}
                  />
                  {/* Decorative corner accent */}
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400/60 rounded-full blur-sm" />
                </div>
                <span className="text-xs text-gray-500 mt-1">像素画像</span>
              </div>
            )}

            {/* QR code with decorative styling */}
            {shareQr && (
              <div className="flex flex-col items-center gap-1">
                <div className="relative p-2 bg-white/10 rounded-xl border border-yellow-400/30 shadow-xl backdrop-blur-sm">
                  <img
                    src={shareQr}
                    alt="分享二维码"
                    className="w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-lg"
                  />
                  {/* Decorative corner accent */}
                  <div className="absolute -top-1 -left-1 w-3 h-3 bg-red-400/60 rounded-full blur-sm" />
                </div>
                <span className="text-xs text-gray-500 mt-1">扫码分享结果</span>
              </div>
            )}
          </motion.div>
        )}

        {/* Fortune text - three sections */}
        <div className="text-center space-y-3 md:space-y-4 max-w-3xl px-2">
          {/* Face reading */}
          <motion.p
            initial={{ x: -30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-base sm:text-lg md:text-xl lg:text-2xl text-yellow-200 font-bold leading-relaxed"
          >
            {fortune.face}
          </motion.p>

          {/* Career advice */}
          <motion.p
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-base sm:text-lg md:text-xl lg:text-2xl text-white font-bold leading-relaxed text-glow"
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

        {/* Dismiss hint */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          onClick={onDismiss}
          className="mt-4 text-lg text-gray-400 hover:text-gray-200 transition-colors cursor-pointer shrink-0"
        >
          按 空格键 继续下一位 →
        </motion.button>
      </div>

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
