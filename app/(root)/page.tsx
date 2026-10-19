import { redirect } from 'next/navigation'
import { publicDefaultLocale, localeToUrl } from '@/i18n/config'

export default function HomePage() {
  // Root → public site in the default public locale.
  // Admin is reachable directly via /admin/login.
  redirect(`/${localeToUrl[publicDefaultLocale]}`)
}