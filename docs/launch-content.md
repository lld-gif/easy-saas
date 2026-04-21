# VCI Launch Content Package

Updated 2026-04-21. Ready to post — review copy, then execute the posting schedule at the bottom.

**Current stats:** 2,319 active ideas · 3,995 source posts processed · 14 categories · 9 blog posts · hybrid BM25 + vector semantic search · weekly newsletter (Tuesdays 14:00 UTC) · daily auto-tweet (@vibecodeideas_) · every idea carries a one-paragraph LLM commentary on market timing, closest competitor, unit economics, biggest risk.

**Active sources (post-2026-04-21 retirement):** Hacker News · GitHub Trending · Product Hunt · Google Trends. Reddit + Indie Hackers temporarily retired (Reddit IP-blocks our scrape pods; IH migrated to an SPA whose `/feed` no longer returns XML — both will return in a post-launch v2 with Reddit OAuth + Firestore REST).

---

## Screenshots

All captured 2026-04-21 against prod at 2x retina, stored in `docs/screenshots/`:

| File | Dimensions | Use for |
|---|---|---|
| `01-home-desktop.png` | 1440×900 | **Product Hunt gallery hero** — "Crowdsourced shower ideas" headline, search, category chips, 3 trending cards |
| `02-ideas-desktop.png` | 1440×900 | Browse directory — category tab bar, Sort/Difficulty/Revenue filters, ranked row list with Popular badges |
| `03-ideas-fresh-desktop.png` | 1440×900 | **Fresh sort demo** — last 7 days, ordered by popularity. New for this launch. |
| `04-detail-desktop.png` | 1440×2800 fullPage | Detail page — breadcrumb, title, save star, badges, **IDEA** callout, **WHY THIS IS INTERESTING** commentary, Idea Signals bars (Popularity/Market/Revenue/Competition), Activity, Share, Related Ideas, blurred Pro gated package. Good for "detail-page tour" social posts. |
| `05-ideas-revenue-desktop.png` | 1440×900 | **Revenue-sort demo** — `/ideas?sort=revenue&revenue=25k` filtered to $25k+/mo ceilings |
| `06-home-mobile.png` | 375×812 | Mobile hero for X post hero image |
| `07-ideas-mobile.png` | 375×812 | Mobile directory view |
| `08-detail-mobile.png` | 375×fullPage | Mobile detail-page scroll |

Capture script (re-runnable any time the UI changes): `node scripts/capture-launch-screenshots.mjs`

---

## SEO Status

**2026-04-12 finding was: zero pages indexed.** Nine days later, the PH/HN/Reddit launch posts below will create the first external backlinks, which should trigger Google's crawler within 24-48 hours of the first post landing.

**Launch-day SEO actions:**

1. **Submit sitemap in GSC:** https://search.google.com/search-console → `vibecodeideas.ai` property → Sitemaps → add `https://vibecodeideas.ai/sitemap.xml`.
2. **Request indexing on key pages** via URL Inspection → "Request Indexing":
    - `https://vibecodeideas.ai/`
    - `https://vibecodeideas.ai/ideas`
    - `https://vibecodeideas.ai/ideas/trending`
    - `https://vibecodeideas.ai/about`
    - `https://vibecodeideas.ai/methodology`
    - `https://vibecodeideas.ai/blog/top-saas-ideas-2026`
    - `https://vibecodeideas.ai/blog/micro-saas-ideas-2026`
3. **Re-check one week post-launch:** `site:vibecodeideas.ai` — expect 50-300 indexed pages once PH/HN/Reddit generate backlinks.

GEO layer is already shipped (Tiers 1-3): `/llms.txt`, `/llms-full.txt`, per-idea `.md` variants, answer-shaped intro in JSON-LD, Article + SoftwareApplication + BreadcrumbList structured data, proxy-classified bot headers, IndexNow integration. See [[Projects/VCI GEO Plan — 2026-04-17]].

---

## 1. Product Hunt Launch

**Tagline (60 chars):** 2,319 SaaS ideas, ranked by where real people built demand

> Alt if above reads too long: `Crowdsourced shower ideas — 2,300+ SaaS ideas, ranked.` (54 chars, matches the homepage hero.)

**Description:**

