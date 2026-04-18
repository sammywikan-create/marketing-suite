'use client'
import { Sparkles } from 'lucide-react'

interface AIInsightCardProps {
  insights: string[]
  loading: boolean
  onGenerate: () => void
}

export function AIInsightCard({ insights, loading, onGenerate }: AIInsightCardProps) {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-blue-600" />
          <h4 className="text-sm font-semibold text-blue-800">AI Insights</h4>
        </div>
        <button
          onClick={onGenerate}
          disabled={loading}
          className="text-xs px-3 py-1 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Generating...' : 'Generate'}
        </button>
      </div>
      {insights.length > 0 ? (
        <div className="space-y-2">
          {insights.map((ins, i) => (
            <p key={i} className="text-sm text-gray-700">{ins}</p>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-400">Klik Generate untuk mendapatkan insight AI otomatis dari data halaman ini.</p>
      )}
    </div>
  )
}
