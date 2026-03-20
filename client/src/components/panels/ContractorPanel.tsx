import { useState } from 'react'
import { ethers } from 'ethers'
import { Loader2, Upload, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { HashPreview } from '@/components/shared/HashPreview'
import type { Contracts } from '@/lib/contracts'

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
    return (
        <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">{label}</label>
            <input {...props} className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-colors" />
        </div>
    )
}

export function ContractorPanel({ contracts }: { contracts: Contracts | null }) {
    const [claimText, setClaimText] = useState('')
    const [projectId, setProjectId] = useState('')
    const [milestoneId, setMilestoneId] = useState('')
    const [loading, setLoading] = useState(false)

    const hash = claimText ? ethers.utils.keccak256(ethers.utils.toUtf8Bytes(claimText)) : ''

    const submitClaim = async () => {
        if (!contracts) return toast.error('Connect wallet first')
        if (!hash) return toast.error('Enter claim evidence text first')
        setLoading(true)
        try {
            const tx = await contracts.milestone.submitClaim(
                parseInt(projectId),
                parseInt(milestoneId),
                hash,
            )
            await tx.wait()
            toast.success('Claim submitted!', { description: 'Milestone is now UNDER REVIEW' })
        } catch (e: any) {
            toast.error(e?.reason ?? e?.message ?? 'Transaction failed')
        } finally { setLoading(false) }
    }

    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-lg font-semibold text-zinc-900">Contractor Panel</h2>
                <p className="text-sm text-zinc-500 mt-0.5">Submit work completion claims with cryptographic evidence.</p>
            </div>

            {/* Evidence Hasher */}
            <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-zinc-100">
                    <h3 className="text-sm font-semibold text-zinc-900">Evidence Document Hasher</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">Paste any text (IPFS CID, report content) — the keccak256 hash is stored on-chain as tamper-proof evidence</p>
                </div>
                <div className="px-5 py-4 space-y-3">
                    <div>
                        <label className="block text-xs font-medium text-zinc-500 mb-1">Claim Evidence Content</label>
                        <textarea
                            rows={4}
                            value={claimText}
                            onChange={e => setClaimText(e.target.value)}
                            placeholder="Paste IPFS CID, inspection report, or any evidence content…"
                            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 resize-none"
                        />
                    </div>
                    {hash && (
                        <div className="flex items-start gap-3 rounded-lg bg-indigo-50 border border-indigo-100 px-4 py-3">
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-semibold text-indigo-500 uppercase tracking-wider mb-1">keccak256 Hash — copy this below</p>
                                <p className="font-mono text-xs text-indigo-800 break-all">{hash}</p>
                            </div>
                            <button
                                onClick={() => { navigator.clipboard.writeText(hash); toast.success('Hash copied!') }}
                                className="mt-0.5 flex-shrink-0 rounded-md p-1 hover:bg-indigo-100 transition-colors"
                            >
                                <Copy className="h-3.5 w-3.5 text-indigo-500" />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Submit Claim */}
            <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-zinc-100">
                    <h3 className="text-sm font-semibold text-zinc-900">Submit Milestone Claim</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">Send the evidence hash on-chain to move the milestone to UNDER REVIEW</p>
                </div>
                <div className="px-5 py-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Project ID" type="number" placeholder="1" value={projectId} onChange={e => setProjectId(e.target.value)} className="" />
                        <Field label="Milestone ID" type="number" placeholder="1" value={milestoneId} onChange={e => setMilestoneId(e.target.value)} className="" />
                    </div>
                    {hash && (
                        <div>
                            <label className="block text-xs font-medium text-zinc-500 mb-1">Evidence Hash (auto-filled)</label>
                            <div className="rounded-lg bg-zinc-50 border border-zinc-200 px-3 py-2 font-mono text-xs text-zinc-600 break-all">{hash}</div>
                        </div>
                    )}
                    <button
                        onClick={submitClaim}
                        disabled={loading || !hash}
                        className={cn(
                            'flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm',
                            'hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                        )}
                    >
                        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                        Submit Claim
                    </button>
                </div>
            </div>
        </div>
    )
}