Vibe Code Ideas is a crowdsourced directory of 2,319 SaaS ideas, pulled daily from Hacker News, GitHub Trending, Product Hunt, and Google Trends. Every idea is extracted from a real post with a real author — not generated, not brainstormed — then deduplicated, scored, and annotated by Claude.

**What makes it different:**

- **2,319 ideas** extracted from 3,995 real discussion posts — not an LLM invented them
- **Commentary column** — every idea has a 2-4 sentence Sonnet-generated paragraph covering market timing, closest competitor, unit economics hint, and biggest risk. Written to help you decide whether to build, not to pitch you
- **Hybrid semantic search** — BM25 + vector-cosine over Voyage AI embeddings, so searching "tools for dog owners" actually returns the pet ideas even when the word "dog" isn't in the title
- **Fresh sort** — last 7 days, ranked by popularity — nothing gets buried
- **Revenue sort + filter** — find the ideas with $10k-$100k/mo ceilings
- **Popular badges** — the top 1% by mention volume, computed via a Postgres RPC that refuses to silently truncate the way client-side p99 does
- **Save ⭐** — free watchlist so ideas don't disappear into your history
- **Weekly newsletter** — best ideas every Tuesday; **daily auto-tweet** — @vibecodeideas_ posts a trending idea once per day

**Pro tier ($7/mo):** generates a full Quick Start Package for any idea — competitive analysis, tech stack, MVP roadmap, brand kit, and launch checklist. Free tier is fully browsable; Pro just goes deeper when you've picked your idea.

**Built for:** indie hackers, solo founders, vibe-coders, and developers who'd rather build something people already want than brainstorm in a vacuum.

**Maker Comment (post as the first comment on the PH listing):**

Hey PH! I'm Luca. I built Vibe Code Ideas because I kept doing the same thing every time I wanted a new project — manually scanning HN and GitHub for ideas, then spending a few hours validating each before picking one.

So I automated the whole thing. The pipeline runs daily: fetch posts from HN (via Algolia), GitHub trending, Product Hunt, and Google Trends → Claude Haiku extracts the idea into structured JSON → pg_trgm trigram similarity dedupes it → Sonnet writes a one-paragraph commentary covering timing, competitors, unit economics, and risk → the idea lands in the directory.

The result is a living directory of 2,319+ ideas that updates itself. You can browse by category, sort by Fresh / Trending / Revenue / Easiest, and search with hybrid BM25 + vector embeddings so "marketing tools for solo founders" returns the right ideas even with vocabulary drift.

The free tier is genuinely useful — you can browse everything, see every signal, save favorites, and read every commentary paragraph. Pro adds generated Quick Start Packages for when you've picked an idea and want to go build it.

I'm most proud of two things: the commentary column (turns a scraper output into something that helps you *decide*), and the revenue sort (parses estimated MRR ceilings into an indexed Postgres column so you can find the $10k+/mo opportunities that nobody else is sorting by).

Reddit and Indie Hackers are temporarily offline because both upstreams broke simultaneously in the last two weeks — Reddit's IP-blocking the scrape pods, and IH migrated to a SPA whose RSS feed no longer works. Both coming back post-launch via proper OAuth + a headless Firestore read.

Would love your feedback on what signals or features would help you actually pick your next project.

---

## 2. Show HN Post

**Title:** Show HN: Vibe Code Ideas – 2,319 SaaS ideas extracted from HN and GitHub, with hybrid semantic search

**Body:**

I built a tool that monitors Hacker News, GitHub trending, Product Hunt, and Google Trends daily to extract specific product ideas from real conversations.

The pipeline:
1. Fetch posts from 4 platforms (HN via Algolia `/search` + `/search_by_date`, GitHub trending, PH new releases, Google Trends rising terms)
2. Extract ideas with Claude Haiku (structured JSON: title, summary, category, difficulty, market signal, revenue potential, competition)
3. Deduplicate using pg_trgm trigram similarity — auto-merge above 0.6, route 0.45-0.60 to an admin review queue where false merges can't silently happen
4. Generate a 2-4 sentence commentary with Claude Sonnet covering market timing, closest competitor, unit economics hint, biggest risk
5. Score by mention count × recency decay, compute a p99 popularity threshold inside Postgres (not client-side — PostgREST silently truncates to ~1800 rows, which breaks client p99)

