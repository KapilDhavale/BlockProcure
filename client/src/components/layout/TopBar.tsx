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
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 30,
      height: 58,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: 'rgba(13,15,20,0.92)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid var(--border)',
      padding: '0 28px',
      // Gold shimmer line below the border
      boxShadow: '0 1px 0 0 rgba(201,162,77,0.12)',
    }}>

      {/* ── Brand ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>

        {/* Logo mark */}
        <div style={{
          width: 32,
          height: 32,
          borderRadius: 9,
          background: 'linear-gradient(135deg, #1d2233, #272e42)',
          border: '1px solid var(--border2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          flexShrink: 0,
        }}>
          {/* Subtle gold glow top-left */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(135deg, rgba(201,162,77,0.12), transparent 60%)',
            pointerEvents: 'none',
          }} />
          <span style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 14,
            color: 'var(--gold)',
            fontStyle: 'italic',
            position: 'relative',
            zIndex: 1,
          }}>
            B
          </span>
        </div>

        {/* Name */}
        <span style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 17,
          color: 'var(--text)',
          letterSpacing: '-0.3px',
        }}>
          BlockProcure
        </span>

        {/* Divider */}
        <div style={{
          width: 1, height: 16,
          background: 'var(--border2)',
          margin: '0 4px',
        }} />

        {/* Tagline */}
        <span style={{
          fontSize: 11,
          color: 'var(--text-dim)',
          letterSpacing: '0.2px',
          fontWeight: 300,
        }}>
          Transparent Infrastructure Payments
        </span>
      </div>

      {/* ── Right controls ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>

        {/* Network pill */}
        {networkName && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            background: 'var(--surface2)',
            border: '1px solid var(--border)',
            borderRadius: 99,
            padding: '5px 13px',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--text-sub)',
            letterSpacing: '0.3px',
          }}>
            <span style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--green)',
              boxShadow: '0 0 6px rgba(77,187,138,0.5)',
              animation: 'netPulse 2.5s ease-in-out infinite',
            }} />
            {networkName}
          </div>
        )}

        {account ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

            {/* Wallet address pill */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'var(--surface2)',
              border: '1px solid var(--border)',
              borderRadius: 99,
              padding: '5px 13px',
            }}>
              <span style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'var(--green)',
                boxShadow: '0 0 6px rgba(77,187,138,0.4)',
                flexShrink: 0,
              }} />
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--text)',
                fontWeight: 500,
                letterSpacing: '0.3px',
              }}>
                {short}
              </span>
            </div>

            {/* Disconnect */}
            <button
              onClick={onLogout}
              style={{
                background: 'transparent',
                border: 'none',
                fontFamily: 'var(--font-sans)',
                fontSize: 11,
                fontWeight: 500,
                color: 'var(--text-dim)',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: 6,
                letterSpacing: '0.2px',
                transition: 'color 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-dim)')}
            >
              Disconnect
            </button>
          </div>
        ) : (
          <button
            onClick={onConnect}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              background: 'var(--gold)',
              color: '#0d0f14',
              border: 'none',
              borderRadius: 99,
              padding: '7px 18px',
              fontFamily: 'var(--font-sans)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              letterSpacing: '0.2px',
              transition: 'background 0.2s, transform 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--gold2)'
              e.currentTarget.style.transform = 'translateY(-1px)'
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(201,162,77,0.3)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'var(--gold)'
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <Wallet size={13} />
            Connect Wallet
          </button>
        )}
      </div>
    </header>
  )
}