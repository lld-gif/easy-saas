interface MentionBadgeProps {
  count: number
}

export function MentionBadge({ count }: MentionBadgeProps) {
  return (
    <div className="flex flex-col items-center border border-gray-200 rounded-lg px-3 py-1.5 hover:border-gray-300 transition-colors min-w-[3rem]">
      <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
      <span className="text-xs font-semibold text-gray-700">{count}</span>
    </div>
  )
}
