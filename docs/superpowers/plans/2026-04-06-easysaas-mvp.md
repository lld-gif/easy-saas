# EasySaaS MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy a searchable SaaS idea directory seeded with ~50-100 ideas scraped from the internet.

**Architecture:** Next.js App Router serves SSR pages from a Supabase Postgres database. Ideas are seeded by a one-time TypeScript script that scrapes 8 sources and uses Claude Haiku for extraction + OpenAI for embeddings. The frontend provides card/list browsing, full-text search, category filters, and cursor pagination.

**Tech Stack:** Next.js 15, Supabase (Postgres + pgvector), Tailwind CSS, shadcn/ui, TypeScript, Vercel

**Spec:** `docs/superpowers/specs/2026-04-06-easy-saas-design.md`

---

## File Structure

```
easy-saas/
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # Root layout: nav, footer, fonts, metadata
│   │   ├── page.tsx                    # Homepage: hero, trending, categories
│   │   ├── ideas/
│   │   │   ├── page.tsx               # Idea directory: search, filter, card/list
│   │   │   └── [slug]/
│   │   │       └── page.tsx           # Idea detail page
│   │   └── globals.css                # Tailwind imports
│   ├── components/
│   │   ├── ui/                        # shadcn/ui components (auto-generated)
│   │   ├── IdeaCard.tsx               # Single idea card for grid view
│   │   ├── IdeaListRow.tsx            # Single idea row for list view
│   │   ├── IdeaGrid.tsx              # Container: renders cards or rows + view toggle
│   │   ├── SearchBar.tsx              # Debounced search input
│   │   ├── FilterBar.tsx              # Category chips + popularity + time filters
│   │   ├── ViewToggle.tsx             # Card/list toggle button
│   │   ├── MentionBadge.tsx           # Heat badge (🔥 trending, 📈 rising, 🆕 new)
│   │   ├── CategoryBadge.tsx          # Colored category chip
│   │   ├── LoadMoreButton.tsx         # Cursor pagination trigger
│   │   ├── EmptyState.tsx             # Reusable empty state display
│   │   ├── HeroSection.tsx            # Homepage hero with search
│   │   ├── HowItWorks.tsx             # 3-step explanation section
│   │   └── Navbar.tsx                 # Top navigation bar
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── server.ts              # Server-side Supabase client
│   │   │   └── client.ts             # Browser-side Supabase client
│   │   ├── queries.ts                 # All DB query functions
│   │   ├── categories.ts             # Category enum + metadata (colors, labels)
│   │   └── utils.ts                   # URL param helpers, slug generation
│   └── types/
│       └── index.ts                   # Idea, IdeaFilters, SortOption types
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql    # All MVP tables, indexes, RLS, triggers
├── scripts/
│   └── seed.ts                       # One-time seeding script
├── .env.local.example                # Template for env vars
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── components.json                   # shadcn/ui config
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`, `.env.local.example`, `components.json`

- [ ] **Step 1: Initialize Next.js project**

Run:
```bash
cd /Users/131221-mbp/ashcroft-workspace/personal-projects/easy-saas
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm
```

Expected: Project scaffolded with `src/app/` structure, Tailwind configured, TypeScript strict.

- [ ] **Step 2: Install dependencies**

```bash
pnpm add @supabase/supabase-js @supabase/ssr
pnpm add -D supabase
```

- [ ] **Step 3: Initialize shadcn/ui**

```bash
pnpm dlx shadcn@latest init -d
```

Select: New York style, Zinc base color, CSS variables yes.

- [ ] **Step 4: Add shadcn/ui components we'll need**

```bash
pnpm dlx shadcn@latest add button input badge card table separator skeleton
```

- [ ] **Step 5: Create `.env.local.example`**

Create file `.env.local.example`:
```bash
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Seed script / pipeline (required for seeding)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# Optional source API keys
TWITTER_BEARER_TOKEN=
GITHUB_TOKEN=
PRODUCTHUNT_TOKEN=
```

- [ ] **Step 6: Create placeholder homepage**

Replace `src/app/page.tsx` with:
```tsx
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold">EasySaaS</h1>
      <p className="mt-4 text-muted-foreground">Discover your next SaaS idea.</p>
    </main>
  )
}
```

- [ ] **Step 7: Verify dev server starts**

Run: `pnpm dev`
Expected: App loads at `http://localhost:3000` showing "EasySaaS" heading.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js + Tailwind + shadcn/ui project"
```

---

## Task 2: TypeScript Types & Category Constants

**Files:**
- Create: `src/types/index.ts`, `src/lib/categories.ts`, `src/lib/utils.ts`

- [ ] **Step 1: Define core types**

Create `src/types/index.ts`:
```ts
export interface Idea {
  id: string
  slug: string
  title: string
  summary: string
  category: string
  tags: string[]
  mention_count: number
  first_seen_at: string
  last_seen_at: string
  status: "active" | "needs_review" | "archived"
  created_at: string
  updated_at: string
}

export interface IdeaSource {
  id: string
  idea_id: string
  source_platform: string
  source_url: string | null
  raw_text: string | null
  extracted_at: string
}

export type SortOption = "trending" | "newest" | "recent"

export type PopularityFilter = "all" | "trending" | "rising" | "new"

export type TimeFilter = "all" | "week" | "month" | "3months"

