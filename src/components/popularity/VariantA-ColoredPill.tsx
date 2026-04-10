/**
 * Variant A — Colored Pill
 *
 * Solid colored pill per tier. Maximum at-a-glance differentiation via hue.
 * Drop-in replacement for the existing `formatPercentileLabel(...)` span.
 */

import { formatPercentileLabel } from "@/lib/signal-utils"

interface Props {
  percentile: number
  className?: string
}

function tierStyles(percentile: number): string {
  const p = Math.max(0, Math.min(100, percentile))
  if (p >= 90) return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-inset ring-emerald-500/30"
  if (p >= 75) return "bg-lime-500/15 text-lime-700 dark:text-lime-400 ring-1 ring-inset ring-lime-500/30"
  if (p >= 40) return "bg-amber-500/15 text-amber-700 dark:text-amber-400 ring-1 ring-inset ring-amber-500/30"
  if (p >= 15) return "bg-orange-500/15 text-orange-700 dark:text-orange-400 ring-1 ring-inset ring-orange-500/30"
  return "bg-rose-500/15 text-rose-700 dark:text-rose-400 ring-1 ring-inset ring-rose-500/30"
}

export function VariantAColoredPill({ percentile, className = "" }: Props) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tierStyles(
        percentile,
      )} ${className}`}
    >
      {formatPercentileLabel(percentile)}
    </span>
  )
}
