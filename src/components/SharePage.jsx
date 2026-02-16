import { useState, useEffect } from 'react'
import FortuneCard from './FortuneCard'
import LandmarkVisualization from './LandmarkVisualization'

function renderInlineMarkdown(text) {
  const tokens = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return tokens.map((token, idx) => {
    if (!token) return null
    if (token.startsWith('**') && token.endsWith('**')) {
      return <strong key={idx} className="text-yellow-100 font-semibold">{token.slice(2, -2)}</strong>
    }
    if (token.startsWith('`') && token.endsWith('`')) {
      return <code key={idx} className="px-1 py-0.5 rounded bg-black/35 text-yellow-200 text-xs">{token.slice(1, -1)}</code>
    }
    return <span key={idx}>{token}</span>
  })
}

function renderMarkdownBlock(markdown) {
  if (!markdown) return null
  const lines = markdown.split('\n')
  return lines.map((line, idx) => {
    const trimmed = line.trim()
    if (!trimmed) return <div key={idx} className="h-2" />
    if (trimmed.startsWith('### ')) {
      return <h4 key={idx} className="text-yellow-200 text-base font-serif-cn mt-2">{renderInlineMarkdown(trimmed.slice(4))}</h4>
    }
    if (trimmed.startsWith('## ')) {
      return <h3 key={idx} className="text-yellow-200 text-lg font-serif-cn mt-3">{renderInlineMarkdown(trimmed.slice(3))}</h3>
    }
    if (/^\d+\.\s+/.test(trimmed)) {
      return <p key={idx} className="text-yellow-100/85 text-sm leading-7">{renderInlineMarkdown(trimmed)}</p>
    }
    if (trimmed.startsWith('- ')) {
      return <p key={idx} className="text-yellow-100/85 text-sm leading-7">• {renderInlineMarkdown(trimmed.slice(2))}</p>
    }
    return <p key={idx} className="text-yellow-100/85 text-sm leading-7">{renderInlineMarkdown(trimmed)}</p>
  })
}

/**
 * SharePage - displays a shared Grok fortune result.
 * Accessed via /share/{id} URL.
 * Includes an email subscription form for deep analysis + community access.
 */
