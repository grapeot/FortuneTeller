import { useState, useEffect } from 'react'
import FortuneCard from './FortuneCard'

const MODEL_TABS = [
  { key: 'gemini', label: 'Gemini' },
  { key: 'grok', label: 'Grok' },
]

/**
 * SharePage - displays a shared fortune result with tabs for multi-model support.
 * Accessed via /share/{id} URL.
 */
export default function SharePage({ shareId }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('gemini')

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
        // Default to first available model
        if (result.fortunes) {
          if (!result.fortunes.gemini && result.fortunes.grok) {
            setActiveTab('grok')
          }
        }
      } catch {
        setError('网络错误，请检查连接')
      } finally {
        setLoading(false)
      }
    }
    fetchShare()
  }, [shareId])

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

  const fortunes = data?.fortunes || {}
  // Legacy support: if only fortune (not fortunes) exists
  const activeFortune = fortunes[activeTab] || null
  const availableTabs = MODEL_TABS.filter((t) => fortunes[t.key])

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a0a0a] via-[#0f0f23] to-[#1a0a0a] flex flex-col items-center p-4 sm:p-6 md:p-8">
      <div className="flex flex-col items-center w-full max-w-3xl gap-5 py-8">

        {/* Title */}
        <h1 className="font-calligraphy text-3xl sm:text-4xl text-yellow-400 text-glow-warm tracking-wider">
          相面结果
        </h1>

        {/* Decorative divider */}
        <div className="w-48 h-px bg-gradient-to-r from-transparent via-yellow-400/60 to-transparent" />

        {/* Pixelated avatar */}
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

        {/* Model tabs */}
        {availableTabs.length > 1 && (
          <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1 border border-white/10">
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
          </div>
        )}

        {/* Fortune content */}
        {activeFortune ? (
          <FortuneCard fortune={activeFortune} />
        ) : (
          <p className="font-serif-cn text-gray-400 text-center">该模型暂无结果</p>
        )}

        {/* CTA */}
        <a
          href="/"
          className="mt-4 px-6 py-3 bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white text-lg font-calligraphy rounded-xl shadow-xl transition-all duration-200 hover:scale-105 tracking-wider"
        >
          我也要相面 →
        </a>

        {/* Footer */}
        <p className="text-xs text-gray-600 mt-4 font-serif-cn">
          Superlinear Academy · 马年大吉
        </p>
      </div>
    </div>
  )
}