export interface IdeaFilters {
  q?: string
  category?: string
  popularity?: PopularityFilter
  time?: TimeFilter
  sort?: SortOption
  view?: "card" | "list"
  cursor?: string
}
```

- [ ] **Step 2: Define category constants**

Create `src/lib/categories.ts`:
```ts
export const CATEGORIES = [
  { slug: "fintech", label: "Fintech", color: "bg-emerald-100 text-emerald-800" },
  { slug: "devtools", label: "DevTools", color: "bg-blue-100 text-blue-800" },
  { slug: "automation", label: "Automation", color: "bg-purple-100 text-purple-800" },
  { slug: "ai-ml", label: "AI/ML", color: "bg-pink-100 text-pink-800" },
  { slug: "ecommerce", label: "Ecommerce", color: "bg-orange-100 text-orange-800" },
  { slug: "health", label: "Health", color: "bg-red-100 text-red-800" },
  { slug: "education", label: "Education", color: "bg-yellow-100 text-yellow-800" },
  { slug: "creator-tools", label: "Creator Tools", color: "bg-indigo-100 text-indigo-800" },
  { slug: "productivity", label: "Productivity", color: "bg-cyan-100 text-cyan-800" },
  { slug: "marketing", label: "Marketing", color: "bg-lime-100 text-lime-800" },
  { slug: "hr-recruiting", label: "HR/Recruiting", color: "bg-teal-100 text-teal-800" },
  { slug: "real-estate", label: "Real Estate", color: "bg-amber-100 text-amber-800" },
  { slug: "logistics", label: "Logistics", color: "bg-slate-100 text-slate-800" },
  { slug: "other", label: "Other", color: "bg-gray-100 text-gray-800" },
] as const

export type CategorySlug = (typeof CATEGORIES)[number]["slug"]

export function getCategoryBySlug(slug: string) {
  return CATEGORIES.find((c) => c.slug === slug) ?? CATEGORIES[CATEGORIES.length - 1]
}
```

- [ ] **Step 3: Create utility helpers**

Create `src/lib/utils.ts` (extend the shadcn default):
```ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function parseSearchParams(params: Record<string, string | string[] | undefined>) {
  return {
    q: typeof params.q === "string" ? params.q : undefined,
    category: typeof params.category === "string" ? params.category : undefined,
    popularity: typeof params.popularity === "string" ? params.popularity as any : undefined,
    time: typeof params.time === "string" ? params.time as any : undefined,
    sort: typeof params.sort === "string" ? params.sort as any : "trending",
    view: typeof params.view === "string" ? params.view as any : "card",
    cursor: typeof params.cursor === "string" ? params.cursor : undefined,
  }
}
```

Note: shadcn/ui may have already created `src/lib/utils.ts` with `cn`. If so, merge the new functions into the existing file rather than overwriting.

- [ ] **Step 4: Commit**

```bash
git add src/types/ src/lib/categories.ts src/lib/utils.ts
git commit -m "feat: add TypeScript types, category constants, and utility helpers"
```

---

## Task 3: Supabase Setup & Database Migration

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`
- Create: `src/lib/supabase/server.ts`, `src/lib/supabase/client.ts`

- [ ] **Step 1: Create Supabase project**

Use the Supabase MCP tools:
1. List organizations to find the org ID
2. Check cost for a new project
3. Confirm cost
4. Create the project in `us-west-1` region named "easy-saas"
5. Wait for project to be ready
6. Enable the `vector` extension: `CREATE EXTENSION IF NOT EXISTS vector;`
7. Save the project URL and keys to `.env.local`

- [ ] **Step 2: Write the migration SQL**

Create `supabase/migrations/001_initial_schema.sql`:
```sql
-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Ideas table
CREATE TABLE ideas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  summary text NOT NULL,
  category text NOT NULL,
  tags text[] DEFAULT '{}',
  mention_count int DEFAULT 1,
  first_seen_at timestamptz DEFAULT now(),
  last_seen_at timestamptz DEFAULT now(),
  status text DEFAULT 'active' CHECK (status IN ('active', 'needs_review', 'archived')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Generated tsvector column for full-text search
ALTER TABLE ideas ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', title || ' ' || summary || ' ' || array_to_string(tags, ' '))
  ) STORED;

-- Indexes
CREATE INDEX idx_ideas_category ON ideas (category);
CREATE INDEX idx_ideas_mention_count ON ideas (mention_count DESC);
CREATE INDEX idx_ideas_first_seen_at ON ideas (first_seen_at DESC);
CREATE INDEX idx_ideas_search ON ideas USING gin (search_vector);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ideas_updated_at
  BEFORE UPDATE ON ideas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Idea sources (admin-only)
CREATE TABLE idea_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id uuid NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  source_platform text NOT NULL,
  source_url text,
  raw_text text,
  extracted_at timestamptz DEFAULT now()
);

CREATE INDEX idx_idea_sources_idea_id ON idea_sources (idea_id);
CREATE INDEX idx_idea_sources_platform ON idea_sources (source_platform);

-- Idea embeddings (for deduplication)
CREATE TABLE idea_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id uuid UNIQUE NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  embedding vector(1536)
);

-- RLS
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE idea_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE idea_embeddings ENABLE ROW LEVEL SECURITY;

-- ideas: public read
CREATE POLICY "ideas_public_read" ON ideas
  FOR SELECT USING (true);

-- idea_sources: no public access (service role only)
-- idea_embeddings: no public access (service role only)

-- Cosine similarity match function for deduplication (used by seed script)
CREATE OR REPLACE FUNCTION match_idea_embeddings(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.85,
  match_count int DEFAULT 1
)
RETURNS TABLE (
  idea_id uuid,
  mention_count int,
  similarity float
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ie.idea_id,
    i.mention_count,
    1 - (ie.embedding <=> query_embedding) AS similarity
  FROM idea_embeddings ie
  JOIN ideas i ON i.id = ie.idea_id
  WHERE 1 - (ie.embedding <=> query_embedding) > match_threshold
  ORDER BY ie.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

- [ ] **Step 3: Apply the migration**

Use the Supabase MCP `apply_migration` tool with the SQL above and name `initial_schema`.

- [ ] **Step 4: Verify tables exist**

Use Supabase MCP `list_tables` with `schemas: ["public"]` and `verbose: true`.
Expected: `ideas`, `idea_sources`, `idea_embeddings` tables with correct columns.

- [ ] **Step 5: Create Supabase server client**

Create `src/lib/supabase/server.ts`:
```ts
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server component — can't set cookies
          }
        },
      },
    }
  )
}
```

- [ ] **Step 6: Create Supabase browser client**

Create `src/lib/supabase/client.ts`:
```ts
import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 7: Commit**

```bash
git add supabase/ src/lib/supabase/
git commit -m "feat: add Supabase schema migration and client setup"
```

---

## Task 4: Database Query Layer

**Files:**
- Create: `src/lib/queries.ts`

