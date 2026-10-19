# Audit — restaurant-crm

Date: 2026-10-19 · Branch: `audit-and-readme` (from `main` @ `1fc245f`, tag `pre-audit`)
Scope: full read of `app/`, `components/`, `lib/`, `i18n/`, `middleware.ts`, `prisma/`, config files.
Tooling run: `npx tsc --noEmit` (clean), `next lint` (no config, interactive prompt), `npm audit --omit=dev`,
i18n key diff over `messages/{de,en,uk}.json`.

Effort: **S** < 1 h · **M** 1–4 h · **L** > 4 h.

## Summary

| Severity | Count |
|---|---|
| Critical | 1 |
| High | 7 |
| Medium | 13 |
| Low | 16 |

What is already in good shape: every admin mutation re-checks the role inside the route handler; all request
bodies go through zod; settings and users are OWNER-only at the API level; `/api/availability` returns only
`HH:mm` strings (no guest data); the cron route fails closed in production; emails and the walk-in route
already format times through Europe/Vienna; i18n key sets are identical (600 keys each); `tsc` is clean;
no `dangerouslySetInnerHTML` anywhere; no `.DS_Store` is tracked.

---

## Critical

### C1. Double booking is possible under concurrent requests
- **Where:** `lib/booking/table-allocator.ts:25-63` + `app/api/public/reservations/route.ts:99-130`,
  `app/api/reservations/route.ts:58-93`, `app/api/reservations/walkin/route.ts:78-136`
- **What:** allocation is read-then-write with no transaction or lock. Two requests for the same slot both run
  `findBestTable()`, both see the smallest fitting table as free, and both `reservation.create()` on it.
  The same applies to a walk-in racing a web booking. No DB constraint backs the invariant.
- **Why it matters:** "no overlapping reservations per table" is the core guarantee of the product; it is
  silently violated exactly when demand is highest (Friday evening, two guests on the same slot).
- **Fix:** run allocation + insert inside `prisma.$transaction(async (tx) => …)` that first takes
  `SELECT pg_advisory_xact_lock(<constant>)` (single restaurant, low write volume, so one global lock is
  enough and cannot deadlock), then re-runs the conflict check with `tx` and inserts. `findBestTable` and the
  walk-in check get an optional `tx` client. Keeps best-fit strategy and `db push` (no exclusion constraint,
  which Prisma cannot express). Integration test gated on `TEST_DATABASE_URL`. **M**

## High

### H1. Deactivated or demoted users keep their access until the JWT expires (30 days)
- **Where:** `lib/auth.ts:48-63`, `components/admin/ProtectedAdminPage.tsx:13-20`, every `getServerSession` check
- **What:** `role` is copied into the token once at sign-in; `isActive` is only checked in `authorize()`.
  The `jwt` callback never re-reads the user, and NextAuth's default `maxAge` is 30 days.
- **Why:** an OWNER who deactivates a fired employee, or demotes a MANAGER to STAFF, has no effect on the
  existing session. The users page suggests otherwise.
- **Fix:** in the `jwt` callback, re-load `{ role, isActive }` from the DB (throttled, e.g. every 60 s via a
  `checkedAt` claim); return an empty token / `null` session when the user is inactive or gone. Keeps the JWT
  strategy and the adapter line untouched. **S–M**

### H2. Public booking API does not enforce working hours, closed days or the slot grid
- **Where:** `app/api/public/reservations/route.ts:73-110` (also the admin route `app/api/reservations/route.ts:39-62`)
- **What:** only past-time, horizon and guest-count are checked. A direct POST can book 03:00, a closed
  Monday, 18:07, or after `lastBookingTime`; the allocator will happily assign a table.
- **Why:** bots or curious users bypass the UI; staff find impossible reservations in the list and on the
  floor plan; these also block real slots.
- **Fix:** move the slot rule into `lib/booking/` (e.g. `isBookableSlot(dateStr, hhmm, workingHours)` using
  `viennaDayOfWeek` / `formatViennaTime`) and call it from the public route (error `OUTSIDE_HOURS`). For the
  admin route, enforce opening hours but allow off-grid times. **S–M**

### H3. Admin booking without email fails for any phone number containing spaces or parentheses
- **Where:** `components/admin/NewReservationForm.tsx:71`, `app/api/reservations/route.ts:20`
- **What:** the form sends `` `${form.guestPhone}@phone.local` `` as the email. `+43 664 1234567@phone.local`
  fails `z.string().email()` (verified), so the API returns 422 "Некорректные данные".
