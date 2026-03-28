import { motion } from 'framer-motion'

const FEATURES = [
  {
    icon: '◎',
    title: '客观测量',
    sub: '三停 · 五眼 · 宫位',
    desc: '实时检测 478 个面部特征点，精确量化三停比例、五眼宽度、印堂间距等传统相学参数',
  },
  {
    icon: '⬡',
    title: '古今融合',
    sub: '千年智慧 · 现代解读',
    desc: '以十二宫位理论为框架，将几何数据与传统面相学对应，见数字背后的古老智慧',
  },
  {
    icon: '≡',
    title: '三模型报告',
    sub: 'Gemini · DeepSeek · Kimi',
    desc: '三大 AI 并行分析性格特质与人生方向，多维视角交叉印证，可扫码发至邮箱留存',
  },
]

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.2 } },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
}

export default function IntroScreen({ onStart }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="h-full w-full overflow-y-auto flex flex-col items-center justify-center px-5 py-10 sm:py-14"
      style={{ backgroundColor: 'var(--bg-base)' }}
    >
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="w-full max-w-xl flex flex-col items-center gap-6"
      >
        {/* Logo */}
        <motion.div variants={item} className="flex flex-col items-center gap-4">
          <img
            src="/assets/superlinear-ai-logo.png"
            alt="Superlinear AI"
            style={{ height: '36px', width: 'auto' }}
          />
          <div className="w-16 h-px" style={{ background: 'linear-gradient(90deg,transparent,var(--border-amber),transparent)' }} />
        </motion.div>

        {/* Main title */}
        <motion.div variants={item} className="flex flex-col items-center gap-2 text-center">
          <h1 className="font-calligraphy" style={{ fontSize: '3.5rem', lineHeight: 1.1, color: 'var(--text-primary)' }}>
            相面
          </h1>
          <p className="font-serif-cn text-base sm:text-lg leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            以科技之眼，见千年面相之道
          </p>
        </motion.div>

        {/* Description */}
        <motion.p
          variants={item}
          className="font-hei-cn text-sm leading-7 text-center max-w-sm"
          style={{ color: 'var(--text-muted)' }}
        >
          计算机视觉实时捕捉面部轮廓，结合传统相学宫位理论，
          由三大 AI 并行解读你的性格特质与人生方向
        </motion.p>

        {/* Feature cards */}
        <motion.div variants={item} className="w-full grid grid-cols-1 sm:grid-cols-3 gap-3 mt-1">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl px-4 py-4 flex flex-col gap-2"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-2">
                <span className="text-base leading-none" style={{ color: 'var(--amber)' }}>{f.icon}</span>
                <div>
                  <p className="font-hei-cn font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{f.title}</p>
                  <p className="font-hei-cn text-[10px]" style={{ color: 'var(--amber)' }}>{f.sub}</p>
                </div>
              </div>
              <p className="font-serif-cn text-xs leading-6" style={{ color: 'var(--text-secondary)' }}>{f.desc}</p>
            </div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div variants={item} className="flex flex-col items-center gap-3 mt-2">
          <button
            onClick={onStart}
            className="px-10 py-3.5 rounded-2xl font-hei-cn font-semibold text-base tracking-widest transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer shadow-lg"
            style={{ backgroundColor: 'var(--text-primary)', color: 'var(--bg-card)' }}
          >
            开始相面
          </button>
          <p className="font-hei-cn text-xs text-center" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
            需要摄像头权限 · 仅供娱乐参考，不构成任何决策依据
          </p>
        </motion.div>

        {/* Divider + footer */}
        <motion.div variants={item} className="flex items-center gap-3 w-full mt-1">
          <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }} />
          <p className="font-hei-cn text-xs" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>Superlinear Academy</p>
          <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }} />
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
