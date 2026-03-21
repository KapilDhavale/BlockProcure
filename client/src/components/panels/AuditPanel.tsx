// import { useState, useCallback } from 'react'
// import { RefreshCw, ExternalLink } from 'lucide-react'
// import { toast } from 'sonner'
// import { cn } from '@/lib/utils'
// import type { Contracts } from '@/lib/contracts'
// import type { ethers } from 'ethers'

// type LogEntry = {
//     event: string
//     block: number
//     args: Record<string, string>
//     tx: string
// }

// const EVENT_BADGE: Record<string, string> = {
//     ProjectCreated: 'bg-indigo-50 text-indigo-700 border-indigo-100',
//     FundsLocked: 'bg-amber-50 text-amber-700 border-amber-100',
//     MilestoneCreated: 'bg-sky-50 text-sky-700 border-sky-100',
//     ClaimSubmitted: 'bg-orange-50 text-orange-700 border-orange-100',
//     InspectorApproved: 'bg-violet-50 text-violet-700 border-violet-100',
//     MilestoneApproved: 'bg-emerald-50 text-emerald-700 border-emerald-100',
//     PaymentReleased: 'bg-green-50 text-green-700 border-green-100',
//     InvoiceLogged: 'bg-pink-50 text-pink-700 border-pink-100',
// }

// function formatArgs(event: string, args: any): Record<string, string> {
//     try {
//         switch (event) {
//             case 'ProjectCreated':
//                 return { 'Project #': args.projectId?.toString(), Name: args.name, Budget: args.budget?.toString() + ' wei' }
//             case 'FundsLocked':
//                 return { 'Project #': args.projectId?.toString(), Amount: args.amount?.toString() + ' wei' }
//             case 'MilestoneCreated':
//                 return { 'Project #': args.projectId?.toString(), 'Milestone #': args.milestoneId?.toString(), Amount: args.amount?.toString() + ' wei' }
//             case 'ClaimSubmitted':
//                 return { 'Project #': args.projectId?.toString(), 'Milestone #': args.milestoneId?.toString() }
//             case 'InspectorApproved':
//                 return { 'Project #': args.projectId?.toString(), 'Milestone #': args.milestoneId?.toString(), Inspector: args.inspector?.slice(0, 10) + '…' }
//             case 'MilestoneApproved':
//                 return { 'Project #': args.projectId?.toString(), 'Milestone #': args.milestoneId?.toString() }
//             case 'PaymentReleased':
//                 return { 'Project #': args.projectId?.toString(), 'Milestone #': args.milestoneId?.toString(), Amount: args.amount?.toString() + ' wei' }
//             default:
//                 return {}
//         }
//     } catch { return {} }
// }

// export function AuditPanel({ contracts, provider }: { contracts: Contracts | null; provider: ethers.providers.Web3Provider | null }) {
//     const [logs, setLogs] = useState<LogEntry[]>([])
//     const [loading, setLoading] = useState(false)

//     const fetchEvents = useCallback(async () => {
//         if (!contracts || !provider) return toast.error('Connect wallet first')
//         setLoading(true)
//         try {
//             const [
//                 projCreated, fundsLocked, msCreated, claimSub, inspApproved, msApproved, pmtReleased, invLogged,
//             ] = await Promise.all([
//                 contracts.registry.queryFilter(contracts.registry.filters.ProjectCreated(), 0, 'latest'),
//                 contracts.vault.queryFilter(contracts.vault.filters.FundsLocked(), 0, 'latest'),
//                 contracts.milestone.queryFilter(contracts.milestone.filters.MilestoneCreated(), 0, 'latest'),
//                 contracts.milestone.queryFilter(contracts.milestone.filters.ClaimSubmitted(), 0, 'latest'),
//                 contracts.milestone.queryFilter(contracts.milestone.filters.InspectorApproved(), 0, 'latest'),
//                 contracts.milestone.queryFilter(contracts.milestone.filters.MilestoneApproved(), 0, 'latest'),
//                 contracts.vault.queryFilter(contracts.vault.filters.PaymentReleased(), 0, 'latest'),
//                 contracts.vault.queryFilter(contracts.vault.filters.InvoiceLogged(), 0, 'latest'),
//             ])