- **Why:** phone bookings are the main admin flow, and Austrian numbers are normally typed with spaces.
- **Fix:** strip non-digits/`+` when building the placeholder (or let the API accept an empty email and fill
  the placeholder server-side). **S**

### H4. `PATCH /api/reservations/[id]` can create overlaps and set forbidden states
- **Where:** `app/api/reservations/[id]/route.ts:8-42`
- **What:** any role (including STAFF) can set `tableId` to any string — no existence, capacity or overlap
  check (unknown id → FK error → 500). Moving `CANCELLED`/`NO_SHOW` back to `CONFIRMED` also skips the overlap
  check. `PENDING` is accepted although all reservations are auto-confirmed.
- **Why:** bypasses the allocator invariant (C1) through the admin UI/API.
- **Fix:** drop `PENDING` from the schema; when `tableId` changes or a cancelled reservation is re-activated,
  re-run the conflict check (shared helper, same lock as C1) and return `TABLE_BUSY` (409). **M**

### H5. Fire-and-forget emails can be dropped on Vercel
- **Where:** `app/api/public/reservations/route.ts:136`, `app/api/reservations/route.ts:97`,
  `app/api/reservations/[id]/route.ts:46`
- **What:** `sendConfirmation(...).catch()` is not awaited; once the response is sent the function instance
  may be frozen before Resend is called.
- **Why:** intermittent "guest never got the confirmation" with nothing in the logs.
- **Fix:** wrap in `after(() => …)` from `next/server` (stable in Next 15.1+). Response time is unchanged. **S**

### H6. Missing Vienna anchors in admin date/time code
- **Where:**
  - `app/admin/reservations/page.tsx:14-20` — "today" and day bounds via `setHours` / `new Date('YYYY-MM-DDT00:00:00')` (server TZ = UTC on Vercel)
  - `app/api/floor-status/route.ts:26-29` — same for the floor-plan day window
  - `components/admin/NewReservationForm.tsx:64` — `new Date(`${date}T${time}:00`)` in the **browser's** TZ
  - `components/admin/ReservationsClient.tsx:22-31,217`, `components/admin/TableModal.tsx:284`,
    `components/admin/FloorPlanClient.tsx:65` — `toLocaleTimeString` / `getDate()` in browser TZ
  - `app/api/public/reservations/route.ts:112`, `app/api/reservations/route.ts:71` — `date` column via `setHours`
- **What / why:** this is the bug class that already caused production incidents (see CLAUDE.md). Between
  00:00 and 02:00 Vienna the list shows yesterday; a manager whose laptop is not on Vienna time creates
  reservations shifted by the offset; local dev in Vienna stores `date` one day early.
- **Fix:** use `formatViennaDate(new Date())` for "today", `viennaIso(date, '00:00')` / next day for bounds,
  `viennaIso(date, time)` in the form, `formatViennaTime()` for display, the walk-in pattern for `date`.
  (Backlog "Pack C".) **M**

### H7. Known vulnerabilities in direct dependencies
- **Where:** `package.json`
- **What:** `npm audit --omit=dev`: 4 critical, 4 high, 5 moderate, 1 low. Relevant ones:
  `next@15.5.19` (advisories fixed in 15.5.21; the critical ones concern Server Actions, which this repo does
  not use, so exposure is lower), `next-auth@4.24.14` / `@auth/core` (fixed in 4.24.15 / `@auth/prisma-adapter`
  update), transitive `postcss`, `sharp`, `nanoid`, `source-map-js`, `uuid`.
  `next-intl@3` (open redirect in its middleware — not used here) and `@react-email/components` (prismjs)
  need major bumps.
- **Fix:** `npm audit fix` (non-breaking) + bump `next` to latest 15.5.x and `next-auth` to 4.24.15, then
  build. Leave majors (next-intl 4, react-email 1.x) for a separate change. Prisma stays on 5.22. **S**

## Medium

### M1. `<html lang>` is wrong on the public site
- **Where:** `app/layout.tsx:16-20`
- **What:** the root layout calls `getLocale()` without a request locale, so on `/de/...` it falls through to
  session → cookie → default `uk`. Anonymous visitors to the German site get `lang="uk"`.
