/**
 * A/B test script for the "Why this is interesting" commentary feature.
 *
 * Generates commentary for 21 ideas using both Claude Haiku 4.5 and
 * Claude Sonnet 4.6, then writes a side-by-side markdown diff to
 * docs/commentary-ab-test.md for Luca to review before we commit to a
 * model choice for the backfill + ongoing pipeline.
 *
 * Cost: ~$0.10 total. One-shot script, not part of the build pipeline.
 *
 * Run: npx tsx scripts/ab-test-commentary.ts
 */

import Anthropic from "@anthropic-ai/sdk"
import * as dotenv from "dotenv"
import { writeFile } from "node:fs/promises"

dotenv.config({ path: ".env.local", override: true })

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const HAIKU = "claude-haiku-4-5-20251001"
const SONNET = "claude-sonnet-4-6"

interface TestIdea {
  id: string
  slug: string
  title: string
  summary: string
  category: string
  difficulty: number | null
  market_signal: string
  competition_level: string
  revenue_potential: string
  mention_count: number
  popularity_score: number
}

// 21 ideas pulled 2026-04-18 via execute_sql — top 3 per category for the 7
// categories that exercise the most diverse signal combinations. Hardcoded
// so the A/B test is reproducible and doesn't depend on whatever's in the
// DB at run time.
const IDEAS: TestIdea[] = [
  {"id":"32aeee28-f93c-4f5d-8c4a-33268534d476","slug":"gpt-powered-marketing-strategy-generator-mnpp8z05","title":"GPT-Powered Marketing Strategy Generator","summary":"Non-English speaking marketers and business owners need affordable, localized marketing strategies. An AI-powered tool that uses GPT to create tailored marketing strategies in multiple languages addresses this market gap. The post shows real traction (57 sales, $1,539) proving demand exists.","category":"ai-ml","difficulty":2,"market_signal":"unknown","competition_level":"unknown","revenue_potential":"unknown","mention_count":9,"popularity_score":7.68813874764834},
  {"id":"2869f7f3-930b-4c0b-99e9-b46e2df15e5e","slug":"gpt-4-marketing-strategy-generator-for-non-english-markets-mnt9uhcr","title":"GPT-4 Marketing Strategy Generator for Non-English Markets","summary":"Non-English speaking marketers struggle to create effective marketing strategies due to language barriers and cultural differences. This tool uses GPT-4 to generate localized marketing strategies tailored to specific markets and languages. Target users are small business owners and marketers in non-English speaking countries.","category":"ai-ml","difficulty":2,"market_signal":"unknown","competition_level":"unknown","revenue_potential":"unknown","mention_count":8,"popularity_score":7.36705694812857},
  {"id":"5d15c6c2-568b-4cc8-b178-da1b9dbf6b4e","slug":"personal-llm-character-creator-mnp2eqg5","title":"Personal LLM Character Creator","summary":"People want to experiment with AI and understand how language models work without deep ML expertise. A platform that lets anyone train a tiny LLM with custom personality data in minutes using free cloud compute. Target users: AI enthusiasts, educators, hobbyists.","category":"ai-ml","difficulty":2,"market_signal":"moderate","competition_level":"low","revenue_potential":"$300-1.5k/mo","mention_count":4,"popularity_score":5.57369636893147},
  {"id":"1e34e0df-d106-4424-8ca8-17135f9f6172","slug":"two-way-data-sync-for-no-code-apps-mnp3nv0i","title":"Two-Way Data Sync for No-Code Apps","summary":"No-code tool users (Airtable, Notion, Webflow) manually sync data between platforms, wasting time. A sync automation tool bridges these apps and keeps data in real-time. Target users: no-code builders, agencies, and small teams managing multiple platforms.","category":"automation","difficulty":3,"market_signal":"strong","competition_level":"medium","revenue_potential":"$2k-10k/mo","mention_count":5,"popularity_score":6.07148466269296},
  {"id":"c7380d46-631e-4f6e-b2e7-cda555dd6afc","slug":"property-management-automation-platform-mno8bmp0","title":"Property Management Automation Platform","summary":"Property managers spend excessive labor on leasing, maintenance routing, recertifications, and eviction processing despite these being highly repetitive tasks. An automation platform using workflow systems (not just AI) can eliminate 80% of labor while improving consistency and customer experience. Target users are property management companies managing multiple units seeking operational efficiency.","category":"automation","difficulty":3,"market_signal":"strong","competition_level":"medium","revenue_potential":"$5k-20k/mo","mention_count":4,"popularity_score":5.75027725254857},
  {"id":"b2475720-8b2a-4ab2-8ade-97f040ca07f8","slug":"smart-home-light-controller-dashboard-mnp3nlc4","title":"Smart Home Light Controller Dashboard","summary":"Home automation fans have scattered controls for Hue lights, presence sensors, and smart switches across multiple apps. This unified dashboard lets users control all lights, set automations based on presence detection, and create room-based scenes in one place. Target: tech-savvy homeowners with multi-brand smart home setups.","category":"automation","difficulty":3,"market_signal":"weak","competition_level":"medium","revenue_potential":"$500-2k/mo","mention_count":4,"popularity_score":5.5245148235611},
  {"id":"4ab79aa7-1096-49fe-b17a-bfd21923628e","slug":"github-issue-receipt-printer-mnp2er37","title":"GitHub Issue Receipt Printer","summary":"Developers and teams want a fun, visual way to print GitHub issues as receipts for documentation or novelty purposes. A simple tool that formats GitHub issue data into a receipt-style printout. Target users: developers, GitHub power users, teams.","category":"devtools","difficulty":1,"market_signal":"weak","competition_level":"low","revenue_potential":"$50-300/mo","mention_count":25,"popularity_score":10.4516286490091},
  {"id":"874f478e-7bab-46af-9334-8d2768acefee","slug":"developer-focused-ai-search-engine-mno8c9md","title":"Developer-Focused AI Search Engine","summary":"Phind is a specialized search engine that combines GPT-4 with curated technical documentation and websites to provide accurate code examples and technical answers without hallucinations. It solves the problem of developers needing both current information and AI-powered explanations for technical questions.","category":"devtools","difficulty":3,"market_signal":"strong","competition_level":"high","revenue_potential":"$5k-20k/mo","mention_count":25,"popularity_score":10.4516283356155},
  {"id":"74a826ab-3ce0-4022-b4cd-a587f7799bee","slug":"qr-code-generator-api-mnpp8ybc","title":"QR Code Generator API","summary":"A fast, simple QR code generation service that developers can easily integrate into their apps and websites. Handles high-volume requests efficiently with a clean API.","category":"devtools","difficulty":2,"market_signal":"unknown","competition_level":"unknown","revenue_potential":"unknown","mention_count":14,"popularity_score":8.88953388528302},
  {"id":"493b7406-c534-43ab-8c4e-2d699a58af51","slug":"competitor-price-monitoring-for-ecommerce-sellers-mnp3n7rj","title":"Competitor Price Monitoring for Ecommerce Sellers","summary":"Solo Etsy and Shopify sellers manually check competitor prices daily, which is tedious and error-prone. This tool automatically monitors competitor pricing changes and alerts sellers when prices drop. Target: independent ecommerce sellers and small online shops.","category":"ecommerce","difficulty":3,"market_signal":"strong","competition_level":"medium","revenue_potential":"$2k-10k/mo","mention_count":17,"popularity_score":9.36732147846581},
  {"id":"90927338-ed62-49f1-b534-984678322917","slug":"product-durability-reliability-rating-platform-mno8c9wo","title":"Product Durability & Reliability Rating Platform","summary":"A crowdsourced review and rating platform for durable goods (similar to Rotten Tomatoes but for products), helping consumers make informed decisions about product longevity and reliability. Users can rate and review the durability of everyday products they own.","category":"ecommerce","difficulty":3,"market_signal":"moderate","competition_level":"medium","revenue_potential":"$1k-5k/mo","mention_count":12,"popularity_score":8.49023381026378},
  {"id":"33cf9281-9e73-4ec2-8b3a-2d039e9977b8","slug":"used-car-price-mileage-visualizer-mnpp8yn1","title":"Used Car Price & Mileage Visualizer","summary":"An interactive chart-based search tool for used cars where each dot represents a listing, with mileage, price, and age instantly visible. Makes comparing cars faster and more intuitive than traditional lists.","category":"ecommerce","difficulty":2,"market_signal":"unknown","competition_level":"unknown","revenue_potential":"unknown","mention_count":10,"popularity_score":7.94906985986224},
  {"id":"5f410c1d-2217-49a5-b00d-78b9b3eb3088","slug":"budget-bloomberg-terminal-alternative-mnp2epj1","title":"Budget Bloomberg Terminal Alternative","summary":"Bloomberg Terminal costs $24k+/year and is inaccessible to most investors. A lightweight alternative with stock data, charts, and financial news would serve retail traders and small investors. Target: independent investors and traders.","category":"fintech","difficulty":3,"market_signal":"strong","competition_level":"high","revenue_potential":"$5k-20k/mo","mention_count":26,"popularity_score":10.8900030765694},
  {"id":"ee99deff-ac75-4ce9-ba9a-679290ea7c9c","slug":"international-payment-processor-for-micro-saas-mnpp8yvb","title":"International Payment Processor for Micro-SaaS","summary":"Micro-SaaS developers in unsupported countries struggle to process payments and receive funds. A simplified payment processor that accepts credit cards, supports subscriptions, and works without strict business documentation requirements would solve this gap. Target users are solo developers and small teams building SaaS products globally.","category":"fintech","difficulty":4,"market_signal":"unknown","competition_level":"unknown","revenue_potential":"unknown","mention_count":10,"popularity_score":7.97406925014002},
  {"id":"d6326ec7-fbc2-450a-b523-3b8478da4d5c","slug":"subscription-manager-cancellation-assistant-mnp3obi1","title":"Subscription Manager & Cancellation Assistant","summary":"A tool that helps users track their subscriptions, understand renewal terms, and easily cancel recurring services without friction. It identifies hard-to-cancel subscriptions and provides step-by-step cancellation guides. Target users are anyone frustrated with subscription management and hidden charges.","category":"fintech","difficulty":2,"market_signal":"strong","competition_level":"medium","revenue_potential":"$1k-4k/mo","mention_count":6,"popularity_score":6.5339368625914},
  {"id":"0bd1562b-019f-4416-bee6-aa192eedb1ac","slug":"doomscroll-blocker-with-grass-detection-mnp2eowx","title":"Doomscroll Blocker with Grass Detection","summary":"Phone addiction is real—users waste hours scrolling first thing in the morning. An app that locks distracting apps until the user physically touches grass (verified by phone camera) gamifies digital wellness. Target: anyone trying to reduce phone addiction.","category":"health","difficulty":2,"market_signal":"moderate","competition_level":"high","revenue_potential":"$200-1k/mo","mention_count":7,"popularity_score":7.00370732217793},
  {"id":"879120b5-c885-4ed7-bc6c-64f5ec78c9d4","slug":"client-portal-for-personal-trainers-mnp3n83d","title":"Client Portal for Personal Trainers","summary":"Personal trainers waste time sending workout plans, progress photos, and nutrition info through SMS and email. A dedicated client portal centralizes all coaching materials, progress tracking, and communication. Target: independent personal trainers and small fitness coaching businesses.","category":"health","difficulty":3,"market_signal":"strong","competition_level":"medium","revenue_potential":"$2k-7k/mo","mention_count":6,"popularity_score":6.53393424349418},
  {"id":"11c705b2-692d-43a3-a59b-f832fe4e7d21","slug":"touch-grass-phone-addiction-blocker-mnsk4kdv","title":"Touch Grass - Phone Addiction Blocker","summary":"People waste hours doomscrolling on their phones first thing in the morning. This app blocks access to distracting apps until the user physically goes outside and touches grass (verified via phone camera + AI vision). A fun, low-tech solution to a high-tech problem.","category":"health","difficulty":2,"market_signal":"unknown","competition_level":"unknown","revenue_potential":"unknown","mention_count":6,"popularity_score":6.17027958106125},
  {"id":"950ad695-0fcb-442e-b120-21b99d3ee64b","slug":"nugget-saas-idea-search-engine-mnoziaqe","title":"Nugget - SaaS Idea Search Engine","summary":"A searchable database and community platform where entrepreneurs can browse, discover, and bookmark startup ideas. Users can filter by industry, difficulty, market size, and search through thousands of curated SaaS opportunities to validate before building.","category":"productivity","difficulty":3,"market_signal":"weak","competition_level":"high","revenue_potential":"$500-2k/mo","mention_count":18,"popularity_score":9.61764197549423},
  {"id":"2d2cbe72-da1b-41de-be0a-bee4f15e2c08","slug":"family-e-paper-dashboard-mnp2epu5","title":"Family E-Paper Dashboard","summary":"Families want a shared digital display for schedules, weather, and reminders without phones everywhere. An e-paper dashboard lets families see shared info at a glance. Target: families looking to reduce screen time while staying coordinated.","category":"productivity","difficulty":2,"market_signal":"moderate","competition_level":"medium","revenue_potential":"$500-2k/mo","mention_count":10,"popularity_score":7.94906921090391},
  {"id":"eda77b21-4172-490e-9755-8b39442b0457","slug":"saas-idea-validator-mnoziaut","title":"SaaS Idea Validator","summary":"Founders and creators get surface-level feedback from AI that says every idea is good. This tool gives brutally honest critique by analyzing your idea against market trends, competitor landscape, and realistic failure modes—then rates it honestly instead of with false encouragement.","category":"productivity","difficulty":3,"market_signal":"moderate","competition_level":"high","revenue_potential":"$500-2k/mo","mention_count":6,"popularity_score":6.78022036356962},
]

