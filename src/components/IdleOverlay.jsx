import { motion } from 'framer-motion'

const FEATURES = [
  { icon: '◎', label: '客观测量', desc: '实时检测 478 个面部特征点，精确量化三停比例、五眼宽度等传统相学参数' },
  { icon: '⬡', label: '古今融合', desc: '以十二宫位理论为框架，将几何数据与传统面相学对应' },
  { icon: '≡', label: '三模型报告', desc: 'Gemini · DeepSeek · Kimi 三大 AI 并行分析，多维视角交叉印证' },
]

export default function IdleOverlay({ faceCount, isReady, error, onStart }) {
  const statusText = error
    ? `⚠ ${error}`
    : faceCount > 0
    ? `检测到 ${faceCount} 张面相`
    : isReady
    ? '请面向摄像头…'
    : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3 }}
      className="w-full flex flex-col items-center gap-3"
      style={{ maxWidth: '360px' }}
    >
      {/* Status line */}
      <div className="h-5 flex items-center">
        {statusText ? (
          <p className="font-hei-cn text-sm" style={{ color: error ? 'var(--text-secondary)' : faceCount > 0 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
            {statusText}
          </p>
        ) : (
          <p className="font-hei-cn text-sm animate-pulse-soft" style={{ color: 'var(--text-muted)' }}>
            正在加载<span className="font-en">AI</span>模型…
          </p>
        )}
      </div>

      {/* Feature cards */}
      <div className="w-full grid grid-cols-3 gap-2">
        {FEATURES.map((f) => (
          <div
            key={f.label}
            className="rounded-xl px-2.5 py-2.5 flex flex-col gap-1"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-xs leading-none shrink-0" style={{ color: 'var(--amber)' }}>{f.icon}</span>
              <span className="font-hei-cn text-xs font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>{f.label}</span>
            </div>
            <p className="font-hei-cn text-[10px] leading-[1.5]" style={{ color: 'var(--text-muted)' }}>{f.desc}</p>
          </div>
        ))}
      </div>

      {/* CTA button */}
      <button
        onClick={onStart}
        disabled={!isReady}
        className="px-10 py-3 disabled:opacity-40 disabled:cursor-not-allowed font-hei-cn font-semibold text-base whitespace-nowrap rounded-2xl shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 tracking-widest cursor-pointer"
        style={{ backgroundColor: 'var(--text-primary)', color: 'var(--bg-card)' }}
      >
        开始相面
      </button>

      <p className="font-hei-cn text-[10px] text-center" style={{ color: 'var(--text-muted)', opacity: 0.55 }}>
        仅供娱乐参考，不构成任何决策依据
      </p>
    </motion.div>
  )
}
