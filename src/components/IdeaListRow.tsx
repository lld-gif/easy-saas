import Link from "next/link"
import { IdeaIcon } from "@/components/IdeaIcon"
import { MentionBadge } from "@/components/MentionBadge"
import { DifficultyBadge } from "@/components/DifficultyBadge"
import { PopularBadge } from "@/components/PopularBadge"
import { SaveStar } from "@/components/SaveStar"
import type { Idea } from "@/types"

interface IdeaListRowProps {
  idea: Idea
  rank: number
  /** Server-computed p99 popularity_score threshold. Row renders PopularBadge iff idea.popularity_score >= this. */
  popThreshold?: number
  /** See IdeaCard — same prefetch pattern. */
  savedIds?: Set<string>
}

export function IdeaListRow({ idea, rank, popThreshold, savedIds }: IdeaListRowProps) {
  // Wrapping element is now a <div>, not <Link>, so the SaveStar click
  // path doesn't fight with navigation. The title + body become the
  // navigable surface via an inner <Link> that fills the remaining
  // space; the rest of the row (icon, rank, badges) mirrors the same
  // hover visual via group-hover classes without being clickable-to-navigate.
  const isSaved = savedIds?.has(idea.id) ?? false

  return (
    <div className="group flex items-center gap-2 sm:gap-4 px-3 sm:px-4 py-4 sm:py-5 border-b border-border/50 transition-colors hover:bg-muted/30 relative">
      {/* Rank */}
      <span className="text-base sm:text-lg font-bold text-muted-foreground/50 w-6 sm:w-8 text-right shrink-0 tabular-nums">
        {rank}
      </span>

      {/* Icon */}
      <IdeaIcon category={idea.category} size="md" />

      {/* Content — the <Link> wraps just the title + summary + meta
          row so the SaveStar to the right doesn't trigger navigation. */}
      <Link href={`/ideas/${idea.slug}`} className="flex-1 min-w-0">
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
          <PopularBadge score={idea.popularity_score} threshold={popThreshold} />
        </div>
      </Link>

      {/* Badges */}
      <div className="flex items-center gap-2 shrink-0">
        <DifficultyBadge difficulty={idea.difficulty} />
        <MentionBadge count={idea.mention_count} />
        <SaveStar ideaId={idea.id} initialSaved={isSaved} variant="row" />
      </div>
    </div>
  )
}
