// import { useState } from 'react'
// import { ethers } from 'ethers'
// import { Loader2, Upload, Copy } from 'lucide-react'
// import { toast } from 'sonner'
// import { cn } from '@/lib/utils'
// import { HashPreview } from '@/components/shared/HashPreview'
// import type { Contracts } from '@/lib/contracts'

// function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
//     return (
//         <div>
//             <label className="block text-xs font-medium text-zinc-500 mb-1">{label}</label>
//             <input {...props} className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-colors" />
//         </div>
//     )
// }

// export function ContractorPanel({ contracts }: { contracts: Contracts | null }) {
//     const [claimText, setClaimText] = useState('')
//     const [projectId, setProjectId] = useState('')
//     const [milestoneId, setMilestoneId] = useState('')
//     const [loading, setLoading] = useState(false)

//     const hash = claimText ? ethers.utils.keccak256(ethers.utils.toUtf8Bytes(claimText)) : ''

//     const submitClaim = async () => {
//         if (!contracts) return toast.error('Connect wallet first')
//         if (!hash) return toast.error('Enter claim evidence text first')
//         setLoading(true)
//         try {
//             const tx = await contracts.milestone.submitClaim(
//                 parseInt(projectId),
//                 parseInt(milestoneId),
//                 hash,
//             )
//             await tx.wait()
//             toast.success('Claim submitted!', { description: 'Milestone is now UNDER REVIEW' })
//         } catch (e: any) {
//             toast.error(e?.reason ?? e?.message ?? 'Transaction failed')
//         } finally { setLoading(false) }
//     }

//     return (
//         <div className="space-y-4">
//             <div>
//                 <h2 className="text-lg font-semibold text-zinc-900">Contractor Panel</h2>
//                 <p className="text-sm text-zinc-500 mt-0.5">Submit work completion claims with cryptographic evidence.</p>
//             </div>

//             {/* Evidence Hasher */}
//             <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
//                 <div className="px-5 py-4 border-b border-zinc-100">
//                     <h3 className="text-sm font-semibold text-zinc-900">Evidence Document Hasher</h3>
//                     <p className="text-xs text-zinc-500 mt-0.5">Paste any text (IPFS CID, report content) — the keccak256 hash is stored on-chain as tamper-proof evidence</p>
//                 </div>
//                 <div className="px-5 py-4 space-y-3">
//                     <div>
//                         <label className="block text-xs font-medium text-zinc-500 mb-1">Claim Evidence Content</label>
//                         <textarea
//                             rows={4}
//                             value={claimText}
//                             onChange={e => setClaimText(e.target.value)}
//                             placeholder="Paste IPFS CID, inspection report, or any evidence content…"
//                             className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 resize-none"
//                         />
//                     </div>
//                     {hash && (
//                         <div className="flex items-start gap-3 rounded-lg bg-indigo-50 border border-indigo-100 px-4 py-3">
//                             <div className="flex-1 min-w-0">
//                                 <p className="text-[10px] font-semibold text-indigo-500 uppercase tracking-wider mb-1">keccak256 Hash — copy this below</p>
//                                 <p className="font-mono text-xs text-indigo-800 break-all">{hash}</p>
//                             </div>
//                             <button
//                                 onClick={() => { navigator.clipboard.writeText(hash); toast.success('Hash copied!') }}
//                                 className="mt-0.5 flex-shrink-0 rounded-md p-1 hover:bg-indigo-100 transition-colors"
//                             >
//                                 <Copy className="h-3.5 w-3.5 text-indigo-500" />
//                             </button>
//                         </div>
//                     )}
//                 </div>
//             </div>

//             {/* Submit Claim */}
//             <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
//                 <div className="px-5 py-4 border-b border-zinc-100">
//                     <h3 className="text-sm font-semibold text-zinc-900">Submit Milestone Claim</h3>
//                     <p className="text-xs text-zinc-500 mt-0.5">Send the evidence hash on-chain to move the milestone to UNDER REVIEW</p>
//                 </div>
//                 <div className="px-5 py-4 space-y-3">
//                     <div className="grid grid-cols-2 gap-3">
//                         <Field label="Project ID" type="number" placeholder="1" value={projectId} onChange={e => setProjectId(e.target.value)} className="" />
//                         <Field label="Milestone ID" type="number" placeholder="1" value={milestoneId} onChange={e => setMilestoneId(e.target.value)} className="" />
//                     </div>
//                     {hash && (
//                         <div>
//                             <label className="block text-xs font-medium text-zinc-500 mb-1">Evidence Hash (auto-filled)</label>
//                             <div className="rounded-lg bg-zinc-50 border border-zinc-200 px-3 py-2 font-mono text-xs text-zinc-600 break-all">{hash}</div>
//                         </div>
//                     )}
//                     <button
//                         onClick={submitClaim}
//                         disabled={loading || !hash}
//                         className={cn(
//                             'flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm',
//                             'hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
//                         )}
//                     >
//                         {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
//                         Submit Claim
//                     </button>
//                 </div>
//             </div>
//         </div>
//     )
// }
import { useState } from 'react'
import { ethers } from 'ethers'
import { Loader2, Upload, Copy, CheckCircle2 } from 'lucide-react'
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

