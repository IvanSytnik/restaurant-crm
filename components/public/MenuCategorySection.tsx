import { type Locale } from '@/i18n/config'
import { pickName } from '@/lib/menu/i18n'
import { MenuItemCard } from './MenuItemCard'
import type { AllergenKey } from '@/lib/menu/allergens'

type Variant = {
  id: string
  labelDE: string
  labelEN: string | null
  labelUK: string | null
  price: unknown
}

type Item = {
  id: string
  nameDE: string
  nameEN: string | null
  nameUK: string | null
  descriptionDE: string | null
  descriptionEN: string | null
  descriptionUK: string | null
  price: unknown | null
  imageUrl: string | null
  allergens: AllergenKey[]
  isVegetarian: boolean
  isVegan: boolean
  spicyLevel: number
  variants: Variant[]
}

type Category = {
  id: string
  slug: string
  nameDE: string
  nameEN: string | null
  nameUK: string | null
  items: Item[]
}

type Props = {
  category: Category
  locale: Locale
}

export function MenuCategorySection({ category, locale }: Props) {
  const name = pickName(
    { nameDE: category.nameDE, nameEN: category.nameEN, nameUK: category.nameUK },
    locale
  )

  return (
    <section id={`cat-${category.slug}`} className="scroll-mt-32 py-12 lg:py-16">
      <div className="mb-8 lg:mb-10">
        <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl text-ink tracking-tight">
          {name}
        </h2>
        <div className="mt-4 h-px w-16 bg-accent" />
      </div>

      <div className="divide-y divide-[var(--border)]">
        {category.items.map((item) => (
          <MenuItemCard key={item.id} item={item} locale={locale} />
        ))}
      </div>
    </section>
  )
}
