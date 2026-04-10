import type { Metadata } from "next"
import Link from "next/link"
import { getAllBlogPosts } from "@/lib/blog-posts"

export const metadata: Metadata = {
  title: "Blog — Vibe Code Ideas",
  description: "Guides, trends, and insights for indie hackers and SaaS founders.",
}

function estimateReadingTime(content: string): number {
  const words = content.split(/\s+/).length
  return Math.max(1, Math.ceil(words / 230))
}

export default function BlogPage() {
  const posts = getAllBlogPosts()

  return (
    <main className="max-w-2xl mx-auto px-5 sm:px-6 py-12">
      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">Blog</h1>
      <p className="text-lg text-muted-foreground mb-12">
        Trends, guides, and insights for indie hackers and SaaS founders.
      </p>

      <div className="space-y-1">
        {posts.map((post) => {
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