/**
 * Commentary prompt — deliberately terse. We want the model to write like a
 * senior operator writing a short analyst note, not like a marketing
 * assistant. Asking for structure (timing / competitor / economics / risk)
 * keeps both models honest and gives us something concrete to A/B against.
 */
function buildPrompt(idea: TestIdea): string {
  return `You are writing a one-paragraph "why this is interesting" commentary for a directory page about a SaaS / product idea. The directory audience is indie hackers and developer-founders researching what to build.

Write 2-4 sentences that cover:
1. Market timing — why this is interesting *right now* (mention real trends if they exist, don't fabricate)
2. Closest competitor or substitute — name one if a well-known one exists, otherwise say "no clear incumbent"
3. Unit economics hint — why the revenue band makes sense (or doesn't)
4. Biggest risk — the single most likely reason this idea fails

Tone: direct, specific, no hype. Short declarative sentences. Avoid filler phrases like "could be a great opportunity" or "definitely has potential". If the idea is weak, say so. Do NOT restate the idea's summary. Do NOT use the phrase "this idea" — just discuss the thing. No headers, no bullets, no markdown. Just prose.

Context:
- Title: ${idea.title}
- Summary: ${idea.summary}
- Category: ${idea.category}
- Difficulty: ${idea.difficulty}/5
- Market signal: ${idea.market_signal}
- Competition: ${idea.competition_level}
- Revenue band: ${idea.revenue_potential}
- Cross-source mentions: ${idea.mention_count}

Return only the paragraph. No preamble.`
}

