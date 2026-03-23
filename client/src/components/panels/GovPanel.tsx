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

  const [proj, setProj]           = useState({ name: '', budget: '', contractor: '', inspector1: '', inspector2: '' })
  const [amount, setAmount]       = useState('')
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

  const totalReleased  = projects.reduce((s, p) => s + p.used, 0)
  const totalLocked    = projects.reduce((s, p) => s + p.locked, 0)
  const totalAllocated = projects.reduce((s, p) => s + p.budget, 0)
  const pendingCount   = projects.filter(p => p.status === 'pending' || p.status === 'review').length

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

  const openPanel  = (p: Project) => { setSelectedProject(p.id); setActiveProject(p); setIsClosing(false) }
  const closePanel = () => {
    setIsClosing(true)
    setTimeout(() => { setActiveProject(null); setSelectedProject(null); setIsClosing(false) }, 360)
  }

  const statCards = [
    { label: 'Total Projects',  value: loading && projects.length === 0 ? '…' : String(projects.length),           unit: '',    hint: `· ${projects.filter(p => p.active).length} active`,                                                                      hintColor: 'var(--green)',  sub: 'on-chain',   accent: 'var(--gold)',  fill: 100,                                                                                    fillColor: 'var(--gold)'  },
    { label: 'Vault Locked',    value: loading && projects.length === 0 ? '…' : totalLocked.toFixed(2),             unit: 'ETH', hint: '⬡ In escrow',                                                                                                             hintColor: 'var(--amber)',  sub: totalAllocated > 0 ? `${Math.round((totalLocked / totalAllocated) * 100)}% of budget` : '—', accent: 'var(--amber)',  fill: totalAllocated > 0 ? Math.min(100, (totalLocked / totalAllocated) * 100) : 0,           fillColor: 'var(--amber)' },
    { label: 'Released',        value: loading && projects.length === 0 ? '…' : totalReleased.toFixed(2),           unit: 'ETH', hint: totalLocked > 0 ? `↑ ${Math.round((totalReleased / totalLocked) * 100)}% of locked` : '· no payouts yet',                 hintColor: 'var(--green)',  sub: 'disbursed',  accent: 'var(--green)', fill: totalLocked > 0 ? (totalReleased / totalLocked) * 100 : 0,                              fillColor: 'var(--green)' },
    { label: 'Pending Review',  value: loading && projects.length === 0 ? '…' : String(pendingCount),               unit: '',    hint: pendingCount > 0 ? '⚑ Awaiting sign-off' : '✓ All clear',                                                                 hintColor: pendingCount > 0 ? 'var(--amber)' : 'var(--green)', sub: pendingCount > 0 ? 'milestones' : '', accent: 'var(--blue)', fill: projects.length > 0 ? (pendingCount / projects.length) * 100 : 0, fillColor: 'var(--blue)'  },
  ]

  return (
    <>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 44px' }}>

        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 6 }}>Ministry of Infrastructure</p>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 32, letterSpacing: '-0.5px', color: 'var(--text)', lineHeight: 1.1 }}>
              Government <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Dashboard</em>
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-sub)', marginTop: 5, fontWeight: 300 }}>
              Infrastructure fund management · {projects.length} project{projects.length !== 1 ? 's' : ''} on-chain
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={load} disabled={loading} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: loading ? 'var(--text-dim)' : 'var(--text-sub)', borderRadius: 8, padding: '9px 14px', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-sans)', fontSize: 13, transition: 'all 0.2s' }}>
              <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              {loading ? 'Syncing…' : 'Refresh'}
            </button>
            <button className="btn-primary" onClick={() => setShowModal(true)}><Plus size={14} /> New Project</button>
          </div>
        </div>

        {/* STAT CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 32 }}>
          {statCards.map(({ label, value, unit, hint, hintColor, sub, accent, fill, fillColor }) => (
            <div key={label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 22px', position: 'relative', overflow: 'hidden', transition: 'transform 0.2s', cursor: 'default' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)' }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${accent}, transparent)` }} />
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.6px', textTransform: 'uppercase', color: 'var(--text-sub)', marginBottom: 14 }}>{label}</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 10 }}>
                <p style={{ fontFamily: 'var(--font-serif)', fontSize: 30, color: 'var(--text)', letterSpacing: '-0.5px', lineHeight: 1 }}>{value}</p>
                {unit && <p style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--text-sub)', letterSpacing: '0.2px', fontWeight: 500 }}>{unit}</p>}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontSize: 11, color: hintColor, fontFamily: 'var(--font-mono)', letterSpacing: '0.2px' }}>{hint}</p>
                {sub && <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-sub)' }}>{sub}</p>}
              </div>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: 'var(--border)' }}>
                <div style={{ height: '100%', width: `${Math.min(100, Math.max(0, fill))}%`, background: fillColor, opacity: 0.5, borderRadius: 1, transition: 'width 0.8s cubic-bezier(0.22,1,0.36,1)' }} />
              </div>
            </div>
          ))}
        </div>

        {/* ERROR */}
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(224,82,82,0.08)', border: '1px solid rgba(224,82,82,0.2)', borderRadius: 12, padding: '14px 18px', marginBottom: 20 }}>
            <AlertCircle size={16} color="var(--red)" />
            <p style={{ fontSize: 13, color: 'var(--red)', flex: 1 }}>{error}</p>
            <button onClick={load} style={{ fontSize: 12, color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Retry</button>
          </div>
        )}

        {/* SECTION LABEL */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.6px', textTransform: 'uppercase', color: 'var(--text-sub)', flexShrink: 0 }}>Projects</p>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          {projects.length > 0 && <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-sub)', flexShrink: 0 }}>{projects.length} total</p>}
        </div>

        {/* SKELETONS */}
        {loading && projects.length === 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {[0, 1, 2, 3].map(i => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* EMPTY */}
        {!loading && !error && projects.length === 0 && (
          <div style={{ border: '1px dashed var(--border)', borderRadius: 16, padding: '60px 40px', textAlign: 'center' }}>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: 20, color: 'var(--text-dim)', fontStyle: 'italic', marginBottom: 8 }}>No projects yet</p>
            <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 20 }}>Create your first infrastructure project to get started.</p>
            <button className="btn-primary" onClick={() => setShowModal(true)}><Plus size={14} /> New Project</button>
          </div>
        )}

        {/* PROJECT CARDS */}
        {projects.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {projects.map(p => (
              <ProjectCard key={p.id} project={p} isActive={selectedProject === p.id} onClick={() => openPanel(p)} />
            ))}
          </div>
        )}
      </div>

      {/* CREATE PROJECT MODAL */}
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

      {/* ── SIDE PANEL ── wide, no scroll ── */}
      {activeProject && (
        <>
          <div onClick={closePanel} style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(8,9,12,0.75)', backdropFilter: 'blur(10px)', transition: 'opacity 0.3s', opacity: isClosing ? 0 : 1 }} />

          <div style={{
            position: 'fixed', top: 0, right: 0, height: '100%',
            width: 680,
            zIndex: 50,
            background: 'var(--surface)',
            borderLeft: '1px solid var(--border)',
            display: 'flex', flexDirection: 'column',
            transform: isClosing ? 'translateX(100%)' : 'translateX(0)',
            opacity: isClosing ? 0 : 1,
            transition: 'transform 0.4s cubic-bezier(0.22,1,0.36,1), opacity 0.4s',
            boxShadow: '-24px 0 64px rgba(0,0,0,0.6)',
            overflow: 'hidden',
          }}>

            {/* ── Panel header ── */}
            <div style={{
              padding: '24px 28px 20px',
              borderBottom: '1px solid var(--border)',
              background: 'var(--surface2)',
              flexShrink: 0, position: 'relative',
            }}>
              {/* Gold top line */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, var(--gold2), var(--gold) 40%, transparent)' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.7px', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 6 }}>
                    {activeProject.projectId} · Project Details
                  </p>
                  <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 24, color: 'var(--text)', letterSpacing: '-0.3px', lineHeight: 1.1, marginBottom: 10 }}>
                    {activeProject.name}
                  </h2>
                  {/* Status + contractor + inspectors inline */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.5px', padding: '4px 10px', borderRadius: 4, background: STATUS_META[activeProject.status].bg, color: STATUS_META[activeProject.status].color, border: `1px solid ${STATUS_META[activeProject.status].border}` }}>
                      {STATUS_META[activeProject.status].label}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--surface3)', border: '1px solid var(--border)', borderRadius: 5, padding: '4px 10px' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--text-dim)' }}>Contractor</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--blue)' }}>
                        {activeProject.contractor.slice(0, 8)}…{activeProject.contractor.slice(-6)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--surface3)', border: '1px solid var(--border)', borderRadius: 5, padding: '4px 10px' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--text-dim)' }}>Inspectors</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--green)' }}>
                        {activeProject.inspectors.length} assigned
                      </span>
                    </div>
                  </div>
                </div>
                <button onClick={closePanel} style={{ width: 32, height: 32, borderRadius: 7, background: 'var(--surface3)', border: '1px solid var(--border)', color: 'var(--text-sub)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: 16 }}>
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* ── Panel body — no scroll, everything fits ── */}
            <div style={{ flex: 1, padding: '22px 28px', display: 'flex', flexDirection: 'column', gap: 18, overflowY: 'auto' }}>

              {/* Fund Overview */}
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px' }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.7px', textTransform: 'uppercase', color: 'var(--text-sub)', marginBottom: 14 }}>Fund Overview</p>

                {/* Three number tiles */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
                  {[
                    { label: 'In Vault',  val: `${activeProject.locked}`,  unit: 'ETH', color: 'var(--gold)'  },
                    { label: 'Released',  val: `${activeProject.used}`,    unit: 'ETH', color: 'var(--green)' },
                    { label: 'Budget',    val: `${activeProject.budget}`,  unit: 'ETH', color: 'var(--text)'  },
                  ].map(({ label, val, unit, color }) => (
                    <div key={label} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 9, padding: '13px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4, marginBottom: 5 }}>
                        <p style={{ fontFamily: 'var(--font-serif)', fontSize: 22, color, letterSpacing: '-0.3px', lineHeight: 1 }}>{val}</p>
                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-sub)' }}>{unit}</p>
                      </div>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-sub)', letterSpacing: '0.4px', textTransform: 'uppercase' }}>{label}</p>
                    </div>
                  ))}
                </div>

                {/* Progress bars */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { label: 'LOCKED / BUDGET',   pct: activeProject.budget > 0 ? Math.round((activeProject.locked / activeProject.budget) * 100) : 0,  color: 'var(--gold)'  },
                    { label: 'RELEASED / LOCKED',  pct: activeProject.locked > 0 ? Math.round((activeProject.used / activeProject.locked) * 100) : 0,    color: 'var(--green)' },
                  ].map(({ label, pct, color }) => (
                    <div key={label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-sub)', letterSpacing: '0.3px' }}>{label}</p>
                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color, fontWeight: 500 }}>{pct}%</p>
                      </div>
                      <div style={{ width: '100%', height: 5, background: 'var(--border)', borderRadius: 3 }}>
                        <div style={{ height: '100%', borderRadius: 3, background: color, width: `${Math.min(100, pct)}%`, opacity: 0.8, transition: 'width 0.6s cubic-bezier(0.22,1,0.36,1)' }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Status message */}
                {activeProject.locked > activeProject.used && (
                  <div style={{ marginTop: 12, padding: '7px 12px', background: 'rgba(77,187,138,0.08)', border: '1px solid rgba(77,187,138,0.2)', borderRadius: 7 }}>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--green)', letterSpacing: '0.2px' }}>
                      ✓ {(activeProject.locked - activeProject.used).toFixed(4)} ETH available for release
                    </p>
                  </div>
                )}
                {activeProject.locked === 0 && activeProject.milestoneCount > 0 && (
                  <div style={{ marginTop: 12, padding: '7px 12px', background: 'rgba(224,82,82,0.08)', border: '1px solid rgba(224,82,82,0.2)', borderRadius: 7 }}>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--red)', letterSpacing: '0.2px' }}>
                      ⚑ No funds locked — lock ETH before releasing milestones
                    </p>
                  </div>
                )}
              </div>

              {/* Meta chips + People — side by side */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

                {/* 2x2 meta chips */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    { label: 'Status',     val: activeProject.statusLabel,                                            color: STATUS_META[activeProject.status].color },
                    { label: 'Milestones', val: `${activeProject.paidMilestones} / ${activeProject.milestoneCount}`, color: 'var(--text)' },
                    { label: 'Approvals',  val: `${activeProject.requiredApprovals} of ${activeProject.inspectors.length}`, color: 'var(--text)' },
                    { label: 'Active',     val: activeProject.active ? 'Yes' : 'No',                                  color: activeProject.active ? 'var(--green)' : 'var(--red)' },
                  ].map(({ label, val, color }) => (
                    <div key={label} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 9, padding: '11px 13px' }}>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--text-sub)', marginBottom: 5 }}>{label}</p>
                      <p style={{ fontSize: 13, color, fontWeight: 500 }}>{val}</p>
                    </div>
                  ))}
                </div>

                {/* Contractor + Inspectors stacked */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 9, padding: '11px 14px' }}>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--text-sub)', marginBottom: 6 }}>Contractor</p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--blue)', letterSpacing: '0.3px' }}>
                      {activeProject.contractor.slice(0, 10)}…{activeProject.contractor.slice(-8)}
                    </p>
                  </div>
                  <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 9, padding: '11px 14px', flex: 1 }}>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--text-sub)', marginBottom: 8 }}>
                      Inspectors ({activeProject.inspectors.length})
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {activeProject.inspectors.map((addr, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--gold)', background: 'var(--gold-soft)', border: '1px solid rgba(201,162,77,0.2)', borderRadius: 3, padding: '1px 5px', flexShrink: 0 }}>{i + 1}</span>
                          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--green)', letterSpacing: '0.3px' }}>
                            {addr.slice(0, 10)}…{addr.slice(-8)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions — Lock + Release side by side */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 9, padding: '14px 16px' }}>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--text-sub)', marginBottom: 10 }}>Lock Funds</p>
                  <PanelInput placeholder="Amount in ETH  e.g. 5" value={amount} onChange={(e: InputEvent) => setAmount(e.target.value)} />
                  <PanelButton icon={<Lock size={12} />} onClick={lockFunds}>Lock to Vault</PanelButton>
                </div>
                <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 9, padding: '14px 16px' }}>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--text-sub)', marginBottom: 10 }}>
                    Release Payment · {activeProject.paidMilestones} paid
                  </p>
                  <PanelInput placeholder={`Milestone ID  (1 – ${activeProject.milestoneCount || '?'})`} value={releaseId} onChange={(e: InputEvent) => setReleaseId(e.target.value)} />
                  <PanelButton icon={<Send size={12} />} onClick={releasePayment} primary>Release Payment</PanelButton>
                </div>
              </div>

              {/* New Milestone — full width, single row */}
              <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 9, padding: '14px 16px' }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--text-sub)', marginBottom: 10 }}>
                  New Milestone · {activeProject.milestoneCount} existing
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px auto', gap: 8, alignItems: 'center' }}>
                  <input
                    value={milestone.description}
                    onChange={(e: InputEvent) => setMilestone({ ...milestone, description: e.target.value })}
                    placeholder="Milestone description..."
                    style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 7, padding: '9px 12px', color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 11, outline: 'none', letterSpacing: '0.2px' }}
                    onFocus={e => { e.target.style.borderColor = 'rgba(201,162,77,0.35)' }}
                    onBlur={e => { e.target.style.borderColor = 'var(--border)' }}
                  />
                  <input
                    value={milestone.amount}
                    onChange={(e: InputEvent) => setMilestone({ ...milestone, amount: e.target.value })}
                    placeholder="ETH amount"
                    style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 7, padding: '9px 12px', color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 11, outline: 'none', letterSpacing: '0.2px' }}
                    onFocus={e => { e.target.style.borderColor = 'rgba(201,162,77,0.35)' }}
                    onBlur={e => { e.target.style.borderColor = 'var(--border)' }}
                  />
                  <button
                    onClick={createMilestone}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'var(--surface3)', border: '1px solid var(--border)', color: 'var(--text-sub)', borderRadius: 7, padding: '9px 16px', fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(201,162,77,0.3)'; e.currentTarget.style.color = 'var(--gold)'; e.currentTarget.style.background = 'var(--gold-soft)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-sub)'; e.currentTarget.style.background = 'var(--surface3)' }}
                  >
                    <Flag size={12} /> Add Milestone
                  </button>
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