export function ContractorPanel({ contracts }: { contracts: Contracts | null }) {
  const [claimText, setClaimText]   = useState('')
  const [projectId, setProjectId]   = useState('')
  const [milestoneId, setMilestoneId] = useState('')
  const [loading, setLoading]       = useState(false)
  const [submitted, setSubmitted]   = useState(false)

  const hash = claimText
    ? ethers.utils.keccak256(ethers.utils.toUtf8Bytes(claimText))
    : ''

  const copyHash = () => {
    navigator.clipboard.writeText(hash)
    toast.success('Hash copied to clipboard')
  }

  const submitClaim = async () => {
    if (!contracts) return toast.error('Connect wallet first')
    if (!hash)      return toast.error('Enter claim evidence text first')
    if (!projectId || !milestoneId) return toast.error('Enter Project ID and Milestone ID')
    setLoading(true)
    try {
      const tx = await contracts.milestone.submitClaim(
        parseInt(projectId),
        parseInt(milestoneId),
        hash,
      )
      await tx.wait()
      toast.success('Claim submitted!', { description: 'Milestone is now UNDER REVIEW' })
      setSubmitted(true)
      setClaimText('')
      setProjectId('')
      setMilestoneId('')
      setTimeout(() => setSubmitted(false), 4000)
    } catch (e: any) {
      toast.error(e?.reason ?? e?.message ?? 'Transaction failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <SectionHeader
        title="Contractor Panel"
        desc="Submit work completion claims with cryptographic evidence. Your evidence hash is permanent and tamper-proof."
      />

      {/* ── Evidence hasher ── */}
      <Card
        title="Evidence Document Hasher"
        desc="Paste any text — an IPFS CID, site report, or inspection summary. The keccak256 hash is what gets stored on-chain."
      >
        <div>
          <label className="field-label">Claim Evidence Content</label>
          <textarea
            rows={5}
            value={claimText}
            onChange={e => setClaimText(e.target.value)}
            placeholder="Paste IPFS CID, inspection report content, or any evidence text…"
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
              minHeight: 120,
              transition: 'border-color 0.15s, box-shadow 0.15s',
              outline: 'none',
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

        {/* Hash preview */}
        {hash && (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            background: 'var(--accent-light)',
            border: '1px solid var(--accent-border)',
            borderRadius: 10,
            padding: '14px 16px',
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--accent)',
                marginBottom: 6,
              }}>
                keccak256 hash — stored on-chain
              </p>
              <p style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                color: 'var(--text-primary)',
                wordBreak: 'break-all',
                lineHeight: 1.6,
              }}>
                {hash}
              </p>
            </div>
            <button
              onClick={copyHash}
              title="Copy hash"
              style={{
                flexShrink: 0,
                background: 'transparent',
                border: '1px solid var(--accent-border)',
                borderRadius: 6,
                padding: '5px 8px',
                cursor: 'pointer',
                color: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(67,56,202,0.08)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <Copy size={13} />
            </button>
          </div>
        )}
      </Card>

      {/* ── Submit claim ── */}
      <Card
        title="Submit Milestone Claim"
        desc="Send the evidence hash on-chain. The milestone transitions to UNDER REVIEW and inspectors are notified."
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

        {/* Auto-filled hash */}
        {hash && (
          <div>
            <label className="field-label">Evidence Hash (auto-filled from above)</label>
            <div style={{
              background: 'var(--surface-1)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 8,
              padding: '10px 14px',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              color: 'var(--text-secondary)',
              wordBreak: 'break-all',
              lineHeight: 1.6,
            }}>
              {hash}
            </div>
          </div>
        )}

        <button
          onClick={submitClaim}
          disabled={loading || !hash || !projectId || !milestoneId}
          className="btn-primary"
          style={{ alignSelf: 'flex-start' }}
        >
          {loading ? (
            <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
          ) : submitted ? (
            <CheckCircle2 size={13} />
          ) : (
            <Upload size={13} />
          )}
          {submitted ? 'Claim Submitted!' : 'Submit Claim'}
        </button>

        {/* Info note */}
        <p style={{
          fontSize: 12,
          color: 'var(--text-tertiary)',
          paddingTop: 4,
          borderTop: '1px solid var(--border-subtle)',
          lineHeight: 1.6,
        }}>
          Once submitted, the evidence hash is immutable on-chain. You cannot modify your claim after submission.
          Inspectors must approve before payment releases.
        </p>
      </Card>
    </div>
  )
}