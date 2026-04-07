const CATEGORY_ICONS: Record<string, { emoji: string; bg: string }> = {
  fintech: { emoji: "💰", bg: "bg-emerald-100" },
  devtools: { emoji: "⚡", bg: "bg-blue-100" },
  automation: { emoji: "🔄", bg: "bg-purple-100" },
  "ai-ml": { emoji: "🧠", bg: "bg-pink-100" },
  ecommerce: { emoji: "🛒", bg: "bg-orange-100" },
  health: { emoji: "💊", bg: "bg-red-100" },
  education: { emoji: "📚", bg: "bg-yellow-100" },
  "creator-tools": { emoji: "🎨", bg: "bg-indigo-100" },
  productivity: { emoji: "🎯", bg: "bg-cyan-100" },
  marketing: { emoji: "📣", bg: "bg-lime-100" },
  "hr-recruiting": { emoji: "👥", bg: "bg-teal-100" },
  "real-estate": { emoji: "🏠", bg: "bg-amber-100" },
  logistics: { emoji: "📦", bg: "bg-slate-100" },
  other: { emoji: "💡", bg: "bg-gray-100" },
}

interface IdeaIconProps {
  category: string
  size?: "sm" | "md" | "lg"
}

export function IdeaIcon({ category, size = "md" }: IdeaIconProps) {
  const icon = CATEGORY_ICONS[category] ?? CATEGORY_ICONS.other
  const sizeClasses = {
    sm: "w-8 h-8 text-base",
    md: "w-10 h-10 text-lg",
    lg: "w-12 h-12 text-xl",
  }

  return (
    <div className={`${icon.bg} ${sizeClasses[size]} rounded-2xl flex items-center justify-center shrink-0`}>
      <span role="img" aria-label={category}>{icon.emoji}</span>
    </div>
  )
}
