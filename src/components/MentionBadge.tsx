import { Badge } from "@/components/ui/badge"

interface MentionBadgeProps {
  count: number
}

export function MentionBadge({ count }: MentionBadgeProps) {
  if (count >= 10) {
    return <Badge variant="destructive" className="text-xs">🔥 {count}</Badge>
  }
  if (count >= 5) {
    return <Badge variant="secondary" className="text-xs">📈 {count}</Badge>
  }
  return <Badge variant="outline" className="text-xs">🆕 {count}</Badge>
}
