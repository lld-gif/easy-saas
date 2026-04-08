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
    <div className={`flex flex-col items-center border rounded-lg py-1.5 w-[3.75rem] ${color}`}>
      <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="currentColor">
        <rect x="1" y="9" width="2.5" height="4" rx="0.5" opacity={bars >= 1 ? 1 : 0.2} />
        <rect x="5.5" y="6" width="2.5" height="7" rx="0.5" opacity={bars >= 2 ? 1 : 0.2} />
        <rect x="10" y="3" width="2.5" height="10" rx="0.5" opacity={bars >= 3 ? 1 : 0.2} />
      </svg>
      <span className="text-[10px] font-semibold mt-0.5">{label}</span>
    </div>
  )
}