export default function SharePage({ shareId }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [l2Analysis, setL2Analysis] = useState('')
  const [l2Status, setL2Status] = useState('idle') // idle | loading | ready | error
  const [vizModalOpen, setVizModalOpen] = useState(false)
  const [vizModalLayer, setVizModalLayer] = useState('')

  // Override body overflow-hidden (set in index.html for the camera view)
  // so this page can scroll on mobile
  useEffect(() => {
    document.body.style.overflow = 'auto'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Email subscription form state
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [subscribeStatus, setSubscribeStatus] = useState('idle') // idle | submitting | success | error

  useEffect(() => {
    async function fetchShare() {
      try {
        const resp = await fetch(`/api/share/${shareId}`)
        if (!resp.ok) {
          setError(resp.status === 404 ? '分享链接已失效或不存在' : '加载失败，请稍后再试')
          return
        }
        const result = await resp.json()
        setData(result)

        // Layer 2: request detailed analysis (Gemini 3 Flash)
        setL2Status('loading')
        try {
          const l2Resp = await fetch('/api/analysis/l2', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ share_id: shareId }),
          })
          if (l2Resp.ok) {
            const l2 = await l2Resp.json()
            setL2Analysis(l2.analysis || '')
            setL2Status('ready')
          } else {
            setL2Status('error')
          }
        } catch {
          setL2Status('error')
        }
      } catch {
        setError('网络错误，请检查连接')
      } finally {
        setLoading(false)
      }
    }
    fetchShare()
  }, [shareId])

  async function handleSubscribe(e) {
    e.preventDefault()
    if (!email || !email.includes('@')) return
    setSubscribeStatus('submitting')
    try {
      const resp = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, share_id: shareId }),
      })
      if (resp.ok) {
        setSubscribeStatus('success')
      } else {
        setSubscribeStatus('error')
      }
    } catch {
      setSubscribeStatus('error')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a0a0a] to-[#0f0f23] flex items-center justify-center">
        <div className="font-calligraphy text-yellow-400 text-2xl animate-pulse">正在加载...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a0a0a] to-[#0f0f23] flex flex-col items-center justify-center gap-4 px-4">
        <p className="font-serif-cn text-yellow-200 text-lg">{error}</p>
        <a
          href="/"
          className="font-serif-cn text-yellow-400 underline hover:text-yellow-300 transition-colors"
        >
          去首页体验相面 →
        </a>
      </div>
    )
  }

  const activeFortune = data?.fortunes?.grok || null
  const hasVisualization = Boolean(data?.visualization_data?.landmarks?.length)

  const openVizModal = (layerLabel) => {
    setVizModalLayer(layerLabel)
    setVizModalOpen(true)
  }

  const closeVizModal = () => {
    setVizModalOpen(false)
    setVizModalLayer('')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a0a0a] via-[#0f0f23] to-[#1a0a0a] flex flex-col items-center p-4 sm:p-6 md:p-8 overflow-y-auto">
      <div className="flex flex-col items-center w-full max-w-3xl gap-5 py-8">

        {/* Title */}
        <h1 className="font-calligraphy text-3xl sm:text-4xl text-yellow-400 text-glow-warm tracking-wider">
          相面结果
        </h1>

        {/* Decorative divider */}
        <div className="w-48 h-px bg-gradient-to-r from-transparent via-yellow-400/60 to-transparent" />

        {/* Pixelated avatar */}
        {(data?.pixelated_image || hasVisualization) && (
          <div className="flex flex-wrap items-end justify-center gap-4">
            {data?.pixelated_image && (
              <div className="flex flex-col items-center gap-1">
                <div className="p-1 rounded-xl bg-gradient-to-br from-yellow-400/30 via-red-600/20 to-yellow-400/30">
                  <img
                    src={data.pixelated_image}
                    alt="像素画像"
                    className="w-28 h-28 sm:w-36 sm:h-36 rounded-lg"
                    style={{ imageRendering: 'pixelated' }}
                  />
                </div>
                <span className="text-xs text-yellow-400/50 font-serif-cn">像素画像</span>
              </div>
            )}

            {hasVisualization && (
              <button
                type="button"
                onClick={() => openVizModal('面相特征检测结果')}
                className="w-full max-w-sm text-left cursor-pointer"
                aria-label="查看面相轮廓大图"
              >
                <LandmarkVisualization visualizationData={data.visualization_data} />
                <p className="mt-1 text-[11px] text-yellow-300/70 font-serif-cn text-center">点击查看大图</p>
              </button>
            )}
          </div>
        )}

        {/* Fortune content (Layer 1 quick summary) */}
        {activeFortune ? (
          <div className="w-full">
            <h2 className="font-serif-cn text-yellow-300 text-base mb-2 text-center">现场速览（Grok）</h2>
            <FortuneCard fortune={activeFortune} />
          </div>
        ) : (
          <p className="font-serif-cn text-gray-400 text-center">该模型暂无结果</p>
        )}

        {/* Layer 2 detailed analysis */}
        <div className="w-full max-w-3xl mt-2 rounded-xl border border-yellow-400/15 bg-white/5 p-4 sm:p-5">
          <h2 className="font-serif-cn text-yellow-300 text-lg">Gemini 3 分析</h2>
          {l2Status === 'loading' && (
            <p className="mt-2 text-yellow-100/70 text-sm animate-pulse">正在生成详细解读...</p>
          )}
          {l2Status === 'ready' && l2Analysis && (
            <div className="mt-2">{renderMarkdownBlock(l2Analysis)}</div>
          )}
          {l2Status === 'error' && (
            <p className="mt-2 text-yellow-100/60 text-sm">详细解读生成暂时失败，请稍后刷新重试。</p>
          )}
        </div>

        {/* Decorative divider before form */}
        <div className="w-64 h-px bg-gradient-to-r from-transparent via-yellow-400/30 to-transparent mt-2" />

        {/* Email subscription form */}
        <div className="w-full max-w-md">
          {subscribeStatus === 'success' ? (
            <div className="text-center py-6 px-4 bg-white/5 rounded-xl border border-yellow-400/10">
              <p className="font-serif-cn text-yellow-100 text-base leading-relaxed">
                分析已提交，结果将在数分钟内发送至您的邮箱。
              </p>
              <p className="font-serif-cn text-yellow-100/60 text-sm mt-2">
                与此同时，您也会收到社区学员分享的项目更新。
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="flex flex-col items-center gap-3 px-2">
              <h3 className="font-serif-cn text-lg text-yellow-300/95 tracking-wide text-center leading-7">
                留下邮箱查看 <span className="font-en">Gemini 3 Flash</span>、<span className="font-en">DeepSeek</span>、<span className="font-en">Kimi K2.5</span> 三模型完整解读
              </h3>
              <p className="text-sm text-yellow-100/70 font-serif-cn text-center leading-relaxed px-1">
                留下邮箱后将收到三模型并行解读，并附共识与分歧视角，帮助你更全面理解结果。
              </p>
              <input
                type="email"
                required
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/15 rounded-lg text-yellow-100 placeholder-gray-500 text-sm font-serif-cn focus:outline-none focus:border-yellow-400/40 transition-colors"
              />
              <input
                type="text"
                placeholder="姓名/昵称（选填）"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/15 rounded-lg text-yellow-100 placeholder-gray-500 text-sm font-serif-cn focus:outline-none focus:border-yellow-400/40 transition-colors"
              />
              <button
                type="submit"
                disabled={subscribeStatus === 'submitting' || !email.includes('@')}
                className="w-full py-3 bg-yellow-400 hover:bg-yellow-300 border border-yellow-300 text-[#2a1a00] font-serif-cn font-semibold text-sm rounded-lg transition-all duration-200 shadow-[0_8px_24px_rgba(250,204,21,0.25)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {subscribeStatus === 'submitting' ? '提交中...' : '留邮箱获取三模型完整解读'}
              </button>
              {subscribeStatus === 'error' && (
                <p className="text-red-400 text-xs font-serif-cn">提交失败，请稍后重试</p>
              )}
              <p className="text-xs text-gray-500/70 font-serif-cn text-center leading-relaxed px-2">
                同时加入 <span className="font-en">Superlinear AI</span> 社区，免费获取前沿 <span className="font-en">AI</span> 资讯和实战干货。
              </p>
            </form>
          )}
        </div>

        {/* CTA */}
        <a
          href="/"
          className="mt-3 px-4 py-2 text-yellow-100/55 hover:text-yellow-100/80 text-sm font-serif-cn rounded-lg transition-colors underline underline-offset-4"
        >
          我也要相面 →
        </a>

        {/* Footer */}
        <p className="text-xs text-gray-600 mt-4 font-serif-cn">
          Superlinear Academy · 马年大吉
        </p>
      </div>

      {vizModalOpen && hasVisualization && (
        <div
          className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="面相轮廓图大图"
          onClick={closeVizModal}
        >
          <div
            className="w-full max-w-2xl rounded-2xl border border-yellow-400/30 bg-[#0d1224] p-4 sm:p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3 gap-3">
              <h3 className="font-serif-cn text-yellow-200 text-base sm:text-lg">{vizModalLayer} · 面相轮廓与测量</h3>
              <button
                type="button"
                onClick={closeVizModal}
                className="px-2.5 py-1 text-xs rounded border border-yellow-400/30 text-yellow-200/80 hover:bg-white/10 cursor-pointer"
              >
                关闭
              </button>
            </div>
            <LandmarkVisualization visualizationData={data.visualization_data} />
          </div>
        </div>
      )}
    </div>
  )
}
