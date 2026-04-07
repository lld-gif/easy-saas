# Tech Spec: {{IDEA_TITLE}}

## Recommended Stack
- **Frontend:** Next.js (App Router) + Tailwind CSS + shadcn/ui
- **Backend:** Next.js API routes + Supabase
- **Database:** Supabase Postgres (with Row Level Security)
- **Auth:** Supabase Auth (Google OAuth or magic link)
- **Deployment:** Vercel
- **Payments:** Stripe (if monetizing)

## Data Model
{{DATA_MODEL}}

## Core Features (MVP)
{{MVP_FEATURES}}

## API Routes
- `GET /api/[resource]` — list with pagination
- `POST /api/[resource]` — create with validation
- `PATCH /api/[resource]/:id` — update
- `DELETE /api/[resource]/:id` — delete
- `POST /api/auth/callback` — OAuth handler

## Architecture Notes
- Use server components for data fetching (SEO + performance)
- Use client components only for interactive forms and buttons
- Store user preferences in Supabase, not localStorage
- Add Row Level Security so users only see their own data

## How to Build This

### Week 1: Foundation
1. Scaffold with `create-next-app`, add Supabase + shadcn/ui
2. Set up database tables and RLS policies
3. Implement auth (Google OAuth via Supabase)
4. Build the main CRUD interface

### Week 2: Polish & Launch
1. Add search/filtering
2. Mobile responsive pass
3. Deploy to Vercel with environment variables
4. Submit to Product Hunt and share on social media

## Estimated Build Time
**1-2 weeks** with AI coding assistance
