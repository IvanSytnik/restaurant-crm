import { getAllergenCode, type AllergenKey } from '@/lib/menu/allergens'

type Props = {
  allergens: AllergenKey[]
}

export function AllergenBadges({ allergens }: Props) {
  if (!allergens || allergens.length === 0) return null
  const codes = allergens.map((a) => getAllergenCode(a)).join(', ')
  return (
    <span className="text-[11px] uppercase tracking-wider text-ink-soft">
      ({codes})
    </span>
  )
}
