// import { useState, useEffect } from 'react'
// import { ethers } from 'ethers'
// import { Toaster } from 'sonner'
// import { TopBar } from '@/components/layout/TopBar'
// import { Sidebar, type TabId } from '@/components/layout/Sidebar'
// import { DashboardPanel } from '@/components/panels/DashboardPanel'
// import { GovPanel } from '@/components/panels/GovPanel'
// import { ContractorPanel } from '@/components/panels/ContractorPanel'
// import { InspectorPanel } from '@/components/panels/InspectorPanel'
// import { AuditPanel } from '@/components/panels/AuditPanel'
// import { getContracts, type Contracts } from '@/lib/contracts'
// import { Building2, ShieldCheck, Zap } from 'lucide-react'

// // ... remaining landing page code ...

// declare global {
//   interface Window { ethereum?: any }
// }

// function LandingPage({ onConnect }: { onConnect: () => void }) {
//   return (
//     <div className="flex flex-col min-h-[calc(100vh-56px)]">

//       {/* Hero section — takes most of the space */}
//       <div className="flex-1 flex flex-col items-center justify-center py-12 px-6 space-y-8">
//         <div className="max-w-2xl w-full text-center space-y-8">
//           {/* Badge */}
//           <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-4 py-1.5 text-xs font-medium text-indigo-700">
//             <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
//             Polygon Amoy · Smart Contract Demo
//           </div>

//           {/* Headline */}
//           <div className="space-y-3">
//             <h1 className="text-5xl font-extrabold tracking-tight text-zinc-900 leading-tight">
//               Infrastructure payments,<br />
//               <span className="text-indigo-600">enforced by code.</span>
//             </h1>
//             <p className="text-lg text-zinc-500 max-w-lg mx-auto leading-relaxed">
//               BlockProcure replaces manual approvals with M-of-N inspector multisig.
//               Every document hash is permanent on-chain.
//             </p>
//           </div>

//           {/* Feature pills */}
//           <div className="flex flex-wrap items-center justify-center gap-2">
//             {[
//               { icon: ShieldCheck, label: 'Tamper-proof evidence' },
//               { icon: Zap, label: 'Auto payment release' },
//               { icon: Building2, label: 'Duplicate invoice rejection' },
//             ].map(({ icon: Icon, label }) => (
//               <div key={label} className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm">
//                 <Icon className="h-3.5 w-3.5 text-indigo-500" />
//                 {label}
//               </div>
//             ))}
//           </div>

//           {/* CTA */}
//           <div className="space-y-3">
//             <button
//               onClick={onConnect}
//               className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-10 py-4 text-sm font-bold text-white shadow-xl hover:bg-indigo-700 transition-all hover:-translate-y-0.5"
//             >
//               Connect MetaMask to Begin
//             </button>
//             <p className="text-xs text-zinc-400">Connect to Ganache localhost:7545 or Polygon Amoy</p>
//           </div>
//         </div>
//       </div>

//       {/* Role cards — pinned toward bottom */}
//       <div className="grid grid-cols-4 gap-4 px-10 pb-16 max-w-[1100px] mx-auto w-full">
//         {[
//           { step: '01', role: 'Government', action: 'Creates project, sets inspector threshold & locks budget' },
//           { step: '02', role: 'Contractor', action: 'Submits work claims with cryptographic evidence hashes' },
//           { step: '03', role: 'Inspectors', action: 'Verify evidence and sign approvals until M-of-N is met' },
//           { step: '04', role: 'Payment Vault', action: 'Automatically releases MATIC to the contractor balance' },
//         ].map(({ step, role, action }) => (
//           <div key={step} className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
//             <p className="text-xs font-bold text-indigo-400 mb-3">{step}</p>
//             <p className="text-sm font-bold text-zinc-900 mb-2">{role}</p>
//             <p className="text-xs text-zinc-500 leading-relaxed">{action}</p>
//           </div>
//         ))}
//       </div>
//     </div>
//   )
// }

// export default function App() {
//   const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>(null)
//   const [account, setAccount] = useState<string | null>(null)
//   const [network, setNetwork] = useState<ethers.providers.Network | null>(null)
//   const [contracts, setContracts] = useState<Contracts | null>(null)
//   const [tab, setTab] = useState<TabId>('dashboard')

