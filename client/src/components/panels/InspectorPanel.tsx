import { useState, useEffect, useCallback } from 'react'
import { ethers } from 'ethers'
import { Loader2, CheckCircle2, RefreshCw, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import type { Contracts } from '@/lib/contracts'

/* ─── TYPES ─── */

type MilestoneState = 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'PAID'

interface InspectorMilestone {
  id: number
  projectId: number
  projectName: string
  projectLabel: string
  description: string
  amount: number
  state: MilestoneState
  approvalCount: number
  requiredApprovals: number
  hasApproved: boolean
}

/* ─── HELPERS ─── */

const STATE_MAP: Record<number, MilestoneState> = {
  0: 'PENDING',
  1: 'UNDER_REVIEW',
  2: 'APPROVED',
  3: 'PAID',
}

const STATE_META: Record<MilestoneState, { label: string; color: string; bg: string; border: string }> = {
  PENDING:      { label: 'PENDING',      color: 'var(--text-dim)', bg: 'rgba(74,80,105,0.12)',  border: 'rgba(74,80,105,0.2)'  },
  UNDER_REVIEW: { label: 'UNDER REVIEW', color: 'var(--gold)',     bg: 'rgba(201,162,77,0.12)', border: 'rgba(201,162,77,0.2)' },
  APPROVED:     { label: 'APPROVED',     color: 'var(--green)',    bg: 'rgba(77,187,138,0.12)', border: 'rgba(77,187,138,0.2)' },
  PAID:         { label: 'PAID',         color: 'var(--blue)',     bg: 'rgba(74,158,255,0.12)', border: 'rgba(74,158,255,0.2)' },
}

function fmt(wei: ethers.BigNumber): number {
  return parseFloat(parseFloat(ethers.utils.formatEther(wei)).toFixed(4))
}

/* ─── FETCHING ─── */

async function fetchInspectorMilestones(
  contracts: Contracts,
  account: string
): Promise<InspectorMilestone[]> {
  console.log('fetchInspectorMilestones called — account:', account)
  const projectCount: number = (await contracts.registry.projectCount()).toNumber()
  if (projectCount === 0) return []

  const results: InspectorMilestone[] = []

  await Promise.all(
    Array.from({ length: projectCount }, (_, i) => i + 1).map(async (pid) => {
      const [raw, role] = await Promise.all([
        contracts.registry.getProject(pid),
        contracts.registry.projectRoles(pid, account),
      ])
      // ADD THIS TEMPORARILY
console.log(`Project ${pid} — account: ${account} — role: ${Number(role)}`)
      // Role.INSPECTOR = 3
      if (Number(role) !== 3) return

      const msCount: number = (await contracts.milestone.milestoneCount(pid)).toNumber()
      if (msCount === 0) return

      await Promise.all(
        Array.from({ length: msCount }, (_, j) => j + 1).map(async (mid) => {
          const [stateRaw, amount, ms] = await Promise.all([
            contracts.milestone.getMilestoneState(pid, mid),
            contracts.milestone.getMilestoneAmount(pid, mid),
            contracts.milestone.milestones(pid, mid),
          ])

          const state = STATE_MAP[Number(stateRaw)] ?? 'PENDING'
          const approvalCount = Number(ms.approvalCount)
          const requiredApprovals = Number(raw.requiredApprovals)

          // If APPROVED or PAID, the inspector has likely already approved.
          // For UNDER_REVIEW we can't directly read hasApproved mapping from ethers
          // without a dedicated getter — so we conservatively allow approval attempts
          // and let the contract revert if already approved.
          const hasApproved = state === 'APPROVED' || state === 'PAID'

          results.push({
            id: mid,
            projectId: pid,
            projectName: raw.name as string,
            projectLabel: `PRJ-${String(pid).padStart(4, '0')}`,
            description: ms.description as string,
            amount: fmt(amount as ethers.BigNumber),
            state,
            approvalCount,
            requiredApprovals,
            hasApproved,
          })
        })
      )
    })
  )

  // Sort: UNDER_REVIEW first (actionable), then rest
  return results.sort((a, b) => {
    const order: Record<MilestoneState, number> = {
      UNDER_REVIEW: 0, PENDING: 1, APPROVED: 2, PAID: 3,
    }
    return order[a.state] - order[b.state]
  })
}

/* ─── COMPONENT ─── */

interface InspectorPanelProps {
  contracts: Contracts | null
  account:   string | null
}

export function InspectorPanel({ contracts, account }: InspectorPanelProps) {
  const [milestones, setMilestones] = useState<InspectorMilestone[]>([])
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [selected, setSelected]     = useState<InspectorMilestone | null>(null)

  const [report, setReport]         = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted]   = useState(false)

  const reportHash = report.trim()
    ? ethers.utils.keccak256(ethers.utils.toUtf8Bytes(report))
    : ''

  /* ─── LOAD ─── */

  const load = useCallback(async () => {
    console.log('load called — contracts:', !!contracts, 'account:', account)
    if (!contracts || !account) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetchInspectorMilestones(contracts, account)
      setMilestones(data)
      setSelected(prev =>
        prev ? (data.find(m => m.id === prev.id && m.projectId === prev.projectId) ?? null) : null
      )
    } catch (e: any) {
      setError(e.message ?? 'Failed to load milestones')
    } finally {
      setLoading(false)
    }
  }, [contracts, account])

  useEffect(() => { load() }, [load])

  /* ─── APPROVE ─── */

  const approve = async () => {
    if (!contracts || !selected) return
    if (!report.trim()) return toast.error('Enter your inspection report')
    setSubmitting(true)
    try {
      const hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(report))
      const tx = await contracts.milestone.approve(
        selected.projectId,
        selected.id,
        hash,
      )
      await tx.wait()
      toast.success('Approval submitted!', { description: 'Report hash stored on-chain permanently' })
      setSubmitted(true)
      setReport('')
      await load()
      setTimeout(() => setSubmitted(false), 4000)
    } catch (e: any) {
      toast.error(e?.reason ?? e?.message ?? 'Transaction failed')
    } finally {
      setSubmitting(false)
    }
  }

  /* ─── DERIVED ─── */

  const queue     = milestones.filter(m => m.state === 'UNDER_REVIEW')
  const completed = milestones.filter(m => m.state !== 'UNDER_REVIEW')
  const canApprove = selected?.state === 'UNDER_REVIEW' && !!reportHash && !submitting

  /* ─── UI ─── */

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 44px' }}>

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 36 }}>
        <div>
          <p style={{
            fontFamily: 'var(--font-mono)', fontSize: 10,
            letterSpacing: '0.8px', textTransform: 'uppercase',
            color: 'var(--gold)', marginBottom: 6,
          }}>
            Inspector Portal
          </p>
          <h1 style={{
            fontFamily: 'var(--font-serif)', fontSize: 34,
            letterSpacing: '-0.5px', color: 'var(--text)', lineHeight: 1.1,
          }}>
            Review <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Milestones</em>
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 5, fontWeight: 300 }}>
            Inspect submitted claims and sign on-chain approvals. Your signature is permanent and publicly attributable.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          style={{
            background: 'var(--surface2)', border: '1px solid var(--border)',
            color: loading ? 'var(--text-dim)' : 'var(--text-sub)',
            borderRadius: 9, padding: '10px 14px',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
            fontFamily: 'var(--font-sans)', fontSize: 13, transition: 'all 0.2s',
          }}
        >
          <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          {loading ? 'Syncing…' : 'Refresh'}
        </button>
      </div>

      {/* ERROR */}
      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'rgba(224,82,82,0.08)', border: '1px solid rgba(224,82,82,0.2)',
          borderRadius: 12, padding: '14px 18px', marginBottom: 24,
        }}>
          <AlertCircle size={16} color="var(--red)" />
          <p style={{ fontSize: 13, color: 'var(--red)', flex: 1 }}>{error}</p>
          <button onClick={load} style={{
            fontSize: 12, color: 'var(--red)', background: 'none',
            border: 'none', cursor: 'pointer', textDecoration: 'underline',
          }}>
            Retry
          </button>
        </div>
      )}

      {/* EMPTY STATE */}
      {!loading && !error && milestones.length === 0 && (
        <div style={{
          border: '1px dashed var(--border)', borderRadius: 16,
          padding: '60px 40px', textAlign: 'center',
        }}>
          <p style={{
            fontFamily: 'var(--font-serif)', fontSize: 20,
            color: 'var(--text-dim)', fontStyle: 'italic', marginBottom: 8,
          }}>
            No milestones assigned
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>
            You are not listed as an inspector on any active project.
          </p>
        </div>
      )}

      {/* MAIN GRID */}
      {(loading || milestones.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16 }}>

          {/* LEFT — Milestone queue */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Pending review */}
            <PanelCard
              eyebrow="Queue"
              title="Pending Review"
              titleBadge={queue.length > 0 ? String(queue.length) : undefined}
              desc="Milestones awaiting your approval"
            >
              {loading && milestones.length === 0 ? (
                <SkeletonList rows={2} />
              ) : queue.length === 0 ? (
                <p style={{
                  fontSize: 12, color: 'var(--text-dim)',
                  fontStyle: 'italic', textAlign: 'center', padding: '16px 0',
                }}>
                  No milestones pending review
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {queue.map(m => (
                    <MilestoneItem
                      key={`${m.projectId}-${m.id}`}
                      milestone={m}
                      isSelected={selected?.id === m.id && selected?.projectId === m.projectId}
                      onClick={() => { setSelected(m); setReport(''); setSubmitted(false) }}
                    />
                  ))}
                </div>
              )}
            </PanelCard>

            {/* Already reviewed */}
            {completed.length > 0 && (
              <PanelCard eyebrow="History" title="Already Reviewed" desc="Milestones you have processed">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {completed.map(m => (
                    <MilestoneItem
                      key={`${m.projectId}-${m.id}`}
                      milestone={m}
                      isSelected={selected?.id === m.id && selected?.projectId === m.projectId}
                      onClick={() => setSelected(m)}
                      dimmed
                    />
                  ))}
                </div>
              </PanelCard>
            )}
          </div>

          {/* RIGHT — Approval panel */}
          {!selected ? (
            <div style={{
              border: '1px dashed var(--border)', borderRadius: 16,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              padding: '60px 40px', textAlign: 'center',
            }}>
              <p style={{
                fontFamily: 'var(--font-serif)', fontSize: 18,
                color: 'var(--text-dim)', fontStyle: 'italic', marginBottom: 8,
              }}>
                Select a milestone
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>
                Choose a milestone from the queue to review and approve.
              </p>
            </div>
          ) : (
            <PanelCard
              eyebrow="Approval"
              title={selected.description}
              desc="Submit your signed inspection report on-chain"
            >
              {/* Meta chips */}
              <div style={{ display: 'flex', gap: 10 }}>
                {[
                  { label: 'Project',   val: selected.projectName,                                    color: undefined },
                  { label: 'Amount',    val: `${selected.amount} ETH`,                                color: undefined },
                  { label: 'Approvals', val: `${selected.approvalCount} / ${selected.requiredApprovals}`, color: undefined },
                  { label: 'Status',    val: STATE_META[selected.state].label,                        color: STATE_META[selected.state].color },
                ].map(({ label, val, color }) => (
                  <div key={label} style={{
                    flex: 1, background: 'var(--bg)',
                    border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px',
                  }}>
                    <p style={{
                      fontFamily: 'var(--font-mono)', fontSize: 8,
                      letterSpacing: '0.6px', textTransform: 'uppercase',
                      color: 'var(--text-dim)', marginBottom: 4,
                    }}>
                      {label}
                    </p>
                    <p style={{
                      fontSize: 12, fontWeight: 500,
                      color: color ?? 'var(--text-sub)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {val}
                    </p>
                  </div>
                ))}
              </div>

              {/* Already approved / wrong state warnings */}
              {selected.hasApproved && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'rgba(77,187,138,0.08)', border: '1px solid rgba(77,187,138,0.2)',
                  borderRadius: 8, padding: '10px 14px',
                }}>
                  <CheckCircle2 size={14} color="var(--green)" />
                  <p style={{
                    fontSize: 12, color: 'var(--green)',
                    fontFamily: 'var(--font-mono)', letterSpacing: '0.2px',
                  }}>
                    You have already approved this milestone.
                  </p>
                </div>
              )}

              {selected.state !== 'UNDER_REVIEW' && !selected.hasApproved && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'rgba(224,82,82,0.08)', border: '1px solid rgba(224,82,82,0.2)',
                  borderRadius: 8, padding: '10px 14px',
                }}>
                  <AlertCircle size={14} color="var(--red)" />
                  <p style={{
                    fontSize: 12, color: 'var(--red)',
                    fontFamily: 'var(--font-mono)', letterSpacing: '0.2px',
                  }}>
                    Milestone must be UNDER REVIEW before you can approve.
                  </p>
                </div>
              )}

              {/* Report textarea — only show when actionable */}
              {!selected.hasApproved && (
                <>
                  <div>
                    <p style={{
                      fontFamily: 'var(--font-mono)', fontSize: 9,
                      letterSpacing: '0.6px', textTransform: 'uppercase',
                      color: 'var(--text-dim)', marginBottom: 7,
                    }}>
                      Inspection Report
                    </p>
                    <textarea
                      value={report}
                      onChange={e => setReport(e.target.value)}
                      placeholder="Describe your physical site inspection — material quality, measurements, compliance checks…"
                      rows={5}
                      style={{
                        width: '100%', background: 'var(--surface2)',
                        border: '1px solid var(--border)', borderRadius: 10,
                        padding: '12px 14px', color: 'var(--text)',
                        fontFamily: 'var(--font-mono)', fontSize: 12,
                        outline: 'none', resize: 'vertical', minHeight: 120,
                        letterSpacing: '0.3px', lineHeight: 1.6,
                        transition: 'border-color 0.2s',
                      }}
                      onFocus={e => {
                        e.target.style.borderColor = 'rgba(201,162,77,0.35)'
                        e.target.style.boxShadow = '0 0 0 3px rgba(201,162,77,0.07)'
                      }}
                      onBlur={e => {
                        e.target.style.borderColor = 'var(--border)'
                        e.target.style.boxShadow = 'none'
                      }}
                    />
                  </div>

                  {/* Hash preview */}
                  {reportHash && (
                    <div style={{
                      background: 'var(--bg)',
                      border: '1px solid rgba(201,162,77,0.2)',
                      borderRadius: 10, padding: 14,
                    }}>
                      <p style={{
                        fontFamily: 'var(--font-mono)', fontSize: 9,
                        letterSpacing: '0.6px', textTransform: 'uppercase',
                        color: 'var(--gold)', marginBottom: 8,
                      }}>
                        Report hash — stored on-chain
                      </p>
                      <p style={{
                        fontFamily: 'var(--font-mono)', fontSize: 11,
                        color: 'var(--text-sub)', wordBreak: 'break-all', lineHeight: 1.6,
                      }}>
                        {reportHash}
                      </p>
                    </div>
                  )}

                  {/* Submit button */}
                  <button
                    onClick={approve}
                    disabled={!canApprove}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', gap: 7,
                      background: submitted ? 'var(--green)' : canApprove ? 'var(--gold)' : 'var(--surface3)',
                      border: `1px solid ${submitted ? 'var(--green)' : canApprove ? 'var(--gold)' : 'var(--border)'}`,
                      color: canApprove || submitted ? '#0d0f14' : 'var(--text-dim)',
                      borderRadius: 9, padding: '12px 20px',
                      fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600,
                      cursor: canApprove ? 'pointer' : 'not-allowed',
                      transition: 'all 0.25s cubic-bezier(0.22,1,0.36,1)',
                    }}
                    onMouseEnter={e => {
                      if (canApprove) {
                        e.currentTarget.style.background = 'var(--gold2)'
                        e.currentTarget.style.transform = 'translateY(-1px)'
                        e.currentTarget.style.boxShadow = '0 8px 24px rgba(201,162,77,0.28)'
                      }
                    }}
                    onMouseLeave={e => {
                      if (canApprove) {
                        e.currentTarget.style.background = submitted ? 'var(--green)' : 'var(--gold)'
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = 'none'
                      }
                    }}
                  >
                    {submitting ? (
                      <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                    ) : submitted ? (
                      <CheckCircle2 size={14} />
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M2 7l3.5 3.5L12 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                    {submitting ? 'Submitting…' : submitted ? 'Approval Submitted!' : 'Sign Approval On-Chain'}
                  </button>

                  <p style={{
                    fontFamily: 'var(--font-mono)', fontSize: 10,
                    color: 'var(--text-dim)', lineHeight: 1.6,
                    paddingTop: 12, borderTop: '1px solid var(--border)',
                    letterSpacing: '0.2px',
                  }}>
                    Your wallet address and report hash are permanently recorded on-chain.
                    Once signed, this approval cannot be revoked or altered.
                  </p>
                </>
              )}
            </PanelCard>
          )}
        </div>
      )}
    </div>
  )
}