- [ ] **Step 1: Write query functions**

Create `src/lib/queries.ts`:
```ts
import { createClient } from "@/lib/supabase/server"
import type { Idea, IdeaFilters, PopularityFilter, TimeFilter } from "@/types"

const PAGE_SIZE = 24

function getMinMentions(popularity?: PopularityFilter): number {
  switch (popularity) {
    case "trending": return 10
    case "rising": return 5
    case "new": return 1
    default: return 0
  }
}

function getMaxMentions(popularity?: PopularityFilter): number | null {
  switch (popularity) {
    case "rising": return 9
    case "new": return 4
    default: return null
  }
}

function getAfterDate(time?: TimeFilter): string | null {
  if (!time || time === "all") return null
  const now = new Date()
  switch (time) {
    case "week":
      now.setDate(now.getDate() - 7)
      return now.toISOString()
    case "month":
      now.setMonth(now.getMonth() - 1)
      return now.toISOString()
    case "3months":
      now.setMonth(now.getMonth() - 3)
      return now.toISOString()
    default:
      return null
  }
}

export async function getIdeas(filters: IdeaFilters): Promise<{
  ideas: Idea[]
  nextCursor: string | null
}> {
  const supabase = await createClient()
  const sort = filters.sort ?? "trending"
  const minMentions = getMinMentions(filters.popularity)
  const maxMentions = getMaxMentions(filters.popularity)
  const afterDate = getAfterDate(filters.time)

  let query = supabase
    .from("ideas")
    .select("*")
    .eq("status", "active")
    .gte("mention_count", minMentions)

  if (maxMentions !== null) {
    query = query.lte("mention_count", maxMentions)
  }

  if (filters.category) {
    query = query.eq("category", filters.category)
  }

  if (afterDate) {
    query = query.gte("first_seen_at", afterDate)
  }

  if (filters.q) {
    query = query.textSearch("search_vector", filters.q, {
      type: "websearch",
      config: "english",
    })
  }

  // Sort
  switch (sort) {
    case "trending":
      query = query.order("mention_count", { ascending: false }).order("id", { ascending: false })
      break
    case "newest":
      query = query.order("first_seen_at", { ascending: false }).order("id", { ascending: false })
      break
    case "recent":
      query = query.order("last_seen_at", { ascending: false }).order("id", { ascending: false })
      break
  }

  // Cursor pagination: if cursor provided, fetch the cursor row to get its sort value,
  // then filter to rows "after" it. Fetch one extra to detect next page.
  if (filters.cursor) {
    const { data: cursorRow } = await supabase
      .from("ideas")
      .select("id, mention_count, first_seen_at, last_seen_at")
      .eq("id", filters.cursor)
      .single()

    if (cursorRow) {
      switch (sort) {
        case "trending":
          query = query.or(
            `mention_count.lt.${cursorRow.mention_count},and(mention_count.eq.${cursorRow.mention_count},id.lt.${cursorRow.id})`
          )
          break
        case "newest":
          query = query.or(
            `first_seen_at.lt.${cursorRow.first_seen_at},and(first_seen_at.eq.${cursorRow.first_seen_at},id.lt.${cursorRow.id})`
          )
          break
        case "recent":
          query = query.or(
            `last_seen_at.lt.${cursorRow.last_seen_at},and(last_seen_at.eq.${cursorRow.last_seen_at},id.lt.${cursorRow.id})`
          )
          break
      }
    }
  }

  query = query.limit(PAGE_SIZE + 1)

  const { data, error } = await query

  if (error) {
    console.error("Failed to fetch ideas:", error)
    return { ideas: [], nextCursor: null }
  }

  const ideas = data as Idea[]
  const hasMore = ideas.length > PAGE_SIZE
  const pageIdeas = hasMore ? ideas.slice(0, PAGE_SIZE) : ideas
  const nextCursor = hasMore ? pageIdeas[pageIdeas.length - 1].id : null

  return { ideas: pageIdeas, nextCursor }
}

export async function getIdeaBySlug(slug: string): Promise<Idea | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("ideas")
    .select("*")
    .eq("slug", slug)
    .eq("status", "active")
    .single()

  if (error) {
    console.error("Failed to fetch idea:", error)
    return null
  }

  return data as Idea
}

export async function getTrendingIdeas(limit: number = 12): Promise<Idea[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("ideas")
    .select("*")
    .eq("status", "active")
    .order("mention_count", { ascending: false })
    .limit(limit)

  if (error) {
    console.error("Failed to fetch trending ideas:", error)
    return []
  }

  return data as Idea[]
}

export async function getIdeaCount(): Promise<number> {
  const supabase = await createClient()

  const { count, error } = await supabase
    .from("ideas")
    .select("*", { count: "exact", head: true })
    .eq("status", "active")

  if (error) {
    console.error("Failed to count ideas:", error)
    return 0
  }

  return count ?? 0
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/queries.ts
git commit -m "feat: add database query layer for ideas"
```

---

## Task 5: Shared UI Components

**Files:**
- Create: `src/components/Navbar.tsx`, `src/components/MentionBadge.tsx`, `src/components/CategoryBadge.tsx`, `src/components/EmptyState.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Create MentionBadge**

Create `src/components/MentionBadge.tsx`:
```tsx
import { Badge } from "@/components/ui/badge"

interface MentionBadgeProps {
  count: number
}

export function MentionBadge({ count }: MentionBadgeProps) {
  if (count >= 10) {
    return <Badge variant="destructive" className="text-xs">🔥 {count}</Badge>
  }
  if (count >= 5) {
    return <Badge variant="secondary" className="text-xs">📈 {count}</Badge>
  }
  return <Badge variant="outline" className="text-xs">🆕 {count}</Badge>
}
```

- [ ] **Step 2: Create CategoryBadge**

Create `src/components/CategoryBadge.tsx`:
```tsx
import { getCategoryBySlug } from "@/lib/categories"
import { cn } from "@/lib/utils"

interface CategoryBadgeProps {
  category: string
  className?: string
}

