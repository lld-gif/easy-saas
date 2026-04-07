interface DifficultyBadgeProps {
  difficulty: number
}

function getLevel(d: number): { label: string; color: string } {
  if (d <= 2) return { label: "Easy", color: "text-emerald-600 border-emerald-200 bg-emerald-50" }
  if (d <= 3) return { label: "Medium", color: "text-amber-600 border-amber-200 bg-amber-50" }
  return { label: "Hard", color: "text-red-600 border-red-200 bg-red-50" }
}

export function DifficultyBadge({ difficulty }: DifficultyBadgeProps) {
  const { label, color } = getLevel(difficulty)

  return (
    <div className={`flex flex-col items-center border rounded-lg px-3 py-1.5 min-w-[3rem] ${color}`}>
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
      <span className="text-[10px] font-semibold mt-0.5">{label}</span>
    </div>
  )
}
