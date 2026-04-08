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
  reddit: "bg-orange-500/15 text-orange-400",
  hackernews: "bg-amber-500/15 text-amber-400",
  github: "bg-zinc-700 text-zinc-300",
  producthunt: "bg-red-500/15 text-red-400",
  indiehackers: "bg-blue-500/15 text-blue-400",
  googletrends: "bg-green-500/15 text-green-400",
}

export function PipelineTable({ runs }: PipelineTableProps) {
  if (runs.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
        <h3 className="mb-2 text-sm font-semibold text-zinc-300">Pipeline Runs</h3>
        <p className="text-sm text-zinc-500">No scrape runs recorded yet. Runs will appear here after the first pipeline execution.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <h3 className="mb-4 text-sm font-semibold text-zinc-300">
        Pipeline Runs <span className="font-normal text-zinc-500">(last {runs.length})</span>
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-xs text-zinc-500">
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
          <tbody className="divide-y divide-zinc-800/50">
            {runs.map((run) => (
              <tr key={run.id} className="hover:bg-zinc-800/30">
                <td className="py-2">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${sourceColors[run.source_platform] || "bg-zinc-700 text-zinc-300"}`}>
                    {run.source_platform}
                  </span>
                </td>
                <td className="py-2 text-xs text-zinc-400">{formatTime(run.finished_at)}</td>
                <td className="py-2">
                  {run.status === "success" ? (
                    <span className="inline-block h-2 w-2 rounded-full bg-green-500" title="Success" />
                  ) : (
                    <span className="inline-block h-2 w-2 rounded-full bg-red-500" title={run.error_message || "Failed"} />
                  )}
                </td>
                <td className="py-2 text-right text-zinc-300">{run.posts_fetched}</td>
                <td className="py-2 text-right text-zinc-300">{run.ideas_extracted}</td>
                <td className="py-2 text-right font-medium text-green-400">{run.ideas_new}</td>
                <td className="py-2 text-right text-zinc-500">{run.ideas_duplicate}</td>
                <td className="py-2 text-right text-red-400">{run.ideas_error > 0 ? run.ideas_error : "—"}</td>
                <td className="py-2 text-right text-xs text-zinc-500">{formatDuration(run.duration_ms)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
