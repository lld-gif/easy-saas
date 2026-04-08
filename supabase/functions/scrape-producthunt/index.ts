import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createScrapeHandler } from "../_shared/extract.ts"

async function fetchProductHunt(): Promise<string[]> {
  const posts: string[] = []

  // Try the GraphQL API first (requires token)
  const phToken = Deno.env.get("PRODUCTHUNT_API_TOKEN")

  if (phToken) {
    try {
      const query = `{
        posts(order: VOTES, first: 30) {
          edges {
            node {
              name
              tagline
              description
              votesCount
              topics { edges { node { name } } }
            }
          }
        }
      }`

      const res = await fetch("https://api.producthunt.com/v2/api/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${phToken}`,
        },
        body: JSON.stringify({ query }),
      })

      if (res.ok) {
        const data = await res.json()
        const edges = data?.data?.posts?.edges || []

        for (const edge of edges) {
          const node = edge.node
          const topics = (node.topics?.edges || [])
            .map((t: any) => t.node.name)
            .join(", ")

          posts.push(
            `Product: ${node.name}\nTagline: ${node.tagline}\nDescription: ${node.description || "N/A"}\nVotes: ${node.votesCount}\nTopics: ${topics}`
          )
        }
      }
    } catch (e) {
      console.warn("Product Hunt GraphQL failed:", e)
    }
  }

  // Fallback: scrape the public page if no token or API failed
  if (posts.length === 0) {
    try {
      const res = await fetch("https://www.producthunt.com/", {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; EasySaaS/2.0)",
          "Accept": "text/html",
        },
      })
      if (res.ok) {
        const html = await res.text()
        // Extract product names and taglines from meta/OG data and structured text
        const titleMatches = html.matchAll(/<h3[^>]*>([^<]+)<\/h3>/gi)
        for (const match of titleMatches) {
          if (match[1].length > 5 && match[1].length < 100) {
            posts.push(`Product: ${match[1].trim()}`)
          }
        }
      }
    } catch (e) {
      console.warn("Product Hunt HTML fallback failed:", e)
    }
  }

  return posts
}

Deno.serve(
  createScrapeHandler(
    "producthunt",
    fetchProductHunt,
    "from Product Hunt trending products — these are already validated products, extract the core idea/problem they solve as a potential SaaS idea that someone could build their own version of"
  )
)
