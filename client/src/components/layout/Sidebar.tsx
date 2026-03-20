import { Building2, HardHat, Search, ScrollText } from 'lucide-react'
import { cn } from '@/lib/utils'

export type TabId = 'gov' | 'contractor' | 'inspector' | 'audit'

const NAV_ITEMS: { id: TabId; label: string; icon: React.ElementType; desc: string }[] = [
    { id: 'gov', label: 'Government', icon: Building2, desc: 'Create projects & lock funds' },
    { id: 'contractor', label: 'Contractor', icon: HardHat, desc: 'Submit claim & evidence' },
    { id: 'inspector', label: 'Inspector', icon: Search, desc: 'Approve milestones' },
    { id: 'audit', label: 'Audit Log', icon: ScrollText, desc: 'On-chain event history' },
]

interface SidebarProps {
    active: TabId
    onChange: (id: TabId) => void
    account: string | null
}

export function Sidebar({ active, onChange, account }: SidebarProps) {
    return (
        <aside className="flex flex-col w-56 min-h-screen border-r border-zinc-200 bg-white pt-6 pb-4 px-3">
            <p className="px-2 mb-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Panels</p>
            <nav className="flex-1 space-y-0.5">
                {NAV_ITEMS.map(({ id, label, icon: Icon, desc }) => (
                    <button
                        key={id}
                        onClick={() => onChange(id)}
                        className={cn(
                            'w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all',
                            active === id
                                ? 'bg-indigo-50 text-indigo-700'
                                : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                        )}
                    >
                        <Icon className={cn('h-4 w-4 flex-shrink-0', active === id ? 'text-indigo-600' : 'text-zinc-400')} />
                        <div className="overflow-hidden">
                            <p className={cn('text-sm font-medium leading-none', active === id ? 'text-indigo-700' : 'text-zinc-800')}>
                                {label}
                            </p>
                            <p className="mt-0.5 text-[11px] text-zinc-400 truncate">{desc}</p>
                        </div>
                    </button>
                ))}
            </nav>

            {account && (
                <div className="mt-4 rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2.5">
                    <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-1">Connected as</p>
                    <p className="font-mono text-xs text-zinc-700 break-all">{account.slice(0, 14)}…</p>
                </div>
            )}
        </aside>
    )
}
