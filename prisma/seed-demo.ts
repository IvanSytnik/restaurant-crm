/**
 * Demo data for screenshots and a public demo: the fictional
 * "Gasthaus Lindenhof" in Graz. Every name, phone number and address below is
 * invented. Photos come from prisma/demo-media.json (credited in
 * docs/media/CREDITS.md).
 *
 *   DEMO_DB_HOST=<host of the demo database>  DEMO_PASSWORD=<min 12 chars>  npm run seed:demo
 *
 * DESTRUCTIVE: wipes every table before inserting. It refuses to run unless
 * DATABASE_URL contains DEMO_DB_HOST, so it can never touch another database.
 * Reservations are generated relative to the current Vienna time, so the
 * floor plan shows FREE, SOON, OCCUPIED and INACTIVE tables at once. Re-run it
 * right before taking screenshots.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import bcrypt from 'bcryptjs'
import { PrismaClient, type Allergen, type ReservationSource, type ReservationStatus } from '@prisma/client'
import { blocks, NON_BLOCKING_STATUSES } from '../lib/booking/table-allocator'
import { addDays, formatViennaDate, viennaDateColumn, viennaIso } from '../lib/public/vienna-time'

// ── Safety checks (before any connection is made) ───────────────────────────

const demoHost = process.env.DEMO_DB_HOST?.trim()
const dbUrl = process.env.DATABASE_URL ?? ''
if (!demoHost) {
  console.error('Refusing to run: DEMO_DB_HOST is not set.')
  process.exit(1)
}
if (!dbUrl.includes(demoHost)) {
  console.error('Refusing to run: DATABASE_URL does not point at DEMO_DB_HOST.')
  process.exit(1)
}
const password = process.env.DEMO_PASSWORD ?? ''
if (password.length < 12) {
  console.error('Refusing to run: DEMO_PASSWORD must be set (min 12 characters).')
  process.exit(1)
}

const prisma = new PrismaClient()

// ── Media ────────────────────────────────────────────────────────────────────

type MediaItem = { key: string; url: string }
const mediaFile = join(__dirname, 'demo-media.json')
const media: Record<string, string> = existsSync(mediaFile)
  ? Object.fromEntries(
      (JSON.parse(readFileSync(mediaFile, 'utf8')).images as MediaItem[]).map((m) => [m.key, m.url])
    )
  : {}
const img = (key: string): string | null => media[key] ?? null

// ── Time helpers (everything in Vienna time) ────────────────────────────────

const now = new Date()
const today = formatViennaDate(now)
const tomorrow = addDays(today, 1)
const MIN = 60_000

/** Current Vienna time rounded down to the 15-minute grid, as an instant. */
function gridNow(): Date {
  return new Date(Math.floor(now.getTime() / (15 * MIN)) * 15 * MIN)
}
const at = (date: string, hhmm: string) => new Date(viennaIso(date, hhmm))
const plus = (d: Date, minutes: number) => new Date(d.getTime() + minutes * MIN)

// ── Data ─────────────────────────────────────────────────────────────────────

const USERS = [
  { email: 'owner@lindenhof.example', name: 'Anna Berger', role: 'OWNER', locale: 'de' },
  { email: 'manager@lindenhof.example', name: 'Lukas Hofer', role: 'MANAGER', locale: 'en' },
  { email: 'staff@lindenhof.example', name: 'Olena Kovalenko', role: 'STAFF', locale: 'uk' },
] as const

