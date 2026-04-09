# Tech Spec: {{IDEA_TITLE}}

## Who Is This For?
{{TARGET_AUDIENCE}}

## Recommended Stack
- **Frontend:** Next.js 14+ (App Router) + Tailwind CSS + shadcn/ui
- **Backend:** Next.js API routes + Supabase
- **Database:** Supabase Postgres (with Row Level Security)
- **Auth:** Supabase Auth (Google OAuth or magic link)
- **Deployment:** Vercel
- **Payments:** Stripe (when ready to monetize)

**Why this stack:** Production-ready from day one. Server components for SEO, Supabase handles auth/database/storage, Vercel auto-deploys. All have generous free tiers.

## Data Model
{{DATA_MODEL}}

## Core Features (MVP)
{{MVP_FEATURES}}

## API Routes
- `GET /api/[resource]` — list with cursor pagination and filtering
- `POST /api/[resource]` — create with Zod validation
- `PATCH /api/[resource]/:id` — update (check ownership via RLS)
- `DELETE /api/[resource]/:id` — soft delete (set `deleted_at`)
- `GET /api/[resource]/search` — full-text search via Supabase

## Architecture Decisions
- **Server components for data fetching** — better SEO, no loading spinners for initial content
- **Client components only for interactivity** — forms, modals, real-time updates
- **Row Level Security on every table** — users can only access their own data, enforced at the database level
- **Cursor pagination, not offset** — consistent performance as your dataset grows
- **Soft deletes** — add `deleted_at timestamptz` column instead of actually deleting rows

## How to Build This

### Week 1: Foundation
1. Scaffold: `npx create-next-app@latest --typescript --tailwind --app`
2. Add shadcn/ui: `npx shadcn@latest init` then add components as needed
3. Set up Supabase: create project, run SQL to create tables with RLS policies
4. Implement auth: Supabase Google OAuth with middleware to protect routes
5. Build the core CRUD interface — list view, create form, detail page

### Week 2: Polish + Launch
1. Add search and filtering (Supabase full-text search or `ilike`)
2. Mobile responsive pass — test all pages on 375px width
3. Add loading states and error boundaries
4. Set up Vercel deployment with environment variables
5. Add basic SEO: meta tags, sitemap, OG images
6. Launch: Product Hunt, relevant subreddits, Hacker News Show HN

### Week 3+ (Post-Launch)
1. Stripe integration for Pro tier (if demand is validated)
2. Email notifications via Resend ($0 for first 3K emails/month)
3. Analytics: Vercel Analytics or Plausible
4. Iterate based on user feedback — ship one improvement per week

## Competitive Edge
{{COMPETITIVE_EDGE}}

## Estimated Build Time
**1-2 weeks** with AI coding assistance

## Key Tip
Don't build the payment system until at least 10 people tell you they'd pay. Validate demand with the free tier first, then add Stripe when you have real users asking for more.