//   const connect = async () => {
//     if (!window.ethereum) return alert('Please install MetaMask')
//     await window.ethereum.request({ method: 'eth_requestAccounts' })
//     const _provider = new ethers.providers.Web3Provider(window.ethereum)
//     const _signer = _provider.getSigner()
//     const _account = await _signer.getAddress()
//     const _network = await _provider.getNetwork()
//     setProvider(_provider)
//     setAccount(_account)
//     setNetwork(_network)
//     setContracts(getContracts(_signer))
//   }

//   useEffect(() => {
//     if (!window.ethereum) return
//     window.ethereum.on('accountsChanged', () => window.location.reload())
//     window.ethereum.on('chainChanged', () => window.location.reload())
//   }, [])

//   const logout = () => {
//     setAccount(null)
//     setProvider(null)
//     setContracts(null)
//     setNetwork(null)
//   }

//   const networkName = network
//     ? (network.chainId === 1337 || network.chainId === 1774013124061
//       ? 'Ganache Local'
//       : network.chainId === 80002 ? 'Polygon Amoy' : `Chain ${network.chainId}`)
//     : null

//   return (
//     <>
//       <Toaster position="top-right" richColors closeButton />
//       <div className="flex flex-col min-h-screen bg-zinc-50">
//         <TopBar account={account} networkName={networkName} onConnect={connect} onLogout={logout} />

//         {!account ? (
//           <LandingPage onConnect={connect} />
//         ) : (
//           <div className="flex flex-1 overflow-hidden">
//             <Sidebar active={tab} onChange={setTab} account={account} />
//             <main className="flex-1 overflow-y-auto p-6">
//               <div className="max-w-4xl mx-auto">
//                 {tab === 'dashboard' && <DashboardPanel contracts={contracts} account={account} />}
//                 {tab === 'gov' && <GovPanel contracts={contracts} />}
//                 {tab === 'contractor' && <ContractorPanel contracts={contracts} />}
//                 {tab === 'inspector' && <InspectorPanel contracts={contracts} />}
//                 {tab === 'audit' && <AuditPanel contracts={contracts} provider={provider} />}
//               </div>
//             </main>
//           </div>
//         )}
//       </div>
//     </>
//   )
// }


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
import { ShieldCheck, Zap, FileX2, ArrowRight } from 'lucide-react'

declare global {
  interface Window { ethereum?: any }
}

const FEATURES = [
  { icon: ShieldCheck, label: 'Tamper-proof evidence',     desc: 'Every document hashed on-chain' },
  { icon: Zap,         label: 'Auto payment release',      desc: 'Triggered by smart contract logic' },
  { icon: FileX2,      label: 'Duplicate invoice blocking', desc: 'Rejected at submission, not audit' },
]

const ROLES = [
  { n: '01', role: 'Government',    desc: 'Creates project, sets inspector threshold, locks budget in escrow' },
  { n: '02', role: 'Contractor',    desc: 'Submits work completion claims with cryptographic evidence hashes' },
  { n: '03', role: 'Inspectors',    desc: 'Independently verify and sign approvals until M-of-N threshold is met' },
  { n: '04', role: 'Payment Vault', desc: 'Automatically releases MATIC to the contractor — no manual step' },
]

