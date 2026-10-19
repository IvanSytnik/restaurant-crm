import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
import { AuthProvider } from '@/components/AuthProvider'
import '../globals.css'

// Every admin page is per-user and session-gated: never prerender at build
// time (several pages query the database before ProtectedAdminPage runs).
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Restaurant CRM',
  description: 'Internal booking system',
}

// Root layout of the admin app. Provides the session and the signed-in
// user's locale (resolved in i18n/request.ts), which also sets <html lang>.
// Protection and chrome are applied per page via ProtectedAdminPage.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <html lang={locale}>
      <body className="antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AuthProvider>{children}</AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
