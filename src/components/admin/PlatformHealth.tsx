import type { PlatformHealth as Row } from "@/lib/admin-queries"

/**
 * Admin-only Pipeline Health widget.
 *
 * Renders per-platform scraper health from `get_platform_health()`
 * so silent failures — a scraper quietly returning 0 posts for a
 * week, a cron that stopped firing — surface on the dashboard
 * without requiring anyone to dig into `scrape_runs` by hand.
 *
 * Designed to slot alongside the existing PipelineTable on /admin.
 * No client-side state — pure server component output.
 */
interface Props {
  rows: Row[]
}

const STATE_ORDER: Record<Row["health_state"], number> = {
  broken: 0,
  stale: 1,
  degraded: 2,
  unknown: 3,
  healthy: 4,
}

const STATE_STYLES: Record<
  Row["health_state"],
  { label: string; chip: string; dot: string; description: string }
> = {
  healthy: {
    label: "Healthy",
    chip: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
    description: "Recent runs succeeded",
  },
  degraded: {
    label: "Degraded",
    chip: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
    description: "3+ consecutive failures",
  },
  stale: {
    label: "Stale",
    chip: "bg-orange-50 text-orange-700 border-orange-200",
    dot: "bg-orange-500",
    description: "No run in 24-48h",
  },
  broken: {
    label: "Broken",
    chip: "bg-red-50 text-red-700 border-red-200",
    dot: "bg-red-500",
    description: "No run in >48h",
  },
  unknown: {
    label: "Unknown",
    chip: "bg-gray-50 text-gray-600 border-gray-200",
    dot: "bg-gray-400",
    description: "No runs in 30d",
  },
}

function formatRelative(iso: string | null): string {
  if (!iso) return "never"
  const then = new Date(iso).getTime()
  const diffMin = Math.round((Date.now() - then) / 60000)
  if (diffMin < 1) return "just now"
  if (diffMin < 60) return `${diffMin}m ago`
  const hours = Math.round(diffMin / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return `${days}d ago`
}

function formatDuration(ms: number | null): string {
  if (ms === null) return "—"
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

export function PlatformHealth({ rows }: Props) {
  const sorted = [...rows].sort(
    (a, b) =>
      STATE_ORDER[a.health_state] - STATE_ORDER[b.health_state] ||
      a.source_platform.localeCompare(b.source_platform)
  )

  const attention = sorted.filter(
    (r) => r.health_state !== "healthy" && r.health_state !== "unknown"
  ).length

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Pipeline Health (7d)</h3>
        {attention > 0 ? (
          <span className="text-xs font-medium text-red-600">
            {attention} need attention
          </span>
        ) : (
          <span className="text-xs font-medium text-emerald-600">all good</span>
        )}
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-gray-400">No platform data.</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {sorted.map((row) => {
            const style = STATE_STYLES[row.health_state]
            return (
              <div
                key={row.source_platform}
                className="py-3 first:pt-0 last:pb-0"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                    <span className="font-medium text-sm text-gray-900">
                      {row.source_platform}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border ${style.chip}`}
                      title={style.description}
                    >
                      {style.label}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    last: {formatRelative(row.last_run_at)}
                  </span>
                </div>

                <div className="mt-1.5 grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-1 text-xs text-gray-500">
                  <span>
                    runs:{" "}
                    <span className="text-gray-700 font-medium tabular-nums">
                      {row.successful_runs_7d}/{row.total_runs_7d}
                    </span>
                  </span>
                  <span>
                    new ideas:{" "}
                    <span className="text-gray-700 font-medium tabular-nums">
                      {row.total_new_ideas_7d}
                    </span>
                  </span>
                  <span>
                    avg time:{" "}
                    <span className="text-gray-700 font-medium tabular-nums">
                      {formatDuration(row.avg_duration_ms)}
                    </span>
                  </span>
                  <span>
                    streak:{" "}
                    <span
                      className={`font-medium tabular-nums ${
                        row.consecutive_failures >= 3 ? "text-red-600" : "text-gray-700"
                      }`}
                    >
                      {row.consecutive_failures === 0
                        ? "—"
                        : `${row.consecutive_failures} fails`}
                    </span>
                  </span>
                </div>

                {/* Zero-post call-out: scraper returned 200 but
                    produced nothing in every run of the week. The
                    most common silent-failure mode. */}
                {row.zero_post_runs_7d > 0 &&
                  row.zero_post_runs_7d === row.total_runs_7d && (
                    <div className="mt-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 inline-block">
                      All {row.zero_post_runs_7d} runs returned 0 posts — check
                      upstream access / block / auth
                    </div>
                  )}

                {row.last_error_message && (
                  <div className="mt-1.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1 font-mono truncate">
                    {row.last_error_message}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
