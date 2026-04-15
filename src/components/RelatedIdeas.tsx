import Link from "next/link"
import { getRelatedIdeas, type RelatedIdea } from "@/lib/ghost/queries"
import type { Idea } from "@/types"
import { CategoryBadge } from "@/components/CategoryBadge"
import { DifficultyBadge } from "@/components/DifficultyBadge"

interface RelatedIdeasProps {
  idea: Pick<Idea, "id" | "title" | "summary" | "category">
}

export async function RelatedIdeas({ idea }: RelatedIdeasProps) {
  const { ideas, source } = await getRelatedIdeas(idea, 5)

  if (ideas.length === 0) return null

  return (
    <div className="rounded-lg border border-border bg-card/50 p-4 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-foreground">Related Ideas</h2>
        <span className="text-[10px] text-muted-foreground/50 font-mono">
          {source === "ghost" ? "hybrid search" : "category match"}
        </span>
      </div>

      <div className="divide-y divide-border/50">
        {ideas.map((related) => (
          <RelatedIdeaRow key={related.id} idea={related} />
        ))}
      </div>
    </div>
  )
}

function RelatedIdeaRow({ idea }: { idea: RelatedIdea }) {
  const href = idea.slug
    ? `/ideas/${idea.slug}`
    : `/ideas?q=${encodeURIComponent(idea.title)}`

  return (
    <Link
      href={href}
      className="group flex items-start gap-3 py-3 transition-colors hover:bg-muted/30 -mx-2 px-2 rounded-md"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground group-hover:text-orange-500 transition-colors truncate">
          {idea.title}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
          {idea.summary}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[11px] text-muted-foreground/70 tabular-nums">
          {idea.category}
        </span>
        {idea.similarity != null && idea.similarity > 0 && (
          <span className="text-[10px] text-muted-foreground/50 font-mono tabular-nums">
            {(idea.similarity * 100).toFixed(0)}%
          </span>
        )}
      </div>
    </Link>
  )
}
