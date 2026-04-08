interface StatCardProps {
  label: string
  value: string | number
  sublabel?: string
  accent?: "blue" | "green" | "orange" | "red" | "gray"
}

const accentColors = {
  blue: "border-blue-500 bg-blue-500/10",
  green: "border-green-500 bg-green-500/10",
  orange: "border-orange-500 bg-orange-500/10",
  red: "border-red-500 bg-red-500/10",
  gray: "border-zinc-600 bg-zinc-800/50",
}

export function StatCard({ label, value, sublabel, accent = "gray" }: StatCardProps) {
  return (
    <div className={`rounded-lg border-l-4 p-4 ${accentColors[accent]}`}>
      <p className="text-sm font-medium text-zinc-400">{label}</p>
      <p className="mt-1 text-3xl font-bold text-zinc-100">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      {sublabel && <p className="mt-1 text-xs text-zinc-500">{sublabel}</p>}
    </div>
  )
}
