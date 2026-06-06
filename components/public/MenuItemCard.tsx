import { getTranslations } from 'next-intl/server'
import { type Locale } from '@/i18n/config'
import { pickName, pickDescription, pickLabel } from '@/lib/menu/i18n'
import type { AllergenKey } from '@/lib/menu/allergens'
import { formatPrice } from '@/lib/format'
import { AllergenBadges } from './AllergenBadges'

type Variant = {
  id: string
  labelDE: string
  labelEN: string | null
  labelUK: string | null
  price: unknown // Prisma Decimal
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

type Props = {
  item: Item
  locale: Locale
}

export async function MenuItemCard({ item, locale }: Props) {
  const t = await getTranslations({ locale, namespace: 'public.menuPage' })

  const name = pickName({ nameDE: item.nameDE, nameEN: item.nameEN, nameUK: item.nameUK }, locale)
  const description = pickDescription(
    { descriptionDE: item.descriptionDE, descriptionEN: item.descriptionEN, descriptionUK: item.descriptionUK },
    locale
  )

  const hasImage = !!item.imageUrl
  const hasVariants = item.variants.length > 0

  return (
    <article className="grid grid-cols-12 gap-5 py-7 border-b border-[var(--border)] last:border-b-0">
      {hasImage && (
        <div className="col-span-12 sm:col-span-3">
          <div className="aspect-[4/3] overflow-hidden bg-cream-soft">
            <img
              src={item.imageUrl as string}
              alt={name}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        </div>
      )}

      <div className={hasImage ? 'col-span-12 sm:col-span-9' : 'col-span-12'}>
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-xl sm:text-2xl text-ink leading-snug">
              {name}
              {item.allergens.length > 0 && (
                <span className="ml-2 align-middle">
                  <AllergenBadges allergens={item.allergens} />
                </span>
              )}
            </h3>
            {description && (
              <p className="mt-2 text-sm sm:text-[15px] text-ink-soft leading-relaxed">
                {description}
              </p>
            )}

            {/* Tags */}
            {(item.isVegetarian || item.isVegan || item.spicyLevel > 0) && (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] tracking-widest uppercase">
                {item.isVegan ? (
                  <span className="px-2 py-0.5 border border-[var(--border)] text-ink-soft">
                    {t('tagVegan')}
                  </span>
                ) : item.isVegetarian ? (
                  <span className="px-2 py-0.5 border border-[var(--border)] text-ink-soft">
                    {t('tagVegetarian')}
                  </span>
                ) : null}
                {item.spicyLevel > 0 && (
                  <span className="px-2 py-0.5 border border-[var(--border)] text-ink-soft">
                    {'🌶'.repeat(item.spicyLevel)}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Price block */}
          <div className="shrink-0 text-right">
            {!hasVariants && item.price != null && (
              <div className="font-display text-xl text-ink whitespace-nowrap">
                {formatPrice(item.price, locale)}
              </div>
            )}
            {hasVariants && (
              <ul className="space-y-1 text-sm">
                {item.variants.map((v) => (
                  <li key={v.id} className="flex items-center justify-end gap-3 whitespace-nowrap">
                    <span className="text-ink-soft">
                      {pickLabel({ labelDE: v.labelDE, labelEN: v.labelEN, labelUK: v.labelUK }, locale)}
                    </span>
                    <span className="font-display text-base text-ink">
                      {formatPrice(v.price, locale)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}
