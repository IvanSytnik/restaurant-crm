# Changelog

Versions before 1.0.0 are reconstructed from the git history; the project was
developed in "packs" and was not tagged at the time. Dates are commit dates.

## [1.0.0] – 2026-10-20

Audit, hardening, tests and documentation. Findings and their status:
[docs/AUDIT.md](docs/AUDIT.md).

### Booking correctness
- Allocation and insert run inside one transaction holding a Postgres advisory
  lock (`pg_advisory_xact_lock`), so concurrent requests can no longer
  double-book a table. Same lock for walk-ins and for table moves.
- Conflicts are found by interval overlap instead of a ±4 h window, so long
  reservations are never missed.
- One list of non-blocking statuses (cancelled, no-show, completed) everywhere.
- Public bookings are rejected outside opening hours, on closed days and off
  the 15-minute slot grid. Admin bookings stay unrestricted.
- Moving a reservation to another table or re-activating a cancelled one
  re-checks conflicts; `PENDING` can no longer be set.
- Admin bookings without email work for phone numbers with spaces.
- Booking defaults come from one place; party size is capped at 20 everywhere;
  the admin form accepts any size up to the `max_guests` setting.

### Time zones
- Admin reservation list, floor status, both booking forms and the `date`
  column use the Europe/Vienna calendar; `viennaIso()` is correct for times
  before the switch on DST days.
- Promotion status uses the Vienna calendar; the landing banner and the admin
  "Live now" badge also check weekdays and hours.

### Security
- Role and `isActive` are re-checked from the database on every session read
  (cached ≤ 60 s per instance); deactivated users lose access immediately.
  Sessions last 12 hours.
- Rate limits on sign-in (10 per account and IP, 30 per IP / 15 min) and on
  password changes.
- Cron requires `CRON_SECRET` in every environment, compared in constant time.
- Baseline security headers (no framing, nosniff, referrer policy, HSTS).
- Errors are stable codes, never Prisma messages; unknown ids return 404.
- Patched `next` 15.5.28 and `next-auth` 4.24.15.

### i18n and accessibility
- `<html lang>` follows the URL on the public site (separate root layouts).
- API errors are codes translated on the client (no Russian text in the API).
- Labels bound to inputs, the table modal is a proper dialog, floor-plan
  tiles announce their status, aria-labels are translated.

### UI
- Floor plan fits the screen on phones (tiles 44–88 px, scroll with an edge
  hint below 500 px); it was cut off on the right before.
- Admin header shows the restaurant name from settings.
- Placeholder contacts (`…@phone.local`, `-`) are hidden in the list.

### Performance and infrastructure
- Public pages use ISR (5 min, revalidated on admin edits); admin pages are
  always dynamic; the build needs no database.
- Index on `reservations.startTime`.
- Neon pooled connection at runtime, `DIRECT_URL` for the Prisma CLI.
- Confirmation and cancellation emails are sent with `after()`.

### Tooling
- ESLint flat config, Vitest (58 unit tests, opt-in database concurrency
  test), `check-i18n` script, GitHub Actions CI.
- Demo seed for the fictional "Gasthaus Lindenhof", Playwright screenshot and
  GIF script, `DEMO_CLOCK` for reproducible screenshots.
- New README, architecture notes, roadmap, this changelog, license.

## [0.6.0] – 2026-10-14
- Seed requires `OWNER_PASSWORD` (min. 12 characters) and no longer logs
  credentials.
- Local development notes are no longer tracked.

## [0.5.0] – 2026-09-19 · Pack A "demo blockers"
- `POST /api/reservations` requires a session; `source` limited to
  phone / walk-in / admin; author taken from the session.
- Reminder cron fails closed in production without `CRON_SECRET`;
  `vercel.json` schedules it daily.
- `/api/availability` rate-limited to 60 requests per minute per IP.
- Walk-in endpoint restored (it had been deleted by accident) with a conflict
  check, Vienna dates and localized error codes.
- `/admin` redirects to the reservation list; analytics shown as
  "coming soon"; placeholder favicon.

## [0.4.0] – 2026-06-29 … 2026-07-31
- Email dates and times pinned to Europe/Vienna.
- Availability slots and booking submission pinned to Europe/Vienna (slots
  were two hours off on the UTC server).

## [0.3.0] – 2026-06-06 … 2026-06-07 · Public site
- Public website at `/de`, `/en`, `/ua` (landing, menu, promotions, gallery,
  legal pages).
- Public booking form with rate limit, honeypot and minimum fill time;
  confirmation email for web bookings.

## [0.2.0] – 2026-06-03 … 2026-06-04
- Promotions and gallery with editable categories.
- User management and self-service profile.
- Settings: general, legal, working hours, booking rules.
- Confirmation, reminder and cancellation emails via Resend.

## [0.1.0] – 2026-06-02 · Initial CRM
- Reservations with best-fit table allocation, floor plan, tables, menu with
  allergens and variants, DE/EN/UK interface, credentials sign-in with roles.
- Deployed on Vercel.