export function CategoryBadge({ category, className }: CategoryBadgeProps) {
  const cat = getCategoryBySlug(category)
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", cat.color, className)}>
      {cat.label}
    </span>
  )
}
```

- [ ] **Step 3: Create EmptyState**

Create `src/components/EmptyState.tsx`:
```tsx
interface EmptyStateProps {
  title: string
  description: string
  action?: React.ReactNode
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-md">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
```

- [ ] **Step 4: Create Navbar**

Create `src/components/Navbar.tsx`:
```tsx
import Link from "next/link"

export function Navbar() {
  return (
    <nav className="border-b bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            EasySaaS
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/ideas"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Browse Ideas
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}
```

- [ ] **Step 5: Create Footer**

Create `src/components/Footer.tsx`:
```tsx
export function Footer() {
  return (
    <footer className="border-t bg-background mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <p className="text-center text-sm text-muted-foreground">
          EasySaaS — Discover your next SaaS idea. Built with Next.js + Supabase.
        </p>
      </div>
    </footer>
  )
}
```

- [ ] **Step 6: Update root layout**

Replace `src/app/layout.tsx`:
```tsx
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Navbar } from "@/components/Navbar"
import { Footer } from "@/components/Footer"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "EasySaaS — Discover Your Next SaaS Idea",
  description:
    "We scan Twitter, Reddit, HN, and 5 more sources daily to find SaaS ideas you can build.",
  openGraph: {
    title: "EasySaaS — Discover Your Next SaaS Idea",
    description:
      "We scan Twitter, Reddit, HN, and 5 more sources daily to find SaaS ideas you can build.",
    siteName: "EasySaaS",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen flex flex-col`}>
        <Navbar />
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  )
}
```

- [ ] **Step 7: Verify layout renders**

Run: `pnpm dev`
Expected: Page loads with "EasySaaS" in top nav, "Browse Ideas" link, and footer at bottom.

- [ ] **Step 8: Commit**

```bash
git add src/components/ src/app/layout.tsx
git commit -m "feat: add shared UI components — Navbar, Footer, badges, empty state"
```

---

## Task 6: Homepage

**Files:**
- Create: `src/components/HeroSection.tsx`, `src/components/HowItWorks.tsx`, `src/components/IdeaCard.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Create IdeaCard**

Create `src/components/IdeaCard.tsx`:
```tsx
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CategoryBadge } from "@/components/CategoryBadge"
import { MentionBadge } from "@/components/MentionBadge"
import { formatDate } from "@/lib/utils"
import type { Idea } from "@/types"

interface IdeaCardProps {
  idea: Idea
}

export function IdeaCard({ idea }: IdeaCardProps) {
  return (
    <Link href={`/ideas/${idea.slug}`}>
      <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base leading-snug line-clamp-2">
              {idea.title}
            </CardTitle>
            <MentionBadge count={idea.mention_count} />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
            {idea.summary}
          </p>
          <div className="flex items-center justify-between">
            <CategoryBadge category={idea.category} />
            <span className="text-xs text-muted-foreground">
              {formatDate(idea.first_seen_at)}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
```

- [ ] **Step 2: Create HeroSection**

Create `src/components/HeroSection.tsx`:
```tsx
"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface HeroSectionProps {
  ideaCount: number
}

export function HeroSection({ ideaCount }: HeroSectionProps) {
  const router = useRouter()
  const [query, setQuery] = useState("")

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/ideas?q=${encodeURIComponent(query.trim())}`)
    } else {
      router.push("/ideas")
    }
  }

  return (
    <section className="py-20 px-4 text-center">
      <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
        Discover your next SaaS idea
      </h1>
      <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
        We scan Twitter, Reddit, HN, and 5 more sources daily to find ideas you can build.
      </p>
      <form onSubmit={handleSearch} className="mt-8 flex max-w-lg mx-auto gap-2">
        <Input
          placeholder="Search ideas..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1"
        />
        <Button type="submit">Search</Button>
      </form>
      {ideaCount > 0 && (
        <p className="mt-4 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{ideaCount}</span> ideas discovered and counting
        </p>
      )}
    </section>
  )
}
```

- [ ] **Step 3: Create HowItWorks**

Create `src/components/HowItWorks.tsx`:
```tsx
export function HowItWorks() {
  const steps = [
    { emoji: "🌐", title: "We scan the internet", description: "Twitter, Reddit, Fiverr, HN, Product Hunt, and more" },
    { emoji: "🤖", title: "AI extracts ideas", description: "Every mention is classified, deduplicated, and ranked" },
    { emoji: "🚀", title: "You build the next big thing", description: "Browse validated ideas with real demand signals" },
  ]

  return (
    <section className="py-16 px-4 bg-muted/50">
      <h2 className="text-2xl font-bold text-center mb-10">How it works</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
        {steps.map((step, i) => (
          <div key={i} className="text-center">
            <div className="text-4xl mb-3">{step.emoji}</div>
            <h3 className="font-semibold">{step.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Build the homepage**

Replace `src/app/page.tsx`:
```tsx
import Link from "next/link"
import { HeroSection } from "@/components/HeroSection"
import { HowItWorks } from "@/components/HowItWorks"
import { IdeaCard } from "@/components/IdeaCard"
import { getTrendingIdeas, getIdeaCount } from "@/lib/queries"
import { CATEGORIES } from "@/lib/categories"

export default async function Home() {
  const [trending, ideaCount] = await Promise.all([
    getTrendingIdeas(12),
    getIdeaCount(),
  ])

  return (
    <main>
      <HeroSection ideaCount={ideaCount} />

      {/* Category chips */}
      <section className="py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {CATEGORIES.filter((c) => c.slug !== "other").map((cat) => (
              <Link
                key={cat.slug}
                href={`/ideas?category=${cat.slug}`}
                className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap ${cat.color} hover:opacity-80 transition-opacity`}
              >
                {cat.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Trending ideas */}
      {trending.length > 0 && (
        <section className="py-8 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Trending Ideas</h2>
              <Link href="/ideas" className="text-sm text-muted-foreground hover:text-foreground">
                View all &rarr;
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {trending.map((idea) => (
                <IdeaCard key={idea.id} idea={idea} />
              ))}
            </div>
          </div>
        </section>
      )}

      <HowItWorks />
    </main>
  )
}
```

- [ ] **Step 5: Verify homepage renders**

Run: `pnpm dev`
Expected: Homepage shows hero section with search bar, category chips, "How it works" section. Trending section is empty (no data yet) — that's expected.

- [ ] **Step 6: Commit**

```bash
git add src/
git commit -m "feat: build homepage with hero, category chips, trending grid"
```

---

## Task 7: Idea Directory Page (`/ideas`)

**Files:**
- Create: `src/components/IdeaListRow.tsx`, `src/components/IdeaGrid.tsx`, `src/components/SearchBar.tsx`, `src/components/FilterBar.tsx`, `src/components/ViewToggle.tsx`, `src/components/LoadMoreButton.tsx`
- Create: `src/app/ideas/page.tsx`

- [ ] **Step 1: Create ViewToggle**

Create `src/components/ViewToggle.tsx`:
```tsx
"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"

export function ViewToggle() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const view = searchParams.get("view") ?? "card"

  const toggle = (newView: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("view", newView)
    router.push(`/ideas?${params.toString()}`)
  }

  return (
    <div className="flex gap-1">
      <Button
        variant={view === "card" ? "default" : "outline"}
        size="sm"
        onClick={() => toggle("card")}
      >
        Cards
      </Button>
      <Button
        variant={view === "list" ? "default" : "outline"}
        size="sm"
        onClick={() => toggle("list")}
      >
        List
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: Create SearchBar**

Create `src/components/SearchBar.tsx`:
```tsx
"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"

export function SearchBar() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get("q") ?? "")

  useEffect(() => {
    const timeout = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (query.trim()) {
        params.set("q", query.trim())
      } else {
        params.delete("q")
      }
      params.delete("cursor") // reset pagination on new search
      router.push(`/ideas?${params.toString()}`)
    }, 300)

    return () => clearTimeout(timeout)
  }, [query]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Input
      placeholder="Search SaaS ideas..."
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      className="max-w-sm"
    />
  )
}
```

- [ ] **Step 3: Create FilterBar**

Create `src/components/FilterBar.tsx`:
```tsx
"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { CATEGORIES } from "@/lib/categories"
import { cn } from "@/lib/utils"

const POPULARITY_OPTIONS = [
  { value: "all", label: "All" },
  { value: "trending", label: "🔥 Trending" },
  { value: "rising", label: "📈 Rising" },
  { value: "new", label: "🆕 New" },
]

const TIME_OPTIONS = [
  { value: "all", label: "All time" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "3months", label: "3 months" },
]

const SORT_OPTIONS = [
  { value: "trending", label: "Trending" },
  { value: "newest", label: "Newest" },
  { value: "recent", label: "Recently active" },
]

export function FilterBar() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const activeCategory = searchParams.get("category") ?? ""
  const activePopularity = searchParams.get("popularity") ?? "all"
  const activeTime = searchParams.get("time") ?? "all"
  const activeSort = searchParams.get("sort") ?? "trending"

