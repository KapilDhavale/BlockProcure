import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { Toaster } from 'sonner'
import { TopBar } from '@/components/layout/TopBar'
import { Sidebar, type TabId } from '@/components/layout/Sidebar'
import { DashboardPanel } from '@/components/panels/DashboardPanel'
import { GovPanel } from '@/components/panels/GovPanel'
import { ContractorPanel } from '@/components/panels/ContractorPanel'
import { InspectorPanel } from '@/components/panels/InspectorPanel'
import { AuditPanel } from '@/components/panels/AuditPanel'
import { getContracts, type Contracts } from '@/lib/contracts'
import { ShieldCheck, Zap, FileX2, ArrowRight, Building2, HardHat, Search } from 'lucide-react'

declare global {
  interface Window { ethereum?: any }
}

/* ─── ROLE DETECTION ─── */

export type RoleKey = 'gov' | 'contractor' | 'inspector' | 'none'

async function detectAccountRole(
  contracts: Contracts,
  account: string
): Promise<RoleKey> {
  try {
    const count = (await contracts.registry.projectCount()).toNumber()
    if (count === 0) return 'none'
    for (let i = 1; i <= count; i++) {
      const role = Number(await contracts.registry.projectRoles(i, account))
      if (role === 1) return 'gov'
      if (role === 2) return 'contractor'
      if (role === 3) return 'inspector'
    }
    return 'none'
  } catch {
    return 'none'
  }
}

function roleToTab(role: RoleKey): TabId {
  if (role === 'gov')        return 'gov'
  if (role === 'contractor') return 'contractor'
  if (role === 'inspector')  return 'inspector'
  return 'dashboard'
}

/* ─── LANDING PAGE ─── */

const FEATURES = [
  { icon: ShieldCheck, label: 'Tamper-proof evidence',      desc: 'Every document hashed on-chain'    },
  { icon: Zap,         label: 'Auto payment release',       desc: 'Triggered by smart contract logic' },
  { icon: FileX2,      label: 'Duplicate invoice blocking', desc: 'Rejected at submission, not audit' },
]

const ROLES = [
  { n: '01', icon: Building2, role: 'Government',    desc: 'Creates project, sets inspector threshold, locks budget in escrow'       },
  { n: '02', icon: HardHat,   role: 'Contractor',    desc: 'Submits work completion claims with cryptographic evidence hashes'       },
  { n: '03', icon: Search,    role: 'Inspectors',    desc: 'Independently verify and sign approvals until M-of-N threshold is met'  },
  { n: '04', icon: Zap,       role: 'Payment Vault', desc: 'Automatically releases funds to the contractor — no manual step'        },
]

