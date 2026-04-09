"use client"

interface DailyChartProps {
  data: { date: string; count: number }[]
  title: string
}

export function DailyChart({ data, title }: DailyChartProps) {
  const maxCount = Math.max(...data.map((d) => d.count), 1)
  const chartHeight = 160

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="mb-4 text-sm font-semibold text-gray-700">{title}</h3>
      <div className="relative" style={{ height: chartHeight + 40 }}>
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 flex h-full w-8 flex-col justify-between text-xs text-gray-400">
          <span>{maxCount}</span>
          <span>{Math.round(maxCount / 2)}</span>
          <span>0</span>
        </div>

        {/* Chart area */}
        <svg
          className="ml-10"
          width="calc(100% - 40px)"
          height={chartHeight + 24}
          viewBox={`0 0 ${data.length * 20} ${chartHeight + 24}`}
          preserveAspectRatio="none"
        >
          {/* Grid lines */}
          <line x1="0" y1={chartHeight} x2={data.length * 20} y2={chartHeight} stroke="#e5e7eb" strokeWidth="1" />
          <line x1="0" y1={chartHeight / 2} x2={data.length * 20} y2={chartHeight / 2} stroke="#e5e7eb" strokeWidth="0.5" strokeDasharray="4" />

          {/* Bars */}
          {data.map((d, i) => {
            const barHeight = (d.count / maxCount) * chartHeight
            const x = i * 20 + 2
            const y = chartHeight - barHeight

            return (
              <g key={d.date}>
                <rect
                  x={x}
                  y={y}
                  width={16}
                  height={barHeight}
                  rx={2}
                  className="fill-indigo-400 hover:fill-indigo-500"
                />
                {/* Show label for every 5th day */}
                {i % 5 === 0 && (
                  <text
                    x={x + 8}
                    y={chartHeight + 14}
                    textAnchor="middle"
                    className="fill-gray-400"
                    fontSize="7"
                  >
                    {d.date.slice(5)}
                  </text>
                )}
                {/* Tooltip on hover — count above bar */}
                {d.count > 0 && (
                  <text
                    x={x + 8}
                    y={y - 3}
                    textAnchor="middle"
                    className="fill-gray-500 opacity-0 hover:opacity-100"
                    fontSize="6"
                  >
                    {d.count}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      {/* Summary */}
      <div className="mt-2 flex gap-4 text-xs text-gray-400">
        <span>Total: {data.reduce((s, d) => s + d.count, 0)}</span>
        <span>Avg: {Math.round(data.reduce((s, d) => s + d.count, 0) / data.length)}/day</span>
        <span>Peak: {maxCount}</span>
      </div>
    </div>
  )
}
