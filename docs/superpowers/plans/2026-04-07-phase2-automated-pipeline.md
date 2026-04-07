# Phase 2: Automated Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automate SaaS idea discovery by deploying Supabase Edge Functions that scrape sources and extract ideas on a daily cron schedule — no manual seed script needed.

**Architecture:** Each data source gets its own Supabase Edge Function (Deno runtime). pg_cron + pg_net triggers each function on a staggered schedule (1-2x daily). The Edge Functions reuse the same extraction (Claude Haiku) and dedup (pg_trgm) logic from the seed script, ported to Deno. Secrets (API keys) are stored in Supabase Vault. **Note:** The spec references pgvector for dedup, but the MVP uses pg_trgm trigram similarity instead — simpler, no external embedding API needed. Only external dependency is Anthropic Claude Haiku.

**Tech Stack:** Supabase Edge Functions (Deno), pg_cron, pg_net, Supabase Vault, Anthropic Claude Haiku

**Spec:** `docs/superpowers/specs/2026-04-06-easy-saas-design.md` (Phase 2 section)
**Supabase Project ID:** `uailhfoyxaorntqwtebq`

---

## Architecture Overview

```
pg_cron (staggered schedule)
  → pg_net HTTP POST to Edge Function URL
    → Edge Function fetches source (Reddit/HN/GitHub/etc.)
      → Sends posts to Claude Haiku for extraction
        → Calls find_similar_ideas() RPC for dedup
          → INSERTs new idea or UPDATEs mention_count
          → Returns { new: N, dupes: N, errors: N }
```

Each Edge Function is self-contained: fetches one source, extracts ideas, deduplicates, and inserts. No shared state between functions. Failures in one source don't affect others.

---

## File Structure

All Edge Functions are deployed via Supabase MCP `deploy_edge_function` tool — no local `supabase/functions/` directory needed. The source code lives here for version control:

```
easy-saas/
├── supabase/
│   ├── functions/
│   │   ├── scrape-reddit/
│   │   │   └── index.ts          # Reddit source fetcher + pipeline
│   │   ├── scrape-hackernews/
│   │   │   └── index.ts          # HN source fetcher + pipeline
│   │   └── scrape-github/
│   │       └── index.ts          # GitHub source fetcher + pipeline
│   └── migrations/
│       └── 004_cron_schedule.sql  # pg_cron + pg_net + vault setup
```

**MVP scope for Phase 2:** Reddit, HN, GitHub (the 3 sources already working in the seed script). Additional sources (Twitter, Fiverr, Product Hunt, Indie Hackers, Google Trends) are added later as individual Edge Functions — the architecture supports it trivially.

---

## Task 1: Enable Extensions & Store Secrets in Vault

**What:** Enable pg_cron, pg_net, and store API keys in Supabase Vault so Edge Functions can access them securely.

**How:** Use Supabase MCP tools to run SQL.

- [ ] **Step 1: Enable pg_cron and pg_net extensions**

Run via Supabase MCP `execute_sql`:
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
```

- [ ] **Step 2: Verify extensions are enabled**

Run via Supabase MCP `execute_sql`:
```sql
SELECT extname, extversion FROM pg_extension WHERE extname IN ('pg_cron', 'pg_net', 'pg_trgm');
```
Expected: All three extensions listed.

- [ ] **Step 3: Store secrets in Vault**

Run via Supabase MCP `execute_sql`:
```sql
SELECT vault.create_secret('<SUPABASE_URL>', 'project_url');
SELECT vault.create_secret('<SUPABASE_ANON_KEY>', 'anon_key');
SELECT vault.create_secret('<ANTHROPIC_API_KEY>', 'anthropic_api_key');
```

Replace `<SUPABASE_URL>`, `<SUPABASE_ANON_KEY>`, and `<ANTHROPIC_API_KEY>` with actual values from the user's `.env.local`.

- [ ] **Step 4: Verify secrets are stored**

Run via Supabase MCP `execute_sql`:
```sql
SELECT name FROM vault.decrypted_secrets WHERE name IN ('project_url', 'anon_key', 'anthropic_api_key');
```
Expected: 3 rows returned.

- [ ] **Step 5: Set ANTHROPIC_API_KEY as Edge Function secret**

Edge Functions need the Anthropic API key. `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are automatically available as built-in env vars.

Set via Supabase dashboard: Project Settings → Edge Functions → Secrets → Add `ANTHROPIC_API_KEY`.

Or via CLI if available:
```bash
supabase secrets set ANTHROPIC_API_KEY=<your-key> --project-ref uailhfoyxaorntqwtebq
```

---

## Task 2: Deploy Reddit Edge Function

**What:** Port the Reddit fetcher from seed.ts to a Supabase Edge Function.

