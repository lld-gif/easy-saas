import { createClient } from "@supabase/supabase-js"

/**
 * Public shape of an auto-generated blog post. Mirrors the static
 * BlogPost interface in src/lib/blog-posts.ts so the /blog index can
 * iterate a unified list without per-source branching at the JSX layer.
 *
 * `source` lets the renderer decide whether to badge a post as
 * machine-written (e.g. an "Auto roundup" tag) without needing to
 * inspect content patterns at render time.
 */
export interface AutoBlogPost {
  slug: string
  title: string
  description: string
  content: string
  publishedAt: string
  generatedBy: string
  metadata: Record<string, unknown>
}

// Lazy client — keeps top-level imports cheap on cold-start and avoids
// crashing the module load if env vars are missing in a non-runtime
// context (e.g. type-check during build before secrets are available).
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error("Supabase env not configured for auto-blog reader")
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/**
 * Reads every auto-blog post, newest first. Errors are swallowed and
 * logged — a DB outage should degrade /blog to "static posts only,"
 * not 500 the page.
 */
export async function getAutoBlogPosts(): Promise<AutoBlogPost[]> {
  try {
    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from("auto_blog_posts")
      .select(
        "slug, title, description, content, published_at, generated_by, metadata"
      )
      .order("published_at", { ascending: false })
    if (error) {
      console.error("getAutoBlogPosts:", error)
      return []
    }
    return (data ?? []).map(rowToPost)
  } catch (err) {
    console.error("getAutoBlogPosts threw:", err)
    return []
  }
}

/**
 * Single-post lookup for /blog/[slug] dynamic-fallback. Returns null
 * when the slug isn't a DB-backed post — caller falls through to
 * notFound().
 */
export async function getAutoBlogPost(
  slug: string
): Promise<AutoBlogPost | null> {
  try {
    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from("auto_blog_posts")
      .select(
        "slug, title, description, content, published_at, generated_by, metadata"
      )
      .eq("slug", slug)
      .maybeSingle()
    if (error || !data) return null
    return rowToPost(data)
  } catch {
    return null
  }
}

interface AutoBlogRow {
  slug: string
  title: string
  description: string
  content: string
  published_at: string
  generated_by: string
  metadata: unknown
}

function rowToPost(r: AutoBlogRow): AutoBlogPost {
  return {
    slug: r.slug,
    title: r.title,
    description: r.description,
    content: r.content,
    publishedAt: r.published_at,
    generatedBy: r.generated_by,
    metadata: (r.metadata as Record<string, unknown>) ?? {},
  }
}
