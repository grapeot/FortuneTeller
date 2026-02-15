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
    <div className="h-screen w-screen bg-gradient-to-b from-[#13090f] via-[#0f0f23] to-[#131010] pt-20 pb-6 px-4 sm:px-6 md:px-10">
      <div className="mx-auto max-w-4xl h-full rounded-2xl border border-yellow-400/20 bg-black/35 backdrop-blur p-6 sm:p-8 overflow-y-auto">
        <h1 className="font-calligraphy text-3xl sm:text-4xl text-yellow-300 text-glow-warm">内部实现</h1>
        <p className="mt-2 text-yellow-100/70 font-serif-cn text-sm sm:text-base">
          我们希望把这个项目如何落地做得公开透明。下面是项目来源、开源地址和学习入口。
        </p>

        <div className="mt-6 grid gap-4 sm:gap-5">
          {links.map((item) => (
            <a
              key={item.href}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-xl border border-yellow-400/20 bg-white/5 hover:bg-white/10 transition-colors p-4 sm:p-5"
            >
              <h2 className="font-serif-cn text-yellow-200 text-lg">{item.title}</h2>
              <p className="mt-1 text-yellow-100/65 text-sm">{item.desc}</p>
              <p className="mt-2 text-yellow-400/90 text-sm break-all">{item.href}</p>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
