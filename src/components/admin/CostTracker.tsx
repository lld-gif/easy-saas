interface CostTrackerProps {
  byCost: { source: string; ideas_extracted: number; estimated_cost: number }[]
  totalCost: number
}

export function CostTracker({ byCost, totalCost }: CostTrackerProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="mb-1 text-sm font-semibold text-gray-700">API Cost Estimate</h3>
      <p className="mb-4 text-xs text-gray-400">Last 30 days · ~$0.001/idea via Claude Haiku</p>

      {byCost.length === 0 ? (
        <p className="text-sm text-gray-400">No cost data available yet.</p>
      ) : (
        <>
          <div className="space-y-2">
            {byCost.map((item) => (
              <div key={item.source} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{item.source}</span>
                <div className="flex gap-4 text-right">
                  <span className="text-xs text-gray-400">{item.ideas_extracted} ideas</span>
                  <span className="font-medium text-gray-700">${item.estimated_cost.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 border-t pt-3 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Total (30d)</span>
            <span className="text-lg font-bold text-gray-900">${totalCost.toFixed(2)}</span>
          </div>
        </>
      )}
    </div>
  )
}
