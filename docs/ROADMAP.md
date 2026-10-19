# Roadmap

Ordered by value for a single restaurant running the system day to day.
Nothing here is promised; it is the list of known next steps.

## Next

- **Migration history.** Switch from `prisma db push` to `prisma migrate` with
  a baseline migration, so schema changes are reviewed and reversible.
- **API tests.** Route-level tests for authorization (STAFF / MANAGER / OWNER
  matrix), validation and error codes; today these are verified manually.
- **Strict global rate limiting.** Move the in-memory limiter to a shared
  store (e.g. Upstash Redis) so limits hold across serverless instances.
- **Same-day reminders.** Vercel Hobby runs cron once a day; on a paid plan,
  run the reminder job hourly with a shorter horizon.

## Later

- **Analytics** (currently a placeholder): covers per day, no-show rate,
  bookings by source, table utilisation.
- **Image upload** (e.g. Vercel Blob) instead of image URLs.
- **Realtime floor plan** (server-sent events) instead of 30-second polling.
- **Table combining** for parties larger than the largest table.
- **Guest self-service**: cancel or change a booking from the confirmation
  email via a signed link.
- **Waitlist** for fully booked evenings.
- **City and branding from settings** in the public hero (the "Restaurant in
  Graz" eyebrow is still a translation string).

## Not planned

- Multi-tenant SaaS. The data model and settings assume one restaurant.
- Payments or deposits.