const CONTACTS: Record<string, string> = {
  name_de: 'Gasthaus Lindenhof',
  name_en: 'Gasthaus Lindenhof',
  name_uk: 'Гастхаус Лінденгоф',
  tagline_de: 'Steirische Küche seit 1987',
  tagline_en: 'Styrian cooking since 1987',
  tagline_uk: 'Штирійська кухня з 1987 року',
  description_de:
    'Ein Wirtshaus wie früher: Holzstube, Kachelofen und ein Gastgarten unter alten Linden. Wir kochen saisonal mit Produkten aus der Steiermark.',
  description_en:
    'An old-style inn: wood-panelled dining room, tiled stove and a garden under old linden trees. We cook seasonally with produce from Styria.',
  description_uk:
    'Корчма як колись: дерев’яна зала, кахляна піч і літній сад під старими липами. Готуємо сезонно з продуктів Штирії.',
  address: 'Lindenweg 12',
  postal_code: '8010',
  city: 'Graz',
  country: 'Österreich',
  phone: '+43 316 000 000',
  email: 'hallo@lindenhof.example',
  legal_company_name: 'Gasthaus Lindenhof (Demo)',
  legal_owner_name: 'Anna Berger',
  legal_address: 'Lindenweg 12, 8010 Graz',
  impressum_text_de:
    'Gasthaus Lindenhof ist ein fiktiver Betrieb.\nDiese Installation zeigt Demo-Daten; alle Namen, Adressen und Telefonnummern sind erfunden.',
  impressum_text_en:
    'Gasthaus Lindenhof is a fictional business.\nThis installation shows demo data; all names, addresses and phone numbers are invented.',
  impressum_text_uk:
    'Gasthaus Lindenhof — вигаданий заклад.\nЦя інсталяція містить демо-дані; усі імена, адреси й номери телефонів вигадані.',
  privacy_text_de: 'Demo-Installation. Es werden keine echten personenbezogenen Daten verarbeitet.',
  privacy_text_en: 'Demo installation. No real personal data is processed.',
  privacy_text_uk: 'Демо-інсталяція. Справжні персональні дані не обробляються.',
}

const SETTINGS: Record<string, number> = {
  duration_1_2: 60,
  duration_3_4: 90,
  duration_5_plus: 120,
  buffer_minutes: 15,
  booking_horizon: 60,
  min_guests: 1,
  max_guests: 8,
}

type TableSeed = {
  name: string
  capacity: number
  minCapacity: number
  zone: 'INDOOR' | 'TERRACE' | 'OUTDOOR' | 'PRIVATE'
  posX: number
  posY: number
  isActive?: boolean
}

const TABLES: TableSeed[] = [
  { name: 'T1', capacity: 2, minCapacity: 1, zone: 'INDOOR', posX: 12, posY: 20 },
  { name: 'T2', capacity: 2, minCapacity: 1, zone: 'INDOOR', posX: 26, posY: 20 },
  { name: 'T3', capacity: 4, minCapacity: 2, zone: 'INDOOR', posX: 40, posY: 20 },
  { name: 'T4', capacity: 4, minCapacity: 2, zone: 'INDOOR', posX: 12, posY: 48 },
  { name: 'T5', capacity: 4, minCapacity: 2, zone: 'INDOOR', posX: 26, posY: 48 },
  { name: 'T6', capacity: 6, minCapacity: 3, zone: 'INDOOR', posX: 40, posY: 48 },
  { name: 'Stube', capacity: 10, minCapacity: 6, zone: 'PRIVATE', posX: 26, posY: 80 },
  { name: 'T7', capacity: 2, minCapacity: 1, zone: 'TERRACE', posX: 62, posY: 20 },
  { name: 'T8', capacity: 4, minCapacity: 2, zone: 'TERRACE', posX: 76, posY: 20 },
  { name: 'T9', capacity: 4, minCapacity: 2, zone: 'TERRACE', posX: 90, posY: 20 },
  { name: 'G1', capacity: 6, minCapacity: 3, zone: 'OUTDOOR', posX: 68, posY: 70 },
  // Garden table closed for the season: shows INACTIVE on the floor plan.
  { name: 'G2', capacity: 8, minCapacity: 4, zone: 'OUTDOOR', posX: 86, posY: 70, isActive: false },
]

