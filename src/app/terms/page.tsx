import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Terms of Service — Vibe Code Ideas",
  description:
    "The rules for using Vibe Code Ideas. What you can do, what we provide, and what happens if things go wrong.",
  alternates: {
    canonical: "https://vibecodeideas.ai/terms",
  },
}

const LAST_UPDATED = "April 9, 2026"

export default function TermsPage() {
  return (
    <main className="min-h-screen">
      <div className="max-w-2xl mx-auto px-5 sm:px-6 pt-10 pb-6">
        <div className="text-sm text-muted-foreground mb-4">
          Last updated: {LAST_UPDATED}
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight">
          Terms of Service
        </h1>
        <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
          The rules for using Vibe Code Ideas. Short version: use the service
          in good faith, pay for Pro if you want Pro features, and we&apos;ll
          keep the service running and treat you fairly.
        </p>
      </div>

      <hr className="max-w-2xl mx-auto border-border/60" />

      <article className="max-w-2xl mx-auto px-5 sm:px-6 py-10">
        <div className="blog-content">
          <h2 className="text-2xl font-semibold tracking-tight mt-14 mb-5 first:mt-0">
            1. Agreement
          </h2>
          <p className="text-base leading-[1.75] text-muted-foreground mb-6">
            By accessing or using{" "}
            <a
              href="https://vibecodeideas.ai"
              className="text-orange-600 underline underline-offset-2 decoration-orange-300 hover:decoration-orange-500 transition-colors"
            >
              vibecodeideas.ai
            </a>{" "}
            (&quot;Vibe Code Ideas,&quot; &quot;the service&quot;), you agree to these
            Terms of Service. If you do not agree, do not use the service.
          </p>
          <p className="text-base leading-[1.75] text-muted-foreground mb-6">
            Vibe Code Ideas is a brand operated under Ashcroft Inc., a
            Wyoming corporation. References to &quot;we,&quot; &quot;us,&quot;
            or &quot;our&quot; mean Ashcroft Inc. operating the Vibe Code Ideas
            service.
          </p>

          <h2 className="text-2xl font-semibold tracking-tight mt-14 mb-5">
            2. What the service does
          </h2>
          <p className="text-base leading-[1.75] text-muted-foreground mb-6">
            Vibe Code Ideas is a curated directory of SaaS ideas sourced from
            public conversations across the internet. Free users can browse
            ideas, search, filter, and view difficulty ratings. Pro users can
            generate Quick Start Packages that include tech specs, brand
            kits, and launch checklists for any idea.
          </p>

          <h2 className="text-2xl font-semibold tracking-tight mt-14 mb-5">
            3. Your account
          </h2>
          <p className="text-base leading-[1.75] text-muted-foreground mb-6">
            To use certain features you must create an account. You agree to:
          </p>
          <ul className="my-6 space-y-2.5 pl-1">
            <li className="flex gap-3 text-base leading-relaxed text-muted-foreground">
              <span className="mt-2.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-400" />
              <span>Provide accurate information when signing up.</span>
            </li>
            <li className="flex gap-3 text-base leading-relaxed text-muted-foreground">
              <span className="mt-2.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-400" />
              <span>Keep your login credentials secure.</span>
            </li>
            <li className="flex gap-3 text-base leading-relaxed text-muted-foreground">
              <span className="mt-2.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-400" />
              <span>Be at least 13 years old (16 in the European Economic Area).</span>
            </li>
            <li className="flex gap-3 text-base leading-relaxed text-muted-foreground">
              <span className="mt-2.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-400" />
              <span>Not share your account with others.</span>
            </li>
          </ul>

          <h2 className="text-2xl font-semibold tracking-tight mt-14 mb-5">
            4. Pro subscriptions
          </h2>
          <p className="text-base leading-[1.75] text-muted-foreground mb-6">
            Vibe Code Ideas Pro is billed on a recurring basis — monthly or
            annually — at the prices shown on our{" "}
            <a
              href="/pricing"
              className="text-orange-600 underline underline-offset-2 decoration-orange-300 hover:decoration-orange-500 transition-colors"
            >
              pricing page
            </a>
            . Payments are processed by Stripe. By subscribing, you authorize
            us to charge your chosen payment method until you cancel.
          </p>
          <p className="text-base leading-[1.75] text-muted-foreground mb-6">
            You can cancel your Pro subscription at any time from your account
            settings. Your Pro access will continue until the end of the
            current billing period.
          </p>
          <p className="text-base leading-[1.75] text-muted-foreground mb-6">
            <strong className="text-foreground font-semibold">Refund policy:</strong>{" "}
            We do not offer refunds on Quick Start Packages once they have
            been generated, as they are produced on demand and consume
            compute resources. If you believe you have been charged in error,
            email{" "}
            <a
              href="mailto:support@vibecodeideas.ai"
              className="text-orange-600 underline underline-offset-2 decoration-orange-300 hover:decoration-orange-500 transition-colors"
            >
              support@vibecodeideas.ai
            </a>{" "}
            and we will review your case in good faith.
          </p>
          <p className="text-base leading-[1.75] text-muted-foreground mb-6">
            We may change Pro pricing with at least 30 days notice. Existing
            subscribers keep their current price for the remainder of their
            billing period.
          </p>

          <h2 className="text-2xl font-semibold tracking-tight mt-14 mb-5">
            5. Acceptable use
          </h2>
          <p className="text-base leading-[1.75] text-muted-foreground mb-6">
            You agree not to:
          </p>
          <ul className="my-6 space-y-2.5 pl-1">
            <li className="flex gap-3 text-base leading-relaxed text-muted-foreground">
              <span className="mt-2.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-400" />
              <span>Scrape, crawl, or bulk-download content from the service without written permission.</span>
            </li>
            <li className="flex gap-3 text-base leading-relaxed text-muted-foreground">
              <span className="mt-2.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-400" />
              <span>Reverse engineer, decompile, or attempt to extract source code from the service.</span>
            </li>
            <li className="flex gap-3 text-base leading-relaxed text-muted-foreground">
              <span className="mt-2.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-400" />
              <span>Use the service to build a directly competing product or to train a machine learning model on our curated content.</span>
            </li>
            <li className="flex gap-3 text-base leading-relaxed text-muted-foreground">
              <span className="mt-2.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-400" />
              <span>Attempt to gain unauthorized access to other users&apos; accounts or to our systems.</span>
            </li>
            <li className="flex gap-3 text-base leading-relaxed text-muted-foreground">
              <span className="mt-2.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-400" />
              <span>Use the service for any unlawful purpose or to infringe on intellectual property rights.</span>
            </li>
            <li className="flex gap-3 text-base leading-relaxed text-muted-foreground">
              <span className="mt-2.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-400" />
              <span>Interfere with or disrupt the integrity or performance of the service.</span>
            </li>
          </ul>

          <h2 className="text-2xl font-semibold tracking-tight mt-14 mb-5">
            6. Content ownership
          </h2>
          <p className="text-base leading-[1.75] text-muted-foreground mb-6">
            <strong className="text-foreground font-semibold">Our content.</strong>{" "}
            The curated idea database, taxonomy, descriptions, and Quick Start
            Packages are owned by us or our licensors and are protected by
            copyright. You may use this content for personal reference and to
            build your own products, but you may not republish or resell it.
          </p>
          <p className="text-base leading-[1.75] text-muted-foreground mb-6">
            <strong className="text-foreground font-semibold">Your projects.</strong>{" "}
            Anything you build using ideas discovered on Vibe Code Ideas is
            yours. We claim no ownership over your projects, code, or
            businesses. Ideas themselves are not copyrightable — use them
            freely.
          </p>
          <p className="text-base leading-[1.75] text-muted-foreground mb-6">
            <strong className="text-foreground font-semibold">
              Third-party content.
            </strong>{" "}
            Where we display excerpts, links, or mentions from external
            sources (Hacker News, Reddit, GitHub, and similar), the original
            content remains owned by its authors.
          </p>

          <h2 className="text-2xl font-semibold tracking-tight mt-14 mb-5">
            7. Disclaimers
          </h2>
          <p className="text-base leading-[1.75] text-muted-foreground mb-6">
            The service is provided &quot;as is&quot; and &quot;as available&quot;
            without warranties of any kind, express or implied, including
            merchantability, fitness for a particular purpose, and
            non-infringement.
          </p>
          <p className="text-base leading-[1.75] text-muted-foreground mb-6">
            Vibe Code Ideas does not guarantee that any idea listed on the
            service will be commercially viable, legally available, or free of
            existing competitors. You are responsible for your own due
            diligence before building or launching a business based on any
            idea from the service. Ideas are starting points, not guarantees.
          </p>

          <h2 className="text-2xl font-semibold tracking-tight mt-14 mb-5">
            8. Limitation of liability
          </h2>
          <p className="text-base leading-[1.75] text-muted-foreground mb-6">
            To the maximum extent permitted by law, our total liability for
            any claim arising from your use of the service is limited to the
            greater of (a) the amount you paid us in the twelve months before
            the claim or (b) one hundred US dollars (USD $100).
          </p>
          <p className="text-base leading-[1.75] text-muted-foreground mb-6">
            We are not liable for any indirect, incidental, special,
            consequential, or punitive damages, including lost profits, lost
            revenue, or lost business opportunities, even if we have been
            advised of the possibility of such damages.
          </p>

          <h2 className="text-2xl font-semibold tracking-tight mt-14 mb-5">
            9. Termination
          </h2>
          <p className="text-base leading-[1.75] text-muted-foreground mb-6">
            You can close your account at any time. We can suspend or
            terminate your account if you violate these terms or use the
            service in a way that harms us or other users. If we terminate
            your account for cause, we will not refund any unused Pro
            subscription time.
          </p>

          <h2 className="text-2xl font-semibold tracking-tight mt-14 mb-5">
            10. Changes to the service
          </h2>
          <p className="text-base leading-[1.75] text-muted-foreground mb-6">
            We may add, change, or remove features at any time. We will try to
            give reasonable notice before removing features that Pro
            subscribers actively use.
          </p>

          <h2 className="text-2xl font-semibold tracking-tight mt-14 mb-5">
            11. Changes to these terms
          </h2>
          <p className="text-base leading-[1.75] text-muted-foreground mb-6">
            If we make material changes to these terms, we will update the
            &quot;Last updated&quot; date above and, where appropriate, notify
            registered users by email. Continued use of the service after
            changes means you accept the updated terms.
          </p>

          <h2 className="text-2xl font-semibold tracking-tight mt-14 mb-5">
            12. Governing law
          </h2>
          <p className="text-base leading-[1.75] text-muted-foreground mb-6">
            These terms are governed by the laws of the State of Wyoming,
            United States, without regard to conflict of law principles. Any
            dispute arising from these terms or the service will be resolved
            in the state or federal courts located in Wyoming.
          </p>

          <h2 className="text-2xl font-semibold tracking-tight mt-14 mb-5">
            13. Contact
          </h2>
          <p className="text-base leading-[1.75] text-muted-foreground mb-6">
            Questions about these terms? Email{" "}
            <a
              href="mailto:support@vibecodeideas.ai"
              className="text-orange-600 underline underline-offset-2 decoration-orange-300 hover:decoration-orange-500 transition-colors"
            >
              support@vibecodeideas.ai
            </a>
            .
          </p>
        </div>
      </article>
    </main>
  )
}
