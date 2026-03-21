// import { Wallet, Wifi, WifiOff } from 'lucide-react'
// import { cn } from '@/lib/utils'

// interface TopBarProps {
//     account: string | null
//     networkName: string | null
//     onConnect: () => void
//     onLogout: () => void
// }

// export function TopBar({ account, networkName, onConnect, onLogout }: TopBarProps) {
//     const short = account ? `${account.slice(0, 6)}…${account.slice(-4)}` : null

//     return (
//         <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-zinc-200 bg-white/80 backdrop-blur-sm px-6">
//             <div className="flex items-center gap-2.5">
//                 <div className="h-6 w-6 rounded-md bg-indigo-600 flex items-center justify-center">
//                     <span className="text-white text-[10px] font-bold">BP</span>
//                 </div>
//                 <span className="text-sm font-semibold tracking-tight text-zinc-900">BlockProcure</span>
//                 <span className="hidden sm:inline text-xs text-zinc-400 font-normal">/ Transparent Infrastructure Payments</span>
//             </div>

//             <div className="flex items-center gap-3">
//                 {networkName && (
//                     <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1">
//                         <Wifi className="h-3 w-3 text-emerald-500" />
//                         <span className="text-xs text-zinc-600 font-medium">{networkName}</span>
//                     </div>
//                 )}
//                 {account ? (
//                     <div className="flex items-center gap-3">
//                         <div className="flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5">
//                             <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
//                             <span className="font-mono text-xs text-zinc-700">{short}</span>
//                         </div>
//                         <button
//                             onClick={onLogout}
//                             className="text-xs text-zinc-400 hover:text-red-500 transition-colors font-medium border-l border-zinc-200 pl-3"
//                         >
//                             Log Out
//                         </button>
//                     </div>
//                 ) : (
//                     <button
//                         onClick={onConnect}
//                         className={cn(
//                             'flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-1.5',
//                             'text-xs font-semibold text-white shadow-sm',
//                             'hover:bg-indigo-700 transition-colors'
//                         )}
//                     >
//                         <Wallet className="h-3.5 w-3.5" />
//                         Connect Wallet
//                     </button>
//                 )}
//             </div>
//         </header>
//     )
// }
import { Wallet, Wifi } from 'lucide-react'

interface TopBarProps {
  account:     string | null
  networkName: string | null
  onConnect:   () => void
  onLogout:    () => void
}

export function TopBar({ account, networkName, onConnect, onLogout }: TopBarProps) {
  const short = account ? `${account.slice(0, 6)}…${account.slice(-4)}` : null

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 30,
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(12px)',
        padding: '0 28px',
      }}
    >
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            background: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <span style={{ color: '#fff', fontSize: 10, fontWeight: 800, letterSpacing: '-0.02em' }}>BP</span>
        </div>
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          BlockProcure
        </span>
        <span
          style={{
            fontSize: 12,
            color: 'var(--text-tertiary)',
            fontWeight: 400,
            paddingLeft: 10,
            borderLeft: '1px solid var(--border-subtle)',
            marginLeft: 2,
          }}
        >
          Transparent Infrastructure Payments
        </span>
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Network pill */}
        {networkName && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'var(--surface-1)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 99,
              padding: '5px 12px',
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--text-secondary)',
            }}
          >
            <Wifi size={11} color="#16a34a" />
            {networkName}
          </div>
        )}

        {account ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Account pill */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'var(--surface-1)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 99,
                padding: '6px 14px',
              }}
            >
              <span
                className="animate-pulse-dot"
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: '#16a34a',
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  color: 'var(--text-primary)',
                  fontWeight: 500,
                }}
              >
                {short}
              </span>
            </div>

            {/* Log out */}
            <button
              onClick={onLogout}
              style={{
                background: 'none',
                border: 'none',
                fontSize: 12,
                fontWeight: 500,
                color: 'var(--text-tertiary)',
                cursor: 'pointer',
                padding: '4px 6px',
                borderRadius: 6,
                fontFamily: 'var(--font-sans)',
                transition: 'color 0.12s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}
            >
              Disconnect
            </button>
          </div>
        ) : (
          <button
            onClick={onConnect}
            className="btn-primary"
            style={{ borderRadius: 99, padding: '7px 18px', fontSize: 13 }}
          >
            <Wallet size={13} />
            Connect Wallet
          </button>
        )}
      </div>
    </header>
  )
}