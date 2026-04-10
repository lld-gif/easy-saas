import { NextResponse } from "next/server"
import { getIdeas } from "@/lib/queries"
import { parseSearchParams } from "@/lib/utils"

/**
 * GET /api/ideas — single source of truth for the ideas listing query.
 *
 * Accepts the same query params as the /ideas page (q, category, popularity,
 * time, sort, difficulty, cursor) and returns `{ ideas, nextCursor }`. Used by
 * `InfiniteIdeas` to paginate so the client never re-implements filter/sort
 * logic and drifts from the server-rendered first page.
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const params: Record<string, string> = {}
    for (const [key, value] of url.searchParams.entries()) {
      params[key] = value
    }

    const filters = parseSearchParams(params)
    const result = await getIdeas(filters)

    return NextResponse.json(result, {
      headers: {
        // Short edge cache: same URL → same result for 30s, revalidate in background
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    })
  } catch (error) {
    console.error("GET /api/ideas failed:", error)
    return NextResponse.json(
      { ideas: [], nextCursor: null, error: "Failed to fetch ideas" },
      { status: 500 }
    )
  }
}