function SkeletonCard() {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 22, animation: 'skeletonPulse 1.6s ease-in-out infinite' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
        <div><div style={{ width: 160, height: 14, background: 'var(--border2)', borderRadius: 4, marginBottom: 8 }} /><div style={{ width: 100, height: 9, background: 'var(--border)', borderRadius: 3 }} /></div>
        <div style={{ width: 80, height: 22, background: 'var(--border)', borderRadius: 4 }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 14 }}>
        {[0,1,2].map(i => <div key={i} style={{ height: 52, background: 'var(--border)', borderRadius: 8 }} />)}
      </div>
      <div style={{ width: '100%', height: 4, background: 'var(--border)', borderRadius: 2 }} />
    </div>
  )
}

function ProjectCard({ project, isActive, onClick }: { project: Project; isActive: boolean; onClick: () => void }) {
  const meta       = STATUS_META[project.status]
  const lockPct    = project.budget > 0 ? Math.round((project.locked / project.budget) * 100) : 0
  const releasePct = project.locked > 0 ? Math.round((project.used / project.locked) * 100) : 0
  const showRelease = project.locked > 0

  return (
    <div onClick={onClick} style={{
      background: isActive ? 'var(--surface2)' : 'var(--surface)',
      border: `1px solid ${isActive ? 'rgba(201,162,77,0.5)' : 'var(--border)'}`,
      borderRadius: 14, overflow: 'hidden', cursor: 'pointer',
      position: 'relative',
      boxShadow: isActive ? '0 0 0 1px rgba(201,162,77,0.12)' : 'none',
      transition: 'all 0.25s cubic-bezier(0.22,1,0.36,1)',
    }}
      onMouseEnter={e => { if (!isActive) { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(201,162,77,0.35)'; el.style.transform = 'translateY(-3px)'; el.style.boxShadow = '0 16px 36px rgba(0,0,0,0.4)' } }}
      onMouseLeave={e => { if (!isActive) { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--border)'; el.style.transform = 'translateY(0)'; el.style.boxShadow = 'none' } }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: isActive ? 'linear-gradient(90deg, transparent, var(--gold), transparent)' : 'linear-gradient(90deg, transparent, var(--border2), transparent)' }} />

      {/* Head */}
      <div style={{ padding: '16px 20px 13px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)', letterSpacing: '-0.1px' }}>{project.name}</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-sub)', marginTop: 3, letterSpacing: '0.3px' }}>
              {project.projectId} · {project.contractor.slice(0, 8)}…{project.contractor.slice(-6)}
            </p>
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.5px', padding: '4px 8px', borderRadius: 4, whiteSpace: 'nowrap', background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}>
            {meta.label}
          </span>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '13px 20px' }}>
        {/* Three metric tiles */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 12, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          {[
            { label: 'Budget',   val: `${project.budget} ETH`,  color: 'var(--text)'  },
            { label: 'In Vault', val: project.locked > 0 ? `${project.locked} ETH` : '—', color: project.locked > 0 ? 'var(--gold)' : 'var(--text-sub)' },
            { label: 'Released', val: project.used > 0 ? `${project.used} ETH` : '—',    color: project.used > 0 ? 'var(--green)' : 'var(--text-sub)'  },
          ].map(({ label, val, color }, i) => (
            <div key={label} style={{ padding: '11px 13px', borderRight: i < 2 ? '1px solid var(--border)' : 'none' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.4px', textTransform: 'uppercase', color: 'var(--text-sub)', marginBottom: 5 }}>{label}</p>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 500, color, lineHeight: 1 }}>{val}</p>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-sub)', letterSpacing: '0.2px', textTransform: 'uppercase' }}>
              {showRelease ? 'Released / Locked' : 'Locked / Budget'}
            </p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: showRelease ? 'var(--green)' : 'var(--gold)', fontWeight: 500 }}>
              {showRelease ? `${releasePct}%` : `${lockPct}%`}
            </p>
          </div>
          <div style={{ width: '100%', height: 4, background: 'var(--border)', borderRadius: 2 }}>
            <div style={{ height: '100%', borderRadius: 2, background: showRelease ? 'var(--green)' : 'var(--gold)', width: `${Math.min(100, showRelease ? releasePct : lockPct)}%`, opacity: 0.8, transition: 'width 0.6s cubic-bezier(0.22,1,0.36,1)' }} />
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-sub)', letterSpacing: '0.2px' }}>
            {project.milestoneCount === 0 ? 'No milestones yet' : `${project.paidMilestones} of ${project.milestoneCount} milestone${project.milestoneCount !== 1 ? 's' : ''} paid`}
          </p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-sub)', letterSpacing: '0.2px' }}>
            {project.inspectors.length} inspector{project.inspectors.length !== 1 ? 's' : ''} · {project.requiredApprovals} of {project.inspectors.length} req.
          </p>
        </div>
      </div>
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
      style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 7, padding: '9px 12px', color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 11, outline: 'none', letterSpacing: '0.2px', marginBottom: 8 }}
      onFocus={e => { e.target.style.borderColor = 'rgba(201,162,77,0.35)' }}
      onBlur={e => { e.target.style.borderColor = 'var(--border)' }}
    />
  )
}

function PanelButton({ children, icon, onClick, primary }: { children: React.ReactNode; icon?: React.ReactNode; onClick: () => void; primary?: boolean }) {
  return (
    <button onClick={onClick}
      style={{ width: '100%', background: primary ? 'var(--gold)' : 'var(--surface3)', border: `1px solid ${primary ? 'var(--gold)' : 'var(--border)'}`, color: primary ? '#0d0f14' : 'var(--text-sub)', borderRadius: 7, padding: '9px', fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.2s' }}
      onMouseEnter={e => { const el = e.currentTarget; primary ? (el.style.background = 'var(--gold2)', el.style.boxShadow = '0 5px 18px rgba(201,162,77,0.25)') : (el.style.borderColor = 'rgba(201,162,77,0.3)', el.style.color = 'var(--gold)', el.style.background = 'var(--gold-soft)') }}
      onMouseLeave={e => { const el = e.currentTarget; primary ? (el.style.background = 'var(--gold)', el.style.boxShadow = 'none') : (el.style.borderColor = 'var(--border)', el.style.color = 'var(--text-sub)', el.style.background = 'var(--surface3)') }}
    >
      {icon} {children}
    </button>
  )
}