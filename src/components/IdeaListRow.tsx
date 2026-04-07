import Link from "next/link"
import { CategoryBadge } from "@/components/CategoryBadge"
import { MentionBadge } from "@/components/MentionBadge"
import { formatDate } from "@/lib/utils"
import type { Idea } from "@/types"

interface IdeaListRowProps {
  idea: Idea
}

export function IdeaListRow({ idea }: IdeaListRowProps) {
  return (
    <Link
      href={`/ideas/${idea.slug}`}
      className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-all duration-200 border-l-2 border-transparent hover:border-primary"
    >
      <div className="flex-1 min-w-0">
        <h3 className="font-medium truncate">{idea.title}</h3>
      </div>
      <CategoryBadge category={idea.category} />
      <MentionBadge count={idea.mention_count} />
      <span className="text-xs text-muted-foreground whitespace-nowrap hidden sm:inline">
        {formatDate(idea.first_seen_at)}
      </span>
    </Link>
  )
}
