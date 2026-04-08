export const CATEGORIES = [
  { slug: "fintech", label: "Fintech", color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
  { slug: "devtools", label: "DevTools", color: "bg-blue-500/15 text-blue-700 dark:text-blue-400" },
  { slug: "automation", label: "Automation", color: "bg-purple-500/15 text-purple-700 dark:text-purple-400" },
  { slug: "ai-ml", label: "AI/ML", color: "bg-pink-500/15 text-pink-700 dark:text-pink-400" },
  { slug: "ecommerce", label: "Ecommerce", color: "bg-orange-500/15 text-orange-700 dark:text-orange-400" },
  { slug: "health", label: "Health", color: "bg-red-500/15 text-red-700 dark:text-red-400" },
  { slug: "education", label: "Education", color: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400" },
  { slug: "creator-tools", label: "Creator Tools", color: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400" },
  { slug: "productivity", label: "Productivity", color: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400" },
  { slug: "marketing", label: "Marketing", color: "bg-lime-500/15 text-lime-700 dark:text-lime-400" },
  { slug: "hr-recruiting", label: "HR/Recruiting", color: "bg-teal-500/15 text-teal-700 dark:text-teal-400" },
  { slug: "real-estate", label: "Real Estate", color: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  { slug: "logistics", label: "Logistics", color: "bg-slate-500/15 text-slate-700 dark:text-slate-400" },
  { slug: "other", label: "Other", color: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-400" },
] as const

export type CategorySlug = (typeof CATEGORIES)[number]["slug"]

export function getCategoryBySlug(slug: string) {
  return CATEGORIES.find((c) => c.slug === slug) ?? CATEGORIES[CATEGORIES.length - 1]
}
