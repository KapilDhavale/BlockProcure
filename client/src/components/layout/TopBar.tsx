import { Wallet, Wifi, WifiOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TopBarProps {
    account: string | null
    networkName: string | null
    onConnect: () => void
}

export function TopBar({ account, networkName, onConnect }: TopBarProps) {
    const short = account ? `${account.slice(0, 6)}…${account.slice(-4)}` : null

    return (
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-zinc-200 bg-white/80 backdrop-blur-sm px-6">
            <div className="flex items-center gap-2.5">
                <div className="h-6 w-6 rounded-md bg-indigo-600 flex items-center justify-center">
                    <span className="text-white text-[10px] font-bold">BP</span>
                </div>
                <span className="text-sm font-semibold tracking-tight text-zinc-900">BlockProcure</span>
                <span className="hidden sm:inline text-xs text-zinc-400 font-normal">/ Transparent Infrastructure Payments</span>
            </div>

            <div className="flex items-center gap-3">
                {networkName && (
                    <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1">
                        <Wifi className="h-3 w-3 text-emerald-500" />
                        <span className="text-xs text-zinc-600 font-medium">{networkName}</span>
                    </div>
                )}
                {account ? (
                    <div className="flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="font-mono text-xs text-zinc-700">{short}</span>
                    </div>
                ) : (
                    <button
                        onClick={onConnect}
                        className={cn(
                            'flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-1.5',
                            'text-xs font-semibold text-white shadow-sm',
                            'hover:bg-indigo-700 transition-colors'
                        )}
                    >
                        <Wallet className="h-3.5 w-3.5" />
                        Connect Wallet
                    </button>
                )}
            </div>
        </header>
    )
}
