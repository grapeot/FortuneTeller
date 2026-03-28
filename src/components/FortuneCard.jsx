import { motion } from 'framer-motion'

function renderInlineMarkdown(text) {
  const tokens = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g)
  return tokens.map((token, idx) => {
    if (!token) return null
    if (token.startsWith('**') && token.endsWith('**')) {
      return <strong key={idx} style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{token.slice(2, -2)}</strong>
    }
    if (token.startsWith('`') && token.endsWith('`')) {
      return (
        <code key={idx} className="px-1 py-0.5 rounded text-xs font-en"
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

// Split "特质→建议" on → for visual emphasis in career list items
function renderCareerItem(text) {
  const arrowIdx = text.indexOf('→')
  if (arrowIdx === -1) return renderInlineMarkdown(text)
  const trait = text.slice(0, arrowIdx).trim()
  const advice = text.slice(arrowIdx + 1).trim()
  return (
    <>
      <span style={{ color: 'var(--amber)', fontWeight: 600 }}>{trait}</span>
      <span style={{ color: 'var(--text-muted)' }}>　→　</span>
      <span style={{ color: 'var(--text-primary)' }}>{renderInlineMarkdown(advice)}</span>
    </>
  )
}

function renderSection(text, sectionKey) {
  if (!text) return null
  const lines = text.split('\n')
  const elements = []
  let listBuffer = []

  const flushList = () => {
    if (listBuffer.length === 0) return
    elements.push(
      <ul key={`ul-${elements.length}`} className="flex flex-col gap-3 my-1">
        {listBuffer.map((item, i) => (
          <li key={i} className="flex gap-3 items-start">
            <span
              className="shrink-0 rounded-full mt-[0.55em]"
              style={{ width: '5px', height: '5px', backgroundColor: 'var(--amber)', display: 'inline-block' }}
            />
            <span className="font-hei-cn text-sm leading-7" style={{ color: 'var(--text-secondary)' }}>
              {sectionKey === 'career' ? renderCareerItem(item) : renderInlineMarkdown(item)}
            </span>
          </li>
        ))}
      </ul>
    )
    listBuffer = []
  }

  for (const line of lines) {
    const t = line.trim()
    if (!t) { flushList(); elements.push(<div key={`sp-${elements.length}`} className="h-1" />); continue }

    if (t.startsWith('### ')) {
      flushList()
      elements.push(
        <p key={`h3-${elements.length}`} className="font-hei-cn font-semibold text-xs tracking-widest mt-4 mb-1.5"
          style={{ color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
          {renderInlineMarkdown(t.slice(4))}
        </p>
      )
      continue
    }
    if (t.startsWith('## ')) {
      flushList()
      elements.push(
        <p key={`h2-${elements.length}`} className="font-hei-cn font-semibold text-sm mt-3 mb-1"
          style={{ color: 'var(--text-primary)' }}>
          {renderInlineMarkdown(t.slice(3))}
        </p>
      )
      continue
    }
    if (t.startsWith('- ')) {
      listBuffer.push(t.slice(2))
      continue
    }
    flushList()
    elements.push(
      <p key={`p-${elements.length}`} className="font-serif-cn text-sm leading-8" style={{ color: 'var(--text-secondary)' }}>
        {renderInlineMarkdown(t)}
      </p>
    )
  }
  flushList()
  return elements
}

export default function FortuneCard({ fortune }) {
  if (!fortune) return null

  const sections = [
    { key: 'face',   label: '观面', content: fortune.face },
    { key: 'career', label: '论事', content: fortune.career },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-3xl"
    >
      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)' }}
      >
        {sections.map((sec, i) => (
          <div key={sec.key}>
            {i > 0 && <div style={{ height: '1px', backgroundColor: 'var(--border)' }} />}
            <div className="px-5 sm:px-7 py-5 sm:py-6">
              <h3
                className="font-calligraphy text-base sm:text-lg mb-4"
                style={{ color: 'var(--amber)' }}
              >
                {sec.label}
              </h3>
              <div className={sec.key === 'career' ? 'flex flex-col gap-0.5' : ''}>
                {renderSection(sec.content, sec.key)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
