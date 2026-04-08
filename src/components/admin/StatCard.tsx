interface StatCardProps {
  label: string
  value: string | number
  sublabel?: string
  accent?: "blue" | "green" | "orange" | "red" | "gray"
}

const accentColors = {
  blue: "border-blue-500 bg-blue-50",
  green: "border-green-500 bg-green-50",
  orange: "border-orange-500 bg-orange-50",
  red: "border-red-500 bg-red-50",
  gray: "border-gray-300 bg-gray-50",
}

export function StatCard({ label, value, sublabel, accent = "gray" }: StatCardProps) {
  return (
    <div className={`rounded-lg border-l-4 p-4 ${accentColors[accent]}`}>
      <p className="text-sm font-medium text-gray-600">{label}</p>
      <p className="mt-1 text-3xl font-bold text-gray-900">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      {sublabel && <p className="mt-1 text-xs text-gray-500">{sublabel}</p>}
    </div>
  )
}
