import { getCategoryBySlug } from "@/lib/categories"
import { cn } from "@/lib/utils"

interface CategoryBadgeProps {
  category: string
  className?: string
}

export function CategoryBadge({ category, className }: CategoryBadgeProps) {
  const cat = getCategoryBySlug(category)
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", cat.color, className)}>
      {cat.label}
    </span>
  )
}
