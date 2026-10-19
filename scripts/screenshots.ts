/**
 * Captures README screenshots and the demo GIF from a running app that was
 * seeded with `npm run seed:demo`.
 *
 *   npm run build && npm start                       # in one terminal
 *   npx tsx --env-file-if-exists=.env scripts/screenshots.ts [--gif-only | --no-gif] [--admin-only]
 *
 * For a realistic evening service at any real time of day, run the seed, the
 * server and this script with the same DEMO_CLOCK (see scripts/demo-clock.cjs):
 *
 *   export DEMO_CLOCK=2026-10-20T16:40:00Z
 *   NODE_OPTIONS="--require ./scripts/demo-clock.cjs" npm run seed:demo
 *   NODE_OPTIONS="--require ./scripts/demo-clock.cjs" npx next start
 *   npx tsx --env-file-if-exists=.env scripts/screenshots.ts
 *
 * Env: BASE_URL (default http://localhost:3000), DEMO_EMAIL
 * (default owner@lindenhof.example), DEMO_PASSWORD (required).
 * Output: docs/media/*.png (palette-compressed, target < 300 KB) and
 * docs/media/demo.gif (needs ffmpeg on PATH). The GIF seats a walk-in, so it
 * runs last; re-seed afterwards for a clean state.
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright'
import sharp from 'sharp'

const BASE = process.env.BASE_URL ?? 'http://localhost:3000'
const EMAIL = process.env.DEMO_EMAIL ?? 'owner@lindenhof.example'
const PASSWORD = process.env.DEMO_PASSWORD ?? ''
const OUT = join(process.cwd(), 'docs', 'media')
const MAX_BYTES = 300 * 1024

const DEMO_CLOCK = process.env.DEMO_CLOCK

const DESKTOP = { width: 1440, height: 900 }
const MOBILE = { width: 390, height: 844 }

if (!PASSWORD) {
  console.error('DEMO_PASSWORD is not set.')
  process.exit(1)
}

/** browser.newContext() with the page clock set to DEMO_CLOCK, if given. */
async function newContext(browser: Browser, options: Parameters<Browser['newContext']>[0]) {
  const context = await browser.newContext(options)
  if (DEMO_CLOCK) await context.clock.install({ time: new Date(DEMO_CLOCK) })
  return context
}

async function settle(page: Page) {
  await page.waitForLoadState('networkidle').catch(() => {})
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(400)
}

async function save(page: Page, name: string) {
  const raw = await page.screenshot({ type: 'png' })
  let out = await sharp(raw).png({ palette: true, quality: 85, effort: 10, compressionLevel: 9 }).toBuffer()
  // Photo-heavy shots (hero images) need fewer colours and no dithering to
  // stay under the size budget; UI shots never reach these fallbacks.
  for (const opts of [{ colours: 128, dither: 1 }, { colours: 96, dither: 0 }]) {
    if (out.length <= MAX_BYTES) break
    out = await sharp(raw).png({ palette: true, quality: 60, effort: 10, compressionLevel: 9, ...opts }).toBuffer()
  }
  writeFileSync(join(OUT, `${name}.png`), out)
  const kb = Math.round(out.length / 1024)
  console.log(`${kb > 300 ? '!' : '✓'} ${name}.png ${kb} KB`)
}

async function login(context: BrowserContext) {
  const page = await context.newPage()
  await page.goto(`${BASE}/admin/login`)
  await page.fill('input[type="email"]', EMAIL)
  await page.fill('input[type="password"]', PASSWORD)
  await Promise.all([page.waitForURL('**/admin/reservations**'), page.click('button[type="submit"]')])
  await page.close()
}

async function setAdminLocale(context: BrowserContext, locale: 'de' | 'en' | 'uk') {
  const res = await context.request.post(`${BASE}/api/user/locale`, { data: { locale } })
  if (!res.ok()) throw new Error(`locale switch failed: ${res.status()}`)
}

async function adminShots(browser: Browser, device: 'desktop' | 'mobile') {
  const viewport = device === 'desktop' ? DESKTOP : MOBILE
  const context = await newContext(browser, {
    viewport,
    deviceScaleFactor: device === 'desktop' ? 1 : 2,
    isMobile: device === 'mobile',
    hasTouch: device === 'mobile',
    locale: 'en-GB',
    timezoneId: 'Europe/Vienna',
  })
  await login(context)
  await setAdminLocale(context, 'en')
  const page = await context.newPage()
  const shot = async (path: string, name: string, before?: () => Promise<void>) => {
    await page.goto(`${BASE}${path}`)
    await settle(page)
    if (before) await before()
    await save(page, `admin-${name}-${device}`)
  }

  await shot('/admin/reservations', 'reservations')
  await shot('/admin/reservations/new', 'new-reservation')
  await shot('/admin/floor-plan', 'floor-plan')
  await shot('/admin/floor-plan', 'table-modal-walkin', async () => {
    // T1 is free in the demo seed and visible on both layouts
    await page.locator('button[aria-label^="Table T1,"]').click()
    await page.getByRole('tab', { name: 'Seat now' }).click()
    await page.waitForTimeout(300)
  })
  await shot('/admin/tables', 'tables')
  await shot('/admin/menu', 'menu')
  const firstItem = await page.locator('a[href^="/admin/menu/items/"]:not([href$="/new"])').first().getAttribute('href')
  await shot(firstItem!, 'menu-item-form', async () => {
    await page.getByRole('button', { name: /UK|Укр/ }).first().click().catch(() => {})
    await page.waitForTimeout(200)
  })
  await shot('/admin/promotions', 'promotions')
  await shot('/admin/gallery', 'gallery')
  await shot('/admin/settings', 'settings')
  await shot('/admin/users', 'users')

  if (device === 'desktop') {
    for (const locale of ['de', 'en', 'uk'] as const) {
      await setAdminLocale(context, locale)
      await shot('/admin/floor-plan', `floor-plan-${locale}`)
    }
    await setAdminLocale(context, 'en')
  }
  await context.close()
}