type Item = {
  de: string
  en: string
  uk: string
  dDe?: string
  dEn?: string
  dUk?: string
  price?: number
  allergens?: Allergen[]
  vegetarian?: boolean
  vegan?: boolean
  spicy?: number
  image?: string
  variants?: { de: string; en: string; uk: string; price: number }[]
}

const MENU: { de: string; en: string; uk: string; slug: string; items: Item[] }[] = [
  {
    de: 'Vorspeisen', en: 'Starters', uk: 'Закуски', slug: 'vorspeisen',
    items: [
      { de: 'Steirischer Backhendlsalat', en: 'Styrian fried chicken salad', uk: 'Штирійський салат зі смаженою куркою',
        dDe: 'Blattsalate, Erdäpfel, Kürbiskernöl', dEn: 'Leaf salad, potatoes, pumpkin seed oil', dUk: 'Листовий салат, картопля, гарбузова олія',
        price: 14.9, allergens: ['GLUTEN', 'EGGS', 'MUSTARD'], image: 'food-salad' },
      { de: 'Liptauer mit Bauernbrot', en: 'Liptauer spread with farmhouse bread', uk: 'Ліптауер із сільським хлібом',
        price: 7.5, allergens: ['GLUTEN', 'MILK'], vegetarian: true, spicy: 1 },
      { de: 'Kürbiscremesuppe', en: 'Cream of pumpkin soup', uk: 'Крем-суп із гарбуза',
        dDe: 'mit gerösteten Kürbiskernen', dEn: 'with roasted pumpkin seeds', dUk: 'зі смаженим гарбузовим насінням',
        price: 6.9, allergens: ['CELERY'], vegan: true, image: 'food-soup' },
    ],
  },
  {
    de: 'Suppen', en: 'Soups', uk: 'Супи', slug: 'suppen',
    items: [
      { de: 'Frittatensuppe', en: 'Beef broth with pancake strips', uk: 'Бульйон із млинцевою локшиною',
        price: 5.9, allergens: ['GLUTEN', 'EGGS', 'MILK', 'CELERY'] },
      { de: 'Grießnockerlsuppe', en: 'Beef broth with semolina dumplings', uk: 'Бульйон із манними галушками',
        price: 5.9, allergens: ['GLUTEN', 'EGGS', 'CELERY'] },
      { de: 'Gulaschsuppe', en: 'Goulash soup', uk: 'Суп-гуляш',
        price: 6.5, allergens: ['CELERY', 'GLUTEN'], spicy: 2 },
    ],
  },
  {
    de: 'Hauptspeisen', en: 'Mains', uk: 'Основні страви', slug: 'hauptspeisen',
    items: [
      { de: 'Wiener Schnitzel', en: 'Wiener schnitzel', uk: 'Віденський шніцель',
        dDe: 'mit Petersilerdäpfeln und Preiselbeeren', dEn: 'with parsley potatoes and lingonberries', dUk: 'з картоплею з петрушкою та брусницею',
        allergens: ['GLUTEN', 'EGGS', 'MILK'], image: 'food-schnitzel',
        variants: [
          { de: 'vom Schwein', en: 'pork', uk: 'зі свинини', price: 16.9 },
          { de: 'vom Kalb', en: 'veal', uk: 'з телятини', price: 24.5 },
        ] },
      { de: 'Tafelspitz', en: 'Boiled beef (Tafelspitz)', uk: 'Тафельшпіц',
        dDe: 'mit Apfelkren, Schnittlauchsauce und Rösterdäpfeln', dEn: 'with apple horseradish, chive sauce and hash browns', dUk: 'з яблучним хроном, соусом із цибулі-різанцю та смаженою картоплею',
        price: 22.9, allergens: ['MILK', 'EGGS', 'CELERY', 'MUSTARD'] },
      { de: 'Rindsgulasch', en: 'Beef goulash', uk: 'Яловичий гуляш',
        dDe: 'mit Serviettenknödel', dEn: 'with bread dumpling', dUk: 'з хлібним кнедликом',
        price: 17.5, allergens: ['GLUTEN', 'EGGS', 'MILK', 'CELERY'], spicy: 1, image: 'food-goulash' },
      { de: 'Forelle Müllerin', en: 'Trout meunière', uk: 'Форель по-мельничому',
        price: 21.9, allergens: ['FISH', 'GLUTEN', 'MILK'] },
    ],
  },
  {
    de: 'Vegetarisch & Vegan', en: 'Vegetarian & vegan', uk: 'Вегетаріанське та веганське', slug: 'vegetarisch',
    items: [
      { de: 'Käsespätzle', en: 'Cheese spaetzle', uk: 'Сирні шпецле',
        dDe: 'mit Röstzwiebeln und grünem Salat', dEn: 'with crispy onions and green salad', dUk: 'зі смаженою цибулею та зеленим салатом',
        price: 14.5, allergens: ['GLUTEN', 'EGGS', 'MILK'], vegetarian: true, image: 'food-spaetzle' },
      { de: 'Eierschwammerl-Gröstl', en: 'Chanterelle and potato hash', uk: 'Смажена картопля з лисичками',
        price: 15.9, allergens: ['CELERY'], vegan: true },
      { de: 'Linsen-Chili', en: 'Lentil chili', uk: 'Чилі із сочевиці',
        price: 13.5, allergens: ['CELERY'], vegan: true, spicy: 3 },
    ],
  },
  {
    de: 'Mehlspeisen', en: 'Desserts', uk: 'Десерти', slug: 'mehlspeisen',
    items: [
      { de: 'Kaiserschmarrn', en: 'Kaiserschmarrn', uk: 'Кайзершмаррн',
        dDe: 'mit Zwetschkenröster', dEn: 'with stewed plums', dUk: 'зі сливовим компотом',
        price: 11.9, allergens: ['GLUTEN', 'EGGS', 'MILK'], vegetarian: true, image: 'food-kaiserschmarrn' },
      { de: 'Apfelstrudel', en: 'Apple strudel', uk: 'Яблучний штрудель',
        allergens: ['GLUTEN', 'MILK', 'NUTS'], vegetarian: true, image: 'food-strudel',
        variants: [
          { de: 'pur', en: 'plain', uk: 'без нічого', price: 5.9 },
          { de: 'mit Vanilleeis', en: 'with vanilla ice cream', uk: 'з ванільним морозивом', price: 7.9 },
        ] },
      { de: 'Mohnnudeln', en: 'Poppy seed noodles', uk: 'Локшина з маком',
        price: 8.5, allergens: ['GLUTEN', 'EGGS', 'MILK'], vegetarian: true },
    ],
  },
  {
    de: 'Getränke', en: 'Drinks', uk: 'Напої', slug: 'getraenke',
    items: [
      { de: 'Steirisches Märzen', en: 'Styrian lager', uk: 'Штирійське пиво Мерцен',
        allergens: ['GLUTEN'], vegan: true,
        variants: [
          { de: '0,3 l', en: '0.3 l', uk: '0,3 л', price: 3.9 },
          { de: '0,5 l', en: '0.5 l', uk: '0,5 л', price: 4.8 },
        ] },
      { de: 'Apfelsaft gespritzt', en: 'Apple juice spritzer', uk: 'Яблучний сік із газованою водою',
        vegan: true,
        variants: [
          { de: '0,25 l', en: '0.25 l', uk: '0,25 л', price: 2.9 },
          { de: '0,5 l', en: '0.5 l', uk: '0,5 л', price: 3.9 },
        ] },
      { de: 'Welschriesling, Südsteiermark', en: 'Welschriesling, South Styria', uk: 'Вельшрислінг, Південна Штирія',
        allergens: ['SULPHITES'], vegan: true, image: 'drink-wine',
        variants: [
          { de: '1/8 l', en: '125 ml', uk: '125 мл', price: 4.2 },
          { de: '0,7 l Flasche', en: '0.7 l bottle', uk: 'пляшка 0,7 л', price: 29 },
        ] },
    ],
  },
]