/* ─── SUB-COMPONENTS ─── */

function PanelCard({ eyebrow, title, titleBadge, desc, children }: {
  eyebrow: string
  title: string
  titleBadge?: string
  desc: string
  children: React.ReactNode
}) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 16, overflow: 'hidden',
    }}>
      <div style={{
        padding: '18px 22px 16px', borderBottom: '1px solid var(--border)',
        background: 'var(--surface2)',
      }}>
        <p style={{
          fontFamily: 'var(--font-mono)', fontSize: 9,
          letterSpacing: '0.7px', textTransform: 'uppercase',
          color: 'var(--gold)', marginBottom: 4,
        }}>
          {eyebrow}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{title}</p>
          {titleBadge && (
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 9,
              background: 'var(--gold-soft)', color: 'var(--gold)',
              border: '1px solid rgba(201,162,77,0.2)',
              borderRadius: 99, padding: '2px 8px',
            }}>
              {titleBadge}
            </span>
          )}
        </div>
        <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 3 }}>{desc}</p>
      </div>
      <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {children}
      </div>
    </div>
  )
}

function MilestoneItem({ milestone: m, isSelected, onClick, dimmed }: {
  milestone: InspectorMilestone
  isSelected: boolean
  onClick: () => void
  dimmed?: boolean
}) {
  const meta = STATE_META[m.state]
  const isActionable = m.state === 'UNDER_REVIEW'

  return (
    <div
      onClick={onClick}
      style={{
        background: isSelected ? 'var(--gold-soft)' : 'var(--surface2)',
        border: `1px solid ${isSelected ? 'rgba(201,162,77,0.5)' : 'var(--border)'}`,
        borderRadius: 10, padding: '13px 14px',
        cursor: 'pointer', opacity: dimmed ? 0.6 : 1,
        position: 'relative', overflow: 'hidden',
        transition: 'all 0.2s',
      }}
      onMouseEnter={e => {
        if (!isSelected)
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(201,162,77,0.3)'
      }}
      onMouseLeave={e => {
        if (!isSelected)
          (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
      }}
    >
      {/* Gold left accent for actionable items */}
      {isActionable && (
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: 3, background: 'var(--gold)',
        }} />
      )}

      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-start', gap: 8,
        paddingLeft: isActionable ? 8 : 0,
      }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', flex: 1 }}>
          {m.description}
        </p>
        <p style={{
          fontFamily: 'var(--font-mono)', fontSize: 11,
          color: isSelected ? 'var(--gold)' : 'var(--text-sub)', flexShrink: 0,
        }}>
          {m.amount} ETH
        </p>
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        marginTop: 7, paddingLeft: isActionable ? 8 : 0,
      }}>
        <p style={{
          fontFamily: 'var(--font-mono)', fontSize: 9,
          color: 'var(--text-dim)', letterSpacing: '0.3px',
        }}>
          {m.projectLabel} · {m.projectName}
        </p>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.4px',
          padding: '3px 7px', borderRadius: 4,
          background: meta.bg, color: meta.color, border: `1px solid ${meta.border}`,
        }}>
          {meta.label}
        </span>
      </div>
    </div>
  )
}

function SkeletonList({ rows }: { rows: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{
          height: 70, borderRadius: 10,
          background: 'var(--surface2)', border: '1px solid var(--border)',
          animation: 'skeletonPulse 1.6s ease-in-out infinite',
          animationDelay: `${i * 0.1}s`,
        }} />
      ))}
    </div>
  )
}