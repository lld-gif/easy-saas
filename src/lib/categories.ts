export const CATEGORIES = [
  { slug: "fintech", label: "Fintech", color: "bg-emerald-50 text-emerald-700" },
  { slug: "devtools", label: "DevTools", color: "bg-blue-50 text-blue-700" },
  { slug: "automation", label: "Automation", color: "bg-purple-50 text-purple-700" },
  { slug: "ai-ml", label: "AI/ML", color: "bg-pink-50 text-pink-700" },
  { slug: "ecommerce", label: "Ecommerce", color: "bg-orange-50 text-orange-700" },
  { slug: "health", label: "Health", color: "bg-red-50 text-red-700" },
  { slug: "education", label: "Education", color: "bg-yellow-50 text-yellow-700" },
  { slug: "creator-tools", label: "Creator Tools", color: "bg-indigo-50 text-indigo-700" },
  { slug: "productivity", label: "Productivity", color: "bg-cyan-50 text-cyan-700" },
  { slug: "marketing", label: "Marketing", color: "bg-lime-50 text-lime-700" },
  { slug: "hr-recruiting", label: "HR/Recruiting", color: "bg-teal-50 text-teal-700" },
  { slug: "real-estate", label: "Real Estate", color: "bg-amber-50 text-amber-700" },
  { slug: "logistics", label: "Logistics", color: "bg-slate-100 text-slate-700" },
  { slug: "other", label: "Other", color: "bg-gray-100 text-gray-600" },
] as const

export type CategorySlug = (typeof CATEGORIES)[number]["slug"]

export function getCategoryBySlug(slug: string) {
  return CATEGORIES.find((c) => c.slug === slug) ?? CATEGORIES[CATEGORIES.length - 1]
}
