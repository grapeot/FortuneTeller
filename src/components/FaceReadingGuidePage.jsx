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
      current = {
        id: `${slugify(title)}-${sections.length}`,
        title,
        level,
        lines: [],
      }
      continue
    }
    if (!current) continue
    current.lines.push(line)
  }

  if (current) sections.push(current)
  return sections
}

function renderLine(line, key) {
  if (!line.trim()) return <div key={key} className="h-3" />
  if (line.startsWith('---')) return <hr key={key} className="my-3 border-yellow-400/20" />
  if (line.startsWith('- ')) {
    return (
      <li key={key} className="ml-5 list-disc text-yellow-100/85 leading-7">
        {line.slice(2)}
      </li>
    )
  }
  if (/^\d+\.\s+/.test(line)) {
    return (
      <li key={key} className="ml-5 list-decimal text-yellow-100/85 leading-7">
        {line.replace(/^\d+\.\s+/, '')}
      </li>
    )
  }
  return (
    <p key={key} className="text-yellow-100/85 leading-7 whitespace-pre-wrap">
      {line}
    </p>
  )
}

export default function FaceReadingGuidePage() {
  const sections = useMemo(() => parseMarkdown(masteryMarkdown), [])
  const toc = useMemo(() => sections.filter((s) => s.level <= 2), [sections])
  const [activeId, setActiveId] = useState(toc[0]?.id || '')
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
    <div className="h-screen w-screen bg-gradient-to-b from-[#140c17] via-[#0f1024] to-[#11131c] pt-20 pb-6 px-4 sm:px-6 md:px-10">
      <div className="mx-auto max-w-6xl h-full rounded-2xl border border-yellow-400/20 bg-black/35 backdrop-blur overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] h-full">
          <aside className="hidden md:block border-r border-yellow-400/15 p-4 overflow-y-auto">
            <h2 className="font-serif-cn text-yellow-300 text-lg mb-3">章节索引</h2>
            <nav className="space-y-1">
              {toc.map((item) => {
                const active = activeId === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => jumpTo(item.id)}
                    className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors cursor-pointer ${
                      active ? 'bg-yellow-400/20 text-yellow-100' : 'text-yellow-100/65 hover:bg-white/10'
                    } ${item.level === 2 ? 'pl-5' : ''}`}
                  >
                    {item.title}
                  </button>
                )
              })}
            </nav>
          </aside>

          <main ref={contentRef} className="overflow-y-auto p-5 sm:p-6 md:p-8">
            <h1 className="font-calligraphy text-3xl sm:text-4xl text-yellow-300 text-glow-warm mb-4">相面学指南</h1>
            <p className="text-yellow-100/70 text-sm mb-6">基于 Face Reading Mastery 内容，支持按章节跳读。</p>

            <div className="md:hidden mb-5">
              <label htmlFor="chapter-select" className="block text-yellow-200/80 text-sm mb-2">章节跳转</label>
              <select
                id="chapter-select"
                className="w-full bg-black/40 border border-yellow-400/20 rounded-lg px-3 py-2 text-yellow-100"
                value={activeId}
                onChange={(e) => jumpTo(e.target.value)}
              >
                {toc.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.level === 2 ? `  - ${item.title}` : item.title}
                  </option>
                ))}
              </select>
            </div>

            {sections.map((s) => (
              <section key={s.id} id={s.id} className="mb-8 scroll-mt-4">
                {s.level === 1 && <h2 className="font-serif-cn text-2xl text-yellow-200 mb-3">{s.title}</h2>}
                {s.level === 2 && <h3 className="font-serif-cn text-xl text-yellow-100 mb-2">{s.title}</h3>}
                {s.level === 3 && <h4 className="font-serif-cn text-lg text-yellow-100/90 mb-2">{s.title}</h4>}
                <div className="space-y-1">{s.lines.map((line, idx) => renderLine(line, `${s.id}-${idx}`))}</div>
              </section>
            ))}
          </main>
        </div>
      </div>
    </div>
  )
}
