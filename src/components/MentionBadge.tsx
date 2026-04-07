import { cn } from "@/lib/utils"

interface MentionBadgeProps {
  count: number
}

export function MentionBadge({ count }: MentionBadgeProps) {
  if (count >= 10) {
    return (
      <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold bg-orange-500/20 text-orange-400")}>
        🔥 {count}
      </span>
    )
  }
  if (count >= 5) {
    return (
      <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold bg-violet-500/20 text-violet-400")}>
        📈 {count}
      </span>
    )
  }
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold bg-cyan-500/20 text-cyan-400")}>
      🆕 {count}
    </span>
  )
}
