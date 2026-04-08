import { SignalBar } from "@/components/SignalBar"
import {
  signalToPercentile,
  signalToColor,
  revenueToPercentile,
  revenueToColor,
} from "@/lib/signal-utils"
import type { Idea } from "@/types"

interface IdeaSignalsCompactProps {
  idea: Idea
  popPercentile: number
}

/**
 * Compact signal indicators for cards and list rows.
 * Shows 3 micro-bars: popularity, market demand, revenue.
 */
export function IdeaSignalsCompact({ idea, popPercentile }: IdeaSignalsCompactProps) {
  const mktPct = signalToPercentile(idea.market_signal)
  const revPct = revenueToPercentile(idea.revenue_potential)
  const showRevenue = idea.revenue_potential !== "unknown"
  const showSignal = idea.market_signal !== "unknown"

  return (
    <div className="flex items-center gap-2">
      {/* Popularity */}
      <div className="flex items-center gap-1" title={`Popularity: top ${Math.max(1, 100 - popPercentile)}%`}>
        <svg className="w-3 h-3 text-orange-400 shrink-0" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 1.5l2.1 4.3 4.7.7-3.4 3.3.8 4.7L8 12.2l-4.2 2.3.8-4.7L1.2 6.5l4.7-.7z" />
        </svg>
        <SignalBar percentile={popPercentile} label="Popularity" value={`${idea.popularity_score.toFixed(1)}`} color="orange" compact />
      </div>

      {/* Market Signal */}
      {showSignal && (
        <div className="flex items-center gap-1" title={`Market demand: ${idea.market_signal}`}>
          <svg className={`w-3 h-3 shrink-0 ${idea.market_signal === "strong" ? "text-green-500" : idea.market_signal === "moderate" ? "text-orange-400" : "text-red-400"}`} viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 2a6 6 0 100 12A6 6 0 008 2zm0 1a5 5 0 110 10A5 5 0 018 3zm0 2a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1zm0 6a.75.75 0 100 1.5.75.75 0 000-1.5z" />
          </svg>
          <SignalBar percentile={mktPct} label="Market" value={idea.market_signal} color={signalToColor(idea.market_signal)} compact />
        </div>
      )}

      {/* Revenue */}
      {showRevenue && (
        <div className="flex items-center gap-1" title={`Revenue: ${idea.revenue_potential}`}>
          <svg className={`w-3 h-3 shrink-0 ${revenueToColor(idea.revenue_potential) === "green" ? "text-green-500" : "text-gray-400"}`} viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1a7 7 0 100 14A7 7 0 008 1zM7 4h2v1h1a1 1 0 011 1v1a1 1 0 01-1 1H7v1h3a1 1 0 011 1v1a1 1 0 01-1 1H9v1H7v-1H6a1 1 0 01-1-1v-1a1 1 0 011-1h3V9H6a1 1 0 01-1-1V7a1 1 0 011-1h1V4z" />
          </svg>
          <SignalBar percentile={revPct} label="Revenue" value={idea.revenue_potential} color={revenueToColor(idea.revenue_potential)} compact />
        </div>
      )}
    </div>
  )
}
