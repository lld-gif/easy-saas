# EasySaaS — Design Spec

**Date:** 2026-04-06
**Status:** Approved
**Approach:** Monolith — single Next.js app (Approach A)

---

## Overview

EasySaaS is a freemium web application that automatically discovers SaaS ideas from across the internet and presents them as a searchable, ranked directory. It targets both non-technical vibe-coders and developer entrepreneurs looking for validated ideas to build.

**Business model:** Freemium SaaS
- **Free tier:** Browse ideas with descriptions, popularity ranking, categories, search and filtering
- **Pro tier:** Detailed specs (.md export), branding suggestions, financial models

**Tech stack:** Next.js (App Router) + Supabase + Vercel + Tailwind CSS + shadcn/ui

---

## Data Model

### `ideas` table

| Column | Type | Purpose |
|--------|------|---------|
| id | uuid PK | Primary key |
| slug | text UNIQUE | URL-friendly identifier |
| title | text NOT NULL | e.g. "AI Invoice Parser for Freelancers" |
| summary | text NOT NULL | 2-3 sentence pitch (free tier) |
| category | text NOT NULL | e.g. "automation", "fintech", "devtools" |
| tags | text[] | Searchable tags array |
| mention_count | int DEFAULT 1 | Times spotted across sources — drives ranking |
| first_seen_at | timestamptz | When first discovered |
| last_seen_at | timestamptz | Most recent mention |
| status | text DEFAULT 'active' | "active", "needs_review", or "archived" |
| created_at | timestamptz DEFAULT now() | |
| updated_at | timestamptz DEFAULT now() | |

**Indexes:**
- `idx_ideas_slug` on `slug` (unique)
- `idx_ideas_category` on `category`
- `idx_ideas_mention_count` on `mention_count DESC`
- `idx_ideas_first_seen_at` on `first_seen_at DESC`
- `idx_ideas_search` GIN index on `to_tsvector('english', title || ' ' || summary || ' ' || array_to_string(tags, ' '))`

### `idea_sources` table (admin-only, not exposed to users)

| Column | Type | Purpose |
|--------|------|---------|
| id | uuid PK | |
| idea_id | uuid FK -> ideas | |
| source_platform | text NOT NULL | "twitter", "reddit", "fiverr", etc. |
| source_url | text | Link to original post/listing |
| raw_text | text | Original content that mentioned this idea |
| extracted_at | timestamptz DEFAULT now() | |

**Indexes:**
- `idx_idea_sources_idea_id` on `idea_id`
- `idx_idea_sources_platform` on `source_platform`

### `idea_details` table (paid tier content — Phase 3, not in MVP)

| Column | Type | Purpose |
|--------|------|---------|
| id | uuid PK | |
| idea_id | uuid FK -> ideas (UNIQUE) | One-to-one |
| full_spec_md | text | Detailed markdown spec |
| branding_suggestions | jsonb | Name ideas, color palettes, taglines |
| financial_model | jsonb | TAM estimate, pricing tiers, unit economics |
| generated_at | timestamptz DEFAULT now() | |

**Indexes:**
- `idx_idea_details_idea_id` UNIQUE on `idea_id`

### `users` table (Phase 3 — Supabase Auth manages this, extended with subscription data)

| Column | Type | Purpose |
|--------|------|---------|
| id | uuid PK | Matches Supabase auth.users.id |
| email | text NOT NULL | |
| subscription_status | text DEFAULT 'free' | "free" or "pro" |
| stripe_customer_id | text | Stripe customer reference |
| created_at | timestamptz DEFAULT now() | |
| updated_at | timestamptz DEFAULT now() | |

### `idea_embeddings` table (for deduplication)

| Column | Type | Purpose |
|--------|------|---------|
| id | uuid PK | |
| idea_id | uuid FK -> ideas (UNIQUE) | |
| embedding | vector(1536) | Embedding for semantic similarity search |

**Requires:** `pgvector` extension enabled in Supabase.

### Triggers

- `updated_at` auto-update trigger on `ideas` table:
  ```sql
  CREATE OR REPLACE FUNCTION update_updated_at()
  RETURNS TRIGGER AS $$
  BEGIN NEW.updated_at = now(); RETURN NEW; END;
  $$ LANGUAGE plpgsql;

  CREATE TRIGGER ideas_updated_at BEFORE UPDATE ON ideas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  ```

### Row Level Security

- `ideas`: Public read (`SELECT`) for all users (anon + authenticated). Write restricted to service role only (pipeline).
- `idea_sources`: No public access. Service role only (admin/pipeline).
- `idea_details`: `SELECT` for authenticated users with `subscription_status = 'pro'`. Write restricted to service role.
- `idea_embeddings`: No public access. Service role only.
- `users`: Users can read their own row. Write restricted to service role + auth triggers.

