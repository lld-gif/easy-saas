/**
 * Variant D — Tier Badge with Pips
 *
 * Designed badge: tier name + 5-pip meter showing tier rank (1..5).
 * Subtle gradient background per tier. More visual weight than A/B
 * but richer information density — the pips give an ordinal cue
 * independent of color (helpful for color-blind users).
 */

import { formatPercentileLabel } from "@/lib/signal-utils"

interface Props {
  percentile: number
  className?: string
}

type TierSpec = {
  pips: number
  containerClass: string
  pipOnClass: string
  pipOffClass: string
}

function tierSpec(percentile: number): TierSpec {
  const p = Math.max(0, Math.min(100, percentile))
  if (p >= 90)
    return {
      pips: 5,
      containerClass:
        "bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 text-emerald-700 dark:text-emerald-300 ring-1 ring-inset ring-emerald-500/30",
      pipOnClass: "bg-emerald-500",
      pipOffClass: "bg-emerald-500/20",
    }
  if (p >= 75)
    return {
      pips: 4,
      containerClass:
        "bg-gradient-to-r from-lime-500/10 to-lime-500/5 text-lime-700 dark:text-lime-300 ring-1 ring-inset ring-lime-500/30",
      pipOnClass: "bg-lime-500",
      pipOffClass: "bg-lime-500/20",
    }
  if (p >= 40)
    return {
      pips: 3,
      containerClass:
        "bg-gradient-to-r from-amber-500/10 to-amber-500/5 text-amber-700 dark:text-amber-300 ring-1 ring-inset ring-amber-500/30",
      pipOnClass: "bg-amber-500",
      pipOffClass: "bg-amber-500/20",
    }
  if (p >= 15)
    return {
      pips: 2,
      containerClass:
        "bg-gradient-to-r from-orange-500/10 to-orange-500/5 text-orange-700 dark:text-orange-300 ring-1 ring-inset ring-orange-500/30",
      pipOnClass: "bg-orange-500",
      pipOffClass: "bg-orange-500/20",
    }
  return {
    pips: 1,
    containerClass:
      "bg-gradient-to-r from-rose-500/10 to-rose-500/5 text-rose-700 dark:text-rose-300 ring-1 ring-inset ring-rose-500/30",
    pipOnClass: "bg-rose-500",
    pipOffClass: "bg-rose-500/20",
  }
}

export function VariantDTierBadge({ percentile, className = "" }: Props) {
  const spec = tierSpec(percentile)
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ${spec.containerClass} ${className}`}
    >
      <span aria-hidden className="inline-flex items-center gap-0.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={`inline-block h-1.5 w-1.5 rounded-full ${
              i < spec.pips ? spec.pipOnClass : spec.pipOffClass
            }`}
          />
        ))}
      </span>
      <span>{formatPercentileLabel(percentile)}</span>
    </span>
  )
}
