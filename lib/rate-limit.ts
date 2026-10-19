/**
 * Simple in-memory rate limiter for public endpoints.
 *
 * Caveat: Vercel runs multiple serverless instances, so this is best-effort
 * per-instance, not strict global. Good enough to deter casual bots and
 * accidental floods. For strict global limits, migrate to Upstash Redis.
 */

type Bucket = { count: number; resetAt: number }
const buckets = new Map<string, Bucket>()

/**
 * Periodically evict expired buckets so the map doesn't grow forever.
 * Skipped during build (no setInterval in edge contexts is fine because
 * this module is only imported in Node runtime API routes).
 */
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, b] of buckets) {
      if (now > b.resetAt) buckets.delete(key)
    }
  }, 60_000).unref?.()
}

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSec: number }

export function rateLimit(
  key: string,
  limit = 5,
  windowMs = 10 * 60 * 1000
): RateLimitResult {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true }
  }

  if (bucket.count >= limit) {
    return { allowed: false, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) }
  }

  bucket.count++
  return { allowed: true }
}

/**
 * Get the client IP from request headers. On Vercel the platform sets
 * x-forwarded-for itself, so the first entry is the real client. Behind a
 * proxy that passes the header through unchanged it would be spoofable.
 */
export function getClientIp(req: Request): string {
  return clientIpFromHeaders((name) => req.headers.get(name))
}

/** Same as getClientIp, for NextAuth's plain-object request headers. */
export function getClientIpFromRecord(
  headers: Record<string, string | string[] | undefined> | undefined
): string {
  return clientIpFromHeaders((name) => {
    const v = headers?.[name]
    return Array.isArray(v) ? v[0] : (v ?? null)
  })
}

function clientIpFromHeaders(get: (name: string) => string | null): string {
  const fwd = get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  const real = get('x-real-ip')
  if (real) return real.trim()
  return 'unknown'
}
