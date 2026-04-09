import Link from "next/link"
import type { Idea } from "@/types"
import { getCategoryBySlug } from "@/lib/categories"
import { displayMentions } from "@/lib/utils"

interface Props {
  ideas: Idea[]
}

export function TrendingSidebar({ ideas }: Props) {
  if (ideas.length === 0) return null

  return (
    <aside className="w-72 shrink-0 hidden lg:block">
      <div className="sticky top-24 space-y-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-4 h-4 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
            <h3 className="text-sm font-semibold text-foreground">Trending Now</h3>
          </div>

          <div className="space-y-3">
            {ideas.map((idea, i) => {
              const cat = getCategoryBySlug(idea.category)
              return (
                <Link
                  key={idea.id}
                  href={`/ideas/${idea.slug}`}
                  className="group flex items-start gap-2.5"
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-xs font-bold text-indigo-600">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug">
                      {idea.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${cat.color}`}>
                        {cat.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {displayMentions(idea.mention_count)} mentions
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>

          <Link
            href="/ideas/trending"
            className="mt-4 block text-center text-xs font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
          >
            View all trending →
          </Link>
        </div>
      </div>
    </aside>
  )
}

