import { Building2, HardHat, Search, Zap, ArrowRight } from 'lucide-react'

interface LandingPageProps {
  onConnect: () => void
}

export function LandingPage({ onConnect }: LandingPageProps) {
  return (
    <div style={{
      minHeight: 'calc(100vh - 62px)',
      display: 'flex', flexDirection: 'column',
      background: 'var(--bg)', overflow: 'hidden',
    }}>

      {/* ── Hero ── */}
      <section style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '80px 40px 60px', textAlign: 'center',
        position: 'relative', overflow: 'hidden',
      }}>

        {/* Ambient glows */}
        <div style={{
          position: 'absolute', width: 700, height: 700, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(201,162,77,0.07) 0%, transparent 70%)',
          top: -150, left: -150, pointerEvents: 'none',
          animation: 'float 8s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(74,158,255,0.04) 0%, transparent 70%)',
          bottom: -100, right: -100, pointerEvents: 'none',
          animation: 'float 10s ease-in-out infinite reverse',
        }} />

        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'rgba(201,162,77,0.1)', border: '1px solid rgba(201,162,77,0.25)',
          borderRadius: 99, padding: '6px 16px',
          fontFamily: 'var(--font-mono)', fontSize: 10,
          color: 'var(--gold)', letterSpacing: '0.7px',
          textTransform: 'uppercase', marginBottom: 36,
          animation: 'fadeUp 0.6s ease both',
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: 'var(--gold)',
            boxShadow: '0 0 6px rgba(201,162,77,0.6)',
            animation: 'pulseDot 2s ease-in-out infinite',
          }} />
          Blockchain · Ethereum Smart Contracts
        </div>

        {/* ── Headline — two-part staggered animation ── */}
        <h1 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 'clamp(42px, 6vw, 72px)',
          letterSpacing: '-1px', lineHeight: 1.1,
          color: 'var(--text)', maxWidth: 800, marginBottom: 20,
        }}>
          {/* Line 1 — slides up first */}
          <span style={{
            display: 'block',
            animation: 'fadeUp 0.8s 0.1s ease both',
          }}>
            Infrastructure payments,
          </span>

          {/* Line 2 — slides up 0.5s later, gold italic */}
          <em style={{
            display: 'block',
            fontStyle: 'italic',
            color: 'var(--gold)',
            animation: 'fadeUp 0.8s 0.55s ease both',
          }}>
            enforced by code.
          </em>
        </h1>

        {/* Subtitle */}
        <p style={{
          fontSize: 17, color: 'var(--text-sub)',
          maxWidth: 480, lineHeight: 1.8, marginBottom: 48,
          fontWeight: 300, animation: 'fadeUp 0.7s 0.9s ease both',
        }}>
          BlockProcure locks infrastructure budgets in escrow and releases
          payment only when M-of-N inspectors sign on-chain. No middlemen.
          No manual approvals.
        </p>

        {/* Feature pills */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
          gap: 10, marginBottom: 52,
          animation: 'fadeUp 0.7s 1.05s ease both',
        }}>
          {[
            { dot: 'var(--green)', label: 'Tamper-proof evidence'  },
            { dot: 'var(--gold)',  label: 'Escrow-backed payments'  },
            { dot: 'var(--blue)', label: 'Inspector multisig'       },
            { dot: 'var(--amber)',label: 'Immutable audit log'      },
          ].map(({ dot, label }) => (
            <div key={label} style={{
              display: 'flex', alignItems: 'center', gap: 7,
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 99, padding: '8px 16px',
              fontSize: 12, fontWeight: 500, color: 'var(--text-sub)',
            }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: dot, flexShrink: 0 }} />
              {label}
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
          animation: 'fadeUp 0.7s 1.2s ease both',
        }}>
          <button
            onClick={onConnect}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              background: 'var(--gold)', color: '#0d0f14',
              border: 'none', borderRadius: 12,
              padding: '16px 40px', fontSize: 15, fontWeight: 700,
              fontFamily: 'var(--font-sans)', cursor: 'pointer',
              letterSpacing: '0.1px',
              transition: 'background 0.2s, transform 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--gold2)'
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 16px 40px rgba(201,162,77,0.35)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'var(--gold)'
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            Connect MetaMask to Begin
            <ArrowRight size={16} />
          </button>
          <p style={{
            fontFamily: 'var(--font-mono)', fontSize: 10,
            color: 'var(--text-dim)', letterSpacing: '0.3px',
          }}>
            Ganache Local · localhost:8545 · or Polygon Amoy
          </p>
        </div>
      </section>

      {/* ── Divider ── */}
      <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, var(--border2), transparent)' }} />

      {/* ── How it works ── */}
      <section style={{ background: 'var(--surface)', padding: '60px 60px 72px' }}>
        <p style={{
          fontFamily: 'var(--font-mono)', fontSize: 10,
          letterSpacing: '0.8px', textTransform: 'uppercase',
          color: 'var(--text-dim)', textAlign: 'center', marginBottom: 32,
        }}>
          How it works
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, maxWidth: 1060, margin: '0 auto' }}>
          {[
            { n: '01', icon: <Building2 size={16} color="var(--gold)" />, title: 'Government',    desc: 'Creates project, assigns inspectors, sets M-of-N threshold, locks budget in escrow vault.'       },
            { n: '02', icon: <HardHat   size={16} color="var(--gold)" />, title: 'Contractor',    desc: 'Submits work completion claims with cryptographic evidence hashes stored permanently on-chain.'  },
            { n: '03', icon: <Search    size={16} color="var(--gold)" />, title: 'Inspectors',    desc: 'Independently verify and sign approvals until the M-of-N threshold is reached on-chain.'        },
            { n: '04', icon: <Zap       size={16} color="var(--gold)" />, title: 'Payment Vault', desc: 'Smart contract releases ETH to contractor automatically — no bank transfer, no manual step.'     },
          ].map(({ n, icon, title, desc }, i) => (
            <div key={n} style={{
              background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 16, padding: '26px 22px',
              position: 'relative', overflow: 'hidden',
              transition: 'border-color 0.2s, transform 0.2s',
            }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(201,162,77,0.3)'
                ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
                ;(e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
              }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(201,162,77,0.2), transparent)' }} />
              <div style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--gold-soft)', border: '1px solid rgba(201,162,77,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                {icon}
              </div>
              <p style={{ fontFamily: 'var(--font-serif)', fontSize: 32, color: 'var(--gold)', fontStyle: 'italic', lineHeight: 1, marginBottom: 12 }}>{n}</p>
              <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', marginBottom: 7, letterSpacing: '-0.1px' }}>{title}</p>
              <p style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.7, fontWeight: 300 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Divider ── */}
      <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, var(--border2), transparent)' }} />

      {/* ── Stats strip ── */}
      <section style={{ background: 'var(--bg)', padding: '52px 60px' }}>
        <div style={{
          maxWidth: 1060, margin: '0 auto',
          display: 'grid', gridTemplateColumns: '1fr auto 1fr',
          gap: 20, alignItems: 'center',
        }}>
          <div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 8 }}>Transparency</p>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: 44, letterSpacing: '-1px', lineHeight: 1 }}>
              <span style={{ color: 'var(--gold)' }}>100</span>%
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 6, fontWeight: 300 }}>Every action recorded on-chain, permanently</p>
          </div>
          <div style={{ width: 1, height: 60, background: 'var(--border2)' }} />
          <div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 8 }}>Human approval steps</p>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: 44, letterSpacing: '-1px', lineHeight: 1 }}>
              <span style={{ color: 'var(--gold)' }}>0</span>
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 6, fontWeight: 300 }}>Payment release is fully automated by contract</p>
          </div>
        </div>
      </section>

    </div>
  )
}