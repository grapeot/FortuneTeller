import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import FortuneCard from './FortuneCard'

/**
 * ResultOverlay - displays Grok fortune results with Chinese-style design.
 * Auto-shares to backend and shows QR code. Dismissed by Space/Enter or click.
 */
export default function ResultOverlay({
  fortunes,  // { gemini: null, grok: {...} }
  pixelatedImage,
  onDismiss,
}) {
  const [shareQr, setShareQr] = useState(null)

  const activeFortune = fortunes?.grok

  // Auto-share: POST to /api/share and generate QR code
  useEffect(() => {
    if (!fortunes?.grok) return
    let cancelled = false

    async function autoShare() {
      try {
        const resp = await fetch('/api/share', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pixelated_image: pixelatedImage || null,
            fortunes: {
              gemini: null,
              grok: fortunes.grok ? { face: fortunes.grok.face, career: fortunes.grok.career, blessing: fortunes.grok.blessing } : null,
            },
          }),
        })
        if (!resp.ok) {
          const errorText = await resp.text()
          console.error('[QR Code] Share API failed:', resp.status, errorText)
          return
        }
        const data = await resp.json()
        console.log('[QR Code] Share API success:', data)
        const shareUrl = `${window.location.origin}/share/${data.id}`
        const qrDataUrl = await QRCode.toDataURL(shareUrl, { width: 200, margin: 2 })
        console.log('[QR Code] Generated QR code for:', shareUrl)
        if (!cancelled) setShareQr(qrDataUrl)
      } catch (err) {
        console.error('[QR Code] Share failed:', err)
      }
    }

    autoShare()
    return () => { cancelled = true }
  }, [fortunes, pixelatedImage])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="absolute inset-0 bg-gradient-to-b from-[#1a0a0a]/95 via-[#0f0f23]/90 to-[#1a0a0a]/95 flex flex-col items-center p-4 sm:p-6 md:p-8 overflow-y-auto"
    >
      {/* Scrollable content */}
      <div className="flex flex-col items-center justify-center min-h-full w-full max-w-4xl gap-4 md:gap-5 py-6">

        {/* Title - calligraphy style */}
        <motion.h2
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="font-calligraphy text-3xl sm:text-4xl md:text-5xl text-yellow-400 text-glow-warm tracking-wider shrink-0"
        >
          相面结果
        </motion.h2>

        {/* Decorative divider */}
        <div className="w-48 h-px bg-gradient-to-r from-transparent via-yellow-400/60 to-transparent" />

        {/* Visual combo: Pixelated avatar + QR code */}
        {(pixelatedImage || shareQr) && (
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
            className="flex flex-row items-center justify-center gap-4 md:gap-6 shrink-0"
          >
            {pixelatedImage && (
              <div className="flex flex-col items-center gap-1">
                <div className="relative p-1 rounded-xl bg-gradient-to-br from-yellow-400/30 via-red-600/20 to-yellow-400/30">
                  <img
                    src={pixelatedImage}
                    alt="像素画像"
                    className="w-28 h-28 sm:w-36 sm:h-36 md:w-40 md:h-40 rounded-lg"
                    style={{ imageRendering: 'pixelated' }}
                  />
                </div>
                <span className="text-xs text-yellow-400/50 font-serif-cn">像素画像</span>
              </div>
            )}

            {shareQr && (
              <div className="flex flex-col items-center gap-1">
                <div className="relative p-2 bg-white/10 rounded-xl border border-yellow-400/20 backdrop-blur-sm">
                  <img
                    src={shareQr}
                    alt="分享二维码"
                    className="w-28 h-28 sm:w-36 sm:h-36 md:w-40 md:h-40 rounded-lg"
                  />
                </div>
                <span className="text-xs text-yellow-400/50 font-serif-cn">多 AI 详细报告生成中，扫码获取</span>
              </div>
            )}
          </motion.div>
        )}

        {/* Fortune text with Chinese styling */}
        <AnimatePresence mode="wait">
          {activeFortune && (
            <FortuneCard key="grok" fortune={activeFortune} />
          )}
        </AnimatePresence>

        {/* Dismiss hint */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          onClick={onDismiss}
          className="mt-2 text-base text-gray-500 hover:text-gray-300 transition-colors cursor-pointer shrink-0 font-serif-cn"
        >
          按 空格键 继续下一位 →
        </motion.button>
      </div>

      {/* Brand footer */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-4 text-xs text-gray-600 font-serif-cn"
      >
        Superlinear Academy · 马年大吉
      </motion.p>
    </motion.div>
  )
}
