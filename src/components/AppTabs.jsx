const TABS = [
  { id: 'fortune', label: '相面' },
  { id: 'guide', label: '相面学指南' },
  { id: 'inside', label: '内部实现' },
]

export default function AppTabs({ activeTab, onChange, className = '' }) {
  return (
    <div className={`flex justify-end ${className}`}>
      <div
        className="flex items-center gap-0.5 rounded-xl px-1 py-1"
        style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg-raised)' }}
      >
        {TABS.map((tab) => {
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-hei-cn rounded-lg transition-all duration-200 cursor-pointer ${
                active ? 'tab-active' : ''
              }`}
              style={{
                backgroundColor: active ? 'var(--bg-card)' : 'transparent',
                color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
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
