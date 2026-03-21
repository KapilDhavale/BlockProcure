import { useState, useCallback, useEffect } from 'react'
import { ethers } from 'ethers'
import { RefreshCw, AlertCircle, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import type { Contracts } from '@/lib/contracts'

/* ─── TYPES ─── */

type LogEntry = {
  event:  string
  block:  number
  ts:     string   // formatted time — block number as proxy
  args:   Record<string, string>
  tx:     string
  raw:    any
}

type FilterKey = 'all' | string

/* ─── EVENT CONFIG ─── */

const EVENT_CONFIG: Record<string, {
  color: string; bg: string; border: string
  icon: React.ReactNode
  label: string
}> = {
  ProjectCreated:    { color: 'var(--gold)',    bg: 'rgba(201,162,77,0.15)',   border: 'rgba(201,162,77,0.25)',   label: 'ProjectCreated',    icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="2" y="2" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.4"/><path d="M5 7h4M7 5v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg> },
  FundsLocked:       { color: 'var(--amber)',   bg: 'rgba(224,154,48,0.15)',   border: 'rgba(224,154,48,0.25)',   label: 'FundsLocked',       icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="2.5" y="6" width="9" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><path d="M4.5 6V4.5a2.5 2.5 0 015 0V6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg> },
  MilestoneCreated:  { color: 'var(--blue)',    bg: 'rgba(74,158,255,0.15)',   border: 'rgba(74,158,255,0.25)',   label: 'MilestoneCreated',  icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7h10M7 2v10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
  ClaimSubmitted:    { color: 'var(--red)',     bg: 'rgba(224,82,82,0.15)',    border: 'rgba(224,82,82,0.25)',    label: 'ClaimSubmitted',    icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 10.5h10M7 2.5v6M4 5.5l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  InspectorApproved: { color: '#9b7fe8',        bg: 'rgba(155,127,232,0.15)',  border: 'rgba(155,127,232,0.25)', label: 'InspectorApproved', icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="4" stroke="currentColor" strokeWidth="1.4"/><path d="M5 7l1.5 1.5L9 5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  MilestoneApproved: { color: 'var(--green)',   bg: 'rgba(77,187,138,0.15)',   border: 'rgba(77,187,138,0.25)',   label: 'MilestoneApproved', icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2l1.5 3 3.5.5-2.5 2.5.5 3.5L7 10l-3 1.5.5-3.5L2 5.5 5.5 5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg> },
  PaymentReleased:   { color: 'var(--green)',   bg: 'rgba(77,187,138,0.2)',    border: 'rgba(77,187,138,0.35)',   label: 'PaymentReleased',   icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7l3 3 7-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  InvoiceLogged:     { color: '#c084fc',        bg: 'rgba(192,132,252,0.15)',  border: 'rgba(192,132,252,0.25)', label: 'InvoiceLogged',     icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 2h8a1 1 0 011 1v9l-2-1.5L8 12l-2-1.5L4 12l-2 1.5V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg> },
}

/* ─── ARG FORMATTING ─── */

function fmtWei(val: any): string {
  try { return parseFloat(ethers.utils.formatEther(val)).toFixed(4) + ' ETH' }
  catch { return String(val) }
}

function fmtAddr(addr: string): string {
  return `${addr.slice(0, 8)}…${addr.slice(-6)}`
}

function formatArgs(event: string, args: any): Record<string, string> {
  try {
    switch (event) {
      case 'ProjectCreated':
        return { 'id': `#${args.projectId}`, 'name': args.name, 'budget': fmtWei(args.budget) }
      case 'FundsLocked':
        return { 'project': `#${args.projectId}`, 'amount': fmtWei(args.amount) }
      case 'MilestoneCreated':
        return { 'project': `#${args.projectId}`, 'milestone': `#${args.milestoneId}`, 'amount': fmtWei(args.amount) }
      case 'ClaimSubmitted':
        return { 'project': `#${args.projectId}`, 'milestone': `#${args.milestoneId}`, 'evidence': `${String(args.evidenceHash).slice(0, 10)}…` }
      case 'InspectorApproved':
        return { 'project': `#${args.projectId}`, 'milestone': `#${args.milestoneId}`, 'inspector': fmtAddr(args.inspector) }
      case 'MilestoneApproved':
        return { 'project': `#${args.projectId}`, 'milestone': `#${args.milestoneId}` }
      case 'PaymentReleased':
        return { 'project': `#${args.projectId}`, 'milestone': `#${args.milestoneId}`, 'amount': fmtWei(args.amount), 'to': fmtAddr(args.contractor) }
      case 'InvoiceLogged':
        return { 'project': `#${args.projectId}`, 'supplier': fmtAddr(args.supplier) }
      default:
        return {}
    }
  } catch { return {} }
}

/* ─── ARG VALUE COLOR ─── */

function argValColor(key: string, val: string): string {
  if (key === 'amount' || key === 'budget') return 'var(--gold)'
  if (key === 'to' || key === 'contractor' || key === 'inspector') return 'var(--blue)'
  if (key === 'name') return 'var(--text)'
  if (key === 'id' || key === 'project' || key === 'milestone') return 'var(--text-sub)'
  return 'var(--text-sub)'
}

/* ─── COMPONENT ─── */

export function AuditPanel({
  contracts,
  provider,
}: {
  contracts: Contracts | null
  provider: ethers.providers.Web3Provider | null
}) {
  const [logs, setLogs]       = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter]   = useState<FilterKey>('all')
  const [error, setError]     = useState<string | null>(null)

    

  /* ─── FETCH ─── */

  const fetchEvents = useCallback(async () => {
    if (!contracts || !provider) return toast.error('Connect wallet first')
    setLoading(true)
    setError(null)
    try {
      const [
        projCreated, fundsLocked, msCreated, claimSub,
        inspApproved, msApproved, pmtReleased, invLogged,
      ] = await Promise.all([
        contracts.registry.queryFilter(contracts.registry.filters.ProjectCreated(),    0, 'latest'),
        contracts.vault.queryFilter(contracts.vault.filters.FundsLocked(),             0, 'latest'),
        contracts.milestone.queryFilter(contracts.milestone.filters.MilestoneCreated(), 0, 'latest'),
        contracts.milestone.queryFilter(contracts.milestone.filters.ClaimSubmitted(),  0, 'latest'),
        contracts.milestone.queryFilter(contracts.milestone.filters.InspectorApproved(), 0, 'latest'),
        contracts.milestone.queryFilter(contracts.milestone.filters.MilestoneApproved(), 0, 'latest'),
        contracts.vault.queryFilter(contracts.vault.filters.PaymentReleased(),         0, 'latest'),
        contracts.vault.queryFilter(contracts.vault.filters.InvoiceLogged(),           0, 'latest'),
      ])

      const all: LogEntry[] = [
        ...projCreated.map(e   => ({ event: 'ProjectCreated',    block: e.blockNumber, ts: `Block #${e.blockNumber}`, args: formatArgs('ProjectCreated',    e.args), tx: e.transactionHash, raw: e })),
        ...fundsLocked.map(e   => ({ event: 'FundsLocked',       block: e.blockNumber, ts: `Block #${e.blockNumber}`, args: formatArgs('FundsLocked',       e.args), tx: e.transactionHash, raw: e })),
        ...msCreated.map(e     => ({ event: 'MilestoneCreated',  block: e.blockNumber, ts: `Block #${e.blockNumber}`, args: formatArgs('MilestoneCreated',  e.args), tx: e.transactionHash, raw: e })),
        ...claimSub.map(e      => ({ event: 'ClaimSubmitted',    block: e.blockNumber, ts: `Block #${e.blockNumber}`, args: formatArgs('ClaimSubmitted',    e.args), tx: e.transactionHash, raw: e })),
        ...inspApproved.map(e  => ({ event: 'InspectorApproved', block: e.blockNumber, ts: `Block #${e.blockNumber}`, args: formatArgs('InspectorApproved', e.args), tx: e.transactionHash, raw: e })),
        ...msApproved.map(e    => ({ event: 'MilestoneApproved', block: e.blockNumber, ts: `Block #${e.blockNumber}`, args: formatArgs('MilestoneApproved', e.args), tx: e.transactionHash, raw: e })),
        ...pmtReleased.map(e   => ({ event: 'PaymentReleased',   block: e.blockNumber, ts: `Block #${e.blockNumber}`, args: formatArgs('PaymentReleased',   e.args), tx: e.transactionHash, raw: e })),
        ...invLogged.map(e     => ({ event: 'InvoiceLogged',     block: e.blockNumber, ts: `Block #${e.blockNumber}`, args: formatArgs('InvoiceLogged',     e.args), tx: e.transactionHash, raw: e })),
      ].sort((a, b) => b.block - a.block)

      setLogs(all)
      setFilter('all')
      toast.success(`${all.length} events loaded`, { description: 'Sorted by block descending' })
    } catch (e: any) {
      setError(e?.message ?? 'Failed to fetch events')
      toast.error('Failed to fetch events')
    } finally {
      setLoading(false)
    }
  }, [contracts, provider])

  // ← ADD HERE, after fetchEvents is declared
useEffect(() => {
  if (contracts && provider) fetchEvents()
}, [fetchEvents])

  /* ─── DERIVED ─── */

  const filtered = filter === 'all' ? logs : logs.filter(l => l.event === filter)
  const eventTypes = [...new Set(logs.map(l => l.event))]

  const stats = [
    { label: 'Total Events',  value: logs.length,                                            sub: `· ${eventTypes.length} event types`     },
    { label: 'Projects',      value: logs.filter(l => l.event === 'ProjectCreated').length,  sub: '· created on-chain'                     },
    { label: 'Payments',      value: logs.filter(l => l.event === 'PaymentReleased').length, sub: '· ETH released'                         },
    { label: 'Approvals',     value: logs.filter(l => l.event === 'InspectorApproved').length, sub: '· inspector signatures'               },
  ]

  /* ─── UI ─── */

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 44px' }}>

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 36 }}>
        <div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 6 }}>
            Blockchain
          </p>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 34, letterSpacing: '-0.5px', color: 'var(--text)', lineHeight: 1.1 }}>
            Audit <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Log</em>
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 5, fontWeight: 300 }}>
            {logs.length > 0
              ? `${logs.length} events · immutable · publicly verifiable · sourced from contract events`
              : 'Complete on-chain event history — immutable and publicly verifiable'
            }
          </p>
        </div>
        <button
          onClick={fetchEvents}
          disabled={loading}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            background: 'var(--gold)', color: '#0d0f14', border: 'none',
            borderRadius: 9, padding: '10px 18px',
            fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = 'var(--gold2)'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(201,162,77,0.28)' } }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--gold)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
        >
          <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          {loading ? 'Loading…' : logs.length > 0 ? 'Refresh Events' : 'Fetch Events'}
        </button>
      </div>

      {/* ERROR */}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(224,82,82,0.08)', border: '1px solid rgba(224,82,82,0.2)', borderRadius: 12, padding: '14px 18px', marginBottom: 24 }}>
          <AlertCircle size={16} color="var(--red)" />
          <p style={{ fontSize: 13, color: 'var(--red)', flex: 1 }}>{error}</p>
          <button onClick={fetchEvents} style={{ fontSize: 12, color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Retry</button>
        </div>
      )}

      {/* STATS */}
      {logs.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
          {stats.map(({ label, value, sub }) => (
            <div key={label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px', position: 'relative', overflow: 'hidden', transition: 'transform 0.3s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)' }}
            >
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 10 }}>{label}</p>
              <p style={{ fontFamily: 'var(--font-serif)', fontSize: 26, color: 'var(--text)', letterSpacing: '-0.3px', lineHeight: 1 }}>{value}</p>
              <p style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 6, fontFamily: 'var(--font-mono)' }}>{sub}</p>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: 'var(--border)' }}>
                <div style={{ height: '100%', width: logs.length > 0 ? `${Math.min(100, (value / logs.length) * 100)}%` : '0%', background: 'linear-gradient(90deg, var(--gold), var(--gold2))', borderRadius: 1, transition: 'width 0.8s cubic-bezier(0.22,1,0.36,1)' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FILTER BAR */}
      {logs.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.6px', textTransform: 'uppercase', color: 'var(--text-dim)', marginRight: 4, flexShrink: 0 }}>
            Filter
          </p>
          {(['all', ...eventTypes] as FilterKey[]).map(f => {
            const isActive = filter === f
            const cfg = f !== 'all' ? EVENT_CONFIG[f] : null
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.4px',
                  padding: '5px 11px', borderRadius: 99,
                  cursor: 'pointer', transition: 'all 0.15s',
                  border: `1px solid ${isActive ? (cfg?.border ?? 'rgba(201,162,77,0.3)') : 'var(--border)'}`,
                  background: isActive ? (cfg?.bg ?? 'var(--gold-soft)') : 'transparent',
                  color: isActive ? (cfg?.color ?? 'var(--gold)') : 'var(--text-dim)',
                }}
              >
                {f === 'all' ? `All (${logs.length})` : `${f} (${logs.filter(l => l.event === f).length})`}
              </button>
            )
          })}
        </div>
      )}

      {/* EMPTY STATE */}
      {!loading && logs.length === 0 && !error && (
        <div style={{ border: '1px dashed var(--border)', borderRadius: 16, padding: '80px 40px', textAlign: 'center' }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--surface2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <RefreshCw size={20} color="var(--text-dim)" />
          </div>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: 20, color: 'var(--text-dim)', fontStyle: 'italic', marginBottom: 8 }}>No events loaded</p>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 24 }}>
            Click Fetch Events to load the complete on-chain history
          </p>
          <button
            onClick={fetchEvents}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'var(--gold)', color: '#0d0f14', border: 'none', borderRadius: 9, padding: '10px 20px', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            <RefreshCw size={13} />
            Fetch Events
          </button>
        </div>
      )}

      {/* LOADING SKELETONS */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} style={{ display: 'flex', gap: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--surface2)', flexShrink: 0, animation: 'skeletonPulse 1.6s ease-in-out infinite', animationDelay: `${i * 0.1}s` }} />
              <div style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px', animation: 'skeletonPulse 1.6s ease-in-out infinite', animationDelay: `${i * 0.1}s` }}>
                <div style={{ width: 140, height: 12, background: 'var(--border2)', borderRadius: 4, marginBottom: 10 }} />
                <div style={{ width: '60%', height: 9, background: 'var(--border)', borderRadius: 3 }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TIMELINE */}
      {!loading && filtered.length > 0 && (
        <div style={{ position: 'relative' }}>

          {/* Vertical line */}
          <div style={{ position: 'absolute', left: 17, top: 18, bottom: 18, width: 1, background: 'linear-gradient(180deg, transparent, var(--border2) 8%, var(--border2) 92%, transparent)', pointerEvents: 'none' }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {filtered.map((log, i) => {
              const cfg = EVENT_CONFIG[log.event] ?? { color: 'var(--text-dim)', bg: 'rgba(74,80,105,0.15)', border: 'rgba(74,80,105,0.2)', icon: null, label: log.event }
              return (
                <div key={i} style={{ display: 'flex', gap: 16, padding: '10px 0', position: 'relative' }}>

                  {/* Timeline dot */}
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                    background: cfg.bg, border: `2px solid var(--bg)`,
                    outline: `1px solid ${cfg.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: cfg.color, zIndex: 1,
                    transition: 'transform 0.2s',
                  }}>
                    {cfg.icon}
                  </div>

                  {/* Event card */}
                  <div style={{
                    flex: 1,
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 12, padding: '14px 18px',
                    transition: 'border-color 0.2s, transform 0.2s',
                  }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = cfg.border; (e.currentTarget as HTMLElement).style.transform = 'translateX(2px)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.transform = 'translateX(0)' }}
                  >
                    {/* Card header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500,
                        letterSpacing: '0.3px', color: cfg.color,
                        background: cfg.bg, border: `1px solid ${cfg.border}`,
                        borderRadius: 5, padding: '3px 8px',
                      }}>
                        {log.event}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.3px' }}>
                        {log.ts}
                      </span>
                    </div>

                    {/* Args */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 10 }}>
                      {Object.entries(log.args).map(([k, v]) => (
                        <div key={k} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 9px', display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.3px' }}>{k}</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: argValColor(k, v), fontWeight: 500 }}>{v}</span>
                        </div>
                      ))}
                    </div>

                    {/* Transaction hash */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.3px' }}>
                        tx: {log.tx.slice(0, 14)}…{log.tx.slice(-8)}
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(log.tx)
                          toast.success('Transaction hash copied')
                        }}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px 4px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: 9, transition: 'color 0.15s' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-dim)')}
                      >
                        <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><rect x="1" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.2"/><path d="M3 3V2a1 1 0 011-1h5a1 1 0 011 1v5a1 1 0 01-1 1H8" stroke="currentColor" strokeWidth="1.2"/></svg>
                        copy
                      </button>
                      <button
                        onClick={() => window.open(`https://amoy.polygonscan.com/tx/${log.tx}`, '_blank', 'noopener,noreferrer')}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px 4px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: 9, transition: 'color 0.15s' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--blue)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-dim)')}
                      >
                        <ExternalLink size={10} />
                        explorer
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* FOOTER */}
      {logs.length > 0 && !loading && (
        <p style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', marginTop: 32, letterSpacing: '0.3px' }}>
          {filtered.length} of {logs.length} events · sorted by block descending · sourced directly from the blockchain
        </p>
      )}
    </div>
  )
}