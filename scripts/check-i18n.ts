/**
 * Fails (exit 1) when messages/{de,en,uk}.json disagree:
 *  - a key exists in one locale but not in another
 *  - a value is empty or not a string
 *  - a message uses different {placeholders} than the same key in German
 *
 *   npm run check:i18n
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const LOCALES = ['de', 'en', 'uk'] as const
const REFERENCE = 'de'

type Messages = { [key: string]: string | Messages }

function flatten(obj: Messages, prefix = ''): Map<string, unknown> {
  const out = new Map<string, unknown>()
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object') {
      for (const [k, v] of flatten(value, path)) out.set(k, v)
    } else {
      out.set(path, value)
    }
  }
  return out
}

/** Argument names used in an ICU message, e.g. {name} or {count, plural, …}. */
function placeholders(message: string): string[] {
  return [...new Set([...message.matchAll(/\{\s*([A-Za-z_]\w*)/g)].map((m) => m[1]))].sort()
}

const files = Object.fromEntries(
  LOCALES.map((locale) => {
    const path = join(process.cwd(), 'messages', `${locale}.json`)
    return [locale, flatten(JSON.parse(readFileSync(path, 'utf8')) as Messages)]
  })
) as Record<(typeof LOCALES)[number], Map<string, unknown>>

const problems: string[] = []
const allKeys = new Set(LOCALES.flatMap((l) => [...files[l].keys()]))

for (const key of [...allKeys].sort()) {
  for (const locale of LOCALES) {
    const value = files[locale].get(key)
    if (value === undefined) {
      problems.push(`missing   ${locale}: ${key}`)
    } else if (typeof value !== 'string' || value.trim() === '') {
      problems.push(`empty     ${locale}: ${key}`)
    }
  }

  const ref = files[REFERENCE].get(key)
  if (typeof ref !== 'string') continue
  const expected = placeholders(ref).join(',')
  for (const locale of LOCALES) {
    const value = files[locale].get(key)
    if (typeof value === 'string' && placeholders(value).join(',') !== expected) {
      problems.push(
        `params    ${locale}: ${key} uses {${placeholders(value).join(', ')}}, ${REFERENCE} uses {${expected.replace(/,/g, ', ')}}`
      )
    }
  }
}

if (problems.length > 0) {
  console.error(`i18n check failed (${problems.length} problem${problems.length === 1 ? '' : 's'}):`)
  for (const p of problems) console.error(`  ${p}`)
  process.exit(1)
}
console.log(`i18n OK: ${allKeys.size} keys in ${LOCALES.join(', ')}`)
