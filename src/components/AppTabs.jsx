const TABS = [
  { id: 'fortune', label: '相面' },
  { id: 'guide', label: '相面学指南' },
  { id: 'inside', label: '内部实现' },
]

export default function AppTabs({ activeTab, onChange }) {
  return (
    <div className="flex justify-center">
      <div className="flex items-center gap-1 rounded-xl border border-yellow-400/30 bg-black/45 backdrop-blur px-1 py-1">
        {TABS.map((tab) => {
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`px-3 py-1.5 text-sm font-serif-cn rounded-lg transition-all duration-200 cursor-pointer ${
                active
                  ? 'text-yellow-200 bg-yellow-400/20 tab-active'
                  : 'text-yellow-100/70 hover:text-yellow-200 hover:bg-white/10'
              }`}
              aria-pressed={active}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
