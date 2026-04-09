// Templates as string constants — imported at build time so they work on Vercel serverless.
// fs.readFileSync does NOT work on Vercel because template files aren't in the deployment bundle.

export const TECH_SPEC_EASY = `# Tech Spec: {{IDEA_TITLE}}

## Who Is This For?
{{TARGET_AUDIENCE}}

## Recommended Stack
- **Frontend:** HTML + Tailwind CSS (or a single Next.js app)
- **Database:** Supabase (free tier — includes auth, database, and hosting)
- **Deployment:** Vercel (free tier, auto-deploys from GitHub)
- **AI Assist:** Use Claude or Cursor to help write the code

**Why this stack:** Zero cost to start, no backend to manage, deploys in minutes. Perfect for validating an idea before investing more.

## Data Model
{{DATA_MODEL}}

## Core Features (MVP)
{{MVP_FEATURES}}

## Simple API Structure
You only need a few endpoints:
- \`GET /api/items\` — fetch all items (add \`?search=\` for filtering)
- \`POST /api/items\` — create a new item (validate inputs server-side)
- \`PATCH /api/items/:id\` — update an item
- \`DELETE /api/items/:id\` — remove an item

**Tip:** With Supabase, you can skip building API routes entirely — use the Supabase client directly from your frontend. RLS (Row Level Security) protects your data.

## How to Build This

### Day 1: Setup + Core
1. Run \`npx create-next-app@latest my-app --typescript --tailwind\`
2. Create a free Supabase project at [supabase.com](https://supabase.com)
3. Install Supabase: \`npm install @supabase/supabase-js\`
4. Copy your Supabase URL and anon key to \`.env.local\`
5. Create your database tables using the data model above (use Supabase's Table Editor or SQL Editor)
6. Build the main UI page — start with a single page that lists and creates items

### Day 2: Polish + Ship
1. Add basic styling — Tailwind makes this fast
2. Add a simple search/filter if your idea needs it
3. Test on mobile (resize your browser)
4. Deploy to Vercel: connect your GitHub repo at [vercel.com](https://vercel.com)
5. Share your URL and start collecting feedback

## What NOT to Build Yet
- User accounts (use Supabase Auth later if needed)
- Payment processing (validate demand first)
- Email notifications (manual follow-up is fine at this stage)
- A mobile app (responsive web works)

## Competitive Edge
{{COMPETITIVE_EDGE}}

## Estimated Build Time
**1-2 days** with AI coding assistance (Claude, Cursor, or Copilot)

## Ready to Go?
1. Open [cursor.com](https://cursor.com) or your preferred editor
2. Paste this spec into a chat and say "Build this for me step by step"
3. Ship it, share it, iterate based on real feedback`

export const TECH_SPEC_MEDIUM = `# Tech Spec: {{IDEA_TITLE}}

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
- \`GET /api/[resource]\` — list with cursor pagination and filtering
- \`POST /api/[resource]\` — create with Zod validation
- \`PATCH /api/[resource]/:id\` — update (check ownership via RLS)
- \`DELETE /api/[resource]/:id\` — soft delete (set \`deleted_at\`)
- \`GET /api/[resource]/search\` — full-text search via Supabase

## Architecture Decisions
- **Server components for data fetching** — better SEO, no loading spinners for initial content
- **Client components only for interactivity** — forms, modals, real-time updates
- **Row Level Security on every table** — users can only access their own data, enforced at the database level
- **Cursor pagination, not offset** — consistent performance as your dataset grows
- **Soft deletes** — add \`deleted_at timestamptz\` column instead of actually deleting rows

## How to Build This

### Week 1: Foundation
1. Scaffold: \`npx create-next-app@latest --typescript --tailwind --app\`
2. Add shadcn/ui: \`npx shadcn@latest init\` then add components as needed
3. Set up Supabase: create project, run SQL to create tables with RLS policies
4. Implement auth: Supabase Google OAuth with middleware to protect routes
5. Build the core CRUD interface — list view, create form, detail page

### Week 2: Polish + Launch
1. Add search and filtering (Supabase full-text search or \`ilike\`)
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
Don't build the payment system until at least 10 people tell you they'd pay. Validate demand with the free tier first, then add Stripe when you have real users asking for more.`

