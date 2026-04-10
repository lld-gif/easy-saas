/** Pure utility functions for signal display — safe for client components */

/**
 * True if a 0-100 percentile qualifies as "Popular" — used to render the
 * single scarcity badge across cards, rows, detail sidebar, and OG images.
 *
 * Threshold = 99th percentile. See Knowledge/Midrank Percentile Computation.
 *
 * Prefer `isPopularScore(score, threshold)` for rendering: it avoids shipping
 * the entire sorted score array to the client and removes the client-side
 * percentile computation from the hot path, which was the source of a
 * rank-1-to-~259 over-firing bug in the feature/popular-badge branch.
 */
export function isPopular(percentile: number): boolean {
  return percentile >= 99
}

/**
 * True if a raw popularity_score is at or above the server-computed p99
 * threshold. This is the correct primitive for UI rendering — the threshold
 * is computed once on the server in `getAggregateStats()` and passed as a
 * single number to client components. A score below the threshold (including
 * 0 for ideas with no score yet) returns false.
 *
 * Guard: `threshold <= 0` → always false, so brand-new deployments with no
 * indexed ideas don't light up every badge.
 */
export function isPopularScore(score: number, threshold: number): boolean {
  return threshold > 0 && score >= threshold
}

/**
 * @deprecated Use `isPopular()` and render a `<PopularBadge>` instead.
 * Retained so unused imports don't break the build during the migration.
 * The old five-tier labels ("Top 10%" etc.) were misleading because the
 * popularity_score distribution lacks the fidelity to distinguish mid-pack
 * ideas meaningfully — see Knowledge/Midrank Percentile Computation.
 */
export function formatPercentileLabel(percentile: number): string {
  return isPopular(percentile) ? "Popular" : ""
}

/**
 * Returns the 0-100 percentile rank for a given score against a sorted
 * (ascending) array of all scores. Uses midrank for ties so tied values
 * land in the middle of their rank range rather than the bottom —
 * otherwise heavy-tailed score distributions collapse everything to
 * "Top 1%" or "Bottom X%" with nothing in between. Pure function — safe
 * for client components.
 */
export function getPercentile(score: number, sortedScores: number[]): number {
  if (sortedScores.length === 0) return 50
  let below = 0
  let equal = 0
  for (const s of sortedScores) {
    if (s < score) below++
    else if (s === score) equal++
  }
  return Math.round(((below + equal / 2) / sortedScores.length) * 100)
}

/** Maps market_signal to a percentile-like value for display */
export function signalToPercentile(signal: string): number {
  switch (signal) {
    case "strong": return 85
    case "moderate": return 50
    case "weak": return 20
    default: return 0
  }
}

/**
 * Parse the upper-bound dollar amount from a revenue_potential string.
 * Handles formats like "$500-2k/mo", "$10k-50k/mo", "$200-1.5k/mo", "$0-300/mo".
 * Returns the upper bound in dollars, or 0 if unparseable.
 */
function parseRevenueUpperBound(revenue: string): number {
  if (!revenue || revenue === "unknown") return 0
  // Match the last number+optional k before /mo — that's the upper bound
  // e.g. "$500-2k/mo" → "2k", "$10k-50k/mo" → "50k", "$200-800/mo" → "800"
  const parts = revenue.match(/([\d.]+)(k)?/gi)
  if (!parts || parts.length === 0) return 0
  const upper = parts[parts.length - 1] // last numeric match is the upper bound
  const match = upper.match(/([\d.]+)(k)?/i)
  if (!match) return 0
  const num = parseFloat(match[1])
  const multiplier = match[2] ? 1000 : 1
  return num * multiplier
}

/** Maps revenue_potential string to a percentile-like value */
export function revenueToPercentile(revenue: string): number {
  const upper = parseRevenueUpperBound(revenue)
  if (upper === 0) return 0        // unknown
  if (upper >= 20000) return 95     // $20k+/mo
  if (upper >= 10000) return 80     // $10k-20k/mo
  if (upper >= 5000) return 65      // $5k-10k/mo
  if (upper >= 2000) return 50      // $2k-5k/mo
  if (upper >= 1000) return 35      // $1k-2k/mo
  if (upper >= 500) return 20       // $500-1k/mo
  return 10                         // under $500/mo
}

/** Maps revenue_potential string to a color */
export function revenueToColor(revenue: string): "green" | "orange" | "blue" | "gray" {
  const upper = parseRevenueUpperBound(revenue)
  if (upper === 0) return "gray"    // unknown
  if (upper >= 5000) return "green" // $5k+/mo
  if (upper >= 1000) return "orange" // $1k-5k/mo
  return "blue"                     // under $1k/mo
}

/** Maps market_signal to a display color */
export function signalToColor(signal: string): "green" | "orange" | "red" | "gray" {
  switch (signal) {
    case "strong": return "green"
    case "moderate": return "orange"
    case "weak": return "red"
    default: return "gray"
  }
}
