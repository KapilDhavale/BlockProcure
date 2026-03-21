// import { useState } from 'react'
// import { ethers } from 'ethers'
// import { Loader2, CheckCircle, Search } from 'lucide-react'
// import { toast } from 'sonner'
// import { cn } from '@/lib/utils'
// import { StatusBadge } from '@/components/shared/StatusBadge'
// import type { Contracts } from '@/lib/contracts'

// function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
//     return (
//         <div>
//             <label className="block text-xs font-medium text-zinc-500 mb-1">{label}</label>
//             <input {...props} className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-colors" />
//         </div>
//     )
// }

// export function InspectorPanel({ contracts }: { contracts: Contracts | null }) {
//     const [projectId, setProjectId] = useState('')
//     const [milestoneId, setMilestoneId] = useState('')
//     const [report, setReport] = useState('')
//     const [status, setStatus] = useState<number | null>(null)
//     const [checking, setChecking] = useState(false)
//     const [loading, setLoading] = useState(false)

//     const checkStatus = async () => {
//         if (!contracts) return toast.error('Connect wallet first')
//         setChecking(true)
//         try {
//             const state = await contracts.milestone.getMilestoneState(parseInt(projectId), parseInt(milestoneId))
//             setStatus(Number(state))
//         } catch (e: any) {
//             toast.error(e?.reason ?? e?.message ?? 'Failed to fetch status')
//         } finally { setChecking(false) }
//     }

//     const approve = async () => {
//         if (!contracts) return toast.error('Connect wallet first')
//         if (!report.trim()) return toast.error('Enter your inspection report')
//         setLoading(true)
//         try {
//             const reportHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(report))
//             const tx = await contracts.milestone.approve(parseInt(projectId), parseInt(milestoneId), reportHash)
//             await tx.wait()
//             toast.success('Approval submitted!', { description: 'Report hash stored on-chain permanently' })
//             // Refresh status
//             const newState = await contracts.milestone.getMilestoneState(parseInt(projectId), parseInt(milestoneId))
//             setStatus(Number(newState))
//         } catch (e: any) {
//             toast.error(e?.reason ?? e?.message ?? 'Transaction failed')
//         } finally { setLoading(false) }
//     }

//     return (
//         <div className="space-y-4">
//             <div>
//                 <h2 className="text-lg font-semibold text-zinc-900">Inspector Panel</h2>
//                 <p className="text-sm text-zinc-500 mt-0.5">Review milestone claims and submit cryptographically-signed approvals.</p>
//             </div>

//             {/* Status checker */}
//             <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
//                 <div className="px-5 py-4 border-b border-zinc-100">
//                     <h3 className="text-sm font-semibold text-zinc-900">Milestone Status</h3>
//                     <p className="text-xs text-zinc-500 mt-0.5">Check current state before approving</p>
//                 </div>
//                 <div className="px-5 py-4 space-y-3">
//                     <div className="grid grid-cols-2 gap-3">
//                         <Field label="Project ID" type="number" placeholder="1" value={projectId} onChange={e => setProjectId(e.target.value)} className="" />
//                         <Field label="Milestone ID" type="number" placeholder="1" value={milestoneId} onChange={e => setMilestoneId(e.target.value)} className="" />
//                     </div>
//                     <div className="flex items-center gap-3">
//                         <button
//                             onClick={checkStatus}
//                             disabled={checking}
//                             className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 transition-colors disabled:opacity-50"
//                         >
//                             {checking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
//                             Check Status
//                         </button>
//                         {status !== null && <StatusBadge state={status} />}
//                     </div>
//                 </div>
//             </div>

