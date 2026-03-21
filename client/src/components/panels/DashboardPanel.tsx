import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { ChevronDown, ChevronRight, RefreshCw, AlertCircle } from 'lucide-react'
import type { Contracts } from '@/lib/contracts'

/* ─── TYPES ─── */

interface Project {
  id: number
  name: string
  totalBudget: string
  contractor: string
  requiredApprovals: number
  active: boolean
  role: number  // 1=gov, 2=contractor, 3=inspector
}

interface Milestone {
  id: number
  projectId: number
  description: string
  allocatedAmount: string
  state: number
  approvalCount: number
}

/* ─── HELPERS ─── */

const ROLE_META: Record<number, { label: string; color: string; bg: string; border: string }> = {
  1: { label: 'GOVERNMENT',  color: 'var(--gold)',  bg: 'rgba(201,162,77,0.12)',  border: 'rgba(201,162,77,0.2)'  },
  2: { label: 'CONTRACTOR',  color: 'var(--blue)',  bg: 'rgba(74,158,255,0.12)', border: 'rgba(74,158,255,0.2)' },
  3: { label: 'INSPECTOR',   color: 'var(--green)', bg: 'rgba(77,187,138,0.12)', border: 'rgba(77,187,138,0.2)' },
  4: { label: 'SUPPLIER',    color: 'var(--text-dim)', bg: 'rgba(74,80,105,0.12)', border: 'rgba(74,80,105,0.2)' },
}

const STATE_META: Record<number, { label: string; color: string; bg: string; border: string }> = {
  0: { label: 'PENDING',      color: 'var(--text-dim)', bg: 'rgba(74,80,105,0.12)',   border: 'rgba(74,80,105,0.2)'   },
  1: { label: 'UNDER REVIEW', color: 'var(--gold)',     bg: 'rgba(201,162,77,0.12)',  border: 'rgba(201,162,77,0.2)'  },
  2: { label: 'APPROVED',     color: 'var(--green)',    bg: 'rgba(77,187,138,0.12)',  border: 'rgba(77,187,138,0.2)'  },
  3: { label: 'PAID',         color: 'var(--blue)',     bg: 'rgba(74,158,255,0.12)',  border: 'rgba(74,158,255,0.2)'  },
}

/* ─── COMPONENT ─── */

