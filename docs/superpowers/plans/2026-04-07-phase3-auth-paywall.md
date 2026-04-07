# Phase 3: Auth + Paywall + Quick-Start Packages — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Google OAuth, $5/mo Stripe Pro subscription, and quick-start packages (template + light LLM fill) with paywall gating and 5/day rate limit.

**Architecture:** Supabase Auth handles Google OAuth with automatic user row creation via DB trigger. Stripe Checkout handles payment, with webhook updating subscription status. Quick-start packages use pre-written markdown templates merged with a ~500-token Claude Haiku fill, cached in `idea_details` table.

**Tech Stack:** Supabase Auth, Stripe (checkout + webhooks + portal), Claude Haiku, Next.js API routes, markdown templates

**Spec:** `docs/superpowers/specs/2026-04-07-phase3-auth-paywall.md`
**Supabase Project ID:** `uailhfoyxaorntqwtebq`

---

## Task 1: Database Migration + Google OAuth Setup

**Files:**
- Create: `supabase/migrations/006_auth_paywall.sql`
- Modify: `.env.local.example`

- [ ] **Step 1: Apply the migration via Supabase MCP**

Use `apply_migration` with name `auth_paywall` and the full SQL from the spec:

```sql
-- Users table (extends Supabase auth)
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
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create user row on signup
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

-- Idea details (package cache)
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

-- Generation rate limit log
CREATE TABLE generation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  idea_id uuid NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  generated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_generation_log_user_date ON generation_log (user_id, generated_at DESC);

ALTER TABLE generation_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gen_log_own" ON generation_log FOR SELECT USING (auth.uid() = user_id);
```

- [ ] **Step 2: Configure Google OAuth in Supabase Dashboard**

The user must manually configure this in the Supabase Dashboard:
1. Go to Authentication → Providers → Google
2. Enable Google provider
3. Add Google Client ID and Client Secret (from Google Cloud Console)
4. Set redirect URL to: `https://uailhfoyxaorntqwtebq.supabase.co/auth/v1/callback`

Ask the user to complete this step before proceeding.

- [ ] **Step 3: Save migration locally and update .env.local.example**

Create `supabase/migrations/006_auth_paywall.sql` with the SQL above.

Add to `.env.local.example`:
```bash
# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
```

- [ ] **Step 4: Install Stripe dependency**

```bash
pnpm add stripe
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: Phase 3 DB migration + Stripe dependency"
```

---

## Task 2: Auth Helpers + OAuth Callback

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/app/auth/callback/route.ts`

- [ ] **Step 1: Create auth helper**

Create `src/lib/auth.ts`:
```ts
import { createClient } from "@/lib/supabase/server"

export interface AppUser {
  id: string
  email: string
  subscription_status: "free" | "pro"
  stripe_customer_id: string | null
}

export async function getUser(): Promise<AppUser | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single()

  return data as AppUser | null
}

export async function isPro(): Promise<boolean> {
  const user = await getUser()
  return user?.subscription_status === "pro"
}
```

- [ ] **Step 2: Create OAuth callback route**

Create `src/app/auth/callback/route.ts`:
```ts
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/"

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/?error=auth`)
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/auth.ts src/app/auth/callback/
git commit -m "feat: auth helpers + OAuth callback route"
```

---

## Task 3: Auth UI — Navbar Sign In / User Menu

**Files:**
- Create: `src/components/AuthButton.tsx`
- Modify: `src/components/Navbar.tsx`

- [ ] **Step 1: Create AuthButton component**