async function publicShots(browser: Browser, device: 'desktop' | 'mobile') {
  const context = await newContext(browser, {
    viewport: device === 'desktop' ? DESKTOP : MOBILE,
    deviceScaleFactor: device === 'desktop' ? 1 : 2,
    isMobile: device === 'mobile',
    hasTouch: device === 'mobile',
    timezoneId: 'Europe/Vienna',
  })
  const page = await context.newPage()
  for (const [path, name] of [
    ['/en', 'landing'],
    ['/en/menu', 'menu'],
    ['/en/booking', 'booking'],
  ] as const) {
    await page.goto(`${BASE}${path}`)
    await settle(page)
    await save(page, `public-${name}-${device}`)
  }
  await context.close()
}

/** Floor plan → free table → walk-in → table turns red → reservation list. */
async function demoGif(browser: Browser) {
  const auth = await newContext(browser, { viewport: { width: 1280, height: 800 } })
  await login(auth)
  await setAdminLocale(auth, 'en')
  const state = await auth.storageState()
  await auth.close()

  const videoDir = join(OUT, '.video')
  rmSync(videoDir, { recursive: true, force: true })
  const context = await newContext(browser, {
    viewport: { width: 1280, height: 800 },
    storageState: state,
    timezoneId: 'Europe/Vienna',
    recordVideo: { dir: videoDir, size: { width: 1280, height: 800 } },
  })
  // The video starts with the context; remember when the plan is on screen
  // so the blank page load can be trimmed from the GIF.
  const recordingStart = Date.now()
  const page = await context.newPage()
  await page.goto(`${BASE}/admin/floor-plan`)
  await page.waitForSelector('button[aria-label^="Table T1,"]')
  await settle(page)
  const trimSeconds = Math.max(0, (Date.now() - recordingStart) / 1000 - 0.2)
  await page.waitForTimeout(1500)

  // T1 is free in the demo seed
  const tableName = 'T1'
  const free = page.locator(`button[aria-label^="Table ${tableName},"]`)
  await free.hover()
  await page.waitForTimeout(600)
  await free.click()
  await page.waitForTimeout(1200)
  await page.getByRole('tab', { name: 'Seat now' }).click()
  await page.waitForTimeout(800)
  await page.getByRole('button', { name: '2', exact: true }).first().click().catch(() => {})
  await page.waitForTimeout(500)
  await page.getByLabel('Guest name (optional)').pressSequentially('Walk-in', { delay: 60 }).catch(() => {})
  await page.waitForTimeout(600)
  await page.getByRole('button', { name: 'Seat at this table' }).click()
  await page.waitForResponse((r) => r.url().includes('/api/floor-status') && r.ok())
  await settle(page)
  await page.locator(`button[aria-label^="Table ${tableName},"]`).hover()
  await page.waitForTimeout(2000)
  await page.goto(`${BASE}/admin/reservations`)
  await settle(page)
  await page.waitForTimeout(2500)
  await context.close()

  const webm = readdirSync(videoDir).find((f) => f.endsWith('.webm'))
  if (!webm) throw new Error('no video recorded')
  const gif = join(OUT, 'demo.gif')
  execFileSync('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-ss', trimSeconds.toFixed(2),
    '-i', join(videoDir, webm),
    '-vf', 'fps=10,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle',
    '-loop', '0',
    `${gif}.tmp.gif`,
  ])
  renameSync(`${gif}.tmp.gif`, gif)
  rmSync(videoDir, { recursive: true, force: true })
  console.log(`✓ demo.gif ${Math.round(statSync(gif).size / 1024)} KB`)
}

async function main() {
  mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch()
  try {
    if (!process.argv.includes('--gif-only')) {
      for (const device of ['desktop', 'mobile'] as const) {
        await adminShots(browser, device)
        if (!process.argv.includes('--admin-only')) await publicShots(browser, device)
      }
    }
    if (!process.argv.includes('--no-gif')) await demoGif(browser)
  } finally {
    await browser.close()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