- [ ] **Step 1: Create and deploy the Reddit Edge Function**

Deploy via Supabase MCP `deploy_edge_function` with name `scrape-reddit`, `verify_jwt: false` (called by pg_net from within Supabase, not from external clients), entrypoint `index.ts`.

**File: `index.ts`**
```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const CATEGORIES = [
  "fintech", "devtools", "automation", "ai-ml", "ecommerce", "health",
  "education", "creator-tools", "productivity", "marketing",
  "hr-recruiting", "real-estate", "logistics", "other",
]

interface ExtractedIdea {
  idea_title: string
  summary: string
  category: string
  tags: string[]
  confidence: number
}

// --- Reddit Fetcher ---

async function fetchReddit(): Promise<string[]> {
  const subreddits = ["SaaS", "Entrepreneur", "SideProject", "slavelabour"]
  const posts: string[] = []

  for (const sub of subreddits) {
    try {
      const res = await fetch(`https://www.reddit.com/r/${sub}/hot.json?limit=25`, {
        headers: { "User-Agent": "EasySaaS-Pipeline/1.0" },
      })
      if (!res.ok) continue
      const data = await res.json()
      for (const child of data.data.children) {
        const post = child.data
        if (post.selftext && post.selftext.length > 50) {
          posts.push(`Title: ${post.title}\nBody: ${post.selftext.slice(0, 500)}`)
        }
      }
    } catch (e) {
      console.warn(`Failed to fetch r/${sub}:`, e)
    }
  }

  return posts
}

// --- LLM Extraction ---

async function extractIdeas(posts: string[], apiKey: string): Promise<ExtractedIdea[]> {
  const chunkSize = 10
  const allIdeas: ExtractedIdea[] = []

  for (let i = 0; i < posts.length; i += chunkSize) {
    const chunk = posts.slice(i, i + chunkSize)
    const prompt = `You are an AI that identifies SaaS product ideas from internet posts. Analyze these posts and extract any viable SaaS ideas mentioned or implied.

For each idea found, return a JSON array of objects with:
- idea_title: concise product name (e.g., "AI Invoice Parser for Freelancers")
- summary: 2-3 sentence pitch describing the problem, solution, and target user
- category: one of: ${CATEGORIES.join(", ")}
- tags: 3-5 lowercase tags
- confidence: 0.0-1.0 (how clearly this is a viable SaaS idea)

If a post doesn't contain a SaaS idea, skip it. Return ONLY a valid JSON array, no other text.

Posts:
${chunk.map((p, idx) => `--- Post ${idx + 1} ---\n${p}`).join("\n\n")}`

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 4096,
          messages: [{ role: "user", content: prompt }],
        }),
      })

      if (!res.ok) {
        console.warn(`Claude API error: ${res.status}`)
        continue
      }

      const data = await res.json()
      const text = data.content?.[0]?.text ?? ""
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        const ideas: ExtractedIdea[] = JSON.parse(jsonMatch[0])
        for (const idea of ideas) {
          if (idea.confidence >= 0.5 && idea.idea_title && idea.summary) {
            allIdeas.push(idea)
          }
        }
      }
    } catch (e) {
      console.warn(`Extraction batch failed:`, e)
    }
  }

  return allIdeas
}

// --- Dedup & Insert ---

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80)
}

async function deduplicateAndInsert(
  supabase: ReturnType<typeof createClient>,
  idea: ExtractedIdea,
  sourcePlatform: string,
  sourceText?: string
): Promise<"new" | "dupe" | "error"> {
  try {
    const { data: matches } = await supabase.rpc("find_similar_ideas", {
      search_title: idea.idea_title,
      search_summary: idea.summary,
      match_threshold: 0.6,
      match_count: 1,
    })

    if (matches && matches.length > 0 && matches[0].title_similarity > 0.6) {
      const existing = matches[0]
      await supabase
        .from("ideas")
        .update({
          mention_count: existing.mention_count + 1,
          last_seen_at: new Date().toISOString(),
        })
        .eq("id", existing.idea_id)

      await supabase.from("idea_sources").insert({
        idea_id: existing.idea_id,
        source_platform: sourcePlatform,
        raw_text: sourceText?.slice(0, 2000),
      })

      return "dupe"
    }

    const slug = `${slugify(idea.idea_title)}-${Date.now().toString(36)}`
    const status = idea.confidence >= 0.7 ? "active" : "needs_review"

    const { data: newIdea, error } = await supabase
      .from("ideas")
      .insert({
        slug,
        title: idea.idea_title,
        summary: idea.summary,
        category: CATEGORIES.includes(idea.category) ? idea.category : "other",
        tags: idea.tags,
        mention_count: 1,
        first_seen_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
        status,
      })
      .select()
      .single()

    if (error) {
      console.warn(`Insert failed: ${error.message}`)
      return "error"
    }

    await supabase.from("idea_sources").insert({
      idea_id: newIdea.id,
      source_platform: sourcePlatform,
      raw_text: sourceText?.slice(0, 2000),
    })

    return "new"
  } catch (e) {
    console.warn(`Dedup error:`, e)
    return "error"
  }
}

