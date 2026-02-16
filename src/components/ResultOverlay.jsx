import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import QRCode from 'qrcode'
import FortuneCard from './FortuneCard'
import LandmarkVisualization from './LandmarkVisualization'

/**
 * ResultOverlay - displays Grok fortune results with Chinese-style design.
 * Auto-shares to backend and shows QR code. Dismissed by Space/Enter or click.
 */
export default function ResultOverlay({
  fortunes,  // { gemini: null, grok: {...} }
  pixelatedImage,
  visualizationData,
  onDismiss,
  onShareCreated,
  embedded = false,
  showTitle = true,
  showFooter = true,
}) {
  const [shareQr, setShareQr] = useState(null)
  const [shareUrl, setShareUrl] = useState('')
  const [vizModalOpen, setVizModalOpen] = useState(false)
  const lastSharedSignatureRef = useRef('')

  const activeFortune = fortunes?.grok
  const hasVisualization = Boolean(visualizationData?.landmarks?.length)

  // Auto-share: POST to /api/share and generate QR code
  useEffect(() => {
    if (!fortunes?.grok) return

    const shareSignature = JSON.stringify({
      face: fortunes.grok.face,
      career: fortunes.grok.career,
      blessing: fortunes.grok.blessing,
      pixelatedImage,
      hasViz: Boolean(visualizationData),
    })
    if (lastSharedSignatureRef.current === shareSignature) return
    lastSharedSignatureRef.current = shareSignature

    let cancelled = false

    async function autoShare() {
      try {
        const resp = await fetch('/api/share', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              pixelated_image: pixelatedImage || null,
              visualization_data: visualizationData || null,
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
        const qrDataUrl = await QRCode.toDataURL(shareUrl, {
          width: 200,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
        })
        console.log('[QR Code] Generated QR code for:', shareUrl)
        if (!cancelled) {
          setShareQr(qrDataUrl)
          setShareUrl(shareUrl)
          if (onShareCreated) onShareCreated(data.id)
        }
      } catch (err) {
        console.error('[QR Code] Share failed:', err)
      }
    }

    autoShare()
    return () => { cancelled = true }
  }, [fortunes, pixelatedImage, visualizationData, onShareCreated])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className={`${embedded ? 'h-full w-full' : 'absolute inset-0'} relative flex flex-col items-center p-4 sm:p-6 md:p-8 overflow-y-auto`}
      style={{ backgroundColor: '#141826' }}
    >
      <div className="absolute inset-0" style={{ backgroundColor: '#141826' }} aria-hidden="true" />
      {/* Scrollable content */}
      <div className="relative z-10 flex flex-col items-center justify-start w-full max-w-3xl gap-4 md:gap-5 pt-10 pb-6 px-3 sm:px-4 rounded-2xl border border-yellow-400/20" style={{ backgroundColor: '#141826' }}>

        {showTitle && (
          <>
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
          </>
        )}

        {/* Preview cards */}
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
          className="w-full max-w-3xl space-y-3 md:space-y-4"
        >
          <div className="rounded-xl border border-yellow-400/20 p-3" style={{ backgroundColor: '#141826' }}>
            <p className="text-xs text-yellow-300/70 font-serif-cn mb-2">面相特征检测结果</p>
            {hasVisualization ? (
              <button
                type="button"
                onClick={() => setVizModalOpen(true)}
                className="w-full max-w-[420px] mx-auto flex flex-col items-center text-left cursor-pointer"
                aria-label="查看面相轮廓大图"
              >
                <div className="w-full">
                  <LandmarkVisualization visualizationData={visualizationData} showLabel={false} showMeasurements={false} />
                </div>
                <p className="mt-1 text-[11px] text-yellow-300/70 font-serif-cn text-center">点击查看大图</p>
              </button>
            ) : (
              <p className="text-sm text-yellow-100/55 font-serif-cn">暂无轮廓数据</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div className="rounded-xl border border-yellow-400/20 p-3 flex flex-col items-center justify-center" style={{ backgroundColor: '#141826' }}>
              {pixelatedImage ? (
                <div className="relative p-1 rounded-xl bg-gradient-to-br from-yellow-400/30 via-red-600/20 to-yellow-400/30">
                  <img
                    src={pixelatedImage}
                    alt="像素画像"
                    className="w-44 h-44 sm:w-48 sm:h-48 rounded-lg"
                    style={{ imageRendering: 'pixelated' }}
                  />
                </div>
              ) : (
                <p className="text-sm text-yellow-100/55 font-serif-cn">生成中...</p>
              )}
              <p className="text-xs text-yellow-300/70 font-serif-cn mt-2">像素画像</p>
            </div>

            <div className="rounded-xl border border-yellow-400/20 p-3 flex flex-col items-center justify-center" style={{ backgroundColor: '#141826' }}>
              {shareQr ? (
                <>
                  <div className="relative p-2 rounded-xl border border-yellow-400/20" style={{ backgroundColor: '#1b1f31' }}>
                    <img
                      src={shareQr}
                      alt="分享二维码"
                      className="w-44 h-44 sm:w-48 sm:h-48 rounded-lg bg-white"
                    />
                  </div>
                  <span className="mt-1 text-[11px] text-yellow-200/55 font-serif-cn">扫码获取更详细的 AI 解读</span>
                  {shareUrl && (
                    <a
                      href={shareUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-yellow-300/80 underline underline-offset-2 hover:text-yellow-200 transition-colors font-en"
                    >
                      直接访问链接
                    </a>
                  )}
                </>
              ) : (
                <p className="text-sm text-yellow-100/55 font-serif-cn">生成中...</p>
              )}
            </div>
          </div>
        </motion.div>

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
          按空格键或点击此处继续下一位 →
        </motion.button>
      </div>

      {showFooter && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-4 z-10 text-xs text-gray-600 font-serif-cn"
        >
          Superlinear Academy · 马年大吉
        </motion.p>
      )}

      {vizModalOpen && hasVisualization && (
        <div
          className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="面相轮廓图大图"
          onClick={() => setVizModalOpen(false)}
        >
          <div
            className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-yellow-400/30 bg-[#0d1224] p-4 sm:p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3 gap-3">
              <h3 className="font-serif-cn text-yellow-200 text-base sm:text-lg">现场速览 · 面相轮廓与测量</h3>
              <button
                type="button"
                onClick={() => setVizModalOpen(false)}
                className="px-2.5 py-1 text-xs rounded border border-yellow-400/30 text-yellow-200/80 hover:bg-white/10 cursor-pointer"
              >
                关闭
              </button>
            </div>
            <LandmarkVisualization visualizationData={visualizationData} />
          </div>
        </div>
      )}
    </motion.div>
  )
}
