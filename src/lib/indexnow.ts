/**
 * IndexNow client. Notifies participating search engines (Bing, Yandex,
 * Seznam, Naver, Mojeek, and others) that a URL on vibecodeideas.ai has
 * been created or updated, so they can refresh their index within minutes
 * instead of whenever their own crawler decides to return.
 *
 * Since Bing feeds Microsoft Copilot, an IndexNow ping is currently our
 * fastest path from "new idea inserted" to "Copilot can cite it."
 *
 * Usage:
 *   import { pingIndexNow } from "@/lib/indexnow"
 *   await pingIndexNow(`https://vibecodeideas.ai/ideas/${idea.slug}`)
 *
 * Fire-and-forget semantics: pingIndexNow always resolves successfully
 * and logs internally on failure. We don't want a flaky third-party API
 * to break idea ingestion.
 */

const INDEXNOW_KEY = "5436c73b9397607f618476f0877477ca"
const INDEXNOW_HOST = "vibecodeideas.ai"
const INDEXNOW_KEY_LOCATION = `https://${INDEXNOW_HOST}/${INDEXNOW_KEY}.txt`

// IndexNow has a handful of endpoints (api.indexnow.org, bing.com,
// yandex.com). Pinging api.indexnow.org shares the notification with all
// participating engines, which is what we want — single POST, many
// downstream consumers.
const INDEXNOW_ENDPOINT = "https://api.indexnow.org/IndexNow"

export interface IndexNowResult {
  ok: boolean
  status: number
  error?: string
}

/**
 * Ping IndexNow with one or more URLs. Returns a shallow status object
 * for logging; never throws. Safe to call without awaiting if you don't
 * care about the result.
 */
export async function pingIndexNow(
  urls: string | string[]
): Promise<IndexNowResult> {
  const urlList = Array.isArray(urls) ? urls : [urls]
  if (urlList.length === 0) {
    return { ok: true, status: 0 }
  }

  // Validate every URL is on the verified host. IndexNow rejects the
  // whole batch if any URL is off-domain, so we guard eagerly.
  for (const url of urlList) {
    try {
      const parsed = new URL(url)
      if (parsed.host !== INDEXNOW_HOST) {
        return {
          ok: false,
          status: 0,
          error: `URL ${url} is not on host ${INDEXNOW_HOST}`,
        }
      }
    } catch (e) {
      return {
        ok: false,
        status: 0,
        error: `URL ${url} failed to parse: ${e instanceof Error ? e.message : String(e)}`,
      }
    }
  }

  try {
    const res = await fetch(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        host: INDEXNOW_HOST,
        key: INDEXNOW_KEY,
        keyLocation: INDEXNOW_KEY_LOCATION,
        urlList,
      }),
    })

    // IndexNow returns 200 (accepted) or 202 (pending) on success.
    // 4xx = bad request (most commonly a key mismatch or off-domain URL).
    // We treat 200/202 as success, anything else as soft-failure (log, no throw).
    if (res.status === 200 || res.status === 202) {
      return { ok: true, status: res.status }
    }

    const text = await res.text().catch(() => "")
    return {
      ok: false,
      status: res.status,
      error: text.slice(0, 200),
    }
  } catch (e) {
    return {
      ok: false,
      status: 0,
      error: e instanceof Error ? e.message : String(e),
    }
  }
}
