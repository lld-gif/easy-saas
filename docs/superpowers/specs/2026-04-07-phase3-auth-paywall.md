# Phase 3: Auth + Paywall + Quick-Start Packages

**Date:** 2026-04-07
**Status:** Approved

---

## Overview

Add authentication (Google OAuth), a $5/month Pro subscription (Stripe), and quick-start packages that combine pre-written markdown templates with light LLM personalization. Pro users get unlimited access to packages with a 5/day generation rate limit.

---

## Quick-Start Package System

### What Pro users get per idea

Each idea's quick-start package has 3 sections rendered as a single page:

1. **Tech Spec** — Recommended stack, database schema sketch, key API routes, deployment approach
2. **Brand Kit** — 3 name suggestions, tagline, color palette, font pairing, domain ideas
3. **Launch Checklist** — MVP feature list, pricing suggestion, distribution channels, first-week plan

### Template architecture

```
src/templates/
├── tech-spec-easy.md       # Difficulty 1-2: simple stack (HTML/Tailwind or Next.js)
├── tech-spec-medium.md     # Difficulty 3: standard fullstack (Next.js + Supabase)
├── tech-spec-hard.md       # Difficulty 4-5: complex (microservices, queues, etc.)
├── brand-kit.md            # Universal — works for all categories/difficulties
├── launch-easy.md          # Simple launch: ProductHunt, Reddit, X
├── launch-medium.md        # Standard launch + content marketing
└── launch-hard.md          # Enterprise launch + partnerships
```

7 template files. Each contains `{{PLACEHOLDER}}` markers for LLM-filled content.

### LLM fill prompt

When a Pro user generates a package, one Claude Haiku call fills all blanks:

**Input (~200 tokens):**
```
For the idea "{{title}}" (category: {{category}}, difficulty: {{difficulty}}):

1. Suggest 3 product names
2. Write a tagline (under 10 words)
3. List 5 MVP features (one line each)
4. Sketch a data model (3-4 tables with key columns)
5. Suggest 2 pricing tiers with prices
6. Suggest 3 color hex codes that fit the category
7. Suggest 2 distribution channels specific to this idea
```

**Output (~500 tokens):** Structured JSON with all fill values.

**Cost:** ~$0.008 per generation (Haiku input + output).

### Caching

Generated packages are stored in `idea_details.package_json` (jsonb). Once generated, never regenerated. Served from cache on subsequent views.

### Rate limiting

- Pro users: max 5 package generations per day
- Tracked via `generation_log` table: `(user_id, idea_id, generated_at)`
- Check: `SELECT count(*) FROM generation_log WHERE user_id = $1 AND generated_at > now() - interval '1 day'`
- If >= 5: show friendly message "You've explored 5 ideas today. Come back tomorrow for more!"

---

## Database Changes

> **Note:** This spec supersedes the original `idea_details` schema from the design spec. The original `full_spec_md`, `branding_suggestions`, and `financial_model` columns are replaced by a unified `package_json` column. The separate `/ideas/[slug]/spec` route is replaced by an inline package section on the detail page.

> **Note:** The `difficulty` column on `ideas` already exists (migration 005). Templates are routed based on this value.

### `users` table

```sql
CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  subscription_status text DEFAULT 'free' CHECK (subscription_status IN ('free', 'pro')),
  stripe_customer_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_read_own" ON users FOR SELECT USING (auth.uid() = id);

-- Reuse existing trigger function
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

Auto-create user row on signup via Supabase auth trigger:

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### `idea_details` table

```sql
CREATE TABLE idea_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id uuid UNIQUE NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  package_json jsonb,
  generated_by uuid REFERENCES users(id),
  generated_at timestamptz DEFAULT now()
);

ALTER TABLE idea_details ENABLE ROW LEVEL SECURITY;
CREATE POLICY "idea_details_pro_read" ON idea_details
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND subscription_status = 'pro')
  );
-- INSERT via service role in the generate API route (bypasses RLS)
-- No INSERT policy needed — the API route uses SUPABASE_SERVICE_ROLE_KEY
```

### `generation_log` table

```sql
CREATE TABLE generation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  idea_id uuid NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  generated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_generation_log_user_date ON generation_log (user_id, generated_at DESC);