  const setFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === "all" || value === "") {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    params.delete("cursor") // reset pagination on filter change
    router.push(`/ideas?${params.toString()}`)
  }

  return (
    <div className="space-y-3">
      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <button
          onClick={() => setFilter("category", "")}
          className={cn(
            "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors",
            !activeCategory ? "bg-foreground text-background" : "bg-muted hover:bg-muted/80"
          )}
        >
          All
        </button>
        {CATEGORIES.filter((c) => c.slug !== "other").map((cat) => (
          <button
            key={cat.slug}
            onClick={() => setFilter("category", cat.slug)}
            className={cn(
              "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors",
              activeCategory === cat.slug ? "bg-foreground text-background" : `${cat.color} hover:opacity-80`
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Sort + Popularity + Time */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Sort:</span>
          <select
            value={activeSort}
            onChange={(e) => setFilter("sort", e.target.value)}
            className="bg-background border rounded px-2 py-1 text-sm"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Popularity:</span>
          <select
            value={activePopularity}
            onChange={(e) => setFilter("popularity", e.target.value)}
            className="bg-background border rounded px-2 py-1 text-sm"
          >
            {POPULARITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Time:</span>
          <select
            value={activeTime}
            onChange={(e) => setFilter("time", e.target.value)}
            className="bg-background border rounded px-2 py-1 text-sm"
          >
            {TIME_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create IdeaListRow**

Create `src/components/IdeaListRow.tsx`:
```tsx
import Link from "next/link"
import { CategoryBadge } from "@/components/CategoryBadge"
import { MentionBadge } from "@/components/MentionBadge"
import { formatDate } from "@/lib/utils"
import type { Idea } from "@/types"

interface IdeaListRowProps {
  idea: Idea
}

export function IdeaListRow({ idea }: IdeaListRowProps) {
  return (
    <Link
      href={`/ideas/${idea.slug}`}
      className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
    >
      <div className="flex-1 min-w-0">
        <h3 className="font-medium truncate">{idea.title}</h3>
      </div>
      <CategoryBadge category={idea.category} />
      <MentionBadge count={idea.mention_count} />
      <span className="text-xs text-muted-foreground whitespace-nowrap hidden sm:inline">
        {formatDate(idea.first_seen_at)}
      </span>
    </Link>
  )
}
```

- [ ] **Step 5: Create IdeaGrid**

Create `src/components/IdeaGrid.tsx`:
```tsx
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { IdeaCard } from "@/components/IdeaCard"
import { IdeaListRow } from "@/components/IdeaListRow"
import { EmptyState } from "@/components/EmptyState"
import type { Idea } from "@/types"

interface IdeaGridProps {
  ideas: Idea[]
  view: "card" | "list"
  hasFilters?: boolean
  hasCategory?: boolean
}

export function IdeaGrid({ ideas, view, hasFilters, hasCategory }: IdeaGridProps) {
  if (ideas.length === 0) {
    if (hasFilters) {
      return (
        <EmptyState
          title="No ideas match your search"
          description="Try a broader term or remove some filters."
          action={
            <Link href="/ideas">
              <Button variant="outline">Clear all filters</Button>
            </Link>
          }
        />
      )
    }
    if (hasCategory) {
      return (
        <EmptyState
          title="No ideas in this category yet"
          description="Check back soon — we discover new ideas daily."
        />
      )
    }
    return (
      <EmptyState
        title="No ideas yet"
        description="Ideas are being discovered. Check back soon!"
      />
    )
  }

  if (view === "list") {
    return (
      <div className="divide-y">
        {ideas.map((idea) => (
          <IdeaListRow key={idea.id} idea={idea} />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {ideas.map((idea) => (
        <IdeaCard key={idea.id} idea={idea} />
      ))}
    </div>
  )
}
```

- [ ] **Step 6: Create LoadMoreButton**

Create `src/components/LoadMoreButton.tsx`:
```tsx
"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"

interface LoadMoreButtonProps {
  cursor: string
}

export function LoadMoreButton({ cursor }: LoadMoreButtonProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const loadMore = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("cursor", cursor)
    router.push(`/ideas?${params.toString()}`)
  }

  return (
    <div className="flex justify-center py-8">
      <Button variant="outline" onClick={loadMore}>
        Load more ideas
      </Button>
    </div>
  )
}
```

- [ ] **Step 7: Build the ideas directory page**

Create `src/app/ideas/page.tsx`:
```tsx
import type { Metadata } from "next"
import { Suspense } from "react"
import { SearchBar } from "@/components/SearchBar"
import { FilterBar } from "@/components/FilterBar"
import { ViewToggle } from "@/components/ViewToggle"
import { IdeaGrid } from "@/components/IdeaGrid"
import { LoadMoreButton } from "@/components/LoadMoreButton"
import { getIdeas } from "@/lib/queries"
import { parseSearchParams } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Browse SaaS Ideas — EasySaaS",
  description: "Search and filter hundreds of validated SaaS ideas from across the internet.",
}

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function IdeasPage({ searchParams }: Props) {
  const params = await searchParams
  const filters = parseSearchParams(params)
  const { ideas, nextCursor } = await getIdeas(filters)

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Browse Ideas</h1>
        <div className="flex items-center gap-3">
          <Suspense>
            <SearchBar />
          </Suspense>
          <Suspense>
            <ViewToggle />
          </Suspense>
        </div>
      </div>

      <Suspense>
        <FilterBar />
      </Suspense>

      <div className="mt-6">
        <IdeaGrid
          ideas={ideas}
          view={filters.view ?? "card"}
          hasFilters={!!(filters.q || filters.popularity || filters.time)}
          hasCategory={!!filters.category}
        />
      </div>

      {nextCursor && (
        <Suspense>
          <LoadMoreButton cursor={nextCursor} />
        </Suspense>
      )}
    </main>
  )
}
```

- [ ] **Step 8: Verify ideas page renders**

Run: `pnpm dev` and navigate to `http://localhost:3000/ideas`
Expected: Page shows "Browse Ideas" heading, search bar, view toggle, category chips, filter controls. IdeaGrid shows empty state ("No ideas found") since DB is empty.

- [ ] **Step 9: Commit**

```bash
git add src/
git commit -m "feat: build idea directory with search, filters, card/list views"
```

---

## Task 8: Idea Detail Page (`/ideas/[slug]`)

**Files:**
- Create: `src/app/ideas/[slug]/page.tsx`

- [ ] **Step 1: Build the detail page**

Create `src/app/ideas/[slug]/page.tsx`:
```tsx
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CategoryBadge } from "@/components/CategoryBadge"
import { MentionBadge } from "@/components/MentionBadge"
import { getIdeaBySlug } from "@/lib/queries"
import { formatDate } from "@/lib/utils"

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const idea = await getIdeaBySlug(slug)
  if (!idea) return { title: "Idea Not Found — EasySaaS" }

  return {
    title: `${idea.title} — EasySaaS`,
    description: idea.summary,
    openGraph: {
      title: `${idea.title} — EasySaaS`,
      description: idea.summary,
      siteName: "EasySaaS",
    },
  }
}

export default async function IdeaDetailPage({ params }: Props) {
  const { slug } = await params
  const idea = await getIdeaBySlug(slug)

  if (!idea) {
    notFound()
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link href="/ideas" className="hover:text-foreground">
          Ideas
        </Link>
        <span className="mx-2">/</span>
        <span>{idea.title}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold">{idea.title}</h1>
        <MentionBadge count={idea.mention_count} />
      </div>

      {/* Meta */}
      <div className="flex flex-wrap items-center gap-3 mb-8">
        <CategoryBadge category={idea.category} />
        {idea.tags.map((tag) => (
          <Badge key={tag} variant="outline" className="text-xs">
            {tag}
          </Badge>
        ))}
        <span className="text-sm text-muted-foreground">
          First spotted {formatDate(idea.first_seen_at)}
        </span>
      </div>

      {/* Summary */}
      <div className="prose prose-neutral max-w-none mb-8">
        <p className="text-lg leading-relaxed">{idea.summary}</p>
      </div>

      {/* Mention timeline / popularity */}
      <div className="rounded-lg border p-4 mb-8">
        <h2 className="font-semibold mb-2">Popularity</h2>
        <p className="text-sm text-muted-foreground">
          Spotted <span className="font-semibold text-foreground">{idea.mention_count}</span> time{idea.mention_count !== 1 ? "s" : ""} across
          the internet since {formatDate(idea.first_seen_at)}.
          {idea.last_seen_at !== idea.first_seen_at && (
            <> Most recently on {formatDate(idea.last_seen_at)}.</>
          )}
        </p>
        {/* Note: Per spec, show bar chart when 3+ monthly data points exist.
            MVP seeds data once, so timeline chart is deferred to Phase 2
            when the cron pipeline produces multiple monthly data points.
            The text fallback above satisfies the spec's <3 data points case. */}
      </div>

      {/* Pro CTA (placeholder for post-MVP) */}
      <div className="rounded-lg border border-dashed p-6 text-center bg-muted/30">
        <h3 className="font-semibold">Want the full spec?</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Detailed technical spec, branding suggestions, and financial model — coming soon.
        </p>
        <Button className="mt-4" disabled>
          Coming Soon
        </Button>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Verify detail page works**

Run: `pnpm dev` and navigate to `http://localhost:3000/ideas/test-slug`
Expected: 404 page (no data yet). The page structure is correct — it will work once seeded.

- [ ] **Step 3: Commit**

```bash
git add src/app/ideas/
git commit -m "feat: build idea detail page with metadata, tags, popularity"
```

---

## Task 9: Seed Script

**Files:**
- Create: `scripts/seed.ts`
- Modify: `package.json` (add `seed` script)

- [ ] **Step 1: Install seed script dependencies**

```bash
pnpm add -D tsx @anthropic-ai/sdk openai
```

- [ ] **Step 2: Write the seed script**

Create `scripts/seed.ts`:
```ts
import Anthropic from "@anthropic-ai/sdk"
import OpenAI from "openai"
import { createClient } from "@supabase/supabase-js"

// --- Config ---
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const anthropic = new Anthropic()
const openai = new OpenAI()

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

// --- Source fetchers ---

async function fetchReddit(): Promise<string[]> {
  const subreddits = ["SaaS", "Entrepreneur", "SideProject"]
  const posts: string[] = []

  for (const sub of subreddits) {
    try {
      const res = await fetch(`https://www.reddit.com/r/${sub}/hot.json?limit=25`, {
        headers: { "User-Agent": "EasySaaS-Seed/1.0" },
      })
      if (!res.ok) continue
      const data = await res.json()
      for (const child of data.data.children) {
        const post = child.data
        if (post.selftext && post.selftext.length > 50) {
          posts.push(`Title: ${post.title}\nBody: ${post.selftext.slice(0, 500)}\nURL: https://reddit.com${post.permalink}`)
        }
      }
    } catch (e) {
      console.warn(`Failed to fetch r/${sub}:`, e)
    }
  }

  return posts
}

async function fetchHackerNews(): Promise<string[]> {
  const posts: string[] = []
  const queries = ["Show HN", "Ask HN what should I build", "SaaS idea"]

  for (const q of queries) {
    try {
      const res = await fetch(
        `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(q)}&tags=story&hitsPerPage=20`
      )
      if (!res.ok) continue
      const data = await res.json()
      for (const hit of data.hits) {
        if (hit.title) {
          const text = `Title: ${hit.title}${hit.story_text ? `\nBody: ${hit.story_text.slice(0, 500)}` : ""}\nURL: https://news.ycombinator.com/item?id=${hit.objectID}`
          posts.push(text)
        }
      }
    } catch (e) {
      console.warn(`Failed to fetch HN for "${q}":`, e)
    }
  }

  return posts
}

async function fetchGitHubTrending(): Promise<string[]> {
  const posts: string[] = []
  const token = process.env.GITHUB_TOKEN

  try {
    const since = new Date()
    since.setDate(since.getDate() - 7)
    const url = `https://api.github.com/search/repositories?q=created:>${since.toISOString().split("T")[0]}&sort=stars&order=desc&per_page=30`
    const headers: Record<string, string> = { Accept: "application/vnd.github.v3+json" }
    if (token) headers.Authorization = `Bearer ${token}`

    const res = await fetch(url, { headers })
    if (!res.ok) return posts
    const data = await res.json()

    for (const repo of data.items) {
      if (repo.description) {
        posts.push(`Repo: ${repo.full_name}\nDescription: ${repo.description}\nStars: ${repo.stargazers_count}\nURL: ${repo.html_url}`)
      }
    }
  } catch (e) {
    console.warn("Failed to fetch GitHub trending:", e)
  }

  return posts
}

// --- LLM Extraction ---

async function extractIdeas(posts: string[], sourcePlatform: string): Promise<{ ideas: ExtractedIdea[], sourceTexts: string[] }> {
  // Batch posts into chunks of ~10 for efficiency
  const chunkSize = 10
  const allIdeas: ExtractedIdea[] = []
  const allSourceTexts: string[] = []

  for (let i = 0; i < posts.length; i += chunkSize) {
    const chunk = posts.slice(i, i + chunkSize)
    const prompt = `You are an AI that identifies SaaS product ideas from internet posts. Analyze these posts and extract any viable SaaS ideas mentioned or implied.

For each idea found, return a JSON array of objects with:
- idea_title: concise product name (e.g., "AI Invoice Parser for Freelancers")
- summary: 2-3 sentence pitch describing the problem, solution, and target user
- category: one of: ${CATEGORIES.join(", ")}
- tags: 3-5 lowercase tags
- confidence: 0.0-1.0 (how clearly this is a viable SaaS idea)

If a post doesn't contain a SaaS idea, skip it. Return only the JSON array, no other text.

Posts:
${chunk.map((p, idx) => `--- Post ${idx + 1} ---\n${p}`).join("\n\n")}

Return a JSON array:`

    try {
      const response = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      })

      const text = response.content[0].type === "text" ? response.content[0].text : ""
      // Extract JSON from response
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        const ideas: ExtractedIdea[] = JSON.parse(jsonMatch[0])
        for (const idea of ideas) {
          if (idea.confidence >= 0.5 && idea.idea_title && idea.summary) {
            allIdeas.push(idea)
            allSourceTexts.push(chunk[0]) // associate with first post in chunk
          }
        }
      }
    } catch (e) {
      console.warn(`Failed to extract ideas from ${sourcePlatform} batch:`, e)
    }
  }

  return { ideas: allIdeas, sourceTexts: allSourceTexts }
}

