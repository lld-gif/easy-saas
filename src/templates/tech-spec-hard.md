# Tech Spec: {{IDEA_TITLE}}

## Who Is This For?
{{TARGET_AUDIENCE}}

## Recommended Stack
- **Frontend:** Next.js 14+ (App Router) + Tailwind CSS + shadcn/ui
- **Backend:** Next.js API routes + Supabase Edge Functions
- **Database:** Supabase Postgres + pgvector (if AI features needed)
- **Auth:** Supabase Auth with role-based access control (RBAC)
- **Payments:** Stripe (subscriptions + usage-based billing)
- **Background Jobs:** Supabase Edge Functions + pg_cron
- **File Storage:** Supabase Storage (S3-compatible)
- **Deployment:** Vercel (frontend) + Supabase (backend)
- **Monitoring:** Vercel Analytics + Sentry for error tracking

**Why this stack:** Scales to thousands of users without re-architecting. Edge Functions handle async work, pg_cron runs scheduled jobs, RLS + RBAC handle multi-tenant security. All managed services — no servers to maintain.

## Data Model
{{DATA_MODEL}}

## Core Features (MVP)
{{MVP_FEATURES}}

## Architecture Decisions
- **Multi-tenant from day one** — every table has `user_id` or `org_id` with RLS policies
- **Edge Functions for async work** — scraping, AI processing, email sending run outside the request cycle
- **pg_cron for scheduled jobs** — daily reports, data syncs, cleanup tasks
- **Database triggers for cascading updates** — keep denormalized counts and aggregates in sync
- **Rate limiting on all public endpoints** — protect against abuse (use Upstash Redis or in-memory)
- **Structured logging** — JSON logs from day one, makes debugging production issues possible
- **Soft deletes everywhere** — `deleted_at` column, never hard delete user data

## API Architecture
```
/api/
  /auth/callback          — OAuth handler
  /webhooks/stripe        — Stripe webhook (verify signature)
  /v1/
    /[resource]           — CRUD with pagination, filtering, sorting
    /[resource]/search    — Full-text or vector search
    /[resource]/export    — CSV/JSON export (Pro feature)
    /admin/               — Admin-only endpoints (check role)
```

## How to Build This

### Weeks 1-2: Core Infrastructure
1. Database schema + migrations + RLS policies for every table
2. Auth with RBAC: `admin`, `pro`, `free` roles stored in user metadata
3. Core CRUD operations with Zod validation on all inputs
4. Edge Function infrastructure: at least one async pipeline working end-to-end
5. Background job setup: pg_cron for at least one scheduled task

### Weeks 3-4: Features + Payments
1. Stripe subscription integration (checkout, webhooks, customer portal)
2. Pro tier feature gating in both UI and API
3. Dashboard with key metrics and charts (recharts or tremor)
4. Email transactional notifications (Resend — free for first 3K/month)

### Weeks 5-6: Polish + Beta
1. Error handling: Sentry integration, error boundaries, user-friendly error pages
2. Performance: optimize slow queries, add database indexes based on EXPLAIN ANALYZE
3. SEO: dynamic sitemap, OG images, JSON-LD structured data
4. Load testing with realistic data volume (10K+ rows)
5. Security audit: check all RLS policies, validate webhook signatures, review env vars
6. Beta launch with 10-20 early users, iterate on feedback

### Month 2+: Growth
1. Content marketing: blog, SEO-optimized landing pages for use cases
2. Integrations with tools your users already use (Zapier, Slack, etc.)
3. Referral or invite system
4. Admin dashboard for internal operations
5. Consider API access as a Pro/Enterprise feature

## Competitive Edge
{{COMPETITIVE_EDGE}}

## Estimated Build Time
**4-8 weeks** for a production-ready MVP

## Key Tip
Ship a limited beta to 10 users after Week 2. Their feedback will redirect 30% of what you planned for Weeks 3-6. Building in isolation for 8 weeks is the biggest risk — not the technology.
