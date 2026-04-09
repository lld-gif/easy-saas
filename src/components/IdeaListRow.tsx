import Link from "next/link"
import { IdeaIcon } from "@/components/IdeaIcon"
import { MentionBadge } from "@/components/MentionBadge"
import { DifficultyBadge } from "@/components/DifficultyBadge"
import type { Idea } from "@/types"

interface IdeaListRowProps {
  idea: Idea
  rank: number
}

export function IdeaListRow({ idea, rank }: IdeaListRowProps) {
  return (
    <Link
      href={`/ideas/${idea.slug}`}
      className="group flex items-center gap-4 px-4 py-5 border-b border-border/50 transition-colors hover:bg-muted/30"
    >
      {/* Rank */}
      <span className="text-lg font-bold text-muted-foreground/50 w-8 text-right shrink-0 tabular-nums">
        {rank}
      </span>

      {/* Icon */}
      <IdeaIcon category={idea.category} size="md" />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-foreground group-hover:text-orange-500 transition-colors">
          {idea.title}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
          {idea.summary}
        </p>
        <div className="flex items-center gap-3 mt-1.5">
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
              <line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>
            {[idea.category.replace('-', '/'), ...idea.tags.slice(0, 2)].join(' · ')}
          </div>
          <div className="flex items-center gap-1 text-xs text-orange-500">
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1.5l2.1 4.3 4.7.7-3.4 3.3.8 4.7L8 12.2l-4.2 2.3.8-4.7L1.2 6.5l4.7-.7z" />
            </svg>
            <span className="font-medium">{idea.popularity_score?.toFixed(1) ?? '—'}</span>
          </div>
        </div>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-2 shrink-0">
        <DifficultyBadge difficulty={idea.difficulty} />
        <MentionBadge count={idea.mention_count} />
      </div>
    </Link>
  )
}
