import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { getTranslations } from 'next-intl/server'
import { authOptions } from '@/lib/auth'
import { ProtectedAdminPage } from '@/components/admin/ProtectedAdminPage'
import { ComingSoon } from '@/components/admin/ComingSoon'
import { analyticsIcon } from '@/components/admin/AdminShell'

export const dynamic = 'force-dynamic'

export default async function AnalyticsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/admin/login')
  // Same audience as the sidebar entry and the middleware matcher.
  if (session.user.role === 'STAFF') redirect('/admin/reservations')

  const t = await getTranslations('comingSoon')

  return (
    <ProtectedAdminPage>
      <ComingSoon
        icon={analyticsIcon}
        title={t('title')}
        subtitle={t('subtitle')}
        metrics={[t('metric1'), t('metric2'), t('metric3'), t('metric4')]}
      />
    </ProtectedAdminPage>
  )
}
