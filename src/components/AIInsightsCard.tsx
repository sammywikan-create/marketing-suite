"use client";

import { useState, useCallback } from "react";
import { Sparkles, RefreshCw, AlertCircle } from "lucide-react";
import { useAIStore } from "@/store/useAIStore";

interface AIInsightsCardProps {
  // Snapshot of current period's data — passed by parent
  snapshot: unknown | null;
  // Optional previous month snapshot for MoM analysis
  prevSnapshot?: unknown;
  // Target for current period
  target?: number;
  // Period label for caching key, e.g. "2026-02"
  periodKey: string;
}

interface CachedInsight {
  content: string;
  generatedAt: number;
  periodKey: string;
}

const CACHE_KEY_PREFIX = "ai-insight:";
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

function loadCached(periodKey: string): CachedInsight | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY_PREFIX + periodKey);
    if (!raw) return null;
    const parsed: CachedInsight = JSON.parse(raw);
    if (Date.now() - parsed.generatedAt > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveCached(periodKey: string, content: string) {
  try {
    const item: CachedInsight = { content, generatedAt: Date.now(), periodKey };
    localStorage.setItem(CACHE_KEY_PREFIX + periodKey, JSON.stringify(item));
  } catch {}
}

// Convert simple markdown (## headings, ** bold, lists) to HTML for safe display
function renderMarkdown(md: string): string {
  let html = md
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    // headings
    .replace(/^### (.+)$/gm, '<h4 class="text-sm font-bold text-gray-900 mt-3 mb-1">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="text-base font-bold text-gray-900 mt-4 mb-2 flex items-center gap-1.5">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 class="text-lg font-bold text-gray-900 mt-4 mb-2">$1</h2>')
    // bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // bullet lists
    .replace(/^- (.+)$/gm, '<li class="ml-5 list-disc text-sm text-gray-700">$1</li>');

  // wrap consecutive <li> in <ul>
  html = html.replace(/(<li[^>]*>.*?<\/li>(\n|$))+/g, (m) => `<ul class="space-y-0.5 my-1.5">${m}</ul>`);

  // wrap remaining text in <p>
  html = html.split(/\n\n+/).map((para) => {
    const trimmed = para.trim();
    if (!trimmed) return "";
    if (trimmed.startsWith("<")) return trimmed;
    return `<p class="text-sm text-gray-700 my-1.5 leading-relaxed">${trimmed.replace(/\n/g, "<br/>")}</p>`;
  }).join("\n");

  return html;
}

export default function AIInsightsCard({ snapshot, prevSnapshot, target, periodKey }: AIInsightsCardProps) {
  const aiSettings = useAIStore((s) => s.settings);
  const [insight, setInsight] = useState<string | null>(() => loadCached(periodKey)?.content || null);
  const [generatedAt, setGeneratedAt] = useState<number | null>(() => loadCached(periodKey)?.generatedAt || null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async () => {
    if (!snapshot) {
      setError("Data belum tersedia. Tunggu data laporan harian dimuat.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      console.log('[AIInsightsCard] Generating insight...');
      console.log('[AIInsightsCard] Provider:', aiSettings.provider, 'Model:', aiSettings.provider === 'ollama' ? aiSettings.ollamaModel : aiSettings.geminiModel);
      const res = await fetch("/api/ai-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snapshot, prevSnapshot, target, settings: aiSettings }),
      });
      const data = await res.json();
      console.log('[AIInsightsCard] Response status:', res.status, 'content length:', data.content?.length || 0);
      if (!res.ok) throw new Error(data.error || "Gagal generate insight");
      if (!data.content || data.content.trim().length === 0) {
        throw new Error("AI memberikan respons kosong. Coba generate ulang atau ganti model.");
      }
      setInsight(data.content);
      const now = Date.now();
      setGeneratedAt(now);
      saveCached(periodKey, data.content);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal generate insight AI";
      console.error('[AIInsightsCard] Error:', msg);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [snapshot, prevSnapshot, target, aiSettings, periodKey]);

  return (
    <div className="bg-gradient-to-br from-violet-50 to-blue-50 rounded-2xl border border-violet-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="bg-violet-600 text-white p-1.5 rounded-lg">
            <Sparkles size={14} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">AI Insights</h3>
            <p className="text-[10px] text-gray-500">
              {generatedAt
                ? `Generated ${new Date(generatedAt).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })} · ${aiSettings.provider}`
                : `Provider: ${aiSettings.provider}`}
            </p>
          </div>
        </div>
        <button
          onClick={generate}
          disabled={isLoading}
          className="flex items-center gap-1.5 bg-white border border-violet-200 hover:bg-violet-50 disabled:opacity-50 px-3 py-1.5 rounded-lg text-xs font-medium text-violet-700"
        >
          {isLoading ? (
            <>
              <RefreshCw size={12} className="animate-spin" /> Menganalisis…
            </>
          ) : insight ? (
            <>
              <RefreshCw size={12} /> Refresh
            </>
          ) : (
            <>
              <Sparkles size={12} /> Generate Insight
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-xs px-3 py-2 rounded-lg flex items-start gap-2 mb-3">
          <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {insight ? (
        <div
          className="prose prose-sm max-w-none text-gray-700"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(insight) }}
        />
      ) : !isLoading && !error ? (
        <div className="text-center py-6">
          <p className="text-xs text-gray-500 mb-2">
            Klik <strong>Generate Insight</strong> untuk dapatkan analisis AI berbasis data {periodKey}.
          </p>
          <p className="text-[10px] text-gray-400">
            AI akan menganalisis performa channel, anomali, target, dan memberikan rekomendasi actionable.
          </p>
        </div>
      ) : null}

      {isLoading && (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-3 bg-violet-100 rounded animate-pulse" style={{ width: `${85 - i * 10}%` }} />
          ))}
        </div>
      )}
    </div>
  );
}
