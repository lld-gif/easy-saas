export const CATEGORIES = [
  { slug: "fintech", label: "Fintech", color: "bg-emerald-100 text-emerald-800" },
  { slug: "devtools", label: "DevTools", color: "bg-blue-100 text-blue-800" },
  { slug: "automation", label: "Automation", color: "bg-purple-100 text-purple-800" },
  { slug: "ai-ml", label: "AI/ML", color: "bg-pink-100 text-pink-800" },
  { slug: "ecommerce", label: "Ecommerce", color: "bg-orange-100 text-orange-800" },
  { slug: "health", label: "Health", color: "bg-red-100 text-red-800" },
  { slug: "education", label: "Education", color: "bg-yellow-100 text-yellow-800" },
  { slug: "creator-tools", label: "Creator Tools", color: "bg-indigo-100 text-indigo-800" },
  { slug: "productivity", label: "Productivity", color: "bg-cyan-100 text-cyan-800" },
  { slug: "marketing", label: "Marketing", color: "bg-lime-100 text-lime-800" },
  { slug: "hr-recruiting", label: "HR/Recruiting", color: "bg-teal-100 text-teal-800" },
  { slug: "real-estate", label: "Real Estate", color: "bg-amber-100 text-amber-800" },
  { slug: "logistics", label: "Logistics", color: "bg-slate-100 text-slate-800" },
  { slug: "other", label: "Other", color: "bg-zinc-100 text-zinc-800" },
] as const

export type CategorySlug = (typeof CATEGORIES)[number]["slug"]

export function getCategoryBySlug(slug: string) {
  return CATEGORIES.find((c) => c.slug === slug) ?? CATEGORIES[CATEGORIES.length - 1]
}
