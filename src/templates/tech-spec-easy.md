# Tech Spec: {{IDEA_TITLE}}

## Recommended Stack
- **Frontend:** HTML + Tailwind CSS (or a single Next.js app)
- **Database:** Supabase (free tier — includes auth, database, and hosting)
- **Deployment:** Vercel (free tier, auto-deploys from GitHub)
- **AI Assist:** Use Claude or Cursor to help write the code

## Data Model
{{DATA_MODEL}}

## Core Features (MVP)
{{MVP_FEATURES}}

## Simple API Structure
You only need a few endpoints:
- `GET /api/items` — fetch all items
- `POST /api/items` — create a new item
- `DELETE /api/items/:id` — remove an item

## How to Build This

### Day 1: Setup
1. Run `npx create-next-app@latest my-app --typescript --tailwind`
2. Create a free Supabase project at [supabase.com](https://supabase.com)
3. Install Supabase: `npm install @supabase/supabase-js`
4. Copy your Supabase URL and anon key to `.env.local`

### Day 2: Build & Ship
1. Create your database tables using the data model above
2. Build the main UI page — keep it simple, one page is fine
3. Connect the UI to Supabase for reading/writing data
4. Deploy to Vercel: `npx vercel`
5. Share it on Product Hunt, Reddit, or X

## Estimated Build Time
**1-2 days** with AI coding assistance
