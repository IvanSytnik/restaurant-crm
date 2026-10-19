/**
 * Placeholder contacts stored when a guest gave none: `<phone>@phone.local`
 * from the admin form, `walkin@phone.local` and phone '-' for walk-ins.
 * They satisfy the NOT NULL columns but are never shown or emailed.
 */
export function isRealGuestEmail(email: string | null | undefined): boolean {
  if (!email) return false
  if (!email.includes('@')) return false
  if (email.endsWith('@phone.local')) return false
  if (email.endsWith('@walkin.local')) return false
  return true
}

export function isRealGuestPhone(phone: string | null | undefined): boolean {
  return !!phone && phone.trim() !== '' && phone.trim() !== '-'
}
