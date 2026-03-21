import { useState, useEffect, useCallback } from 'react'
import { ethers } from 'ethers'
import { Plus, X, Lock, Flag, Send, RefreshCw, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import type { Contracts } from '@/lib/contracts'

type InputEvent = React.ChangeEvent<HTMLInputElement>

/* ─── TYPES ─── */

type StatusKey = 'pending' | 'progress' | 'review' | 'complete'

interface Project {
  id: number
  name: string
  projectId: string
  budget: number
  used: number
  locked: number
  totalBudgetWei: ethers.BigNumber
  contractor: string
  inspectors: string[]
  requiredApprovals: number
  active: boolean
  status: StatusKey
  statusLabel: string
  milestoneCount: number
  paidMilestones: number
}

/* ─── HELPERS ─── */

function deriveStatus(milestoneCount: number, paidMilestones: number, active: boolean): StatusKey {
  if (!active) return 'complete'
  if (milestoneCount === 0) return 'pending'
  if (paidMilestones === milestoneCount) return 'complete'
  if (paidMilestones > 0) return 'progress'
  return 'pending'
}

const STATUS_META: Record<StatusKey, { label: string; color: string; bg: string; border: string }> = {
  pending:  { label: 'PENDING',      color: 'var(--text-dim)', bg: 'rgba(74,80,105,0.12)',  border: 'rgba(74,80,105,0.2)'  },
  progress: { label: 'IN PROGRESS',  color: 'var(--blue)',     bg: 'rgba(74,158,255,0.12)', border: 'rgba(74,158,255,0.2)' },
  review:   { label: 'UNDER REVIEW', color: 'var(--gold)',     bg: 'rgba(201,162,77,0.12)', border: 'rgba(201,162,77,0.2)' },
  complete: { label: 'COMPLETED',    color: 'var(--green)',    bg: 'rgba(77,187,138,0.12)', border: 'rgba(77,187,138,0.2)' },
}

function fmt(wei: ethers.BigNumber, decimals = 4): number {
  return parseFloat(parseFloat(ethers.utils.formatEther(wei)).toFixed(decimals))
}

async function fetchLockedFunds(contracts: Contracts, projectId: number): Promise<number> {
  try {
    const filter = contracts.vault.filters.FundsLocked(projectId)
    const events = await contracts.vault.queryFilter(filter)
    const totalWei = events.reduce((sum, evt) => {
      const amount = evt.args?.amount as ethers.BigNumber
      return sum.add(amount ?? ethers.BigNumber.from(0))
    }, ethers.BigNumber.from(0))
    return fmt(totalWei)
  } catch { return 0 }
}

async function fetchProjects(contracts: Contracts): Promise<Project[]> {
  const count: number = (await contracts.registry.projectCount()).toNumber()
  if (count === 0) return []

  const projects = await Promise.all(
    Array.from({ length: count }, (_, i) => i + 1).map(async (id) => {
      const raw = await contracts.registry.getProject(id)
      const msCount: number = (await contracts.milestone.milestoneCount(id)).toNumber()

      let paidWei = ethers.BigNumber.from(0)
      let paidMilestones = 0

      if (msCount > 0) {
        const milestoneData = await Promise.all(
          Array.from({ length: msCount }, (_, j) => j + 1).map(async (mid) => {
            const [isPaid, amount] = await Promise.all([
              contracts.vault.released(id, mid),
              contracts.milestone.getMilestoneAmount(id, mid),
            ])
            return { isPaid: isPaid as boolean, amount: amount as ethers.BigNumber }
          })
        )
        for (const m of milestoneData) {
          if (m.isPaid) { paidWei = paidWei.add(m.amount); paidMilestones++ }
        }
      }

      const locked = await fetchLockedFunds(contracts, id)
      const status = deriveStatus(msCount, paidMilestones, raw.active)

      return {
        id,
        name: raw.name,
        projectId: `PRJ-${String(id).padStart(4, '0')}`,
        budget: fmt(raw.totalBudget),
        used: fmt(paidWei),
        locked,
        totalBudgetWei: raw.totalBudget as ethers.BigNumber,
        contractor: raw.contractor as string,
        inspectors: raw.inspectors as string[],
        requiredApprovals: (raw.requiredApprovals as ethers.BigNumber).toNumber(),
        active: raw.active as boolean,
        status,
        statusLabel: STATUS_META[status].label,
        milestoneCount: msCount,
        paidMilestones,
      } satisfies Project
    })
  )

  return projects
}

/* ─── COMPONENT ─── */

export function GovPanel({ contracts }: { contracts: Contracts | null }) {
  const [projects, setProjects]               = useState<Project[]>([])
  const [loading, setLoading]                 = useState(false)
  const [error, setError]                     = useState<string | null>(null)
  const [selectedProject, setSelectedProject] = useState<number | null>(null)
  const [activeProject, setActiveProject]     = useState<Project | null>(null)
  const [showModal, setShowModal]             = useState(false)
  const [isClosing, setIsClosing]             = useState(false)

  const [proj, setProj]       = useState({ name: '', budget: '', contractor: '', inspector1: '', inspector2: '' })
  const [amount, setAmount]   = useState('')
  const [milestone, setMilestone] = useState({ description: '', amount: '' })
  const [releaseId, setReleaseId] = useState('')

  const load = useCallback(async () => {
    if (!contracts) return
    setLoading(true); setError(null)
    try {
      const data = await fetchProjects(contracts)
      setProjects(data)
      setActiveProject(prev => prev ? (data.find(p => p.id === prev.id) ?? prev) : null)
    } catch (e: any) {
      setError(e.message ?? 'Failed to load projects')
    } finally { setLoading(false) }
  }, [contracts])

  useEffect(() => { load() }, [load])

  const totalReleased = projects.reduce((s, p) => s + p.used, 0)
  const totalLocked   = projects.reduce((s, p) => s + p.locked, 0)
  const totalAllocated = projects.reduce((s, p) => s + p.budget, 0)
  const pendingCount  = projects.filter(p => p.status === 'pending' || p.status === 'review').length

  const createProject = async () => {
    if (!contracts) return toast.error('Connect wallet')
    if (!proj.name.trim())       return toast.error('Enter a project name')
    if (!proj.budget)            return toast.error('Enter a budget')
    if (!proj.contractor.trim()) return toast.error('Enter a contractor address')
    if (!proj.inspector1.trim()) return toast.error('Enter at least one inspector address')
    const inspectors = [proj.inspector1.trim(), proj.inspector2.trim()].filter(Boolean)
    try {
      const tx = await contracts.registry.createProject(proj.name.trim(), ethers.utils.parseEther(proj.budget || '0'), proj.contractor.trim(), inspectors, inspectors.length)
      await tx.wait()
      toast.success('Project created', { description: `${inspectors.length} inspector${inspectors.length > 1 ? 's' : ''} registered` })
      setShowModal(false)
      setProj({ name: '', budget: '', contractor: '', inspector1: '', inspector2: '' })
      await load()
    } catch (e: any) { toast.error(e?.reason ?? e?.message ?? 'Transaction failed') }
  }

  const lockFunds = async () => {
    if (!contracts || !selectedProject) return
    if (!amount) return toast.error('Enter an amount')
    try {
      const tx = await contracts.vault.lockFunds(selectedProject, { value: ethers.utils.parseEther(amount) })
      await tx.wait(); toast.success('Funds locked to vault'); setAmount(''); await load()
    } catch (e: any) { toast.error(e?.reason ?? e?.message ?? 'Transaction failed') }
  }

  const createMilestone = async () => {
    if (!contracts || !selectedProject) return
    if (!milestone.description || !milestone.amount) return toast.error('Fill in all fields')
    try {
      const tx = await contracts.milestone.createMilestone(selectedProject, milestone.description, ethers.utils.parseEther(milestone.amount))
      await tx.wait(); toast.success('Milestone created'); setMilestone({ description: '', amount: '' }); await load()
    } catch (e: any) { toast.error(e?.reason ?? e?.message ?? 'Transaction failed') }
  }

  const releasePayment = async () => {
    if (!contracts || !selectedProject) return
    if (!releaseId) return toast.error('Enter a milestone ID')
    try {
      const tx = await contracts.vault.release(selectedProject, parseInt(releaseId))
      await tx.wait(); toast.success('Payment released'); setReleaseId(''); await load()
    } catch (e: any) { toast.error(e?.reason ?? e?.message ?? 'Transaction failed') }
  }

  const openPanel = (p: Project) => { setSelectedProject(p.id); setActiveProject(p); setIsClosing(false) }
  const closePanel = () => {
    setIsClosing(true)
    setTimeout(() => { setActiveProject(null); setSelectedProject(null); setIsClosing(false) }, 360)
  }

  return (
    <>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 44px' }}>

        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 36 }}>
          <div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 6 }}>Ministry of Infrastructure</p>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 34, letterSpacing: '-0.5px', color: 'var(--text)', lineHeight: 1.1 }}>
              Government <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Dashboard</em>
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 5, fontWeight: 300 }}>
              Infrastructure fund management · {projects.length} project{projects.length !== 1 ? 's' : ''} on-chain
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button onClick={load} disabled={loading} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: loading ? 'var(--text-dim)' : 'var(--text-sub)', borderRadius: 9, padding: '10px 14px', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-sans)', fontSize: 13, transition: 'all 0.2s' }}>
              <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              {loading ? 'Syncing…' : 'Refresh'}
            </button>
            <button className="btn-primary" onClick={() => setShowModal(true)}><Plus size={14} /> New Project</button>
          </div>
        </div>

        {/* STATS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 13, marginBottom: 40 }}>
          <StatCard label="Total Projects"  value={loading && projects.length === 0 ? '…' : String(projects.length)}                hint={`· ${projects.filter(p => p.active).length} active`} hintType="up" fill={100} />
          <StatCard label="Vault Locked"    value={loading && projects.length === 0 ? '…' : `${totalLocked.toFixed(2)} ETH`}        hint="⬡ In escrow" hintType="warn" fill={totalAllocated > 0 ? Math.min(100, (totalLocked / totalAllocated) * 100) : 0} />
          <StatCard label="Released"        value={loading && projects.length === 0 ? '…' : `${totalReleased.toFixed(2)} ETH`}      hint={totalLocked > 0 ? `↑ ${((totalReleased / totalLocked) * 100).toFixed(0)}% of locked` : '· no payouts yet'} hintType="up" fill={totalLocked > 0 ? (totalReleased / totalLocked) * 100 : 0} />
          <StatCard label="Pending Review"  value={loading && projects.length === 0 ? '…' : String(pendingCount)}                   hint={pendingCount > 0 ? '⚑ Awaiting sign-off' : '✓ All clear'} hintType={pendingCount > 0 ? 'warn' : 'up'} fill={projects.length > 0 ? (pendingCount / projects.length) * 100 : 0} />
        </div>

        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.9px', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 16 }}>Projects</p>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(224,82,82,0.08)', border: '1px solid rgba(224,82,82,0.2)', borderRadius: 12, padding: '14px 18px', marginBottom: 20 }}>
            <AlertCircle size={16} color="var(--red)" />
            <p style={{ fontSize: 13, color: 'var(--red)', flex: 1 }}>{error}</p>
            <button onClick={load} style={{ fontSize: 12, color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Retry</button>
          </div>
        )}

        {loading && projects.length === 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 13 }}>
            {[0, 1, 2, 3].map(i => <SkeletonCard key={i} />)}
          </div>
        )}

        {!loading && !error && projects.length === 0 && (
          <div style={{ border: '1px dashed var(--border)', borderRadius: 16, padding: '60px 40px', textAlign: 'center' }}>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: 20, color: 'var(--text-dim)', fontStyle: 'italic', marginBottom: 8 }}>No projects yet</p>
            <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 20 }}>Create your first infrastructure project to get started.</p>
            <button className="btn-primary" onClick={() => setShowModal(true)}><Plus size={14} /> New Project</button>
          </div>
        )}

        {projects.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 13 }}>
            {projects.map(p => (
              <ProjectCard key={p.id} project={p} isActive={selectedProject === p.id} onClick={() => openPanel(p)} />
            ))}
          </div>
        )}
      </div>

      {/* MODAL */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(8,9,12,0.85)', backdropFilter: 'blur(14px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 20, padding: 32, width: 480, boxShadow: '0 40px 80px rgba(0,0,0,0.6)', animation: 'modalIn 0.35s cubic-bezier(0.22,1,0.36,1)' }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, color: 'var(--text)', marginBottom: 4 }}>Create Project</h2>
            <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 26 }}>Register a new infrastructure project on-chain</p>
            <Field label="Project Name"><Input placeholder="e.g. Northern Highway Phase III" value={proj.name} onChange={(e: InputEvent) => setProj({ ...proj, name: e.target.value })} /></Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
              <Field label="Budget (ETH)"><Input placeholder="0.00" type="number" value={proj.budget} onChange={(e: InputEvent) => setProj({ ...proj, budget: e.target.value })} /></Field>
              <Field label="Contractor Address"><Input placeholder="0x..." value={proj.contractor} onChange={(e: InputEvent) => setProj({ ...proj, contractor: e.target.value })} /></Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
              <Field label="Inspector 1 *"><Input placeholder="0x..." value={proj.inspector1} onChange={(e: InputEvent) => setProj({ ...proj, inspector1: e.target.value })} /></Field>
              <Field label="Inspector 2 (optional)"><Input placeholder="0x..." value={proj.inspector2} onChange={(e: InputEvent) => setProj({ ...proj, inspector2: e.target.value })} /></Field>
            </div>
            <div style={{ background: 'var(--gold-soft)', border: '1px solid rgba(201,162,77,0.2)', borderRadius: 8, padding: '9px 13px', marginBottom: 4 }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--gold)', letterSpacing: '0.3px' }}>
                {[proj.inspector1, proj.inspector2].filter(s => s.trim()).length === 0 ? '⚑ Add at least one inspector address' : `✓ ${[proj.inspector1, proj.inspector2].filter(s => s.trim()).length} inspector${[proj.inspector1, proj.inspector2].filter(s => s.trim()).length > 1 ? 's' : ''} — all must approve for payment release`}
              </p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-sub)', borderRadius: 8, padding: '9px 18px', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>Cancel</button>
              <button className="btn-primary" onClick={createProject}><Plus size={12} /> Create Project</button>
            </div>
          </div>
        </div>
      )}

      {/* ── SIDE PANEL — wider, more professional ── */}
      {activeProject && (
        <>
          <div onClick={closePanel} style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(8,9,12,0.75)', backdropFilter: 'blur(10px)', transition: 'opacity 0.3s', opacity: isClosing ? 0 : 1 }} />

          {/* Panel — increased to 560px, two-column internal layout */}
          <div style={{
            position: 'fixed', top: 0, right: 0, height: '100%',
            width: 560,                                          // ← wider
            zIndex: 50,
            background: 'var(--surface)',
            borderLeft: '1px solid var(--border)',
            display: 'flex', flexDirection: 'column',
            transform: isClosing ? 'translateX(100%)' : 'translateX(0)',
            opacity: isClosing ? 0 : 1,
            transition: 'transform 0.4s cubic-bezier(0.22,1,0.36,1), opacity 0.4s',
            boxShadow: '-20px 0 60px rgba(0,0,0,0.5)',           // ← depth shadow
          }}>

            {/* Panel header — richer */}
            <div style={{
              padding: '26px 32px',
              borderBottom: '1px solid var(--border)',
              background: 'var(--surface2)',
              flexShrink: 0,
              position: 'relative', overflow: 'hidden',
            }}>
              {/* Gold shimmer top */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, var(--gold), transparent)' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.7px', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 6 }}>
                    {activeProject.projectId} · Project Details
                  </p>
                  <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, color: 'var(--text)', letterSpacing: '-0.3px', marginBottom: 6 }}>
                    {activeProject.name}
                  </h2>
                  {/* Status badge inline */}
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.5px',
                    padding: '4px 10px', borderRadius: 4,
                    background: STATUS_META[activeProject.status].bg,
                    color: STATUS_META[activeProject.status].color,
                    border: `1px solid ${STATUS_META[activeProject.status].border}`,
                  }}>
                    {STATUS_META[activeProject.status].label}
                  </span>
                </div>
                <button onClick={closePanel} style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--surface3)', border: '1px solid var(--border)', color: 'var(--text-sub)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', flexShrink: 0 }}>
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Panel body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 24 }}>

              {/* ── FUND OVERVIEW — full width prominent card ── */}
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 14, padding: 22 }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.7px', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 18 }}>Fund Overview</p>

                {/* Three big numbers */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
                  {[
                    { label: 'In Vault',  val: `${activeProject.locked} ETH`,  color: 'var(--gold)'  },
                    { label: 'Released',  val: `${activeProject.used} ETH`,    color: 'var(--green)' },
                    { label: 'Budget',    val: `${activeProject.budget} ETH`,  color: 'var(--text)'  },
                  ].map(({ label, val, color }) => (
                    <div key={label} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
                      <p style={{ fontFamily: 'var(--font-serif)', fontSize: 22, color, letterSpacing: '-0.3px', lineHeight: 1, marginBottom: 6 }}>{val}</p>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{label}</p>
                    </div>
                  ))}
                </div>

                {/* Progress bars */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.4px' }}>LOCKED / BUDGET</p>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--gold)', fontWeight: 500 }}>
                        {activeProject.budget > 0 ? Math.round((activeProject.locked / activeProject.budget) * 100) : 0}%
                      </p>
                    </div>
                    <div style={{ width: '100%', height: 6, background: 'var(--border)', borderRadius: 3 }}>
                      <div style={{ height: '100%', borderRadius: 3, background: 'linear-gradient(90deg, var(--gold), var(--gold2))', width: `${activeProject.budget > 0 ? Math.min(100, Math.round((activeProject.locked / activeProject.budget) * 100)) : 0}%`, transition: 'width 0.6s cubic-bezier(0.22,1,0.36,1)' }} />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.4px' }}>RELEASED / LOCKED</p>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--green)', fontWeight: 500 }}>
                        {activeProject.locked > 0 ? Math.round((activeProject.used / activeProject.locked) * 100) : 0}%
                      </p>
                    </div>
                    <div style={{ width: '100%', height: 6, background: 'var(--border)', borderRadius: 3 }}>
                      <div style={{ height: '100%', borderRadius: 3, background: 'linear-gradient(90deg, var(--green), #6ee7b7)', width: `${activeProject.locked > 0 ? Math.min(100, Math.round((activeProject.used / activeProject.locked) * 100)) : 0}%`, transition: 'width 0.6s cubic-bezier(0.22,1,0.36,1)' }} />
                    </div>
                  </div>
                </div>

                {/* Status banners */}
                {activeProject.locked > activeProject.used && (
                  <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(77,187,138,0.08)', border: '1px solid rgba(77,187,138,0.2)', borderRadius: 8 }}>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--green)', letterSpacing: '0.3px' }}>
                      ✓ {(activeProject.locked - activeProject.used).toFixed(4)} ETH available for release
                    </p>
                  </div>
                )}
                {activeProject.locked === 0 && activeProject.milestoneCount > 0 && (
                  <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(224,82,82,0.08)', border: '1px solid rgba(224,82,82,0.2)', borderRadius: 8 }}>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--red)', letterSpacing: '0.3px' }}>
                      ⚑ No funds locked — lock ETH before releasing milestones
                    </p>
                  </div>
                )}
              </div>

              {/* ── META CHIPS — 4 across ── */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                {[
                  { label: 'Status',      val: activeProject.statusLabel },
                  { label: 'Milestones',  val: `${activeProject.paidMilestones} / ${activeProject.milestoneCount}` },
                  { label: 'Paid',        val: `${activeProject.paidMilestones}` },
                  { label: 'Approvals',   val: `${activeProject.requiredApprovals} of ${activeProject.inspectors.length}` },
                ].map(({ label, val }) => (
                  <div key={label} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '11px 13px' }}>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.6px', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 5 }}>{label}</p>
                    <p style={{ fontSize: 13, color: 'var(--text-sub)', fontWeight: 500 }}>{val}</p>
                  </div>
                ))}
              </div>

              {/* ── CONTRACTOR + INSPECTORS side by side ── */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.6px', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 8 }}>Contractor</p>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--blue)', letterSpacing: '0.3px', wordBreak: 'break-all', lineHeight: 1.5 }}>
                    {activeProject.contractor.slice(0, 10)}…{activeProject.contractor.slice(-8)}
                  </p>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-dim)', marginTop: 4 }}>
                    {activeProject.contractor.slice(0, 42)}
                  </p>
                </div>
                <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.6px', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 8 }}>
                    Inspectors ({activeProject.inspectors.length})
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {activeProject.inspectors.map((addr, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--gold)', background: 'var(--gold-soft)', border: '1px solid rgba(201,162,77,0.2)', borderRadius: 3, padding: '1px 5px', flexShrink: 0 }}>
                          {i + 1}
                        </span>
                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--green)', letterSpacing: '0.3px', wordBreak: 'break-all' }}>
                          {addr.slice(0, 8)}…{addr.slice(-6)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── ACTIONS — two column grid ── */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

                {/* Lock Funds */}
                <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 18px' }}>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.7px', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 12 }}>Lock Funds</p>
                  <PanelInput placeholder="Amount in ETH  e.g. 5" value={amount} onChange={(e: InputEvent) => setAmount(e.target.value)} />
                  <PanelButton icon={<Lock size={13} />} onClick={lockFunds}>Lock to Vault</PanelButton>
                </div>

                {/* Release Payment */}
                <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 18px' }}>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.7px', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 12 }}>
                    Release Payment · {activeProject.paidMilestones} paid
                  </p>
                  <PanelInput placeholder={`Milestone ID  (1 – ${activeProject.milestoneCount || '?'})`} value={releaseId} onChange={(e: InputEvent) => setReleaseId(e.target.value)} />
                  <PanelButton icon={<Send size={13} />} onClick={releasePayment} primary>Release Payment</PanelButton>
                </div>
              </div>

              {/* New Milestone — full width */}
              <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 18px' }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.7px', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 12 }}>
                  New Milestone · {activeProject.milestoneCount} existing
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'end' }}>
                  <div>
                    <PanelInput placeholder="Milestone description..." value={milestone.description} onChange={(e: InputEvent) => setMilestone({ ...milestone, description: e.target.value })} />
                    <PanelInput placeholder="ETH amount e.g. 5" value={milestone.amount} onChange={(e: InputEvent) => setMilestone({ ...milestone, amount: e.target.value })} />
                  </div>
                  <div style={{ paddingBottom: 9 }}>
                    <button
                      onClick={createMilestone}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'var(--surface3)', border: '1px solid var(--border)', color: 'var(--text-sub)', borderRadius: 8, padding: '10px 16px', fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(201,162,77,0.3)'; e.currentTarget.style.color = 'var(--gold)'; e.currentTarget.style.background = 'var(--gold-soft)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-sub)'; e.currentTarget.style.background = 'var(--surface3)' }}
                    >
                      <Flag size={13} /> Add Milestone
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </>
      )}
    </>
  )
}