Create `src/components/AuthButton.tsx`:
```tsx
"use client"

import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"

export function AuthButton() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoading(false)
    })
  }, [])

  const signIn = async () => {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  const signOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.refresh()
  }

  if (loading) return null

  if (!user) {
    return (
      <button
        onClick={signIn}
        className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
      >
        Sign in
      </button>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-500 hidden sm:inline">
        {user.email?.split("@")[0]}
      </span>
      <button
        onClick={signOut}
        className="text-xs text-gray-400 hover:text-gray-600"
      >
        Sign out
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Add AuthButton to Navbar**

Read `src/components/Navbar.tsx`. Add AuthButton next to "Browse Ideas" link:

```tsx
import { AuthButton } from "@/components/AuthButton"
```

In the nav items div, add:
```tsx
<AuthButton />
```

- [ ] **Step 3: Verify auth flow works**

Run `pnpm dev`, click "Sign in" → should redirect to Google consent → return to app.
(Requires Google OAuth configured in Supabase Dashboard first.)

- [ ] **Step 4: Commit**

```bash
git add src/components/AuthButton.tsx src/components/Navbar.tsx
git commit -m "feat: Google OAuth sign in/out in navbar"
```

---

## Task 4: Stripe Checkout + Webhook + Portal

**Files:**
- Create: `src/lib/stripe.ts`
- Create: `src/app/api/stripe/checkout/route.ts`
- Create: `src/app/api/webhooks/stripe/route.ts`
- Create: `src/app/api/stripe/portal/route.ts`

- [ ] **Step 1: Create Stripe client helper**

Create `src/lib/stripe.ts`:
```ts
import Stripe from "stripe"

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-03-31.basil",
})
```

- [ ] **Step 2: Create checkout route**

Create `src/app/api/stripe/checkout/route.ts`:
```ts
import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { getUser } from "@/lib/auth"

export async function POST(req: Request) {
  const user = await getUser()

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: process.env.STRIPE_PRO_PRICE_ID!,
        quantity: 1,
      },
    ],
    customer_email: user.email,
    metadata: {
      supabase_user_id: user.id,
    },
    success_url: `${req.headers.get("origin")}/ideas?upgraded=true`,
    cancel_url: `${req.headers.get("origin")}/pricing`,
  })

  return NextResponse.json({ url: session.url })
}
```

- [ ] **Step 3: Create webhook handler**

Create `src/app/api/webhooks/stripe/route.ts`:
```ts
import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const body = await req.text()
  const sig = req.headers.get("stripe-signature")!

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error("Webhook signature verification failed:", err)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object
      const userId = session.metadata?.supabase_user_id
      const customerId = session.customer as string

      if (userId) {
        await supabase
          .from("users")
          .update({
            subscription_status: "pro",
            stripe_customer_id: customerId,
          })
          .eq("id", userId)
      }
      break
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object
      const customerId = subscription.customer as string

      await supabase
        .from("users")
        .update({ subscription_status: "free" })
        .eq("stripe_customer_id", customerId)
      break
    }
  }

  return NextResponse.json({ received: true })
}
```

- [ ] **Step 4: Create customer portal route**

Create `src/app/api/stripe/portal/route.ts`:
```ts
import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { getUser } from "@/lib/auth"

export async function POST(req: Request) {
  const user = await getUser()

  if (!user?.stripe_customer_id) {
    return NextResponse.json({ error: "No subscription" }, { status: 400 })
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripe_customer_id,
    return_url: `${req.headers.get("origin")}/ideas`,
  })

  return NextResponse.json({ url: session.url })
}
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/stripe.ts src/app/api/
git commit -m "feat: Stripe checkout, webhook handler, customer portal"
```

---

## Task 5: Pricing Page

**Files:**
- Create: `src/app/pricing/page.tsx`
- Create: `src/components/UpgradeButton.tsx`

- [ ] **Step 1: Create UpgradeButton**

Create `src/components/UpgradeButton.tsx`:
```tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

