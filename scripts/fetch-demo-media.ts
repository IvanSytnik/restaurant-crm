/**
 * Picks demo photos through the official Unsplash API and writes
 *   prisma/demo-media.json   — image URLs used by prisma/seed-demo.ts
 *   docs/media/CREDITS.md    — photographer attribution
 *
 *   UNSPLASH_ACCESS_KEY=… npx tsx --env-file-if-exists=.env scripts/fetch-demo-media.ts
 *
 * Follows the Unsplash API guidelines: images are hotlinked from the returned
 * URLs, each chosen photo's download endpoint is triggered once, and
 * attribution links carry utm parameters. The key is only read from the
 * environment and never written anywhere.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const KEY = process.env.UNSPLASH_ACCESS_KEY
if (!KEY) {
  console.error('UNSPLASH_ACCESS_KEY is not set.')
  process.exit(1)
}

const APP = 'restaurant-crm-demo'
const UTM = `utm_source=${APP}&utm_medium=referral`

// key → search query; `pick` selects another result when the first one does
// not fit (chosen by looking at the candidates, see --list).
const PHOTOS: { key: string; query: string; pick?: number }[] = [
  { key: 'room-1', query: 'rustic wooden restaurant interior' },
  { key: 'room-2', query: 'restaurant table set candle evening' },
  { key: 'room-3', query: 'wooden bar counter pub' },
  { key: 'garden-1', query: 'beer garden trees tables' },
  { key: 'garden-2', query: 'outdoor restaurant string lights evening' },
  { key: 'food-schnitzel', query: 'wiener schnitzel' },
  { key: 'food-goulash', query: 'beef goulash' },
  { key: 'food-strudel', query: 'apple strudel' },
  { key: 'food-kaiserschmarrn', query: 'kaiserschmarrn' },
  { key: 'food-salad', query: 'fried chicken salad' },
  { key: 'food-soup', query: 'soup bowl rustic' },
  { key: 'food-spaetzle', query: 'spaetzle cheese' },
  { key: 'drink-wine', query: 'white wine glass' },
]

type Photo = {
  id: string
  alt_description: string | null
  urls: { raw: string }
  links: { html: string; download_location: string }
  user: { name: string; links: { html: string } }
}

async function api<T>(path: string): Promise<T> {
  const res = await fetch(`https://api.unsplash.com${path}`, {
    headers: { Authorization: `Client-ID ${KEY}`, 'Accept-Version': 'v1' },
  })
  if (!res.ok) throw new Error(`Unsplash ${res.status} for ${path}`)
  return res.json() as Promise<T>
}

async function search(query: string): Promise<Photo[]> {
  const q = encodeURIComponent(query)
  const data = await api<{ results: Photo[] }>(
    `/search/photos?query=${q}&per_page=6&orientation=landscape&content_filter=high`
  )
  return data.results
}

async function main() {
  const listOnly = process.argv.includes('--list')
  const chosen: { key: string; photo: Photo }[] = []

  for (const p of PHOTOS) {
    const results = await search(p.query)
    if (listOnly) {
      console.log(`\n${p.key} — "${p.query}"`)
      results.forEach((r, i) =>
        console.log(`  [${i}] ${r.user.name}: ${r.alt_description ?? ''}  ${r.urls.raw}&w=400`)
      )
      continue
    }
    const photo = results[p.pick ?? 0]
    if (!photo) throw new Error(`No result for ${p.key}`)
    chosen.push({ key: p.key, photo })
  }
  if (listOnly) return

  // Required by the API guidelines when a photo is used.
  for (const { photo } of chosen) {
    await api(photo.links.download_location.replace('https://api.unsplash.com', ''))
  }

  const images = chosen.map(({ key, photo }) => ({
    key,
    url: `${photo.urls.raw}&w=1600&q=75&fm=jpg&fit=crop`,
    unsplashId: photo.id,
  }))
  writeFileSync(
    join(process.cwd(), 'prisma', 'demo-media.json'),
    JSON.stringify({ source: 'Unsplash (https://unsplash.com/license)', images }, null, 2) + '\n'
  )

  const rows = chosen.map(
    ({ key, photo }) =>
      `| \`${key}\` | [${photo.alt_description ?? 'Photo'}](${photo.links.html}?${UTM}) | [${photo.user.name}](${photo.user.links.html}?${UTM}) |`
  )
  mkdirSync(join(process.cwd(), 'docs', 'media'), { recursive: true })
  writeFileSync(
    join(process.cwd(), 'docs', 'media', 'CREDITS.md'),
    [
      '# Photo credits',
      '',
      'The demo data (`npm run seed:demo`) and the screenshots in this folder use photos from',
      '[Unsplash](https://unsplash.com/?' + UTM + '), published under the',
      '[Unsplash License](https://unsplash.com/license). They are hotlinked from Unsplash and are',
      'not part of this repository. "Gasthaus Lindenhof" is fictional; the photos do not show it.',
      '',
      '| Key | Photo | Photographer |',
      '|---|---|---|',
      ...rows,
      '',
    ].join('\n')
  )
  console.log(`Wrote ${images.length} images to prisma/demo-media.json and docs/media/CREDITS.md`)
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
