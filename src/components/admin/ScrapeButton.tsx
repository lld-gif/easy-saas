"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

const PLATFORMS = [
  { value: "reddit", label: "Reddit" },
  { value: "hackernews", label: "Hacker News" },
  { value: "github", label: "GitHub" },
  { value: "producthunt", label: "Product Hunt" },
  { value: "indiehackers", label: "Indie Hackers" },
  { value: "googletrends", label: "Google Trends" },
]

export function ScrapeButton() {
  const router = useRouter()
  const [platform, setPlatform] = useState("reddit")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  async function handleScrape() {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch("/api/admin/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
      })
      const data = await res.json()
      if (!res.ok) {
        setResult(`Error: ${data.error}`)
      } else if (data.result) {
        const r = data.result
        setResult(
          `${r.posts_fetched ?? 0} posts → ${r.ideas_extracted ?? 0} ideas (${r.ideas_new ?? 0} new, ${r.ideas_duplicate ?? 0} dupes) in ${((r.duration_ms ?? 0) / 1000).toFixed(1)}s`
        )
      } else {
        setResult("Completed (no details)")
      }
      // Refresh the server component so the Pipeline Runs table picks up the
      // new scrape_runs row without requiring a full page reload. Refresh on
      // error too, because a partial run may still have logged a failure row.
      router.refresh()
    } catch (err) {
      setResult(`Error: ${err instanceof Error ? err.message : "Unknown error"}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <select
        value={platform}
        onChange={(e) => setPlatform(e.target.value)}
        className="px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
      >
        {PLATFORMS.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>
      <button
        onClick={handleScrape}
        disabled={loading}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white text-sm font-medium rounded-md hover:bg-orange-600 disabled:opacity-50 transition-colors"
      >
        {loading ? (
          <>
            <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 11-6.219-8.56" />
            </svg>
            Running...
          </>
        ) : (
          <>
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
            Run Scrape
          </>
        )}
      </button>
      {result && (
        <span className={`text-xs ${result.startsWith("Error") ? "text-red-600" : "text-green-600"}`}>
          {result}
        </span>
      )}
    </div>
  )
}