export function UpgradeButton({ className }: { className?: string }) {
  const [loading, setLoading] = useState(false)

  const handleUpgrade = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" })
      const { url } = await res.json()
      if (url) window.location.href = url
    } catch (e) {
      console.error("Checkout failed:", e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleUpgrade}
      disabled={loading}
      className={`bg-orange-500 hover:bg-orange-600 text-white ${className ?? ""}`}
    >
      {loading ? "Loading..." : "Get Pro — $5/month"}
    </Button>
  )
}
```

- [ ] **Step 2: Create pricing page**

Create `src/app/pricing/page.tsx`:
```tsx
import type { Metadata } from "next"
import { UpgradeButton } from "@/components/UpgradeButton"

export const metadata: Metadata = {
  title: "Pricing — EasySaaS",
  description: "Unlock quick-start packages for every SaaS idea.",
}

const features = [
  { name: "Browse all ideas", free: true, pro: true },
  { name: "Search & filter", free: true, pro: true },
  { name: "Difficulty ratings", free: true, pro: true },
  { name: "Quick Start Package", free: false, pro: true },
  { name: "Tech Spec", free: false, pro: true },
  { name: "Brand Kit", free: false, pro: true },
  { name: "Launch Checklist", free: false, pro: true },
]

export default function PricingPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-center">Simple pricing</h1>
      <p className="mt-2 text-center text-gray-500">Everything you need to go from idea to launch.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
        {/* Free */}
        <div className="border border-gray-200 rounded-xl p-8">
          <h2 className="text-xl font-bold">Free</h2>
          <p className="text-3xl font-bold mt-2">$0</p>
          <p className="text-sm text-gray-500 mt-1">Forever free</p>
          <ul className="mt-6 space-y-3">
            {features.map((f) => (
              <li key={f.name} className="flex items-center gap-2 text-sm">
                <span className={f.free ? "text-emerald-500" : "text-gray-300"}>
                  {f.free ? "✓" : "✗"}
                </span>
                <span className={f.free ? "text-gray-700" : "text-gray-400"}>{f.name}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Pro */}
        <div className="border-2 border-orange-500 rounded-xl p-8 relative">
          <span className="absolute -top-3 left-6 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">
            RECOMMENDED
          </span>
          <h2 className="text-xl font-bold">Pro</h2>
          <p className="text-3xl font-bold mt-2">$5<span className="text-base font-normal text-gray-500">/month</span></p>
          <p className="text-sm text-gray-500 mt-1">Cancel anytime</p>
          <ul className="mt-6 space-y-3">
            {features.map((f) => (
              <li key={f.name} className="flex items-center gap-2 text-sm">
                <span className="text-emerald-500">✓</span>
                <span className="text-gray-700">{f.name}</span>
              </li>
            ))}
          </ul>
          <UpgradeButton className="w-full mt-8" />
        </div>
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Add Pricing link to Navbar**

Read `src/components/Navbar.tsx`. Add a "Pricing" link next to "Browse Ideas".

- [ ] **Step 4: Commit**

```bash
git add src/app/pricing/ src/components/UpgradeButton.tsx src/components/Navbar.tsx
git commit -m "feat: pricing page with Free vs Pro comparison"
```

---

## Task 6: Markdown Templates

**Files:**
- Create: `src/templates/tech-spec-easy.md`, `tech-spec-medium.md`, `tech-spec-hard.md`
- Create: `src/templates/brand-kit.md`
- Create: `src/templates/launch-easy.md`, `launch-medium.md`, `launch-hard.md`

- [ ] **Step 1: Write all 7 templates**

Each template uses `{{PLACEHOLDER}}` markers that the LLM fill replaces.

Create `src/templates/tech-spec-easy.md`:
```markdown
# Tech Spec: {{IDEA_TITLE}}

## Recommended Stack
- **Frontend:** Single HTML file with Tailwind CSS (or Next.js if you want routing)
- **Backend:** Supabase (database + auth + hosting)
- **Deployment:** Vercel (free tier)

## Data Model
{{DATA_MODEL}}

## Key Features (MVP)
{{MVP_FEATURES}}

## API Routes
For a simple app like this, you likely need 2-3 API routes:
- `GET /api/items` — list items
- `POST /api/items` — create item
- `DELETE /api/items/:id` — delete item

## Getting Started
1. Run `npx create-next-app@latest` with TypeScript + Tailwind
2. Create a Supabase project at supabase.com
3. Add your tables using the data model above
4. Connect Supabase to your app with `@supabase/supabase-js`
5. Deploy to Vercel with `vercel deploy`

## Estimated Build Time
**1-2 days** with AI assistance (Cursor, Claude, etc.)
```

Create similar templates for medium (adds auth, API routes, cron) and hard (adds queues, microservices, caching). Create brand-kit.md and launch templates similarly.

The templates should be practical, actionable, and written for someone who might be building their first app. Use simple language.

- [ ] **Step 2: Commit**

```bash
git add src/templates/
git commit -m "feat: 7 quick-start markdown templates"
```

---

## Task 7: Package Generation API + Logic

**Files:**
- Create: `src/lib/packages.ts`
- Create: `src/app/api/packages/generate/route.ts`

- [ ] **Step 1: Create package generation logic**

Create `src/lib/packages.ts`:
```ts
import fs from "fs"
import path from "path"
import Anthropic from "@anthropic-ai/sdk"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

function getDifficultyTier(d: number): "easy" | "medium" | "hard" {
  if (d <= 2) return "easy"
  if (d <= 3) return "medium"
  return "hard"
}

function loadTemplate(name: string): string {
  const filePath = path.join(process.cwd(), "src", "templates", `${name}.md`)
  return fs.readFileSync(filePath, "utf-8")
}

export async function generatePackage(idea: {
  id: string
  title: string
  summary: string
  category: string
  difficulty: number
  tags: string[]
}) {
  const tier = getDifficultyTier(idea.difficulty)

  // Load templates
  const techSpec = loadTemplate(`tech-spec-${tier}`)
  const brandKit = loadTemplate("brand-kit")
  const launchChecklist = loadTemplate(`launch-${tier}`)

  // LLM fill
  const prompt = `For the SaaS idea "${idea.title}" (category: ${idea.category}, difficulty: ${idea.difficulty}/5):
Summary: ${idea.summary}

Return a JSON object with these fields:
{
  "product_names": ["name1", "name2", "name3"],
  "tagline": "under 10 words",
  "mvp_features": ["feature 1", "feature 2", "feature 3", "feature 4", "feature 5"],
  "data_model": "table1(col1, col2)\\ntable2(col1, col2, fk_table1)\\ntable3(col1, col2)",
  "pricing_tiers": [{"name": "Free", "price": "$0", "features": "..."}, {"name": "Pro", "price": "$X", "features": "..."}],
  "colors": ["#hex1", "#hex2", "#hex3"],
  "font_pair": "Heading Font + Body Font",
  "domains": ["domain1.com", "domain2.io"],
  "distribution": ["channel 1 with brief explanation", "channel 2 with brief explanation"]
}

Return ONLY valid JSON.`

  let fillData: any
  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    })

    const text = response.content[0].type === "text" ? response.content[0].text : ""
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error("No JSON in response")
    fillData = JSON.parse(jsonMatch[0])
  } catch (e) {
    // Retry once
    await new Promise((r) => setTimeout(r, 2000))
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    })
    const text = response.content[0].type === "text" ? response.content[0].text : ""
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error("LLM generation failed after retry")
    fillData = JSON.parse(jsonMatch[0])
  }

  // Merge templates with fill data
  const mergedTechSpec = techSpec
    .replace("{{IDEA_TITLE}}", idea.title)
    .replace("{{DATA_MODEL}}", fillData.data_model || "")
    .replace("{{MVP_FEATURES}}", (fillData.mvp_features || []).map((f: string, i: number) => `${i + 1}. ${f}`).join("\n"))

  const mergedBrandKit = brandKit
    .replace("{{IDEA_TITLE}}", idea.title)
    .replace("{{PRODUCT_NAMES}}", (fillData.product_names || []).map((n: string) => `- **${n}**`).join("\n"))
    .replace("{{TAGLINE}}", fillData.tagline || "")
    .replace("{{COLORS}}", (fillData.colors || []).join(", "))
    .replace("{{FONT_PAIR}}", fillData.font_pair || "")
    .replace("{{DOMAINS}}", (fillData.domains || []).join(", "))

  const mergedLaunch = launchChecklist
    .replace("{{IDEA_TITLE}}", idea.title)
    .replace("{{MVP_FEATURES}}", (fillData.mvp_features || []).map((f: string) => `- [ ] ${f}`).join("\n"))
    .replace("{{PRICING_TIERS}}", (fillData.pricing_tiers || []).map((t: any) => `- **${t.name}** (${t.price}): ${t.features}`).join("\n"))
    .replace("{{DISTRIBUTION}}", (fillData.distribution || []).map((d: string) => `- ${d}`).join("\n"))

  const packageJson = {
    fill_data: fillData,
    tech_spec: mergedTechSpec,
    brand_kit: mergedBrandKit,
    launch_checklist: mergedLaunch,
    generated_at: new Date().toISOString(),
  }

  return packageJson
}

export async function checkRateLimit(userId: string): Promise<{ allowed: boolean; count: number }> {
  const { count } = await supabase
    .from("generation_log")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("generated_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

  return { allowed: (count ?? 0) < 5, count: count ?? 0 }
}
```

- [ ] **Step 2: Create generate API route**

Create `src/app/api/packages/generate/route.ts`:
```ts
import { NextResponse } from "next/server"
import { getUser } from "@/lib/auth"
import { generatePackage, checkRateLimit } from "@/lib/packages"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const user = await getUser()

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  if (user.subscription_status !== "pro") {
    return NextResponse.json({ error: "Pro subscription required" }, { status: 403 })
  }

  const { idea_id } = await req.json()

  if (!idea_id) {
    return NextResponse.json({ error: "idea_id required" }, { status: 400 })
  }

  // Check cache
  const { data: existing } = await supabase
    .from("idea_details")
    .select("package_json")
    .eq("idea_id", idea_id)
    .single()

  if (existing?.package_json) {
    return NextResponse.json({ package: existing.package_json, cached: true })
  }

  // Check rate limit
  const { allowed, count } = await checkRateLimit(user.id)
  if (!allowed) {
    return NextResponse.json({
      error: "Daily limit reached",
      message: `You've explored ${count} ideas today. Come back tomorrow!`,
    }, { status: 429 })
  }

  // Fetch idea
  const { data: idea } = await supabase
    .from("ideas")
    .select("id, title, summary, category, difficulty, tags")
    .eq("id", idea_id)
    .single()

  if (!idea) {
    return NextResponse.json({ error: "Idea not found" }, { status: 404 })
  }

  try {
    const packageJson = await generatePackage(idea)

    // Cache in idea_details
    await supabase.from("idea_details").upsert({
      idea_id: idea.id,
      package_json: packageJson,
      generated_by: user.id,
    })

    // Log generation
    await supabase.from("generation_log").insert({
      user_id: user.id,
      idea_id: idea.id,
    })

    return NextResponse.json({ package: packageJson, cached: false })
  } catch (e) {
    console.error("Package generation failed:", e)
    return NextResponse.json({
      error: "Generation temporarily unavailable",
      message: "Please try again later.",
    }, { status: 500 })
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/packages.ts src/app/api/packages/
git commit -m "feat: package generation API with LLM fill + caching + rate limit"
```

---

## Task 8: Paywall UI on Detail Page

**Files:**
- Create: `src/components/PackageSection.tsx`
- Create: `src/components/BlurredPreview.tsx`
- Modify: `src/app/ideas/[slug]/page.tsx`

- [ ] **Step 1: Create BlurredPreview**

Create `src/components/BlurredPreview.tsx`:
```tsx
export function BlurredPreview() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-200 p-6 bg-gray-50">
      <div className="blur-sm select-none pointer-events-none space-y-4">
        <h3 className="font-bold text-lg">Tech Spec</h3>
        <p className="text-sm text-gray-600">Recommended Stack: Next.js + Supabase + Vercel</p>
        <p className="text-sm text-gray-600">Data Model: users, items, payments, analytics</p>
        <h3 className="font-bold text-lg mt-4">Brand Kit</h3>
        <p className="text-sm text-gray-600">Names: AppFlow, BuildIt, LaunchPad</p>
        <p className="text-sm text-gray-600">Colors: #FF6B6B, #4ECDC4, #45B7D1</p>
        <h3 className="font-bold text-lg mt-4">Launch Checklist</h3>
        <p className="text-sm text-gray-600">□ Build MVP □ Deploy □ Submit to Product Hunt</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create PackageSection**

Create `src/components/PackageSection.tsx`:
```tsx
"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { BlurredPreview } from "@/components/BlurredPreview"
import { UpgradeButton } from "@/components/UpgradeButton"
import type { User } from "@supabase/supabase-js"

interface PackageSectionProps {
  ideaId: string
}

export function PackageSection({ ideaId }: PackageSectionProps) {
  const [user, setUser] = useState<User | null>(null)
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>("free")
  const [packageData, setPackageData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()

    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        const { data } = await supabase
          .from("users")
          .select("subscription_status")
          .eq("id", user.id)
          .single()

        setSubscriptionStatus(data?.subscription_status ?? "free")

        // Check if package already exists (Pro only)
        if (data?.subscription_status === "pro") {
          const { data: details } = await supabase
            .from("idea_details")
            .select("package_json")
            .eq("idea_id", ideaId)
            .single()

          if (details?.package_json) {
            setPackageData(details.package_json)
          }
        }
      }
      setLoading(false)
    }

    init()
  }, [ideaId])

  const generatePackage = async () => {
    setGenerating(true)
    setError(null)

    try {
      const res = await fetch("/api/packages/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea_id: ideaId }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message || data.error || "Something went wrong")
        return
      }

      setPackageData(data.package)
    } catch (e) {
      setError("Failed to generate package. Please try again.")
    } finally {
      setGenerating(false)
    }
  }

  if (loading) return null

  // Not signed in
  if (!user) {
    return (
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">Quick Start Package</h2>
        <BlurredPreview />
        <div className="text-center mt-4">
          <p className="text-sm text-gray-500 mb-2">Sign in to unlock the full package</p>
          <Button
            onClick={async () => {
              const supabase = createClient()
              await supabase.auth.signInWithOAuth({
                provider: "google",
                options: { redirectTo: `${window.location.origin}/auth/callback?next=${window.location.pathname}` },
              })
            }}
            variant="outline"
          >
            Sign in with Google
          </Button>
        </div>
      </div>
    )
  }

  // Free user
  if (subscriptionStatus !== "pro") {
    return (
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">Quick Start Package</h2>
        <BlurredPreview />
        <div className="text-center mt-4">
          <p className="text-sm text-gray-500 mb-2">Upgrade to Pro to unlock Tech Spec, Brand Kit, and Launch Checklist</p>
          <UpgradeButton />
        </div>
      </div>
    )
  }

  // Pro user — package exists
  if (packageData) {
    return (
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">Quick Start Package</h2>
        <div className="space-y-8">
          <div className="prose prose-gray max-w-none border border-gray-200 rounded-xl p-6 bg-white">
            <div dangerouslySetInnerHTML={{ __html: markdownToHtml(packageData.tech_spec) }} />
          </div>
          <div className="prose prose-gray max-w-none border border-gray-200 rounded-xl p-6 bg-white">
            <div dangerouslySetInnerHTML={{ __html: markdownToHtml(packageData.brand_kit) }} />
          </div>
          <div className="prose prose-gray max-w-none border border-gray-200 rounded-xl p-6 bg-white">
            <div dangerouslySetInnerHTML={{ __html: markdownToHtml(packageData.launch_checklist) }} />
          </div>
        </div>
      </div>
    )
  }

  // Pro user — no package yet
  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold mb-4">Quick Start Package</h2>
      <div className="border border-dashed border-gray-300 rounded-xl p-8 text-center bg-gray-50">
        <p className="text-gray-600 mb-4">Get a personalized Tech Spec, Brand Kit, and Launch Checklist for this idea</p>
        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
        <Button
          onClick={generatePackage}
          disabled={generating}
          className="bg-orange-500 hover:bg-orange-600 text-white"
        >
          {generating ? "Generating..." : "Generate Quick Start Package"}
        </Button>
      </div>
    </div>
  )
}

// Simple markdown to HTML (for rendering templates)
function markdownToHtml(md: string): string {
  return md
    .replace(/^### (.*$)/gm, "<h3>$1</h3>")
    .replace(/^## (.*$)/gm, "<h2>$1</h2>")
    .replace(/^# (.*$)/gm, "<h1>$1</h1>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/^- \[ \] (.*$)/gm, "<li>☐ $1</li>")
    .replace(/^- (.*$)/gm, "<li>$1</li>")
    .replace(/^(\d+)\. (.*$)/gm, "<li>$1. $2</li>")
    .replace(/\n\n/g, "<br/><br/>")
    .replace(/\n/g, "<br/>")
}
```

- [ ] **Step 3: Update detail page to include PackageSection**

Read `src/app/ideas/[slug]/page.tsx`. Replace the "Want the full spec?" placeholder section (the dashed border div with "Coming Soon" button) with:

```tsx
<Suspense fallback={null}>
  <PackageSection ideaId={idea.id} />
</Suspense>
```

Import at top:
```tsx
import { Suspense } from "react"
import { PackageSection } from "@/components/PackageSection"
```

Remove the old placeholder div entirely.

- [ ] **Step 4: Commit**

```bash
git add src/components/PackageSection.tsx src/components/BlurredPreview.tsx src/app/ideas/
git commit -m "feat: paywall UI — blurred preview, auth gate, package generation"
```

---

## Task 9: Update Types + Push

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add new types**

Read `src/types/index.ts`. Add:

```ts
export interface AppUser {
  id: string
  email: string
  subscription_status: "free" | "pro"
  stripe_customer_id: string | null
}

export interface IdeaPackage {
  fill_data: Record<string, any>
  tech_spec: string
  brand_kit: string
  launch_checklist: string
  generated_at: string
}
```

- [ ] **Step 2: Final commit and push**

```bash
git add -A
git commit -m "feat: complete Phase 3 — auth, Stripe, packages, paywall"
git push origin main
```

---

## Summary

| Task | Description | Est. Time |
|------|-------------|-----------|
| 1 | DB migration + OAuth setup + Stripe dep | 10 min |
| 2 | Auth helpers + callback route | 5 min |
| 3 | Navbar auth UI | 10 min |
| 4 | Stripe checkout + webhook + portal | 15 min |
| 5 | Pricing page | 10 min |
| 6 | 7 markdown templates | 15 min |
| 7 | Package generation API | 15 min |
| 8 | Paywall UI on detail page | 15 min |
| 9 | Types + final push | 5 min |
| **Total** | | **~100 min** |

## Prerequisites (manual steps by user)

Before execution:
1. **Google OAuth** — Configure in Supabase Dashboard (Authentication → Providers → Google)
2. **Stripe** — Create a Stripe account, create "EasySaaS Pro" product at $5/month, get API keys
3. **Stripe Webhook** — Configure in Stripe Dashboard pointing to `https://easy-saas-pi.vercel.app/api/webhooks/stripe`
4. **Environment vars** — Add Stripe keys to `.env.local` and Vercel env vars
