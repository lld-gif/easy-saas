/** Pure utility functions for signal display — safe for client components */

/**
 * Format a 0-100 percentile as a human-readable rank label.
 * Flips semantics at the median so the label is never misleading:
 *   - percentile >= 50 → "Top {100-p}%" (brag: top 5%, top 20%…)
 *   - percentile <  50 → "Bottom {p}%" (honest: bottom 1%, bottom 10%…)
 * Floors the number at 1 so we never render "Top 0%" or "Bottom 0%".
 */
export function formatPercentileLabel(percentile: number): string {
  const clamped = Math.max(0, Math.min(100, percentile))
  if (clamped >= 50) {
    return `Top ${Math.max(1, 100 - clamped)}%`
  }
  return `Bottom ${Math.max(1, clamped)}%`
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
