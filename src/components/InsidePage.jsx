export default function InsidePage() {
  const links = [
    {
      title: '基于 AI Builder Space 构建',
      href: 'https://space.ai-builders.com/',
      desc: '本项目主要依赖 AI Builder Space 提供的模型与应用能力。',
    },
    {
      title: '开源代码（GitHub）',
      href: 'https://github.com/grapeot/FortuneTeller.git',
      desc: '完整实现、Prompt 模板和可视化脚本均已开源，可直接查看。',
    },
    {
      title: '三小时构建完整 App 课程',
      href: 'https://ai-builders.com/',
      desc: '想系统复现从产品到工程落地的全过程，可参与课程。',
    },
  ]

  return (
    <div className="h-full w-full overflow-y-auto" style={{ backgroundColor: 'var(--bg-base)' }}>
      <div className="mx-auto max-w-2xl px-6 sm:px-8 py-10">
        <div className="mb-8">
          <h1 className="font-hei-cn font-semibold text-2xl sm:text-3xl" style={{ color: 'var(--text-primary)' }}>
            内部实现
          </h1>
          <p className="mt-2 font-serif-cn text-sm sm:text-base leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            我们希望把这个项目如何落地做得公开透明。以下是项目来源、开源地址和学习入口。
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {links.map((item) => (
            <a
              key={item.href}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-2xl p-5 sm:p-6 transition-colors duration-150"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-light)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <h2 className="font-hei-cn font-semibold text-base sm:text-lg mb-1" style={{ color: 'var(--text-primary)' }}>
                {item.title}
              </h2>
              <p className="font-serif-cn text-sm leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
                {item.desc}
              </p>
              <p className="font-en text-xs break-all" style={{ color: 'var(--text-muted)' }}>{item.href}</p>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
