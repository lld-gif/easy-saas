import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { CategoryBadge } from "@/components/CategoryBadge"
import { MentionBadge } from "@/components/MentionBadge"
import { getIdeaBySlug } from "@/lib/queries"
import { formatDate } from "@/lib/utils"

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const idea = await getIdeaBySlug(slug)
  if (!idea) return { title: "Idea Not Found — EasySaaS" }

  return {
    title: `${idea.title} — EasySaaS`,
    description: idea.summary,
    openGraph: {
      title: `${idea.title} — EasySaaS`,
      description: idea.summary,
      siteName: "EasySaaS",
    },
  }
}

export default async function IdeaDetailPage({ params }: Props) {
  const { slug } = await params
  const idea = await getIdeaBySlug(slug)

  if (!idea) {
    notFound()
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link href="/ideas" className="hover:text-foreground">
          Ideas
        </Link>
        <span className="mx-2">/</span>
        <span>{idea.title}</span>
      </nav>

      <div className="flex items-start justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold">{idea.title}</h1>
        <MentionBadge count={idea.mention_count} />
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-8">
        <CategoryBadge category={idea.category} />
        {idea.tags.map((tag) => (
          <span key={tag} className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">
            {tag}
          </span>
        ))}
      </div>

      <div className="prose prose-gray max-w-none mb-8">
        <p className="text-lg leading-relaxed">{idea.summary}</p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 mb-8">
        <h2 className="font-semibold mb-2">Popularity</h2>
        <p className="text-sm text-muted-foreground">
          Spotted <span className="font-semibold text-foreground">{idea.mention_count}</span> time{idea.mention_count !== 1 ? "s" : ""} across
          the internet since {formatDate(idea.first_seen_at)}.
          {idea.last_seen_at !== idea.first_seen_at && (
            <> Most recently on {formatDate(idea.last_seen_at)}.</>
          )}
        </p>
      </div>

      <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center bg-gray-50">
        <h3 className="font-semibold">Want the full spec?</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Detailed technical spec, branding suggestions, and financial model — coming soon.
        </p>
        <Button className="mt-4" disabled>
          Coming Soon
        </Button>
      </div>
    </main>
  )
}