export function DashboardPanel({
  contracts,
  account,
}: {
  contracts: Contracts | null
  account: string | null
}) {
  const [projects, setProjects]         = useState<Project[]>([])
  const [milestones, setMilestones]     = useState<Record<number, Milestone[]>>({})
  const [expandedProj, setExpandedProj] = useState<number | null>(null)
  const [loading, setLoading]           = useState(true)
  const [refreshing, setRefreshing]     = useState(false)
  const [error, setError]               = useState<string | null>(null)

  useEffect(() => {
    if (contracts && account) loadDashboard()
  }, [contracts, account])

  const loadDashboard = async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true)
    setError(null)
    try {
      const count = await contracts!.registry.projectCount()
      const _projects: Project[] = []

      for (let i = 1; i <= count.toNumber(); i++) {
        const role = await contracts!.registry.projectRoles(i, account)
        if (Number(role) !== 0) {
          const p = await contracts!.registry.getProject(i)
          _projects.push({
            id:                p.id.toNumber(),
            name:              p.name,
            totalBudget:       ethers.utils.formatEther(p.totalBudget),
            contractor:        p.contractor,
            requiredApprovals: p.requiredApprovals.toNumber(),
            active:            p.active,
            role:              Number(role),
          })
        }
      }
      setProjects(_projects)
      if (isRefresh) setMilestones({})
    } catch (e: any) {
      setError(e.message ?? 'Failed to load dashboard')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const loadMilestones = async (pid: number) => {
    if (expandedProj === pid) { setExpandedProj(null); return }
    setExpandedProj(pid)
    if (milestones[pid]) return
    try {
      const mCount = await contracts!.milestone.milestoneCount(pid)
      const _milestones: Milestone[] = []
      for (let j = 1; j <= mCount.toNumber(); j++) {
        const m = await contracts!.milestone.milestones(pid, j)
        _milestones.push({
          id:              m.id.toNumber(),
          projectId:       m.projectId.toNumber(),
          description:     m.description,
          allocatedAmount: ethers.utils.formatEther(m.allocatedAmount),
          state:           m.state,
          approvalCount:   m.approvalCount.toNumber(),
        })
      }
      setMilestones(prev => ({ ...prev, [pid]: _milestones }))
    } catch (e) {
      console.error('Loading milestones error:', e)
    }
  }

  const totalMilestones = Object.values(milestones).flat().length
  const approvedCount   = Object.values(milestones).flat().filter(m => m.state >= 2).length

  /* ─── UI ─── */

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 44px' }}>

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 36 }}>
        <div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 6 }}>
            Overview
          </p>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 34, letterSpacing: '-0.5px', color: 'var(--text)', lineHeight: 1.1 }}>
            My <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Projects</em>
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 5, fontWeight: 300 }}>
            Projects and milestones assigned to your connected wallet.
          </p>
        </div>
        <button
          onClick={() => loadDashboard(true)}
          disabled={refreshing || loading}
          style={{
            background: 'var(--surface2)', border: '1px solid var(--border)',
            color: refreshing ? 'var(--text-dim)' : 'var(--text-sub)',
            borderRadius: 9, padding: '10px 14px',
            cursor: refreshing ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
            fontFamily: 'var(--font-sans)', fontSize: 13, transition: 'all 0.2s',
          }}
        >
          <RefreshCw size={13} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          {refreshing ? 'Syncing…' : 'Refresh'}
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
          <button onClick={() => loadDashboard(true)} style={{ fontSize: 12, color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Retry</button>
        </div>
      )}

      {/* STAT CARDS */}
      {!loading && projects.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 13, marginBottom: 36 }}>
          {[
            { label: 'Active Projects',    value: projects.length,    hint: `· ${projects.filter(p => p.active).length} active` },
            { label: 'Milestones Tracked', value: totalMilestones,    hint: '· expand to load' },
            { label: 'Approved / Paid',    value: approvedCount,      hint: totalMilestones > 0 ? `· ${Math.round((approvedCount / totalMilestones) * 100)}% complete` : '· expand to load' },
          ].map(({ label, value, hint }) => (
            <div key={label} style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 16, padding: '20px 22px', position: 'relative', overflow: 'hidden',
              transition: 'transform 0.3s', cursor: 'default',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)' }}
            >
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.9px', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 12 }}>{label}</p>
              <p style={{ fontFamily: 'var(--font-serif)', fontSize: 28, color: 'var(--text)', letterSpacing: '-0.4px', lineHeight: 1 }}>{value}</p>
              <p style={{ fontSize: 10, marginTop: 7, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', letterSpacing: '0.2px' }}>{hint}</p>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: 'var(--border)' }}>
                <div style={{ height: '100%', width: '100%', background: 'linear-gradient(90deg, var(--gold), var(--gold2))', borderRadius: 1 }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* LOADING SKELETONS */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 16, padding: '22px 24px',
              animation: 'skeletonPulse 1.6s ease-in-out infinite',
              animationDelay: `${i * 0.1}s`,
            }}>
              <div style={{ width: 200, height: 14, background: 'var(--border2)', borderRadius: 4, marginBottom: 12 }} />
              <div style={{ width: 140, height: 9, background: 'var(--border)', borderRadius: 3 }} />
            </div>
          ))}
        </div>
      )}

      {/* EMPTY STATE */}
      {!loading && !error && projects.length === 0 && (
        <div style={{
          border: '1px dashed var(--border)', borderRadius: 16,
          padding: '60px 40px', textAlign: 'center',
        }}>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: 20, color: 'var(--text-dim)', fontStyle: 'italic', marginBottom: 8 }}>
            No projects assigned
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6 }}>
            Your wallet has no role in any active project.<br />
            Ask the government account to assign you as contractor or inspector.
          </p>
        </div>
      )}

      {/* PROJECT LIST */}
      {!loading && projects.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {projects.map(p => {
            const roleMeta = ROLE_META[p.role]
            const isExpanded = expandedProj === p.id
            return (
              <div key={p.id} style={{
                background: 'var(--surface)', border: `1px solid ${isExpanded ? 'rgba(201,162,77,0.3)' : 'var(--border)'}`,
                borderRadius: 16, overflow: 'hidden',
                transition: 'border-color 0.2s',
              }}>
                {/* Top shimmer when expanded */}
                <div style={{
                  height: 1,
                  background: isExpanded
                    ? 'linear-gradient(90deg, transparent, var(--gold), transparent)'
                    : 'linear-gradient(90deg, transparent, var(--border2), transparent)',
                  transition: 'background 0.3s',
                }} />

                {/* Project row */}
                <button
                  onClick={() => loadMilestones(p.id)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '20px 24px', background: 'transparent',
                    border: 'none', cursor: 'pointer', textAlign: 'left',
                    gap: 16, transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      {/* Project ID */}
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: 9,
                        color: 'var(--gold)', letterSpacing: '0.5px',
                        background: 'var(--gold-soft)', border: '1px solid rgba(201,162,77,0.2)',
                        borderRadius: 4, padding: '3px 7px', flexShrink: 0,
                      }}>
                        PRJ-{String(p.id).padStart(4, '0')}
                      </span>

                      {/* Project name */}
                      <h3 style={{
                        fontSize: 15, fontWeight: 500, color: 'var(--text)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        letterSpacing: '-0.1px',
                      }}>
                        {p.name}
                      </h3>

                      {/* Role badge */}
                      {roleMeta && (
                        <span style={{
                          fontFamily: 'var(--font-mono)', fontSize: 9,
                          letterSpacing: '0.5px', padding: '3px 8px', borderRadius: 4,
                          background: roleMeta.bg, color: roleMeta.color,
                          border: `1px solid ${roleMeta.border}`, flexShrink: 0,
                        }}>
                          {roleMeta.label}
                        </span>
                      )}

                      {/* Active badge */}
                      {p.active && (
                        <span style={{
                          fontFamily: 'var(--font-mono)', fontSize: 9,
                          color: 'var(--green)', background: 'rgba(77,187,138,0.12)',
                          border: '1px solid rgba(77,187,138,0.2)',
                          borderRadius: 4, padding: '3px 7px', flexShrink: 0,
                        }}>
                          ACTIVE
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                        Budget: <strong style={{ color: 'var(--text)', fontWeight: 500 }}>{parseFloat(p.totalBudget).toFixed(2)} ETH</strong>
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                        Approvals: <strong style={{ color: 'var(--text)', fontWeight: 500 }}>{p.requiredApprovals}</strong>
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                        Contractor: <strong style={{ color: 'var(--text-sub)', fontWeight: 400 }}>
                          {p.contractor.slice(0, 8)}…{p.contractor.slice(-6)}
                        </strong>
                      </span>
                    </div>
                  </div>

                  {isExpanded
                    ? <ChevronDown size={16} color="var(--gold)" style={{ flexShrink: 0 }} />
                    : <ChevronRight size={16} color="var(--text-dim)" style={{ flexShrink: 0 }} />
                  }
                </button>

                {/* Expanded milestones */}
                {isExpanded && (
                  <div style={{
                    borderTop: '1px solid var(--border)',
                    background: 'var(--surface2)',
                    padding: '20px 24px',
                  }}>
                    <p style={{
                      fontFamily: 'var(--font-mono)', fontSize: 9,
                      letterSpacing: '0.7px', textTransform: 'uppercase',
                      color: 'var(--text-dim)', marginBottom: 14,
                    }}>
                      Milestones
                    </p>

                    {!milestones[p.id] ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {[1, 2].map(i => (
                          <div key={i} style={{
                            height: 58, borderRadius: 10,
                            background: 'var(--surface3)', border: '1px solid var(--border)',
                            animation: 'skeletonPulse 1.6s ease-in-out infinite',
                          }} />
                        ))}
                      </div>
                    ) : milestones[p.id].length === 0 ? (
                      <p style={{ fontSize: 12, color: 'var(--text-dim)', fontStyle: 'italic' }}>
                        No milestones created yet.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {milestones[p.id].map(m => {
                          const sMeta = STATE_META[m.state] ?? STATE_META[0]
                          return (
                            <div key={m.id} style={{
                              display: 'flex', alignItems: 'center',
                              justifyContent: 'space-between',
                              background: 'var(--bg)',
                              border: '1px solid var(--border)',
                              borderRadius: 10, padding: '13px 16px', gap: 16,
                            }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                                  <span style={{
                                    fontFamily: 'var(--font-mono)', fontSize: 9,
                                    color: 'var(--gold)', background: 'var(--gold-soft)',
                                    border: '1px solid rgba(201,162,77,0.2)',
                                    borderRadius: 4, padding: '2px 6px', flexShrink: 0,
                                  }}>
                                    M{m.id}
                                  </span>
                                  <span style={{
                                    fontSize: 13, fontWeight: 500, color: 'var(--text)',
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                  }}>
                                    {m.description}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', gap: 16 }}>
                                  <span style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                                    Amount: <strong style={{ color: 'var(--text-sub)', fontWeight: 500 }}>{parseFloat(m.allocatedAmount).toFixed(2)} ETH</strong>
                                  </span>
                                  <span style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                                    Approvals: <strong style={{ color: 'var(--text-sub)', fontWeight: 500 }}>{m.approvalCount} / {p.requiredApprovals}</strong>
                                  </span>
                                </div>
                              </div>

                              {/* State badge */}
                              <span style={{
                                fontFamily: 'var(--font-mono)', fontSize: 9,
                                letterSpacing: '0.5px', padding: '4px 9px',
                                borderRadius: 4, flexShrink: 0,
                                background: sMeta.bg, color: sMeta.color,
                                border: `1px solid ${sMeta.border}`,
                              }}>
                                {sMeta.label}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}