ALTER TABLE generation_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gen_log_own" ON generation_log FOR SELECT USING (auth.uid() = user_id);
-- INSERT via service role in the generate API route (bypasses RLS)
```

---

## Authentication

### Provider

Google OAuth via Supabase Auth. No email/password.

### Flow

1. User clicks "Sign in with Google" in navbar
2. Supabase redirects to Google consent screen
3. On return, Supabase creates `auth.users` row → trigger creates `public.users` row
4. Session cookie set automatically by `@supabase/ssr`

### Pages

- No dedicated login page — use a modal or redirect from the navbar button
- `/auth/callback` route to handle OAuth redirect

### Navbar changes

- **Not signed in:** "Sign in" button
- **Signed in (free):** User avatar/email + "Upgrade" button (orange)
- **Signed in (pro):** User avatar/email + "Pro" badge

---

## Stripe Integration

### Setup

- Stripe product: "EasySaaS Pro" at $5/month
- Create product + price in Stripe Dashboard manually
- Store `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` in env

### Checkout flow

1. User clicks "Upgrade to Pro" (on pricing page or idea detail)
2. API route `/api/stripe/checkout` creates a Checkout Session with the user's email + Supabase user ID in metadata
3. Redirect to Stripe Checkout
4. On success: Stripe fires `checkout.session.completed` webhook
5. Webhook handler updates `users.subscription_status = 'pro'` and stores `stripe_customer_id`

### Webhook handler (`/api/webhooks/stripe`)

**MUST** verify webhook signature: `stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET)`. Reject with 400 if verification fails.

Handles:
- `checkout.session.completed` → set user to Pro
- `customer.subscription.deleted` → set user back to Free
- `invoice.payment_failed` → optional: warn user

### Customer portal

- Link from account menu: "Manage subscription"
- Creates a Stripe Customer Portal session → redirects to Stripe-hosted page

---

## Paywall UX

### On `/ideas/[slug]` detail page

Below the existing idea summary, add a "Quick Start Package" section:

| User state | What they see |
|-----------|---------------|
| Not signed in | Blurred preview + "Sign in to unlock" button |
| Free user | Blurred preview + "Upgrade to Pro — $5/mo" button |
| Pro user (package exists) | Full rendered package |
| Pro user (no package yet, under limit) | "Generate Quick Start Package" button |
| Pro user (no package yet, at daily limit) | "You've explored 5 ideas today. Come back tomorrow!" |

### Blurred preview

Show a real-looking but unreadable preview — render the template with placeholder text, apply `blur-sm` CSS. This teases the value without revealing content.

---

## Pricing Page (`/pricing`)

Simple two-column comparison:

| | Free | Pro ($5/mo) |
|---|---|---|
| Browse all ideas | ✅ | ✅ |
| Search & filter | ✅ | ✅ |
| Difficulty ratings | ✅ | ✅ |
| Quick Start Package | ❌ | ✅ |
| Tech Spec | ❌ | ✅ |
| Brand Kit | ❌ | ✅ |
| Launch Checklist | ❌ | ✅ |

CTA: "Get Pro — $5/month" → Stripe Checkout

---

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/auth/callback` | GET | OAuth redirect handler (Supabase SSR convention) |
| `/api/stripe/checkout` | POST | Create Stripe Checkout session |
| `/api/webhooks/stripe` | POST | Handle Stripe events |
| `/api/stripe/portal` | POST | Create customer portal session |
| `/api/packages/generate` | POST | Generate quick-start package for an idea |

### `/api/packages/generate`

```
POST { idea_id: string }
Auth: required (Pro only)

1. Check user is Pro
2. Check rate limit (< 5 today)
3. Check if package already exists in idea_details
4. If exists → return cached
5. If not → load templates, call Claude Haiku, merge, store in idea_details
6. Log to generation_log (only if generation succeeded)
7. Return package_json

Error handling:
- Claude Haiku call fails → retry once after 2s. If second attempt fails → return 500 with "Generation temporarily unavailable, try again later". Do NOT log to generation_log on failure.
- Malformed LLM output → return 500, do not cache bad data.
- Uses SUPABASE_SERVICE_ROLE_KEY for all writes (bypasses RLS).
```

---

## Environment Variables

```bash
# Auth — configure Google OAuth provider in Supabase Dashboard
# No new env vars for auth

# LLM — already configured from Phase 2, used by package generation
ANTHROPIC_API_KEY=sk-ant-...

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...          # The $5/mo price ID from Stripe
```

---

## Project Structure (new files)

```
src/
├── app/
│   ├── auth/callback/route.ts          # OAuth callback (Supabase SSR convention)
│   ├── api/
│   │   ├── stripe/
│   │   │   ├── checkout/route.ts       # Create checkout session
│   │   │   └── portal/route.ts         # Customer portal
│   │   ├── webhooks/stripe/route.ts    # Stripe webhook handler
│   │   └── packages/generate/route.ts  # Package generation
│   └── pricing/page.tsx                # Pricing comparison page
├── components/
│   ├── AuthButton.tsx                  # Sign in / user menu
│   ├── UpgradeButton.tsx              # "Upgrade to Pro" CTA
│   ├── PackageSection.tsx             # Quick-start package display/gating
│   └── BlurredPreview.tsx             # Teaser for non-Pro users
├── lib/
│   ├── stripe.ts                      # Stripe client init
│   ├── auth.ts                        # getUser helper, requireAuth, requirePro
│   └── packages.ts                    # Template loading, LLM fill, merge logic
├── templates/                         # 7 markdown template files
│   ├── tech-spec-easy.md
│   ├── tech-spec-medium.md
│   ├── tech-spec-hard.md
│   ├── brand-kit.md
│   ├── launch-easy.md
│   ├── launch-medium.md
│   └── launch-hard.md
supabase/
└── migrations/
    └── 006_auth_paywall.sql           # users, idea_details, generation_log tables
```
