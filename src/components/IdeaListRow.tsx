import Link from "next/link"
import { CategoryBadge } from "@/components/CategoryBadge"
import { MentionBadge } from "@/components/MentionBadge"
import type { Idea } from "@/types"

interface IdeaListRowProps {
  idea: Idea
  rank: number
}

export function IdeaListRow({ idea, rank }: IdeaListRowProps) {
  return (
    <Link
      href={`/ideas/${idea.slug}`}
      className="group flex items-center gap-4 px-4 py-4 border-b border-gray-100 transition-colors hover:bg-gray-50"
    >
      <span className="text-xl font-semibold text-gray-300 w-8 text-center shrink-0">
        {rank}
      </span>

      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-gray-900 group-hover:text-primary transition-colors truncate">
          {idea.title}
        </h3>
        <p className="text-sm text-gray-500 line-clamp-1 mt-0.5">
          {idea.summary}
        </p>
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          <CategoryBadge category={idea.category} />
          {idea.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="text-xs text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="shrink-0">
        <MentionBadge count={idea.mention_count} />
      </div>
    </Link>
  )
}
