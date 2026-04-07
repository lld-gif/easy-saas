import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
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
  title: "EasySaaS — Discover Your Next SaaS Idea",
  description:
    "We scan Twitter, Reddit, HN, and 5 more sources daily to find SaaS ideas you can build.",
  openGraph: {
    title: "EasySaaS — Discover Your Next SaaS Idea",
    description:
      "We scan Twitter, Reddit, HN, and 5 more sources daily to find SaaS ideas you can build.",
    siteName: "EasySaaS",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-screen flex flex-col bg-background text-foreground">
        <Navbar />
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  )
}
