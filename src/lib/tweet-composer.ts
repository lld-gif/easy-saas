/**
 * Composes tweets for trending SaaS ideas using multiple template variations.
 * Uses a deterministic hash of the slug to select a template so the same idea
 * always produces the same tweet format.
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
const TEMPLATE_COUNT = 6

/** Must match displayMentions in utils.ts */
function displayMentions(count: number): number {
  return count * 5 + (count % 4) + 1
}

/**
 * Simple string hash that returns a positive integer.
 * Used to deterministically pick a template from the slug.
 */
function hashSlug(slug: string): number {
  let hash = 0
  for (let i = 0; i < slug.length; i++) {
    hash = (hash * 31 + slug.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

/**
 * Extracts the first sentence from a text string.
 * Falls back to the full text if no sentence boundary is found.
 */
function firstSentence(text: string): string {
  const match = text.match(/^[^.!?]+[.!?]/)
  return match ? match[0].trim() : text
}

type TemplateBuilder = (idea: TweetIdea, mentions: number, category: string, url: string) => string

/**
 * Each template builder returns a tweet string, using truncateSummary
 * to fit the variable-length summary within the 280-char limit.
 */
const templates: TemplateBuilder[] = [
  // 0: Original format — fire emoji + "SaaS idea:"
  (idea, mentions, category, url) => {
    const prefix = `\u{1F525} SaaS idea: ${idea.title}`
    const mentionLine = `${mentions} independent mention${mentions !== 1 ? "s" : ""} \u00b7 ${category}`
    const suffix = `${mentionLine}\n\n${url}`
    const overhead = prefix.length + 4 + suffix.length // 4 = two "\n\n"
    const summary = truncateSummary(idea.summary ?? "", MAX_TWEET_LENGTH - overhead)
    return summary ? `${prefix}\n\n${summary}\n\n${suffix}` : `${prefix}\n\n${suffix}`
  },

  // 1: Question hook
  (idea, mentions, _category, url) => {
    const prefix = `Looking for a micro-SaaS to build?`
    const suffix = `${mentions} mention${mentions !== 1 ? "s" : ""} \u00b7 ${url}`
    // Format: prefix \n\n Title — summary \n\n suffix
    const titlePart = idea.title
    const overhead = prefix.length + 4 + titlePart.length + 3 + suffix.length // 3 = " — "
    const summary = truncateSummary(idea.summary ?? "", MAX_TWEET_LENGTH - overhead)
    return summary
      ? `${prefix}\n\n${titlePart} \u2014 ${summary}\n\n${suffix}`
      : `${prefix}\n\n${titlePart}\n\n${suffix}`
  },

  // 2: Problem-first
  (idea, mentions, category, url) => {
    const problem = firstSentence(idea.summary ?? "")
    const suffix = `${mentions} mention${mentions !== 1 ? "s" : ""} \u00b7 ${category} \u00b7 ${url}`
    const base = `Problem: ${problem}\nSolution: ${idea.title}\n\n${suffix}`
    if (base.length <= MAX_TWEET_LENGTH) return base
    // If problem is too long, truncate it
    const overhead = "Problem: ".length + "\nSolution: ".length + idea.title.length + 2 + suffix.length
    const truncProblem = truncateSummary(problem, MAX_TWEET_LENGTH - overhead)
    return `Problem: ${truncProblem}\nSolution: ${idea.title}\n\n${suffix}`
  },

  // 3: Data-driven
  (idea, mentions, _category, url) => {
    const prefix = `\u{1F4CA} ${idea.title} has ${mentions} independent mention${mentions !== 1 ? "s" : ""} across the web.`
    const suffix = url
    const overhead = prefix.length + 4 + suffix.length // 4 = two "\n\n"
    const summary = truncateSummary(idea.summary ?? "", MAX_TWEET_LENGTH - overhead)
    return summary ? `${prefix}\n\n${summary}\n\n${suffix}` : `${prefix}\n\n${suffix}`
  },

  // 4: Build challenge
  (idea, _mentions, _category, url) => {
    const prefix = `Weekend build idea \u{1F4A1} ${idea.title}`
    const suffix = url
    const overhead = prefix.length + 4 + suffix.length
    const summary = truncateSummary(idea.summary ?? "", MAX_TWEET_LENGTH - overhead)
    return summary
      ? `${prefix} \u2014 ${summary}\n\n${suffix}`
      : `${prefix}\n\n${suffix}`
  },

  // 5: Trending in category
  (idea, mentions, category, url) => {
    const prefix = `Trending in ${category}: ${idea.title}.`
    const suffix = `${mentions} mention${mentions !== 1 ? "s" : ""} \u00b7 ${url}`
    const overhead = prefix.length + 4 + suffix.length
    const summary = truncateSummary(idea.summary ?? "", MAX_TWEET_LENGTH - overhead)
    return summary ? `${prefix}\n\n${summary}\n\n${suffix}` : `${prefix}\n\n${suffix}`
  },
]

export function composeTweet(idea: TweetIdea): string {
  const url = `${SITE_DOMAIN}/ideas/${idea.slug}`
  const mentions = displayMentions(idea.mention_count ?? 0)
  const category = idea.category ?? "SaaS"

  const templateIndex = hashSlug(idea.slug) % TEMPLATE_COUNT
  const tweet = templates[templateIndex](idea, mentions, category, url)

  // Safety net: if a template somehow exceeds 280, hard-truncate
  if (tweet.length > MAX_TWEET_LENGTH) {
    return tweet.slice(0, MAX_TWEET_LENGTH - 1) + "\u2026"
  }

  return tweet
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
