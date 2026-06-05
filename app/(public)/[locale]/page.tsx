import { prisma } from '@/lib/prisma'
import { getAllContacts } from '@/lib/contacts'
import { resolvePublicLocale } from '@/lib/public/locale'
import { getWorkingHours, computeOpenNow } from '@/lib/public/hours'
import { getPromotionStatus } from '@/lib/promotions'

import { Hero } from '@/components/public/Hero'
import { ActivePromoBanner } from '@/components/public/ActivePromoBanner'
import { AboutSection } from '@/components/public/AboutSection'
import { MenuPreview } from '@/components/public/MenuPreview'
import { GalleryPreview } from '@/components/public/GalleryPreview'
import { ReservationCTA } from '@/components/public/ReservationCTA'
import { ContactSection } from '@/components/public/ContactSection'

type Props = { params: Promise<{ locale: string }> }

export const dynamic = 'force-dynamic'

export default async function LandingPage({ params }: Props) {
  const { locale: urlSeg } = await params
  const locale = resolvePublicLocale(urlSeg)

  const [
    contacts,
    workingHours,
    featuredImages,
    galleryPreviewImages,
    activePromotions,
    menuCategories,
  ] = await Promise.all([
    getAllContacts(),
    getWorkingHours(),
    prisma.galleryImage.findMany({
      where: { isFeatured: true, isVisible: true },
      include: { category: true },
      orderBy: { position: 'asc' },
      take: 1,
    }),
    prisma.galleryImage.findMany({
      where: { isVisible: true },
      orderBy: [{ isFeatured: 'desc' }, { position: 'asc' }],
      take: 6,
    }),
    prisma.promotion.findMany({
      where: { isActive: true, isArchived: false },
      orderBy: { startDate: 'asc' },
    }),
    prisma.menuCategory.findMany({
      where: { isVisible: true },
      include: {
        items: {
          where: { isAvailable: true, imageUrl: { not: null } },
          take: 1,
          orderBy: { position: 'asc' },
        },
      },
      orderBy: { position: 'asc' },
      take: 4,
    }),
  ])

  const heroImage = featuredImages[0] ?? null

  // Pick the first ACTIVE promotion right now
  const activePromo =
    activePromotions
      .map((p) => ({ p, status: getPromotionStatus(p) }))
      .find((x) => x.status === 'ACTIVE')?.p ?? null

  const { isOpenNow, today } = computeOpenNow(workingHours)

  return (
    <>
      <Hero locale={locale} contacts={contacts} image={heroImage} />

      {activePromo && (
        <ActivePromoBanner locale={locale} promotion={activePromo} />
      )}

      <AboutSection
        locale={locale}
        contacts={contacts}
        today={today}
        isOpenNow={isOpenNow}
      />

      {menuCategories.length > 0 && (
        <MenuPreview locale={locale} categories={menuCategories} />
      )}

      {galleryPreviewImages.length > 0 && (
        <GalleryPreview locale={locale} images={galleryPreviewImages} />
      )}

      <ReservationCTA locale={locale} contacts={contacts} />

      <ContactSection
        locale={locale}
        contacts={contacts}
        workingHours={workingHours}
        isOpenNow={isOpenNow}
      />
    </>
  )
}
