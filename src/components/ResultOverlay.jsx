import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import FortuneCard from './FortuneCard'

const MODEL_TABS = [
  { key: 'gemini', label: 'Gemini' },
  { key: 'grok', label: 'Grok' },
]

/**
 * ResultOverlay - displays multi-model fortune results with Chinese-style design.
 * Default tab is Gemini, can switch to Grok.
 * Auto-shares to backend and shows QR code. Dismissed by Space/Enter or click.
 */
export default function ResultOverlay({
  fortunes,  // { gemini: {...}, grok: {...} }
  pixelatedImage,
  onDismiss,
}) {
  const [activeTab, setActiveTab] = useState('gemini')
  const [shareQr, setShareQr] = useState(null)

  // If gemini is null but grok exists, default to grok
  useEffect(() => {
    if (!fortunes?.gemini && fortunes?.grok) {
      setActiveTab('grok')
    }
  }, [fortunes])

  const activeFortune = fortunes?.[activeTab]
  const availableTabs = MODEL_TABS.filter((t) => fortunes?.[t.key])

  // Auto-share: POST to /api/share and generate QR code
  useEffect(() => {
    if (!fortunes) return
    let cancelled = false

    async function autoShare() {
      try {
        const resp = await fetch('/api/share', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pixelated_image: pixelatedImage || null,
            fortunes: {
              gemini: fortunes.gemini ? { face: fortunes.gemini.face, career: fortunes.gemini.career, blessing: fortunes.gemini.blessing } : null,
              grok: fortunes.grok ? { face: fortunes.grok.face, career: fortunes.grok.career, blessing: fortunes.grok.blessing } : null,
            },
          }),
        })
        if (!resp.ok) return
        const data = await resp.json()
        const shareUrl = `${window.location.origin}/share/${data.id}`
        const qrDataUrl = await QRCode.toDataURL(shareUrl, { width: 200, margin: 2 })
        if (!cancelled) setShareQr(qrDataUrl)
      } catch {
        // Share is best-effort
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
                    className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-lg"
                  />
                </div>
                <span className="text-xs text-yellow-400/50 font-serif-cn">扫码分享</span>
              </div>
            )}
          </motion.div>
        )}

        {/* Model tabs */}
        {availableTabs.length > 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex items-center gap-1 bg-white/5 rounded-lg p-1 border border-white/10"
          >
            {availableTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 cursor-pointer ${
                  activeTab === tab.key
                    ? 'bg-yellow-400/20 text-yellow-400 tab-active'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </motion.div>
        )}

        {/* Fortune text with Chinese styling */}
        <AnimatePresence mode="wait">
          {activeFortune && (
            <FortuneCard key={activeTab} fortune={activeFortune} />
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