const GALLERY: { de: string; en: string; uk: string; slug: string; images: { key: string; de: string; en: string; uk: string; featured?: boolean }[] }[] = [
  {
    de: 'Gaststube', en: 'Dining room', uk: 'Зала', slug: 'gaststube',
    images: [
      { key: 'room-1', de: 'Holzvertäfelte Gaststube', en: 'Wood-panelled dining room', uk: 'Зала з дерев’яними панелями', featured: true },
      { key: 'room-2', de: 'Gedeckter Tisch am Abend', en: 'Table set for the evening', uk: 'Сервірований стіл увечері' },
      { key: 'room-3', de: 'Die Schank', en: 'The bar', uk: 'Барна стійка' },
    ],
  },
  {
    de: 'Küche', en: 'Kitchen', uk: 'Кухня', slug: 'kueche',
    images: [
      { key: 'food-schnitzel', de: 'Wiener Schnitzel', en: 'Wiener schnitzel', uk: 'Віденський шніцель' },
      { key: 'food-goulash', de: 'Rindsgulasch', en: 'Beef goulash', uk: 'Яловичий гуляш' },
      { key: 'food-strudel', de: 'Apfelstrudel', en: 'Apple strudel', uk: 'Яблучний штрудель' },
      { key: 'food-kaiserschmarrn', de: 'Kaiserschmarrn', en: 'Kaiserschmarrn', uk: 'Кайзершмаррн' },
    ],
  },
  {
    de: 'Gastgarten', en: 'Garden', uk: 'Літній сад', slug: 'gastgarten',
    images: [
      { key: 'garden-1', de: 'Gastgarten unter Linden', en: 'Garden under linden trees', uk: 'Сад під липами' },
      { key: 'garden-2', de: 'Sommerabend im Garten', en: 'Summer evening in the garden', uk: 'Літній вечір у саду' },
    ],
  },
]

