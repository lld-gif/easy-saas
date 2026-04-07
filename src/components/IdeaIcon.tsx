import { getCategoryBySlug } from "@/lib/categories"

const CATEGORY_COLORS: Record<string, string> = {
  fintech: "bg-emerald-500",
  devtools: "bg-blue-500",
  automation: "bg-purple-500",
  "ai-ml": "bg-pink-500",
  ecommerce: "bg-orange-500",
  health: "bg-red-500",
  education: "bg-yellow-500",
  "creator-tools": "bg-indigo-500",
  productivity: "bg-cyan-500",
  marketing: "bg-lime-500",
  "hr-recruiting": "bg-teal-500",
  "real-estate": "bg-amber-500",
  logistics: "bg-slate-500",
  other: "bg-gray-500",
}

interface IdeaIconProps {
  title: string
  category: string
  size?: "sm" | "md" | "lg"
}

export function IdeaIcon({ title, category, size = "md" }: IdeaIconProps) {
  const bgColor = CATEGORY_COLORS[category] ?? "bg-gray-500"
  const sizeClasses = {
    sm: "w-8 h-8 text-sm",
    md: "w-10 h-10 text-base",
    lg: "w-12 h-12 text-lg",
  }

  return (
    <div className={`${bgColor} ${sizeClasses[size]} rounded-xl flex items-center justify-center text-white font-bold shrink-0 shadow-sm`}>
      {title.charAt(0).toUpperCase()}
    </div>
  )
}
