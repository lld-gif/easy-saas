import { ImageResponse } from "next/og"

export const runtime = "edge"
export const alt = "Vibe Code Ideas — Discover Your Next SaaS Idea"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#09090b",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
            marginBottom: "32px",
          }}
        >
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "16px",
              background: "#f97316",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "40px",
              fontWeight: 700,
              color: "#fff",
            }}
          >
            &lt;/&gt;
          </div>
          <div style={{ display: "flex", fontSize: "48px", fontWeight: 700 }}>
            <span style={{ color: "#f97316" }}>Vibe</span>
            <span style={{ color: "#fafafa" }}>Code Ideas</span>
          </div>
        </div>
        <div
          style={{
            fontSize: "28px",
            color: "#a1a1aa",
            maxWidth: "700px",
            textAlign: "center",
            lineHeight: 1.4,
          }}
        >
          AI-curated SaaS ideas ranked by demand signals. Ready to build.
        </div>
      </div>
    ),
    { ...size }
  )
}