export const TECH_SPEC_HARD = `# Tech Spec: {{IDEA_TITLE}}

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
- **Multi-tenant from day one** — every table has \`user_id\` or \`org_id\` with RLS policies
- **Edge Functions for async work** — scraping, AI processing, email sending run outside the request cycle
- **pg_cron for scheduled jobs** — daily reports, data syncs, cleanup tasks
- **Database triggers for cascading updates** — keep denormalized counts and aggregates in sync
- **Rate limiting on all public endpoints** — protect against abuse (use Upstash Redis or in-memory)
- **Structured logging** — JSON logs from day one, makes debugging production issues possible
- **Soft deletes everywhere** — \`deleted_at\` column, never hard delete user data

## API Architecture
\`\`\`
/api/
  /auth/callback          — OAuth handler
  /webhooks/stripe        — Stripe webhook (verify signature)
  /v1/
    /[resource]           — CRUD with pagination, filtering, sorting
    /[resource]/search    — Full-text or vector search
    /[resource]/export    — CSV/JSON export (Pro feature)
    /admin/               — Admin-only endpoints (check role)
\`\`\`

## How to Build This

### Weeks 1-2: Core Infrastructure
1. Database schema + migrations + RLS policies for every table
2. Auth with RBAC: \`admin\`, \`pro\`, \`free\` roles stored in user metadata
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
Ship a limited beta to 10 users after Week 2. Their feedback will redirect 30% of what you planned for Weeks 3-6. Building in isolation for 8 weeks is the biggest risk — not the technology.`

export const BRAND_KIT = `# Brand Kit: {{IDEA_TITLE}}

## Product Names
{{PRODUCT_NAMES}}

{{NAME_RATIONALE}}

## Tagline
> {{TAGLINE}}

Use this on your homepage hero, social media bios, and Product Hunt listing.

## Color Palette
{{COLORS}}

**Quick setup:** Paste your primary color into [coolors.co](https://coolors.co) to generate complementary shades for hover states, borders, and backgrounds.

**Dark mode tip:** For dark mode, reduce opacity to 80% on backgrounds and use the accent color at full brightness for CTAs.

## Typography
**{{FONT_PAIR}}**

{{FONT_RATIONALE}}

Get both from [Google Fonts](https://fonts.google.com) — free to use.

- **Heading font** → logo wordmark, hero text, section headers, pricing cards
- **Body font** → paragraphs, buttons, navigation, form labels, tooltips
- **Sizes:** Hero 48-64px, H2 28-32px, H3 20-24px, Body 16px, Small 14px

## Domain Ideas
{{DOMAINS}}

Check availability at [Namecheap](https://www.namecheap.com) or [Porkbun](https://porkbun.com). Expect to pay $8-15/yr for .com, $3-8/yr for .io or .co.

**Pro tip:** If your first choice .com is taken, try .io (dev-friendly), .co (startup-friendly), or .app (tech-friendly) instead.

## Logo Strategy
Don't spend money on a logo yet. Ship with one of these (you can always upgrade later):

1. **Text logo** — Your product name in the heading font, bold, with your primary color. This is what Stripe, Linear, and Notion started with.
2. **Icon + wordmark** — Pick a simple icon from [Lucide](https://lucide.dev) or [Heroicons](https://heroicons.com) and pair it with your product name.
3. **Favicon** — Use your primary color as a rounded square with the first letter or a simple symbol in white. Save as SVG for crisp rendering at any size.

## Social Media Setup
Set up these profiles before launch (even if you don't post yet):
- **X/Twitter:** Product name as handle. Bio = your tagline. Link = your URL.
- **GitHub:** If open source or developer-focused. README with screenshots.
- **Product Hunt:** Create your upcoming page to start collecting followers.

## Brand Voice
**Tone:** Simple, friendly, and direct. Write like you're explaining to a smart friend over coffee.

| Do | Don't |
|----|-------|
| "Track your expenses in 30 seconds" | "Revolutionize your financial workflow" |
| "Built for freelancers" | "Enterprise-grade solution for all businesses" |
| "Simple pricing, no surprises" | "Flexible, scalable pricing architecture" |`