// --- Handler ---

Deno.serve(async (_req: Request) => {
  const startTime = Date.now()

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  )

  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY")
  if (!anthropicKey) {
    return new Response(JSON.stringify({ error: "Missing ANTHROPIC_API_KEY" }), { status: 500 })
  }

  console.log("📡 Fetching from Reddit...")
  const posts = await fetchReddit()
  console.log(`Found ${posts.length} posts`)

  if (posts.length === 0) {
    return new Response(JSON.stringify({ source: "reddit", posts: 0, new: 0, dupes: 0, errors: 0 }), {
      headers: { "Content-Type": "application/json" },
    })
  }

  console.log("🤖 Extracting ideas...")
  const ideas = await extractIdeas(posts, anthropicKey)
  console.log(`Extracted ${ideas.length} ideas`)

  let newCount = 0, dupeCount = 0, errorCount = 0

  for (const idea of ideas) {
    const result = await deduplicateAndInsert(supabase, idea, "reddit")
    if (result === "new") newCount++
    else if (result === "dupe") dupeCount++
    else errorCount++
  }

  const duration = Date.now() - startTime
  const summary = { source: "reddit", posts: posts.length, extracted: ideas.length, new: newCount, dupes: dupeCount, errors: errorCount, duration_ms: duration }
  console.log("✅ Done:", JSON.stringify(summary))

  return new Response(JSON.stringify(summary), {
    headers: { "Content-Type": "application/json" },
  })
})
```

- [ ] **Step 2: Test the Edge Function manually**

Use Supabase MCP `get_project_url` to get the function URL, then test:
```bash
curl -X POST https://uailhfoyxaorntqwtebq.supabase.co/functions/v1/scrape-reddit \
  -H "Authorization: Bearer <ANON_KEY>"
```

Expected: JSON response with `{ source: "reddit", posts: N, extracted: N, new: N, dupes: N }`

- [ ] **Step 3: Verify new ideas were inserted**

Run via Supabase MCP `execute_sql`:
```sql
SELECT count(*) FROM ideas WHERE status = 'active';
SELECT title, category, created_at FROM ideas ORDER BY created_at DESC LIMIT 5;
```

- [ ] **Step 4: Save the Edge Function code locally and commit**

Save the function code to `supabase/functions/scrape-reddit/index.ts` for version control.

```bash
git add supabase/functions/
git commit -m "feat: deploy Reddit scraper Edge Function"
```

---

## Task 3: Deploy HN Edge Function

**What:** Same pattern as Reddit but for Hacker News Algolia API.

- [ ] **Step 1: Deploy the HN Edge Function**

Deploy via Supabase MCP `deploy_edge_function` with name `scrape-hackernews`, `verify_jwt: false`.

The function is identical to the Reddit function except for the fetcher. Replace `fetchReddit()` with:

```typescript
async function fetchHackerNews(): Promise<string[]> {
  const posts: string[] = []
  const queries = ["Show HN", "SaaS idea", "I built", "Ask HN what should"]

  for (const q of queries) {
    try {
      const res = await fetch(
        `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(q)}&tags=story&hitsPerPage=20`
      )
      if (!res.ok) continue
      const data = await res.json()
      for (const hit of data.hits) {
        if (hit.title) {
          posts.push(`Title: ${hit.title}${hit.story_text ? `\nBody: ${hit.story_text.slice(0, 500)}` : ""}`)
        }
      }
    } catch (e) {
      console.warn(`Failed to fetch HN:`, e)
    }
  }

  return posts
}
```

And change `sourcePlatform` to `"hackernews"` and log messages accordingly.

- [ ] **Step 2: Test and verify**

Same manual curl test pattern as Task 2.

- [ ] **Step 3: Save locally and commit**

```bash
git add supabase/functions/scrape-hackernews/
git commit -m "feat: deploy Hacker News scraper Edge Function"
```

---

## Task 4: Deploy GitHub Edge Function

**What:** Same pattern for GitHub trending repos.

- [ ] **Step 1: Deploy the GitHub Edge Function**

Deploy via Supabase MCP with name `scrape-github`, `verify_jwt: false`.

Replace fetcher with:

```typescript
async function fetchGitHub(): Promise<string[]> {
  const posts: string[] = []

  try {
    const since = new Date()
    since.setDate(since.getDate() - 7)
    const url = `https://api.github.com/search/repositories?q=created:>${since.toISOString().split("T")[0]}&sort=stars&order=desc&per_page=30`

    const res = await fetch(url, {
      headers: { Accept: "application/vnd.github.v3+json" },
    })
    if (!res.ok) return posts
    const data = await res.json()

    for (const repo of data.items || []) {
      if (repo.description) {
        posts.push(`Repo: ${repo.full_name}\nDescription: ${repo.description}\nStars: ${repo.stargazers_count}`)
      }
    }
  } catch (e) {
    console.warn("Failed to fetch GitHub:", e)
  }

  return posts
}
```

And change `sourcePlatform` to `"github"`.

- [ ] **Step 2: Test and verify**

Same pattern.

- [ ] **Step 3: Save locally and commit**

```bash
git add supabase/functions/scrape-github/
git commit -m "feat: deploy GitHub trending scraper Edge Function"
```

---

## Task 5: Set Up pg_cron Schedules

**What:** Wire up pg_cron to call each Edge Function on a staggered daily schedule.

- [ ] **Step 1: Create the cron schedule migration**

Create `supabase/migrations/004_cron_schedule.sql`:
```sql
-- Enable extensions (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Store project URL and anon key in vault for pg_net to use
-- (These should already exist from Task 1, but idempotent)
-- SELECT vault.create_secret('https://uailhfoyxaorntqwtebq.supabase.co', 'project_url');
-- SELECT vault.create_secret('<ANON_KEY>', 'anon_key');

-- Reddit: twice daily at 6:00 AM and 6:00 PM UTC
SELECT cron.schedule(
  'scrape-reddit',
  '0 6,18 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/scrape-reddit',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'anon_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 300000
  ) AS request_id;
  $$
);

