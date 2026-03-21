import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Contracts } from '@/lib/contracts'
import { StatusBadge } from '@/components/shared/StatusBadge'

/* Interfaces matching smart contract returns */
interface Project { id: number, name: string, totalBudget: string, contractor: string, requiredApprovals: number, active: boolean }
interface Milestone { id: number, projectId: number, description: string, allocatedAmount: string, state: number, approvalCount: number }

export function DashboardPanel({ contracts, account }: { contracts: Contracts | null, account: string | null }) {
    const [projects, setProjects] = useState<Project[]>([])
    const [milestones, setMilestones] = useState<Record<number, Milestone[]>>({})
    const [expandedProj, setExpandedProj] = useState<number | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (contracts && account) loadDashboard()
    }, [contracts, account])

    const loadDashboard = async () => {
        setLoading(true)
        try {
            const count = await contracts!.registry.projectCount()
            const _projects: Project[] = []

            for (let i = 1; i <= count.toNumber(); i++) {
                const role = await contracts!.registry.projectRoles(i, account)
                if (role !== 0) {
                    const p = await contracts!.registry.getProject(i)
                    _projects.push({
                        id: p.id.toNumber(),
                        name: p.name,
                        totalBudget: ethers.utils.formatEther(p.totalBudget),
                        contractor: p.contractor,
                        requiredApprovals: p.requiredApprovals.toNumber(),
                        active: p.active
                    })
                }
            }
            setProjects(_projects)
        } catch (e) {
            console.error("Dashboard error:", e)
        }
        setLoading(false)
    }

    const loadMilestones = async (pid: number) => {
        if (expandedProj === pid) { setExpandedProj(null); return; }

        setExpandedProj(pid)
        if (milestones[pid]) return; // Already loaded

        try {
            const mCount = await contracts!.milestone.milestoneCount(pid)
            const _milestones: Milestone[] = []
            for (let j = 1; j <= mCount.toNumber(); j++) {
                const m = await contracts!.milestone.milestones(pid, j)
                _milestones.push({
                    id: m.id.toNumber(),
                    projectId: m.projectId.toNumber(),
                    description: m.description,
                    allocatedAmount: ethers.utils.formatEther(m.allocatedAmount),
                    state: m.state,
                    approvalCount: m.approvalCount.toNumber()
                })
            }
            setMilestones(prev => ({ ...prev, [pid]: _milestones }))
        } catch (e) {
            console.error("Loading milestones error:", e)
        }
    }

    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-lg font-semibold text-zinc-900">Projects Dashboard</h2>
                <p className="text-sm text-zinc-500 mt-0.5">Your assigned projects and milestone statuses.</p>
            </div>

            {loading ? (
                <div className="flex animate-pulse space-x-4">
                    <div className="flex-1 space-y-4 py-1">
                        <div className="h-4 bg-zinc-200 rounded w-full"></div>
                        <div className="h-4 bg-zinc-200 rounded w-5/6"></div>
                        <div className="h-4 bg-zinc-200 rounded w-4/6"></div>
                    </div>
                </div>
            ) : projects.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/50 p-8 text-center text-sm text-zinc-500">
                    No active projects assigned to your wallet address.
                </div>
            ) : (
                <div className="space-y-3">
                    {projects.map(p => (
                        <div key={p.id} className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
                            <button
                                onClick={() => loadMilestones(p.id)}
                                className="w-full flex items-center justify-between px-5 py-4 hover:bg-zinc-50 transition-colors text-left focus:outline-none"
                            >
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-sm font-semibold text-zinc-900">Project #{p.id}: {p.name}</h3>
                                    </div>
                                    <p className="text-xs text-zinc-500">
                                        Budget: {p.totalBudget} ETH • Required Approvals: {p.requiredApprovals}
                                    </p>
                                </div>
                                {expandedProj === p.id ? <ChevronDown className="h-5 w-5 text-zinc-400" /> : <ChevronRight className="h-5 w-5 text-zinc-400" />}
                            </button>

                            {expandedProj === p.id && (
                                <div className="border-t border-zinc-100 bg-zinc-50 px-5 py-4">
                                    <h4 className="text-[10px] font-bold text-zinc-400 mb-3 uppercase tracking-wider">Milestones</h4>

                                    {!milestones[p.id] ? (
                                        <div className="text-xs text-zinc-400">Loading milestones...</div>
                                    ) : milestones[p.id].length === 0 ? (
                                        <div className="text-xs text-zinc-500 italic">No milestones created yet.</div>
                                    ) : (
                                        <div className="space-y-2">
                                            {milestones[p.id].map(m => (
                                                <div key={m.id} className="flex items-center justify-between bg-white rounded-lg border border-zinc-200 px-4 py-3 shadow-sm">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            <span className="text-xs font-bold text-indigo-500">#{m.id}</span>
                                                            <span className="text-sm font-medium text-zinc-800">{m.description}</span>
                                                        </div>
                                                        <p className="text-xs text-zinc-400">
                                                            Budget: {m.allocatedAmount} ETH • Approvals: {m.approvalCount} / {p.requiredApprovals}
                                                        </p>
                                                    </div>
                                                    <StatusBadge state={m.state} />
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
