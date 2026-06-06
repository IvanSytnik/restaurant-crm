import { type Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { prisma } from '@/lib/prisma'
import { resolvePublicLocale } from '@/lib/public/locale'
import { getPromotionStatus } from '@/lib/promotions'
import { PageHero } from '@/components/public/PageHero'
import { PromotionCard } from '@/components/public/PromotionCard'

export const dynamic = 'force-dynamic'

type Params = { locale: string }

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale: urlSeg } = await params
  const locale = resolvePublicLocale(urlSeg)
  const t = await getTranslations({ locale, namespace: 'public.promotionsPage' })
  return { title: t('title') }
}

export default async function PromotionsPage({ params }: { params: Promise<Params> }) {
  const { locale: urlSeg } = await params
  const locale = resolvePublicLocale(urlSeg)
  const t = await getTranslations({ locale, namespace: 'public.promotionsPage' })
  const tStatus = await getTranslations({ locale, namespace: 'public.promotionsPage.status' })

  const all = await prisma.promotion.findMany({
    where: { isActive: true, isArchived: false },
    orderBy: { startDate: 'asc' },
  })

  // Show only ACTIVE and SCHEDULED, hide EXPIRED.
  const visible = all
    .map((p) => ({ p, status: getPromotionStatus(p) }))
    .filter((x) => x.status === 'ACTIVE' || x.status === 'SCHEDULED')

  // Sort: ACTIVE first, then SCHEDULED
  visible.sort((a, b) => {
    if (a.status === b.status) return 0
    return a.status === 'ACTIVE' ? -1 : 1
  })

  const labels = {
    active: tStatus('ACTIVE'),
    scheduled: tStatus('SCHEDULED'),
    expired: tStatus('EXPIRED'),
    readMore: t('readMore'),
  }

  return (
    <>
      <PageHero eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')} />

      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16 lg:py-24">
        {visible.length === 0 ? (
          <p className="text-center text-ink-soft py-12">{t('empty')}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {visible.map(({ p }) => (
              <PromotionCard key={p.id} promo={p} locale={locale} labels={labels} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
