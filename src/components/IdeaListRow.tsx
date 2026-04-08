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
      className="group flex items-center gap-4 px-4 py-5 border-b border-gray-100 transition-colors hover:bg-gray-50/50"
    >
      {/* Icon */}
      <IdeaIcon category={idea.category} size="md" />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">
          {idea.title}
        </h3>
        <p className="text-sm text-gray-500 line-clamp-1 mt-0.5">
          {idea.summary}
        </p>
        <div className="flex items-center gap-1 mt-1.5 text-xs text-gray-400">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
            <line x1="7" y1="7" x2="7.01" y2="7" />
          </svg>
          {[idea.category.replace('-', '/'), ...idea.tags.slice(0, 2)].join(' · ')}
        </div>
      </div>

      {/* Signals */}
      <div className="flex items-center gap-2 shrink-0">
        {idea.market_signal === "strong" && (
          <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700" title="Strong market signal">
            🔥
          </span>
        )}
        {idea.competition_level === "low" && (
          <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700" title="Low competition">
            💎
          </span>
        )}
        <DifficultyBadge difficulty={idea.difficulty} />
        <MentionBadge count={idea.mention_count} />
      </div>
    </Link>
  )
}
