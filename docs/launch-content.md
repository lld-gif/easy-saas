# VCI Launch Content Package

Updated 2026-04-12. Ready to post — review copy, then execute the posting schedule at the bottom.

**Current stats:** 2,000+ active ideas | 3,000+ source posts processed | 8 blog posts | Weekly newsletter (Tuesdays 14:00 UTC) | Daily auto-tweet (@vibecodeideas_)

---

## Screenshots Needed Before Launch

Capture these on https://vibecodeideas.ai before posting to Product Hunt:

- [ ] Hero: homepage above the fold showing the headline + top trending ideas
- [ ] Card view: `/ideas` showing idea cards with Popular badges, category chips, difficulty, revenue
- [ ] Revenue filter: `/ideas?sort=revenue&revenue=25k` showing the revenue sort + filter in action
- [ ] Detail page: any high-mention idea (`/ideas/[slug]`) showing the signal bars, summary, tags
- [ ] Newsletter preview: the rendered email from the dryRun endpoint (save as screenshot from `/admin/newsletter-preview` or from your email client after the first Tuesday send)

---

## SEO Status (checked 2026-04-12)

**Critical finding: ZERO pages indexed by Google.** A `site:vibecodeideas.ai` search returns no results. The site has been live since ~2026-04-07 (~5 days) and Google hasn't crawled a single page despite having a valid sitemap at `/sitemap.xml`, correct `robots.txt`, and no `noindex` tags.

**Likely causes (in order of probability):**
1. Domain is brand new — Google hasn't discovered it yet. The sitemap exists but was never manually submitted to GSC.
2. No external backlinks point to the domain. Google discovers new sites primarily through links from existing indexed pages.
3. The PH/HN/Reddit launch posts below will create the first external backlinks, which should trigger Google's crawler within 24-48 hours.

**Action items (do BEFORE or DAY OF the launch):**
1. **Submit sitemap manually in GSC:** Go to https://search.google.com/search-console → `vibecodeideas.ai` property → Sitemaps → Add `https://vibecodeideas.ai/sitemap.xml` → Submit
2. **Request indexing on key pages:** In GSC → URL Inspection → paste each URL → "Request Indexing":
   - `https://vibecodeideas.ai/` (homepage)
   - `https://vibecodeideas.ai/ideas` (browse page)
   - `https://vibecodeideas.ai/ideas/trending` (trending page)
   - `https://vibecodeideas.ai/blog/top-saas-ideas-2026` (best blog post for SEO)
   - `https://vibecodeideas.ai/blog/micro-saas-ideas-2026`
3. **After the launch:** The PH, HN, and Reddit posts will create backlinks. Google should discover and start crawling within 24-48 hours of the first external link. Re-check `site:vibecodeideas.ai` one week after launch — expect 50-200 indexed pages by then.

---

## 1. Product Hunt Launch

**Tagline (60 chars):** Browse 2,000+ SaaS ideas ranked by real demand signals

**Description:**

Vibe Code Ideas monitors Hacker News, Reddit, Indie Hackers, Product Hunt, and GitHub daily to find the SaaS ideas developers and founders are actually talking about.

Every idea is extracted from real conversations, deduplicated, and scored by mention volume, market demand, revenue potential, competition, and difficulty — so you can skip the brainstorming and go straight to building.

**What makes it different:**
- **2,000+ ideas** extracted from 3,000+ real posts across 6 platforms
- **Sort by revenue potential** — find ideas with $10k-$100k/mo ceilings
- **Filter by difficulty** — from weekend builds to complex infrastructure
- **Popular badges** — the top 1% of ideas by mention volume get highlighted
- **Weekly newsletter** — the best ideas delivered every Tuesday
- **Daily auto-tweet** — @vibecodeideas_ posts a trending idea every day

**Pro tier ($7/mo):** Generate a full business package for any idea — competitive analysis, tech stack, MVP roadmap, brand kit, and launch checklist.

**Built for:** Indie hackers, solo founders, vibe coders, and developers who'd rather build something people want than brainstorm in a vacuum.

**Maker Comment (post this as the first comment on the PH listing):**

Hey PH! I'm Luca. I built Vibe Code Ideas because I kept doing the same thing every time I wanted a new project — manually scanning HN, Reddit, and GitHub for ideas, then spending hours validating them.

So I automated the whole thing. The pipeline runs daily: fetch posts from 6 platforms → extract ideas with Claude Haiku → deduplicate with pg_trgm similarity matching → score by mentions and recency.

