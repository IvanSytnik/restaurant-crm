import { redirect } from 'next/navigation'

// `/admin` has no dashboard of its own — send visitors to the default
// landing screen. Auth is enforced by middleware and by ProtectedAdminPage
// on the target page, so this redirect needs no session check.
export default function AdminIndexPage() {
  redirect('/admin/reservations')
}
