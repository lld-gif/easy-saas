import { NextResponse } from "next/server"

/**
 * IndexNow key verification file.
 *
 * IndexNow (https://www.indexnow.org) is a free, open protocol that
 * notifies participating search engines (Bing, Yandex, Seznam, Naver) the
 * instant new content is published, instead of waiting for them to
 * recrawl on their own schedule. Bing feeds Copilot, so this is the
 * fastest path from "new VCI idea inserted" to "Copilot can cite it".
 *
 * The protocol requires domain ownership verification: each request to
 * the IndexNow API includes a key, and the API verifies ownership by
 * fetching `https://vibecodeideas.ai/{key}.txt` and checking that the
 * body contains exactly the key. That's all this file does.
 *
 * Key generated 2026-04-19 via `crypto.randomBytes(16).toString("hex")`.
 * Matches the hard-coded key in src/lib/indexnow.ts. If we ever rotate
 * it, rename this directory AND update the lib constant in the same
 * commit so verification doesn't break mid-deploy.
 */

const INDEXNOW_KEY = "5436c73b9397607f618476f0877477ca"

export function GET() {
  return new NextResponse(INDEXNOW_KEY, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  })
}
