interface QualityCardsProps {
  totalIdeas: number
  missingEnrichment: number
  lowMentions: number
  defaultDifficulty: number
}

function QualityItem({
  label,
  count,
  total,
}: {
  label: string
  count: number
  total: number
  severity: "low" | "medium" | "high"
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  const colors = {
    low: "text-green-700 bg-green-50",
    medium: "text-yellow-700 bg-yellow-50",
    high: "text-red-700 bg-red-50",
  }
  const severityLevel = pct > 50 ? "high" : pct > 25 ? "medium" : "low"

  return (
    <div className={`flex items-center justify-between rounded-lg p-3 ${colors[severityLevel]}`}>
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs opacity-75">{count} of {total} ideas</p>
      </div>
      <span className="text-2xl font-bold">{pct}%</span>
    </div>
  )
}

export function QualityCards({ totalIdeas, missingEnrichment, lowMentions, defaultDifficulty }: QualityCardsProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="mb-4 text-sm font-semibold text-gray-700">Data Quality</h3>
      <div className="space-y-2">
        <QualityItem
          label="Missing enrichment data"
          count={missingEnrichment}
          total={totalIdeas}
          severity="medium"
        />
        <QualityItem
          label="Low mention count (≤1)"
          count={lowMentions}
          total={totalIdeas}
          severity="low"
        />
        <QualityItem
          label="Default difficulty (3)"
          count={defaultDifficulty}
          total={totalIdeas}
          severity="low"
        />
      </div>
    </div>
  )
}
