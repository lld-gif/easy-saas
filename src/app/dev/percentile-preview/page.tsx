/**
 * Dev-only preview page for comparing popularity-percentile viz variants
 * against real Supabase data. Not linked from navigation.
 *
 * URL: /dev/percentile-preview
 *
 * This is a server component — fetches aggregate stats + a spread of
 * representative ideas, then renders each variant side-by-side.
 */

import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { getPercentile, formatPercentileLabel } from "@/lib/signal-utils"
import { VariantAColoredPill } from "@/components/popularity/VariantA-ColoredPill"
import { VariantBIconLabel } from "@/components/popularity/VariantB-IconLabel"
import { VariantCPositionBar } from "@/components/popularity/VariantC-PositionBar"
import { VariantDTierBadge } from "@/components/popularity/VariantD-TierBadge"
import type { Idea } from "@/types"

export const metadata: Metadata = {
  title: "Percentile Viz Preview (dev)",
  robots: { index: false, follow: false },
}

// Always render fresh so we see current data
export const dynamic = "force-dynamic"

async function getPreviewData() {
  const supabase = await createClient()

  // Pull all active ideas — we only use their popularity_score for the
  // sorted distribution and to pick representative samples.
  const { data: allRows } = await supabase
    .from("ideas")
    .select("id, slug, title, category, popularity_score")
    .eq("status", "active")
    .order("popularity_score", { ascending: true })

  const rows = (allRows ?? []) as Array<Pick<Idea, "id" | "slug" | "title" | "category" | "popularity_score">>

  const sortedScores = rows.map((r) => r.popularity_score ?? 0)

  // Compute percentile for every idea once, then pick representatives
  // closest to each target percentile so the user sees the full spread.
  const enriched = rows.map((r) => ({
    ...r,
    percentile: getPercentile(r.popularity_score ?? 0, sortedScores),
  }))

  const targets = [3, 12, 22, 32, 45, 58, 72, 82, 92, 98]
  const seen = new Set<string>()
  const representative: typeof enriched = []
  for (const t of targets) {
    // nearest by percentile, prefer unseen
    const candidates = enriched
      .filter((e) => !seen.has(e.id))
      .sort((a, b) => Math.abs(a.percentile - t) - Math.abs(b.percentile - t))
    const pick = candidates[0]
    if (pick) {
      seen.add(pick.id)
      representative.push(pick)
    }
  }

  // tier counts for the summary
  const tierCounts: Record<string, number> = {
    "Top 10%": 0,
    "Top 25%": 0,
    Average: 0,
    "Below Avg": 0,
    "Bottom 15%": 0,
  }
  for (const e of enriched) {
    const label = formatPercentileLabel(e.percentile)
    tierCounts[label] = (tierCounts[label] ?? 0) + 1
  }

  return { representative, total: rows.length, tierCounts }
}

export default async function PercentilePreviewPage() {
  const { representative, total, tierCounts } = await getPreviewData()

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Dev preview</p>
        <h1 className="text-2xl font-bold text-foreground">Popularity Percentile Viz Exploration</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Comparing four visual variants of the popularity tier display against real production
          data. This page is not linked from navigation and is excluded from robots indexing.
          Pick the variant that communicates &quot;where does this idea rank&quot; fastest.
        </p>

        <div className="mt-5 rounded-lg border border-border bg-muted/30 p-4 text-xs text-muted-foreground">
          <div className="font-medium text-foreground">
            Real distribution ({total.toLocaleString()} active ideas)
          </div>
          <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-5">
            {Object.entries(tierCounts).map(([label, count]) => (
              <div key={label} className="flex items-center justify-between gap-2">
                <span>{label}</span>
                <span className="tabular-nums">
                  {count} ({((count / total) * 100).toFixed(1)}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </header>

      <section>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-3 text-left font-medium">Idea</th>
                <th className="px-3 py-3 text-right font-medium">p</th>
                <th className="px-3 py-3 text-left font-medium">A — Colored Pill</th>
                <th className="px-3 py-3 text-left font-medium">B — Icon + Label</th>
                <th className="px-3 py-3 text-left font-medium">C — Position Bar</th>
                <th className="px-3 py-3 text-left font-medium">D — Tier Badge</th>
              </tr>
            </thead>
            <tbody>
              {representative.map((idea) => (
                <tr key={idea.id} className="border-t border-border/50 hover:bg-muted/20">
                  <td className="px-3 py-3">
                    <div className="font-medium text-foreground line-clamp-1">{idea.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {idea.category} · score {(idea.popularity_score ?? 0).toFixed(3)}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-xs tabular-nums text-muted-foreground">
                    {idea.percentile}
                  </td>
                  <td className="px-3 py-3">
                    <VariantAColoredPill percentile={idea.percentile} />
                  </td>
                  <td className="px-3 py-3">
                    <VariantBIconLabel percentile={idea.percentile} />
                  </td>
                  <td className="px-3 py-3">
                    <VariantCPositionBar percentile={idea.percentile} />
                  </td>
                  <td className="px-3 py-3">
                    <VariantDTierBadge percentile={idea.percentile} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Drop-in usage: each component takes <code className="rounded bg-muted px-1">percentile: number</code>{" "}
          and replaces the existing <code className="rounded bg-muted px-1">formatPercentileLabel()</code> span
          in <code className="rounded bg-muted px-1">IdeaListRow.tsx</code> and{" "}
          <code className="rounded bg-muted px-1">IdeaCard.tsx</code>.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-lg font-semibold text-foreground">Full sweep (every 5%)</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Synthetic percentile sweep so you can see how each variant renders across the entire 0–100 range.
        </p>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-right font-medium">p</th>
                <th className="px-3 py-2 text-left font-medium">A</th>
                <th className="px-3 py-2 text-left font-medium">B</th>
                <th className="px-3 py-2 text-left font-medium">C</th>
                <th className="px-3 py-2 text-left font-medium">D</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 21 }, (_, i) => i * 5).map((p) => (
                <tr key={p} className="border-t border-border/50">
                  <td className="px-3 py-2 text-right font-mono text-xs tabular-nums text-muted-foreground">
                    {p}
                  </td>
                  <td className="px-3 py-2">
                    <VariantAColoredPill percentile={p} />
                  </td>
                  <td className="px-3 py-2">
                    <VariantBIconLabel percentile={p} />
                  </td>
                  <td className="px-3 py-2">
                    <VariantCPositionBar percentile={p} />
                  </td>
                  <td className="px-3 py-2">
                    <VariantDTierBadge percentile={p} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
