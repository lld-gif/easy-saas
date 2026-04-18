import type { MetadataRoute } from "next"

/**
 * GEO-aware robots policy.
 *
 * Three rule groups:
 *   1. Citation-forward AI crawlers — explicitly allowed. These are the
 *      user-agents that surface citations in ChatGPT / Claude / Perplexity /
 *      Gemini / Copilot results. We want them reading everything except
 *      admin + API.
 *   2. Training-only crawlers with no citation reciprocity — blocked from
 *      the whole site. They'd consume our content for model training without
 *      ever sending traffic back.
 *   3. Everyone else — same policy as the allowlist (allow /, disallow admin
 *      + api). This keeps classical SEO crawlers (Googlebot, Bingbot,
 *      DuckDuckBot) working.
 *
 * Ordering matters in `MetadataRoute.Robots`. More specific rules should be
 * listed before the wildcard so that crawlers matching multiple rules pick
 * the most specific one.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Citation-forward AI crawlers
      {
        userAgent: [
          "GPTBot",            // ChatGPT indexer
          "OAI-SearchBot",     // ChatGPT search (distinct from GPTBot)
          "ChatGPT-User",      // Live browsing on user prompts
          "PerplexityBot",     // Perplexity indexer
          "Perplexity-User",   // Perplexity live browsing
          "ClaudeBot",         // Anthropic indexer (current)
          "Claude-Web",        // Claude live browsing
          "Claude-SearchBot",  // Claude search
          "Google-Extended",   // Gemini training corpus (distinct from Googlebot)
          "Applebot-Extended", // Apple Intelligence
          "Amazonbot",         // Alexa / Rufus
          "DuckAssistBot",     // DuckDuckGo AI answers
        ],
        allow: "/",
        disallow: ["/admin", "/api/"],
      },
      // Training-only crawlers — no citations, blocked
      {
        userAgent: [
          "CCBot",        // Common Crawl
          "Bytespider",   // ByteDance
          "anthropic-ai", // Legacy training UA (replaced by ClaudeBot)
          "cohere-ai",    // Cohere training
          "FacebookBot",  // Meta AI training
        ],
        disallow: "/",
      },
      // Everyone else (Googlebot, Bingbot, DuckDuckBot, etc.)
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/"],
      },
    ],
    sitemap: "https://vibecodeideas.ai/sitemap.xml",
    host: "https://vibecodeideas.ai",
  }
}
