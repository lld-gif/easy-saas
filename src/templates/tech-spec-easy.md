# Tech Spec: {{IDEA_TITLE}}

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
- `GET /api/items` — fetch all items (add `?search=` for filtering)
- `POST /api/items` — create a new item (validate inputs server-side)
- `PATCH /api/items/:id` — update an item
- `DELETE /api/items/:id` — remove an item

**Tip:** With Supabase, you can skip building API routes entirely — use the Supabase client directly from your frontend. RLS (Row Level Security) protects your data.

## How to Build This

### Day 1: Setup + Core
1. Run `npx create-next-app@latest my-app --typescript --tailwind`
2. Create a free Supabase project at [supabase.com](https://supabase.com)
3. Install Supabase: `npm install @supabase/supabase-js`
4. Copy your Supabase URL and anon key to `.env.local`
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
3. Ship it, share it, iterate based on real feedback
