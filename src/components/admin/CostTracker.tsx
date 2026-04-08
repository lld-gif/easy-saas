interface CostTrackerProps {
  byCost: { source: string; ideas_extracted: number; estimated_cost: number }[]
  totalCost: number
}

export function CostTracker({ byCost, totalCost }: CostTrackerProps) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <h3 className="mb-1 text-sm font-semibold text-zinc-300">API Cost Estimate</h3>
      <p className="mb-4 text-xs text-zinc-500">Last 30 days · ~$0.001/idea via Claude Haiku</p>

      {byCost.length === 0 ? (
        <p className="text-sm text-zinc-500">No cost data available yet.</p>
      ) : (
        <>
          <div className="space-y-2">
            {byCost.map((item) => (
              <div key={item.source} className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">{item.source}</span>
                <div className="flex gap-4 text-right">
                  <span className="text-xs text-zinc-500">{item.ideas_extracted} ideas</span>
                  <span className="font-medium text-zinc-300">${item.estimated_cost.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 border-t border-zinc-800 pt-3 flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-300">Total (30d)</span>
            <span className="text-lg font-bold text-zinc-100">${totalCost.toFixed(2)}</span>
          </div>
        </>
      )}
    </div>
  )
}
