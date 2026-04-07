import { cn } from "@/lib/utils"

interface MentionBadgeProps {
  count: number
}

export function MentionBadge({ count }: MentionBadgeProps) {
  if (count >= 10) {
    return (
      <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold bg-orange-100 text-orange-700")}>
        🔥 {count}
      </span>
    )
  }
  if (count >= 5) {
    return (
      <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold bg-violet-100 text-violet-700")}>
        📈 {count}
      </span>
    )
  }
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold bg-cyan-100 text-cyan-700")}>
      🆕 {count}
    </span>
  )
}
