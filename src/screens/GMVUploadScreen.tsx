"use client";
import { useCallback, useState } from "react";
import { Upload, FileSpreadsheet, X, Loader2 } from "lucide-react";
import { useGMVStore } from "@/lib/gmvStore";
import { parseExcelData } from "@/utils/gmvAnalyzer";
import { useStoreManager } from "@/store/useStoreManager";
import { useRawFileStore } from "@/store/useRawFileStore";
import * as XLSX from "xlsx";

export default function GMVUploadScreen({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const { fileName, data, setData, setLoading, isLoading, clear } = useGMVStore();
  const { getActiveStore, saveGMVData } = useStoreManager();
  const activeStore = getActiveStore();
  const setRawFile = useRawFileStore((s) => s.setFile);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFile = useCallback((file: File) => {
    if (!file.name.match(/\.xlsx?$/i)) {
      setError("Format file tidak valid. Hanya file .xlsx atau .xls yang diterima.");
      return;
    }
    if (activeStore) setRawFile(activeStore.id, 'gmvMax', file);
    setError(null);
    setLoading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const arrayBuffer = e.target?.result;
        const workbook = XLSX.read(arrayBuffer, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[];
        const parsed = parseExcelData(rawData);

        if (parsed.length === 0) {
          setError("File tidak mengandung data yang valid. Pastikan kolom sesuai format TikTok Ads.");
          setLoading(false);
          return;
        }

        setData(file.name, parsed);
        if (activeStore) {
          const monthKey = new Date().toISOString().slice(0, 7);
          saveGMVData(activeStore.id, monthKey, { fileName: file.name, rows: parsed });
        }
      } catch {
        setError("Gagal membaca file. Pastikan file Excel valid.");
        setLoading(false);
      }
    };
    reader.onerror = () => {
      setError("Gagal membaca file.");
      setLoading(false);
    };
    reader.readAsArrayBuffer(file);
  }, [setData, setLoading]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  }, [processFile]);

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Upload size={32} className="text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Upload Data TikTok Ads</h1>
        <p className="text-sm text-muted mt-2">Upload file .xlsx dari TikTok Ads Manager untuk menganalisis performa campaign Anda.</p>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer ${
          dragOver ? "border-primary bg-primary-50 scale-[1.02]" : "border-border bg-white hover:border-primary/50"
        } ${isLoading ? "pointer-events-none opacity-60" : ""}`}
        onClick={() => !isLoading && document.getElementById("file-input")?.click()}
      >
        <input id="file-input" type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileInput} />

        {isLoading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={48} className="text-primary animate-spin" />
            <p className="text-lg font-medium text-foreground">Memproses file...</p>
            <p className="text-sm text-muted">Menganalisis data campaign Anda</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <FileSpreadsheet size={48} className="text-muted" />
            <p className="text-lg font-medium text-foreground">Drag & drop file Excel di sini</p>
            <p className="text-sm text-muted">atau klik untuk memilih file</p>
            <p className="text-xs text-muted mt-2">Format: .xlsx atau .xls</p>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-2">
          <X size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* File Info */}
      {fileName && data.length > 0 && (
        <div className="mt-6 bg-white rounded-xl border border-border p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                <FileSpreadsheet size={20} className="text-green-600" />
              </div>
              <div>
                <p className="font-medium text-foreground">{fileName}</p>
                <p className="text-sm text-muted">{data.length.toLocaleString("id-ID")} baris data berhasil diproses</p>
              </div>
            </div>
            <button onClick={clear} className="p-2 rounded-lg hover:bg-red-50 text-muted hover:text-red-600 transition-colors" title="Hapus data">
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border">
            <div className="text-center">
              <p className="text-xs text-muted">Campaign</p>
              <p className="font-semibold">{new Set(data.map(d => d.campaignName)).size}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted">Produk/SKU</p>
              <p className="font-semibold">{new Set(data.filter(d => d.productId).map(d => d.productId)).size}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted">Creative Types</p>
              <p className="font-semibold">{new Set(data.map(d => d.creativeType)).size}</p>
            </div>
          </div>

          <button
            onClick={() => onNavigate?.("gmv-dashboard")}
            className="w-full mt-4 px-4 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark transition-colors flex items-center justify-center gap-2"
          >
            🚀 Analisis Sekarang
          </button>
        </div>
      )}

      {/* Expected Columns */}
      <div className="mt-8 bg-white rounded-xl border border-border p-5 shadow-sm">
        <h3 className="font-semibold mb-3 text-sm">Kolom yang Diharapkan:</h3>
        <div className="flex flex-wrap gap-1.5">
          {[
            "Campaign name", "Campaign ID", "Product ID", "Creative type", "Video title",
            "Video ID", "TikTok account", "Time posted", "Status", "Cost", "SKU orders",
            "Cost per order", "Gross revenue", "ROI", "Product ad impressions",
            "Product ad clicks", "Product ad click rate", "Ad conversion rate",
            "2-second ad video view rate", "6-second ad video view rate", "Currency"
          ].map(col => (
            <span key={col} className="px-2 py-1 bg-gray-100 text-xs text-muted rounded">{col}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
