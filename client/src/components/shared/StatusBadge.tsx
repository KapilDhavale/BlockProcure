import { cn } from '@/lib/utils'

type BadgeVariant = 'pending' | 'review' | 'approved' | 'paid'

const stateMap: Record<number, { label: string; variant: BadgeVariant }> = {
    0: { label: 'Pending', variant: 'pending' },
    1: { label: 'Under Review', variant: 'review' },
    2: { label: 'Approved', variant: 'approved' },
    3: { label: 'Paid', variant: 'paid' },
}

const variantStyles: Record<BadgeVariant, string> = {
    pending: 'bg-zinc-100 text-zinc-600 border-zinc-200',
    review: 'bg-amber-50 text-amber-700 border-amber-200',
    approved: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
}

export function StatusBadge({ state }: { state: number }) {
    const { label, variant } = stateMap[state] ?? { label: 'Unknown', variant: 'pending' as BadgeVariant }
    return (
        <span className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-wide',
            variantStyles[variant]
        )}>
            <span className={cn('h-1.5 w-1.5 rounded-full', {
                'bg-zinc-400': variant === 'pending',
                'bg-amber-500': variant === 'review',
                'bg-indigo-600': variant === 'approved',
                'bg-emerald-600': variant === 'paid',
            })} />
            {label}
        </span>
    )
}