- **Why:** screen readers pronounce German text with Ukrainian rules; SEO signals are wrong.
- **Fix:** have the root layout read the first URL segment (via a header set in `middleware.ts`, or by moving
  `<html>` into route-group layouts); map `ua → uk`. Admin keeps the user's DB locale. **S–M**

### M2. No ESLint config — `npm run lint` is interactive and cannot run in CI
- **Where:** repo root (no `eslint.config.*` / `.eslintrc*`); `package.json:9`
- **Fix:** add flat `eslint.config.mjs` extending `next/core-web-vitals` + `next/typescript` via
  `FlatCompat`; switch the script to `eslint .`. Fix or suppress what it reports. **S**

### M3. No brute-force protection on login and password change
- **Where:** `lib/auth.ts:23-45`, `app/api/profile/password/route.ts`
- **Fix:** apply `rateLimit()` keyed by IP + email inside `authorize()` (e.g. 10 / 15 min), same for
  current-password checks. Best-effort, consistent with the public endpoints. **S**

### M4. Promotion status ignores weekdays and hours, and uses server-TZ day boundaries
- **Where:** `lib/promotions.ts:12-30`
- **What:** `daysOfWeek`, `startTime`, `endTime` are never consulted, so a Mon–Fri lunch offer is shown as
  "active" in the landing banner on Sunday evening. `end.setHours(23,59,59)` runs in UTC on Vercel.
- **Fix:** compute "now" in Vienna (date, weekday, HH:mm) and check all three; keep date-only status for
  lists if wanted (`ACTIVE` vs "active right now"). **S**

### M5. Allocator look-back window can miss long reservations
- **Where:** `lib/booking/table-allocator.ts:79-87` (same in `walkin/route.ts:75-83`)
- **What:** only reservations that *start* within ±4 h are loaded, but durations are configurable up to
  480 min + 120 min buffer (`lib/settings-booking.ts:29-37`). A reservation starting 5 h earlier and lasting
  6 h is not seen.
- **Fix:** query by overlap directly (`startTime < newFreedAt AND endTime > newStart - buffer`) instead of a
  fixed window. One shared predicate for allocator, walk-in and PATCH. **S**

### M6. Inconsistent "blocking" statuses
- **Where:** allocator and availability exclude `CANCELLED, NO_SHOW`; walk-in and floor-status also exclude
  `COMPLETED` (`walkin/route.ts:81`, `floor-status/route.ts:40`).
- **What:** after staff marks a table COMPLETED early, a walk-in can seat it but the website still shows the
  slot as taken. Not dangerous, but the rule lives in four places.
- **Fix:** one exported constant `NON_BLOCKING_STATUSES` in `lib/booking/` (decide: include COMPLETED). **S**

### M7. Booking settings defaults and guest-count bounds disagree
- **Where:** `lib/booking/settings.ts:39` (`max_guests ?? 4`) vs `lib/settings-booking.ts:26` (`max_guests: 8`);
  guest-count max is 10 in `availability` and admin create, 20 in public create / walk-in / tables, 50 in settings.
- **What:** with no `max_guests` row the settings page shows 8 but the public form enforces 4.
- **Fix:** single source of defaults (`lib/booking/settings.ts` reads `BOOKING_DEFAULTS`); align bounds to one
  constant. **S**

### M8. Russian-only error texts in admin API routes
- **Where:** 20 occurrences, e.g. `app/api/reservations/route.ts:44,53,66,105,110`, `app/api/tables/route.ts:41,53`,
  `app/api/tables/[id]/route.ts:74`, `app/api/menu/categories/route.ts:11,56`, `app/api/menu/categories/[id]/route.ts:55`,
  `app/api/menu/items/route.ts:69`, `app/api/promotions/route.ts:52,82`, `app/api/gallery/categories/route.ts:51`,
  `app/api/gallery/categories/[id]/route.ts:54`, `app/api/availability/route.ts:47,52`, `app/api/reservations/walkin/route.ts:142,147`
- **What:** the admin UI is DE/EN/UK, the API answers in Russian, and some forms print `data.error` verbatim
  (`NewReservationForm.tsx:85`).
- **Fix:** return stable codes (`{ error: 'SLUG_TAKEN', params }`, as walk-in already does) and translate in
  the client via a shared `apiErrors.*` namespace in all three message files. **M**