-- Hacker News: twice daily at 7:00 AM and 7:00 PM UTC (staggered 1hr from Reddit)
SELECT cron.schedule(
  'scrape-hackernews',
  '0 7,19 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/scrape-hackernews',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'anon_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 300000
  ) AS request_id;
  $$
);

-- GitHub Trending: once daily at 8:00 AM UTC
SELECT cron.schedule(
  'scrape-github',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/scrape-github',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'anon_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 300000
  ) AS request_id;
  $$
);
```

- [ ] **Step 2: Apply the cron schedule via MCP**

Use Supabase MCP `apply_migration` with the SQL above and name `cron_schedule`.

Note: The vault secrets must already be populated from Task 1 before this migration runs.

- [ ] **Step 3: Verify cron jobs are registered**

Run via Supabase MCP `execute_sql`:
```sql
SELECT jobname, schedule, command FROM cron.job ORDER BY jobname;
```
Expected: 3 jobs — `scrape-github`, `scrape-hackernews`, `scrape-reddit`.

- [ ] **Step 4: Manually trigger one job to test**

Run via Supabase MCP `execute_sql`:
```sql
SELECT cron.schedule('test-reddit-now', '* * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/scrape-reddit',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'anon_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 300000
  ) AS request_id;
  $$
);
```

Wait 1-2 minutes, then check:
```sql
SELECT * FROM net._http_response ORDER BY created DESC LIMIT 1;
```

Then remove the test job:
```sql
SELECT cron.unschedule('test-reddit-now');
```

- [ ] **Step 5: Save migration and commit**

```bash
git add supabase/migrations/004_cron_schedule.sql supabase/functions/
git commit -m "feat: wire up pg_cron schedules for automated scraping pipeline"
```

- [ ] **Step 6: Push to GitHub**

```bash
git push origin main
```

---

## Summary

| Task | Description | Est. Time |
|------|-------------|-----------|
| 1 | Enable pg_cron, pg_net, store Vault secrets + Edge Function secret | 10 min |
| 2 | Deploy Reddit Edge Function | 10 min |
| 3 | Deploy HN Edge Function | 5 min |
| 4 | Deploy GitHub Edge Function | 5 min |
| 5 | Wire up pg_cron schedules | 10 min |
| **Total** | | **~40 min** |

## Cron Schedule Summary

| Source | Schedule (UTC) | Frequency |
|--------|---------------|-----------|
| Reddit | 6:00, 18:00 | 2x daily |
| Hacker News | 7:00, 19:00 | 2x daily |
| GitHub Trending | 8:00 | 1x daily |

## Adding More Sources Later

To add a new source (e.g., Twitter, Fiverr, Product Hunt):
1. Create a new Edge Function `scrape-<source>` following the same pattern
2. Deploy via `deploy_edge_function`
3. Add a `cron.schedule()` entry with a staggered time
4. Set any additional API keys as Edge Function secrets

The architecture scales horizontally — each source is independent.