// ── Reservations ─────────────────────────────────────────────────────────────

type ResSeed = {
  table: string
  guest: string
  phone: string
  email?: string
  guests: number
  start: Date
  minutes: number
  status: ReservationStatus
  source: ReservationSource
  locale?: 'de' | 'en' | 'uk'
  comment?: string
  note?: string
}

function buildReservations(): ResSeed[] {
  const g = gridNow()
  const list: ResSeed[] = [
    // Right now: OCCUPIED tables
    { table: 'T3', guest: 'Familie Wagner', phone: '+43 660 000 0101', guests: 4, start: plus(g, -45), minutes: 90, status: 'SEATED', source: 'PHONE', comment: 'Kinderstuhl' },
    { table: 'T8', guest: 'Walk-in', phone: '-', email: 'walkin@phone.local', guests: 3, start: plus(g, -30), minutes: 90, status: 'SEATED', source: 'WALKIN' },
    { table: 'T2', guest: 'Marco Rossi', phone: '+43 664 000 0102', email: 'marco.rossi@example.com', guests: 2, start: plus(g, -15), minutes: 60, status: 'CONFIRMED', source: 'WEBSITE', locale: 'en' },
    // Starting within 30 minutes: SOON
    { table: 'T5', guest: 'Sophie Lechner', phone: '+43 676 000 0103', email: 'sophie.lechner@example.com', guests: 3, start: plus(g, 30), minutes: 90, status: 'CONFIRMED', source: 'WEBSITE', comment: 'Geburtstag, bitte Kerze' },
    { table: 'T9', guest: 'Ivan Petrenko', phone: '+43 699 000 0104', email: 'ivan.petrenko@example.com', guests: 2, start: plus(g, 15), minutes: 60, status: 'CONFIRMED', source: 'WEBSITE', locale: 'uk' },
    // Later today
    { table: 'T6', guest: 'Stammtisch Huber', phone: '+43 650 000 0105', guests: 6, start: plus(g, 90), minutes: 120, status: 'CONFIRMED', source: 'PHONE', note: 'Stammgäste, Bier vorab kühlen' },
    { table: 'Stube', guest: 'Firma Alpenblick – Teamessen', phone: '+43 316 000 0106', email: 'office@alpenblick.example', guests: 9, start: plus(g, 120), minutes: 150, status: 'CONFIRMED', source: 'ADMIN', comment: '2 × vegetarisch' },
    { table: 'T4', guest: 'Julia Steiner', phone: '+43 664 000 0107', email: 'julia.steiner@example.com', guests: 4, start: plus(g, 150), minutes: 90, status: 'CONFIRMED', source: 'WEBSITE' },
    { table: 'T7', guest: 'Thomas Gruber', phone: '+43 660 000 0108', guests: 2, start: plus(g, 180), minutes: 60, status: 'CONFIRMED', source: 'PHONE' },
    // Earlier today: finished or not shown
    { table: 'T4', guest: 'Elena Novak', phone: '+43 676 000 0109', email: 'elena.novak@example.com', guests: 2, start: plus(g, -240), minutes: 60, status: 'COMPLETED', source: 'WEBSITE' },
    { table: 'T1', guest: 'Peter Mayer', phone: '+43 699 000 0110', guests: 2, start: plus(g, -180), minutes: 60, status: 'NO_SHOW', source: 'PHONE' },
    { table: 'G1', guest: 'Katharina Fuchs', phone: '+43 650 000 0111', email: 'k.fuchs@example.com', guests: 5, start: plus(g, 60), minutes: 120, status: 'CANCELLED', source: 'WEBSITE', comment: 'Storniert per Telefon' },
  ]

  // Tomorrow, fixed lunch and dinner times
  const tm = (hhmm: string) => at(tomorrow, hhmm)
  list.push(
    { table: 'T1', guest: 'Andrea Weiss', phone: '+43 664 000 0201', email: 'andrea.weiss@example.com', guests: 2, start: tm('12:00'), minutes: 60, status: 'CONFIRMED', source: 'WEBSITE' },
    { table: 'T3', guest: 'Mykola Shevchuk', phone: '+43 660 000 0202', email: 'mykola.s@example.com', guests: 4, start: tm('12:30'), minutes: 90, status: 'CONFIRMED', source: 'WEBSITE', locale: 'uk' },
    { table: 'T7', guest: 'Laura Bauer', phone: '+43 676 000 0203', guests: 2, start: tm('13:00'), minutes: 60, status: 'CONFIRMED', source: 'PHONE' },
    { table: 'T6', guest: 'Familie Pichler', phone: '+43 699 000 0204', guests: 5, start: tm('18:00'), minutes: 120, status: 'CONFIRMED', source: 'PHONE', comment: 'Hund dabei' },
    { table: 'T2', guest: 'James Miller', phone: '+44 7700 000205', email: 'james.miller@example.com', guests: 2, start: tm('18:30'), minutes: 60, status: 'CONFIRMED', source: 'WEBSITE', locale: 'en' },
    { table: 'T5', guest: 'Sarah Koller', phone: '+43 650 000 0206', email: 'sarah.koller@example.com', guests: 3, start: tm('19:00'), minutes: 90, status: 'CONFIRMED', source: 'WEBSITE' },
    { table: 'Stube', guest: 'Weinclub Graz', phone: '+43 316 000 0207', guests: 8, start: tm('19:00'), minutes: 150, status: 'CONFIRMED', source: 'ADMIN', note: 'Weinbegleitung vorbestellt' },
    { table: 'T8', guest: 'Michael Haas', phone: '+43 664 000 0208', guests: 4, start: tm('19:30'), minutes: 90, status: 'CANCELLED', source: 'PHONE' },
  )
  return list
}

