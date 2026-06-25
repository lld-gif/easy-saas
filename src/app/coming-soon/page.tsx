import type { Metadata } from "next"
import { NewsletterSignup } from "@/components/NewsletterSignup"

/**
 * /coming-soon — landing page served while VCI is paused.
 *
 * Proxy in src/proxy.ts rewrites every non-asset path here. The
 * underlying directory pages still exist in the build but are
 * unreachable. To unfreeze: delete the rewrite branch in proxy.ts
 * and the site returns to normal behavior.
 *
 * Newsletter signup still works (the `/api/newsletter/subscribe`
 * route handler is unchanged and writes to Supabase). The weekly
 * digest cron is disabled, so subscribers won't get an email
 * until the project comes back — they're just on the "notify when
 * we return" list.
 */

export const metadata: Metadata = {
  title: "Vibe Code Ideas — Coming back later",
  description:
    "Vibe Code Ideas is on pause while the team focuses on other projects. Drop your email to hear when it's back.",
  robots: {
    index: false,
    follow: false,
  },
}

export default function ComingSoonPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-5 sm:px-6 py-16 bg-background">
      <div className="max-w-md w-full text-center">
        {/* Logo mark — small, restrained */}
        <div className="inline-flex items-center gap-2 mb-10">
          <div className="w-7 h-7 rounded bg-orange-500 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground">
            Vibe<span className="text-orange-500">Code</span> Ideas
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-foreground">
          Coming back later.
        </h1>

        <p className="text-muted-foreground leading-relaxed mb-10 text-base sm:text-lg">
          A crowdsourced directory of 4,669 SaaS ideas, pulled daily from
          Hacker News, GitHub, Product Hunt, and Google Trends. Paused for
          now while we focus on other projects. Drop your email below and
          we&apos;ll let you know when it&apos;s back.
        </p>

        <div className="mb-12">
          <NewsletterSignup />
        </div>

        <p className="text-xs text-muted-foreground/70">
          Built by{" "}
          <a
            href="https://lucadoan.com"
            className="hover:text-foreground underline underline-offset-2 decoration-muted-foreground/40 hover:decoration-foreground transition-colors"
          >
            Luca Doan
          </a>
        </p>
      </div>
    </main>
  )
}