The result is a living directory of 2,000+ ideas that updates itself. You can browse by category, filter by difficulty, sort by revenue potential, and see which ideas have the most demand signal.

The free tier is genuinely useful — you can browse everything, see all scores, and filter/sort. Pro adds generated business packages for when you're ready to go deeper on a specific idea.

I'm particularly proud of the revenue sort feature — it parses the estimated MRR ceiling from each idea and lets you find the high-upside opportunities that nobody else is talking about.

Would love your feedback on what other signals or features would help you pick your next project.

---

## 2. Show HN Post

**Title:** Show HN: Vibe Code Ideas – 2,000+ SaaS ideas extracted from HN, Reddit, GitHub, and more

**Body:**

I built a tool that monitors HN, Reddit (r/SaaS, r/SideProject, r/Entrepreneur, r/indiehackers, etc.), GitHub trending, Indie Hackers, and Product Hunt to extract specific product ideas from real conversations.

The pipeline runs daily:
1. Fetch posts from 6 platforms
2. Extract ideas with Claude Haiku (structured JSON: title, summary, category, difficulty, market signal, revenue potential, competition)
3. Deduplicate using pg_trgm trigram similarity (0.6 threshold for auto-merge, 0.45-0.60 goes to an admin review queue)
4. Score by mention count × recency decay

After processing 3,000+ posts, the directory has 2,000+ unique ideas. Each is browseable, searchable, and filterable by category, difficulty, and revenue potential.

Technical bits that might be interesting:
- Revenue potential is parsed from a free-form LLM-generated range string into a generated Postgres column using an immutable SQL function, so sorting by revenue is index-backed
- Popular badge uses `percentile_disc(0.99)` computed inside Postgres via an RPC — previous versions computed it client-side and silently truncated due to PostgREST max-rows limits
- Dedup candidates in the 0.45-0.60 similarity band get surfaced to an admin review queue rather than auto-merged (false merges are hard to undo)

Stack: Next.js (App Router), Supabase (Postgres + Auth + Edge Functions), Stripe, Vercel. Pipeline uses Claude Haiku for extraction.

Free to browse. Pro ($7/mo) generates business packages.

https://vibecodeideas.ai

---

## 3. Reddit Posts

### r/SideProject

**Title:** I built a directory that auto-discovers 2,000+ SaaS ideas from HN, Reddit, and GitHub

**Body:**

I got tired of manually scanning Hacker News and Reddit for project ideas, so I built an automated pipeline that does it for me.

It monitors HN, 12 subreddits, GitHub trending, Indie Hackers, and Product Hunt daily. Extracts specific product ideas from conversations, deduplicates them, and scores each one by mention volume, market demand, and difficulty.

The result: 2,000+ ideas you can browse, search, and filter — for free.

A few things I added recently:
- **Sort by revenue potential** — find the ideas with the highest estimated MRR ceilings
- **Revenue filter** — narrow to $2k+, $10k+, $25k+, or $50k+ per month
- **Popular badges** — the top 1% most-mentioned ideas are highlighted
- **Weekly newsletter** — top ideas delivered every Tuesday

You can filter by category (DevTools, AI/ML, Fintech, Automation, etc.), difficulty level, and trending status.

Pro tier ($7/mo) generates a full business package if you want to go deeper.

https://vibecodeideas.ai

---

### r/indiehackers

**Title:** How I automated finding validated SaaS ideas from 6 platforms

**Body:**

Instead of brainstorming in a vacuum, I built a pipeline that extracts SaaS ideas from where builders actually talk: Hacker News, Reddit, GitHub trending, Indie Hackers, and Product Hunt.

The system runs daily:
1. Fetches new posts from all sources
2. Claude Haiku extracts specific product ideas
3. Deduplicates against existing ideas (pg_trgm similarity matching)
4. Scores by mention count, recency, and market signal

After processing 3,000+ posts, the directory has 2,000+ active ideas. Each is tagged with difficulty, category, market demand, revenue potential, and competition level.

New feature I'm excited about: **sort by revenue potential**. The pipeline estimates MRR ceilings for each idea, and you can now sort the entire directory by highest revenue potential. Makes it easy to find the $10k+/mo opportunities.

Free tier: browse everything, see all scores and signals.
Pro ($7/mo): generates a business package — competitive landscape, tech stack, MVP scope, monetization model.

What other signals would help you decide what to build next?

https://vibecodeideas.ai

---

### r/SaaS

**Title:** I analyzed 3,000 posts from HN, Reddit, and GitHub to find the most-discussed SaaS opportunities in 2026

