import type { Metadata } from "next"
import Script from "next/script"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Navbar } from "@/components/Navbar"
import { Footer } from "@/components/Footer"
import "./globals.css"

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

// metadataBase lets Next resolve relative canonical/OG/Twitter URLs into
// absolute ones automatically, avoiding a class of GEO bugs where crawlers
// receive a relative canonical and point it at the wrong host.
const SITE_URL = "https://vibecodeideas.ai"

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Vibe Code Ideas — Discover Your Next SaaS Idea",
  description:
    "Vibe Code Ideas is a free directory of curated micro-SaaS and SaaS ideas ranked by real demand signals. Browse by category, difficulty, and trending popularity to find your next project to build.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Vibe Code Ideas — Discover Your Next SaaS Idea",
    description:
      "Vibe Code Ideas is a free directory of curated micro-SaaS and SaaS ideas ranked by real demand signals. Browse by category, difficulty, and trending popularity to find your next project to build.",
    siteName: "Vibe Code Ideas",
    url: SITE_URL,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Vibe Code Ideas — Discover Your Next SaaS Idea",
    description:
      "A free directory of curated SaaS ideas ranked by real demand signals.",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-screen flex flex-col bg-background text-foreground">
        <Navbar />
        <div className="flex-1">{children}</div>
        <Footer />
        <Analytics />
        <SpeedInsights />
        {GA_MEASUREMENT_ID && (
          <>
            <Script
              strategy="afterInteractive"
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_MEASUREMENT_ID}');
              `}
            </Script>
          </>
        )}
      </body>
    </html>
  )
}
