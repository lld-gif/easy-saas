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

export function parseSearchParams(params: Record<string, string | string[] | undefined>) {
  return {
    q: typeof params.q === "string" ? params.q : undefined,
    category: typeof params.category === "string" ? params.category : undefined,
    popularity: typeof params.popularity === "string" ? params.popularity as any : undefined,
    time: typeof params.time === "string" ? params.time as any : undefined,
    sort: typeof params.sort === "string" ? params.sort as any : "trending",
    view: typeof params.view === "string" ? params.view as any : "card",
    cursor: typeof params.cursor === "string" ? params.cursor : undefined,
  }
}
