import { useState } from 'react'
import { ethers } from 'ethers'
import { Loader2, CheckCircle, Search } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { StatusBadge } from '@/components/shared/StatusBadge'
import type { Contracts } from '@/lib/contracts'

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
    return (
        <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">{label}</label>
            <input {...props} className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-colors" />
        </div>
    )
}

export function InspectorPanel({ contracts }: { contracts: Contracts | null }) {
    const [projectId, setProjectId] = useState('')
    const [milestoneId, setMilestoneId] = useState('')
    const [report, setReport] = useState('')
    const [status, setStatus] = useState<number | null>(null)
    const [checking, setChecking] = useState(false)
    const [loading, setLoading] = useState(false)

    const checkStatus = async () => {
        if (!contracts) return toast.error('Connect wallet first')
        setChecking(true)
        try {
            const state = await contracts.milestone.getMilestoneState(parseInt(projectId), parseInt(milestoneId))
            setStatus(Number(state))
        } catch (e: any) {
            toast.error(e?.reason ?? e?.message ?? 'Failed to fetch status')
        } finally { setChecking(false) }
    }

    const approve = async () => {
        if (!contracts) return toast.error('Connect wallet first')
        if (!report.trim()) return toast.error('Enter your inspection report')
        setLoading(true)
        try {
            const reportHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(report))
            const tx = await contracts.milestone.approve(parseInt(projectId), parseInt(milestoneId), reportHash)
            await tx.wait()
            toast.success('Approval submitted!', { description: 'Report hash stored on-chain permanently' })
            // Refresh status
            const newState = await contracts.milestone.getMilestoneState(parseInt(projectId), parseInt(milestoneId))
            setStatus(Number(newState))
        } catch (e: any) {
            toast.error(e?.reason ?? e?.message ?? 'Transaction failed')
        } finally { setLoading(false) }
    }

    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-lg font-semibold text-zinc-900">Inspector Panel</h2>
                <p className="text-sm text-zinc-500 mt-0.5">Review milestone claims and submit cryptographically-signed approvals.</p>
            </div>

            {/* Status checker */}
            <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-zinc-100">
                    <h3 className="text-sm font-semibold text-zinc-900">Milestone Status</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">Check current state before approving</p>
                </div>
                <div className="px-5 py-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Project ID" type="number" placeholder="1" value={projectId} onChange={e => setProjectId(e.target.value)} className="" />
                        <Field label="Milestone ID" type="number" placeholder="1" value={milestoneId} onChange={e => setMilestoneId(e.target.value)} className="" />
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={checkStatus}
                            disabled={checking}
                            className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 transition-colors disabled:opacity-50"
                        >
                            {checking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                            Check Status
                        </button>
                        {status !== null && <StatusBadge state={status} />}
                    </div>
                </div>
            </div>

            {/* Approval form */}
            <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-zinc-100">
                    <h3 className="text-sm font-semibold text-zinc-900">Submit Approval</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">Your report is hashed and stored on-chain — immutable and tamper-proof</p>
                </div>
                <div className="px-5 py-4 space-y-3">
                    <div>
                        <label className="block text-xs font-medium text-zinc-500 mb-1">Inspection Report</label>
                        <textarea
                            rows={5}
                            value={report}
                            onChange={e => setReport(e.target.value)}
                            placeholder="Describe your physical site inspection findings, material quality checks, and compliance notes…"
                            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 resize-none"
                        />
                    </div>
                    {report && (
                        <div className="rounded-lg bg-zinc-50 border border-zinc-100 px-3 py-2">
                            <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-1">Report hash (stored on-chain)</p>
                            <p className="font-mono text-xs text-zinc-600 break-all">
                                {ethers.utils.keccak256(ethers.utils.toUtf8Bytes(report))}
                            </p>
                        </div>
                    )}
                    <button
                        onClick={approve}
                        disabled={loading || status !== 1}
                        className={cn(
                            'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors',
                            status === 1
                                ? 'bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50'
                                : 'bg-zinc-300 cursor-not-allowed'
                        )}
                    >
                        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                        {status !== 1 ? 'Milestone must be UNDER REVIEW to approve' : 'Sign Approval'}
                    </button>
                </div>
            </div>
        </div>
    )
}
