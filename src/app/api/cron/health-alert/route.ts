import { NextResponse } from "next/server"
import { Resend } from "resend"
import { getPlatformHealth, type PlatformHealth } from "@/lib/admin-queries"

export const dynamic = "force-dynamic"

/**
 * GET /api/cron/health-alert
 *
 * Called by Vercel Cron every 6 hours. Inspects the per-platform
 * pipeline health view and fires a single email digest if any
 * platform is in `degraded`, `stale`, or `broken` state.
 *
 * Deliberately operates on the DB-derived health_state rather than
 * re-implementing the threshold logic here — the view is the single
 * source of truth. This keeps the email + the /admin widget
 * perfectly in sync with each other.
 *
 * Safety rails:
 * - Protected by CRON_SECRET header. Vercel's scheduler sends it
 *   automatically; manual callers need `Authorization: Bearer <secret>`.
 * - No-ops when ADMIN_ALERT_EMAIL is unset (preview envs, forgotten
 *   config). Logs and returns 200 with `sent: false, reason: "no-recipient"`.
 * - No-ops when RESEND_API_KEY is unset. Same treatment.
 * - Digests one email per cron tick even with multiple bad platforms.
 *   Does NOT deduplicate across ticks — if the same platform is
 *   broken for a week, the operator gets an email every 6h for a
 *   week. Acceptable because (a) the problem IS serious and (b) we
 *   don't have persistent alert state yet. A future improvement
 *   could track "last notified at" per platform to throttle.
 */
export async function GET(request: Request) {
  // Auth — Vercel Cron includes the secret as `Authorization: Bearer ...`.
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 503 }
    )
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const rows = await getPlatformHealth()
  const alerts = rows.filter((r) =>
    ["degraded", "stale", "broken"].includes(r.health_state)
  )

  if (alerts.length === 0) {
    return NextResponse.json({
      sent: false,
      reason: "all-healthy",
      total_platforms: rows.length,
    })
  }

  const resendKey = process.env.RESEND_API_KEY
  const alertEmail = process.env.ADMIN_ALERT_EMAIL
  if (!resendKey) {
    console.warn("[health-alert] RESEND_API_KEY not set — skipping send")
    return NextResponse.json({
      sent: false,
      reason: "no-resend-key",
      would_alert_on: alerts.map((a) => a.source_platform),
    })
  }
  if (!alertEmail) {
    console.warn("[health-alert] ADMIN_ALERT_EMAIL not set — skipping send")
    return NextResponse.json({
      sent: false,
      reason: "no-recipient",
      would_alert_on: alerts.map((a) => a.source_platform),
    })
  }

  const resend = new Resend(resendKey)
  const { subject, text, html } = buildEmail(alerts)

  try {
    await resend.emails.send({
      from: "VCI Alerts <alerts@resend.dev>",
      to: alertEmail,
      subject,
      text,
      html,
    })
  } catch (err) {
    console.error("[health-alert] Resend send failed:", err)
    return NextResponse.json(
      {
        sent: false,
        reason: "send-failed",
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    )
  }

  return NextResponse.json({
    sent: true,
    recipient: alertEmail,
    platforms: alerts.map((a) => ({
      name: a.source_platform,
      state: a.health_state,
      consecutive_failures: a.consecutive_failures,
    })),
  })
}

function buildEmail(alerts: PlatformHealth[]): {
  subject: string
  text: string
  html: string
} {
  const brokenCount = alerts.filter((a) => a.health_state === "broken").length
  const staleCount = alerts.filter((a) => a.health_state === "stale").length
  const degradedCount = alerts.filter((a) => a.health_state === "degraded").length

  const subject =
    brokenCount > 0
      ? `🔴 VCI pipeline — ${brokenCount} broken, ${staleCount + degradedCount} other issue${staleCount + degradedCount === 1 ? "" : "s"}`
      : staleCount > 0
        ? `🟠 VCI pipeline — ${staleCount} stale, ${degradedCount} degraded`
        : `🟡 VCI pipeline — ${degradedCount} degraded`

  const textLines: string[] = []
  textLines.push(`VCI pipeline health alert — ${new Date().toISOString()}`)
  textLines.push("")
  textLines.push("Platforms needing attention:")
  textLines.push("")
  for (const a of alerts) {
    const mins = a.minutes_since_last_run
    const sinceStr =
      mins === null
        ? "never"
        : mins < 60
          ? `${mins}m`
          : mins < 1440
            ? `${Math.round(mins / 60)}h`
            : `${Math.round(mins / 1440)}d`
    textLines.push(`- ${a.source_platform} [${a.health_state}]`)
    textLines.push(
      `    last run: ${sinceStr} ago  ·  streak: ${a.consecutive_failures} fail${a.consecutive_failures === 1 ? "" : "s"}  ·  7d: ${a.successful_runs_7d}/${a.total_runs_7d} runs, ${a.total_new_ideas_7d} new ideas`
    )
    if (a.zero_post_runs_7d > 0 && a.zero_post_runs_7d === a.total_runs_7d) {
      textLines.push(
        `    ⚠️  All 7d runs returned 0 posts — upstream block/auth/config likely`
      )
    }
    if (a.last_error_message) {
      textLines.push(`    error: ${a.last_error_message.slice(0, 200)}`)
    }
    textLines.push("")
  }
  textLines.push("Admin: https://vibecodeideas.ai/admin")

  const text = textLines.join("\n")
  // Minimal HTML — the text body is the primary payload. Keeps the
  // email small and ensures it renders correctly regardless of the
  // recipient's client.
  const html = `<div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap;padding:16px">${text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")}</div>`

  return { subject, text, html }
}
