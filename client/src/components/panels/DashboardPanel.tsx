// import { useState, useEffect } from 'react'
// import { ethers } from 'ethers'
// import { ChevronDown, ChevronRight } from 'lucide-react'
// import { cn } from '@/lib/utils'
// import type { Contracts } from '@/lib/contracts'
// import { StatusBadge } from '@/components/shared/StatusBadge'

// /* Interfaces matching smart contract returns */
// interface Project { id: number, name: string, totalBudget: string, contractor: string, requiredApprovals: number, active: boolean }
// interface Milestone { id: number, projectId: number, description: string, allocatedAmount: string, state: number, approvalCount: number }

// export function DashboardPanel({ contracts, account }: { contracts: Contracts | null, account: string | null }) {
//     const [projects, setProjects] = useState<Project[]>([])
//     const [milestones, setMilestones] = useState<Record<number, Milestone[]>>({})
//     const [expandedProj, setExpandedProj] = useState<number | null>(null)
//     const [loading, setLoading] = useState(true)

//     useEffect(() => {
//         if (contracts && account) loadDashboard()
//     }, [contracts, account])

//     const loadDashboard = async () => {
//         setLoading(true)
//         try {
//             const count = await contracts!.registry.projectCount()
//             const _projects: Project[] = []

//             for (let i = 1; i <= count.toNumber(); i++) {
//                 const role = await contracts!.registry.projectRoles(i, account)
//                 if (role !== 0) {
//                     const p = await contracts!.registry.getProject(i)
//                     _projects.push({
//                         id: p.id.toNumber(),
//                         name: p.name,
//                         totalBudget: ethers.utils.formatEther(p.totalBudget),
//                         contractor: p.contractor,
//                         requiredApprovals: p.requiredApprovals.toNumber(),
//                         active: p.active
//                     })
//                 }
//             }
//             setProjects(_projects)
//         } catch (e) {
//             console.error("Dashboard error:", e)
//         }
//         setLoading(false)
//     }

//     const loadMilestones = async (pid: number) => {
//         if (expandedProj === pid) { setExpandedProj(null); return; }

//         setExpandedProj(pid)
//         if (milestones[pid]) return; // Already loaded

//         try {
//             const mCount = await contracts!.milestone.milestoneCount(pid)
//             const _milestones: Milestone[] = []
//             for (let j = 1; j <= mCount.toNumber(); j++) {
//                 const m = await contracts!.milestone.milestones(pid, j)
//                 _milestones.push({
//                     id: m.id.toNumber(),
//                     projectId: m.projectId.toNumber(),
//                     description: m.description,
//                     allocatedAmount: ethers.utils.formatEther(m.allocatedAmount),
//                     state: m.state,
//                     approvalCount: m.approvalCount.toNumber()
//                 })
//             }
//             setMilestones(prev => ({ ...prev, [pid]: _milestones }))
//         } catch (e) {
//             console.error("Loading milestones error:", e)
//         }
//     }

//     return (
//         <div className="space-y-4">
//             <div>
//                 <h2 className="text-lg font-semibold text-zinc-900">Projects Dashboard</h2>
//                 <p className="text-sm text-zinc-500 mt-0.5">Your assigned projects and milestone statuses.</p>
//             </div>

//             {loading ? (
//                 <div className="flex animate-pulse space-x-4">
//                     <div className="flex-1 space-y-4 py-1">
//                         <div className="h-4 bg-zinc-200 rounded w-full"></div>
//                         <div className="h-4 bg-zinc-200 rounded w-5/6"></div>
//                         <div className="h-4 bg-zinc-200 rounded w-4/6"></div>
//                     </div>
//                 </div>
//             ) : projects.length === 0 ? (
//                 <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/50 p-8 text-center text-sm text-zinc-500">
//                     No active projects assigned to your wallet address.
//                 </div>
//             ) : (
//                 <div className="space-y-3">
//                     {projects.map(p => (
//                         <div key={p.id} className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
//                             <button
//                                 onClick={() => loadMilestones(p.id)}
//                                 className="w-full flex items-center justify-between px-5 py-4 hover:bg-zinc-50 transition-colors text-left focus:outline-none"
//                             >
//                                 <div>
//                                     <div className="flex items-center gap-2 mb-1">
//                                         <h3 className="text-sm font-semibold text-zinc-900">Project #{p.id}: {p.name}</h3>
//                                     </div>
//                                     <p className="text-xs text-zinc-500">
//                                         Budget: {p.totalBudget} ETH • Required Approvals: {p.requiredApprovals}
//                                     </p>
//                                 </div>
//                                 {expandedProj === p.id ? <ChevronDown className="h-5 w-5 text-zinc-400" /> : <ChevronRight className="h-5 w-5 text-zinc-400" />}
//                             </button>

//                             {expandedProj === p.id && (
//                                 <div className="border-t border-zinc-100 bg-zinc-50 px-5 py-4">
//                                     <h4 className="text-[10px] font-bold text-zinc-400 mb-3 uppercase tracking-wider">Milestones</h4>

