import Link from "next/link"
import { CategoryBadge } from "@/components/CategoryBadge"
import { MentionBadge } from "@/components/MentionBadge"
import { formatDate } from "@/lib/utils"
import type { Idea } from "@/types"

interface IdeaListRowProps {
  idea: Idea
  rank: number
}

export function IdeaListRow({ idea, rank }: IdeaListRowProps) {
  return (
    <Link
      href={`/ideas/${idea.slug}`}
      className="group flex items-center gap-4 px-4 py-4 rounded-lg transition-all duration-200 hover:bg-white/5 border border-transparent hover:border-border/50"
    >
      {/* Rank number */}
      <span className="text-2xl font-bold text-muted-foreground/50 w-8 text-center shrink-0">
        {rank}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
          {idea.title}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
          {idea.summary}
        </p>
        <div className="flex items-center gap-2 mt-1.5">
          <CategoryBadge category={idea.category} />
          <span className="text-xs text-muted-foreground/60">
            {formatDate(idea.first_seen_at)}
          </span>
        </div>
      </div>

      {/* Mention count */}
      <div className="shrink-0">
        <MentionBadge count={idea.mention_count} />
      </div>
    </Link>
  )
}
