import { useState, useEffect } from 'react'
import FortuneCard from './FortuneCard'
import LandmarkVisualization from './LandmarkVisualization'

const L2_RETRY_DELAY_MS = 5000
const sleep = ms => new Promise(r => setTimeout(r, ms))

function renderInlineMarkdown(text) {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((tok, i) => {
    if (!tok) return null
    if (tok.startsWith('**') && tok.endsWith('**'))
      return <strong key={i} style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{tok.slice(2, -2)}</strong>
    if (tok.startsWith('`') && tok.endsWith('`'))
      return (
        <code key={i} className="px-1 py-0.5 rounded text-xs font-en"
          style={{ backgroundColor: 'var(--bg-raised)', color: 'var(--text-secondary)' }}>
          {tok.slice(1, -1)}
        </code>
      )
    return <span key={i}>{tok}</span>
  })
}

function renderMarkdownBlock(md) {
  if (!md) return null
  return md.split('\n').map((line, i) => {
    const t = line.trim()
    if (!t) return <div key={i} className="h-2" />
    if (t.startsWith('### '))
      return <h4 key={i} className="font-hei-cn font-semibold text-sm mt-4 mb-1" style={{ color: 'var(--text-primary)' }}>{renderInlineMarkdown(t.slice(4))}</h4>
    if (t.startsWith('## '))
      return <h3 key={i} className="font-hei-cn font-semibold text-base mt-5 mb-1.5" style={{ color: 'var(--text-primary)' }}>{renderInlineMarkdown(t.slice(3))}</h3>
    if (t.startsWith('- '))
      return (
        <p key={i} className="font-serif-cn text-sm leading-7" style={{ color: 'var(--text-secondary)' }}>
          <span style={{ color: 'var(--amber)', marginRight: '0.35em' }}>·</span>{renderInlineMarkdown(t.slice(2))}
        </p>
      )
    return <p key={i} className="font-serif-cn text-sm leading-7" style={{ color: 'var(--text-secondary)' }}>{renderInlineMarkdown(t)}</p>
  })
}