//             {/* Approval form */}
//             <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
//                 <div className="px-5 py-4 border-b border-zinc-100">
//                     <h3 className="text-sm font-semibold text-zinc-900">Submit Approval</h3>
//                     <p className="text-xs text-zinc-500 mt-0.5">Your report is hashed and stored on-chain — immutable and tamper-proof</p>
//                 </div>
//                 <div className="px-5 py-4 space-y-3">
//                     <div>
//                         <label className="block text-xs font-medium text-zinc-500 mb-1">Inspection Report</label>
//                         <textarea
//                             rows={5}
//                             value={report}
//                             onChange={e => setReport(e.target.value)}
//                             placeholder="Describe your physical site inspection findings, material quality checks, and compliance notes…"
//                             className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 resize-none"
//                         />
//                     </div>
//                     {report && (
//                         <div className="rounded-lg bg-zinc-50 border border-zinc-100 px-3 py-2">
//                             <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-1">Report hash (stored on-chain)</p>
//                             <p className="font-mono text-xs text-zinc-600 break-all">
//                                 {ethers.utils.keccak256(ethers.utils.toUtf8Bytes(report))}
//                             </p>
//                         </div>
//                     )}
//                     <button
//                         onClick={approve}
//                         disabled={loading || status !== 1}
//                         className={cn(
//                             'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors',
//                             status === 1
//                                 ? 'bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50'
//                                 : 'bg-zinc-300 cursor-not-allowed'
//                         )}
//                     >
//                         {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
//                         {status !== 1 ? 'Milestone must be UNDER REVIEW to approve' : 'Sign Approval'}
//                     </button>
//                 </div>
//             </div>
//         </div>
//     )
// }
import { useState } from 'react'
import { ethers } from 'ethers'
import { Loader2, CheckCircle2, Search, AlertCircle, Clock, XCircle, BadgeCheck } from 'lucide-react'
import { toast } from 'sonner'
import type { Contracts } from '@/lib/contracts'

function SectionHeader({ title, desc }: { title: string; desc: string }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
        {title}
      </h2>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{desc}</p>
    </div>
  )
}

function Card({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--surface-0)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 14,
      overflow: 'hidden',
    }}>
      <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</h3>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>{desc}</p>
      </div>
      <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {children}
      </div>
    </div>
  )
}

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="field-label">{label}</label>
      <input className="field-input" {...props} />
    </div>
  )
}

const STATE_CONFIG: Record<number, {
  label: string
  icon: React.ElementType
  bg: string
  color: string
  border: string
  note: string
}> = {
  0: {
    label: 'Pending',
    icon: Clock,
    bg: 'var(--surface-2)',
    color: 'var(--text-secondary)',
    border: 'var(--border-default)',
    note: 'Contractor has not submitted a claim yet.',
  },
  1: {
    label: 'Under Review',
    icon: AlertCircle,
    bg: '#fefce8',
    color: '#a16207',
    border: '#fde68a',
    note: 'Claim submitted — ready for inspector approval.',
  },
  2: {
    label: 'Approved',
    icon: BadgeCheck,
    bg: '#f0fdf4',
    color: '#15803d',
    border: '#bbf7d0',
    note: 'Threshold met — payment can now be released.',
  },
  3: {
    label: 'Paid',
    icon: CheckCircle2,
    bg: '#eff6ff',
    color: '#1d4ed8',
    border: '#bfdbfe',
    note: 'Payment has been released to the contractor.',
  },
}

function StateBadge({ state }: { state: number }) {
  const cfg = STATE_CONFIG[state]
  if (!cfg) return null
  const Icon = cfg.icon
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 7,
      background: cfg.bg,
      color: cfg.color,
      border: `1px solid ${cfg.border}`,
      borderRadius: 99,
      padding: '6px 14px',
      fontSize: 12,
      fontWeight: 600,
    }}>
      <Icon size={13} />
      {cfg.label}
    </div>
  )
}

