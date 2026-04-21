#!/usr/bin/env node
/**
 * One-off script to capture launch screenshots against the live prod site.
 *
 * Writes PNGs into docs/screenshots/ so launch-content.md can reference them.
 * Uses Playwright (npx), which ships with bundled Chromium, so nothing else
 * needs to be installed.
 *
 * Run: node scripts/capture-launch-screenshots.mjs
 */

import { chromium } from "playwright"
import { mkdir } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import path from "node:path"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.join(__dirname, "..", "docs", "screenshots")
const BASE = process.env.VCI_SCREENSHOT_BASE || "https://vibecodeideas.ai"

// Trending slug that will have visible Popular badge + Medium difficulty +
// commentary. This matches a real idea we verified in the mobile walkthrough.
const DETAIL_SLUG = "pilot-flight-logbook-visualizer-mnp2enci"

// Each shot: {name, viewport, path, scroll?, fullPage?}
const SHOTS = [
  { name: "01-home-desktop",           viewport: { width: 1440, height: 900 },   url: "/" },
  { name: "02-ideas-desktop",          viewport: { width: 1440, height: 900 },   url: "/ideas" },
  { name: "03-ideas-fresh-desktop",    viewport: { width: 1440, height: 900 },   url: "/ideas?sort=fresh" },
  { name: "04-detail-desktop",         viewport: { width: 1440, height: 900 },   url: `/ideas/${DETAIL_SLUG}`, fullPage: true },
  { name: "05-ideas-revenue-desktop",  viewport: { width: 1440, height: 900 },   url: "/ideas?sort=revenue&revenue=25k" },
  { name: "06-home-mobile",            viewport: { width: 375,  height: 812 },   url: "/" },
  { name: "07-ideas-mobile",           viewport: { width: 375,  height: 812 },   url: "/ideas" },
  { name: "08-detail-mobile",          viewport: { width: 375,  height: 812 },   url: `/ideas/${DETAIL_SLUG}`, fullPage: true },
]

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  const browser = await chromium.launch()
  try {
    for (const shot of SHOTS) {
      const context = await browser.newContext({
        viewport: shot.viewport,
        deviceScaleFactor: 2,  // retina-quality for the PH gallery.
      })
      const page = await context.newPage()
      const url = BASE + shot.url
      console.log(`→ ${shot.name}  ${url}  ${shot.viewport.width}x${shot.viewport.height}${shot.fullPage ? "  fullPage" : ""}`)
      await page.goto(url, { waitUntil: "networkidle", timeout: 30000 })
      // Give any client-rendered stars / Vercel Analytics / hydration a
      // moment so the hero renders with its final state.
      await page.waitForTimeout(1500)
      const outPath = path.join(OUT_DIR, `${shot.name}.png`)
      await page.screenshot({ path: outPath, fullPage: !!shot.fullPage })
      await context.close()
    }
  } finally {
    await browser.close()
  }
  console.log(`\nDone. ${SHOTS.length} screenshots in docs/screenshots/`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
