import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createScrapeHandler } from "../_shared/extract.ts"

async function fetchGitHub(): Promise<string[]> {
  const posts: string[] = []

  try {
    const since = new Date()
    since.setDate(since.getDate() - 7)
    const url = `https://api.github.com/search/repositories?q=created:>${since.toISOString().split("T")[0]}&sort=stars&order=desc&per_page=30`
    const headers: Record<string, string> = { Accept: "application/vnd.github.v3+json" }

    const token = Deno.env.get("GITHUB_TOKEN")
    if (token) headers["Authorization"] = `Bearer ${token}`

    const res = await fetch(url, { headers })
    if (!res.ok) return posts
    const data = await res.json()

    for (const repo of data.items || []) {
      if (repo.description) {
        posts.push(
          `Repo: ${repo.full_name}\nDescription: ${repo.description}\nStars: ${repo.stargazers_count}\nLanguage: ${repo.language || "unknown"}\nTopics: ${(repo.topics || []).join(", ")}`
        )
      }
    }
  } catch (e) {
    console.warn("Failed to fetch GitHub:", e)
  }

  return posts
}

Deno.serve(
  createScrapeHandler(
    "github",
    fetchGitHub,
    "from GitHub trending repositories — extract the core idea/problem they solve as a potential SaaS product"
  )
)