/* ─── SUB-COMPONENTS ─── */

function StatCard({ label, value, hint, hintType, fill }: { label: string; value: string; hint: string; hintType: 'up' | 'warn'; fill: number }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 22px', position: 'relative', overflow: 'hidden', transition: 'transform 0.3s', cursor: 'default' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)' }}
    >
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.9px', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 12 }}>{label}</p>
      <p style={{ fontFamily: 'var(--font-serif)', fontSize: 28, color: 'var(--text)', letterSpacing: '-0.4px', lineHeight: 1 }}>{value}</p>
      <p style={{ fontSize: 10, marginTop: 7, color: hintType === 'up' ? 'var(--green)' : 'var(--amber)', fontFamily: 'var(--font-mono)', letterSpacing: '0.2px' }}>{hint}</p>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: 'var(--border)' }}>
        <div style={{ height: '100%', width: `${Math.min(100, Math.max(0, fill))}%`, background: 'linear-gradient(90deg, var(--gold), var(--gold2))', borderRadius: 1, transition: 'width 0.8s cubic-bezier(0.22,1,0.36,1)' }} />
      </div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 22, animation: 'skeletonPulse 1.6s ease-in-out infinite' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div><div style={{ width: 160, height: 14, background: 'var(--border2)', borderRadius: 4, marginBottom: 8 }} /><div style={{ width: 80, height: 9, background: 'var(--border)', borderRadius: 3 }} /></div>
        <div style={{ width: 72, height: 22, background: 'var(--border)', borderRadius: 4 }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 9 }}>
        <div style={{ width: 50, height: 9, background: 'var(--border)', borderRadius: 3 }} />
        <div style={{ width: 80, height: 9, background: 'var(--border)', borderRadius: 3 }} />
      </div>
      <div style={{ width: '100%', height: 3, background: 'var(--border)', borderRadius: 2 }} />
    </div>
  )
}

