import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import QRCode from 'qrcode'
import FortuneCard from './FortuneCard'
import LandmarkVisualization from './LandmarkVisualization'

function SkeletonBox({ style }) {
  return <div className="skeleton w-full" style={style} />
}

export default function ResultOverlay({
  fortunes,
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
  const [shareError, setShareError] = useState(false)
  const [vizModalOpen, setVizModalOpen] = useState(false)
  const lastSharedSignatureRef = useRef('')

  const activeFortune = fortunes?.grok
  const hasVisualization = Boolean(visualizationData?.landmarks?.length)

  useEffect(() => {
    if (!fortunes?.grok) return

    // Build signature to avoid duplicate shares (e.g. from parent re-renders)
    const shareSignature = JSON.stringify({
      face: fortunes.grok.face,
      career: fortunes.grok.career,
      blessing: fortunes.grok.blessing,
      pixelatedImage,
      hasViz: Boolean(visualizationData),
    })
    // Guard: skip if we already successfully shared this exact payload
    if (lastSharedSignatureRef.current === shareSignature) return

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
              grok: fortunes.grok
                ? { face: fortunes.grok.face, career: fortunes.grok.career, blessing: fortunes.grok.blessing }
                : null,
            },
          }),
        })
        if (!resp.ok) { if (!cancelled) setShareError(true); return }
        const data = await resp.json()
        const url = `${window.location.origin}/share/${data.id}`
        const qrDataUrl = await QRCode.toDataURL(url, {
          width: 200,
          margin: 2,
          color: { dark: '#1c1a16', light: '#ffffff' },
        })
        // Only record the signature after a successful share — this makes it
        // StrictMode-safe: if React cancels the first invocation, the signature
        // is never committed, so the second invocation proceeds normally.
        if (!cancelled) {
          lastSharedSignatureRef.current = shareSignature
          setShareQr(qrDataUrl)
          setShareUrl(url)
          if (onShareCreated) onShareCreated(data.id)
        }
      } catch (err) {
        console.error('[QR Code] Share failed:', err)
        if (!cancelled) setShareError(true)
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
      className={`${embedded ? 'h-full w-full' : 'absolute inset-0'} flex flex-col items-center p-4 sm:p-6 md:p-8 overflow-y-auto`}
      style={{ backgroundColor: 'var(--bg-base)' }}
    >
      <div className="w-full max-w-3xl flex flex-col gap-5 pt-4 pb-8">

        {showTitle && (
          <div className="flex flex-col items-center gap-3">
            <h2 className="font-calligraphy text-3xl sm:text-4xl" style={{ color: 'var(--text-primary)' }}>
              相面结果
            </h2>
            <div className="w-20 h-px" style={{ background: 'linear-gradient(90deg,transparent,var(--border-amber),transparent)' }} />
          </div>
        )}

        {/* Three-column grid: landmark viz | pixel avatar | QR code */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          {/* Landmark visualization */}
          <div className="flex flex-col items-center gap-2">
            {hasVisualization ? (
              <button
                type="button"
                onClick={() => setVizModalOpen(true)}
                className="w-full cursor-pointer rounded-xl overflow-hidden"
                style={{ border: '1px solid var(--border)' }}
                aria-label="查看面相轮廓大图"
              >
                <LandmarkVisualization visualizationData={visualizationData} showLabel={false} showMeasurements={false} />
              </button>
            ) : (
              <SkeletonBox style={{ aspectRatio: '3/4', minHeight: '6rem' }} />
            )}
            <span className="font-hei-cn text-xs" style={{ color: 'var(--text-muted)' }}>
              {hasVisualization ? '点击查看大图' : '面相轮廓'}
            </span>
          </div>

          {/* Pixel avatar */}
          <div className="flex flex-col items-center gap-2">
            {pixelatedImage ? (
              <img
                src={pixelatedImage}
                alt="像素画像"
                className="w-full rounded-xl"
                style={{ imageRendering: 'pixelated', border: '1px solid var(--border)', aspectRatio: '1/1', objectFit: 'cover' }}
              />
            ) : (
              <SkeletonBox style={{ aspectRatio: '1/1', minHeight: '6rem' }} />
            )}
            <span className="font-hei-cn text-xs" style={{ color: 'var(--text-muted)' }}>像素画像</span>
          </div>

          {/* QR code */}
          <div className="flex flex-col items-center gap-2">
            {shareQr ? (
              <a href={shareUrl} target="_blank" rel="noreferrer" className="w-full block">
                <img
                  src={shareQr}
                  alt="分享二维码"
                  className="w-full rounded-xl bg-white"
                  style={{ border: '1px solid var(--border)', aspectRatio: '1/1', objectFit: 'cover' }}
                />
              </a>
            ) : shareError ? (
              <div className="w-full rounded-xl flex items-center justify-center"
                style={{ aspectRatio: '1/1', minHeight: '6rem', border: '1px solid var(--border)', backgroundColor: 'var(--bg-raised)' }}>
                <span className="font-hei-cn text-[10px] text-center px-1" style={{ color: 'var(--text-muted)' }}>生成失败<br/>刷新重试</span>
              </div>
            ) : (
              <SkeletonBox style={{ aspectRatio: '1/1', minHeight: '6rem' }} />
            )}
            {shareUrl ? (
              <a href={shareUrl} target="_blank" rel="noreferrer"
                className="font-hei-cn text-[10px] underline underline-offset-2 text-center leading-tight"
                style={{ color: 'var(--amber)' }}>
                查看完整报告 →
              </a>
            ) : (
              <span className="font-hei-cn text-xs" style={{ color: 'var(--text-muted)' }}>分享二维码</span>
            )}
          </div>
        </div>

        {/* Share CTA — explains what's behind the QR */}
        {shareUrl ? (
          <div
            className="rounded-xl px-4 py-3.5 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4"
            style={{ backgroundColor: 'var(--bg-raised)', border: '1px solid var(--border-amber)' }}
          >
            <div className="flex-1 min-w-0">
              <p className="font-hei-cn text-xs font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>
                三大 AI 深度解读报告
              </p>
              <p className="font-hei-cn text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                扫码或点击，查看 <span className="font-en font-medium">Gemini</span>、<span className="font-en font-medium">DeepSeek</span>、<span className="font-en font-medium">Kimi</span> 三模型独立分析——
                性格特质、事业方向、潜在优势，多维视角交叉印证
              </p>
            </div>
            <a
              href={shareUrl}
              target="_blank"
              rel="noreferrer"
              className="font-hei-cn text-xs font-semibold whitespace-nowrap px-4 py-2 rounded-lg shrink-0 transition-opacity hover:opacity-80"
              style={{ backgroundColor: 'var(--text-primary)', color: 'var(--bg-card)' }}
            >
              立即查看 →
            </a>
          </div>
        ) : !shareError && (
          <div className="rounded-xl px-4 py-3 skeleton" style={{ height: '64px' }} />
        )}

        {/* Fortune card */}
        <AnimatePresence mode="wait">
          {activeFortune && <FortuneCard key="grok" fortune={activeFortune} />}
        </AnimatePresence>

        {showFooter && (
          <p className="text-center font-hei-cn text-xs" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>
            Superlinear Academy
          </p>
        )}
      </div>

      {/* Landmark modal */}
      {vizModalOpen && hasVisualization && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(28,26,22,0.55)', backdropFilter: 'blur(6px)' }}
          role="dialog"
          aria-modal="true"
          onClick={() => setVizModalOpen(false)}
        >
          <div
            className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl p-5"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-hei-cn font-semibold" style={{ color: 'var(--text-primary)' }}>
                面相轮廓与测量
              </h3>
              <button
                type="button"
                onClick={() => setVizModalOpen(false)}
                className="px-3 py-1 text-xs font-hei-cn rounded-lg cursor-pointer"
                style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
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