### Categories

Categories are a fixed enum maintained in the application. Initial set:

`fintech` · `devtools` · `automation` · `ai-ml` · `ecommerce` · `health` · `education` · `creator-tools` · `productivity` · `marketing` · `hr-recruiting` · `real-estate` · `logistics` · `other`

The LLM extraction prompt includes this list and must assign one. The FilterBar renders from this same list. New categories can be added to the list over time but are not freeform.

---

## Scraping & Idea Extraction Pipeline

### Architecture

```
[pg_cron trigger]
  -> [Supabase Edge Function per source]
    -> [Fetch content from source API/scrape]
      -> [Claude API: extract & classify ideas]
        -> [Deduplicate via pgvector cosine similarity]
          -> [INSERT new idea OR UPDATE mention_count]
```

### Data Sources

| Source | Method | Auth Required | Rate Limits |
|--------|--------|---------------|-------------|
| Twitter/X | X API v2 search — keywords: "someone should build", "SaaS idea", "I'd pay for" | Bearer token (Basic tier $100/mo or Free tier 1 app) | 300 requests/15min (Basic) |
| Reddit | Reddit JSON API (append `.json` to URLs) — r/SaaS, r/Entrepreneur, r/SideProject, r/slavelabour | No auth needed for public .json endpoints | ~60 requests/min without auth |
| Fiverr | Web scrape trending gig categories via Firecrawl or direct fetch | No API — scrape only | Respectful: 1 req/5s |
| Product Hunt | Product Hunt API v2 (GraphQL) — recent launches | OAuth token (free developer access) | 500 requests/day |
| Indie Hackers | Web scrape forum posts via Firecrawl | No API — scrape only | Respectful: 1 req/5s |
| Hacker News | HN Algolia API — search "Show HN", "Ask HN" | No auth needed | 10,000 requests/hour |
| GitHub Trending | GitHub REST API — trending repos + descriptions | Personal access token (free) | 5,000 requests/hour |
| Google Trends / Exploding Topics | Web scrape via Firecrawl or pytrends library | No auth for scraping | Respectful: 1 req/10s |

### LLM Extraction

**Model:** Claude Haiku (claude-haiku-4-5-20251001) — cheapest model sufficient for structured extraction. Estimated cost: ~$0.50-1.00/day across all 8 sources at 1-2 runs/day.

**Embedding model:** OpenAI `text-embedding-3-small` (1536 dimensions, $0.02/1M tokens). Used for deduplication similarity search.

Each Edge Function sends fetched content to Claude API with a structured extraction prompt. Output format:

```json
{
  "idea_title": "AI Invoice Parser for Freelancers",
  "summary": "Automatically extract line items from PDF invoices and sync to accounting tools. Targets freelancers who waste 2-3 hours/month on manual invoice processing.",
  "category": "fintech",
  "tags": ["automation", "freelancers", "invoicing", "ai"],
  "confidence": 0.85
}
```

Ideas with `confidence < 0.5` are discarded. Ideas with `confidence >= 0.5` are stored. The `status` column handles quality: ideas extracted with confidence 0.5-0.7 are inserted with `status = 'needs_review'`; confidence > 0.7 get `status = 'active'`. The status enum values are: `active`, `needs_review`, `archived`.

### Deduplication

1. Generate embedding for the extracted idea (title + summary)
2. Cosine similarity search against `idea_embeddings` table
3. If similarity > 0.85 with an existing idea: increment `mention_count`, update `last_seen_at`, insert into `idea_sources`
4. If similarity <= 0.85: create new idea row, new embedding row, new source row

### Error Handling

- If a source API is down or returns errors: log the failure, skip that source for this run, continue with remaining sources. No retry within the same run.
- If Claude API call fails: retry once after 2s backoff. If second attempt fails, skip extraction for that batch, log error.
- If embedding generation fails: store the idea without an embedding, flag `status = 'needs_review'`. Embedding can be backfilled on next run.
- Malformed LLM output (invalid JSON, missing required fields): discard the extraction, log the raw response for debugging.

### Cron Schedule

Each source runs 1-2x daily, staggered across hours to avoid API rate limits.

### MVP Shortcut — Seed Script

For the MVP, the database is seeded via `scripts/seed.ts`:

