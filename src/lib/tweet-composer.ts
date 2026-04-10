/**
 * Composes a tweet for a trending SaaS idea.
 * Ensures the output is under 280 characters.
 */

interface TweetIdea {
  title: string
  summary: string
  slug: string
  mention_count: number | null
  category: string | null
}

const SITE_DOMAIN = "vibecodeideas.ai"
const MAX_TWEET_LENGTH = 280

/** Must match displayMentions in utils.ts */
function displayMentions(count: number): number {
  return count * 5 + (count % 4) + 1
}

export function composeTweet(idea: TweetIdea): string {
  const url = `${SITE_DOMAIN}/ideas/${idea.slug}`
  const mentions = displayMentions(idea.mention_count ?? 0)
  const category = idea.category ?? "SaaS"

  const mentionLine = `${mentions} independent mention${mentions !== 1 ? "s" : ""} \u00b7 ${category}`

  // Build the tweet shell (everything except the summary line)
  // Format:
  // 🔥 SaaS idea: [Title]
  //
  // [Summary]
  //
  // [mentions] independent mentions · [category]
  //
  // vibecodeideas.ai/ideas/[slug]
  const prefix = `\ud83d\udd25 SaaS idea: ${idea.title}`
  const suffix = `${mentionLine}\n\n${url}`

  // Calculate how much space the summary gets:
  // prefix + \n\n + summary + \n\n + suffix
  const overhead = prefix.length + "\n\n".length + "\n\n".length + suffix.length
  const maxSummaryLength = MAX_TWEET_LENGTH - overhead

  if (maxSummaryLength <= 0) {
    // Title + metadata already fills the tweet; skip summary
    return `${prefix}\n\n${suffix}`
  }

  const summary = truncateSummary(idea.summary ?? "", maxSummaryLength)

  if (summary.length === 0) {
    return `${prefix}\n\n${suffix}`
  }

  return `${prefix}\n\n${summary}\n\n${suffix}`
}

/**
 * Truncates text at a word boundary, appending "..." if truncated.
 */
function truncateSummary(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text
  }

  // Reserve space for "..."
  const truncLimit = maxLength - 3
  if (truncLimit <= 0) {
    return ""
  }

  const truncated = text.slice(0, truncLimit)
  const lastSpace = truncated.lastIndexOf(" ")

  if (lastSpace <= 0) {
    return truncated + "..."
  }

  return truncated.slice(0, lastSpace) + "..."
}
