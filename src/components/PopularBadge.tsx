import { isPopular } from "@/lib/signal-utils"

interface PopularBadgeProps {
  /** 0-100 percentile rank of this idea's popularity_score vs. all active ideas */
  percentile: number | undefined
  /** Visual variant — `inline` is compact for lists/cards, `pill` is a bordered chip */
  variant?: "inline" | "pill"
}

/**
 * Single scarcity signal for popular ideas. Renders only at p99+
 * (~1.6% of the corpus) — scarce enough that the badge means something.
 * Returns null for everything else so call sites can drop it inline
 * without conditional wrappers.
 *
 * See Knowledge/Midrank Percentile Computation for the fidelity analysis
 * that drove the p99 threshold.
 */
export function PopularBadge({ percentile, variant = "inline" }: PopularBadgeProps) {
  if (percentile === undefined || !isPopular(percentile)) return null

  if (variant === "pill") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 text-xs font-medium text-orange-600">
        <StarIcon />
        Popular
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-500">
      <StarIcon />
      Popular
    </span>
  )
}

function StarIcon() {
  return (
    <svg
      aria-hidden="true"
      className="w-3.5 h-3.5"
      viewBox="0 0 16 16"
      fill="currentColor"
    >
      <path d="M8 1.5l2.1 4.3 4.7.7-3.4 3.3.8 4.7L8 12.2l-4.2 2.3.8-4.7L1.2 6.5l4.7-.7z" />
    </svg>
  )
}
