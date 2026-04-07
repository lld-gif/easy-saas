"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { CATEGORIES } from "@/lib/categories"
import { cn } from "@/lib/utils"

const SORT_OPTIONS = [
  { value: "trending", label: "Trending" },
  { value: "newest", label: "Newest" },
  { value: "recent", label: "Recently active" },
]

const POPULARITY_OPTIONS = [
  { value: "all", label: "All" },
  { value: "trending", label: "🔥 Trending" },
  { value: "rising", label: "📈 Rising" },
  { value: "new", label: "🆕 New" },
]

const TIME_OPTIONS = [
  { value: "all", label: "All time" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "3months", label: "3 months" },
]

export function FilterBar() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const activeCategory = searchParams.get("category") ?? ""
  const activePopularity = searchParams.get("popularity") ?? "all"
  const activeTime = searchParams.get("time") ?? "all"
  const activeSort = searchParams.get("sort") ?? "trending"

  const setFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === "all" || value === "") {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    params.delete("cursor")
    router.push(`/ideas?${params.toString()}`)
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <button
          onClick={() => setFilter("category", "")}
          className={cn(
            "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors",
            !activeCategory ? "bg-foreground text-background" : "bg-muted hover:bg-muted/80"
          )}
        >
          All
        </button>
        {CATEGORIES.filter((c) => c.slug !== "other").map((cat) => (
          <button
            key={cat.slug}
            onClick={() => setFilter("category", cat.slug)}
            className={cn(
              "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors",
              activeCategory === cat.slug ? "bg-foreground text-background" : `${cat.color} hover:opacity-80`
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Sort:</span>
          <select
            value={activeSort}
            onChange={(e) => setFilter("sort", e.target.value)}
            className="bg-background border rounded px-2 py-1 text-sm"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Popularity:</span>
          <select
            value={activePopularity}
            onChange={(e) => setFilter("popularity", e.target.value)}
            className="bg-background border rounded px-2 py-1 text-sm"
          >
            {POPULARITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Time:</span>
          <select
            value={activeTime}
            onChange={(e) => setFilter("time", e.target.value)}
            className="bg-background border rounded px-2 py-1 text-sm"
          >
            {TIME_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
