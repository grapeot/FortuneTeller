import { motion } from 'framer-motion'

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
          <p className="font-serif-cn text-sm sm:text-base md:text-lg text-yellow-100/90 leading-relaxed text-ink">
            {fortune.face}
          </p>
        </div>

        {/* Subtle divider */}
        <div className="w-16 h-px bg-yellow-400/20 mx-auto" />

        {/* Section 2: Career advice (事业建议) */}
        <div className="space-y-1.5">
          <h3 className="font-calligraphy text-lg sm:text-xl text-yellow-400/70 tracking-wide">论事</h3>
          <p className="font-serif-cn text-sm sm:text-base md:text-lg text-white/85 leading-relaxed text-ink">
            {fortune.career}
          </p>
        </div>

        {/* Subtle divider */}
        <div className="w-16 h-px bg-yellow-400/20 mx-auto" />

        {/* Section 3: Blessing (祝语) */}
        <div className="space-y-1.5">
          <h3 className="font-calligraphy text-lg sm:text-xl text-yellow-400/70 tracking-wide">赠言</h3>
          <p className="font-calligraphy text-base sm:text-lg md:text-xl text-yellow-100/90 leading-relaxed text-ink">
            {fortune.blessing}
          </p>
        </div>

        {/* Decorative bottom line */}
        <div className="absolute bottom-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-yellow-400/30 to-transparent" />
      </div>
    </motion.div>
  )
}