//                                     {!milestones[p.id] ? (
//                                         <div className="text-xs text-zinc-400">Loading milestones...</div>
//                                     ) : milestones[p.id].length === 0 ? (
//                                         <div className="text-xs text-zinc-500 italic">No milestones created yet.</div>
//                                     ) : (
//                                         <div className="space-y-2">
//                                             {milestones[p.id].map(m => (
//                                                 <div key={m.id} className="flex items-center justify-between bg-white rounded-lg border border-zinc-200 px-4 py-3 shadow-sm">
//                                                     <div>
//                                                         <div className="flex items-center gap-2 mb-0.5">
//                                                             <span className="text-xs font-bold text-indigo-500">#{m.id}</span>
//                                                             <span className="text-sm font-medium text-zinc-800">{m.description}</span>
//                                                         </div>
//                                                         <p className="text-xs text-zinc-400">
//                                                             Budget: {m.allocatedAmount} ETH • Approvals: {m.approvalCount} / {p.requiredApprovals}
//                                                         </p>
//                                                     </div>
//                                                     <StatusBadge state={m.state} />
//                                                 </div>
//                                             ))}
//                                         </div>
//                                     )}
//                                 </div>
//                             )}
//                         </div>
//                     ))}
//                 </div>
//             )}
//         </div>
//     )
// }
import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { ChevronDown, ChevronRight, LayoutDashboard, RefreshCw } from 'lucide-react'
import type { Contracts } from '@/lib/contracts'

interface Project {
  id: number
  name: string
  totalBudget: string
  contractor: string
  requiredApprovals: number
  active: boolean
}

interface Milestone {
  id: number
  projectId: number
  description: string
  allocatedAmount: string
  state: number
  approvalCount: number
}

const STATE_CONFIG: Record<number, { label: string; bg: string; color: string; border: string }> = {
  0: { label: 'Pending',       bg: 'var(--surface-2)', color: 'var(--text-secondary)', border: 'var(--border-default)' },
  1: { label: 'Under Review',  bg: '#fffbeb',          color: '#b45309',               border: '#fde68a'               },
  2: { label: 'Approved',      bg: '#f0fdf4',          color: '#15803d',               border: '#bbf7d0'               },
  3: { label: 'Paid',          bg: '#eff6ff',          color: '#1d4ed8',               border: '#bfdbfe'               },
}

function StateBadge({ state }: { state: number }) {
  const cfg = STATE_CONFIG[state] ?? STATE_CONFIG[0]
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      background: cfg.bg,
      color: cfg.color,
      border: `1px solid ${cfg.border}`,
      borderRadius: 99,
      padding: '3px 11px',
      fontSize: 11,
      fontWeight: 600,
      whiteSpace: 'nowrap',
      flexShrink: 0,
    }}>
      {cfg.label}
    </span>
  )
}

