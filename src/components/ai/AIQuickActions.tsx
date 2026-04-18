'use client'

interface AIQuickActionsProps {
  actions: { label: string; prompt: string }[]
  onSelect: (prompt: string) => void
  disabled?: boolean
}

export function AIQuickActions({ actions, onSelect, disabled }: AIQuickActionsProps) {
  if (actions.length === 0) return null

  return (
    <div className="px-4 py-2 border-t border-gray-100">
      <p className="text-xs text-gray-400 mb-2">⚡ Quick Actions</p>
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {actions.map((qa, i) => (
          <button
            key={i}
            onClick={() => onSelect(qa.prompt)}
            disabled={disabled}
            className="whitespace-nowrap text-xs px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 disabled:opacity-50 transition-colors border border-blue-200"
          >
            {qa.label}
          </button>
        ))}
      </div>
    </div>
  )
}