### M9. `.env.example` is incomplete
- **Where:** `.env.example`
- **What:** missing `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `CRON_SECRET`, `REMINDER_HORIZON_HOURS`
  (all read in code) and the planned `DIRECT_URL`; comments are in Russian.
- **Fix:** complete it, English comments, no real values. **S**

### M10. Neon connection: no pooled URL, no `directUrl`
- **Where:** `prisma/schema.prisma:9-12`, `.env`
- **What:** the non-pooled endpoint is used from serverless functions. Cold Neon computes produce `P1017`
  and many concurrent functions can exhaust connections.
- **Fix:** `DATABASE_URL` = `-pooler` host with `?pgbouncer=true&connect_timeout=15`, add
  `directUrl = env("DIRECT_URL")` for `db push`. Requires setting `DIRECT_URL` in Vercel before deploying
  (manual step). **S** (+ manual)

### M11. Entire public site is `force-dynamic`
- **Where:** `app/(public)/[locale]/layout.tsx:9` and every public page
- **What:** each view of menu / gallery / promotions queries Postgres; with Neon cold starts this is the slowest
  path on the site.
- **Fix:** `export const revalidate = 300` on menu, gallery, promotions, landing; call `revalidatePath` from
  the admin mutation routes. Booking pages stay dynamic. **M**

### M12. Accessibility gaps
- **Where:**
  - `components/admin/NewReservationForm.tsx:251-267` (`Field`): `<label>` not associated with its input
    (no `htmlFor`/`id`, not wrapping). Same pattern in `TableModal.tsx:220,240,250`.
  - `components/admin/TableModal.tsx:36-69`: modal has no `role="dialog"`/`aria-modal`, no Escape handler,
    no initial focus.
  - Floor-plan table buttons (`FloorPlanClient.tsx:111-131`): FREE status is conveyed by colour only; no
    `aria-label` with name + status.
  - Hardcoded English `aria-label`s: `AdminShell.tsx:154,193`, `TableModal.tsx:50`, `CategoriesClient.tsx:128,138`,
    `GalleryCategoriesClient.tsx:126,136`.
  - INACTIVE tables: `text-gray-500` on `bg-gray-100` ≈ 4.4:1 (just below AA for small text).
- **Fix:** associate labels, dialog semantics + Escape, `aria-label` via i18n, darken inactive text. **M**

### M13. Index does not match the hot queries
- **Where:** `prisma/schema.prisma:150-152`
- **What:** floor-status, the reservations list and the cron job filter all reservations by `startTime`
  range; the only `startTime` index is the composite led by `tableId`. `@@index([date])` serves no query
  (the `date` column is never read).
- **Fix:** add `@@index([startTime])` (and keep `[tableId, startTime, endTime]` for the allocator). Apply with
  `db push` on the demo branch first. **S**

## Low

| # | Where | What | Fix | Effort |
|---|---|---|---|---|
| L1 | `app/api/menu/items/[id]/route.ts:70` | `as any` on the update payload | type as `Prisma.MenuItemUpdateInput` | S |
| L2 | DELETE handlers in `reservations/[id]`, `tables/[id]`, `menu/*/[id]`, `promotions/[id]`, `gallery/*/[id]` | no try/catch; unknown id → unhandled Prisma error, framework 500 | wrap, map `P2025` → 404 | S |
| L3 | `tables/route.ts:52`, `menu/categories/route.ts:55`, `promotions/route.ts:81`, `gallery/categories/route.ts:50` | unique violation detected by `message.includes('Unique')`; PATCH routes do not handle it (slug clash → 500) | check `P2002` code in a shared helper | S |
| L4 | `tables/[id]/route.ts:45`, `promotions/[id]/route.ts:38` | PATCH skips `minCapacity ≤ capacity` and `endDate ≥ startDate` checks that POST has | apply same checks on merged values | S |
| L5 | `app/admin/reservations/page.tsx:17,25` | `date` and `status` query params used unvalidated (`as ReservationStatus`) → Prisma error page | validate with zod, fall back to today / no filter | S |
| L6 | `app/api/cron/reminders/route.ts:25-35` | runs unauthenticated when `CRON_SECRET` is unset outside production; non-constant-time compare | require the secret everywhere (dev can set one); `timingSafeEqual` | S |
| L7 | `app/(public)/[locale]/promotions/...`, `lib/format.ts:26-35` | `formatDateRange` uses host TZ for `@db.Date` values | format with `timeZone: 'UTC'` (date-only values are stored as UTC midnight) | S |
| L8 | `package.json` | `date-fns` unused; `calculateBookingTimes`, `getGuestDuration` (only internal), `isValidUrlLocaleSegment` unused | remove dependency and dead exports | S |
| L9 | `.gitignore` | `.DS_Store` listed twice; untracked stray dir `app/{,(public)` exists locally | dedupe; delete the local stray dir by hand | S |
| L10 | `components/admin/ReservationsClient.tsx:20,49-56` | status dropdown offers `PENDING`; failed PATCH is silently ignored | drop PENDING, show error toast/text | S |
| L11 | `components/admin/settings/LegalTab.tsx:126-159`, `GeneralTab.tsx:137,140`, `TableModal.tsx:244` | hardcoded labels/placeholders ("Impressum (DE)", "Політика приватності (UK)", "Walk-in") | move to messages | S |
| L12 | `prisma/seed.ts:72-78` | re-running the seed resets admin-tuned booking settings (`update: { value }`); Russian log lines | `update: {}`; English logs | S |
| L13 | `next.config.mjs` | no security headers (`X-Frame-Options`/`frame-ancestors`, `X-Content-Type-Options`, `Referrer-Policy`) — admin can be framed | add `headers()` | S |
| L14 | `app/api/availability/route.ts:14-17` | accepts any date (past, years ahead) → cheap occupancy enumeration; no names leak | clamp to today … today + horizon | S |
| L15 | `app/layout.tsx:17-22` | root provider ships the full message bundle (admin + public, 600 keys × locale) to every client page | pass only needed namespaces | S |
| L16 | `lib/rate-limit.ts:54-59`, `components/public/PublicBookingForm.tsx:10-19` | IP taken from first `X-Forwarded-For` entry (fine on Vercel, spoofable elsewhere); public form's "today" uses the guest's browser date | document the Vercel assumption; use `formatViennaDate` for min date | S |

DST note (informational): `viennaOffsetForDate()` probes 12:00 UTC, so a time between 00:00 and 03:00 on the
last Sunday of March/October would get the post-switch offset. Unreachable with realistic opening hours, but
the Phase 3 tests will pin the behaviour for 11:00–23:00 on both switch days.

---

## API route matrix

Session = `getServerSession` required. Role column is what the handler enforces (middleware only covers pages).

| Route | Method | Session | Role | zod | Notes |
|---|---|---|---|---|---|
| `/api/auth/[...nextauth]` | GET, POST | — | — | — | no login rate limit (M3) |
| `/api/availability` | GET | no | public | yes | 60/min/IP; no guest data; any date accepted (L14) |
| `/api/public/reservations` | POST | no | public | yes | 5/10 min/IP, honeypot, 3 s min fill; no hours check (H2); race (C1) |
| `/api/cron/reminders` | GET | Bearer `CRON_SECRET` | — | — | fail-closed in prod only (L6) |
| `/api/floor-status` | GET | yes | any | — | UTC day window (H6) |
| `/api/reservations` | POST | yes | any | yes | Russian errors (M8); race (C1) |
| `/api/reservations/[id]` | PATCH | yes | any | yes | no overlap/table check, PENDING allowed (H4) |
| `/api/reservations/[id]` | DELETE | yes | not STAFF | — | no try/catch (L2) |
| `/api/reservations/walkin` | POST | yes | any | yes | error codes OK; race (C1) |
| `/api/tables` | GET / POST | yes | any / not STAFF | — / yes | |
| `/api/tables/[id]` | GET / PATCH / DELETE | yes | any / not STAFF / not STAFF | — / yes / — | L4, L2 |
| `/api/menu/categories` | GET / POST | yes | any / not STAFF | — / yes | |
| `/api/menu/categories/[id]` | PATCH / DELETE | yes | not STAFF | yes / — | |
| `/api/menu/items` | GET / POST | yes | any / not STAFF | — / yes | |
| `/api/menu/items/[id]` | PATCH / DELETE | yes | not STAFF | yes / — | `as any` (L1) |
| `/api/menu/reorder` | POST | yes | not STAFF | yes | |
| `/api/promotions` | GET / POST | yes | any / not STAFF | — / yes | |
| `/api/promotions/[id]` | PATCH / DELETE | yes | not STAFF | yes / — | L4 |
| `/api/gallery` | GET / POST | yes | any / not STAFF | — / yes | |
| `/api/gallery/[id]` | PATCH / DELETE | yes | not STAFF | yes / — | |
| `/api/gallery/categories` | GET / POST | yes | any / not STAFF | — / yes | |
| `/api/gallery/categories/[id]` | PATCH / DELETE | yes | not STAFF | yes / — | |
| `/api/gallery/reorder` | POST | yes | not STAFF | yes | |
| `/api/settings/booking` | GET / PATCH | yes | OWNER | yes | |
| `/api/settings/contact` | GET / PATCH | yes | OWNER | yes | |
| `/api/settings/working-hours` | GET / PATCH | yes | OWNER | yes | |
| `/api/users` | GET / POST | yes | OWNER | yes | |
| `/api/users/[id]` | GET / PATCH | yes | OWNER | yes | last-owner + self-demotion guards |
| `/api/users/[id]` | DELETE | no | — | — | always 405, harmless |
| `/api/users/[id]/password` | POST | yes | OWNER | yes | |
| `/api/profile` | PATCH | yes | self | yes | |
| `/api/profile/password` | POST | yes | self | yes | no rate limit (M3) |
| `/api/user/locale` | POST | yes | self | yes | |

Result: STAFF cannot mutate menu, promotions, gallery, tables, settings or users; users and settings are
OWNER-only. The only role gap is H4 (STAFF can reassign tables without checks) and H1 (stale roles).

## i18n

- Key parity: `de` = `en` = `uk` = 600 keys, no missing or extra keys.
- Hardcoded strings: M8 (API, Russian), L11 (admin forms), M12 (aria-labels).
- `<html lang>`: wrong on public pages (M1). `/ua ↔ uk`: handled in `i18n/config.ts` + `lib/public/locale.ts`;
  `middleware.ts` does not touch public routes, which is correct (unknown segment → `notFound()`).

---

## Proposed Phase 2 fix list

Order = commit order; each line is one commit. Grouped so `tsc` / lint / build run after each group.

**Group A — tooling & hygiene (backlog Pack C part 1)**
1. `chore: add ESLint flat config` (M2) — then fix whatever it flags in separate commit(s)
2. `chore: complete .env.example` (M9)
3. `chore: dedupe .gitignore, drop unused date-fns and dead exports` (L8, L9)
4. `chore(deps): patch next, next-auth and transitive advisories` (H7, non-breaking only)

**Group B — booking correctness**
5. `fix(booking): serialize allocation with an advisory lock` (C1)
6. `fix(booking): query conflicts by overlap instead of a 4h window` (M5) + shared blocking-status constant (M6)
7. `fix(api): enforce working hours and slot grid on bookings` (H2)
8. `fix(api): re-check conflicts when a reservation changes table or is re-activated; drop PENDING` (H4, L10)
9. `fix(booking): single source for booking defaults and guest bounds` (M7)
10. `fix(admin): sanitize phone in placeholder email` (H3)
11. `fix(email): send via after() so Vercel does not drop it` (H5)

**Group C — timezones & i18n (backlog Pack C part 2)**
12. `fix(admin): anchor reservation list and floor status to Vienna time` (H6)
13. `fix(promotions): evaluate status in Vienna time incl. weekdays and hours` (M4, L7)
14. `fix(i18n): set <html lang> from the URL on the public site` (M1)
15. `fix(api): return error codes instead of Russian text; translate in the client` (M8, L11)

**Group D — auth & hardening**
16. `fix(auth): re-validate role and isActive in the jwt callback` (H1)
17. `fix(auth): rate-limit login and password change` (M3)
18. `fix(api): shared Prisma error mapping (P2002/P2025), PATCH validation parity` (L2, L3, L4, L5)
19. `fix(cron): require CRON_SECRET in every environment` (L6)
20. `feat: security headers` (L13)

**Group E — performance, data, a11y** (optional, can be deferred)
21. `perf(db): index reservations by startTime` (M13) — `db push` on demo branch only
22. `perf(public): ISR for menu, gallery, promotions with revalidatePath` (M11)
23. `fix(a11y): label association, dialog semantics, translated aria-labels` (M12)
24. `chore(db): pooled Neon URL + directUrl` (M10) — needs `DIRECT_URL` in Vercel first

Deferred unless you say otherwise: L12, L14, L15, L16, major upgrades (next-intl 4, react-email 1.x).
