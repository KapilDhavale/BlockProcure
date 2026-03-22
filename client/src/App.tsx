import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { Toaster } from 'sonner'
import { TopBar } from '@/components/layout/TopBar'
import { Sidebar, type TabId } from '@/components/layout/Sidebar'
import { LandingPage } from '@/components/LandingPage'
import { DashboardPanel } from '@/components/panels/DashboardPanel'
import { GovPanel } from '@/components/panels/GovPanel'
import { ContractorPanel } from '@/components/panels/ContractorPanel'
import { InspectorPanel } from '@/components/panels/InspectorPanel'
import { AuditPanel } from '@/components/panels/AuditPanel'
import { getContracts, type Contracts } from '@/lib/contracts'

declare global {
  interface Window { ethereum?: any }
}

/* ─── TYPES ─── */

export type RoleKey = 'gov' | 'contractor' | 'inspector' | 'none'

/* ─── ROLE DETECTION ─── */

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

/* ─── APP ─── */

export default function App() {
  const [provider, setProvider]           = useState<ethers.providers.Web3Provider | null>(null)
  const [account, setAccount]             = useState<string | null>(null)
  const [network, setNetwork]             = useState<ethers.providers.Network | null>(null)
  const [contracts, setContracts]         = useState<Contracts | null>(null)
  const [tab, setTab]                     = useState<TabId>('dashboard')
  const [role, setRole]                   = useState<RoleKey>('none')
  const [detectingRole, setDetectingRole] = useState(false)

  /* ─── Role detection + routing ─── */
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

  /* ─── Connect wallet ─── */
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

  /* ─── Logout ─── */
  const logout = () => {
    setAccount(null); setProvider(null)
    setContracts(null); setNetwork(null)
    setRole('none'); setTab('dashboard')
  }

  /* ─── Derived ─── */
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
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)' }}>

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
            <Sidebar active={tab} onChange={setTab} account={account} role={role} />

            <main style={{ flex: 1, overflowY: 'auto', minWidth: 0, background: 'var(--bg)' }}>

              {/* ── Detecting role — brief loading state only, no persistent banner ── */}
              {detectingRole && (
                <div style={{
                  margin: '16px 44px 0',
                  borderRadius: 8, padding: '8px 14px',
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: 'var(--surface2)',
                  border: '1px solid var(--border)',
                }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--text-dim)', animation: 'pulseDot 1s ease-in-out infinite' }} />
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.3px' }}>
                    Detecting role from on-chain data…
                  </p>
                </div>
              )}

              {/* ── Panels ── */}
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