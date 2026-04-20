"use client";
import { useState, useCallback, useRef } from "react";
import { parseProductCardExcel, FILE_TYPE_LABELS } from "@/lib/product-card/parser";
import type { ExcelFileType } from "@/lib/product-card/parser";
import { upsertProductCards, upsertProductStats, upsertDailyTraffic, logImport } from "@/lib/product-card/queries";
import { Upload, X, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface ParsedFile {
  filename: string;
  fileType: ExcelFileType | string;
  label: string;
  period?: string;
  rowCount: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parsed: any;
  error?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ParsedFileResult {
  fileType: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[];
  filename: string;
  period_start?: string;
  period_end?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  storeId: string;
  storeName: string;
  onImportDone: () => void;
  onParsedData?: (results: ParsedFileResult[]) => void;
}

export default function UploadExcelModal({ open, onClose, storeId, storeName, onImportDone, onParsedData }: Props) {
  const [files, setFiles] = useState<ParsedFile[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (fileList: FileList | null) => {
    if (!fileList) return;
    const newFiles: ParsedFile[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const parsed: any = await parseProductCardExcel(file);
        const period = parsed.period_start
          ? `${parsed.period_start} ~ ${parsed.period_end}`
          : parsed.data?.[0]?.date
          ? `${parsed.data[0].date} ~ ${parsed.data[parsed.data.length - 1]?.date}`
          : "";
        newFiles.push({
          filename: file.name,
          fileType: parsed.fileType,
          label: FILE_TYPE_LABELS[parsed.fileType as ExcelFileType] || parsed.fileType,
          period,
          rowCount: parsed.data?.length || 0,
          parsed,
        });
      } catch (err) {
        newFiles.push({
          filename: file.name,
          fileType: "UNKNOWN",
          label: FILE_TYPE_LABELS.UNKNOWN,
          rowCount: 0,
          parsed: null,
          error: err instanceof Error ? err.message : "Gagal parse file",
        });
      }
    }
    setFiles((prev) => [...prev, ...newFiles]);
    setImportResult("");
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const validFiles = files.filter((f) => !f.error && f.parsed);

  const handleImport = useCallback(async () => {
    if (validFiles.length === 0) return;
    setImporting(true);
    setImportResult("");
    let totalRows = 0;
    let imported = 0;

    try {
      for (const f of validFiles) {
        const p = f.parsed;
        const ft = p.fileType;

        if (ft === "PRODUCT_CARD_LIST" || ft === "SHOP_TAB_PRODUCT") {
          await upsertProductCards(storeId, p.data.map((d: { product_id: string; product_name: string }) => ({
            product_id: d.product_id, product_name: d.product_name,
          })));
          await upsertProductStats(storeId, p.data);
        } else {
          await upsertDailyTraffic(storeId, p.data);
        }

        await logImport(storeId, f.filename, ft, p.data.length);
        totalRows += p.data.length;
        imported++;
      }

      setImportResult(`✅ ${imported} file berhasil diimport (${totalRows.toLocaleString("id-ID")} baris data)`);

      // Pass parsed data to parent for immediate local-state display
      if (onParsedData) {
        onParsedData(validFiles.map(f => ({
          fileType: f.parsed.fileType,
          data: f.parsed.data,
          filename: f.filename,
          period_start: f.parsed.period_start,
          period_end: f.parsed.period_end,
        })));
      }

      onImportDone();
    } catch (err) {
      setImportResult(`❌ Error: ${err instanceof Error ? err.message : "Gagal import"}`);
    } finally {
      setImporting(false);
    }
  }, [validFiles, storeId, onImportDone]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">📤 Upload Data Kartu Produk</h3>
            <p className="text-xs text-gray-400 mt-0.5">Toko: <strong>{storeName}</strong></p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-blue-300 rounded-xl p-8 text-center cursor-pointer hover:bg-blue-50 transition mb-4"
        >
          <Upload size={32} className="mx-auto text-blue-400 mb-2" />
          <p className="text-sm font-medium text-blue-700">Drag & drop file Excel di sini</p>
          <p className="text-xs text-gray-400 mt-1">atau klik untuk pilih (hingga 5 file sekaligus)</p>
          <p className="text-[10px] text-gray-300 mt-1">Format: .xlsx dari TikTok Seller Center</p>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            multiple
            className="hidden"
            onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
          />
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="space-y-2 mb-4">
            <p className="text-xs font-medium text-gray-500">File terdeteksi:</p>
            {files.map((f, i) => (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border text-xs ${f.error ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}>
                <div className="mt-0.5">
                  {f.error ? <AlertCircle size={16} className="text-red-500" /> : <CheckCircle2 size={16} className="text-green-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">{f.filename}</div>
                  {f.error ? (
                    <div className="text-red-500 mt-0.5">⚠️ {f.error}</div>
                  ) : (
                    <>
                      <div className="text-gray-600">→ {f.label}{f.period ? ` (${f.period})` : ""}</div>
                      <div className="text-gray-400">→ {f.rowCount} baris data</div>
                    </>
                  )}
                </div>
                <button onClick={() => removeFile(i)} className="p-0.5 hover:bg-white rounded">
                  <X size={14} className="text-gray-400" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Import result */}
        {importResult && (
          <div className={`rounded-xl p-3 mb-4 text-sm font-medium text-center ${importResult.startsWith("✅") ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
            {importResult}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-medium transition">
            {importResult.startsWith("✅") ? "Tutup" : "Batal"}
          </button>
          {!importResult.startsWith("✅") && (
            <button onClick={handleImport} disabled={validFiles.length === 0 || importing}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition flex items-center justify-center gap-2">
              {importing ? <><Loader2 size={16} className="animate-spin" /> Importing...</> : <>Import {validFiles.length} File ✓</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
