import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Navbar } from "@/components/Navbar"
import { Footer } from "@/components/Footer"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Vibe Code Ideas — Discover Your Next SaaS Idea",
  description:
    "Vibe Code Ideas is a free directory of 500+ curated micro-SaaS and SaaS ideas ranked by real demand signals. Browse by category, difficulty, and trending popularity to find your next project to build.",
  openGraph: {
    title: "Vibe Code Ideas — Discover Your Next SaaS Idea",
    description:
      "Vibe Code Ideas is a free directory of 500+ curated micro-SaaS and SaaS ideas ranked by real demand signals. Browse by category, difficulty, and trending popularity to find your next project to build.",
    siteName: "Vibe Code Ideas",
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
      </body>
    </html>
  )
}
