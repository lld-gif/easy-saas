import Link from "next/link"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { IdeaIcon } from "@/components/IdeaIcon"
import { MentionBadge } from "@/components/MentionBadge"
import { DifficultyBadge } from "@/components/DifficultyBadge"
import type { Idea } from "@/types"

interface IdeaCardProps {
  idea: Idea
}

export function IdeaCard({ idea }: IdeaCardProps) {
  return (
    <Link href={`/ideas/${idea.slug}`}>
      <Card className="h-full hover:shadow-lg hover:border-input border-border bg-card transition-all duration-200 cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <IdeaIcon category={idea.category} size="lg" />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground leading-snug line-clamp-2">
                {idea.title}
              </h3>
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                {idea.summary}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-2.5 mt-auto">
          {/* Tags */}
          <div className="text-xs text-muted-foreground flex items-center gap-1 min-w-0">
            <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
              <line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>
            <span className="truncate">
              {[idea.category.replace('-', '/'), ...idea.tags.slice(0, 2)].join(' · ')}
            </span>
          </div>

          {/* Popularity + Difficulty + Mentions — aligned row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-xs text-orange-500 dark:text-orange-400">
              <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 1.5l2.1 4.3 4.7.7-3.4 3.3.8 4.7L8 12.2l-4.2 2.3.8-4.7L1.2 6.5l4.7-.7z" />
              </svg>
              <span className="font-medium">{idea.popularity_score?.toFixed(1) ?? '—'}</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <DifficultyBadge difficulty={idea.difficulty} />
              <MentionBadge count={idea.mention_count} />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
