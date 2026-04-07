import { cn } from "@/lib/utils"

interface MentionBadgeProps {
  count: number
}

function getLabel(count: number): { text: string; classes: string } {
  if (count >= 10) return { text: "Hot", classes: "text-orange-600 bg-orange-50" }
  if (count >= 5) return { text: "Rising", classes: "text-violet-600 bg-violet-50" }
  if (count >= 2) return { text: "Rising", classes: "text-blue-600 bg-blue-50" }
  return { text: "New", classes: "text-gray-500 bg-gray-50" }
}

export function MentionBadge({ count }: MentionBadgeProps) {
  const { text, classes } = getLabel(count)

  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-col items-center min-w-[2rem]">
        <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
        <span className="text-sm font-semibold text-gray-700">{count}</span>
      </div>
      <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", classes)}>
        {text}
      </span>
    </div>
  )
}
