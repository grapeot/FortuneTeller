import { useMemo, useRef, useState, useEffect } from 'react'
import masteryMarkdown from '../../docs/Face_Reading_Mastery.md?raw'

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function parseMarkdown(md) {
  const lines = md.split('\n')
  const sections = []
  let current = null

  for (const line of lines) {
    const m = line.match(/^(#{1,3})\s+(.+)$/)
    if (m) {
      if (current) sections.push(current)
      const level = m[1].length
      const title = m[2].trim()
      current = { id: `${slugify(title)}-${sections.length}`, title, level, lines: [] }
      continue
    }
    if (!current) continue
    current.lines.push(line)
  }
  if (current) sections.push(current)
  return sections
}

function renderInlineMarkdown(text) {
  const tokens = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g)
  return tokens.map((token, idx) => {
    if (!token) return null
    if (token.startsWith('**') && token.endsWith('**')) {
      return <strong key={idx} className="font-semibold" style={{ color: 'var(--text-primary)' }}>{token.slice(2, -2)}</strong>
    }
    if (token.startsWith('`') && token.endsWith('`')) {
      return (
        <code key={idx} className="px-1 py-0.5 rounded text-sm font-en"
          style={{ backgroundColor: 'var(--bg-raised)', color: 'var(--text-secondary)' }}>
          {token.slice(1, -1)}
        </code>
      )
    }
    if (token.startsWith('*') && token.endsWith('*')) {
      return <em key={idx} style={{ color: 'var(--text-secondary)' }}>{token.slice(1, -1)}</em>
    }
    return <span key={idx}>{token}</span>
  })
}

function renderLine(line, key) {
  if (!line.trim()) return <div key={key} className="h-3" />
  if (line.startsWith('---')) return <hr key={key} className="my-3" style={{ borderColor: 'var(--border)' }} />
  if (line.startsWith('- ')) {
    return (
      <li key={key} className="ml-5 list-disc font-serif-cn leading-7" style={{ color: 'var(--text-secondary)' }}>
        {renderInlineMarkdown(line.slice(2))}
      </li>
    )
  }
  if (/^\d+\.\s+/.test(line)) {
    return (
      <li key={key} className="ml-5 list-decimal font-serif-cn leading-7" style={{ color: 'var(--text-secondary)' }}>
        {renderInlineMarkdown(line.replace(/^\d+\.\s+/, ''))}
      </li>
    )
  }
  return (
    <p key={key} className="font-serif-cn leading-7 whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
      {renderInlineMarkdown(line)}
    </p>
  )
}

export default function FaceReadingGuidePage() {
  const sections = useMemo(() => parseMarkdown(masteryMarkdown), [])
  const toc = useMemo(() => sections.filter((s) => s.level <= 2), [sections])
  const [activeId, setActiveId] = useState(toc[0]?.id || '')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const contentRef = useRef(null)

  useEffect(() => {
    const container = contentRef.current
    if (!container) return
    const onScroll = () => {
      const scrollTop = container.scrollTop
      let picked = toc[0]?.id || ''
      for (const s of toc) {
        const el = container.querySelector(`#${s.id}`)
        if (el && el.offsetTop - 40 <= scrollTop) picked = s.id
      }
      setActiveId(picked)
    }
    container.addEventListener('scroll', onScroll)
    onScroll()
    return () => container.removeEventListener('scroll', onScroll)
  }, [toc])

  const jumpTo = (id) => {
    const container = contentRef.current
    if (!container) return
    const el = container.querySelector(`#${id}`)
    if (!el) return
    if (typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      container.scrollTop = el.offsetTop
    }
    setActiveId(id)
    setMobileMenuOpen(false)
    const url = new URL(window.location.href)
    url.hash = id
    window.history.replaceState({}, '', url.toString())
  }

  useEffect(() => {
    if (!window.location.hash) return
    const id = window.location.hash.slice(1)
    setTimeout(() => jumpTo(id), 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="h-full w-full pt-4 pb-6 px-4 sm:px-6 md:px-10" style={{ backgroundColor: 'var(--bg-base)' }}>
      <div
        className="mx-auto max-w-6xl h-full rounded-2xl overflow-hidden"
        style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)' }}
      >
        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] h-full">
          {/* TOC sidebar */}
          <aside
            className="hidden md:block overflow-y-auto p-4"
            style={{ borderRight: '1px solid var(--border)', backgroundColor: 'var(--bg-raised)' }}
          >
            <h2 className="font-hei-cn font-semibold text-base mb-3" style={{ color: 'var(--text-primary)' }}>章节索引</h2>
            <nav className="space-y-0.5">
              {toc.map((item) => {
                const active = activeId === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => jumpTo(item.id)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-sm font-hei-cn transition-colors cursor-pointer ${
                      item.level === 2 ? 'pl-5' : ''
                    }`}
                    style={{
                      backgroundColor: active ? 'var(--bg-hover)' : 'transparent',
                      color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                    }}
                  >
                    {item.title}
                  </button>
                )
              })}
            </nav>
          </aside>

          {/* Main content */}
          <main ref={contentRef} className="overflow-y-auto p-5 sm:p-6 md:p-8" style={{ backgroundColor: 'var(--bg-card)' }}>
            <div className="md:hidden mb-4 flex items-center justify-between gap-3">
              <h1 className="font-hei-cn font-semibold text-2xl" style={{ color: 'var(--text-primary)' }}>相面学指南</h1>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-hei-cn cursor-pointer"
                style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                aria-label="打开章节目录"
              >
                <span className="text-base leading-none">☰</span>
                <span>目录</span>
              </button>
            </div>

            <h1 className="hidden md:block font-hei-cn font-semibold text-2xl sm:text-3xl mb-4" style={{ color: 'var(--text-primary)' }}>
              相面学指南
            </h1>
            <p className="font-serif-cn text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
              基于 Face Reading Mastery 内容，支持按章节跳读。
            </p>

            {sections.map((s) => (
              <section key={s.id} id={s.id} className="mb-8 scroll-mt-4">
                {s.level === 1 && (
                  <h2 className="font-hei-cn font-semibold text-xl mb-3" style={{ color: 'var(--text-primary)' }}>{s.title}</h2>
                )}
                {s.level === 2 && (
                  <h3 className="font-hei-cn font-semibold text-lg mb-2" style={{ color: 'var(--text-primary)' }}>{s.title}</h3>
                )}
                {s.level === 3 && (
                  <h4 className="font-hei-cn font-medium text-base mb-2" style={{ color: 'var(--text-secondary)' }}>{s.title}</h4>
                )}
                <div className="space-y-1">{s.lines.map((line, idx) => renderLine(line, `${s.id}-${idx}`))}</div>
              </section>
            ))}
          </main>
        </div>
      </div>

      {/* Mobile TOC drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label="章节目录">
          <button
            type="button"
            className="absolute inset-0"
            style={{ backgroundColor: 'rgba(28,26,22,0.4)', backdropFilter: 'blur(4px)' }}
            onClick={() => setMobileMenuOpen(false)}
            aria-label="关闭章节目录"
          />
          <div
            className="absolute top-0 right-0 h-full w-[84%] max-w-xs p-4 overflow-y-auto"
            style={{ borderLeft: '1px solid var(--border)', backgroundColor: 'var(--bg-card)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-hei-cn font-semibold text-base" style={{ color: 'var(--text-primary)' }}>章节目录</h2>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="px-2 py-1 rounded font-hei-cn text-xs cursor-pointer"
                style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
              >
                关闭
              </button>
            </div>
            <nav className="space-y-1">
              {toc.map((item) => {
                const active = activeId === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => jumpTo(item.id)}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-sm font-hei-cn transition-colors cursor-pointer ${item.level === 2 ? 'pl-5' : ''}`}
                    style={{
                      backgroundColor: active ? 'var(--bg-raised)' : 'transparent',
                      color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                    }}
                  >
                    {item.title}
                  </button>
                )
              })}
            </nav>
          </div>
        </div>
      )}
    </div>
  )
}
