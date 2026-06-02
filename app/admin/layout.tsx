import { AuthProvider } from '@/components/AuthProvider'

// Этот layout — провайдер сессии для всех страниц admin.
// Защита и оформление через ProtectedAdminPage в каждой странице.
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AuthProvider>{children}</AuthProvider>
}
