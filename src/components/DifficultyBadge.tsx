interface DifficultyBadgeProps {
  difficulty: number
}

function getLevel(d: number): { label: string; color: string; bars: number } {
  if (d <= 2) return { label: "Easy", color: "text-emerald-600 border-emerald-200 bg-emerald-50", bars: 1 }
  if (d <= 3) return { label: "Medium", color: "text-amber-600 border-amber-200 bg-amber-50", bars: 2 }
  return { label: "Hard", color: "text-red-600 border-red-200 bg-red-50", bars: 3 }
}

export function DifficultyBadge({ difficulty }: DifficultyBadgeProps) {
  const { label, color, bars } = getLevel(difficulty)

  return (
    <div className={`flex flex-col items-center border rounded-lg px-3 py-1.5 min-w-[3rem] ${color}`}>
      <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
        <rect x="1" y="10" width="3" height="5" rx="0.5" opacity={bars >= 1 ? 1 : 0.2} />
        <rect x="6.5" y="6" width="3" height="9" rx="0.5" opacity={bars >= 2 ? 1 : 0.2} />
        <rect x="12" y="2" width="3" height="13" rx="0.5" opacity={bars >= 3 ? 1 : 0.2} />
      </svg>
      <span className="text-[10px] font-semibold mt-0.5">{label}</span>
    </div>
  )
}