export default function SharePage({ shareId }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [l2Analysis, setL2Analysis] = useState('')
  const [l2Status, setL2Status] = useState('idle')
  const [vizModalOpen, setVizModalOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [subscribeStatus, setSubscribeStatus] = useState('idle')

  useEffect(() => {
    document.body.style.overflow = 'auto'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    async function fetchShare() {
      try {
        const resp = await fetch(`/api/share/${shareId}`)
        if (!resp.ok) { setError(resp.status === 404 ? '分享链接已失效或不存在' : '加载失败，请稍后再试'); return }
        const result = await resp.json()
        setData(result); setLoading(false)
        if (result.analysis_l2) { setL2Analysis(result.analysis_l2); setL2Status('ready'); return }
        setL2Status('loading')
        let ok = false
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            const r = await fetch('/api/analysis/l2', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ share_id: shareId }) })
            if (r.ok) { const l2 = await r.json(); setL2Analysis(l2.analysis || ''); setL2Status('ready'); ok = true; break }
          } catch { /* retry */ }
          if (attempt < 2) await sleep(L2_RETRY_DELAY_MS)
        }
        if (!ok) setL2Status('error')
      } catch { setError('网络错误，请检查连接') } finally { setLoading(false) }
    }
    fetchShare()
  }, [shareId])

  async function handleSubscribe(e) {
    e.preventDefault()
    if (!email.includes('@')) return
    setSubscribeStatus('submitting')
    try {
      const resp = await fetch('/api/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, name, share_id: shareId }) })
      setSubscribeStatus(resp.ok ? 'success' : 'error')
    } catch { setSubscribeStatus('error') }
  }

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-base)' }}>
        <span className="text-sm font-hei-cn animate-pulse-soft" style={{ color: 'var(--text-muted)' }}>加载中…</span>
      </div>
    )

  if (error)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4" style={{ backgroundColor: 'var(--bg-base)' }}>
        <p className="font-serif-cn text-base" style={{ color: 'var(--text-secondary)' }}>{error}</p>
        <a href="/" className="font-hei-cn text-sm underline underline-offset-4" style={{ color: 'var(--text-muted)' }}>返回首页</a>
      </div>
    )

  const activeFortune = data?.fortunes?.grok || null
  const hasVisualization = Boolean(data?.visualization_data?.landmarks?.length)

  return (
    <div className="min-h-screen flex flex-col items-center px-4 sm:px-6 py-10" style={{ backgroundColor: 'var(--bg-base)' }}>
      <div className="w-full max-w-2xl flex flex-col gap-7">

        {/* Title */}
        <div className="flex flex-col items-center gap-3 pt-2">
          <h1 className="font-calligraphy text-3xl sm:text-4xl" style={{ color: 'var(--text-primary)' }}>相面结果</h1>
          <div className="w-20 h-px" style={{ background: 'linear-gradient(90deg,transparent,var(--border-amber),transparent)' }} />
        </div>

        {/* Avatar + viz */}
        {(data?.pixelated_image || hasVisualization) && (
          <div className="flex flex-wrap items-start justify-center gap-5">
            {data?.pixelated_image && (
              <div className="flex flex-col items-center gap-2">
                <img src={data.pixelated_image} alt="像素画像"
                  className="w-28 h-28 sm:w-36 sm:h-36 rounded-xl"
                  style={{ imageRendering: 'pixelated', border: '1px solid var(--border)' }} />
                <span className="font-hei-cn text-xs" style={{ color: 'var(--text-muted)' }}>像素画像</span>
              </div>
            )}
            {hasVisualization && (
              <button type="button" onClick={() => setVizModalOpen(true)} className="flex flex-col items-center gap-1 cursor-pointer">
                <div className="w-28 sm:w-36"><LandmarkVisualization visualizationData={data.visualization_data} showMeasurements={false} /></div>
                <span className="font-hei-cn text-xs" style={{ color: 'var(--text-muted)' }}>点击查看大图</span>
              </button>
            )}
          </div>
        )}

        {/* Layer 1 fortune */}
        {activeFortune && (
          <div>
            <p className="font-hei-cn text-xs uppercase tracking-widest mb-3 text-center" style={{ color: 'var(--text-muted)' }}>速览解读</p>
            <FortuneCard fortune={activeFortune} />
          </div>
        )}

        {/* Layer 2 deep analysis */}
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3 px-5 py-3.5" style={{ backgroundColor: 'var(--bg-raised)', borderBottom: '1px solid var(--border)' }}>
            <span className="font-calligraphy text-base" style={{ color: 'var(--amber)' }}>深度解读</span>
            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }} />
            <span className="font-hei-cn text-xs" style={{ color: 'var(--text-muted)' }}>Gemini 3 Flash</span>
          </div>
          <div className="px-5 py-4" style={{ backgroundColor: 'var(--bg-card)' }}>
            {l2Status === 'loading' && <p className="font-serif-cn text-sm animate-pulse-soft" style={{ color: 'var(--text-muted)' }}>正在生成详细解读…</p>}
            {l2Status === 'ready' && l2Analysis && renderMarkdownBlock(l2Analysis)}
            {l2Status === 'error' && <p className="font-serif-cn text-sm" style={{ color: 'var(--text-muted)' }}>详细解读生成暂时失败，请刷新重试。</p>}
          </div>
        </div>

        {/* Divider */}
        <div className="h-px" style={{ backgroundColor: 'var(--border)' }} />

        {/* Email subscription */}
        <div className="max-w-md mx-auto w-full">
          {subscribeStatus === 'success' ? (
            <div className="text-center py-8 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <p className="font-serif-cn text-base leading-relaxed" style={{ color: 'var(--text-primary)' }}>已提交，结果将发送至您的邮箱。</p>
              <p className="font-hei-cn text-sm mt-2" style={{ color: 'var(--text-muted)' }}>同时会收到社区项目更新。</p>
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="flex flex-col gap-3.5">
              <h3 className="font-hei-cn font-semibold text-lg text-center" style={{ color: 'var(--text-primary)' }}>获取三模型完整解读</h3>
              <p className="font-serif-cn text-sm text-center leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                <span className="font-en">Gemini 3 Flash</span>、<span className="font-en">DeepSeek</span>、<span className="font-en">Kimi K2.5</span> 并行解读，含共识与分歧视角。
              </p>
              {[
                { type: 'email', required: true, placeholder: 'your@email.com', value: email, onChange: e => setEmail(e.target.value) },
                { type: 'text', required: false, placeholder: '姓名/昵称（选填）', value: name, onChange: e => setName(e.target.value) },
              ].map((props, i) => (
                <input key={i} {...props}
                  className="w-full px-4 py-3 rounded-xl text-sm font-hei-cn outline-none transition-colors"
                  style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  onFocus={e => e.currentTarget.style.borderColor = 'var(--border-light)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
                />
              ))}
              <button type="submit"
                disabled={subscribeStatus === 'submitting' || !email.includes('@')}
                className="w-full py-3 rounded-xl font-hei-cn font-semibold text-sm transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: 'var(--text-primary)', color: 'var(--bg-card)' }}>
                {subscribeStatus === 'submitting' ? '提交中…' : '留邮箱获取完整解读'}
              </button>
              {subscribeStatus === 'error' && <p className="font-hei-cn text-xs text-center" style={{ color: '#b03030' }}>提交失败，请稍后重试</p>}
              <p className="font-hei-cn text-xs text-center leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                同时加入 <span className="font-en">Superlinear AI</span> 社区，获取前沿 AI 资讯。
              </p>
            </form>
          )}
        </div>

        <a href="/" className="mx-auto font-hei-cn text-sm underline underline-offset-4" style={{ color: 'var(--text-muted)' }}>
          我也要相面 →
        </a>
        <p className="text-center font-hei-cn text-xs pb-2" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>Superlinear Academy</p>
      </div>

      {vizModalOpen && hasVisualization && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(28,26,22,0.55)', backdropFilter: 'blur(6px)' }}
          role="dialog" aria-modal="true" onClick={() => setVizModalOpen(false)}>
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl p-5"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-hei-cn font-semibold" style={{ color: 'var(--text-primary)' }}>面相轮廓与测量</h3>
              <button type="button" onClick={() => setVizModalOpen(false)}
                className="px-3 py-1 text-xs font-hei-cn rounded-lg cursor-pointer"
                style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>关闭</button>
            </div>
            <LandmarkVisualization visualizationData={data.visualization_data} />
          </div>
        </div>
      )}
    </div>
  )
}
