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

// Chosen by hand from search results for one consistent look: warm light,
// wood, Austrian dishes, a Gastgarten. Run with --search "<query>" to browse
// candidates for a replacement.
const PHOTOS: { key: string; id: string; caption: string }[] = [
  { key: 'room-1', id: 'vFMwtzHpF-o', caption: 'Wood-panelled dining room' },
  { key: 'room-2', id: '9vqDpwaBPQ8', caption: 'Candle-lit table by the window' },
  { key: 'room-3', id: 'bLmtwYoTB5s', caption: 'Wooden bar counter' },
  { key: 'garden-1', id: '0TBo6_E4tKM', caption: 'Garden benches under trees' },
  { key: 'garden-2', id: 'Bp_4Emcjxjs', caption: 'Garden at night' },
  { key: 'food-schnitzel', id: 'MyfbM2QYF4o', caption: 'Schnitzel with potatoes and lingonberries' },
  { key: 'food-goulash', id: 'nMMbu34xFiM', caption: 'Goulash' },
  { key: 'food-strudel', id: 'bDeZFhF7OTw', caption: 'Apple strudel with whipped cream' },
  { key: 'food-kaiserschmarrn', id: 'bf5BAUO3q2c', caption: 'Kaiserschmarrn' },
  { key: 'food-salad', id: '6RIpqidEOTc', caption: 'Leaf salad' },
  { key: 'food-soup', id: 'Vuc8cRavyl4', caption: 'Cream soup on a wooden table' },
  { key: 'food-spaetzle', id: 'paG5Z3cy7xM', caption: 'Fresh spätzle' },
  { key: 'drink-wine', id: 'l9Njs0Q3qK0', caption: 'Glass of white wine' },
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

async function main() {
  const searchIdx = process.argv.indexOf('--search')
  if (searchIdx !== -1) {
    const q = encodeURIComponent(process.argv[searchIdx + 1] ?? '')
    const data = await api<{ results: Photo[] }>(
      `/search/photos?query=${q}&per_page=12&orientation=landscape&content_filter=high`
    )
    for (const r of data.results) {
      console.log(`${r.id}  ${r.user.name}: ${r.alt_description ?? ''}  ${r.urls.raw}&w=400`)
    }
    return
  }

  const chosen: { key: string; caption: string; photo: Photo }[] = []
  for (const p of PHOTOS) {
    chosen.push({ key: p.key, caption: p.caption, photo: await api<Photo>(`/photos/${p.id}`) })
  }

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
    ({ key, caption, photo }) =>
      `| \`${key}\` | [${caption}](${photo.links.html}?${UTM}) | [${photo.user.name}](${photo.user.links.html}?${UTM}) |`
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