//             const all = [
//                 ...projCreated.map(e => ({ event: 'ProjectCreated', block: e.blockNumber, args: formatArgs('ProjectCreated', e.args), tx: e.transactionHash })),
//                 ...fundsLocked.map(e => ({ event: 'FundsLocked', block: e.blockNumber, args: formatArgs('FundsLocked', e.args), tx: e.transactionHash })),
//                 ...msCreated.map(e => ({ event: 'MilestoneCreated', block: e.blockNumber, args: formatArgs('MilestoneCreated', e.args), tx: e.transactionHash })),
//                 ...claimSub.map(e => ({ event: 'ClaimSubmitted', block: e.blockNumber, args: formatArgs('ClaimSubmitted', e.args), tx: e.transactionHash })),
//                 ...inspApproved.map(e => ({ event: 'InspectorApproved', block: e.blockNumber, args: formatArgs('InspectorApproved', e.args), tx: e.transactionHash })),
//                 ...msApproved.map(e => ({ event: 'MilestoneApproved', block: e.blockNumber, args: formatArgs('MilestoneApproved', e.args), tx: e.transactionHash })),
//                 ...pmtReleased.map(e => ({ event: 'PaymentReleased', block: e.blockNumber, args: formatArgs('PaymentReleased', e.args), tx: e.transactionHash })),
//                 ...invLogged.map(e => ({ event: 'InvoiceLogged', block: e.blockNumber, args: formatArgs('InvoiceLogged', e.args), tx: e.transactionHash })),
//             ].sort((a, b) => b.block - a.block)

//             setLogs(all)
//             toast.success(`Loaded ${all.length} on-chain events`)
//         } catch (e: any) {
//             toast.error(e?.message ?? 'Failed to fetch events')
//         } finally { setLoading(false) }
//     }, [contracts, provider])

//     return (
//         <div className="space-y-4">
//             <div className="flex items-center justify-between">
//                 <div>
//                     <h2 className="text-lg font-semibold text-zinc-900">Audit Log</h2>
//                     <p className="text-sm text-zinc-500 mt-0.5">Complete on-chain event history — immutable and publicly verifiable.</p>
//                 </div>
//                 <button
//                     onClick={fetchEvents}
//                     disabled={loading}
//                     className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors disabled:opacity-50"
//                 >
//                     <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
//                     {loading ? 'Loading…' : 'Fetch Events'}
//                 </button>
//             </div>

//             <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
//                 {logs.length === 0 ? (
//                     <div className="flex flex-col items-center justify-center py-20 text-center">
//                         <div className="h-12 w-12 rounded-full bg-zinc-100 flex items-center justify-center mb-3">
//                             <RefreshCw className="h-5 w-5 text-zinc-400" />
//                         </div>
//                         <p className="text-sm font-medium text-zinc-600">No events loaded yet</p>
//                         <p className="text-xs text-zinc-400 mt-1">Click "Fetch Events" to load the full on-chain history</p>
//                     </div>
//                 ) : (
//                     <table className="w-full text-sm">
//                         <thead>
//                             <tr className="border-b border-zinc-100 bg-zinc-50/60">
//                                 <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Block</th>
//                                 <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Event</th>
//                                 <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Details</th>
//                                 <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Tx Hash</th>
//                             </tr>
//                         </thead>
//                         <tbody className="divide-y divide-zinc-100">
//                             {logs.map((log, i) => (
//                                 <tr key={i} className="hover:bg-zinc-50/50 transition-colors">
//                                     <td className="px-4 py-3 font-mono text-xs text-zinc-500">#{log.block}</td>
//                                     <td className="px-4 py-3">
//                                         <span className={cn(
//                                             'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium',
//                                             EVENT_BADGE[log.event] ?? 'bg-zinc-50 text-zinc-600 border-zinc-100'
//                                         )}>
//                                             {log.event}
//                                         </span>
//                                     </td>
//                                     <td className="px-4 py-3">
//                                         <div className="flex flex-wrap gap-x-4 gap-y-0.5">
//                                             {Object.entries(log.args).map(([k, v]) => (
//                                                 <span key={k} className="text-xs text-zinc-600">
//                                                     <span className="text-zinc-400">{k}: </span>{v}
//                                                 </span>
//                                             ))}
//                                         </div>
//                                     </td>
//                                     <td className="px-4 py-3 font-mono text-xs text-zinc-400">
//                                         {log.tx.slice(0, 10)}…{log.tx.slice(-6)}
//                                     </td>
//                                 </tr>
//                             ))}
//                         </tbody>
//                     </table>
//                 )}
//             </div>
//         </div>
//     )
// }
import { useState, useCallback } from 'react'
import { RefreshCw, ExternalLink, ArrowUpRight } from 'lucide-react'
import { toast } from 'sonner'
import type { Contracts } from '@/lib/contracts'
import type { ethers } from 'ethers'

type LogEntry = {
  event: string
  block: number
  args: Record<string, string>
  tx: string
}

