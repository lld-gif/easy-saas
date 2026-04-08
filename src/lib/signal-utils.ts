/** Pure utility functions for signal display — safe for client components */

/** Maps market_signal to a percentile-like value for display */
export function signalToPercentile(signal: string): number {
  switch (signal) {
    case "strong": return 85
    case "moderate": return 50
    case "weak": return 20
    default: return 0
  }
}

/** Maps revenue_potential string to a percentile-like value */
export function revenueToPercentile(revenue: string): number {
  if (revenue.includes("50k") || revenue.includes("100k")) return 95
  if (revenue.includes("10k")) return 75
  if (revenue.includes("5k")) return 60
  if (revenue.includes("2k")) return 45
  if (revenue.includes("1k")) return 30
  if (revenue.includes("500")) return 20
  return 0 // unknown
}

/** Maps revenue_potential string to a color */
export function revenueToColor(revenue: string): "green" | "orange" | "blue" | "gray" {
  if (revenue.includes("10k") || revenue.includes("50k") || revenue.includes("100k")) return "green"
  if (revenue.includes("2k") || revenue.includes("5k")) return "orange"
  if (revenue.includes("500") || revenue.includes("1k")) return "blue"
  return "gray"
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