After 3,995 source posts the directory has 2,319 unique active ideas, each browseable, searchable, and filterable by category, difficulty, and revenue tier.

Technical bits that might be interesting:

- **Hybrid semantic search.** Voyage AI `voyage-3` embeddings (1024-dim, 200M-token lifetime free tier, Anthropic's recommended vendor) stored in a Ghost (Tiger Data) pgvectorscale column. Queries blend BM25 full-text with vector cosine at 0.45/0.55 after per-source max normalization. Graceful fallback to BM25-only when Voyage is unreachable.
- **Revenue sort is index-backed.** The free-form `revenue_potential` string (e.g., `"$2k-$10k/mo"`) gets parsed into a generated Postgres column by an `IMMUTABLE` SQL function. A partial index on `(revenue_upper_usd DESC NULLS LAST)` matches the UI's ORDER BY exactly, so the sort is O(log n) across 2,319 rows.
- **Popular badge p99 is server-side.** Prior client-side version pulled all active scores and computed the percentile in Node. PostgREST's default 1000-row cap silently truncated the set; the p99 came from the truncated tail, so ~200 mid-ranked ideas wrongly qualified. Current version calls a SECURITY DEFINER RPC that runs `percentile_disc(0.99)` over the full table and returns one scalar.
- **Observability.** Last week the pipeline started noticing that Indie Hackers had been shipping 0-post "successes" for 12 consecutive days (cron returned 200 with an empty array). Added a `scrape_runs_health_7d` view + /admin widget + 6h email digest. First thing the widget caught: IH was silently broken. Post-launch: fix the scraper; meanwhile the source is retired cleanly from the widget via a `scrape_sources.enabled=false` flag.
- **Commentary generation is batched out of the scrape critical path.** Naive serial generation added ~60s to a 150s Edge Function wall. Current design runs extraction + dedup serially, then fills commentary via parallel chunks of 5 with an AbortController 15s timeout per call.

Stack: Next.js 16 (App Router), Supabase (Postgres + Auth + Edge Functions + pg_cron), Tiger Data Ghost (pgvectorscale), Voyage AI (embeddings), Anthropic (Haiku extraction + Sonnet commentary), Resend (newsletter), Stripe, Vercel.

Free to browse. Pro ($7/mo) generates Quick Start Packages.

https://vibecodeideas.ai

---

## 3. Reddit Posts

### r/SideProject

**Title:** I built a directory that auto-discovers 2,319 SaaS ideas from HN and GitHub — with hybrid semantic search

**Body:**

I got tired of manually scanning HN and GitHub for project ideas, so I built an automated pipeline that does it for me.

It monitors HN (via Algolia search + search-by-date), GitHub trending, Product Hunt, and Google Trends daily. Extracts specific product ideas from conversations, deduplicates them against existing ideas, and annotates each with a one-paragraph commentary on market timing, closest competitor, unit economics, and biggest risk.

The result: 2,319 active ideas you can browse, search, and filter — for free.

A few things I added recently:

- **Hybrid semantic search** — searching "marketing tools for solo founders" returns the right ideas even when the word "marketing" isn't in the title. Blends BM25 + Voyage AI embeddings.
- **Fresh sort (7 days)** — stops trending ideas from dominating forever; gives new discoveries space to breathe
- **Revenue sort + filter** — narrow to $2k+, $10k+, $25k+, or $50k+ per month
- **Popular badges** — the top 1% most-mentioned ideas are highlighted
- **Commentary column** — every idea has a Sonnet-generated paragraph covering the interesting angle
- **Save ⭐** — free watchlist

Filter by category (DevTools, AI/ML, Fintech, Automation, etc. — 14 total), difficulty level, and trending status.

Pro tier ($7/mo) generates a Quick Start Package if you want to go deeper.

https://vibecodeideas.ai

---

### r/indiehackers

**Title:** How I automated finding validated SaaS ideas from 4 platforms (with semantic search)

**Body:**

Instead of brainstorming in a vacuum, I built a pipeline that extracts SaaS ideas from where builders actually talk: Hacker News, GitHub trending, Product Hunt, and Google Trends.

The system runs daily:

1. Fetches new posts from all four sources
2. Claude Haiku extracts specific product ideas
3. Deduplicates against existing ideas via pg_trgm similarity (ambiguous pairs 0.45-0.60 go to an admin review queue instead of being auto-merged — false merges are hard to undo)
4. Claude Sonnet writes a 2-4 sentence commentary for each: market timing, closest competitor, unit economics hint, biggest risk
5. Scores by mention count + recency decay

After 3,995 posts, the directory has 2,319 active ideas. Each is tagged with difficulty, category, market signal, revenue potential, and competition level.

**Three features I'm proud of:**

- **Hybrid semantic search.** Uses Voyage AI `voyage-3` embeddings (1024-dim). "Tools for dog owners" surfaces pet ideas even when the vocabulary doesn't match. Falls back to BM25-only if Voyage is unreachable.
- **Revenue sort.** Parses the LLM's free-form revenue range into an indexed Postgres column. Sorting the whole directory by highest revenue potential is O(log n).
- **Commentary column.** Turns a scraper output into something you can actually use to decide. Every idea has a paragraph that tells you *why* it's interesting or *why* it's risky.

Free tier: browse everything, see all signals, read all commentary, save favorites.
Pro ($7/mo): generates a full Quick Start Package — competitive landscape, tech stack, MVP scope, monetization model.

What other signals would help you decide what to build next?

https://vibecodeideas.ai

---

### r/SaaS

**Title:** I analyzed 3,995 posts from HN + GitHub to find the most-discussed SaaS opportunities — with Sonnet commentary on each

**Body:**

I built an automated pipeline that scans HN, GitHub trending, Product Hunt, and Google Trends daily for SaaS product ideas. After processing 3,995 source posts, it extracted 2,319 unique active ideas — each one annotated by Claude Sonnet with a paragraph on market timing, closest competitor, unit economics, and biggest risk.

Here's what the data shows about what people actually want built:

**Most-mentioned categories:**
- AI-powered developer tools (code review, testing, documentation, context management)
- Open-source alternatives to expensive SaaS (the "open source X" pattern never dies)
- Micro-SaaS for niche professional workflows (invoice tools, scheduling, inventory)
- Privacy-first analytics and monitoring
- Automation platforms (n8n/Zapier alternatives with better pricing)

**Revenue distribution (parsed from Haiku estimates across 2,319 ideas):**

- A small tail has estimated ceilings of $50k+/mo
- Several hundred cluster at $10k-$25k/mo
- The sweet spot for indie hackers is $2k-$10k/mo — that's where ~60% of the ideas land

Every idea is scored by mention volume, market signal, competition, difficulty, and revenue potential. You can browse, search (with hybrid BM25 + Voyage AI semantic search), filter by category/difficulty/revenue, and sort by Fresh / Trending / Revenue / Easiest.

Free to use. Pro ($7/mo) generates detailed Quick Start Packages with tech stack recs + MVP scope.

https://vibecodeideas.ai

---

### r/Entrepreneur

**Title:** Data from 3,995 posts reveals the SaaS ideas with the most demand in 2026

**Body:**

I built a system that monitors Hacker News, GitHub, Product Hunt, and Google Trends to track what SaaS products people are asking for.

After processing 3,995 posts, the clear winners:

1. **Developer tools** — AI-powered code review, testing, documentation. The "boring enterprise" angle is underrepresented.
2. **Subscription management** — tracker and cancellation tools. Consumers hate managing subscriptions.
3. **Niche B2B SaaS** — the boring stuff nobody talks about on Twitter: invoice reminders for tradespeople, equipment tracking for small manufacturers, scheduling for service businesses. Low competition, real pain.
4. **Open-source alternatives** — every popular SaaS eventually gets an open-source competitor. The pattern is predictable and profitable.
5. **Budget and finance tools for couples** — surprisingly popular. Multiple independent mentions of shared budgeting.

Each idea comes with a difficulty rating, market demand signal, estimated revenue potential, competition level, and a one-paragraph commentary written by Claude Sonnet on why it's interesting or risky.

The directory is free. Pro ($7/mo) generates Quick Start Packages (competitive analysis, tech stack, MVP roadmap).

If you're looking for a validated idea to build — this is the shortcut.

https://vibecodeideas.ai

---

## 4. X/Twitter Thread — Launch

**Tweet 1 (Hook):**
I scanned 3,995 posts across Hacker News, GitHub, Product Hunt, and Google Trends.

The pipeline extracted 2,319 SaaS ideas. Every one has a Sonnet-written commentary on timing, competitors, and risk.

Here are 5 trending this week 🧵

**Tweet 2:**
1/ Fresh sort just shipped.

You can now filter the whole directory to "last 7 days" and see the freshest ideas ranked by popularity — so new discoveries don't get buried under trending incumbents.

→ vibecodeideas.ai/ideas?sort=fresh

**Tweet 3:**
2/ Hybrid BM25 + vector semantic search.

"Tools for dog owners" returns the right pet ideas even when the word "dog" isn't in the title. Voyage AI `voyage-3` embeddings, graceful fallback to BM25-only.

**Tweet 4:**
3/ Revenue sort is index-backed.

Parses the LLM's free-form `$2k-10k/mo` string into a generated Postgres column. Sorting the whole directory by revenue ceiling is O(log n).

Filter to $25k+/mo: vibecodeideas.ai/ideas?sort=revenue&revenue=25k

**Tweet 5:**
4/ Every idea has a commentary paragraph.

Not a summary — a paragraph on *why this is interesting*: market timing, closest competitor, unit economics hint, biggest risk. Claude Sonnet writes it once per idea at insert time.

Turns a scraper into something that actually helps you decide.

**Tweet 6:**
5/ Saves ⭐ are free.

Save ideas to come back to. Watchlist syncs across devices. No "sign up to preview" wall — everything's free to browse; Pro only unlocks Quick Start Packages when you've picked.

**Tweet 7 (CTA):**
2,319 ideas. Fresh sort. Semantic search. Revenue filters. Commentary on every one.

Free to browse.

→ vibecodeideas.ai

---

### Weekly Thread Template (Reusable)

**Tweet 1:**
Top 5 SaaS ideas trending this week — based on real conversations across HN, GitHub, Product Hunt, and Google Trends.

Here's what developers and founders are actually asking for:

🧵

**Tweet 2-6:** [One idea per tweet: title, why it's trending (mention count), the gap/opportunity, revenue estimate if available, link to the idea detail page]

**Tweet 7:**
2,319 ideas like these — updated daily.

Free to browse. Fresh sort, hybrid semantic search, revenue filter.

→ vibecodeideas.ai

Follow for the weekly roundup.

---

## 5. LinkedIn Post

I built a tool that monitors 4 platforms to find SaaS ideas people are actually talking about.

After processing 3,995 posts across Hacker News, GitHub, Product Hunt, and Google Trends, the pipeline extracted 2,319 unique ideas — each scored by demand, revenue potential, difficulty, and competition, and annotated with a Claude-Sonnet-written paragraph on market timing, closest competitor, unit economics, and biggest risk.

Five features that make it useful:

→ **Hybrid semantic search** — "tools for dog owners" surfaces pet ideas even when the vocabulary doesn't match. BM25 + Voyage AI vector embeddings, 0.45/0.55 blended after per-source max normalization
→ **Fresh sort** — see last 7 days ranked by popularity, so new ideas aren't buried
→ **Revenue sort and filter** — find the $10k-$100k/mo ceilings, not just the popular ones
→ **Commentary column** — every idea has a 2-4 sentence paragraph explaining why it's interesting or risky
→ **Save watchlist** — free star-save across devices

The patterns in the data are clear:

• AI developer tools lead in demand
• "Open-source alternative to X" is the most consistent SaaS pattern
• Micro-SaaS for niche workflows produces $5K-$20K MRR stories
• Shared budgeting, subscription management, and durable-goods reviews keep surfacing independently

Free to browse. Pro ($7/mo) generates Quick Start Packages for when you've picked your idea.

If you're looking for your next project, this might save you weeks of research.

vibecodeideas.ai

---

## 6. Directory Submissions

### Master Blurb (~100 words, adapt per platform)

Vibe Code Ideas is a free directory of 2,319 SaaS and micro-SaaS product ideas, auto-discovered daily from Hacker News, GitHub trending, Product Hunt, and Google Trends. Every idea is extracted from a real post, deduplicated via pg_trgm similarity, scored by mention volume + market demand + revenue potential + competition + difficulty, and annotated with a one-paragraph Claude Sonnet commentary. Search combines BM25 full-text with Voyage AI vector embeddings so vocabulary drift doesn't matter. Browse by category (14 total), filter by difficulty and revenue tier, sort by Fresh / Trending / Revenue / Easiest. Pro users ($7/mo) generate Quick Start Packages with competitive analysis, tech stack, MVP roadmap, and launch checklist.

### Platform-Specific Notes

| Platform | URL | Category / Tags | Notes |
|---|---|---|---|
| **BetaList** | https://betalist.com/submit | SaaS, Developer Tools | Use the master blurb. BetaList likes "startup" framing. Mention the free tier. |
| **Indie Hackers** | https://www.indiehackers.com/products/new | Product directory listing | Shorter blurb. Emphasize the "built by an indie hacker for indie hackers" angle. Don't claim you scrape IH — we just retired that source. Link to the IH reddit post for social proof. |
| **There's An AI For That** | https://theresanaiforthat.com/submit/ | AI, SaaS Discovery | Emphasize the Haiku extraction + Sonnet commentary pipeline. "AI-powered SaaS idea discovery." |
| **Uneed** | https://uneed.best/submit | SaaS, Tools | Master blurb works. Uneed audiences skew technical. |
| **SaaS Hub** | https://www.saashub.com/submit | SaaS Directory | List as a "SaaS idea discovery" tool. Good for backlink SEO. |
| **AlternativeTo** | https://alternativeto.net/register-app/ | Alternative to: Exploding Topics, Glimpse, SparkToro | Position as "like Exploding Topics but specifically for SaaS ideas, and free." |

---

## Posting Schedule

| Day | Platform | Content | Status |
|-----|----------|---------|--------|
| Pre-launch | GSC | Submit sitemap + request indexing on 7 key pages | ⬜ |
| Pre-launch | GA4 | Property wired to Vercel env (`NEXT_PUBLIC_GA_MEASUREMENT_ID`) | ⬜ |
| Pre-launch | Vercel Analytics dashboard | Verify custom events emitting: `save_click_anon`, `save_click_authed`, `auth_provider_start`, `auth_complete`, `search_zero_results` | ⬜ |
| Day 1 (launch, Wed 2026-04-23) | Product Hunt | PH listing (tagline + description + maker comment) | ⬜ |
| Day 1 | Hacker News | Show HN post | ⬜ |
| Day 1 | X/Twitter | Launch thread | ⬜ |
| Day 1 | LinkedIn | Launch post | ⬜ |
| Day 2 | r/SideProject | Reddit post | ⬜ |
| Day 2 | r/indiehackers | Reddit post | ⬜ |
| Day 2 | r/Entrepreneur | Reddit post | ⬜ |
| Day 3 | r/SaaS | Reddit post (data-driven angle) | ⬜ |
| Day 3-5 | Directories | BetaList, IH product, TAAFT, Uneed, SaaS Hub, AlternativeTo | ⬜ |
| Day 7 | X/Twitter | Weekly Top 5 thread (adapt weekly template with fresh Fresh-sort data) | ⬜ |
| Day 7 | Newsletter | First post-launch digest (automated cron, Tue 14:00 UTC) | ⬜ |
| Weekly | X/Twitter | Top 5 thread | ⬜ |
| Weekly Tue | Newsletter | Weekly digest (automated cron) | ⬜ |

---

## What's NOT in the launch (known, intentional)

Anticipate these coming up in HN/Reddit comments and have a short answer ready.

- **Reddit + Indie Hackers scrapers are offline.** Upstream changes in the last two weeks (Reddit IP-blocked the scrape pods; IH migrated to an SPA). Both will return post-launch via proper Reddit OAuth + Firestore REST. In the meantime the directory runs on HN, GitHub, Product Hunt, and Google Trends — 2,319 ideas already extracted while Reddit + IH were contributing, none were deleted.
- **Build-this export** (one-click open idea in Bolt/v0/Cursor/Claude Code with pre-loaded prompts) is Week 2 post-launch. The Pro Quick Start Package already delivers the raw material; the launchpad is the next obvious integration.
- **Category deep-dive landing pages** (`/category/fintech` today is a filtered list; post-launch it becomes an SEO-targeted content page with trending sub-topics) — Week 2.
- **Data-backed market signal** (replace LLM-estimated `market_signal` with real Trends search volume, GH stars, HN comment count) — Month 1.
