import { ethers } from 'ethers'
import { useState } from 'react'
import { cn } from '@/lib/utils'

export function HashPreview({ label = 'Document / evidence text' }: { label?: string }) {
    const [text, setText] = useState('')
    const hash = text ? ethers.utils.keccak256(ethers.utils.toUtf8Bytes(text)) : ''

    return (
        <div className="space-y-2">
            <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wide">{label}</label>
            <textarea
                rows={3}
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Paste or type any text — the keccak256 hash updates live"
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 resize-none"
            />
            {hash && (
                <div className="rounded-lg bg-zinc-50 border border-zinc-100 px-3 py-2">
                    <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-1">Keccak256 Hash</p>
                    <p className="font-mono text-xs text-zinc-700 break-all select-all">{hash}</p>
                </div>
            )}
        </div>
    )
}
