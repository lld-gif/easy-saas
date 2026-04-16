"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"

const TOP_CATEGORIES = [
  { slug: "", label: "All" },
  { slug: "devtools", label: "DevTools" },
  { slug: "ai-ml", label: "AI/ML" },
  { slug: "fintech", label: "Fintech" },
  { slug: "automation", label: "Automation" },
  { slug: "productivity", label: "Productivity" },
  { slug: "marketing", label: "Marketing" },
  { slug: "ecommerce", label: "Ecommerce" },
  { slug: "health", label: "Health" },
  { slug: "education", label: "Education" },
  { slug: "creator-tools", label: "Creator Tools" },
]

const SORT_OPTIONS = [
  { value: "trending", label: "Trending" },
  { value: "fresh", label: "Fresh (7 days)" },
  { value: "newest", label: "Newest" },
  { value: "revenue", label: "Highest revenue" },
  { value: "easiest", label: "Easiest first" },
  { value: "recent", label: "Recent" },
]

const REVENUE_OPTIONS = [
  { value: "", label: "Any" },
  { value: "2k", label: "$2k+/mo" },
  { value: "10k", label: "$10k+/mo" },
  { value: "25k", label: "$25k+/mo" },
  { value: "50k", label: "$50k+/mo" },
]


export function FilterBar() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const activeCategory = searchParams.get("category") ?? ""
  const activeSort = searchParams.get("sort") ?? "trending"
  const activeDifficulty = searchParams.get("difficulty") ?? ""
  const activeRevenue = searchParams.get("revenue") ?? ""

  const setFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === "") {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    params.delete("cursor")
    router.push(`/ideas?${params.toString()}`)
  }

  return (
    <div className="space-y-3">
      {/* Category tab bar */}
      <div className="flex items-center gap-0 border-b border-border overflow-x-auto scrollbar-hide">
        {TOP_CATEGORIES.map((cat) => (
          <button
            key={cat.slug}
            onClick={() => setFilter("category", cat.slug)}
            className={cn(
              "px-3 py-2 sm:px-4 sm:py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors -mb-[1px]",
              (activeCategory === cat.slug || (cat.slug === "" && !activeCategory))
                ? "border-orange-500 text-orange-500"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-input"
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Sort + Difficulty row */}
      <div className="flex items-center gap-3 sm:gap-6 flex-wrap">
        {/* Sort */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Sort:</span>
          <select
            value={activeSort}
            onChange={(e) => setFilter("sort", e.target.value)}
            className="text-sm font-medium text-foreground bg-transparent border-none cursor-pointer focus:outline-none focus:ring-0 pr-6"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-card text-foreground">{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Difficulty filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Difficulty:</span>
          <select
            value={activeDifficulty}
            onChange={(e) => setFilter("difficulty", e.target.value)}
            className="text-sm font-medium text-foreground bg-transparent border-none cursor-pointer focus:outline-none focus:ring-0 pr-6"
          >
            <option value="" className="bg-card text-foreground">Any</option>
            <option value="easy" className="bg-card text-foreground">Easy</option>
            <option value="medium" className="bg-card text-foreground">Medium</option>
            <option value="hard" className="bg-card text-foreground">Hard</option>
          </select>
        </div>

        {/* Revenue filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Revenue:</span>
          <select
            value={activeRevenue}
            onChange={(e) => setFilter("revenue", e.target.value)}
            className="text-sm font-medium text-foreground bg-transparent border-none cursor-pointer focus:outline-none focus:ring-0 pr-6"
          >
            {REVENUE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-card text-foreground">{opt.label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