function SkeletonRow() {
  return (
    <div style={{
      background: 'var(--surface-0)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 12,
      padding: '20px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}>
      {[100, 60, 40].map(w => (
        <div key={w} style={{
          height: 12,
          borderRadius: 6,
          background: 'var(--surface-2)',
          width: `${w}%`,
          animation: 'pulse 1.5s ease-in-out infinite',
        }} />
      ))}
    </div>
  )
}

export function DashboardPanel({
  contracts,
  account,
}: {
  contracts: Contracts | null
  account: string | null
}) {
  const [projects, setProjects]       = useState<Project[]>([])
  const [milestones, setMilestones]   = useState<Record<number, Milestone[]>>({})
  const [expandedProj, setExpandedProj] = useState<number | null>(null)
  const [loading, setLoading]         = useState(true)
  const [refreshing, setRefreshing]   = useState(false)

  useEffect(() => {
    if (contracts && account) loadDashboard()
  }, [contracts, account])

  const loadDashboard = async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true)
    try {
      const count = await contracts!.registry.projectCount()
      const _projects: Project[] = []

      for (let i = 1; i <= count.toNumber(); i++) {
        const role = await contracts!.registry.projectRoles(i, account)
        if (role !== 0) {
          const p = await contracts!.registry.getProject(i)
          _projects.push({
            id:                p.id.toNumber(),
            name:              p.name,
            totalBudget:       ethers.utils.formatEther(p.totalBudget),
            contractor:        p.contractor,
            requiredApprovals: p.requiredApprovals.toNumber(),
            active:            p.active,
          })
        }
      }
      setProjects(_projects)
      // Clear cached milestones on refresh so they reload fresh
      if (isRefresh) setMilestones({})
    } catch (e) {
      console.error('Dashboard error:', e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const loadMilestones = async (pid: number) => {
    if (expandedProj === pid) {
      setExpandedProj(null)
      return
    }
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

  // Derive summary counts from loaded milestone data
  const totalMilestones = Object.values(milestones).flat().length
  const approvedCount   = Object.values(milestones).flat().filter(m => m.state >= 2).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

      {/* ── Header row ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            My Projects
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            Projects and milestones assigned to your connected wallet.
          </p>
        </div>
        <button
          onClick={() => loadDashboard(true)}
          disabled={refreshing || loading}
          className="btn-ghost"
          style={{ flexShrink: 0, marginTop: 2 }}
        >
          <RefreshCw
            size={13}
            style={refreshing ? { animation: 'spin 1s linear infinite' } : undefined}
          />
          Refresh
        </button>
      </div>

      {/* ── Summary stat cards — only when projects loaded ── */}
      {!loading && projects.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {[
            { label: 'Active Projects',      value: projects.length        },
            { label: 'Milestones tracked',   value: totalMilestones        },
            { label: 'Approved / Paid',      value: approvedCount          },
          ].map(({ label, value }) => (
            <div key={label} style={{
              background: 'var(--surface-0)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 12,
              padding: '18px 22px',
            }}>
              <p style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--text-tertiary)',
                marginBottom: 8,
              }}>
                {label}
              </p>
              <p style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
                {value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ── Project list ── */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      ) : projects.length === 0 ? (
        /* Empty state */
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '72px 40px',
          textAlign: 'center',
          background: 'var(--surface-0)',
          border: '1px dashed var(--border-default)',
          borderRadius: 14,
          gap: 12,
        }}>
          <div style={{
            width: 48, height: 48,
            borderRadius: '50%',
            background: 'var(--surface-2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <LayoutDashboard size={20} color="var(--text-tertiary)" />
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
              No projects assigned
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4, lineHeight: 1.6 }}>
              Your wallet address has no role in any active project.<br />
              Ask the government account to assign you as contractor or inspector.
            </p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {projects.map(p => (
            <div
              key={p.id}
              style={{
                background: 'var(--surface-0)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 14,
                overflow: 'hidden',
              }}
            >
              {/* ── Project row ── */}
              <button
                onClick={() => loadMilestones(p.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '18px 24px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.12s',
                  gap: 16,
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-1)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: 'var(--accent)',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      background: 'var(--accent-light)',
                      border: '1px solid var(--accent-border)',
                      borderRadius: 99,
                      padding: '2px 9px',
                      flexShrink: 0,
                    }}>
                      #{p.id}
                    </span>
                    <h3 style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {p.name}
                    </h3>
                    {p.active && (
                      <span style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: '#15803d',
                        background: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        borderRadius: 99,
                        padding: '2px 8px',
                        flexShrink: 0,
                      }}>
                        Active
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      Budget:{' '}
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {p.totalBudget} ETH
                      </span>
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      Required approvals:{' '}
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {p.requiredApprovals}
                      </span>
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      Contractor:{' '}
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>
                        {p.contractor.slice(0, 8)}…{p.contractor.slice(-6)}
                      </span>
                    </span>
                  </div>
                </div>

                {expandedProj === p.id
                  ? <ChevronDown size={18} color="var(--text-tertiary)" style={{ flexShrink: 0 }} />
                  : <ChevronRight size={18} color="var(--text-tertiary)" style={{ flexShrink: 0 }} />
                }
              </button>

              {/* ── Expanded milestones ── */}
              {expandedProj === p.id && (
                <div style={{
                  borderTop: '1px solid var(--border-subtle)',
                  background: 'var(--surface-1)',
                  padding: '20px 24px',
                }}>
                  <p style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--text-tertiary)',
                    marginBottom: 14,
                  }}>
                    Milestones
                  </p>

                  {!milestones[p.id] ? (
                    /* Loading milestones skeleton */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {[1, 2].map(i => (
                        <div key={i} style={{
                          height: 56,
                          borderRadius: 8,
                          background: 'var(--surface-2)',
                          animation: 'pulse 1.5s ease-in-out infinite',
                        }} />
                      ))}
                    </div>
                  ) : milestones[p.id].length === 0 ? (
                    <p style={{ fontSize: 13, color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                      No milestones created yet.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {milestones[p.id].map(m => (
                        <div
                          key={m.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: 'var(--surface-0)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 10,
                            padding: '14px 18px',
                            gap: 16,
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                              <span style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: 11,
                                fontWeight: 700,
                                color: 'var(--accent)',
                                flexShrink: 0,
                              }}>
                                M{m.id}
                              </span>
                              <span style={{
                                fontSize: 13,
                                fontWeight: 500,
                                color: 'var(--text-primary)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}>
                                {m.description}
                              </span>
                            </div>
                            <div style={{ display: 'flex', gap: 16 }}>
                              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                Budget:{' '}
                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                  {m.allocatedAmount} ETH
                                </span>
                              </span>
                              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                Approvals:{' '}
                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                  {m.approvalCount} / {p.requiredApprovals}
                                </span>
                              </span>
                            </div>
                          </div>
                          <StateBadge state={m.state} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}