function LandingPage({ onConnect }: { onConnect: () => void }) {
  return (
    <div
      style={{
        minHeight: 'calc(100vh - 56px)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── Hero ──────────────────────────────── */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '80px 40px 60px',
          textAlign: 'center',
        }}
      >
        {/* Network badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--accent-light)',
            border: '1px solid var(--accent-border)',
            borderRadius: 99,
            padding: '5px 14px',
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--accent)',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            marginBottom: 36,
          }}
        >
          <span
            style={{
              width: 6, height: 6,
              borderRadius: '50%',
              background: 'var(--accent)',
            }}
          />
          Polygon Amoy · Smart Contract Demo
        </div>

        {/* Headline */}
        <h1
          style={{
            fontSize: 'clamp(36px, 5vw, 58px)',
            fontWeight: 700,
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
            color: 'var(--text-primary)',
            maxWidth: 700,
            marginBottom: 20,
          }}
        >
          Infrastructure payments,{' '}
          <span style={{ color: 'var(--accent)' }}>enforced by code.</span>
        </h1>

        <p
          style={{
            fontSize: 16,
            color: 'var(--text-secondary)',
            maxWidth: 480,
            lineHeight: 1.7,
            marginBottom: 40,
          }}
        >
          BlockProcure replaces manual approvals with M-of-N inspector multisig.
          Funds release automatically when the threshold is met.
        </p>

        {/* Feature pills */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 10,
            marginBottom: 44,
          }}
        >
          {FEATURES.map(({ icon: Icon, label }) => (
            <div
              key={label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                background: 'var(--surface-0)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 99,
                padding: '7px 14px',
                fontSize: 12,
                fontWeight: 500,
                color: 'var(--text-secondary)',
              }}
            >
              <Icon size={13} color="var(--accent)" />
              {label}
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={onConnect}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            background: 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            padding: '14px 32px',
            fontSize: 14,
            fontWeight: 700,
            fontFamily: 'var(--font-sans)',
            cursor: 'pointer',
            letterSpacing: '-0.01em',
            transition: 'background 0.15s, transform 0.1s',
            marginBottom: 12,
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-hover)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent)')}
        >
          Connect MetaMask to Begin
          <ArrowRight size={15} />
        </button>
        <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
          Connect to Ganache localhost:7545 or Polygon Amoy
        </p>
      </div>

      {/* ── Role cards ────────────────────────── */}
      <div
        style={{
          borderTop: '1px solid var(--border-subtle)',
          background: 'var(--surface-0)',
          padding: '48px 60px 60px',
        }}
      >
        <p
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--text-tertiary)',
            marginBottom: 24,
            textAlign: 'center',
          }}
        >
          How it works
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 20,
            maxWidth: 1100,
            margin: '0 auto',
          }}
        >
          {ROLES.map(({ n, role, desc }) => (
            <div
              key={n}
              style={{
                background: 'var(--surface-1)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 12,
                padding: '24px 22px',
              }}
            >
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--accent)',
                  letterSpacing: '0.06em',
                  marginBottom: 10,
                }}
              >
                {n}
              </p>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
                {role}
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>(null)
  const [account, setAccount]   = useState<string | null>(null)
  const [network, setNetwork]   = useState<ethers.providers.Network | null>(null)
  const [contracts, setContracts] = useState<Contracts | null>(null)
  const [tab, setTab]           = useState<TabId>('dashboard')

  const connect = async () => {
    if (!window.ethereum) return alert('Please install MetaMask')
    await window.ethereum.request({ method: 'eth_requestAccounts' })
    const _provider = new ethers.providers.Web3Provider(window.ethereum)
    const _signer   = _provider.getSigner()
    const _account  = await _signer.getAddress()
    const _network  = await _provider.getNetwork()
    setProvider(_provider)
    setAccount(_account)
    setNetwork(_network)
    setContracts(getContracts(_signer))
  }

  useEffect(() => {
    if (!window.ethereum) return
    window.ethereum.on('accountsChanged', () => window.location.reload())
    window.ethereum.on('chainChanged',    () => window.location.reload())
  }, [])

  const logout = () => {
    setAccount(null); setProvider(null)
    setContracts(null); setNetwork(null)
  }

  const networkName = network
    ? network.chainId === 1337 || network.chainId === 1774013124061
      ? 'Ganache Local'
      : network.chainId === 80002
        ? 'Polygon Amoy'
        : `Chain ${network.chainId}`
    : null

  return (
    <>
      <Toaster position="top-right" richColors closeButton />
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--surface-1)' }}>
        <TopBar
          account={account}
          networkName={networkName}
          onConnect={connect}
          onLogout={logout}
        />

        {!account ? (
          <LandingPage onConnect={connect} />
        ) : (
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            <Sidebar active={tab} onChange={setTab} account={account} />

            {/* ── Main content — full remaining width ── */}
            <main
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '40px 48px',
                minWidth: 0,
              }}
            >
              <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                {tab === 'dashboard'  && <DashboardPanel contracts={contracts} account={account} />}
                {tab === 'gov'        && <GovPanel contracts={contracts} />}
                {tab === 'contractor' && <ContractorPanel contracts={contracts} />}
                {tab === 'inspector'  && <InspectorPanel contracts={contracts} />}
                {tab === 'audit'      && <AuditPanel contracts={contracts} provider={provider} />}
              </div>
            </main>
          </div>
        )}
      </div>
    </>
  )
}