**Body:**

I built an automated pipeline that scans 6 platforms daily for SaaS product ideas. After processing 3,000+ posts, it extracted 2,000+ unique ideas.

Here's what the data shows about what people actually want built:

**Most-mentioned categories:**
- AI-powered developer tools (code review, testing, documentation, context management)
- Open-source alternatives to expensive SaaS (the "open source X" pattern never dies)
- Micro-SaaS for niche professional workflows (invoice tools, scheduling, inventory)
- Privacy-first analytics and monitoring (cookie consent fatigue is real)
- Automation platforms (n8n/Zapier alternatives with better pricing)

**Revenue distribution (parsed from LLM estimates across 2,000 ideas):**
- 45 ideas have an estimated ceiling of $50k+/mo
- 537 ideas estimated at $10k-24k/mo
- The sweet spot for indie hackers is $2k-10k/mo — that's where 60% of the ideas cluster

Every idea is scored by mention volume, market signal, competition, difficulty, and revenue potential. You can browse, search, filter by category/difficulty/revenue, and sort by trending or revenue potential.

Free to use. Pro ($7/mo) generates detailed business packages.

https://vibecodeideas.ai

---

### r/Entrepreneur

**Title:** Data from 3,000 posts reveals the SaaS ideas with the most demand in 2026

**Body:**

I built a system that monitors Hacker News, Reddit, GitHub, Indie Hackers, and Product Hunt to track what SaaS products people are asking for.

After processing 3,000+ posts, the clear winners are:

1. **Developer tools** — AI-powered code review, testing, and documentation. The "boring enterprise" angle is underrepresented.
2. **Subscription management** — tracker/cancellation tools. Consumers hate managing subscriptions; 6+ independent mentions in 2 weeks.
3. **Niche B2B SaaS** — the boring stuff nobody talks about on Twitter: invoice reminders for tradespeople, equipment tracking for small manufacturers, scheduling for service businesses. Low competition, real pain.
4. **Open-source alternatives** — every popular SaaS tool eventually gets an open-source competitor. The pattern is predictable and profitable.
5. **Budget/finance tools for couples** — surprisingly popular. Multiple independent mentions of shared budgeting apps.

Each idea comes with difficulty rating, market demand signal, estimated revenue potential, and competition level.

The directory is free. I charge $7/mo for a Pro tier that generates full business packages (competitive analysis, tech stack, MVP roadmap).

If you're looking for a validated idea to build — this is the shortcut.

https://vibecodeideas.ai

---

## 4. X/Twitter Thread — Weekly Top 5

### This Week's Edition

**Tweet 1 (Hook):**
Top 5 SaaS ideas trending this week — based on real conversations across HN, Reddit, and GitHub.

Not brainstorming. Not vibes. Actual signal from 3,000+ posts.

🧵

**Tweet 2:**
1/ Durable Goods Review Platform

A "Rotten Tomatoes for products that last." 10 independent mentions this week. Consumers want to know if that $800 washing machine will last 15 years.

No one owns this space yet.

**Tweet 3:**
2/ Subscription Manager & Cancellation Assistant

People hate managing subscriptions. 6 mentions across Reddit and HN. The "hard to cancel" problem is a real pain point.

$1k-4k MRR potential for a solo dev.

**Tweet 4:**
3/ AI SEO Blog Post Generator

"One topic → multiple structured, SEO-optimized posts." 5 mentions. Bloggers want to scale content without sacrificing quality.

The market is huge but fragmented — room for a focused tool.

**Tweet 5:**
4/ Shared Budgeting for Couples

Moneko keeps coming up — 5 independent mentions. Couples want simple envelope-based budgeting without the complexity of enterprise finance apps.

**Tweet 6:**
5/ Color Palette Generator from Images

6 mentions. Designers want to extract palettes from photos, screenshots, and artwork. Simple tool, clear use case, low competition.

Weekend build territory.

**Tweet 7 (CTA):**
We track 2,000+ ideas like these across 6 platforms — updated daily.

Browse free. Sort by revenue potential. Filter by difficulty.

→ vibecodeideas.ai

---

### Weekly Thread Template (Reusable)

**Tweet 1:**
Top 5 SaaS ideas trending this week — based on real conversations across HN, Reddit, and GitHub.

Here's what developers and founders are actually asking for:

🧵

