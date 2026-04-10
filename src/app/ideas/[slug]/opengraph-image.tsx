import { ImageResponse } from "next/og"
import { createClient } from "@supabase/supabase-js"
import { displayMentions } from "@/lib/utils"
import { isPopularScore } from "@/lib/signal-utils"

export const alt = "Vibe Code Ideas"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

const signalColors: Record<string, string> = {
  strong: "#22c55e",
  moderate: "#f97316",
  weak: "#ef4444",
  unknown: "#71717a",
}

const difficultyLabel = (d: number): string => {
  if (d <= 3) return "Easy"
  if (d <= 6) return "Medium"
  return "Hard"
}

const difficultyColor = (d: number): string => {
  if (d <= 3) return "#22c55e"
  if (d <= 6) return "#f97316"
  return "#ef4444"
}

export default async function OGImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const [{ data: idea }, { data: allScores }] = await Promise.all([
    supabase
      .from("ideas")
      .select("title, category, mention_count, market_signal, difficulty, popularity_score")
      .eq("slug", slug)
      .single(),
    // Must match getAggregateStats — default PostgREST cap is 1000, which
    // truncates the bottom of the distribution and pins every active idea's
    // percentile at 100. See queries.ts for the full writeup.
    supabase
      .from("ideas")
      .select("popularity_score")
      .eq("status", "active")
      .order("popularity_score", { ascending: true })
      .limit(100000),
  ])

  if (!idea) {
    return new ImageResponse(
      (
        <div style={{ background: "#09090b", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fafafa", fontSize: "36px", fontFamily: "system-ui, sans-serif" }}>
          Idea Not Found
        </div>
      ),
      { ...size }
    )
  }

  const marketLabel = idea.market_signal === "unknown" ? "Unknown" : idea.market_signal.charAt(0).toUpperCase() + idea.market_signal.slice(1)

  // Scarcity badge: only p99+ ideas surface a "Popular" chip in the OG image.
  // Everyone else just gets the 3-column signals row, matching the site-wide
  // scarcity principle. See Knowledge/Midrank Percentile Computation.
  //
  // We compute the threshold inline here (rather than calling
  // getAggregateStats) because opengraph-image.tsx runs in Next's edge-ish
  // image route with its own Supabase client and no access to the shared
  // module-level cache.
  const sortedScores = (allScores ?? []).map((r) => r.popularity_score ?? 0)
  const n = sortedScores.length
  const p99Index = n > 0 ? Math.max(0, Math.ceil(n * 0.99) - 1) : 0
  const popularityThreshold = n > 0 ? sortedScores[p99Index] : 0
  const popular = isPopularScore(idea.popularity_score ?? 0, popularityThreshold)

  return new ImageResponse(
    (
      <div
        style={{
          background: "#09090b",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "60px 80px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Top bar: logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "48px" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "10px",
              background: "#f97316",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
              fontWeight: 700,
              color: "#fff",
            }}
          >
            &lt;/&gt;
          </div>
          <div style={{ display: "flex", fontSize: "28px", fontWeight: 700 }}>
            <span style={{ color: "#f97316" }}>Vibe</span>
            <span style={{ color: "#fafafa" }}>Code Ideas</span>
          </div>
        </div>

        {/* Category badge + optional Popular chip (p99+ only) */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
          <div
            style={{
              background: "#27272a",
              color: "#a1a1aa",
              fontSize: "16px",
              fontWeight: 600,
              padding: "6px 16px",
              borderRadius: "20px",
              textTransform: "uppercase" as const,
              letterSpacing: "0.05em",
              display: "flex",
            }}
          >
            {idea.category}
          </div>
          {popular && (
            <div
              style={{
                background: "rgba(249, 115, 22, 0.12)",
                border: "1px solid rgba(249, 115, 22, 0.4)",
                color: "#f97316",
                fontSize: "16px",
                fontWeight: 600,
                padding: "6px 16px",
                borderRadius: "20px",
                textTransform: "uppercase" as const,
                letterSpacing: "0.05em",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              ★ Popular
            </div>
          )}
        </div>

        {/* Title */}
        <div
          style={{
            display: "flex",
            fontSize: idea.title.length > 60 ? "40px" : "48px",
            fontWeight: 700,
            color: "#fafafa",
            lineHeight: 1.2,
            marginBottom: "auto",
            maxWidth: "900px",
          }}
        >
          {idea.title}
        </div>

        {/* Bottom signals row */}
        <div
          style={{
            display: "flex",
            gap: "40px",
            borderTop: "1px solid #27272a",
            paddingTop: "24px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" as const, gap: "4px" }}>
            <div style={{ display: "flex", fontSize: "14px", color: "#71717a", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>Mentions</div>
            <div style={{ display: "flex", fontSize: "28px", fontWeight: 700, color: "#fafafa" }}>{displayMentions(idea.mention_count)}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" as const, gap: "4px" }}>
            <div style={{ display: "flex", fontSize: "14px", color: "#71717a", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>Market</div>
            <div style={{ display: "flex", fontSize: "28px", fontWeight: 700, color: signalColors[idea.market_signal] || "#71717a" }}>{marketLabel}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" as const, gap: "4px" }}>
            <div style={{ display: "flex", fontSize: "14px", color: "#71717a", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>Difficulty</div>
            <div style={{ display: "flex", fontSize: "28px", fontWeight: 700, color: difficultyColor(idea.difficulty) }}>{difficultyLabel(idea.difficulty)}</div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
