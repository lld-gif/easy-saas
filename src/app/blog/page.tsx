import type { Metadata } from "next"
import Link from "next/link"
import { getAllBlogPosts } from "@/lib/blog-posts"

export const metadata: Metadata = {
  title: "Blog — Vibe Code Ideas",
  description: "Guides, trends, and insights for indie hackers and SaaS founders.",
}

export default function BlogPage() {
  const posts = getAllBlogPosts()

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">Blog</h1>
      <p className="text-muted-foreground mb-10">
        Trends, guides, and insights for indie hackers and SaaS founders.
      </p>

      <div className="space-y-8">
        {posts.map((post) => (
          <article key={post.slug} className="group">
            <Link href={`/blog/${post.slug}`} className="block">
              <time className="text-sm text-muted-foreground">
                {new Date(post.publishedAt).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </time>
              <h2 className="text-xl font-semibold mt-1 group-hover:text-indigo-600 transition-colors">
                {post.title}
              </h2>
              <p className="text-muted-foreground mt-2 leading-relaxed">
                {post.description}
              </p>
            </Link>
          </article>
        ))}
      </div>
    </main>
  )
}