/** The seed writes reservations directly, so it checks the overlap rule itself. */
function assertNoOverlaps(list: ResSeed[], bufferMinutes: number) {
  const active = list.filter((r) => !NON_BLOCKING_STATUSES.includes(r.status))
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i]
      const b = active[j]
      if (a.table !== b.table) continue
      const aEnd = plus(a.start, a.minutes)
      const bFreed = plus(b.start, b.minutes + bufferMinutes)
      if (blocks({ startTime: a.start, endTime: aEnd }, b.start, bFreed, bufferMinutes)) {
        throw new Error(`Demo reservations overlap on ${a.table}: ${a.guest} / ${b.guest}`)
      }
    }
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function wipe() {
  await prisma.reservation.deleteMany()
  await prisma.menuItemVariant.deleteMany()
  await prisma.menuItem.deleteMany()
  await prisma.menuCategory.deleteMany()
  await prisma.promotion.deleteMany()
  await prisma.galleryImage.deleteMany()
  await prisma.galleryCategory.deleteMany()
  await prisma.table.deleteMany()
  await prisma.workingHours.deleteMany()
  await prisma.setting.deleteMany()
  await prisma.contact.deleteMany()
  await prisma.session.deleteMany()
  await prisma.account.deleteMany()
  await prisma.user.deleteMany()
}

