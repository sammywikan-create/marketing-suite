"use client";

import { useState, useCallback, useMemo } from "react";
import { Sparkles, RefreshCw, AlertCircle, ChevronDown, ChevronUp, Bot } from "lucide-react";
import { useAIStore } from "@/store/useAIStore";
import type { AffiliateMonthData } from "@/lib/types";

// ─── Props ──────────────────────────────────────────────
interface AffiliateAIInsightsCardProps {
  monthData: AffiliateMonthData | null;
  prevMonthData?: AffiliateMonthData | null;
  periodKey: string; // e.g. "2026-05:tiktok"
}

// ─── Cache ──────────────────────────────────────────────
const CACHE_KEY_PREFIX = "affiliate-ai-insight:";
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 menit

interface CachedInsight {
  content: string;
  generatedAt: number;
  periodKey: string;
}

function loadCached(key: string): CachedInsight | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY_PREFIX + key);
    if (!raw) return null;
    const parsed: CachedInsight = JSON.parse(raw);
    if (Date.now() - parsed.generatedAt > CACHE_TTL_MS) return null;
    return parsed;
  } catch { return null; }
}

function saveCached(key: string, content: string) {
  try {
    const item: CachedInsight = { content, generatedAt: Date.now(), periodKey: key };
    localStorage.setItem(CACHE_KEY_PREFIX + key, JSON.stringify(item));
  } catch { /* storage full */ }
}

// ─── Markdown renderer ──────────────────────────────────
function renderMarkdown(md: string): string {
  let html = md
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/^### (.+)$/gm, '<h4 class="text-sm font-bold text-violet-900 mt-3 mb-1">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="text-sm font-bold text-violet-900 mt-4 mb-1.5 pb-1 border-b border-violet-100">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 class="text-base font-bold text-violet-900 mt-4 mb-2">$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-sm text-gray-700 leading-relaxed">$1</li>');

  html = html.replace(/(<li[^>]*>.*?<\/li>(\n|$))+/g, (m) => `<ul class="space-y-0.5 my-1.5">${m}</ul>`);
  html = html.split(/\n\n+/).map((para) => {
    const trimmed = para.trim();
    if (!trimmed) return "";
    if (trimmed.startsWith("<")) return trimmed;
    return `<p class="text-sm text-gray-700 my-1.5 leading-relaxed">${trimmed.replace(/\n/g, "<br/>")}</p>`;
  }).join("\n");

  return html;
}

// ─── Build payload for API ──────────────────────────────
function buildPayload(data: AffiliateMonthData, prevData?: AffiliateMonthData | null) {
  const creators = data.creators || [];
  const s = data.summary;

  // Top 10 by GMV
  const topCreators = [...creators]
    .sort((a, b) => b.affiliateGMV - a.affiliateGMV)
    .slice(0, 10)
    .map(c => ({
      creatorUsername: c.creatorUsername,
      creatorTier: c.creatorTier,
      affiliateGMV: c.affiliateGMV,
      affiliateOrders: c.affiliateOrders,
      affiliateShoppableVideos: c.affiliateShoppableVideos,
      refundRate: c.refundRate,
      creatorScore: c.creatorScore,
      affiliateFollowers: c.affiliateFollowers,
    }));

  // Action items: high refund, dormant top, low score
  const actionItems: Array<{ creator: string; reason: string; severity: string }> = [];
  creators.forEach(c => {
    if (c.refundRate > 30 && c.affiliateGMV > 0) {
      actionItems.push({ creator: c.creatorUsername, reason: `Refund rate tinggi: ${c.refundRate.toFixed(1)}%`, severity: 'high' });
    } else if (c.affiliateGMV === 0 && c.affiliateShoppableVideos === 0) {
      actionItems.push({ creator: c.creatorUsername, reason: 'Tidak ada GMV & konten — dormant', severity: 'medium' });
    } else if (c.creatorScore < 40 && c.affiliateGMV > 500000) {
      actionItems.push({ creator: c.creatorUsername, reason: `Score rendah (${c.creatorScore}/100) padahal GMV signifikan`, severity: 'medium' });
    }
  });

  // Tier breakdown
  const tierBreakdown: Record<string, number> = {};
  creators.filter(c => c.affiliateGMV > 0).forEach(c => {
    tierBreakdown[c.creatorTier] = (tierBreakdown[c.creatorTier] || 0) + 1;
  });

  return {
    summary: {
      totalCreators: s.totalCreators,
      activeCreators: s.activeCreators,
      inactiveCreators: s.inactiveCreators,
      activeRate: s.activeRate,
      totalGMV: s.totalGMV,
      totalOrders: s.totalOrders,
      totalCommission: s.totalCommission,
      refundRate: s.refundRate,
      avgGMVPerCreator: s.avgGMVPerCreator,
      topCreator: s.topCreator,
      topCreatorGMV: s.topCreatorGMV,
    },
    topCreators,
    actionItems: actionItems.slice(0, 10),
    tierBreakdown,
    period: data.period,
    platform: data.platform,
    prevSummary: prevData?.summary ? {
      totalGMV: prevData.summary.totalGMV,
      activeCreators: prevData.summary.activeCreators,
      refundRate: prevData.summary.refundRate,
    } : undefined,
  };
}

