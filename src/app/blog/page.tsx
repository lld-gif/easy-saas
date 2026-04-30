import type { Metadata } from "next"
import Link from "next/link"
import { getAllBlogPosts } from "@/lib/blog-posts"
import { getAutoBlogPosts } from "@/lib/auto-blog"

export const metadata: Metadata = {
  title: "Blog — Vibe Code Ideas",
  description:
    "Guides, trends, and weekly recaps for indie hackers and SaaS founders.",
  alternates: {
    canonical: "/blog",
    types: {
      "application/rss+xml": "/blog/rss",
    },
  },
}

// ISR: re-render the index hourly so a Friday auto-blog post lands
// without a manual deploy. Static posts cost nothing on a re-render
// (in-memory module read); auto posts come from one DB query.
export const revalidate = 3600

interface ListItem {
  slug: string
  title: string
  description: string
  publishedAt: string
  content: string
  source: "static" | "auto"
}

function estimateReadingTime(content: string): number {
  const words = content.split(/\s+/).length
  return Math.max(1, Math.ceil(words / 230))
}

export default async function BlogPage() {
  // Run the static read alongside the DB call so a slow Supabase
  // doesn't slow first paint. Static is sync but Promise-wrapping makes
  // the awaits symmetric and lets Promise.all handle either.
  const [staticPosts, autoPosts] = await Promise.all([
    Promise.resolve(getAllBlogPosts()),
    getAutoBlogPosts(),
  ])

  const all: ListItem[] = [
    ...staticPosts.map((p) => ({
      slug: p.slug,
      title: p.title,
      description: p.description,
      publishedAt: p.publishedAt,
      content: p.content,
      source: "static" as const,
    })),
    ...autoPosts.map((p) => ({
      slug: p.slug,
      title: p.title,
      description: p.description,
      publishedAt: p.publishedAt,
      content: p.content,
      source: "auto" as const,
    })),
  ].sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  )

  return (
    <main className="max-w-2xl mx-auto px-5 sm:px-6 py-12">
      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">Blog</h1>
      <p className="text-lg text-muted-foreground mb-12">
        Trends, guides, and weekly recaps for indie hackers and SaaS founders.
      </p>

      <div className="space-y-1">
        {all.map((post) => {
          const readingTime = estimateReadingTime(post.content)
          return (
            <article key={post.slug}>
              <Link
                href={`/blog/${post.slug}`}
                className="group block rounded-xl -mx-4 px-4 py-5 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-3 text-sm text-muted-foreground mb-1.5">
                  <time>
                    {new Date(post.publishedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </time>
                  <span className="text-border">·</span>
                  <span>{readingTime} min read</span>
                  {post.source === "auto" && (
                    <>
                      <span className="text-border">·</span>
                      <span className="inline-flex items-center text-[0.6875rem] uppercase tracking-wide font-medium text-orange-600 bg-orange-50 dark:bg-orange-950/40 px-1.5 py-0.5 rounded">
                        Weekly recap
                      </span>
                    </>
                  )}
                </div>
                <h2 className="text-lg font-semibold text-foreground group-hover:text-orange-600 transition-colors">
                  {post.title}
                </h2>
                <p className="text-muted-foreground mt-1.5 leading-relaxed text-[0.9375rem]">
                  {post.description}
                </p>
              </Link>
            </article>
          )
        })}
      </div>
    </main>
  )
}