/* Event color config */
const EVENT_STYLE: Record<string, { bg: string; color: string; border: string; dot: string }> = {
  ProjectCreated:   { bg: '#eef2ff', color: '#4338ca', border: '#c7d2fe', dot: '#4338ca' },
  FundsLocked:      { bg: '#fffbeb', color: '#b45309', border: '#fde68a', dot: '#d97706' },
  MilestoneCreated: { bg: '#f0f9ff', color: '#0369a1', border: '#bae6fd', dot: '#0ea5e9' },
  ClaimSubmitted:   { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa', dot: '#f97316' },
  InspectorApproved:{ bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe', dot: '#7c3aed' },
  MilestoneApproved:{ bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0', dot: '#16a34a' },
  PaymentReleased:  { bg: '#dcfce7', color: '#166534', border: '#86efac', dot: '#16a34a' },
  InvoiceLogged:    { bg: '#fdf4ff', color: '#7e22ce', border: '#e9d5ff', dot: '#a21caf' },
}

function formatArgs(event: string, args: any): Record<string, string> {
  try {
    switch (event) {
      case 'ProjectCreated':
        return { 'Project': `#${args.projectId}`, 'Name': args.name, 'Budget': `${args.budget} wei` }
      case 'FundsLocked':
        return { 'Project': `#${args.projectId}`, 'Amount': `${args.amount} wei` }
      case 'MilestoneCreated':
        return { 'Project': `#${args.projectId}`, 'Milestone': `#${args.milestoneId}`, 'Amount': `${args.amount} wei` }
      case 'ClaimSubmitted':
        return { 'Project': `#${args.projectId}`, 'Milestone': `#${args.milestoneId}` }
      case 'InspectorApproved':
        return { 'Project': `#${args.projectId}`, 'Milestone': `#${args.milestoneId}`, 'Inspector': `${args.inspector?.slice(0, 8)}…` }
      case 'MilestoneApproved':
        return { 'Project': `#${args.projectId}`, 'Milestone': `#${args.milestoneId}` }
      case 'PaymentReleased':
        return { 'Project': `#${args.projectId}`, 'Milestone': `#${args.milestoneId}`, 'Amount': `${args.amount} wei`, 'To': `${args.contractor?.slice(0, 8)}…` }
      case 'InvoiceLogged':
        return { 'Project': `#${args.projectId}`, 'Supplier': `${args.supplier?.slice(0, 8)}…` }
      default:
        return {}
    }
  } catch { return {} }
}

function EventPill({ event }: { event: string }) {
  const style = EVENT_STYLE[event] ?? {
    bg: 'var(--surface-2)', color: 'var(--text-secondary)',
    border: 'var(--border-default)', dot: 'var(--text-tertiary)',
  }
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      background: style.bg,
      color: style.color,
      border: `1px solid ${style.border}`,
      borderRadius: 99,
      padding: '3px 10px',
      fontSize: 11,
      fontWeight: 600,
      whiteSpace: 'nowrap',
    }}>
      <span style={{
        width: 5, height: 5,
        borderRadius: '50%',
        background: style.dot,
        flexShrink: 0,
      }} />
      {event}
    </span>
  )
}

