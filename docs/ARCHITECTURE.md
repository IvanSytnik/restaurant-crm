# Architecture decisions

Short records of the decisions that shape the code, each with the reason and
the cost. File references point to where the decision is implemented.

## One Next.js app, two trees

The public site (`app/(public)/[locale]/**`) and the admin panel
(`app/admin/**`) live in one Next.js 15 App Router project and share Prisma,
the booking logic and the message files. Each tree has its own **root
layout**: the public one sets `<html lang>` from the URL, the admin one from
the signed-in user. A single shared root layout could only resolve the
locale from request headers, which would make every page dynamic and rule out
ISR for the public pages.

*Cost:* navigating between the two trees is a full page load (they never link
to each other in normal use).

## Sessions: JWT, with a database re-check

NextAuth v4 with the credentials provider (`lib/auth.ts`). The credentials
provider only supports JWT sessions, so the session is a signed cookie. The
Prisma adapter stays configured (`adapter: PrismaAdapter(prisma) as Adapter`)
for the auth tables and possible OAuth providers later.

A plain JWT cannot be revoked: a deactivated employee would keep access until
expiry. The `jwt` callback therefore re-reads `role` and `isActive` on every
session read (cached for 60 s per server instance, cleared on user edits) and
invalidates the session for inactive or deleted accounts. Sessions last
12 hours, one shift on a shared device. The callback only runs in the Node.js
runtime; `middleware.ts` uses `withAuth`, which decodes the cookie without
calling it, so no database query reaches the edge.

## Authorization in three places

1. `middleware.ts` redirects STAFF away from the management pages (tables,
   menu, promotions, gallery, settings, users) and non-owners away from
   `/admin/users`. This is for navigation only.
2. Each admin page renders inside `<ProtectedAdminPage>`, which checks the
   session and resolves the user's locale and the restaurant name.
3. Every API route checks the session and role itself; this is the actual
   security boundary.

`app/admin/layout.tsx` has no auth check on purpose: `/admin/login` lives
under it, and a layout-level redirect would loop.

## `/ua` in the URL, `uk` everywhere else

Ukrainian's language code is `uk`, which is what next-intl, `Intl.*` and the
database use. In a URL `/uk` reads as "United Kingdom" to most guests, so the
public site uses `/ua` and maps it in exactly one place
(`i18n/config.ts`: `urlToLocale`, `localeToUrl`).

## Translatable content as parallel columns

Menu items, categories, promotions and gallery store `nameDE` / `nameEN` /
`nameUK` (and so on) instead of a translations table. German is required,
the others fall back to it through `lib/menu/i18n.ts`. Three fixed languages
make a join table pure overhead; adding a fourth language would mean a
schema change, which is acceptable for one restaurant.

## Settings and contacts as key/value rows

Booking rules (`Setting`) and restaurant data (`Contact`) are key/value tables
with a fixed set of keys in code (`lib/settings-booking.ts`, `lib/contacts.ts`).
New tunables need no migration. Defaults and limits live next to the keys,
and every reader goes through one function, so a missing row never produces
two different defaults.

## Booking: auto-confirm, best fit, one lock

- **Auto-confirm.** A booking either gets a table immediately or is rejected
  with a reason; there is no approval queue for staff. `PENDING` remains in the
  enum only for existing rows and cannot be set through the API.
- **Best fit.** The allocator (`lib/booking/table-allocator.ts`) picks the
  smallest active table whose `[minCapacity, capacity]` range contains the
  party, ties broken by name. Two guests do not block a six-top for the
  evening. It is greedy: it does not look ahead to later bookings, which a
  restaurant of this size accepts in exchange for predictability.
- **Duration and buffer.** Guest time depends on party size (60 / 90 /
  120 minutes by default); a table counts as occupied for that time plus a
  15-minute cleaning buffer. Slots that only touch do not conflict.
- **No double booking.** Conflict check and insert run in one interactive
  transaction that first takes `pg_advisory_xact_lock`
  (`lib/booking/lock.ts`). One global key is enough for one restaurant's write
  volume and cannot deadlock. A transaction-level lock (not a session lock) is
  safe behind PgBouncer in transaction mode. Prisma cannot express a Postgres
  exclusion constraint, and the buffer is a setting, so the lock is the
  database-level guarantee.
- **Public vs. admin rules.** Public bookings must fall inside opening hours
  on the 15-minute grid (`lib/booking/slots.ts`). Admin bookings may be off
  hours (private events, closed days).

## Europe/Vienna, explicitly

The restaurant is in Vienna's time zone, Vercel runs in UTC and guests'
browsers anywhere. Every parse or format that matters goes through
`lib/public/vienna-time.ts` (`viennaIso`, `viennaDayRange`, `viennaToday`,
`formatViennaTime`, …). `viennaIso` resolves the offset for the wall-clock
time itself, so the hours around a DST switch are correct. `@db.Date` columns
hold UTC midnight of the Vienna calendar day. Tests run with the host time
zone set to New York so that any accidental reliance on the host zone fails.

## Schema changes with `prisma db push`

One developer, one database (plus Neon branches for development). `db push`
keeps iteration fast. The cost is no migration history: a destructive change
would not be reviewed as SQL. Moving to `prisma migrate` with a baseline is
the first item on the roadmap.

## Error codes, not messages

API routes answer `{ error: CODE, params? }`. The admin client translates the
code through the `apiErrors` namespace (`lib/api-error.ts`). The server never
needs to know the user's language, and no Prisma message or stack trace leaves
the server (`lib/api-route.ts`).

## Tailwind, no UI kit

The admin panel is a handful of forms, lists and one canvas; the public site
has its own visual identity (Playfair Display / DM Sans, cream and ink
palette via CSS variables). A component library would add weight and a second
design language for little gain.

## Rendering

Public pages are ISR with a 5-minute window, revalidated immediately when an
admin edits menu, gallery, promotions or settings
(`lib/public/revalidate.ts`). Nothing is prerendered at build time, so the
build needs no database. Booking pages and all admin pages are dynamic.
