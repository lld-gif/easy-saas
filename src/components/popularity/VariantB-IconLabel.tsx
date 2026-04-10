/**
 * Variant B — Icon + Label
 *
 * Lucide icon paired with the tier label. Icon carries the emotional cue,
 * text carries precision. Minimal visual weight, works in tight row layouts.
 */

import { Flame, TrendingUp, Minus, TrendingDown, Snowflake } from "lucide-react"
import { formatPercentileLabel } from "@/lib/signal-utils"

interface Props {
  percentile: number
  className?: string
}

function tierIcon(percentile: number) {
  const p = Math.max(0, Math.min(100, percentile))
  if (p >= 90) return { Icon: Flame, color: "text-emerald-500 dark:text-emerald-400" }
  if (p >= 75) return { Icon: TrendingUp, color: "text-lime-600 dark:text-lime-400" }
  if (p >= 40) return { Icon: Minus, color: "text-amber-600 dark:text-amber-400" }
  if (p >= 15) return { Icon: TrendingDown, color: "text-orange-600 dark:text-orange-400" }
  return { Icon: Snowflake, color: "text-rose-600 dark:text-rose-400" }
}

export function VariantBIconLabel({ percentile, className = "" }: Props) {
  const { Icon, color } = tierIcon(percentile)
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${color} ${className}`}>
      <Icon className="w-3.5 h-3.5" strokeWidth={2.5} />
      <span>{formatPercentileLabel(percentile)}</span>
    </span>
  )
}