// ─── Main Component ──────────────────────────────────────
export default function AffiliateAIInsightsCard({
  monthData,
  prevMonthData,
  periodKey,
}: AffiliateAIInsightsCardProps) {
  const aiSettings = useAIStore((s) => s.settings);

  const [insight, setInsight] = useState<string | null>(
    () => loadCached(periodKey)?.content || null
  );
  const [generatedAt, setGeneratedAt] = useState<number | null>(
    () => loadCached(periodKey)?.generatedAt || null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const hasData = !!monthData?.summary?.totalGMV;

  const modelLabel = useMemo(() => {
    switch (aiSettings.provider) {
      case 'ollama': return `Ollama · ${aiSettings.ollamaMode === 'cloud' ? 'Cloud' : 'Local'} · ${aiSettings.ollamaModel}`;
      case 'gemini': return `Gemini · ${aiSettings.geminiModel}`;
      case 'openrouter': return `OpenRouter · ${aiSettings.openrouterModel}`;
      default: return aiSettings.provider;
    }
  }, [aiSettings]);

  const generate = useCallback(async () => {
    if (!monthData) {
      setError("Data affiliate belum tersedia. Upload file terlebih dahulu.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setCollapsed(false);
    try {
      const payload = buildPayload(monthData, prevMonthData);
      const res = await fetch("/api/affiliate-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, settings: aiSettings }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal generate insight");
      if (!data.content?.trim()) throw new Error("AI memberikan respons kosong. Coba lagi atau ganti model.");
      setInsight(data.content);
      const now = Date.now();
      setGeneratedAt(now);
      saveCached(periodKey, data.content);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal generate insight AI";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [monthData, prevMonthData, aiSettings, periodKey]);

  return (
    <div className="bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 rounded-2xl border border-violet-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="bg-gradient-to-br from-violet-600 to-purple-600 text-white p-2 rounded-xl shadow-sm">
            <Bot size={15} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
              AI Insights Affiliate
              <span className="text-[10px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full font-medium">BETA</span>
            </h3>
            <p className="text-[10px] text-gray-500 mt-0.5">
              {generatedAt
                ? `Dianalisis ${new Date(generatedAt).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })} · ${modelLabel}`
                : modelLabel}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {insight && (
            <button
              onClick={() => setCollapsed(p => !p)}
              className="text-gray-400 hover:text-gray-600 p-1 rounded"
            >
              {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </button>
          )}
          <button
            onClick={generate}
            disabled={isLoading || !hasData}
            title={!hasData ? "Upload data affiliate terlebih dahulu" : ""}
            className="flex items-center gap-1.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-sm transition-all"
          >
            {isLoading ? (
              <><RefreshCw size={12} className="animate-spin" /> Menganalisis…</>
            ) : insight ? (
              <><RefreshCw size={12} /> Refresh</>
            ) : (
              <><Sparkles size={12} /> Analisis Kreator</>
            )}
          </button>
        </div>
      </div>

      {/* Body */}
      {!collapsed && (
        <div className="px-5 pb-5">
          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 text-xs px-3 py-2.5 rounded-xl flex items-start gap-2 mb-3">
              <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* No data state */}
          {!hasData && !error && (
            <div className="text-center py-5 bg-white/60 rounded-xl border border-violet-100">
              <Bot size={28} className="mx-auto text-violet-300 mb-2" />
              <p className="text-xs text-gray-500">Upload data affiliate untuk mengaktifkan AI Insights</p>
            </div>
          )}

          {/* Loading skeleton */}
          {isLoading && (
            <div className="space-y-2 mt-1">
              {[90, 75, 85, 60, 80].map((w, i) => (
                <div key={i} className="h-3 bg-violet-100 rounded-full animate-pulse" style={{ width: `${w}%` }} />
              ))}
              <p className="text-[10px] text-violet-400 mt-2 animate-pulse">AI sedang menganalisis data kreator…</p>
            </div>
          )}

          {/* Empty state (has data, not yet generated) */}
          {hasData && !insight && !isLoading && !error && (
            <div className="text-center py-5 bg-white/60 rounded-xl border border-violet-100">
              <Sparkles size={24} className="mx-auto text-violet-400 mb-2" />
              <p className="text-xs text-gray-600 font-medium mb-1">Siap dianalisis</p>
              <p className="text-[10px] text-gray-400 max-w-xs mx-auto">
                Klik <strong>Analisis Kreator</strong> untuk insight mendalam: top creator, refund alert, tier breakdown, dan rekomendasi aksi.
              </p>
            </div>
          )}

          {/* Content */}
          {insight && !isLoading && (
            <div
              className="prose prose-sm max-w-none text-gray-700 mt-1"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(insight) }}
            />
          )}
        </div>
      )}
    </div>
  );
}
