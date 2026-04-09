import type { ScrapeRun } from "@/types"

interface PipelineTableProps {
  runs: ScrapeRun[]
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const sourceColors: Record<string, string> = {
  reddit: "bg-orange-100 text-orange-700",
  hackernews: "bg-amber-100 text-amber-700",
  github: "bg-gray-100 text-gray-700",
  producthunt: "bg-red-100 text-red-700",
  indiehackers: "bg-blue-100 text-blue-700",
  googletrends: "bg-green-100 text-green-700",
}

export function PipelineTable({ runs }: PipelineTableProps) {
  if (runs.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="mb-2 text-sm font-semibold text-gray-700">Pipeline Runs</h3>
        <p className="text-sm text-gray-400">No scrape runs recorded yet. Runs will appear here after the first pipeline execution.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="mb-4 text-sm font-semibold text-gray-700">
        Pipeline Runs <span className="font-normal text-gray-400">(last {runs.length})</span>
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
              <th className="pb-2 font-medium">Source</th>
              <th className="pb-2 font-medium">Time</th>
              <th className="pb-2 font-medium">Status</th>
              <th className="pb-2 text-right font-medium">Posts</th>
              <th className="pb-2 text-right font-medium">Extracted</th>
              <th className="pb-2 text-right font-medium">New</th>
              <th className="pb-2 text-right font-medium">Dupes</th>
              <th className="pb-2 text-right font-medium">Errors</th>
              <th className="pb-2 text-right font-medium">Duration</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {runs.map((run) => (
              <tr key={run.id} className="hover:bg-gray-50">
                <td className="py-2">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${sourceColors[run.source_platform] || "bg-gray-100 text-gray-700"}`}>
                    {run.source_platform}
                  </span>
                </td>
                <td className="py-2 text-xs text-gray-500">{formatTime(run.finished_at)}</td>
                <td className="py-2">
                  {run.status === "success" ? (
                    <span className="inline-block h-2 w-2 rounded-full bg-green-500" title="Success" />
                  ) : (
                    <span className="inline-block h-2 w-2 rounded-full bg-red-500" title={run.error_message || "Failed"} />
                  )}
                </td>
                <td className="py-2 text-right text-gray-700">{run.posts_fetched}</td>
                <td className="py-2 text-right text-gray-700">{run.ideas_extracted}</td>
                <td className="py-2 text-right font-medium text-green-600">{run.ideas_new}</td>
                <td className="py-2 text-right text-gray-400">{run.ideas_duplicate}</td>
                <td className="py-2 text-right text-red-500">{run.ideas_error > 0 ? run.ideas_error : "—"}</td>
                <td className="py-2 text-right text-xs text-gray-400">{formatDuration(run.duration_ms)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
