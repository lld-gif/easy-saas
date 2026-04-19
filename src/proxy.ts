import { NextRequest, NextResponse } from "next/server"

/**
 * GEO proxy (formerly middleware) — annotates AI-crawler requests so
 * downstream layers (Vercel Edge rate limits, API route handlers, Web
 * Application Firewall rules) can treat them differently from anonymous
 * human traffic.
 *
 * Next renamed `middleware.ts` → `proxy.ts` in 2026; the semantics are
 * identical except the exported function is named `proxy` instead of
 * `middleware`. See node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md.
 *
 * **Why this exists.** Several AI crawlers, especially Perplexity and
 * ChatGPT-User during live browsing, hit pages in bursts when a user
 * prompts them. An aggressive IP-based rate limiter tuned for browsers
 * can throttle these bots mid-citation and leave them with partial page
 * content, degrading the citation back. We don't want that.
 *
 * **What this file does today.** It identifies the request's user-agent
 * against a known-AI-bot list and sets two response headers:
 *   - `X-Bot-Class: ai-citation` — when the UA matches an AI crawler we
 *     want to encourage. Vercel WAF rules, logging, and any future rate
 *     limiter can key off this header.
 *   - `X-Bot-Class: ai-training-blocked` — when the UA matches a
 *     training-only crawler we don't want (CCBot, Bytespider, etc.).
 *     These requests pass through for now; `robots.ts` already tells
 *     them to leave via Disallow: /, and if they ignore that we can
 *     add a 403 short-circuit here later without breaking anything.
 *
 * **What this file intentionally does NOT do.** We do not implement a
 * rate limiter inline. Vercel's Edge platform already ships a rate
 * limiter that respects custom headers, and building our own in
 * middleware adds complexity for no near-term benefit — VCI's current
 * traffic profile doesn't have a rate-limit problem. The header is the
 * abstraction layer.
 *
 * Matcher config below skips Next internals, static assets, and
 * Supabase auth callbacks so we don't pay the UA-sniff cost on every
 * font and image request.
 */

// Exact substring matches against the lowercased User-Agent. Keep this
// in sync with the allowlist in `src/app/robots.ts`.
const AI_CITATION_BOTS = [
  "gptbot",
  "oai-searchbot",
  "chatgpt-user",
  "perplexitybot",
  "perplexity-user",
  "claudebot",
  "claude-web",
  "claude-searchbot",
  "google-extended",
  "applebot-extended",
  "amazonbot",
  "duckassistbot",
]

// Training-only crawlers that aren't supposed to be here per robots.txt.
// Kept in sync with the blocklist in `src/app/robots.ts`.
const AI_TRAINING_BLOCKED_BOTS = [
  "ccbot",
  "bytespider",
  "anthropic-ai", // legacy Anthropic training UA, distinct from ClaudeBot
  "cohere-ai",
  "facebookbot",
]

type BotClass = "ai-citation" | "ai-training-blocked" | null

function classifyUserAgent(ua: string): BotClass {
  const lower = ua.toLowerCase()
  for (const needle of AI_CITATION_BOTS) {
    if (lower.includes(needle)) return "ai-citation"
  }
  for (const needle of AI_TRAINING_BLOCKED_BOTS) {
    if (lower.includes(needle)) return "ai-training-blocked"
  }
  return null
}

export function proxy(request: NextRequest) {
  const ua = request.headers.get("user-agent") ?? ""
  const botClass = classifyUserAgent(ua)

  // NextResponse.next() accepts a `request.headers` payload for mutating
  // headers that downstream route handlers see. We set the bot class as
  // a request header so route handlers, logging, and Vercel WAF rules
  // can read it off the incoming request. We also mirror it onto the
  // response for downstream rate-limit inspection.
  const requestHeaders = new Headers(request.headers)
  if (botClass) {
    requestHeaders.set("x-bot-class", botClass)
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
  if (botClass) {
    response.headers.set("x-bot-class", botClass)
  }
  return response
}

export const config = {
  // Run on HTML, api, llms.txt, ideas/.md — skip static assets and
  // Next internals. Keep the regex conservative; anything not explicitly
  // matched here bypasses the middleware, which is the safe default.
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, apple-touch-icon.png (favicons)
     * - icon.svg (logo)
     * - auth (Supabase OAuth callback — don't touch auth flow headers)
     */
    "/((?!_next/static|_next/image|favicon.ico|apple-touch-icon.png|icon.svg|auth).*)",
  ],
}