function LandingPage({ onConnect }: { onConnect: () => void }) {
  return (
    <div style={{
      minHeight: 'calc(100vh - 58px)',
      display: 'flex', flexDirection: 'column',
      background: 'var(--bg)',
      backgroundImage: `
        radial-gradient(ellipse 900px 600px at 10% -5%, rgba(201,162,77,0.06) 0%, transparent 60%),
        radial-gradient(ellipse 700px 500px at 90% 110%, rgba(74,158,255,0.04) 0%, transparent 60%)
      `,
    }}>

      {/* ── Hero ── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '90px 40px 70px', textAlign: 'center',
      }}>
        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'rgba(201,162,77,0.1)', border: '1px solid rgba(201,162,77,0.25)',
          borderRadius: 99, padding: '6px 16px',
          fontFamily: 'var(--font-mono)', fontSize: 10,
          color: 'var(--gold)', letterSpacing: '0.7px',
          textTransform: 'uppercase', marginBottom: 40,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gold)', boxShadow: '0 0 6px rgba(201,162,77,0.6)', animation: 'pulseDot 2s ease-in-out infinite' }} />
          Blockchain · Smart Contract Demo
        </div>

        {/* Headline */}
        <h1 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 'clamp(40px, 5vw, 64px)',
          letterSpacing: '-0.5px', lineHeight: 1.1,
          color: 'var(--text)', maxWidth: 720, marginBottom: 22,
        }}>
          Infrastructure payments,{' '}
          <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>enforced by code.</em>
        </h1>

        <p style={{ fontSize: 16, color: 'var(--text-sub)', maxWidth: 480, lineHeight: 1.8, marginBottom: 44, fontWeight: 300 }}>
          BlockProcure replaces manual approvals with M-of-N inspector multisig.
          Funds release automatically when the threshold is met.
        </p>

        {/* Feature pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginBottom: 48 }}>
          {FEATURES.map(({ icon: Icon, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 99, padding: '8px 16px', fontSize: 12, fontWeight: 500, color: 'var(--text-sub)' }}>
              <Icon size={13} color="var(--gold)" />
              {label}
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={onConnect}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'var(--gold)', color: '#0d0f14', border: 'none', borderRadius: 10, padding: '15px 36px', fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-sans)', cursor: 'pointer', letterSpacing: '0.1px', marginBottom: 14, transition: 'background 0.2s, transform 0.2s, box-shadow 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--gold2)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(201,162,77,0.35)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--gold)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
        >
          Connect MetaMask to Begin
          <ArrowRight size={15} />
        </button>
        <p style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', letterSpacing: '0.3px' }}>
          Connect to Ganache localhost:8545 or Polygon Amoy
        </p>
      </div>

      {/* ── Divider ── */}
      <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, var(--border2), transparent)' }} />

      {/* ── How it works ── */}
      <div style={{ background: 'var(--surface)', padding: '52px 60px 64px' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 28, textAlign: 'center' }}>
          How it works
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, maxWidth: 1100, margin: '0 auto' }}>
          {ROLES.map(({ n, icon: Icon, role, desc }) => (
            <div key={n} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 14, padding: '24px 22px', position: 'relative', overflow: 'hidden', transition: 'border-color 0.2s, transform 0.2s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(201,162,77,0.3)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)' }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, var(--border2), transparent)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--gold-soft)', border: '1px solid rgba(201,162,77,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={15} color="var(--gold)" />
                </div>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--gold)', letterSpacing: '0.5px' }}>{n}</p>
              </div>
              <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', marginBottom: 8, letterSpacing: '-0.1px' }}>{role}</p>
              <p style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.7, fontWeight: 300 }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── ROLE BANNER ─── */

const ROLE_BANNER: Record<RoleKey, { label: string; desc: string; color: string; bg: string; border: string } | null> = {
  gov:        { label: 'Government',  desc: 'Ministry of Infrastructure account',    color: 'var(--gold)',  bg: 'rgba(201,162,77,0.08)',  border: 'rgba(201,162,77,0.2)'  },
  contractor: { label: 'Contractor',  desc: 'Assigned contractor on active projects', color: 'var(--blue)',  bg: 'rgba(74,158,255,0.08)',  border: 'rgba(74,158,255,0.2)'  },
  inspector:  { label: 'Inspector',   desc: 'Assigned inspector on active projects',  color: 'var(--green)', bg: 'rgba(77,187,138,0.08)',  border: 'rgba(77,187,138,0.2)'  },
  none:       null,
}

/* ─── APP ─── */

