import type { PromotionStatus } from '@/lib/promotions'

type Props = {
  status: PromotionStatus
  labelActive: string
  labelScheduled: string
  labelExpired: string
}

export function PromotionStatusBadge({ status, labelActive, labelScheduled, labelExpired }: Props) {
  if (status === 'ACTIVE') {
    return (
      <span className="inline-flex items-center gap-2 px-3 py-1 text-[10px] tracking-widest uppercase bg-accent text-cream">
        <span className="h-1.5 w-1.5 rounded-full bg-cream animate-pulse" />
        {labelActive}
      </span>
    )
  }
  if (status === 'SCHEDULED') {
    return (
      <span className="inline-flex items-center px-3 py-1 text-[10px] tracking-widest uppercase border border-[var(--border)] text-ink-soft">
        {labelScheduled}
      </span>
    )
  }
  if (status === 'EXPIRED') {
    return (
      <span className="inline-flex items-center px-3 py-1 text-[10px] tracking-widest uppercase text-ink-soft/60">
        {labelExpired}
      </span>
    )
  }
  return null
}
