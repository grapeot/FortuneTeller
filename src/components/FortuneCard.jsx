import { motion } from 'framer-motion'

function renderInlineMarkdown(text) {
  const tokens = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g)
  return tokens.map((token, idx) => {
    if (!token) return null
    if (token.startsWith('**') && token.endsWith('**')) {
      return <strong key={idx} className="text-yellow-100 font-semibold">{token.slice(2, -2)}</strong>
    }
    if (token.startsWith('`') && token.endsWith('`')) {
      return <code key={idx} className="px-1 py-0.5 rounded bg-black/35 text-yellow-200 text-xs">{token.slice(1, -1)}</code>
    }
    if (token.startsWith('*') && token.endsWith('*')) {
      return <em key={idx} className="italic text-yellow-100">{token.slice(1, -1)}</em>
    }
    return <span key={idx}>{token}</span>
  })
}

function renderMarkdownParagraphs(text) {
  if (!text) return null
  const lines = text.split('\n')
  return lines.map((line, idx) => {
    const trimmed = line.trim()
    if (!trimmed) return <div key={idx} className="h-2" />
    if (trimmed.startsWith('- ')) {
      return <p key={idx} className="ml-3">• {renderInlineMarkdown(trimmed.slice(2))}</p>
    }
    if (/^\d+\.\s+/.test(trimmed)) {
      return <p key={idx}>{renderInlineMarkdown(trimmed)}</p>
    }
    if (trimmed.startsWith('### ')) {
      return <p key={idx} className="text-yellow-100 font-semibold">{renderInlineMarkdown(trimmed.slice(4))}</p>
    }
    return <p key={idx}>{renderInlineMarkdown(trimmed)}</p>
  })
}

/**
 * FortuneCard - Displays a single fortune with Chinese ink-wash styling.
 * Used by both ResultOverlay and SharePage.
 */
export default function FortuneCard({ fortune }) {
  if (!fortune) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-3xl px-3 sm:px-4"
    >
      <div className="relative bg-gradient-to-b from-white/[0.04] to-transparent rounded-2xl border border-yellow-400/10 px-5 sm:px-8 py-5 sm:py-7 space-y-4 sm:space-y-5">

        {/* Decorative top line */}
        <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-yellow-400/40 to-transparent" />

        {/* Section 1: Face reading (面相观察) */}
        <div className="space-y-1.5">
          <h3 className="font-calligraphy text-lg sm:text-xl text-yellow-400/70 tracking-wide">观面</h3>
          <div className="font-serif-cn text-sm sm:text-base md:text-lg text-yellow-100/90 leading-relaxed text-ink space-y-1">
            {renderMarkdownParagraphs(fortune.face)}
          </div>
        </div>

        {/* Subtle divider */}
        <div className="w-16 h-px bg-yellow-400/20 mx-auto" />

        {/* Section 2: Career advice (事业建议) */}
        <div className="space-y-1.5">
          <h3 className="font-calligraphy text-lg sm:text-xl text-yellow-400/70 tracking-wide">论事</h3>
          <div className="font-serif-cn text-sm sm:text-base md:text-lg text-white/85 leading-relaxed text-ink space-y-1">
            {renderMarkdownParagraphs(fortune.career)}
          </div>
        </div>

        {/* Subtle divider */}
        <div className="w-16 h-px bg-yellow-400/20 mx-auto" />

        {/* Section 3: Blessing (祝语) */}
        <div className="space-y-1.5">
          <h3 className="font-calligraphy text-lg sm:text-xl text-yellow-400/70 tracking-wide">赠言</h3>
          <div className="font-calligraphy text-base sm:text-lg md:text-xl text-yellow-100/90 leading-relaxed text-ink space-y-1">
            {renderMarkdownParagraphs(fortune.blessing)}
          </div>
        </div>

        {/* Decorative bottom line */}
        <div className="absolute bottom-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-yellow-400/30 to-transparent" />
      </div>
    </motion.div>
  )
}
