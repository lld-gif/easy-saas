/**
 * Minimal in-memory sliding-window rate limiter.
 *
 * Intended for launch-day abuse protection on public POST endpoints
 * (newsletter subscribe, saves toggle, package generation). Chose
 * in-memory over Upstash / Vercel KV because:
 *   - No new paid dependency for launch.
 *   - The protection is "good enough" — each Vercel lambda instance
 *     enforces its own counter. A determined attacker can fan out
 *     across cold-started instances, but casual spam (one IP hammering
 *     one endpoint) hits the same warm instance and is throttled.
 *   - Launch traffic is small; two lambda instances would be unusual.
 *
 * Post-launch upgrade path: swap the `Map` for Upstash Ratelimit if
 * abuse volume ever justifies a distributed counter. The handler-side
 * interface (`rateLimit(key, config)`) stays the same.
 *
 * Sliding-window algorithm: each key stores an array of request
 * timestamps. On check, we drop timestamps older than `windowMs`,
 * count what remains, and reject if ≥ `max`. Cheap memory footprint
 * because entries auto-prune on each call.
 *
 * Key construction is the caller's responsibility. Recommended:
 *   - `save:${userId}`                 — per-user (authed endpoint)
 *   - `newsletter:${ip}`               — per-IP (unauthed endpoint)
 *   - `package_gen:${userId}`          — per-user LLM spend guard
 */

type Timestamps = number[]

const BUCKETS = new Map<string, Timestamps>()

/**
 * Upper bound on the number of distinct keys we'll remember. If we blow
 * past this the oldest key is evicted to keep process memory bounded.
 * 10k keys × ~8 bytes/timestamp × ~20 timestamps avg ≈ 1.6 MB worst case.
 */
const MAX_KEYS = 10_000

export interface RateLimitConfig {
  /** Max requests allowed in the window. */
  max: number
  /** Window width in milliseconds. */
  windowMs: number
}

export interface RateLimitResult {
  /** True = request allowed. False = 429. */
  ok: boolean
  /** How many requests remain in the current window. */
  remaining: number
  /**
   * Unix timestamp (ms) when the earliest request in the window
   * expires — i.e. when the caller will get back at least one slot.
   * Useful for the `Retry-After` header.
   */
  resetAt: number
}

export function rateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now()
  const cutoff = now - config.windowMs

  let timestamps = BUCKETS.get(key) ?? []
  // Drop expired entries. Assumes timestamps are push-appended so the
  // array is sorted ascending — we only need to find the first valid
  // index and slice from there.
  if (timestamps.length > 0) {
    let firstValid = 0
    while (
      firstValid < timestamps.length &&
      timestamps[firstValid] <= cutoff
    ) {
      firstValid++
    }
    if (firstValid > 0) {
      timestamps = timestamps.slice(firstValid)
    }
  }

  if (timestamps.length >= config.max) {
    // Rejected. Don't record the attempt — refusing spam attempts is
    // itself cheap; recording them would indefinitely extend the
    // window as long as the attacker keeps probing.
    BUCKETS.set(key, timestamps)
    return {
      ok: false,
      remaining: 0,
      resetAt: timestamps[0] + config.windowMs,
    }
  }

  timestamps.push(now)
  BUCKETS.set(key, timestamps)

  // Crude eviction: if we've drifted above the key cap, drop the
  // oldest insertion. Map iteration is insertion-ordered, so the
  // first key via BUCKETS.keys() is the oldest.
  if (BUCKETS.size > MAX_KEYS) {
    const oldest = BUCKETS.keys().next().value
    if (oldest) BUCKETS.delete(oldest)
  }

  return {
    ok: true,
    remaining: config.max - timestamps.length,
    resetAt: timestamps[0] + config.windowMs,
  }
}

/**
 * Best-effort caller-IP extraction from a Next.js / Vercel `Request`.
 * On Vercel, `x-forwarded-for` is set by the edge and contains the real
 * client IP first. On localhost it's often absent → falls back to "unknown"
 * which still rate-limits (all local requests collide on one bucket).
 */
export function callerIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for")
  if (fwd) return fwd.split(",")[0].trim()
  const real = request.headers.get("x-real-ip")
  if (real) return real.trim()
  return "unknown"
}

/**
 * Helper to build a 429 response that matches the existing API error
 * shape. Sets `Retry-After` (seconds, per RFC) so well-behaved clients
 * back off.
 */
export function rateLimitResponse(result: RateLimitResult): Response {
  const retrySecs = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000))
  return new Response(
    JSON.stringify({ error: "Rate limit exceeded. Please try again soon." }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retrySecs),
      },
    }
  )
}
