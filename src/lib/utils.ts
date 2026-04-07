import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

import type { IdeaFilters, PopularityFilter, TimeFilter, SortOption } from "@/types"

const VALID_POPULARITY: PopularityFilter[] = ["all", "trending", "rising", "new"]
const VALID_TIME: TimeFilter[] = ["all", "week", "month", "3months"]
const VALID_SORT: SortOption[] = ["trending", "newest", "recent", "easiest"]
const VALID_DIFFICULTY = ["easy", "medium", "hard"] as const
const VALID_VIEW = ["card", "list"] as const

function validateEnum<T extends string>(value: unknown, valid: readonly T[], fallback: T): T {
  return typeof value === "string" && (valid as readonly string[]).includes(value) ? value as T : fallback
}

export function parseSearchParams(params: Record<string, string | string[] | undefined>): IdeaFilters {
  return {
    q: typeof params.q === "string" ? params.q : undefined,
    category: typeof params.category === "string" ? params.category : undefined,
    popularity: validateEnum(params.popularity, VALID_POPULARITY, "all"),
    time: validateEnum(params.time, VALID_TIME, "all"),
    sort: validateEnum(params.sort, VALID_SORT, "trending"),
    view: validateEnum(params.view, VALID_VIEW, "card"),
    cursor: typeof params.cursor === "string" ? params.cursor : undefined,
    difficulty: typeof params.difficulty === "string" && (VALID_DIFFICULTY as readonly string[]).includes(params.difficulty) ? params.difficulty as "easy" | "medium" | "hard" : undefined,
  }
}