- **Invocation:** `npx tsx scripts/seed.ts` (add as `"seed": "tsx scripts/seed.ts"` in package.json)
- **What it does:** Runs a simplified version of the pipeline — fetches from all 8 sources once, calls Claude Haiku for extraction, generates embeddings, deduplicates, and inserts into the DB
- **API keys required:** `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` (for embeddings), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. Optional: `TWITTER_BEARER_TOKEN`, `GITHUB_TOKEN`, `PRODUCTHUNT_TOKEN`
- **Sources without API keys:** Falls back to web scraping via fetch + HTML parsing for Fiverr, Indie Hackers, Google Trends
- **Target:** ~50-100 ideas seeded
- **Idempotent:** Safe to re-run — deduplication prevents duplicates

Automated cron gets wired up in Phase 2.

---

## Frontend

### Pages

| Route | Purpose | Auth Required | Tier |
|-------|---------|---------------|------|
| `/` | Homepage — hero + search, top 12 trending ideas, category chips | No | Free |
| `/ideas` | Full browsable/searchable idea directory | No | Free |
| `/ideas/[slug]` | Idea detail — summary, mention count, popularity timeline | No | Free |
| `/ideas/[slug]/spec` | Full spec, branding, financials, .md export | Yes (Pro) | Pro |
| `/pricing` | Pricing page — Free vs Pro comparison | No | Free |

### Idea Directory (`/ideas`)

Two view modes, toggled by the user (persisted in localStorage):

- **Card view** (default): Grid of cards. Each card shows title, truncated summary, category badge, mention count heat indicator, first seen date. Optimized for browsing and discovery.
- **List view**: Compact table rows — title, category, mention count, first seen, last seen. Higher information density for power users comparing many ideas.

Both views share the same controls:

**Search:** Full-text search via Supabase `tsvector`. Debounced at 300ms. Results ranked by relevance combined with mention_count.

**Filters** (combinable):
- **Category:** Chip selector — fintech, devtools, automation, AI/ML, ecommerce, health, education, creator tools, etc.
- **Popularity:** Trending (10+ mentions), Rising (5-9), New (1-4)
- **Time range:** This week, this month, last 3 months, all time

**Sort:** Trending (mention_count DESC), Newest (first_seen_at DESC), Recently active (last_seen_at DESC)

**Pagination:** Cursor-based pagination, 24 items per page (divisible by 2, 3, 4 for grid layouts). "Load more" button at bottom — not infinite scroll (better for SEO and prevents accidental over-scrolling). URL param: `&cursor=<id>`.

**URL state:** All filters, search query, sort, and view mode reflected in URL params (`/ideas?q=invoice&category=fintech&sort=trending&view=card`). Shareable, bookmarkable, SEO-friendly.

**Empty states:**
- **No search results:** "No ideas match your search. Try a broader term or browse all ideas." with a "Clear filters" button.
- **Empty category:** "No ideas in this category yet. Check back soon — we discover new ideas daily."
- **Database empty (dev/fresh deploy):** "Ideas are being discovered. Run the seed script to populate." (dev-only message, hidden in production).

### Idea Detail (`/ideas/[slug]`)

- Full summary
- Mention count with popularity badge
- Category + tags
- Mention timeline: simple bar chart showing mention_count by month, built with a lightweight chart (recharts or a custom SVG). Data source: `idea_sources.extracted_at` grouped by month for this idea. If fewer than 3 data points, show a "Spotted X times since [date]" text instead of a chart.
- "Unlock full spec" CTA for Pro upgrade

**Note:** Source platform information (Twitter, Reddit, etc.) is NOT shown to users. The user sees curated final content only. Source data is admin-internal for pipeline tracking and data quality.

### Pro Spec Page (`/ideas/[slug]/spec`) — post-MVP

- Full markdown spec (rendered)
- Branding suggestions: name ideas, color palette swatches, tagline options
- Financial model: TAM estimate, suggested pricing tiers, unit economics table
- "Download as .md" button

### Paywall Behavior (post-MVP)

- Anonymous/free users hitting `/ideas/[slug]/spec` see a blurred preview with "Sign up to unlock" overlay
- Signed-in free users see blur with "Upgrade to Pro"
- Pro users see full content

### Homepage (`/`)

- **Hero section:** Headline ("Discover your next SaaS idea"), subheadline ("We scan Twitter, Reddit, HN, and 5 more sources daily to find ideas you can build."), prominent search bar, "X ideas discovered" counter for social proof.
- **Trending ideas:** Top 12 ideas by mention_count, displayed as cards (3x4 grid on desktop, 1-column on mobile). "View all ideas" link below.
- **Category chips:** Horizontal scrollable row of category badges. Each links to `/ideas?category=<slug>`.
- **How it works:** 3-step visual: "We scan the internet" → "AI extracts ideas" → "You build the next big thing"