function ProjectCard({ project, isActive, onClick }: { project: Project; isActive: boolean; onClick: () => void }) {
  const pct  = project.budget > 0 ? Math.round((project.used / project.budget) * 100) : 0
  const meta = STATUS_META[project.status]
  return (
    <div onClick={onClick} style={{ background: isActive ? 'var(--surface2)' : 'var(--surface)', border: `1px solid ${isActive ? 'rgba(201,162,77,0.5)' : 'var(--border)'}`, borderRadius: 16, padding: 22, cursor: 'pointer', position: 'relative', overflow: 'hidden', boxShadow: isActive ? '0 0 0 1px rgba(201,162,77,0.12)' : 'none', transition: 'all 0.3s cubic-bezier(0.22,1,0.36,1)' }}
      onMouseEnter={e => { if (!isActive) { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(201,162,77,0.35)'; el.style.transform = 'translateY(-3px)'; el.style.boxShadow = '0 16px 36px rgba(0,0,0,0.4)' } }}
      onMouseLeave={e => { if (!isActive) { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--border)'; el.style.transform = 'translateY(0)'; el.style.boxShadow = 'none' } }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: isActive ? 'linear-gradient(90deg, transparent, var(--gold), transparent)' : 'linear-gradient(90deg, transparent, var(--border2), transparent)' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)', letterSpacing: '-0.1px' }}>{project.name}</p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-dim)', marginTop: 3, letterSpacing: '0.3px' }}>{project.projectId}</p>
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.5px', padding: '4px 8px', borderRadius: 4, whiteSpace: 'nowrap', background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}>{meta.label}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.4px', textTransform: 'uppercase' }}>Budget</p>
        <p style={{ fontSize: 12, color: 'var(--text-sub)' }}><strong style={{ color: 'var(--text)', fontWeight: 500 }}>{project.used}</strong> / {project.budget} ETH</p>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.4px', textTransform: 'uppercase' }}>Vault</p>
        <p style={{ fontSize: 12, color: project.locked > 0 ? 'var(--gold)' : 'var(--text-dim)' }}>
          {project.locked > 0 ? `${project.locked} ETH locked` : 'No funds locked'}
        </p>
      </div>
      <div style={{ width: '100%', height: 3, background: 'var(--border)', borderRadius: 2 }}>
        <div style={{ height: '100%', borderRadius: 2, background: 'linear-gradient(90deg, var(--gold), var(--gold2))', width: `${pct}%`, position: 'relative', transition: 'width 0.6s cubic-bezier(0.22,1,0.36,1)' }}>
          {pct > 0 && pct < 100 && <span style={{ position: 'absolute', right: -1, top: -2, width: 7, height: 7, borderRadius: '50%', background: 'var(--gold2)', boxShadow: '0 0 5px rgba(228,191,116,0.5)', display: 'block' }} />}
        </div>
      </div>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-dim)', marginTop: 9, letterSpacing: '0.3px' }}>
        {project.milestoneCount === 0 ? 'No milestones yet' : `${project.paidMilestones} of ${project.milestoneCount} milestone${project.milestoneCount !== 1 ? 's' : ''} paid`}
      </p>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.7px', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 7 }}>{label}</p>
      {children}
    </div>
  )
}

