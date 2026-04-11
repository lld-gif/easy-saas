import { isPopularScore } from "@/lib/signal-utils"

interface PopularBadgeProps {
  /** Raw popularity_score for this idea. Undefined/0 → no badge. */
  score: number | undefined
  /**
   * Server-computed p99 threshold from `getAggregateStats()`. A single
   * scalar — cheap to pass as a prop, no sorted-array drift. Undefined/0
   * → badge never renders (safe default for cold starts).
   */
  threshold: number | undefined
  /** Visual variant — `inline` is compact for lists/cards, `pill` is a bordered chip */
  variant?: "inline" | "pill"
}

/**
 * Single scarcity signal for popular ideas. Renders only when the idea's
 * popularity_score is at or above the server-computed p99 threshold (~1%
 * of the corpus). Returns null for everything else so call sites can drop
 * it inline without conditional wrappers.
 *
 * See Knowledge/Midrank Percentile Computation for the full rationale.
 * Note: earlier versions of this component accepted a client-side-computed
 * percentile number — that caused a rank-1-to-~259 over-firing bug because
 * the client was recomputing percentiles from a prop array that could drift
 * between sorted reference and the rendered ideas. The score+threshold
 * shape eliminates that whole failure mode.
 */
export function PopularBadge({ score, threshold, variant = "inline" }: PopularBadgeProps) {
  if (score === undefined || threshold === undefined) return null
  if (!isPopularScore(score, threshold)) return null

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
