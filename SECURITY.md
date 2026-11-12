# Security policy

## Supported versions

Only the latest commit on `main` is maintained. Fixes are not backported to
earlier versions listed in [CHANGELOG.md](CHANGELOG.md).

| Version | Supported |
|---|---|
| `main` (1.0.0 and later) | yes |
| < 1.0.0 | no |

## Reporting a vulnerability

Please **do not open a public issue** for a security problem.

Report it privately through GitHub:
[Security → Report a vulnerability](https://github.com/IvanSytnik/restaurant-crm/security/advisories/new).

If that form is not available, open an issue that only asks for a private
contact channel, without any details of the problem.

A useful report contains:

- the affected route, file or feature (e.g. `POST /api/public/reservations`,
  `lib/booking/lock.ts`);
- steps to reproduce, with the role you were signed in as (none, STAFF,
  MANAGER, OWNER);
- what you expected and what happened;
- the commit you tested against.

## Scope

In scope: the code in this repository, in particular authorization on the API
routes, the booking rules (double booking, opening hours), session handling,
the public booking endpoint and the reminder cron route.

Out of scope:

- Findings that need a stolen session or direct database access.
- The limitations documented in the README, e.g. rate limits that are in
  memory per serverless instance and therefore not global
  ([README → Limitations](README.md#limitations)).
- Advisories in dependencies whose affected feature is not used here
  (listed in [README → Limitations](README.md#limitations)), unless you can
  show they are reachable in this app.

The live demo runs on invented data only. Please test against your own
instance (see [README → Run locally](README.md#run-locally)) rather than the
demo, and never run load or denial-of-service tests against it.

## How the app is secured

The security measures (role checks in every API route, session re-validation,
rate limits, bot protection on the public form, headers, cron secret) are
listed in [README → Security](README.md#security). The audit that led to them,
with each finding's status, is in [docs/AUDIT.md](docs/AUDIT.md).
