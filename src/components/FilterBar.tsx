"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { CATEGORIES } from "@/lib/categories"
import { cn } from "@/lib/utils"

const SORT_OPTIONS = [
  { value: "trending", label: "Trending" },
  { value: "newest", label: "Newest" },
  { value: "recent", label: "Recently spotted" },
]

export function FilterBar() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const activeCategory = searchParams.get("category") ?? ""
  const activeSort = searchParams.get("sort") ?? "trending"

  const setFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === "" || value === "all") {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    params.delete("cursor")
    router.push(`/ideas?${params.toString()}`)
  }

  return (
    <div className="space-y-4">
      {/* Category pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <button
          onClick={() => setFilter("category", "")}
          className={cn(
            "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all",
            !activeCategory
              ? "bg-gray-900 text-white shadow-sm"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          )}
        >
          All
        </button>
        {CATEGORIES.filter((c) => c.slug !== "other").map((cat) => (
          <button
            key={cat.slug}
            onClick={() => setFilter("category", activeCategory === cat.slug ? "" : cat.slug)}
            className={cn(
              "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all",
              activeCategory === cat.slug
                ? "bg-gray-900 text-white shadow-sm"
                : cn(cat.color, "hover:opacity-80")
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Sort — inline pills instead of dropdown */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 mr-1">Sort:</span>
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilter("sort", opt.value)}
            className={cn(
              "text-xs px-2.5 py-1 rounded-full transition-all",
              activeSort === opt.value
                ? "bg-gray-900 text-white"
                : "text-gray-500 hover:bg-gray-100"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