### Design Direction

Clean, minimal, fast. Light background, bold typography, category-based color accents. ProductHunt meets a research tool. **Mobile-first** responsive design — card grid collapses to single column, list view hides less-important columns (last_seen), filters collapse into a sheet/drawer.

### SEO

- Dynamic `<title>` per page: "AI Invoice Parser for Freelancers — EasySaaS" on detail pages
- Dynamic `<meta name="description">` from idea summary
- Open Graph tags on idea detail pages (title, description, site_name)
- Category pages are indexable: `/ideas?category=fintech` gets a canonical URL

---

## Authentication & Payments (post-MVP)

**Auth:** Supabase Auth — email/password + Google OAuth. No auth required for free-tier browsing.

**Tiers:**
- **Free:** Browse, search, filter all ideas. View summaries and popularity data.
- **Pro:** Access full specs, branding suggestions, financial models, .md export.

**Payments:** Stripe Checkout via Supabase + Stripe webhook. Single "Pro" monthly subscription.

**Access check:** Middleware on `/ideas/[slug]/spec` routes checks `user.subscription_status`.

**MVP:** Ships with all content visible, no auth, no paywall. Auth/payments added in phase 2.

---

## Project Structure

```
easy-saas/
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── page.tsx                # Homepage
│   │   ├── ideas/
│   │   │   ├── page.tsx            # Idea directory (card/list toggle)
│   │   │   └── [slug]/
│   │   │       ├── page.tsx        # Idea detail (free)
│   │   │       └── spec/
│   │   │           └── page.tsx    # Full spec (paid, post-MVP)
│   │   ├── pricing/
│   │   │   └── page.tsx            # Pricing page (post-MVP)
│   │   └── layout.tsx              # Root layout, nav, footer
│   ├── components/
│   │   ├── IdeaCard.tsx            # Card view component
│   │   ├── IdeaListRow.tsx         # List view row component
│   │   ├── IdeaGrid.tsx            # Card/list container with toggle
│   │   ├── SearchBar.tsx           # Debounced search input
│   │   ├── FilterBar.tsx           # Category, popularity, time filters
│   │   ├── ViewToggle.tsx          # Card/list view switcher
│   │   └── MentionBadge.tsx        # Heat indicator for mention count
│   ├── lib/
│   │   ├── supabase.ts            # Supabase client (server + browser)
│   │   └── queries.ts             # DB query helpers
│   └── types/
│       └── index.ts               # TypeScript types for ideas, filters
├── supabase/
│   └── migrations/                 # SQL migration files
├── scripts/
│   └── seed.ts                    # One-time DB seeding script
├── public/
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

**Key decisions:**
- **Styling:** Tailwind CSS + shadcn/ui
- **Data fetching:** Server components for initial page loads (SEO), client-side for search/filter interactions
- **State management:** URL search params as source of truth — no state library needed
- **Deployment:** Vercel, connected to GitHub repo

---

## MVP Scope

The MVP ships with:

1. Supabase database with `ideas`, `idea_sources`, `idea_embeddings` tables created
2. Seed script that populates ~50-100 ideas from a one-time run of all sources
3. Homepage with trending ideas and category navigation
4. `/ideas` directory with card/list toggle, search, filters, sort
5. `/ideas/[slug]` detail page with summary and popularity data
6. Deployed to Vercel

**Not in MVP:**
- Automated cron scraping pipeline
- Authentication
- Pro tier / paywall / Stripe
- Spec generation (idea_details)
- Admin dashboard

---

## Phased Roadmap

| Phase | Scope |
|-------|-------|
| **1 — MVP** | DB schema, seed script, browse/search/filter UI, detail pages, deploy |
| **2 — Pipeline** | Supabase Edge Functions per source, pg_cron automation, LLM extraction, deduplication |
| **3 — Auth + Paywall** | Supabase Auth, Stripe integration, Pro tier gating, spec generation |
| **4 — Growth** | SEO optimization, social sharing, newsletter integration, admin dashboard |

---

## Environment Variables

```bash
# .env.local (required for MVP)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...          # Server-side only, never exposed to client

# Required for seed script and pipeline (Phase 2)
ANTHROPIC_API_KEY=sk-ant-...              # Claude Haiku for idea extraction
OPENAI_API_KEY=sk-...                     # text-embedding-3-small for deduplication

# Optional source API keys (seed script falls back to scraping without these)
TWITTER_BEARER_TOKEN=AAAA...              # X API v2
GITHUB_TOKEN=ghp_...                      # GitHub REST API
PRODUCTHUNT_TOKEN=...                     # Product Hunt API v2
```
