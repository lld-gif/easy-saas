import { cn } from "@/lib/utils"

interface MentionBadgeProps {
  count: number
}

export function MentionBadge({ count }: MentionBadgeProps) {
  if (count >= 10) {
    return (
      <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold bg-orange-50 text-orange-600 border border-orange-200")}>
        🔥 {count}
      </span>
    )
  }
  if (count >= 5) {
    return (
      <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold bg-violet-50 text-violet-600 border border-violet-200")}>
        📈 {count}
      </span>
    )
  }
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold bg-sky-50 text-sky-600 border border-sky-200")}>
      🆕 {count}
    </span>
  )
}