async function main() {
  const reservations = buildReservations()
  assertNoOverlaps(reservations, SETTINGS.buffer_minutes)

  await wipe()

  const hash = await bcrypt.hash(password, 10)
  const users = await Promise.all(
    USERS.map((u) => prisma.user.create({ data: { ...u, password: hash, isActive: true } }))
  )
  const manager = users[1]

  await prisma.contact.createMany({ data: Object.entries(CONTACTS).map(([key, value]) => ({ key, value })) })
  await prisma.setting.createMany({
    data: Object.entries(SETTINGS).map(([key, value]) => ({ key, value: String(value) })),
  })
  // Open every day so the public booking form has slots whatever day the
  // demo is opened.
  await prisma.workingHours.createMany({
    data: Array.from({ length: 7 }, (_, dayOfWeek) => ({
      dayOfWeek,
      isOpen: true,
      openTime: '11:00',
      closeTime: '23:00',
      lastBookingTime: '21:30',
    })),
  })

  const tables = new Map<string, string>()
  for (const t of TABLES) {
    const row = await prisma.table.create({ data: { ...t, isActive: t.isActive ?? true } })
    tables.set(t.name, row.id)
  }

  for (const [ci, c] of MENU.entries()) {
    const cat = await prisma.menuCategory.create({
      data: { nameDE: c.de, nameEN: c.en, nameUK: c.uk, slug: c.slug, position: ci },
    })
    for (const [ii, it] of c.items.entries()) {
      await prisma.menuItem.create({
        data: {
          categoryId: cat.id,
          nameDE: it.de,
          nameEN: it.en,
          nameUK: it.uk,
          descriptionDE: it.dDe ?? null,
          descriptionEN: it.dEn ?? null,
          descriptionUK: it.dUk ?? null,
          price: it.price ?? null,
          imageUrl: it.image ? img(it.image) : null,
          allergens: it.allergens ?? [],
          isVegetarian: !!(it.vegetarian || it.vegan),
          isVegan: !!it.vegan,
          spicyLevel: it.spicy ?? 0,
          position: ii,
          variants: {
            create: (it.variants ?? []).map((v, vi) => ({
              labelDE: v.de,
              labelEN: v.en,
              labelUK: v.uk,
              price: v.price,
              position: vi,
            })),
          },
        },
      })
    }
  }

  const dateCol = (d: string) => new Date(`${d}T00:00:00.000Z`)
  await prisma.promotion.createMany({
    data: [
      {
        slug: 'mittagsmenue',
        titleDE: 'Mittagsmenü', titleEN: 'Lunch menu', titleUK: 'Бізнес-ланч',
        descriptionDE: 'Suppe und Hauptspeise des Tages um 12,90 €. Montag bis Freitag, 11:30–14:30.',
        descriptionEN: 'Soup and main course of the day for €12.90. Monday to Friday, 11:30–14:30.',
        descriptionUK: 'Суп і основна страва дня за 12,90 €. З понеділка по п’ятницю, 11:30–14:30.',
        startDate: dateCol(addDays(today, -14)), endDate: dateCol(addDays(today, 60)),
        daysOfWeek: [1, 2, 3, 4, 5], startTime: '11:30', endTime: '14:30',
        imageUrl: img('food-schnitzel'),
      },
      {
        slug: 'martinigansl',
        titleDE: 'Martinigansl', titleEN: 'St. Martin’s goose', titleUK: 'Мартинська гуска',
        descriptionDE: 'Knusprige Gans mit Rotkraut und Knödel – nur auf Vorbestellung.',
        descriptionEN: 'Crispy goose with red cabbage and dumplings – pre-order only.',
        descriptionUK: 'Хрустка гуска з червоною капустою та кнедликами — лише за попереднім замовленням.',
        startDate: dateCol(addDays(today, 14)), endDate: dateCol(addDays(today, 35)),
        imageUrl: img('room-2'),
      },
      {
        slug: 'spargelzeit',
        titleDE: 'Spargelzeit', titleEN: 'Asparagus season', titleUK: 'Сезон спаржі',
        descriptionDE: 'Steirischer Spargel in fünf Variationen.',
        descriptionEN: 'Styrian asparagus, five ways.',
        descriptionUK: 'Штирійська спаржа в п’яти варіантах.',
        startDate: dateCol(addDays(today, -200)), endDate: dateCol(addDays(today, -160)),
        isArchived: true,
      },
    ],
  })

  for (const [ci, c] of GALLERY.entries()) {
    const cat = await prisma.galleryCategory.create({
      data: { nameDE: c.de, nameEN: c.en, nameUK: c.uk, slug: c.slug, position: ci },
    })
    let pos = 0
    for (const im of c.images) {
      const url = img(im.key)
      if (!url) continue
      await prisma.galleryImage.create({
        data: {
          categoryId: cat.id, url, altDE: im.de, altEN: im.en, altUK: im.uk,
          isFeatured: !!im.featured, position: pos++,
        },
      })
    }
  }

  for (const r of reservations) {
    await prisma.reservation.create({
      data: {
        guestName: r.guest,
        guestPhone: r.phone,
        guestEmail: r.email ?? `${r.phone.replace(/(?!^\+)[^\d]/g, '') || 'walkin'}@phone.local`,
        guestCount: r.guests,
        comment: r.comment ?? null,
        internalNote: r.note ?? null,
        locale: r.locale ?? 'de',
        date: viennaDateColumn(r.start),
        startTime: r.start,
        endTime: plus(r.start, r.minutes),
        status: r.status,
        source: r.source,
        tableId: tables.get(r.table)!,
        createdById: r.source === 'WEBSITE' ? null : manager.id,
        // Demo guests never receive mail; mark web confirmations as handled.
        confirmationSentAt: r.source === 'WEBSITE' ? now : null,
      },
    })
  }

  const imageCount = await prisma.galleryImage.count()
  console.log(`✓ Demo data for ${today} / ${tomorrow} (Vienna)`)
  console.log(`  ${USERS.length} users, ${TABLES.length} tables, ${reservations.length} reservations, ${imageCount} gallery images`)
  console.log(`  Sign in: ${USERS.map((u) => `${u.email} (${u.role})`).join(', ')}`)
  if (Object.keys(media).length === 0) console.log('  Note: prisma/demo-media.json not found — no photos seeded.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