// --- Embedding & Dedup ---

async function getEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  })
  return response.data[0].embedding
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80)
}

async function deduplicateAndInsert(
  idea: ExtractedIdea,
  sourcePlatform: string,
  sourceText: string
): Promise<boolean> {
  const embedding = await getEmbedding(`${idea.idea_title} ${idea.summary}`)

  // Check for duplicates via cosine similarity
  const { data: matches } = await supabase.rpc("match_idea_embeddings", {
    query_embedding: embedding,
    match_threshold: 0.85,
    match_count: 1,
  })

  if (matches && matches.length > 0) {
    // Duplicate found — increment mention count
    const existingId = matches[0].idea_id
    await supabase
      .from("ideas")
      .update({
        mention_count: matches[0].mention_count + 1,
        last_seen_at: new Date().toISOString(),
      })
      .eq("id", existingId)

    await supabase.from("idea_sources").insert({
      idea_id: existingId,
      source_platform: sourcePlatform,
      raw_text: sourceText.slice(0, 2000),
    })

    console.log(`  ↑ Duplicate: "${idea.idea_title}" (now ${matches[0].mention_count + 1} mentions)`)
    return false
  }

  // New idea — insert
  const slug = slugify(idea.idea_title)
  const status = idea.confidence >= 0.7 ? "active" : "needs_review"

  const { data: newIdea, error } = await supabase
    .from("ideas")
    .insert({
      slug: `${slug}-${Date.now().toString(36)}`, // ensure uniqueness
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
    console.warn(`  ✗ Failed to insert "${idea.idea_title}":`, error.message)
    return false
  }

  // Insert embedding
  await supabase.from("idea_embeddings").insert({
    idea_id: newIdea.id,
    embedding,
  })

  // Insert source
  await supabase.from("idea_sources").insert({
    idea_id: newIdea.id,
    source_platform: sourcePlatform,
    raw_text: sourceText.slice(0, 2000),
  })

  console.log(`  ✓ New: "${idea.idea_title}" [${idea.category}] (${status})`)
  return true
}

// --- Main ---

async function main() {
  console.log("🌱 EasySaaS Seed Script\n")

  // Test connection
  const { error: connError } = await supabase.from("ideas").select("id").limit(0)
  if (connError) {
    console.error("Cannot connect to Supabase:", connError.message)
    process.exit(1)
  }

  // MVP sources: Reddit, HN, GitHub (free, no auth required).
  // Phase 2 adds: Twitter/X (paid API), Fiverr (scrape), Product Hunt (OAuth),
  // Indie Hackers (scrape), Google Trends (scrape).
  const sources: { name: string; fetcher: () => Promise<string[]> }[] = [
    { name: "reddit", fetcher: fetchReddit },
    { name: "hackernews", fetcher: fetchHackerNews },
    { name: "github", fetcher: fetchGitHubTrending },
  ]

  let totalNew = 0
  let totalDupes = 0

  for (const source of sources) {
    console.log(`\n📡 Fetching from ${source.name}...`)
    const posts = await source.fetcher()
    console.log(`  Found ${posts.length} posts`)

    if (posts.length === 0) continue

    console.log(`  Extracting ideas with Claude Haiku...`)
    const { ideas, sourceTexts } = await extractIdeas(posts, source.name)
    console.log(`  Extracted ${ideas.length} potential ideas`)

    for (let i = 0; i < ideas.length; i++) {
      const isNew = await deduplicateAndInsert(ideas[i], source.name, sourceTexts[i] ?? "")
      if (isNew) totalNew++
      else totalDupes++
    }
  }

  console.log(`\n✅ Seed complete: ${totalNew} new ideas, ${totalDupes} duplicates merged`)

  // Print count
  const { count } = await supabase
    .from("ideas")
    .select("*", { count: "exact", head: true })
    .eq("status", "active")
  console.log(`📊 Total active ideas in database: ${count}`)
}

main().catch(console.error)
```

Note: The `match_idea_embeddings` function was already created in Task 3's initial migration. No separate migration needed.

- [ ] **Step 3: Add seed script to package.json**

Add to `package.json` scripts:
```json
"seed": "tsx scripts/seed.ts"
```

Run: Edit `package.json` to add the script.

- [ ] **Step 4: Run the seed script**

Ensure `.env.local` has all required keys, then:
```bash
pnpm seed
```

Expected: Script fetches from Reddit, HN, GitHub, extracts ideas via Claude Haiku, generates embeddings, deduplicates, and inserts. Output shows ~30-80 new ideas.

- [ ] **Step 5: Verify data in Supabase**

Use Supabase MCP `execute_sql`:
```sql
SELECT count(*), status FROM ideas GROUP BY status;
SELECT category, count(*) FROM ideas WHERE status = 'active' GROUP BY category ORDER BY count DESC;
```

Expected: Ideas distributed across categories, most with status `active`.

- [ ] **Step 6: Verify the app shows data**

Run: `pnpm dev`
Navigate to `http://localhost:3000`
Expected: Homepage shows trending ideas in the grid. Navigate to `/ideas` — directory shows seeded ideas with search and filters working.

- [ ] **Step 7: Commit**

```bash
git add scripts/ package.json
git commit -m "feat: add seed script — Reddit, HN, GitHub sources with LLM extraction"
```

---

## Task 10: Deploy to Vercel

**Files:**
- None new — deployment config

- [ ] **Step 1: Initialize git repo on GitHub**

```bash
cd /Users/131221-mbp/ashcroft-workspace/personal-projects/easy-saas
gh repo create easy-saas --public --source=. --push
```

- [ ] **Step 2: Deploy to Vercel**

Use the Vercel MCP `deploy_to_vercel` tool, or:
```bash
pnpm dlx vercel --prod
```

Set environment variables in Vercel dashboard:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

- [ ] **Step 3: Verify production deployment**

Navigate to the deployed URL.
Expected: Homepage loads with trending ideas, `/ideas` directory works with search and filters, `/ideas/[slug]` detail pages render correctly.

- [ ] **Step 4: Commit any deployment config changes**

```bash
git add -A
git commit -m "chore: add Vercel deployment configuration"
```

---

## Summary

| Task | Description | Est. Time |
|------|-------------|-----------|
| 1 | Project scaffold (Next.js + Tailwind + shadcn) | 5 min |
| 2 | Types, categories, utils | 5 min |
| 3 | Supabase setup + migration | 10 min |
| 4 | Query layer | 5 min |
| 5 | Shared UI components | 10 min |
| 6 | Homepage | 10 min |
| 7 | Idea directory page | 15 min |
| 8 | Idea detail page | 5 min |
| 9 | Seed script | 15 min |
| 10 | Deploy to Vercel | 5 min |
| **Total** | | **~85 min** |