**Tweet 2-6:** [One idea per tweet: title, why it's trending (mention count), the gap/opportunity, revenue estimate if available]

**Tweet 7:**
We track 2,000+ ideas like these — updated daily.

Free to browse. Sort by revenue. Filter by difficulty.

→ vibecodeideas.ai

Follow for the weekly roundup.

---

## 5. LinkedIn Post

**Post:**

I built a tool that monitors 6 platforms to find SaaS ideas people are actually talking about.

After processing 3,000+ posts across Hacker News, Reddit, GitHub, Indie Hackers, and Product Hunt, the pipeline extracted 2,000+ unique product ideas — each scored by demand, revenue potential, difficulty, and competition.

Three features that make it useful:

→ **Sort by revenue potential** — find the ideas with $10k-$100k/mo ceilings, not just the popular ones
→ **Popular badges** — the top 1% by mention volume are highlighted, so you can spot signal fast
→ **Weekly newsletter** — the best ideas delivered every Tuesday with a featured pick, trending list, and revenue spotlight

The patterns in the data are clear:
• AI developer tools lead in demand
• "Open-source alternative to X" is the most consistent SaaS pattern
• Micro-SaaS for niche workflows produces $5K-$20K MRR stories
• Shared budgeting, subscription management, and durable goods reviews keep surfacing independently

Free to browse. Pro ($7/mo) generates full business packages.

If you're looking for your next project, this might save you weeks of research.

vibecodeideas.ai

---

## 6. Directory Submissions

### Master Blurb (~100 words, adapt per platform)

Vibe Code Ideas is a free directory of 2,000+ SaaS and micro-SaaS product ideas, auto-discovered from Hacker News, Reddit, GitHub, Indie Hackers, and Product Hunt. Each idea is scored by mention volume, market demand, revenue potential, competition, and difficulty. Browse by category (14 categories from DevTools to Fintech), filter by difficulty level and revenue tier, and sort by trending or highest revenue potential. A weekly newsletter delivers the best ideas every Tuesday. Pro users ($7/mo) can generate full business packages with competitive analysis, tech stack, MVP roadmap, and launch checklist.

### Platform-Specific Notes

| Platform | URL | Category / Tags | Notes |
|---|---|---|---|
| **BetaList** | https://betalist.com/submit | SaaS, Developer Tools | Use the master blurb. BetaList likes "startup" framing. Mention it's free. |
| **Indie Hackers** | https://www.indiehackers.com/products/new | Product directory listing | Shorter description. Emphasize the "built by an indie hacker for indie hackers" angle. Link to the IH reddit post for social proof. |
| **There's An AI For That** | https://theresanaiforthat.com/submit/ | AI, SaaS Discovery | Emphasize the Claude Haiku extraction pipeline angle. "AI-powered SaaS idea discovery." |
| **Uneed** | https://uneed.best/submit | SaaS, Tools | Master blurb works. Uneed audiences skew technical. |
| **SaaS Hub** | https://www.saashub.com/submit | SaaS Directory | List as a "SaaS idea discovery" tool. Good for backlink SEO. |
| **AlternativeTo** | https://alternativeto.net/register-app/ | Alternative to: Exploding Topics, Glimpse, SparkToro | Position as "like Exploding Topics but specifically for SaaS ideas, and free." |

---

## Posting Schedule

| Day | Platform | Content | Status |
|-----|----------|---------|--------|
| Pre-launch | GSC | Submit sitemap + request indexing on 5 key pages | ⬜ |
| Pre-launch | GA4 | Create property, add measurement ID to Vercel env | ⬜ |
| Day 1 (launch) | Product Hunt | PH listing (tagline + description + maker comment) | ⬜ |
| Day 1 | Hacker News | Show HN post | ⬜ |
| Day 1 | X/Twitter | Launch thread (adapt the weekly template) | ⬜ |
| Day 1 | LinkedIn | Launch post | ⬜ |
| Day 2 | r/SideProject | Reddit post | ⬜ |
| Day 2 | r/indiehackers | Reddit post | ⬜ |
| Day 2 | r/Entrepreneur | Reddit post | ⬜ |
| Day 3 | r/SaaS | Reddit post (data-driven angle) | ⬜ |
| Day 3-5 | Directories | BetaList, IH product, TAAFT, Uneed, SaaS Hub, AlternativeTo | ⬜ |
| Day 7 | X/Twitter | Weekly Top 5 thread | ⬜ |
| Day 7 | Newsletter | First real digest (automated cron, Tue 14:00 UTC) | ⬜ |
| Weekly | X/Twitter | Top 5 thread (reuse template with fresh data) | ⬜ |
| Weekly Tue | Newsletter | Weekly digest (automated cron) | ⬜ |
