import { useState, useEffect, useCallback } from 'react'
import { ethers } from 'ethers'
import { Loader2, Send, Copy, CheckCircle2, RefreshCw, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import type { Contracts } from '@/lib/contracts'

type InputEvent = React.ChangeEvent<HTMLTextAreaElement>

/* ─── TYPES ─── */

type MilestoneState = 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'PAID'

interface ContractorProject {
  id: number
  name: string
  projectId: string   // PRJ-0001
  budget: number      // ETH
  contractor: string
}

interface Milestone {
  id: number
  projectId: number
  description: string
  amount: number      // ETH
  state: MilestoneState
  claimable: boolean  // only PENDING milestones
}

/* ─── HELPERS ─── */

const STATE_META: Record<MilestoneState, { label: string; color: string; bg: string; border: string }> = {
  PENDING:      { label: 'PENDING',      color: 'var(--text-dim)',  bg: 'rgba(74,80,105,0.12)',   border: 'rgba(74,80,105,0.2)'   },
  UNDER_REVIEW: { label: 'UNDER REVIEW', color: 'var(--gold)',      bg: 'rgba(201,162,77,0.12)',  border: 'rgba(201,162,77,0.2)'  },
  APPROVED:     { label: 'APPROVED',     color: 'var(--green)',     bg: 'rgba(77,187,138,0.12)',  border: 'rgba(77,187,138,0.2)'  },
  PAID:         { label: 'PAID',         color: 'var(--blue)',      bg: 'rgba(74,158,255,0.12)',  border: 'rgba(74,158,255,0.2)'  },
}

const STATE_MAP: Record<number, MilestoneState> = {
  0: 'PENDING',
  1: 'UNDER_REVIEW',
  2: 'APPROVED',
  3: 'PAID',
}

function fmt(wei: ethers.BigNumber): number {
  return parseFloat(parseFloat(ethers.utils.formatEther(wei)).toFixed(4))
}

/* ─── FETCHING ─── */

async function fetchContractorProjects(
  contracts: Contracts,
  account: string
): Promise<ContractorProject[]> {
  const count: number = (await contracts.registry.projectCount()).toNumber()
  if (count === 0) return []

  const results = await Promise.all(
    Array.from({ length: count }, (_, i) => i + 1).map(async (id) => {
      const raw = await contracts.registry.getProject(id)
      // Only include projects where this account is the contractor
      if (raw.contractor.toLowerCase() !== account.toLowerCase()) return null
      return {
        id,
        name: raw.name as string,
        projectId: `PRJ-${String(id).padStart(4, '0')}`,
        budget: fmt(raw.totalBudget),
        contractor: raw.contractor as string,
      } satisfies ContractorProject
    })
  )

  return results.filter(Boolean) as ContractorProject[]
}

async function fetchMilestones(
  contracts: Contracts,
  projectId: number
): Promise<Milestone[]> {
  const count: number = (await contracts.milestone.milestoneCount(projectId)).toNumber()
  if (count === 0) return []

  return Promise.all(
    Array.from({ length: count }, (_, i) => i + 1).map(async (mid) => {
      const [stateRaw, amount] = await Promise.all([
        contracts.milestone.getMilestoneState(projectId, mid),
        contracts.milestone.getMilestoneAmount(projectId, mid),
      ])
      // Get description from the milestone struct directly
      const ms = await contracts.milestone.milestones(projectId, mid)
      const state = STATE_MAP[stateRaw as number] ?? 'PENDING'
      return {
        id: mid,
        projectId,
        description: ms.description as string,
        amount: fmt(amount),
        state,
        claimable: state === 'PENDING',
      } satisfies Milestone
    })
  )
}

/* ─── COMPONENT ─── */

interface ContractorPanelProps {
  contracts: Contracts | null
  account: string | null
}

export function ContractorPanel({ contracts, account }: ContractorPanelProps) {
  const [projects, setProjects]         = useState<ContractorProject[]>([])
  const [milestones, setMilestones]     = useState<Milestone[]>([])
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [loadingMs, setLoadingMs]       = useState(false)
  const [error, setError]               = useState<string | null>(null)

  const [selectedProject, setSelectedProject] = useState<ContractorProject | null>(null)
  const [selectedMs, setSelectedMs]           = useState<Milestone | null>(null)

  const [evidenceText, setEvidenceText] = useState('')
  const [submitting, setSubmitting]     = useState(false)
  const [submitted, setSubmitted]       = useState(false)

  // keccak256 hash of the evidence text
  const hash = evidenceText.trim()
    ? ethers.utils.keccak256(ethers.utils.toUtf8Bytes(evidenceText))
    : ''

  /* ─── LOAD PROJECTS ─── */

  const loadProjects = useCallback(async () => {
    if (!contracts || !account) return
    setLoadingProjects(true)
    setError(null)
    try {
      const data = await fetchContractorProjects(contracts, account)
      setProjects(data)
      // Reset selections if project list changed
      setSelectedProject(null)
      setSelectedMs(null)
      setMilestones([])
    } catch (e: any) {
      setError(e.message ?? 'Failed to load projects')
    } finally {
      setLoadingProjects(false)
    }
  }, [contracts, account])

  useEffect(() => { loadProjects() }, [loadProjects])

  /* ─── LOAD MILESTONES when project selected ─── */

  const selectProject = async (p: ContractorProject) => {
    setSelectedProject(p)
    setSelectedMs(null)
    setMilestones([])
    if (!contracts) return
    setLoadingMs(true)
    try {
      const ms = await fetchMilestones(contracts, p.id)
      setMilestones(ms)
    } catch (e: any) {
      toast.error('Failed to load milestones')
    } finally {
      setLoadingMs(false)
    }
  }

  /* ─── SUBMIT CLAIM ─── */

  const submitClaim = async () => {
    if (!contracts)        return toast.error('Connect wallet first')
    if (!selectedProject)  return toast.error('Select a project')
    if (!selectedMs)       return toast.error('Select a milestone')
    if (!hash)             return toast.error('Enter evidence text')

    setSubmitting(true)
    try {
      const tx = await contracts.milestone.submitClaim(
        selectedProject.id,
        selectedMs.id,
        hash,
      )
      await tx.wait()
      toast.success('Claim submitted!', { description: 'Milestone is now UNDER REVIEW' })
      setSubmitted(true)
      setEvidenceText('')
      setSelectedMs(null)
      // Refresh milestones to reflect new state
      const ms = await fetchMilestones(contracts, selectedProject.id)
      setMilestones(ms)
      setTimeout(() => setSubmitted(false), 4000)
    } catch (e: any) {
      toast.error(e?.reason ?? e?.message ?? 'Transaction failed')
    } finally {
      setSubmitting(false)
    }
  }

  const copyHash = () => {
    navigator.clipboard.writeText(hash)
    toast.success('Hash copied to clipboard')
  }

  const canSubmit = !!selectedProject && !!selectedMs && !!hash && !submitting

  /* ─── UI ─── */

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 44px' }}>

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 36 }}>
        <div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 6 }}>
            Contractor Portal
          </p>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 34, letterSpacing: '-0.5px', color: 'var(--text)', lineHeight: 1.1 }}>
            Submit <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Claims</em>
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 5, fontWeight: 300 }}>
            Select a project and milestone, attach evidence, submit on-chain.
          </p>
        </div>
        <button
          onClick={loadProjects}
          disabled={loadingProjects}
          style={{
            background: 'var(--surface2)', border: '1px solid var(--border)',
            color: loadingProjects ? 'var(--text-dim)' : 'var(--text-sub)',
            borderRadius: 9, padding: '10px 14px', cursor: loadingProjects ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
            fontFamily: 'var(--font-sans)', fontSize: 13, transition: 'all 0.2s',
          }}
        >
          <RefreshCw size={13} style={{ animation: loadingProjects ? 'spin 1s linear infinite' : 'none' }} />
          {loadingProjects ? 'Syncing…' : 'Refresh'}
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
          <button onClick={loadProjects} style={{ fontSize: 12, color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
            Retry
          </button>
        </div>
      )}

      {/* NO PROJECTS STATE */}
      {!loadingProjects && !error && projects.length === 0 && (
        <div style={{ border: '1px dashed var(--border)', borderRadius: 16, padding: '60px 40px', textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: 20, color: 'var(--text-dim)', fontStyle: 'italic', marginBottom: 8 }}>
            No projects assigned
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>
            You are not listed as a contractor on any active project.
          </p>
        </div>
      )}

      {/* MAIN GRID */}
      {(loadingProjects || projects.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

          {/* LEFT COL: Project + Milestone selectors */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* STEP 1 — Project selector */}
            <PanelCard eyebrow="Step 1" title="Select Project" desc="Projects where you are assigned as contractor">
              {loadingProjects ? (
                <SkeletonList rows={3} />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {projects.map(p => (
                    <div
                      key={p.id}
                      onClick={() => selectProject(p)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '11px 14px', borderRadius: 10, cursor: 'pointer',
                        border: `1px solid ${selectedProject?.id === p.id ? 'rgba(201,162,77,0.3)' : 'var(--border)'}`,
                        background: selectedProject?.id === p.id ? 'var(--gold-soft)' : 'var(--surface2)',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={e => {
                        if (selectedProject?.id !== p.id) {
                          (e.currentTarget as HTMLElement).style.borderColor = 'var(--border2)'
                          ;(e.currentTarget as HTMLElement).style.background = 'var(--surface3)'
                        }
                      }}
                      onMouseLeave={e => {
                        if (selectedProject?.id !== p.id) {
                          (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
                          ;(e.currentTarget as HTMLElement).style.background = 'var(--surface2)'
                        }
                      }}
                    >
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{p.name}</p>
                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-dim)', marginTop: 2, letterSpacing: '0.3px' }}>{p.projectId}</p>
                      </div>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: selectedProject?.id === p.id ? 'var(--gold)' : 'var(--text-sub)' }}>
                        {p.budget} ETH
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </PanelCard>

            {/* STEP 2 — Milestone selector */}
            <PanelCard eyebrow="Step 2" title="Select Milestone" desc="Only PENDING milestones can have claims submitted">
              {!selectedProject ? (
                <p style={{ fontSize: 12, color: 'var(--text-dim)', fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>
                  Select a project first
                </p>
              ) : loadingMs ? (
                <SkeletonList rows={3} />
              ) : milestones.length === 0 ? (
                <p style={{ fontSize: 12, color: 'var(--text-dim)', fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>
                  No milestones created yet
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {milestones.map(ms => {
                    const meta = STATE_META[ms.state]
                    const isSelected = selectedMs?.id === ms.id
                    return (
                      <div
                        key={ms.id}
                        onClick={() => ms.claimable && setSelectedMs(ms)}
                        style={{
                          background: isSelected ? 'var(--gold-soft)' : 'var(--surface2)',
                          border: `1px solid ${isSelected ? 'rgba(201,162,77,0.5)' : 'var(--border)'}`,
                          borderRadius: 10, padding: '12px 14px',
                          cursor: ms.claimable ? 'pointer' : 'not-allowed',
                          opacity: ms.claimable ? 1 : 0.45,
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => {
                          if (ms.claimable && !isSelected)
                            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(201,162,77,0.3)'
                        }}
                        onMouseLeave={e => {
                          if (ms.claimable && !isSelected)
                            (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', flex: 1, marginRight: 8 }}>{ms.description}</p>
                          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: isSelected ? 'var(--gold)' : 'var(--text-sub)', flexShrink: 0 }}>
                            {ms.amount} ETH
                          </p>
                        </div>
                        <span style={{
                          display: 'inline-block', marginTop: 7,
                          fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.5px',
                          padding: '3px 7px', borderRadius: 4,
                          background: meta.bg, color: meta.color, border: `1px solid ${meta.border}`,
                        }}>
                          {meta.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </PanelCard>
          </div>

          {/* RIGHT COL: Evidence + Submit */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* STEP 3 — Evidence */}
            <PanelCard eyebrow="Step 3" title="Attach Evidence" desc="Paste an IPFS CID, report text, or any content — hashed to keccak256">
              <div>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.6px', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 7 }}>
                  Evidence Content
                </p>
                <textarea
                  value={evidenceText}
                  onChange={(e: InputEvent) => setEvidenceText(e.target.value)}
                  placeholder="Paste IPFS CID, inspection report, site survey…"
                  rows={6}
                  style={{
                    width: '100%', background: 'var(--surface2)',
                    border: '1px solid var(--border)', borderRadius: 10,
                    padding: '12px 14px', color: 'var(--text)',
                    fontFamily: 'var(--font-mono)', fontSize: 12,
                    outline: 'none', resize: 'vertical', minHeight: 120,
                    letterSpacing: '0.3px', lineHeight: 1.6,
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => { e.target.style.borderColor = 'rgba(201,162,77,0.35)'; e.target.style.boxShadow = '0 0 0 3px rgba(201,162,77,0.07)' }}
                  onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }}
                />
              </div>

              {/* Hash preview */}
              {hash && (
                <div style={{
                  background: 'var(--bg)', border: '1px solid rgba(201,162,77,0.2)',
                  borderRadius: 10, padding: 14,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.6px', textTransform: 'uppercase', color: 'var(--gold)' }}>
                      keccak256 — stored on-chain
                    </p>
                    <button
                      onClick={copyHash}
                      style={{
                        background: 'transparent', border: '1px solid rgba(201,162,77,0.2)',
                        borderRadius: 6, padding: '4px 8px', cursor: 'pointer',
                        color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: 5,
                        fontFamily: 'var(--font-mono)', fontSize: 10, transition: 'all 0.2s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--gold-soft)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <Copy size={11} /> Copy
                    </button>
                  </div>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-sub)', wordBreak: 'break-all', lineHeight: 1.6 }}>
                    {hash}
                  </p>
                </div>
              )}
            </PanelCard>

            {/* STEP 4 — Submit */}
            <PanelCard eyebrow="Step 4" title="Submit Claim" desc="Sends the evidence hash on-chain. Milestone moves to UNDER REVIEW.">

              {/* Selection summary */}
              <div style={{ display: 'flex', gap: 10 }}>
                {[
                  { label: 'Project',   val: selectedProject?.name ?? '—' },
                  { label: 'Milestone', val: selectedMs ? `#${selectedMs.id} · ${selectedMs.amount} ETH` : '—' },
                ].map(({ label, val }) => (
                  <div key={label} style={{
                    flex: 1, background: 'var(--bg)', border: '1px solid var(--border)',
                    borderRadius: 8, padding: '9px 12px',
                  }}>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.6px', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 4 }}>{label}</p>
                    <p style={{ fontSize: 12, color: val === '—' ? 'var(--text-dim)' : 'var(--text-sub)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{val}</p>
                  </div>
                ))}
              </div>

              {/* Submit button */}
              <button
                onClick={submitClaim}
                disabled={!canSubmit}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  background: submitted ? 'var(--green)' : canSubmit ? 'var(--gold)' : 'var(--surface3)',
                  border: `1px solid ${submitted ? 'var(--green)' : canSubmit ? 'var(--gold)' : 'var(--border)'}`,
                  color: canSubmit || submitted ? '#0d0f14' : 'var(--text-dim)',
                  borderRadius: 9, padding: '12px 20px',
                  fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600,
                  cursor: canSubmit ? 'pointer' : 'not-allowed',
                  transition: 'all 0.25s cubic-bezier(0.22,1,0.36,1)',
                }}
                onMouseEnter={e => { if (canSubmit) { e.currentTarget.style.background = 'var(--gold2)'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(201,162,77,0.28)' } }}
                onMouseLeave={e => { if (canSubmit) { e.currentTarget.style.background = submitted ? 'var(--green)' : 'var(--gold)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' } }}
              >
                {submitting ? (
                  <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                ) : submitted ? (
                  <CheckCircle2 size={14} />
                ) : (
                  <Send size={14} />
                )}
                {submitting ? 'Submitting…' : submitted ? 'Claim Submitted!' : 'Submit Claim On-Chain'}
              </button>

              {/* Note */}
              <p style={{
                fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)',
                lineHeight: 1.6, paddingTop: 12, borderTop: '1px solid var(--border)',
                letterSpacing: '0.2px',
              }}>
                Evidence hash is immutable once submitted. Inspectors must approve before payment releases.
              </p>
            </PanelCard>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── SUB-COMPONENTS ─── */

function PanelCard({ eyebrow, title, desc, children }: {
  eyebrow: string; title: string; desc: string; children: React.ReactNode
}) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
      <div style={{ padding: '18px 22px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.7px', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 4 }}>{eyebrow}</p>
        <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{title}</p>
        <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 3 }}>{desc}</p>
      </div>
      <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {children}
      </div>
    </div>
  )
}

function SkeletonList({ rows }: { rows: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{
          height: 54, borderRadius: 10, background: 'var(--surface2)',
          border: '1px solid var(--border)',
          animation: 'skeletonPulse 1.6s ease-in-out infinite',
          animationDelay: `${i * 0.1}s`,
        }} />
      ))}
    </div>
  )
}