export function AuditPanel({
  contracts,
  provider,
}: {
  contracts: Contracts | null
  provider: ethers.providers.Web3Provider | null
}) {
  const [logs, setLogs]     = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(false)

  const fetchEvents = useCallback(async () => {
    if (!contracts || !provider) return toast.error('Connect wallet first')
    setLoading(true)
    try {
      const [
        projCreated, fundsLocked, msCreated, claimSub,
        inspApproved, msApproved, pmtReleased, invLogged,
      ] = await Promise.all([
        contracts.registry.queryFilter(contracts.registry.filters.ProjectCreated(), 0, 'latest'),
        contracts.vault.queryFilter(contracts.vault.filters.FundsLocked(), 0, 'latest'),
        contracts.milestone.queryFilter(contracts.milestone.filters.MilestoneCreated(), 0, 'latest'),
        contracts.milestone.queryFilter(contracts.milestone.filters.ClaimSubmitted(), 0, 'latest'),
        contracts.milestone.queryFilter(contracts.milestone.filters.InspectorApproved(), 0, 'latest'),
        contracts.milestone.queryFilter(contracts.milestone.filters.MilestoneApproved(), 0, 'latest'),
        contracts.vault.queryFilter(contracts.vault.filters.PaymentReleased(), 0, 'latest'),
        contracts.vault.queryFilter(contracts.vault.filters.InvoiceLogged(), 0, 'latest'),
      ])

      const all: LogEntry[] = [
        ...projCreated.map(e   => ({ event: 'ProjectCreated',    block: e.blockNumber, args: formatArgs('ProjectCreated',    e.args), tx: e.transactionHash })),
        ...fundsLocked.map(e   => ({ event: 'FundsLocked',       block: e.blockNumber, args: formatArgs('FundsLocked',       e.args), tx: e.transactionHash })),
        ...msCreated.map(e     => ({ event: 'MilestoneCreated',  block: e.blockNumber, args: formatArgs('MilestoneCreated',  e.args), tx: e.transactionHash })),
        ...claimSub.map(e      => ({ event: 'ClaimSubmitted',    block: e.blockNumber, args: formatArgs('ClaimSubmitted',    e.args), tx: e.transactionHash })),
        ...inspApproved.map(e  => ({ event: 'InspectorApproved', block: e.blockNumber, args: formatArgs('InspectorApproved', e.args), tx: e.transactionHash })),
        ...msApproved.map(e    => ({ event: 'MilestoneApproved', block: e.blockNumber, args: formatArgs('MilestoneApproved', e.args), tx: e.transactionHash })),
        ...pmtReleased.map(e   => ({ event: 'PaymentReleased',   block: e.blockNumber, args: formatArgs('PaymentReleased',   e.args), tx: e.transactionHash })),
        ...invLogged.map(e     => ({ event: 'InvoiceLogged',     block: e.blockNumber, args: formatArgs('InvoiceLogged',     e.args), tx: e.transactionHash })),
      ].sort((a, b) => b.block - a.block)

      setLogs(all)
      toast.success(`${all.length} events loaded`)
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to fetch events')
    } finally {
      setLoading(false)
    }
  }, [contracts, provider])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Audit Log
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            Complete on-chain event history — immutable, publicly verifiable, sourced directly from contract events.
          </p>
        </div>

        <button
          onClick={fetchEvents}
          disabled={loading}
          className="btn-primary"
          style={{ flexShrink: 0, marginTop: 2 }}
        >
          <RefreshCw
            size={13}
            style={loading ? { animation: 'spin 1s linear infinite' } : undefined}
          />
          {loading ? 'Loading…' : 'Fetch Events'}
        </button>
      </div>

      {/* Stats row — only when logs exist */}
      {logs.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {[
            { label: 'Total events',  value: logs.length },
            { label: 'Projects',      value: logs.filter(l => l.event === 'ProjectCreated').length },
            { label: 'Payments',      value: logs.filter(l => l.event === 'PaymentReleased').length },
            { label: 'Approvals',     value: logs.filter(l => l.event === 'InspectorApproved').length },
          ].map(({ label, value }) => (
            <div key={label} style={{
              background: 'var(--surface-0)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 12,
              padding: '16px 20px',
            }}>
              <p style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {label}
              </p>
              <p style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
                {value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div style={{
        background: 'var(--surface-0)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 14,
        overflow: 'hidden',
      }}>
        {logs.length === 0 ? (
          /* Empty state */
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '80px 40px',
            textAlign: 'center',
            gap: 12,
          }}>
            <div style={{
              width: 48, height: 48,
              borderRadius: '50%',
              background: 'var(--surface-2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <RefreshCw size={20} color="var(--text-tertiary)" />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                No events loaded
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
                Click "Fetch Events" to load the complete on-chain history
              </p>
            </div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--surface-1)' }}>
                {['Block', 'Event', 'Details', 'Transaction'].map(col => (
                  <th key={col} style={{
                    padding: '12px 20px',
                    textAlign: 'left',
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--text-tertiary)',
                    whiteSpace: 'nowrap',
                  }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <tr
                  key={i}
                  style={{
                    borderBottom: i < logs.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-1)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {/* Block */}
                  <td style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      color: 'var(--text-tertiary)',
                    }}>
                      #{log.block.toLocaleString()}
                    </span>
                  </td>

                  {/* Event pill */}
                  <td style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>
                    <EventPill event={log.event} />
                  </td>

                  {/* Details */}
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 20px' }}>
                      {Object.entries(log.args).map(([k, v]) => (
                        <span key={k} style={{ fontSize: 12, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                          <span style={{ color: 'var(--text-tertiary)' }}>{k}: </span>
                          <span style={{ fontWeight: 500 }}>{v}</span>
                        </span>
                      ))}
                    </div>
                  </td>

                  {/* Tx hash */}
                  <td style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 11,
                        color: 'var(--text-tertiary)',
                      }}>
                        {log.tx.slice(0, 8)}…{log.tx.slice(-6)}
                      </span>
                      <button
                        title="View on explorer"
                        onClick={() => {
                          const url = `https://amoy.polygonscan.com/tx/${log.tx}`
                          window.open(url, '_blank', 'noopener,noreferrer')
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 2,
                          borderRadius: 4,
                          color: 'var(--text-tertiary)',
                          display: 'flex',
                          alignItems: 'center',
                          transition: 'color 0.12s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}
                      >
                        <ArrowUpRight size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer note */}
      {logs.length > 0 && (
        <p style={{ fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center' }}>
          {logs.length} events · sorted by block descending · all data sourced directly from the blockchain
        </p>
      )}
    </div>
  )
}