import { LogOut } from 'lucide-react'

interface TopBarProps {
  account:     string | null
  networkName: string | null
  onConnect:   () => void
  onLogout:    () => void
}

export function TopBar({ account, networkName, onConnect, onLogout }: TopBarProps) {
  const short = account ? `${account.slice(0, 6)}…${account.slice(-4)}` : null

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 30,
      height: 62,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: 'var(--bg)',
      padding: '0 36px',
      flexShrink: 0,
      boxShadow: '0 1px 0 var(--border)',
    }}>

      {/* ── Brand ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>

        {/* Wordmark */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'baseline' }}>
            <span style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 20, color: 'var(--gold)',
              fontStyle: 'italic', lineHeight: 1, marginRight: 1,
            }}>B</span>
            <span style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 20, color: 'var(--text)',
              letterSpacing: '-0.4px', lineHeight: 1,
            }}>lockProcure</span>
          </div>
          <div style={{
            height: 2, width: 56,
            background: 'linear-gradient(90deg, var(--gold2) 0%, var(--gold) 50%, transparent 100%)',
            borderRadius: 1, marginTop: 4,
          }} />
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 28, background: 'var(--border2)', flexShrink: 0 }} />

        {/* Ministry */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9, color: 'var(--text-dim)',
            letterSpacing: '0.6px', textTransform: 'uppercase', lineHeight: 1,
          }}>Platform</span>
          <span style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 12, color: 'var(--text-sub)',
            letterSpacing: '-0.1px', fontWeight: 400, lineHeight: 1,
          }}>Ministry of Infrastructure · Maharashtra</span>
        </div>
      </div>

      {/* ── Right ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>

        {account ? (
          <>
            {/* Stacked address block — Option 2 */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: 'var(--green)', flexShrink: 0,
                  boxShadow: '0 0 5px rgba(77,187,138,0.5)',
                }} />
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 11,
                  color: 'var(--text)', fontWeight: 500, letterSpacing: '0.3px',
                }}>{short}</span>
              </div>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 9,
                color: 'var(--text-dim)', letterSpacing: '0.3px',
              }}>
                {networkName ?? 'Unknown Network'} · Chain 1337
              </span>
            </div>

            {/* Vertical rule */}
            <div style={{ width: 1, height: 28, background: 'var(--border2)', flexShrink: 0 }} />

            {/* Logout button — proper, professional */}
            <button
              onClick={onLogout}
              title="Log out"
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'var(--surface2)',
                border: '1px solid var(--border)',
                borderRadius: 6, padding: '6px 12px',
                fontFamily: 'var(--font-mono)', fontSize: 10,
                color: 'var(--text-sub)', cursor: 'pointer',
                letterSpacing: '0.2px', transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(224,82,82,0.08)'
                e.currentTarget.style.borderColor = 'rgba(224,82,82,0.3)'
                e.currentTarget.style.color = 'var(--red)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'var(--surface2)'
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.color = 'var(--text-sub)'
              }}
            >
              <LogOut size={11} />
              Log Out
            </button>
          </>
        ) : (
          <button
            onClick={onConnect}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              background: 'var(--gold)', color: '#0d0f14',
              border: 'none', borderRadius: 7,
              padding: '9px 22px',
              fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', letterSpacing: '0.1px',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--gold2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--gold)')}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <rect x="1.5" y="4" width="10" height="7.5" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M4.5 4V3a2 2 0 014 0v1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              <circle cx="6.5" cy="7.5" r="1" fill="currentColor"/>
            </svg>
            Connect Wallet
          </button>
        )}
      </div>
    </header>
  )
}