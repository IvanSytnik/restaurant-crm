import type { PromotionStatus } from '@/lib/promotions'

type Props = {
  status: PromotionStatus
  /** Valid at this moment: in range and on its weekdays/hours (isPromotionLiveNow). */
  live: boolean
  labelLive: string
  labelActive: string
  labelScheduled: string
  labelExpired: string
}

export function PromotionStatusBadge({ status, live, labelLive, labelActive, labelScheduled, labelExpired }: Props) {
  if (status === 'ACTIVE' && live) {
    return (
      <span className="inline-flex items-center gap-2 px-3 py-1 text-[10px] tracking-widest uppercase bg-accent text-cream">
        <span className="h-1.5 w-1.5 rounded-full bg-cream animate-pulse" />
        {labelLive}
      </span>
    )
  }
  if (status === 'ACTIVE') {
    // In its date range, but not on this weekday/hour (e.g. a lunch offer in the evening)
    return (
      <span className="inline-flex items-center px-3 py-1 text-[10px] tracking-widest uppercase border border-accent text-ink">
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