export function InspectorPanel({ contracts }: { contracts: Contracts | null }) {
  const [projectId, setProjectId]   = useState('')
  const [milestoneId, setMilestoneId] = useState('')
  const [report, setReport]         = useState('')
  const [status, setStatus]         = useState<number | null>(null)
  const [checking, setChecking]     = useState(false)
  const [loading, setLoading]       = useState(false)

  const checkStatus = async () => {
    if (!contracts) return toast.error('Connect wallet first')
    if (!projectId || !milestoneId) return toast.error('Enter Project ID and Milestone ID')
    setChecking(true)
    try {
      const state = await contracts.milestone.getMilestoneState(
        parseInt(projectId),
        parseInt(milestoneId),
      )
      setStatus(Number(state))
    } catch (e: any) {
      toast.error(e?.reason ?? e?.message ?? 'Failed to fetch status')
    } finally {
      setChecking(false)
    }
  }

  const approve = async () => {
    if (!contracts)     return toast.error('Connect wallet first')
    if (!report.trim()) return toast.error('Enter your inspection report')
    setLoading(true)
    try {
      const reportHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(report))
      const tx = await contracts.milestone.approve(
        parseInt(projectId),
        parseInt(milestoneId),
        reportHash,
      )
      await tx.wait()
      toast.success('Approval submitted!', { description: 'Report hash stored on-chain permanently' })
      const newState = await contracts.milestone.getMilestoneState(
        parseInt(projectId),
        parseInt(milestoneId),
      )
      setStatus(Number(newState))
      setReport('')
    } catch (e: any) {
      toast.error(e?.reason ?? e?.message ?? 'Transaction failed')
    } finally {
      setLoading(false)
    }
  }

  const reportHash = report
    ? ethers.utils.keccak256(ethers.utils.toUtf8Bytes(report))
    : ''

  const canApprove = status === 1

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <SectionHeader
        title="Inspector Panel"
        desc="Review milestone claims and submit cryptographically-signed approvals. Your approval is permanent and publicly attributable."
      />

      {/* ── Status checker ── */}
      <Card
        title="Milestone Status"
        desc="Verify the current state of a milestone before approving"
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 24px' }}>
          <Field
            label="Project ID"
            type="number"
            placeholder="1"
            value={projectId}
            onChange={e => setProjectId(e.target.value)}
          />
          <Field
            label="Milestone ID"
            type="number"
            placeholder="1"
            value={milestoneId}
            onChange={e => setMilestoneId(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={checkStatus}
            disabled={checking}
            className="btn-ghost"
          >
            {checking
              ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
              : <Search size={13} />
            }
            Check Status
          </button>

          {status !== null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <StateBadge state={status} />
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                {STATE_CONFIG[status]?.note}
              </span>
            </div>
          )}
        </div>
      </Card>

      {/* ── Approval form ── */}
      <Card
        title="Submit Approval"
        desc="Your report text is hashed client-side — only the keccak256 hash is stored on-chain as tamper-proof evidence"
      >
        <div>
          <label className="field-label">Inspection Report</label>
          <textarea
            rows={5}
            value={report}
            onChange={e => setReport(e.target.value)}
            placeholder="Describe your physical site inspection findings, material quality checks, measurement results, and compliance notes…"
            style={{
              width: '100%',
              background: 'var(--surface-1)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: 14,
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-sans)',
              resize: 'vertical',
              minHeight: 130,
              outline: 'none',
              transition: 'border-color 0.15s, box-shadow 0.15s',
            }}
            onFocus={e => {
              e.target.style.borderColor = 'var(--accent-border)'
              e.target.style.boxShadow = '0 0 0 3px rgba(67,56,202,0.08)'
            }}
            onBlur={e => {
              e.target.style.borderColor = 'var(--border-subtle)'
              e.target.style.boxShadow = 'none'
            }}
          />
        </div>

        {/* Live hash preview */}
        {reportHash && (
          <div style={{
            background: 'var(--surface-1)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 8,
            padding: '12px 14px',
          }}>
            <p style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--text-tertiary)',
              marginBottom: 5,
            }}>
              Report hash (stored on-chain)
            </p>
            <p style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              color: 'var(--text-secondary)',
              wordBreak: 'break-all',
              lineHeight: 1.6,
            }}>
              {reportHash}
            </p>
          </div>
        )}

        {/* Status gate warning */}
        {status !== null && !canApprove && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 8,
            padding: '10px 14px',
            fontSize: 12,
            color: '#b91c1c',
          }}>
            <XCircle size={13} />
            Milestone must be in UNDER REVIEW state before you can approve.
          </div>
        )}

        <button
          onClick={approve}
          disabled={loading || !canApprove || !report.trim()}
          className="btn-primary"
          style={{
            alignSelf: 'flex-start',
            background: canApprove ? 'var(--accent)' : 'var(--surface-2)',
            color: canApprove ? '#fff' : 'var(--text-tertiary)',
            cursor: canApprove ? 'pointer' : 'not-allowed',
          }}
        >
          {loading
            ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
            : <CheckCircle2 size={13} />
          }
          Sign Approval
        </button>

        <p style={{
          fontSize: 12,
          color: 'var(--text-tertiary)',
          paddingTop: 4,
          borderTop: '1px solid var(--border-subtle)',
          lineHeight: 1.6,
        }}>
          Your wallet address and report hash are permanently recorded on-chain. Once signed,
          this approval cannot be revoked or altered.
        </p>
      </Card>
    </div>
  )
}