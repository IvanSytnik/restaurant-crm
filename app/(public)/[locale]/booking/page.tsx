import { type Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { resolvePublicLocale } from '@/lib/public/locale'
import { getBookingSettings } from '@/lib/booking/settings'
import { PageHero } from '@/components/public/PageHero'
import { PublicBookingForm } from '@/components/public/PublicBookingForm'

export const dynamic = 'force-dynamic'

type Params = { locale: string }

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale: urlSeg } = await params
  const locale = resolvePublicLocale(urlSeg)
  const t = await getTranslations({ locale, namespace: 'public.booking' })
  return { title: t('title') }
}

export default async function BookingPage({ params }: { params: Promise<Params> }) {
  const { locale: urlSeg } = await params
  const locale = resolvePublicLocale(urlSeg)
  const t = await getTranslations({ locale, namespace: 'public.booking' })

  const settings = await getBookingSettings()

  return (
    <>
      <PageHero eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')} />

      <div className="max-w-3xl mx-auto px-6 lg:px-12 py-16 lg:py-20">
        <PublicBookingForm
          locale={locale}
          minGuests={settings.min_guests}
          maxGuests={settings.max_guests}
          bookingHorizon={settings.booking_horizon}
        />
      </div>
    </>
  )
}
