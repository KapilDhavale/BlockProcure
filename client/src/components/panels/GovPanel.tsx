import { useState } from 'react'
import { ethers } from 'ethers'
import { Loader2, Plus, Lock, Milestone } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { Contracts } from '@/lib/contracts'

function Card({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
    return (
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-100">
                <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
                <p className="text-xs text-zinc-500 mt-0.5">{desc}</p>
            </div>
            <div className="px-5 py-4 space-y-3">{children}</div>
        </div>
    )
}

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
    return (
        <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">{label}</label>
            <input
                {...props}
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-colors"
            />
        </div>
    )
}

function Btn({ loading, children, ...props }: { loading?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            {...props}
            disabled={props.disabled || loading}
            className={cn(
                'flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm',
                'hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
            )}
        >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {children}
        </button>
    )
}

export function GovPanel({ contracts }: { contracts: Contracts | null }) {
    const [proj, setProj] = useState({ name: '', budget: '', contractor: '', inspector1: '', inspector2: '', required: '2' })
    const [lock, setLock] = useState({ projectId: '', amount: '' })
    const [ms, setMs] = useState({ projectId: '', description: '', amount: '' })
    const [loading, setLoading] = useState<string | null>(null)

    const createProject = async () => {
        if (!contracts) return toast.error('Connect wallet first')
        setLoading('project')
        try {
            const tx = await contracts.registry.createProject(
                proj.name,
                ethers.utils.parseEther(proj.budget || '0'),
                proj.contractor.trim().toLowerCase(),
                [proj.inspector1.trim().toLowerCase(), proj.inspector2.trim().toLowerCase()],
                parseInt(proj.required || '2'),
            )
            const receipt = await tx.wait()
            const event = receipt.events?.find((e: any) => e.event === 'ProjectCreated')
            const id = event?.args?.projectId?.toString() ?? '?'
            toast.success(`Project #${id} created!`, { description: `Tx: ${receipt.transactionHash.slice(0, 18)}…` })
        } catch (e: any) {
            toast.error(e?.reason ?? e?.message ?? 'Transaction failed')
        } finally { setLoading(null) }
    }

    const lockFunds = async () => {
        if (!contracts) return toast.error('Connect wallet first')
        setLoading('lock')
        try {
            const tx = await contracts.vault.lockFunds(parseInt(lock.projectId), {
                value: ethers.utils.parseEther(lock.amount || '0'),
            })
            await tx.wait()
            toast.success(`Locked ${lock.amount} ETH in Vault for Project #${lock.projectId}`)
        } catch (e: any) {
            toast.error(e?.reason ?? e?.message ?? 'Failed')
        } finally { setLoading(null) }
    }

    const createMilestone = async () => {
        if (!contracts) return toast.error('Connect wallet first')
        setLoading('milestone')
        try {
            const tx = await contracts.milestone.createMilestone(
                parseInt(ms.projectId),
                ms.description,
                ethers.utils.parseEther(ms.amount || '0'),
            )
            await tx.wait()
            toast.success(`Milestone created for Project #${ms.projectId}`)
        } catch (e: any) {
            toast.error(e?.reason ?? e?.message ?? 'Failed')
        } finally { setLoading(null) }
    }

    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-lg font-semibold text-zinc-900">Government Panel</h2>
                <p className="text-sm text-zinc-500 mt-0.5">Create and fund infrastructure projects, define milestones.</p>
            </div>

            <Card title="Create Project" desc="Register a new procurement project on-chain">
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Project Name" placeholder="Phase 1: Flyover Road" value={proj.name} onChange={e => setProj({ ...proj, name: e.target.value })} className="" />
                    <Field label="Total Budget (ETH)" type="number" placeholder="1.0" value={proj.budget} onChange={e => setProj({ ...proj, budget: e.target.value })} className="" />
                    <Field label="Contractor Address" placeholder="0x…" value={proj.contractor} onChange={e => setProj({ ...proj, contractor: e.target.value })} className="" />
                    <Field label="Required Approvals" type="number" placeholder="2" value={proj.required} onChange={e => setProj({ ...proj, required: e.target.value })} className="" />
                    <Field label="Inspector 1 Address" placeholder="0x…" value={proj.inspector1} onChange={e => setProj({ ...proj, inspector1: e.target.value })} className="" />
                    <Field label="Inspector 2 Address" placeholder="0x…" value={proj.inspector2} onChange={e => setProj({ ...proj, inspector2: e.target.value })} className="" />
                </div>
                <Btn loading={loading === 'project'} onClick={createProject}><Plus className="h-3.5 w-3.5" /> Create Project</Btn>
            </Card>

            <div className="grid grid-cols-2 gap-4">
                <Card title="Lock Funds" desc="Deposit MATIC into the payment vault">
                    <Field label="Project ID" type="number" placeholder="1" value={lock.projectId} onChange={e => setLock({ ...lock, projectId: e.target.value })} className="" />
                    <Field label="Amount (ETH)" type="number" placeholder="1.0" value={lock.amount} onChange={e => setLock({ ...lock, amount: e.target.value })} className="" />
                    <Btn loading={loading === 'lock'} onClick={lockFunds}><Lock className="h-3.5 w-3.5" /> Lock Funds</Btn>
                </Card>

                <Card title="Create Milestone" desc="Define a payable work milestone">
                    <Field label="Project ID" type="number" placeholder="1" value={ms.projectId} onChange={e => setMs({ ...ms, projectId: e.target.value })} className="" />
                    <Field label="Description" placeholder="Bridge Foundation" value={ms.description} onChange={e => setMs({ ...ms, description: e.target.value })} className="" />
                    <Field label="Milestone Budget (ETH)" type="number" placeholder="0.5" value={ms.amount} onChange={e => setMs({ ...ms, amount: e.target.value })} className="" />
                    <Btn loading={loading === 'milestone'} onClick={createMilestone}><Milestone className="h-3.5 w-3.5" /> Create Milestone</Btn>
                </Card>

                <Card title="Release Payment" desc="Final payout for an approved milestone">
                    <div className="flex gap-2">
                        <Field label="P-ID" type="number" placeholder="1" value={ms.projectId} onChange={e => setMs({ ...ms, projectId: e.target.value })} className="w-20" />
                        <Field label="M-ID" type="number" placeholder="1" value={ms.amount} onChange={e => setMs({ ...ms, amount: e.target.value })} className="flex-1" />
                    </div>
                    <Btn loading={loading === 'release'} onClick={async () => {
                        if (!contracts) return toast.error('Connect wallet first')
                        setLoading('release')
                        try {
                            const tx = await contracts.vault.release(Number(ms.projectId), Number(ms.amount))
                            await tx.wait()
                            toast.success('Money released to contractor! ✅')
                        } catch (e: any) {
                            toast.error(e?.reason ?? 'Check if milestone is APPROVED')
                        } finally { setLoading(null) }
                    }}><Plus className="h-3.5 w-3.5 rotate-45" /> Send Funds</Btn>
                </Card>
            </div>
        </div>
    )
}
