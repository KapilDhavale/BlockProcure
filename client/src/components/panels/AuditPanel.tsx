import { useState, useCallback } from 'react'
import { RefreshCw, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { Contracts } from '@/lib/contracts'
import type { ethers } from 'ethers'

type LogEntry = {
    event: string
    block: number
    args: Record<string, string>
    tx: string
}

const EVENT_BADGE: Record<string, string> = {
    ProjectCreated: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    FundsLocked: 'bg-amber-50 text-amber-700 border-amber-100',
    MilestoneCreated: 'bg-sky-50 text-sky-700 border-sky-100',
    ClaimSubmitted: 'bg-orange-50 text-orange-700 border-orange-100',
    InspectorApproved: 'bg-violet-50 text-violet-700 border-violet-100',
    MilestoneApproved: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    PaymentReleased: 'bg-green-50 text-green-700 border-green-100',
    InvoiceLogged: 'bg-pink-50 text-pink-700 border-pink-100',
}

function formatArgs(event: string, args: any): Record<string, string> {
    try {
        switch (event) {
            case 'ProjectCreated':
                return { 'Project #': args.projectId?.toString(), Name: args.name, Budget: args.budget?.toString() + ' wei' }
            case 'FundsLocked':
                return { 'Project #': args.projectId?.toString(), Amount: args.amount?.toString() + ' wei' }
            case 'ClaimSubmitted':
                return { 'Project #': args.projectId?.toString(), 'Milestone #': args.milestoneId?.toString() }
            case 'InspectorApproved':
                return { 'Project #': args.projectId?.toString(), 'Milestone #': args.milestoneId?.toString(), Inspector: args.inspector?.slice(0, 10) + '…' }
            case 'MilestoneApproved':
                return { 'Project #': args.projectId?.toString(), 'Milestone #': args.milestoneId?.toString() }
            case 'PaymentReleased':
                return { 'Project #': args.projectId?.toString(), 'Milestone #': args.milestoneId?.toString(), Amount: args.amount?.toString() + ' wei' }
            default:
                return {}
        }
    } catch { return {} }
}

export function AuditPanel({ contracts, provider }: { contracts: Contracts | null; provider: ethers.providers.Web3Provider | null }) {
    const [logs, setLogs] = useState<LogEntry[]>([])
    const [loading, setLoading] = useState(false)

    const fetchEvents = useCallback(async () => {
        if (!contracts || !provider) return toast.error('Connect wallet first')
        setLoading(true)
        try {
            const [
                projCreated, fundsLocked, msCreated, claimSub, inspApproved, msApproved, pmtReleased, invLogged,
            ] = await Promise.all([
                contracts.registry.queryFilter(contracts.registry.filters.ProjectCreated(), 0, 'latest'),
                contracts.vault.queryFilter(contracts.vault.filters.FundsLocked(), 0, 'latest'),
                contracts.milestone.queryFilter(contracts.milestone.filters.MilestoneCreated(), 0, 'latest'),
                contracts.milestone.queryFilter(contracts.milestone.filters.ClaimSubmitted(), 0, 'latest'),
                contracts.milestone.queryFilter(contracts.milestone.filters.InspectorApproved(), 0, 'latest'),
                contracts.milestone.queryFilter(contracts.milestone.filters.MilestoneApproved(), 0, 'latest'),
                contracts.vault.queryFilter(contracts.vault.filters.PaymentReleased(), 0, 'latest'),
                contracts.vault.queryFilter(contracts.vault.filters.InvoiceLogged(), 0, 'latest'),
            ])

            const all = [
                ...projCreated.map(e => ({ event: 'ProjectCreated', block: e.blockNumber, args: formatArgs('ProjectCreated', e.args), tx: e.transactionHash })),
                ...fundsLocked.map(e => ({ event: 'FundsLocked', block: e.blockNumber, args: formatArgs('FundsLocked', e.args), tx: e.transactionHash })),
                ...msCreated.map(e => ({ event: 'MilestoneCreated', block: e.blockNumber, args: formatArgs('MilestoneCreated', e.args), tx: e.transactionHash })),
                ...claimSub.map(e => ({ event: 'ClaimSubmitted', block: e.blockNumber, args: formatArgs('ClaimSubmitted', e.args), tx: e.transactionHash })),
                ...inspApproved.map(e => ({ event: 'InspectorApproved', block: e.blockNumber, args: formatArgs('InspectorApproved', e.args), tx: e.transactionHash })),
                ...msApproved.map(e => ({ event: 'MilestoneApproved', block: e.blockNumber, args: formatArgs('MilestoneApproved', e.args), tx: e.transactionHash })),
                ...pmtReleased.map(e => ({ event: 'PaymentReleased', block: e.blockNumber, args: formatArgs('PaymentReleased', e.args), tx: e.transactionHash })),
                ...invLogged.map(e => ({ event: 'InvoiceLogged', block: e.blockNumber, args: formatArgs('InvoiceLogged', e.args), tx: e.transactionHash })),
            ].sort((a, b) => b.block - a.block)

            setLogs(all)
            toast.success(`Loaded ${all.length} on-chain events`)
        } catch (e: any) {
            toast.error(e?.message ?? 'Failed to fetch events')
        } finally { setLoading(false) }
    }, [contracts, provider])

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-zinc-900">Audit Log</h2>
                    <p className="text-sm text-zinc-500 mt-0.5">Complete on-chain event history — immutable and publicly verifiable.</p>
                </div>
                <button
                    onClick={fetchEvents}
                    disabled={loading}
                    className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
                    {loading ? 'Loading…' : 'Fetch Events'}
                </button>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
                {logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="h-12 w-12 rounded-full bg-zinc-100 flex items-center justify-center mb-3">
                            <RefreshCw className="h-5 w-5 text-zinc-400" />
                        </div>
                        <p className="text-sm font-medium text-zinc-600">No events loaded yet</p>
                        <p className="text-xs text-zinc-400 mt-1">Click "Fetch Events" to load the full on-chain history</p>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-zinc-100 bg-zinc-50/60">
                                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Block</th>
                                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Event</th>
                                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Details</th>
                                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Tx Hash</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                            {logs.map((log, i) => (
                                <tr key={i} className="hover:bg-zinc-50/50 transition-colors">
                                    <td className="px-4 py-3 font-mono text-xs text-zinc-500">#{log.block}</td>
                                    <td className="px-4 py-3">
                                        <span className={cn(
                                            'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium',
                                            EVENT_BADGE[log.event] ?? 'bg-zinc-50 text-zinc-600 border-zinc-100'
                                        )}>
                                            {log.event}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                                            {Object.entries(log.args).map(([k, v]) => (
                                                <span key={k} className="text-xs text-zinc-600">
                                                    <span className="text-zinc-400">{k}: </span>{v}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 font-mono text-xs text-zinc-400">
                                        {log.tx.slice(0, 10)}…{log.tx.slice(-6)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    )
}
