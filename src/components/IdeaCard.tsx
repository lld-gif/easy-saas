import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CategoryBadge } from "@/components/CategoryBadge"
import { MentionBadge } from "@/components/MentionBadge"
import { formatDate } from "@/lib/utils"
import type { Idea } from "@/types"

interface IdeaCardProps {
  idea: Idea
}

export function IdeaCard({ idea }: IdeaCardProps) {
  return (
    <Link href={`/ideas/${idea.slug}`}>
      <Card className="h-full transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer border-gray-200">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base font-medium leading-snug line-clamp-2">
              {idea.title}
            </CardTitle>
            <MentionBadge count={idea.mention_count} />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
            {idea.summary}
          </p>
          <div className="flex items-center justify-between">
            <CategoryBadge category={idea.category} />
            <span className="text-xs text-muted-foreground">
              {formatDate(idea.first_seen_at)}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