function Input({ placeholder, value, onChange, type }: { placeholder?: string; value: string; onChange: (e: InputEvent) => void; type?: string }) {
  return (
    <input type={type || 'text'} value={value} onChange={onChange} placeholder={placeholder}
      style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 13px', color: 'var(--text)', fontFamily: 'var(--font-sans)', fontSize: 13, outline: 'none' }}
      onFocus={e => { e.target.style.borderColor = 'rgba(201,162,77,0.4)'; e.target.style.boxShadow = '0 0 0 3px rgba(201,162,77,0.08)' }}
      onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }}
    />
  )
}

function PanelInput({ placeholder, value, onChange }: { placeholder?: string; value: string; onChange: (e: InputEvent) => void }) {
  return (
    <input value={value} onChange={onChange} placeholder={placeholder}
      style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 13px', color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 12, outline: 'none', letterSpacing: '0.3px', marginBottom: 9 }}
      onFocus={e => { e.target.style.borderColor = 'rgba(201,162,77,0.35)' }}
      onBlur={e => { e.target.style.borderColor = 'var(--border)' }}
    />
  )
}

function PanelButton({ children, icon, onClick, primary }: { children: React.ReactNode; icon?: React.ReactNode; onClick: () => void; primary?: boolean }) {
  return (
    <button onClick={onClick}
      style={{ width: '100%', background: primary ? 'var(--gold)' : 'var(--surface3)', border: `1px solid ${primary ? 'var(--gold)' : 'var(--border)'}`, color: primary ? '#0d0f14' : 'var(--text-sub)', borderRadius: 8, padding: '10px', fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.2s' }}
      onMouseEnter={e => { const el = e.currentTarget; primary ? (el.style.background = 'var(--gold2)', el.style.boxShadow = '0 5px 18px rgba(201,162,77,0.25)') : (el.style.borderColor = 'rgba(201,162,77,0.3)', el.style.color = 'var(--gold)', el.style.background = 'var(--gold-soft)') }}
      onMouseLeave={e => { const el = e.currentTarget; primary ? (el.style.background = 'var(--gold)', el.style.boxShadow = 'none') : (el.style.borderColor = 'var(--border)', el.style.color = 'var(--text-sub)', el.style.background = 'var(--surface3)') }}
    >
      {icon} {children}
    </button>
  )
}