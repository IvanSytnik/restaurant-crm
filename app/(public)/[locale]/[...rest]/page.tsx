import { notFound } from 'next/navigation'

// Unknown paths under a valid locale (/de/foo) render the localized
// not-found.tsx inside the public layout instead of Next's bare default 404.
export default function UnknownPublicPath() {
  notFound()
}
