# Restaurant CRM

Self-hosted reservations, a live floor plan, a trilingual menu and the public website for a single restaurant, in one Next.js app.

[![CI](https://github.com/IvanSytnik/restaurant-crm/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/IvanSytnik/restaurant-crm/actions/workflows/ci.yml)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6)
![Next.js](https://img.shields.io/badge/Next.js-15-000000)
![Prisma](https://img.shields.io/badge/Prisma-5.22-2d3748)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-336791)
![Vercel](https://img.shields.io/badge/deploy-Vercel-000000)

**Live demo:** https://&lt;subdomain&gt;.sytnik-studio.com

<p align="center">
  <img src="docs/media/demo.gif" width="760" alt="Floor plan: a free table is opened, a walk-in party is seated, the table turns red and the walk-in appears in the reservation list">
</p>

All data in the screenshots and the demo is invented. "Gasthaus Lindenhof" in Graz does not exist; photos are from Unsplash ([credits](docs/media/CREDITS.md)).

## Why

Built for a real restaurant in Austria that took bookings through a third-party platform. Two things drove it:

- **Fees and data.** Booking platforms charge per cover or per month, and the guest list (names, phone numbers, visit history) lives in their system. Here the restaurant owns its database.
- **A mixed team.** Staff work in Ukrainian, German and English, guests mostly read German. Each staff member gets the admin panel in their own language; the public site is German first, with English and Ukrainian.

## How booking works

1. **Availability.** The booking form asks `/api/availability` for a date and party size. The server walks the day's 15-minute slots between opening time and last booking time (Europe/Vienna) and keeps those where at least one fitting table is free.
2. **Duration by party size.** 1–2 guests: 60 min, 3–4: 90 min, 5+: 120 min, all configurable. The table counts as occupied for that time plus a 15-minute cleaning buffer.
3. **Best-fit allocation.** Among active tables whose `[minCapacity, capacity]` contains the party, the smallest free one wins (ties by name), so two guests never take a six-top.
4. **Double-booking protection.** Conflict check and insert run in one transaction holding a Postgres advisory lock; a second request for the same table waits and then sees the first booking.
5. **Auto-confirm.** The reservation is stored as `CONFIRMED` with its table. There is no approval queue.
6. **Emails.** A confirmation goes out after the response (Resend, in the guest's language); a daily cron sends reminders; cancelling in the admin panel sends a cancellation email.

```mermaid
sequenceDiagram
    autonumber
    actor G as Guest
    participant F as Booking form
    participant A as Next.js API
    participant DB as Postgres (Neon)
    participant R as Resend

    G->>F: date, party size
    F->>A: GET /api/availability
    A->>DB: working hours, fitting tables, reservations of the day
    A-->>F: free slots (Vienna time)
    G->>F: slot, name, phone, email
    F->>A: POST /api/public/reservations
    Note over A: rate limit, honeypot, min fill time, zod
    Note over A: opening hours and 15-min grid (Vienna)
    A->>DB: BEGIN · pg_advisory_xact_lock
    A->>DB: fitting active tables, overlapping reservations (+ buffer)
    Note over A: smallest free table
    A->>DB: INSERT reservation (CONFIRMED) · COMMIT
    A-->>F: 201 { id }
    F-->>G: confirmation page
    A--)R: confirmation email (after the response)
```

The same allocator and lock serve the admin form, walk-ins from the floor plan and moving a reservation to another table. Admin bookings skip the opening-hours check (private events, closed days).

## Guarantees

Enforced in code and covered by tests (`npm test`):

| Guarantee | Where | Tests |
|---|---|---|
| No two blocking reservations overlap on a table (buffer included; touching slots allowed) | `lib/booking/table-allocator.ts`, `lib/booking/lock.ts` | overlap and buffer edges, inactive tables, min capacity, long reservations; concurrency test against a real database (opt-in, see below) |
| Smallest fitting table is chosen | `selectBestTable()` | best fit, tie by name, no table / all occupied |
| Dates and times follow Europe/Vienna, also on DST days | `lib/public/vienna-time.ts` | run with the host zone set to New York; last Sundays of March and October |
| Public bookings only inside opening hours, on the 15-min grid | `lib/booking/slots.ts` | open/last-booking bounds, off-grid, closed days, DST days |
| Content falls back to German when a translation is missing | `lib/menu/i18n.ts` | names, descriptions, variants, titles |
| A promotion is "live" only on its weekdays and hours (Vienna) | `lib/promotions.ts` | date bounds, weekday, time window, serialized dates |
| The three message files have the same keys and placeholders | `scripts/check-i18n.ts` | runs in CI |

Enforced in code, verified manually (no automated tests yet): role-based access on every API route, immediate loss of access for deactivated users, rate limits.

## Features

**Reservations.** Day list with today / tomorrow / date picker; status changes (confirmed, seated, completed, cancelled, no-show); new reservation by phone, walk-in or other with any party size up to the configured maximum; guest's email language; placeholder contacts for guests without email are hidden.

**Floor plan.** Tables on a percentage grid, coloured free / soon (booking within 30 min) / occupied / inactive, refreshed every 30 s. Click a table to see current and upcoming bookings or seat a walk-in for 60–150 minutes. Fits phones (44 px minimum tiles, horizontal scroll with an edge hint below 500 px).

**Tables.** Name, capacity, minimum party, zone (indoor, terrace, garden, private), position, active flag. Tables with history cannot be deleted, only deactivated.

**Menu.** Categories and dishes in DE/EN/UK (German required), price or priced variants (e.g. 0.3 l / 0.5 l), the 14 EU allergens, vegetarian / vegan, spice level 0–3, image URL, availability flag, category order.

**Promotions.** Date range, optional weekdays and hours, image, archive. The landing page shows the offer that is live right now; the admin list marks it "Live now".

**Gallery.** Editable categories, images by URL with alt text in three languages, featured image used as the landing hero.

**Users and roles.** OWNER: everything. MANAGER: everything except settings and users. STAFF: reservations and floor plan. The last active owner cannot be demoted or deactivated, nobody can change their own role, users are deactivated rather than deleted. Everyone can change their name, password and interface language.

**Settings (owner).** Restaurant name, tagline and description per language, address and contacts, Impressum data and privacy texts (Austrian requirements), working hours per weekday, booking rules (durations, buffer, horizon, party size).

**Emails.** Confirmation, reminder and cancellation in DE/EN/UK, React Email templates, dates in Vienna time. Skipped for walk-ins and guests without a real email; sending is optional (no Resend key, no emails).

**Public site.** Landing (hero, open-now status, current offer, menu and gallery previews, contact with map), menu with category navigation, promotions, gallery with lightbox, booking form and confirmation page, Impressum, privacy policy, localized 404.

**i18n.** Admin interface per user (Ukrainian by default), public site by URL (`/de`, `/en`, `/ua`; German by default). `<html lang>` follows the active language. API errors are codes translated on the client.

## Screenshots

| | |
|---|---|
| ![Reservation list](docs/media/admin-reservations-desktop.png) Reservation list | ![Floor plan](docs/media/admin-floor-plan-desktop.png) Floor plan: free, soon, occupied, inactive |
| ![Walk-in dialog](docs/media/admin-table-modal-walkin-desktop.png) Seating a walk-in | ![New reservation](docs/media/admin-new-reservation-desktop.png) New reservation with live slots |
| ![Menu admin](docs/media/admin-menu-desktop.png) Menu | ![Menu item form](docs/media/admin-menu-item-form-desktop.png) Dish form with language tabs |
| ![Promotions](docs/media/admin-promotions-desktop.png) Promotions | ![Gallery](docs/media/admin-gallery-desktop.png) Gallery |
| ![Settings](docs/media/admin-settings-desktop.png) Settings | ![Users](docs/media/admin-users-desktop.png) Users and roles |
| ![Landing](docs/media/public-landing-desktop.png) Public landing page | ![Public menu](docs/media/public-menu-desktop.png) Public menu |

**One screen, three languages**

| Deutsch | English | Українська |
|---|---|---|
| ![DE](docs/media/admin-floor-plan-de-desktop.png) | ![EN](docs/media/admin-floor-plan-en-desktop.png) | ![UK](docs/media/admin-floor-plan-uk-desktop.png) |

**Mobile**

| Floor plan | Walk-in | Reservations | Booking | Landing |
|---|---|---|---|---|
| <img src="docs/media/admin-floor-plan-mobile.png" width="180" alt="Floor plan on a phone"> | <img src="docs/media/admin-table-modal-walkin-mobile.png" width="180" alt="Walk-in on a phone"> | <img src="docs/media/admin-reservations-mobile.png" width="180" alt="Reservations on a phone"> | <img src="docs/media/public-booking-mobile.png" width="180" alt="Booking form on a phone"> | <img src="docs/media/public-landing-mobile.png" width="180" alt="Landing page on a phone"> |

All screenshots: [docs/media](docs/media).

## Architecture

```mermaid
flowchart LR
    subgraph Browser
        P["Public site<br>/de /en /ua"]
        AD["Admin panel<br>/admin"]
    end
    subgraph Vercel["Vercel · Next.js 15 App Router"]
        MW["middleware.ts<br>admin navigation guard"]
        PUB["Public pages<br>ISR, 5 min"]
        ADM["Admin pages<br>dynamic, ProtectedAdminPage"]
        API["API routes<br>session + role checks, zod"]
        LIB["lib/booking<br>allocator · lock · slots"]
        CRON["Vercel Cron<br>daily 09:00 UTC"]
    end
    DB[("Neon Postgres<br>pooled")]
    RS["Resend"]

    P --> PUB
    P --> API
    AD --> MW --> ADM
    AD --> API
    API --> LIB --> DB
    PUB --> DB
    ADM --> DB
    API -. after response .-> RS
    CRON --> API
```

```
app/
  (public)/[locale]/   public site: landing, menu, promotions, gallery, booking, legal pages
  admin/               admin pages, each wrapped in <ProtectedAdminPage>
  api/                 route handlers (admin, public, cron)
components/            admin/ and public/ React components
lib/
  booking/             allocator, advisory lock, slots, durations, settings
  public/vienna-time.ts  Europe/Vienna helpers
  email/               Resend client, senders, React Email templates
  auth.ts, api-route.ts, api-error.ts, rate-limit.ts, promotions.ts, …
i18n/, messages/       locale config, de/en/uk message files
prisma/                schema, seed, demo seed, demo media
scripts/               i18n check, screenshots, demo media, demo clock
tests/                 Vitest unit tests, opt-in integration test
docs/                  audit, architecture decisions, roadmap, media
```

Design decisions and their trade-offs (JWT sessions, `/ua` vs `uk`, `db push`, auto-confirm, best fit, the lock, no UI kit, auth placement): [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Data model

```mermaid
erDiagram
    User ||--o{ Reservation : "created by"
    Table ||--o{ Reservation : "holds"
    MenuCategory ||--o{ MenuItem : contains
    MenuItem ||--o{ MenuItemVariant : "priced as"
    GalleryCategory ||--o{ GalleryImage : contains

    User {
        string email UK
        string password "bcrypt"
        enum role "OWNER MANAGER STAFF"
        bool isActive
        string locale "uk de en"
    }
    Table {
        string name UK
        int capacity
        int minCapacity
        enum zone
        float posX
        float posY
        bool isActive
    }
    Reservation {
        string guestName
        string guestPhone
        string guestEmail
        int guestCount
        datetime startTime
        datetime endTime
        enum status
        enum source "WEBSITE PHONE WALKIN ADMIN"
        string locale
    }
    MenuItem {
        string nameDE
        string nameEN
        string nameUK
        decimal price
        string allergens "EU allergen enum list"
        int spicyLevel
    }
    Promotion {
        string slug UK
        date startDate
        date endDate
        string daysOfWeek "0-6, empty means every day"
        string startTime
        string endTime
    }
    WorkingHours {
        int dayOfWeek UK
        string openTime
        string lastBookingTime
    }
    Setting {
        string key UK
        string value
    }
    Contact {
        string key UK
        string value
    }
```

Full schema: [prisma/schema.prisma](prisma/schema.prisma).

## Tech stack

- **App:** Next.js 15 (App Router, React 18), TypeScript (strict), Tailwind CSS 3
- **Data:** PostgreSQL on Neon, Prisma 5.22
- **Auth:** NextAuth 4 (credentials, JWT), bcrypt
- **i18n:** next-intl 3
- **Validation:** zod
- **Email:** Resend, React Email
- **Tooling:** Vitest, ESLint 9, Playwright (screenshots), GitHub Actions
- **Hosting:** Vercel (functions, cron), Cloudflare DNS

## Run locally

Requires Node 22 and a PostgreSQL database. A [Neon](https://neon.tech) branch is the easiest: it gives a pooled and a direct connection string, and keeps development data away from production.

```bash
npm ci                      # also runs prisma generate
cp .env.example .env        # fill in the values below
npm run db:push             # create the schema (uses DIRECT_URL)
npm run seed                # owner account, 5 tables, working hours, booking rules
npm run dev                 # http://localhost:3000 (public) and /admin/login
```

Or fill the database with the demo restaurant instead of `npm run seed`. **This wipes every table** and only runs when `DATABASE_URL` contains `DEMO_DB_HOST`:

```bash
npm run seed:demo           # Gasthaus Lindenhof: 3 users, 12 tables, menu, promotions, gallery, reservations
```

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | Pooled connection used by the app (`-pooler` host, `pgbouncer=true`) |
| `DIRECT_URL` | yes | Direct connection for the Prisma CLI (`db push`, `studio`) |
| `NEXTAUTH_SECRET` | yes | JWT signing secret |
| `NEXTAUTH_URL` | yes | Public base URL; also the website link in emails |
| `OWNER_EMAIL`, `OWNER_PASSWORD` | for `npm run seed` | First owner account (password min. 12 characters) |
| `RESEND_API_KEY` | no | Without it, no emails are sent |
| `RESEND_FROM_EMAIL` | no | Sender on a domain verified in Resend |
| `CRON_SECRET` | for reminders | Bearer token Vercel Cron sends; the cron route refuses to run without it |
| `REMINDER_HORIZON_HOURS` | no | Remind guests whose booking starts within this many hours (default 24) |
| `DEMO_DB_HOST`, `DEMO_PASSWORD` | for `seed:demo` | Guard for the destructive demo seed; password of the demo users |
| `TEST_DATABASE_URL` | no | Enables the database concurrency test |
| `UNSPLASH_ACCESS_KEY` | no | Only for `scripts/fetch-demo-media.ts` (re-picking demo photos) |

## Tests and CI

```bash
npx tsc --noEmit            # type check
npm run lint                # ESLint
npm run check:i18n          # same keys and placeholders in de/en/uk
npm test                    # Vitest, 58 unit tests
TEST_DATABASE_URL="postgresql://…" npm test   # + concurrency test on a disposable database
npm run build
```

Unit tests run with the host time zone set to `America/New_York`, so any code that depends on the server's zone fails. The allocator is tested through a fake Prisma client that evaluates the real `where` clauses.

The concurrency test creates one table and fires two, then five, simultaneous bookings for the same slot. A control case without the lock books the table twice (the race is real); with the lock exactly one request wins. It needs a real database, so CI skips it.

[CI](.github/workflows/ci.yml) runs on every push and pull request to `main`: install, Prisma client, type check, lint, i18n check, tests, production build. It uses dummy environment values; the build does not connect to a database.

## Deployment

Vercel, from `main`:

1. Create a Neon project; use the pooled string as `DATABASE_URL` and the direct one as `DIRECT_URL`.
2. Set all required variables in Vercel for Production and Preview. `NEXTAUTH_URL` must be the URL users open (custom domain in production).
3. Apply the schema from your machine: `npm run db:push` with `.env` pointing at that database, then `npm run seed` once.
4. Deploy. `vercel.json` schedules `/api/cron/reminders` daily at 09:00 UTC; Vercel sends `CRON_SECRET` as a bearer token.
5. Custom domain: a `CNAME` to `cname.vercel-dns.com` in Cloudflare, **DNS only** (grey cloud), so Vercel issues the certificate and serves the site directly.
6. Email: verify the sending domain in Resend and set `RESEND_API_KEY` and `RESEND_FROM_EMAIL`.

Screenshots and the GIF are regenerated with `scripts/screenshots.ts` against a seeded instance; `DEMO_CLOCK` (see the script header) pins the demo to an evening service at any real time of day.

## Security

- Every API route checks the session and role itself; middleware only redirects pages.
- Role and active flag are re-read from the database on every session read (cached ≤ 60 s per instance): deactivating a user ends their access. Sessions last 12 hours.
- Passwords hashed with bcrypt; the seed refuses short passwords and never logs them.
- Rate limits (per IP, in memory): booking 5 per 10 min, availability 60 per min, sign-in 10 per account and IP plus 30 per IP per 15 min, password change 5 per 15 min.
- Public booking: honeypot field, minimum fill time, zod validation, server-side source, status, opening hours and slot grid.
- `/api/availability` returns times only, never guest data, and only within the booking horizon.
- Errors are codes; Prisma messages and stack traces are logged, never returned.
- Cron route requires `CRON_SECRET` (constant-time comparison) in every environment.
- Headers: `X-Frame-Options: DENY` and `frame-ancestors 'none'`, `nosniff`, strict referrer policy, HSTS.
- No secrets in the repository; CI uses dummy values. Audit and its status: [docs/AUDIT.md](docs/AUDIT.md).

## Limitations

- **Single restaurant, single tenant.** Settings, working hours and tables are global.
- **`prisma db push`, no migration history.** Schema changes are not reviewed as SQL.
- **Polling, not realtime.** The floor plan refreshes every 30 seconds.
- **Images by URL.** No upload; photos are hosted elsewhere.
- **Reminders once a day.** Vercel Hobby allows one daily cron run, so a booking made after 09:00 UTC for the same evening gets no reminder.
- **Best-effort rate limits.** In memory per serverless instance, not global.
- **Greedy allocation.** Best fit per booking, no look-ahead, no combining tables; parties larger than the largest table cannot book online.
- **Untested API layer.** Unit tests cover the booking, time and content logic; authorization and route behaviour are verified by hand.
- **Analytics** is a "coming soon" page.
- **Dependency advisories** that need major upgrades (`next-intl` 4, `@react-email/components` 1.x, `next-auth` 5 / `@auth/core`) are not done yet; the affected features (next-intl middleware, the Auth.js email provider, React Email's code block) are not used here.

## Roadmap and changes

- [docs/ROADMAP.md](docs/ROADMAP.md)
- [CHANGELOG.md](CHANGELOG.md)

## License and contact

Proprietary, all rights reserved: the code is public for review, not for reuse. See [LICENSE](LICENSE).

Ivan Sytnik · [@IvanSytnik](https://github.com/IvanSytnik)
