interface BarChartProps {
  data: { label: string; value: number; color?: string }[]
  title: string
  maxBars?: number
}

const defaultColors = [
  "bg-blue-500", "bg-green-500", "bg-orange-500", "bg-purple-500",
  "bg-red-500", "bg-teal-500", "bg-pink-500", "bg-indigo-500",
  "bg-yellow-500", "bg-cyan-500", "bg-emerald-500", "bg-rose-500",
  "bg-amber-500", "bg-lime-500",
]

export function BarChart({ data, title, maxBars = 14 }: BarChartProps) {
  const items = data.slice(0, maxBars)
  const maxValue = Math.max(...items.map((d) => d.value), 1)
  const total = items.reduce((sum, d) => sum + d.value, 0)

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="mb-4 text-sm font-semibold text-gray-700">{title}</h3>
      <div className="space-y-2">
        {items.map((item, i) => {
          const pct = Math.round((item.value / total) * 100)
          const width = Math.max((item.value / maxValue) * 100, 2)
          return (
            <div key={item.label} className="flex items-center gap-3">
              <span className="w-28 shrink-0 truncate text-xs text-gray-500">
                {item.label}
              </span>
              <div className="relative flex-1 h-5 rounded bg-gray-100">
                <div
                  className={`h-5 rounded ${item.color || defaultColors[i % defaultColors.length]}`}
                  style={{ width: `${width}%` }}
                />
              </div>
              <span className="w-16 shrink-0 text-right text-xs font-medium text-gray-700">
                {item.value} ({pct}%)
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
