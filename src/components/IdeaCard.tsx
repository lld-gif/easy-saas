import Link from "next/link"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { IdeaIcon } from "@/components/IdeaIcon"
import { MentionBadge } from "@/components/MentionBadge"
import type { Idea } from "@/types"

interface IdeaCardProps {
  idea: Idea
}

export function IdeaCard({ idea }: IdeaCardProps) {
  return (
    <Link href={`/ideas/${idea.slug}`}>
      <Card className="h-full hover:shadow-md border-gray-200 transition-all duration-200 cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <IdeaIcon title={idea.title} category={idea.category} size="lg" />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 leading-snug line-clamp-2">
                {idea.title}
              </h3>
              <p className="text-sm text-gray-500 line-clamp-2 mt-1">
                {idea.summary}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-400 flex items-center gap-1">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
                <line x1="7" y1="7" x2="7.01" y2="7" />
              </svg>
              {[idea.category.replace('-', '/'), ...idea.tags.slice(0, 2)].join(' · ')}
            </div>
            <MentionBadge count={idea.mention_count} />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
