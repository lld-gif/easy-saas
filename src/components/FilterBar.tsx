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
  { value: "newest", label: "Newest" },
  { value: "easiest", label: "Easiest first" },
  { value: "recent", label: "Recent" },
]


export function FilterBar() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const activeCategory = searchParams.get("category") ?? ""
  const activeSort = searchParams.get("sort") ?? "trending"
  const activeDifficulty = searchParams.get("difficulty") ?? ""

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
      <div className="flex items-center gap-0 border-b border-gray-200 overflow-x-auto scrollbar-hide">
        {TOP_CATEGORIES.map((cat) => (
          <button
            key={cat.slug}
            onClick={() => setFilter("category", cat.slug)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors -mb-[1px]",
              (activeCategory === cat.slug || (cat.slug === "" && !activeCategory))
                ? "border-orange-500 text-orange-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Sort + Difficulty row */}
      <div className="flex items-center gap-6 flex-wrap">
        {/* Sort */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Sort:</span>
          <select
            value={activeSort}
            onChange={(e) => setFilter("sort", e.target.value)}
            className="text-sm font-medium text-gray-700 bg-transparent border-none cursor-pointer focus:outline-none focus:ring-0 pr-6"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Difficulty filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Difficulty:</span>
          <select
            value={activeDifficulty}
            onChange={(e) => setFilter("difficulty", e.target.value)}
            className="text-sm font-medium text-gray-700 bg-transparent border-none cursor-pointer focus:outline-none focus:ring-0 pr-6"
          >
            <option value="">Any</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
      </div>
    </div>
  )
}
