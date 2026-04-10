import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privacy Policy — Vibe Code Ideas",
  description:
    "How Vibe Code Ideas collects, uses, and protects your data. Plain English, no dark patterns.",
  alternates: {
    canonical: "https://vibecodeideas.ai/privacy",
  },
}

const LAST_UPDATED = "April 9, 2026"

export default function PrivacyPage() {
  return (
    <main className="min-h-screen">
      <div className="max-w-2xl mx-auto px-5 sm:px-6 pt-10 pb-6">
        <div className="text-sm text-muted-foreground mb-4">
          Last updated: {LAST_UPDATED}
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight">
          Privacy Policy
        </h1>
        <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
          Plain English. No dark patterns. Here is exactly what we collect, why,
          and what we do with it.
        </p>
      </div>

      <hr className="max-w-2xl mx-auto border-border/60" />

      <article className="max-w-2xl mx-auto px-5 sm:px-6 py-10">
        <div className="blog-content">
          <h2 className="text-2xl font-semibold tracking-tight mt-14 mb-5 first:mt-0">
            Who we are
          </h2>
          <p className="text-base leading-[1.75] text-muted-foreground mb-6">
            Vibe Code Ideas (&quot;we,&quot; &quot;us,&quot; &quot;the service&quot;) is a SaaS idea discovery
            platform operated at{" "}
            <a
              href="https://vibecodeideas.ai"
              className="text-orange-600 underline underline-offset-2 decoration-orange-300 hover:decoration-orange-500 transition-colors"
            >
              vibecodeideas.ai
            </a>
            . Vibe Code Ideas is a brand operated under Ashcroft Inc., a Wyoming
            corporation.
          </p>
          <p className="text-base leading-[1.75] text-muted-foreground mb-6">
            This policy explains what data we collect when you use the service,
            why we collect it, and the limited ways it is shared. If anything
            here is unclear, email{" "}
            <a
              href="mailto:support@vibecodeideas.ai"
              className="text-orange-600 underline underline-offset-2 decoration-orange-300 hover:decoration-orange-500 transition-colors"
            >
              support@vibecodeideas.ai
            </a>
            .
          </p>

          <h2 className="text-2xl font-semibold tracking-tight mt-14 mb-5">
            What we collect
          </h2>
          <p className="text-base leading-[1.75] text-muted-foreground mb-6">
            We only collect what is needed to run the service. That is:
          </p>
          <ul className="my-6 space-y-2.5 pl-1">
            <li className="flex gap-3 text-base leading-relaxed text-muted-foreground">
              <span className="mt-2.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-400" />
              <span>
                <strong className="text-foreground font-semibold">
                  Account information
                </strong>
                : your email address and, if you sign in with Google, your name
                and profile picture as provided by Google OAuth.
              </span>
            </li>
            <li className="flex gap-3 text-base leading-relaxed text-muted-foreground">
              <span className="mt-2.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-400" />
              <span>
                <strong className="text-foreground font-semibold">
                  Subscription data
                </strong>
                : if you upgrade to Pro, Stripe stores your billing information
                and sends us a customer ID and subscription status. We never see
                or store your full card details.
              </span>
            </li>
            <li className="flex gap-3 text-base leading-relaxed text-muted-foreground">
              <span className="mt-2.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-400" />
              <span>
                <strong className="text-foreground font-semibold">
                  Usage data
                </strong>
                : which ideas you view, save, or generate packages for. This
                lets us personalize the experience and improve the product.
              </span>
            </li>
            <li className="flex gap-3 text-base leading-relaxed text-muted-foreground">
              <span className="mt-2.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-400" />
              <span>
                <strong className="text-foreground font-semibold">
                  Newsletter signups
                </strong>
                : if you subscribe to our newsletter, we store your email
                address for sending the digest. You can unsubscribe at any time.
              </span>
            </li>
            <li className="flex gap-3 text-base leading-relaxed text-muted-foreground">
              <span className="mt-2.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-400" />
              <span>
                <strong className="text-foreground font-semibold">
                  Analytics
                </strong>
                : we use Vercel Analytics, which is privacy-friendly and does
                not use cookies or track individuals across sites.
              </span>
            </li>
          </ul>

          <h2 className="text-2xl font-semibold tracking-tight mt-14 mb-5">
            What we do not collect
          </h2>
          <ul className="my-6 space-y-2.5 pl-1">
            <li className="flex gap-3 text-base leading-relaxed text-muted-foreground">
              <span className="mt-2.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-400" />
              <span>We do not collect payment card information directly. All payment processing is handled by Stripe.</span>
            </li>
            <li className="flex gap-3 text-base leading-relaxed text-muted-foreground">
              <span className="mt-2.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-400" />
              <span>We do not use third-party advertising trackers or data brokers.</span>
            </li>
            <li className="flex gap-3 text-base leading-relaxed text-muted-foreground">
              <span className="mt-2.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-400" />
              <span>We do not sell your data to anyone. Not now, not ever.</span>
            </li>
          </ul>

          <h2 className="text-2xl font-semibold tracking-tight mt-14 mb-5">
            How we use your data
          </h2>
          <p className="text-base leading-[1.75] text-muted-foreground mb-6">
            Your data is used only to operate Vibe Code Ideas. Specifically:
          </p>
          <ul className="my-6 space-y-2.5 pl-1">
            <li className="flex gap-3 text-base leading-relaxed text-muted-foreground">
              <span className="mt-2.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-400" />
              <span>To authenticate you and maintain your account.</span>
            </li>
            <li className="flex gap-3 text-base leading-relaxed text-muted-foreground">
              <span className="mt-2.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-400" />
              <span>To process Pro subscription payments and manage your billing status.</span>
            </li>
            <li className="flex gap-3 text-base leading-relaxed text-muted-foreground">
              <span className="mt-2.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-400" />
              <span>To send transactional emails (receipts, account notifications, password resets).</span>
            </li>
            <li className="flex gap-3 text-base leading-relaxed text-muted-foreground">
              <span className="mt-2.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-400" />
              <span>To send newsletters if you opted in.</span>
            </li>
            <li className="flex gap-3 text-base leading-relaxed text-muted-foreground">
              <span className="mt-2.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-400" />
              <span>To understand aggregate usage patterns and improve the product.</span>
            </li>
          </ul>

          <h2 className="text-2xl font-semibold tracking-tight mt-14 mb-5">
            Who we share it with
          </h2>
          <p className="text-base leading-[1.75] text-muted-foreground mb-6">
            We share data only with the infrastructure providers that run the
            service. Each is bound by their own privacy and security
            obligations:
          </p>
          <ul className="my-6 space-y-2.5 pl-1">
            <li className="flex gap-3 text-base leading-relaxed text-muted-foreground">
              <span className="mt-2.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-400" />
              <span>
                <strong className="text-foreground font-semibold">Supabase</strong>{" "}
                — database and authentication hosting. Stores your account and
                usage data.
              </span>
            </li>
            <li className="flex gap-3 text-base leading-relaxed text-muted-foreground">
              <span className="mt-2.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-400" />
              <span>
                <strong className="text-foreground font-semibold">Google</strong>{" "}
                — if you use Google sign-in, Google provides us your email,
                name, and profile picture.
              </span>
            </li>
            <li className="flex gap-3 text-base leading-relaxed text-muted-foreground">
              <span className="mt-2.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-400" />
              <span>
                <strong className="text-foreground font-semibold">Stripe</strong>{" "}
                — payment processing for Pro subscriptions.
              </span>
            </li>
            <li className="flex gap-3 text-base leading-relaxed text-muted-foreground">
              <span className="mt-2.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-400" />
              <span>
                <strong className="text-foreground font-semibold">Resend</strong>{" "}
                — transactional and newsletter email delivery.
              </span>
            </li>
            <li className="flex gap-3 text-base leading-relaxed text-muted-foreground">
              <span className="mt-2.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-400" />
              <span>
                <strong className="text-foreground font-semibold">Vercel</strong>{" "}
                — application hosting and privacy-friendly analytics.
              </span>
            </li>
          </ul>
          <p className="text-base leading-[1.75] text-muted-foreground mb-6">
            We will only disclose your data to others if required by law or to
            protect our rights.
          </p>

          <h2 className="text-2xl font-semibold tracking-tight mt-14 mb-5">
            Cookies
          </h2>
          <p className="text-base leading-[1.75] text-muted-foreground mb-6">
            We use a small number of essential cookies to keep you signed in
            and remember your preferences. We do not use advertising or
            cross-site tracking cookies.
          </p>

          <h2 className="text-2xl font-semibold tracking-tight mt-14 mb-5">
            Data retention
          </h2>
          <p className="text-base leading-[1.75] text-muted-foreground mb-6">
            We keep your account data for as long as your account is active.
            If you delete your account, we will delete your personal data
            within 30 days, except where we are required by law to retain
            certain records (for example, tax or billing records tied to
            Pro subscription payments).
          </p>

          <h2 className="text-2xl font-semibold tracking-tight mt-14 mb-5">
            Your rights
          </h2>
          <p className="text-base leading-[1.75] text-muted-foreground mb-6">
            You have the right to access, correct, export, or delete your
            personal data. To exercise any of these rights, email{" "}
            <a
              href="mailto:support@vibecodeideas.ai"
              className="text-orange-600 underline underline-offset-2 decoration-orange-300 hover:decoration-orange-500 transition-colors"
            >
              support@vibecodeideas.ai
            </a>{" "}
            and we will respond within 30 days.
          </p>
          <p className="text-base leading-[1.75] text-muted-foreground mb-6">
            If you are in the European Economic Area, the United Kingdom, or
            California, you have additional rights under GDPR and CCPA. We
            honor those rights for all users regardless of location.
          </p>

          <h2 className="text-2xl font-semibold tracking-tight mt-14 mb-5">
            Children
          </h2>
          <p className="text-base leading-[1.75] text-muted-foreground mb-6">
            Vibe Code Ideas is not directed at children under 13 and we do not
            knowingly collect personal data from children. If you believe a
            child has provided us with personal data, please contact us and we
            will delete it.
          </p>

          <h2 className="text-2xl font-semibold tracking-tight mt-14 mb-5">
            Changes to this policy
          </h2>
          <p className="text-base leading-[1.75] text-muted-foreground mb-6">
            If we make material changes to this policy, we will update the
            &quot;Last updated&quot; date above and, where appropriate, notify
            you by email. Continued use of the service after changes means you
            accept the updated policy.
          </p>

          <h2 className="text-2xl font-semibold tracking-tight mt-14 mb-5">
            Contact
          </h2>
          <p className="text-base leading-[1.75] text-muted-foreground mb-6">
            Questions about this policy or our data practices? Email{" "}
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
