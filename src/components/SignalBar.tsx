/**
 * Horizontal micro-bar showing a value positioned against the aggregate.
 * Used for popularity score, market signal, revenue potential on cards and detail pages.
 */

import { formatPercentileLabel } from "@/lib/signal-utils"

interface SignalBarProps {
  /** 0-100 percentile position */
  percentile: number
  label: string
  value: string
  /** Color of the dot/fill */
  color?: "green" | "orange" | "blue" | "red" | "gray"
  /** Compact mode for cards */
  compact?: boolean
}

const dotColors = {
  green: "bg-green-500",
  orange: "bg-orange-500",
  blue: "bg-blue-500",
  red: "bg-red-500",
  gray: "bg-zinc-500",
}

const fillColors = {
  green: "bg-green-400/30",
  orange: "bg-orange-400/30",
  blue: "bg-blue-400/30",
  red: "bg-red-400/30",
  gray: "bg-zinc-400/30",
}

const textColors = {
  green: "text-green-600",
  orange: "text-orange-600",
  blue: "text-blue-600",
  red: "text-red-600",
  gray: "text-muted-foreground",
}

export function SignalBar({
  percentile,
  label,
  value,
  color = "gray",
  compact = false,
}: SignalBarProps) {
  const clamped = Math.max(0, Math.min(100, percentile))
  const rankLabel = formatPercentileLabel(clamped)

  if (compact) {
    return (
      <div className="flex items-center gap-1.5" title={`${label}: ${value} (${rankLabel.toLowerCase()})`}>
        <div className="relative h-1.5 w-10 rounded-full bg-muted">
          <div
            className={`absolute left-0 top-0 h-1.5 rounded-full ${fillColors[color]}`}
            style={{ width: `${clamped}%` }}
          />
          <div
            className={`absolute top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full ${dotColors[color]} border border-background shadow-sm`}
            style={{ left: `calc(${clamped}% - 5px)` }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className={`text-xs font-semibold ${textColors[color]}`}>{value}</span>
      </div>
      <div className="relative h-2 w-full rounded-full bg-muted">
        <div
          className={`absolute left-0 top-0 h-2 rounded-full ${fillColors[color]}`}
          style={{ width: `${clamped}%` }}
        />
        <div
          className={`absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full ${dotColors[color]} border-2 border-background shadow-sm`}
          style={{ left: `calc(${clamped}% - 6px)` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>Low</span>
        <span>{rankLabel}</span>
        <span>High</span>
      </div>
    </div>
  )
}