export const LAUNCH_EASY = `# Launch Checklist: {{IDEA_TITLE}}

## Target Audience
{{TARGET_AUDIENCE}}

## MVP Features
Build these first — nothing else until you've shipped:
{{MVP_FEATURES}}

## Pricing
{{PRICING_TIERS}}

**Strategy:** Start free to get your first 50 users. Add a paid tier once you know what features people actually want to pay for. Don't guess — let usage data tell you.

## Launch Week Plan

### Before Launch (1-2 days)
- [ ] Working app deployed to a public URL
- [ ] One-page landing page explaining what it does and who it's for
- [ ] Screenshot or 30-second demo GIF (use [screen.studio](https://screen.studio) or Loom)
- [ ] Create accounts on Product Hunt, Reddit, X/Twitter
- [ ] Write a 2-sentence pitch you can paste anywhere

### Launch Day
- [ ] Post on Product Hunt (schedule for 12:01 AM PT for max visibility)
- [ ] Post on Reddit: r/SideProject, r/Entrepreneur, r/SaaS, plus 1-2 niche subreddits
- [ ] Tweet/post on X with a demo GIF and your pitch
- [ ] Ask 5 friends to try it and give honest feedback
- [ ] Reply to every single comment within 2 hours

### First Week
- [ ] Respond to every piece of feedback (even negative)
- [ ] Fix the top 3 bugs or UX issues people report
- [ ] Post a "lessons learned" thread on X (builds in public)
- [ ] Reach out to 3 online communities where your users hang out
- [ ] Set up a simple feedback form (Tally.so is free)

## Distribution Channels
{{DISTRIBUTION}}

## One Metric That Matters
Pick ONE number to track this week: **signups** (are people finding you?) or **daily active users** (are they coming back?). Don't track everything — pick the one that tells you if this is working.

## What Success Looks Like
- **Week 1:** 20+ signups, 5+ people give feedback
- **Month 1:** 100+ signups, 3+ people ask for features
- **Signal to invest more:** People complain when it's down, or ask to pay for it`

export const LAUNCH_MEDIUM = `# Launch Checklist: {{IDEA_TITLE}}

## Target Audience
{{TARGET_AUDIENCE}}

## MVP Features
{{MVP_FEATURES}}

## Pricing Strategy
{{PRICING_TIERS}}

**Strategy:** Offer a 14-day free trial of the paid tier. No credit card required — reduce friction. Convert free users to paid when they hit a usage limit or need a Pro feature.

## Pre-Launch (1-2 weeks before)
- [ ] Landing page with email capture (use [Waitlist](https://getwaitlist.com) or a simple Supabase-backed form)
- [ ] "Coming soon" posts on X, LinkedIn, and 2-3 relevant subreddits
- [ ] Build in public: share 3+ progress screenshots with commentary
- [ ] Line up 10 beta testers from your network or online communities
- [ ] Write your Product Hunt tagline and description (draft now, polish later)

## Launch Day
- [ ] Product Hunt launch (submit night before, goes live 12:01 AM PT)
- [ ] Hacker News "Show HN" post — focus on the technical story, not marketing
- [ ] Reddit posts in 3-5 relevant subreddits (tailor each post to the community)
- [ ] X/Twitter thread: hook, problem, solution, demo, link (5-7 tweets)
- [ ] LinkedIn post: professional angle, focus on the problem being solved
- [ ] Email your waitlist with a personal note from you

## Post-Launch (Weeks 1-4)
- [ ] Respond to all feedback within 24 hours
- [ ] Ship one visible improvement per week based on user feedback
- [ ] Write one blog post or tutorial about how you built it (great for SEO + credibility)
- [ ] Pitch one niche newsletter for a feature or mention
- [ ] Set up analytics: Plausible ($9/mo) or Vercel Analytics (free)
- [ ] Add a changelog page — users love seeing momentum

## Distribution Channels
{{DISTRIBUTION}}

## Growth Metrics
Track these weekly in a simple spreadsheet:

| Metric | What It Tells You | Week 1 Target | Month 1 Target |
|--------|-------------------|---------------|----------------|
| **Signups** | Are people finding you? | 50 | 200 |
| **Activation** | Are signups actually using it? | 40% | 50% |
| **Retention (Day 7)** | Are they coming back? | 20% | 30% |
| **NPS or feedback** | Would they recommend it? | 5 responses | 20 responses |

## What Success Looks Like
- **Week 1:** 50+ signups, 20+ activated users, 10+ feedback messages
- **Month 1:** 200+ signups, first paying customer, clear top-3 feature requests
- **Signal to double down:** Users invite their teammates, or churn drops below 10%`

