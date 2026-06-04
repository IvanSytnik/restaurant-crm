import { prisma } from '@/lib/prisma'

/**
 * Known contact keys used across the app.
 * The Contact model is a key/value store — but the set of keys is fixed
 * so we can render footers, headers and email templates predictably.
 */
export const CONTACT_KEYS = [
  // Branding
  'name_de', 'name_en', 'name_uk',
  'tagline_de', 'tagline_en', 'tagline_uk',
  'description_de', 'description_en', 'description_uk',

  // Address / public contacts
  'address', 'city', 'postal_code', 'country',
  'phone', 'email',
  'instagram', 'facebook', 'maps_url',

  // Legal — Impressum (§ 5 ECG, § 24 MedienG)
  'legal_company_name',
  'legal_address',
  'legal_owner_name',
  'legal_firmenbuch',
  'legal_firmenbuch_court',
  'legal_uid',
  'legal_gewerbe',
  'legal_chamber',
  'legal_supervising_authority',

  // Legal — DSGVO / Datenschutz
  'dpo_name',
  'dpo_contact',
  'privacy_text_de',
  'privacy_text_en',
  'privacy_text_uk',
  'impressum_text_de',
  'impressum_text_en',
  'impressum_text_uk',
] as const

export type ContactKey = (typeof CONTACT_KEYS)[number]

export type ContactsMap = Partial<Record<ContactKey, string>>

export async function getAllContacts(): Promise<ContactsMap> {
  const rows = await prisma.contact.findMany({
    where: { key: { in: [...CONTACT_KEYS] } },
    select: { key: true, value: true },
  })

  const map: ContactsMap = {}
  for (const row of rows) {
    map[row.key as ContactKey] = row.value
  }
  return map
}

export async function getContact(key: ContactKey): Promise<string | null> {
  const row = await prisma.contact.findUnique({ where: { key } })
  return row?.value ?? null
}

/**
 * Generates a fallback Impressum text in German if no custom text was set.
 * Real launch should use a vetted text from WKO/eRecht24 in `impressum_text_*`.
 */
export function renderImpressum(c: ContactsMap, locale: 'de' | 'en' | 'uk' = 'de'): string {
  const custom =
    locale === 'de' ? c.impressum_text_de :
    locale === 'en' ? c.impressum_text_en :
    c.impressum_text_uk
  if (custom?.trim()) return custom

  // Auto-generated fallback (DE)
  const lines: string[] = []
  if (c.legal_company_name) lines.push(c.legal_company_name)
  if (c.legal_owner_name) lines.push(`Inhaber: ${c.legal_owner_name}`)
  if (c.legal_address) lines.push(c.legal_address)
  if (c.phone) lines.push(`Tel.: ${c.phone}`)
  if (c.email) lines.push(`E-Mail: ${c.email}`)
  if (c.legal_firmenbuch || c.legal_firmenbuch_court) {
    lines.push('')
    if (c.legal_firmenbuch) lines.push(`Firmenbuchnummer: ${c.legal_firmenbuch}`)
    if (c.legal_firmenbuch_court) lines.push(`Firmenbuchgericht: ${c.legal_firmenbuch_court}`)
  }
  if (c.legal_uid) lines.push(`UID-Nummer: ${c.legal_uid}`)
  if (c.legal_gewerbe) lines.push(`Gewerbe: ${c.legal_gewerbe}`)
  if (c.legal_chamber) lines.push(`Mitglied der: ${c.legal_chamber}`)
  if (c.legal_supervising_authority) {
    lines.push(`Aufsichtsbehörde: ${c.legal_supervising_authority}`)
  }
  if (c.dpo_contact) {
    lines.push('')
    lines.push(`Datenschutz-Anfragen: ${c.dpo_contact}`)
  }

  return lines.join('\n')
}