export default function App() {
  const [provider, setProvider]     = useState<ethers.providers.Web3Provider | null>(null)
  const [account, setAccount]       = useState<string | null>(null)
  const [network, setNetwork]       = useState<ethers.providers.Network | null>(null)
  const [contracts, setContracts]   = useState<Contracts | null>(null)
  const [tab, setTab]               = useState<TabId>('dashboard')
  const [role, setRole]             = useState<RoleKey>('none')
  const [detectingRole, setDetectingRole] = useState(false)

  /* ─── Role detection ─── */
  const detectAndRoute = async (_contracts: Contracts, _account: string) => {
    setDetectingRole(true)
    try {
      const detected = await detectAccountRole(_contracts, _account)
      setRole(detected)
      setTab(roleToTab(detected))
    } finally {
      setDetectingRole(false)
    }
  }

  /* ─── Connect ─── */
  const connect = async () => {
    if (!window.ethereum) return alert('Please install MetaMask')
    await window.ethereum.request({ method: 'eth_requestAccounts' })
    const _provider  = new ethers.providers.Web3Provider(window.ethereum)
    const _signer    = _provider.getSigner()
    const _account   = await _signer.getAddress()
    const _network   = await _provider.getNetwork()
    const _contracts = getContracts(_signer)
    setProvider(_provider)
    setAccount(_account)
    setNetwork(_network)
    setContracts(_contracts)
    await detectAndRoute(_contracts, _account)
  }

  /* ─── Account / chain switch ─── */
  useEffect(() => {
    if (!window.ethereum) return

    const handleAccountsChanged = async (accounts: string[]) => {
      if (accounts.length === 0) {
        setAccount(null); setProvider(null)
        setContracts(null); setNetwork(null)
        setRole('none'); setTab('dashboard')
        return
      }
      const _provider  = new ethers.providers.Web3Provider(window.ethereum)
      const _signer    = _provider.getSigner()
      const _account   = await _signer.getAddress()
      const _network   = await _provider.getNetwork()
      const _contracts = getContracts(_signer)
      setProvider(_provider)
      setAccount(_account)
      setNetwork(_network)
      setContracts(_contracts)
      await detectAndRoute(_contracts, _account)
    }

    const handleChainChanged = () => window.location.reload()

    window.ethereum.on('accountsChanged', handleAccountsChanged)
    window.ethereum.on('chainChanged',    handleChainChanged)

    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
      window.ethereum.removeListener('chainChanged',    handleChainChanged)
    }
  }, [])

  const logout = () => {
    setAccount(null); setProvider(null)
    setContracts(null); setNetwork(null)
    setRole('none'); setTab('dashboard')
  }

  const networkName = network
    ? network.chainId === 1337 || network.chainId === 1774013124061
      ? 'Ganache Local'
      : network.chainId === 80002
        ? 'Polygon Amoy'
        : `Chain ${network.chainId}`
    : null

  const banner = ROLE_BANNER[role]

  return (
    <>
      <Toaster position="top-right" richColors closeButton />
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)' }}>
        <TopBar account={account} networkName={networkName} onConnect={connect} onLogout={logout} />

        {!account ? (
          <LandingPage onConnect={connect} />
        ) : (
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            <Sidebar active={tab} onChange={setTab} account={account} role={role} />

            <main style={{ flex: 1, overflowY: 'auto', minWidth: 0, background: 'var(--bg)' }}>

              {/* Role banner — shown while detecting or when role is known */}
              {(detectingRole || banner) && (
                <div style={{
                  margin: '20px 44px 0',
                  borderRadius: 10,
                  padding: '10px 16px',
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: detectingRole ? 'var(--surface2)' : banner!.bg,
                  border: `1px solid ${detectingRole ? 'var(--border)' : banner!.border}`,
                  transition: 'all 0.3s',
                }}>
                  {detectingRole ? (
                    <>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-dim)', animation: 'pulseDot 1s ease-in-out infinite' }} />
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.3px' }}>
                        Detecting role from on-chain data…
                      </p>
                    </>
                  ) : banner ? (
                    <>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: banner.color, boxShadow: `0 0 5px ${banner.color}` }} />
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: banner.color, letterSpacing: '0.3px', fontWeight: 500 }}>
                        {banner.label}
                      </p>
                      <span style={{ width: 1, height: 12, background: 'var(--border2)' }} />
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.2px' }}>
                        {banner.desc}
                      </p>
                    </>
                  ) : null}
                </div>
              )}

              {tab === 'dashboard'  && <DashboardPanel contracts={contracts} account={account} />}
              {tab === 'gov'        && <GovPanel contracts={contracts} />}
              {tab === 'contractor' && <ContractorPanel contracts={contracts} account={account} />}
              {tab === 'inspector'  && <InspectorPanel contracts={contracts} account={account} />}
              {tab === 'audit'      && <AuditPanel contracts={contracts} provider={provider} />}
            </main>
          </div>
        )}
      </div>
    </>
  )
}