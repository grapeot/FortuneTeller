import { useState, useEffect } from 'react'
import FortuneCard from './FortuneCard'

/**
 * SharePage - displays a shared Grok fortune result.
 * Accessed via /share/{id} URL.
 * Includes an email subscription form for deep analysis + community access.
 */
export default function SharePage({ shareId }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

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

        {/* Fortune content */}
        {activeFortune ? (
          <FortuneCard fortune={activeFortune} />
        ) : (
          <p className="font-serif-cn text-gray-400 text-center">该模型暂无结果</p>
        )}

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
              <h3 className="font-calligraphy text-lg text-yellow-400/80 tracking-wide">
                接收 AI 深度面相分析
              </h3>
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
                className="w-full py-2.5 bg-yellow-400/15 hover:bg-yellow-400/25 border border-yellow-400/20 text-yellow-400 font-serif-cn text-sm rounded-lg transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {subscribeStatus === 'submitting' ? '提交中...' : '接收 AI 深度面相分析'}
              </button>
              {subscribeStatus === 'error' && (
                <p className="text-red-400 text-xs font-serif-cn">提交失败，请稍后重试</p>
              )}
              <p className="text-xs text-gray-500 font-serif-cn text-center leading-relaxed px-2">
                输入邮箱获取详细分析报告，并加入 Superlinear Academy AI 社区接收学员实战项目更新。社区邮件可随时退订。
              </p>
            </form>
          )}
        </div>

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
