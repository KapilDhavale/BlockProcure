// import { Building2, HardHat, Search, ScrollText, LayoutDashboard } from 'lucide-react'
// import { cn } from '@/lib/utils'

// export type TabId = 'dashboard' | 'gov' | 'contractor' | 'inspector' | 'audit'

// const NAV_ITEMS: { id: TabId; label: string; icon: React.ElementType; desc: string }[] = [
//     { id: 'dashboard', label: 'My Projects', icon: LayoutDashboard, desc: 'Project overview & statuses' },
//     { id: 'gov', label: 'Government', icon: Building2, desc: 'Create projects & lock funds' },
//     { id: 'contractor', label: 'Contractor', icon: HardHat, desc: 'Submit claim & evidence' },
//     { id: 'inspector', label: 'Inspector', icon: Search, desc: 'Approve milestones' },
//     { id: 'audit', label: 'Audit Log', icon: ScrollText, desc: 'On-chain event history' },
// ]

// interface SidebarProps {
//     active: TabId
//     onChange: (id: TabId) => void
//     account: string | null
// }

// export function Sidebar({ active, onChange, account }: SidebarProps) {
//     return (
//         <aside className="flex flex-col w-56 min-h-screen border-r border-zinc-200 bg-white pt-6 pb-4 px-3">
//             <p className="px-2 mb-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Panels</p>
//             <nav className="flex-1 space-y-0.5">
//                 {NAV_ITEMS.map(({ id, label, icon: Icon, desc }) => (
//                     <button
//                         key={id}
//                         onClick={() => onChange(id)}
//                         className={cn(
//                             'w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all',
//                             active === id
//                                 ? 'bg-indigo-50 text-indigo-700'
//                                 : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
//                         )}
//                     >
//                         <Icon className={cn('h-4 w-4 flex-shrink-0', active === id ? 'text-indigo-600' : 'text-zinc-400')} />
//                         <div className="overflow-hidden">
//                             <p className={cn('text-sm font-medium leading-none', active === id ? 'text-indigo-700' : 'text-zinc-800')}>
//                                 {label}
//                             </p>
//                             <p className="mt-0.5 text-[11px] text-zinc-400 truncate">{desc}</p>
//                         </div>
//                     </button>
//                 ))}
//             </nav>

//             {account && (
//                 <div className="mt-4 rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2.5">
//                     <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-1">Connected as</p>
//                     <p className="font-mono text-xs text-zinc-700 break-all">{account.slice(0, 14)}…</p>
//                 </div>
//             )}
//         </aside>
//     )
// }

import { Building2, HardHat, Search, ScrollText, LayoutDashboard } from 'lucide-react'

export type TabId = 'dashboard' | 'gov' | 'contractor' | 'inspector' | 'audit'

const NAV: { id: TabId; label: string; icon: React.ElementType; desc: string }[] = [
  { id: 'dashboard',  label: 'My Projects', icon: LayoutDashboard, desc: 'Overview & statuses'       },
  { id: 'gov',        label: 'Government',  icon: Building2,        desc: 'Create & fund projects'   },
  { id: 'contractor', label: 'Contractor',  icon: HardHat,          desc: 'Submit claims'             },
  { id: 'inspector',  label: 'Inspector',   icon: Search,           desc: 'Approve milestones'        },
  { id: 'audit',      label: 'Audit Log',   icon: ScrollText,       desc: 'On-chain event history'   },
]

interface SidebarProps {
  active: TabId
  onChange: (id: TabId) => void
  account: string | null
}

export function Sidebar({ active, onChange, account }: SidebarProps) {
  return (
    <aside
      style={{
        width: 220,
        minWidth: 220,
        minHeight: '100%',
        background: 'var(--surface-0)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        padding: '28px 14px 24px',
        gap: 0,
      }}
    >
      <p
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--text-tertiary)',
          padding: '0 10px',
          marginBottom: 10,
        }}
      >
        Navigation
      </p>

      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV.map(({ id, label, icon: Icon, desc }) => {
          const isActive = active === id
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                borderRadius: 8,
                padding: '10px 12px',
                border: 'none',
                background: isActive ? 'var(--accent-light)' : 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => {
                if (!isActive) e.currentTarget.style.background = 'var(--surface-2)'
              }}
              onMouseLeave={e => {
                if (!isActive) e.currentTarget.style.background = 'transparent'
              }}
            >
              <Icon
                size={16}
                color={isActive ? 'var(--accent)' : 'var(--text-tertiary)'}
                style={{ flexShrink: 0 }}
              />
              <div style={{ minWidth: 0, overflow: 'hidden' }}>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? 'var(--accent)' : 'var(--text-primary)',
                    lineHeight: 1.3,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {label}
                </p>
                <p
                  style={{
                    fontSize: 11,
                    color: 'var(--text-tertiary)',
                    marginTop: 1,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {desc}
                </p>
              </div>
            </button>
          )
        })}
      </nav>

      {/* Connected wallet */}
      {account && (
        <div
          style={{
            marginTop: 24,
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: 16,
            padding: '16px 12px 0',
          }}
        >
          <p
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--text-tertiary)',
              marginBottom: 6,
            }}
          >
            Connected
          </p>
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--text-secondary)',
              wordBreak: 'break-all',
            }}
          >
            {account.slice(0, 6)}…{account.slice(-6)}
          </p>
        </div>
      )}
    </aside>
  )
}