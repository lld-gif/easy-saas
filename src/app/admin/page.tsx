import { redirect } from "next/navigation"
import { isAdmin } from "@/lib/admin"
import { getAdminStats, getScrapeRuns, getTopTrendingThisWeek, getEstimatedCosts } from "@/lib/admin-queries"
import { StatCard } from "@/components/admin/StatCard"
import { BarChart } from "@/components/admin/BarChart"
import { DailyChart } from "@/components/admin/DailyChart"
import { PipelineTable } from "@/components/admin/PipelineTable"
import { QualityCards } from "@/components/admin/QualityCards"
import { CostTracker } from "@/components/admin/CostTracker"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function AdminPage() {
  const admin = await isAdmin()
  if (!admin) redirect("/admin/login")

  const [stats, scrapeRuns, trending, costs] = await Promise.all([
    getAdminStats(),
    getScrapeRuns(20),
    getTopTrendingThisWeek(10),
    getEstimatedCosts(),
  ])

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="border-b border-zinc-800 bg-zinc-900 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-zinc-100">EasySaaS Admin</h1>
            <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-xs font-medium text-orange-400">
              Dashboard
            </span>
          </div>
          <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-200">
            ← Back to site
          </Link>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-6 py-6 space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total Ideas" value={stats.total_ideas} accent="blue" />
        <StatCard label="Active" value={stats.active_ideas} accent="green" />
        <StatCard label="Needs Review" value={stats.needs_review} accent="orange" />
        <StatCard
          label="Sources"
          value={stats.by_source.length}
          sublabel={`${stats.by_source.reduce((s, d) => s + d.count, 0)} total source records`}
          accent="gray"
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        <BarChart
          title="Ideas by Category"
          data={stats.by_category.map((d) => ({ label: d.category, value: d.count }))}
        />
        <BarChart
          title="Ideas by Source"
          data={stats.by_source.map((d) => ({ label: d.source_platform, value: d.count }))}
        />
      </div>

      {/* Daily Ingest */}
      <DailyChart title="Daily Ingest Rate (last 30 days)" data={stats.daily_ingest} />

      {/* Pipeline + Trending */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <PipelineTable runs={scrapeRuns} />
        </div>
        <div className="space-y-4">
          {/* Trending This Week */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <h3 className="mb-3 text-sm font-semibold text-zinc-300">Top Trending This Week</h3>
            {trending.length === 0 ? (
              <p className="text-sm text-zinc-500">No activity this week.</p>
            ) : (
              <div className="space-y-2">
                {trending.map((idea, i) => (
                  <div key={idea.id} className="flex items-start gap-2">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-orange-500/15 text-xs font-bold text-orange-400">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <Link
                        href={`/ideas/${idea.slug}`}
                        className="text-sm font-medium text-zinc-200 hover:text-orange-400"
                      >
                        {idea.title}
                      </Link>
                      <div className="flex gap-2 text-xs text-zinc-500">
                        <span>{idea.category}</span>
                        <span>·</span>
                        <span>{idea.mention_count} mentions</span>
                        {idea.market_signal !== "unknown" && (
                          <>
                            <span>·</span>
                            <span className={
                              idea.market_signal === "strong" ? "text-green-400" :
                              idea.market_signal === "moderate" ? "text-yellow-400" : "text-zinc-500"
                            }>
                              {idea.market_signal} signal
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quality + Cost */}
      <div className="grid gap-4 md:grid-cols-2">
        <QualityCards
          totalIdeas={stats.total_ideas}
          missingEnrichment={stats.quality.missing_enrichment}
          lowMentions={stats.quality.low_mentions}
          defaultDifficulty={stats.quality.default_difficulty}
        />
        <CostTracker byCost={costs.by_source} totalCost={costs.total_cost_30d} />
      </div>
      </div>
    </div>
  )
}
