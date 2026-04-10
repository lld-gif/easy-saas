/**
 * Variant C — Position Bar
 *
 * Horizontal track showing this idea's position relative to the full
 * distribution of active ideas. The bar is a tiny mini-histogram
 * (rendered as a gradient) with a marker at the idea's percentile.
 * Reads as "where does this sit in the pack" at a glance.
 */

import { formatPercentileLabel } from "@/lib/signal-utils"

interface Props {
  percentile: number
  className?: string
  /** Show the text label next to the bar. Defaults to true. */
  showLabel?: boolean
}

function markerColor(percentile: number): string {
  const p = Math.max(0, Math.min(100, percentile))
  if (p >= 90) return "bg-emerald-500 ring-emerald-300 dark:ring-emerald-700"
  if (p >= 75) return "bg-lime-500 ring-lime-300 dark:ring-lime-700"
  if (p >= 40) return "bg-amber-500 ring-amber-300 dark:ring-amber-700"
  if (p >= 15) return "bg-orange-500 ring-orange-300 dark:ring-orange-700"
  return "bg-rose-500 ring-rose-300 dark:ring-rose-700"
}

function labelColor(percentile: number): string {
  const p = Math.max(0, Math.min(100, percentile))
  if (p >= 90) return "text-emerald-600 dark:text-emerald-400"
  if (p >= 75) return "text-lime-600 dark:text-lime-400"
  if (p >= 40) return "text-amber-600 dark:text-amber-400"
  if (p >= 15) return "text-orange-600 dark:text-orange-400"
  return "text-rose-600 dark:text-rose-400"
}

export function VariantCPositionBar({ percentile, className = "", showLabel = true }: Props) {
  const clamped = Math.max(0, Math.min(100, percentile))

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${className}`}>
      <span className="relative inline-block h-1.5 w-16 overflow-visible rounded-full bg-gradient-to-r from-rose-500/30 via-amber-500/30 to-emerald-500/30">
        <span
          className={`absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ${markerColor(
            percentile,
          )}`}
          style={{ left: `${clamped}%` }}
          aria-hidden
        />
      </span>
      {showLabel && (
        <span className={labelColor(percentile)}>{formatPercentileLabel(percentile)}</span>
      )}
    </span>
  )
}
