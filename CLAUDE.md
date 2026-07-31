# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Next.js 15 (App Router) restaurant CRM: a public marketing/booking site (menu, promotions, gallery, reservation form) plus an internal admin panel (reservations, floor plan, tables, menu/promotions/gallery management, settings, users). Postgres via Prisma, NextAuth credentials login, next-intl for DE/EN/UK i18n, Resend for transactional email.

## Commands

```bash
npm run dev          # dev server
npm run build        # production build
npm run lint         # next lint
npm run db:push      # push prisma/schema.prisma to the DB (no migration files)
npm run db:migrate   # prisma migrate dev (creates a migration)
npm run db:studio    # Prisma Studio
npm run seed         # tsx prisma/seed.ts — upserts OWNER user + sample tables
```

There is no test runner configured in this repo. Verify changes via `npm run lint`, `tsc` (no dedicated script — run `npx tsc --noEmit`), and manual testing with `npm run dev`.

Required env vars (see `.env.example`): `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `OWNER_EMAIL`, `OWNER_PASSWORD`. Email sending (`lib/email/client.ts`) additionally needs a Resend API key — sending is a no-op (`isEmailEnabled()` false) when not configured, so email features degrade gracefully without it.

## Architecture

### Two apps in one Next.js project

- **Public site** — `app/(public)/[locale]/**`. Locale-prefixed routes (`ua`/`de`/`en` in the URL, mapped internally to `uk`/`de`/`en` — see `i18n/config.ts` `urlToLocale`/`localeToUrl`). Its own layout (`app/(public)/[locale]/layout.tsx`) wraps pages in `NextIntlClientProvider` with URL-driven locale, plus `PublicHeader`/`PublicFooter`. Public default locale is German.
- **Admin CRM** — `app/admin/**`, not locale-prefixed. Each protected page renders its content inside `<ProtectedAdminPage>` (`components/admin/ProtectedAdminPage.tsx`), which does the session check + redirect and resolves the *logged-in user's* locale from `User.locale` in the DB (independent of the public site's URL-based locale). CRM defaults to Ukrainian.
- Both trees share the same `messages/{de,en,uk}.json` translation files and the root `app/layout.tsx`, but resolve "current locale" through different mechanisms — see `i18n/request.ts` for the full precedence chain (explicit `requestLocale` → session user's DB locale → `NEXT_LOCALE` cookie → default). Server components on the public side must pass `locale` explicitly to `getTranslations`/data helpers rather than relying on session-derived locale, or they'll pick up the logged-in admin's locale instead.

### Auth & authorization

- NextAuth credentials provider (`lib/auth.ts`), JWT sessions, bcrypt password hashes, Prisma adapter. Roles: `OWNER > MANAGER > STAFF` (`UserRole` enum).
- Route-level gating happens in `middleware.ts`: STAFF is restricted to `/admin/reservations` and `/admin/floor-plan`; only OWNER can reach `/admin/users`. This is enforced again at the page level via `ProtectedAdminPage` (session redirect) and per-endpoint inside API routes (each route re-checks `session.user.role`, e.g. `app/api/tables/route.ts` blocks STAFF from POST). When adding a new admin resource, wire authorization in all three places, not just middleware.
- Public API routes (`app/api/public/**`) have no auth — they instead rely on `lib/rate-limit.ts` (in-memory, per-serverless-instance, best-effort — not a strict global limiter) plus honeypot fields and a minimum-fill-time check against bot submissions (see `app/api/public/reservations/route.ts`).

### Reservation/booking domain (`lib/booking/`)

- `duration.ts` — maps guest count → seating duration + buffer (`duration_1_2`, `duration_3_4`, `duration_5_plus`, `buffer_minutes`), configurable via `Setting` rows.
- `settings.ts` — `getBookingSettings()` reads those tunables (plus `booking_horizon`, `min_guests`, `max_guests`) from the `Setting` key/value table, with hardcoded fallbacks.
- `table-allocator.ts` — `findBestTable()` is the core allocation algorithm: filters tables by capacity/minCapacity, then picks the smallest fitting table whose existing reservations (within a 4h window, excluding CANCELLED/NO_SHOW) don't overlap the new slot plus buffer. Both the admin (`/api/reservations`) and public (`/api/public/reservations`) booking endpoints call the same allocator/settings helpers — keep booking-rule changes in `lib/booking/`, not duplicated in the route handlers.
- Reservation source (`WEBSITE`/`PHONE`/`WALKIN`/`ADMIN`) and status (`PENDING`/`CONFIRMED`/`SEATED`/`COMPLETED`/`CANCELLED`/`NO_SHOW`) drive downstream behavior — e.g. emails are skipped entirely for `WALKIN` source, and guest emails ending in `@phone.local`/`@walkin.local` (auto-filled placeholders when a guest has no real email) are treated as non-real (`lib/email/send.ts` `isRealGuestEmail`).

### Timezone handling — read before touching any date/time code

The restaurant operates in `Europe/Vienna`, but the server (Vercel) runs in UTC and guests' browsers run in arbitrary timezones. This has caused real production bugs (off-by-one-day dates, 2-hour-off availability slots) and is why `lib/public/vienna-time.ts` exists: every date/time parse and format that matters for booking correctness must go through `viennaIso()`, `formatViennaTime()`, `formatViennaDate()`, or `viennaDayOfWeek()` — never `new Date(dateStr + 'THH:mm:00')` without an explicit offset, and never rely on `date-fns format()`/`Date` methods' implicit local timezone. Email formatting (`lib/email/send.ts`) has its own Vienna-pinned `Intl.DateTimeFormat` formatters for the same reason. When fixing a date/time bug, check whether it's a missing-Vienna-anchor problem before doing anything else — this exact class of bug has recurred across availability, booking submission, and email formatting (see recent commit history).

### Email (`lib/email/`)

- `client.ts` — Resend client + `isEmailEnabled()`/`FROM_EMAIL`.
- `send.ts` — one function per email type (`sendConfirmation`, `sendReminder`, `sendCancellation`), each independently guarding on email-enabled, real-guest-email, source, status, and "already sent" (`confirmationSentAt`/`reminderSentAt`) before rendering and sending. All are designed to fail soft — callers fire-and-forget (`.catch(...)`) so email failures never break the booking HTTP response.
- `templates/` — React Email components; `i18n.ts` maps reservation locale → `EmailLocale` and holds subject-line strings.
- Reminders are sent via `app/api/cron/reminders/route.ts`, intended to be hit by a scheduled job (Vercel Cron or similar).

### Multi-language content model

Menu items/categories, promotions, and gallery categories store translatable text as parallel columns (`nameDE`/`nameEN`/`nameUK`, `descriptionDE`/... etc.) rather than a separate translations table — `nameEN`/`nameUK` are optional and fall back to German. Picking the right column for display goes through helpers like `lib/menu/i18n.ts` (`pickName`, `pickDescription`) rather than ad hoc ternaries — use those helpers for new UI rather than re-deriving the fallback logic.

### Data layer

- `prisma/schema.prisma` is the single source of truth for the data model — read it first when working on any feature (reservations, tables, menu, promotions, gallery, contacts, settings, working hours).
- `Setting` and `Contact` are both generic key/value tables (`lib/settings-booking.ts`, `lib/contacts.ts`) used for admin-configurable values (booking rules, restaurant contact info) instead of dedicated columns — check these before adding new schema fields for what might just be another setting/contact key.
- `lib/prisma.ts` follows the standard Next.js dev-mode singleton pattern to avoid exhausting DB connections on hot reload.

### Styling

Tailwind with a small custom palette (`cream`, `cream-soft`, `ink`, `ink-soft`, `accent`) defined via CSS variables in `rgb(var(--x-rgb) / <alpha-value>)` form (see `tailwind.config.ts` + `app/globals.css`) so opacity modifiers (`bg-cream/95`, etc.) work. Fonts: DM Sans (body), Playfair Display (display/headings).

## Known quirks

- There are several stray, effectively-empty directories under `app/` with garbled names starting with `app/{,(public)` — these are leftover artifacts from a broken archive extraction (contain only `.DS_Store` files, no code). Ignore them; the real public routes live under `app/(public)/[locale]/`.
- `README.md` is written for a non-technical restaurant-owner user recovering a deleted local copy of the project from a Neon-hosted database; it's not developer setup documentation beyond the env var list.