export const LAUNCH_HARD = `# Launch Checklist: {{IDEA_TITLE}}

## Target Audience
{{TARGET_AUDIENCE}}

## MVP Features
{{MVP_FEATURES}}

## Pricing Strategy
{{PRICING_TIERS}}

**Strategy:** Offer annual discounts (20% off) to improve cash flow and reduce churn. Consider a "Founder's Deal" at 50% off lifetime for the first 50 customers — creates urgency and builds a loyal early user base.

## Pre-Launch (4-6 weeks before)
- [ ] Landing page with waitlist + early access signup (capture email + use case)
- [ ] Build in public: weekly updates on X, LinkedIn, and Indie Hackers
- [ ] Create documentation site (Mintlify for polished docs, or Next.js MDX)
- [ ] Record a 2-minute demo video showing the core workflow
- [ ] Collect 50+ email subscribers before launch
- [ ] Recruit 5-10 beta customers — offer free Pro for 6 months in exchange for weekly feedback calls
- [ ] Set up Stripe in test mode and run through the full checkout flow
- [ ] Write your launch announcement post (long-form, with story arc)

## Launch Campaign
- [ ] Product Hunt launch with a hunter (find active hunters on PH community)
- [ ] Hacker News "Show HN" — focus on technical decisions and what you learned
- [ ] Reddit posts across 5+ subreddits (customize each for the community norms)
- [ ] X/Twitter launch thread: 10+ tweets telling the story from problem to solution
- [ ] LinkedIn article: frame as a problem you've solved with data and results
- [ ] Email blast to waitlist with a personal note + exclusive launch offer
- [ ] Pitch 5+ niche newsletters for features or sponsorships
- [ ] Submit to directories: BetaList, SaaSHub, AlternativeTo, Uneed, MicroLaunch
- [ ] Post a launch retrospective within 48 hours (metrics, learnings, what's next)

## Post-Launch (Months 1-3)
- [ ] Ship weekly feature releases based on user feedback
- [ ] Content marketing: 1 blog post per week (SEO-targeted)
- [ ] SEO foundations: dynamic sitemap, meta tags, OG images, JSON-LD
- [ ] Build 1-2 integrations with tools your users already use
- [ ] Implement referral program: "Give $10, get $10" or similar
- [ ] Set up customer success: onboarding emails (3-part drip via Resend or Loops)
- [ ] Run one user interview per week for the first month
- [ ] A/B test your pricing page after 100+ visitors

## Distribution Channels
{{DISTRIBUTION}}

## Key Metrics Dashboard
Track weekly. Celebrate the trends, not the absolutes.

| Metric | Month 1 Target | Month 3 Target | Month 6 Target |
|--------|---------------|----------------|----------------|
| **MRR** | $500 | $2,000 | $5,000 |
| **Active Users** | 100 | 500 | 1,500 |
| **Churn Rate** | <10% | <7% | <5% |
| **NPS Score** | 30+ | 40+ | 50+ |
| **CAC** | Measure | Optimize | <3x payback |

## What Success Looks Like
- **Month 1:** $500 MRR, 100 active users, clear product-market fit signal (users complain when it's down)
- **Month 3:** $2K MRR, consistent week-over-week growth, 3+ organic referrals
- **Month 6:** $5K MRR, predictable acquisition channels, low churn
- **Signal to raise/scale:** Revenue growing 15%+ month-over-month with <5% churn`

// Template lookup map
const TEMPLATES: Record<string, string> = {
  "tech-spec-easy": TECH_SPEC_EASY,
  "tech-spec-medium": TECH_SPEC_MEDIUM,
  "tech-spec-hard": TECH_SPEC_HARD,
  "brand-kit": BRAND_KIT,
  "launch-easy": LAUNCH_EASY,
  "launch-medium": LAUNCH_MEDIUM,
  "launch-hard": LAUNCH_HARD,
}

export function loadTemplate(name: string): string {
  const template = TEMPLATES[name]
  if (!template) throw new Error(`Template not found: ${name}`)
  return template
}