async function generate(model: string, idea: TestIdea): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
  const res = await anthropic.messages.create({
    model,
    max_tokens: 400,
    messages: [{ role: "user", content: buildPrompt(idea) }],
  })
  const block = res.content[0]
  const text = block && block.type === "text" ? block.text : ""
  return {
    text: text.trim(),
    inputTokens: res.usage.input_tokens,
    outputTokens: res.usage.output_tokens,
  }
}

async function main() {
  console.log(`A/B testing commentary on ${IDEAS.length} ideas with ${HAIKU} vs ${SONNET}...`)

  const rows: string[] = []
  rows.push("# Commentary A/B Test — Haiku 4.5 vs Sonnet 4.6")
  rows.push("")
  rows.push(`Run: ${new Date().toISOString()}`)
  rows.push(`Ideas: ${IDEAS.length}`)
  rows.push(`Prompt: see \`scripts/ab-test-commentary.ts\``)
  rows.push("")
  rows.push("## How to read this")
  rows.push("")
  rows.push("Each idea is shown with its metadata, then Haiku output, then Sonnet output. Ask yourself:")
  rows.push("1. Does the commentary add *new* information beyond the summary, or does it just restate it?")
  rows.push("2. Are the timing claims grounded, or hand-wavy?")
  rows.push("3. Is the named competitor real and relevant?")
  rows.push("4. Is the risk actually the biggest risk, or a generic one?")
  rows.push("5. Would you be OK with this showing next to every idea on the site?")
  rows.push("")
  rows.push("The cost delta: backfilling all 2,157 ideas costs ~$0.50 with Haiku vs ~$2 with Sonnet. Per-new-idea: $0.0003 vs $0.0012. Over a year of 30 new ideas/day, Haiku = $3, Sonnet = $13.")
  rows.push("")
  rows.push("---")
  rows.push("")

  let totalHaikuIn = 0, totalHaikuOut = 0, totalSonnetIn = 0, totalSonnetOut = 0

  for (let i = 0; i < IDEAS.length; i++) {
    const idea = IDEAS[i]
    console.log(`[${i + 1}/${IDEAS.length}] ${idea.title}`)

    const [haiku, sonnet] = await Promise.all([
      generate(HAIKU, idea),
      generate(SONNET, idea),
    ])

    totalHaikuIn += haiku.inputTokens
    totalHaikuOut += haiku.outputTokens
    totalSonnetIn += sonnet.inputTokens
    totalSonnetOut += sonnet.outputTokens

    rows.push(`## ${i + 1}. ${idea.title}`)
    rows.push("")
    rows.push(`**Category:** ${idea.category}  •  **Difficulty:** ${idea.difficulty}/5  •  **Signal:** ${idea.market_signal}  •  **Competition:** ${idea.competition_level}  •  **Revenue:** ${idea.revenue_potential}  •  **Mentions:** ${idea.mention_count}`)
    rows.push("")
    rows.push("**Original summary:**")
    rows.push("")
    rows.push(`> ${idea.summary}`)
    rows.push("")
    rows.push("### Haiku 4.5")
    rows.push("")
    rows.push(haiku.text)
    rows.push("")
    rows.push("### Sonnet 4.6")
    rows.push("")
    rows.push(sonnet.text)
    rows.push("")
    rows.push("---")
    rows.push("")
  }

  // Rough cost math using public pricing:
  //   Haiku 4.5 = $0.80 / $4.00 per M tokens
  //   Sonnet 4.6 = $3.00 / $15.00 per M tokens
  const haikuCost = (totalHaikuIn * 0.8 + totalHaikuOut * 4.0) / 1_000_000
  const sonnetCost = (totalSonnetIn * 3.0 + totalSonnetOut * 15.0) / 1_000_000

  rows.push("## Cost summary")
  rows.push("")
  rows.push(`| Model | Input tokens | Output tokens | Cost (USD) |`)
  rows.push(`|---|---|---|---|`)
  rows.push(`| Haiku 4.5 | ${totalHaikuIn} | ${totalHaikuOut} | $${haikuCost.toFixed(4)} |`)
  rows.push(`| Sonnet 4.6 | ${totalSonnetIn} | ${totalSonnetOut} | $${sonnetCost.toFixed(4)} |`)
  rows.push("")
  rows.push(`Per-idea: Haiku $${(haikuCost / IDEAS.length).toFixed(5)}, Sonnet $${(sonnetCost / IDEAS.length).toFixed(5)}.`)
  rows.push(`Scaled backfill for 2,157 ideas: Haiku ~$${(haikuCost / IDEAS.length * 2157).toFixed(2)}, Sonnet ~$${(sonnetCost / IDEAS.length * 2157).toFixed(2)}.`)
  rows.push("")

  const output = rows.join("\n")
  const outPath = "docs/commentary-ab-test.md"
  await writeFile(outPath, output, "utf8")
  console.log(`\nDone. Wrote ${output.length} chars to ${outPath}`)
  console.log(`Haiku: $${haikuCost.toFixed(4)}  Sonnet: $${sonnetCost.toFixed(4)}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
