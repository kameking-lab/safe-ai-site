"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Upload, FileText, Loader2, ArrowRight } from "lucide-react";
import type { SdsExtraction } from "@/lib/chemical/sds-extraction";
import {
  CHEM_LANGS,
  CHEM_LANG_LABELS,
  chemSdsLabels,
  readStoredChemLang,
  storeChemLang,
  type ChemLang,
} from "@/lib/chemical/chemical-ra-labels";

/**
 * P2-1 SDS取込み（Gemini Vision）UI。
 * SDSのPDF/画像をドラッグ&ドロップ → /api/chemical/sds-extract で抽出 → 要点を表示し、
 * /chemical-ra?name=… や物質DBへ誘導。抽出はAI生成のため「参考」（免責明示）。
 * 既存RAパネルには非干渉のスタンドアロン・セクション。
 */
async function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  const buf = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return { base64: btoa(binary), mimeType: file.type || "application/pdf" };
}

export function SdsUploadPanel() {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SdsExtraction | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [lang, setLang] = useState<ChemLang>("ja");
  const L = chemSdsLabels(lang);

  useEffect(() => {
    setLang(readStoredChemLang());
  }, []);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setResult(null);
    setFileName(file.name);
    if (!/^(application\/pdf|image\/(png|jpeg|webp))$/.test(file.type)) {
      setError("PDFまたは画像(PNG/JPEG/WebP)を選んでください。");
      return;
    }
    setLoading(true);
    try {
      const { base64, mimeType } = await fileToBase64(file);
      const res = await fetch("/api/chemical/sds-extract", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pdfBase64: base64, mimeType }),
      });
      const data: unknown = await res.json();
      if (!res.ok || !(data as { ok?: boolean })?.ok) {
        const reason = (data as { reason?: string })?.reason ?? "error";
        const msg: Record<string, string> = {
          ai_not_configured: "AI未設定のため抽出できません。物質名で手入力してください。",
          rate_limited: "短時間に多数の取込みがありました。少し待って再試行してください。",
          file_too_large: "ファイルが大きすぎます（約6MBまで）。",
          unsupported_type: "対応していない形式です（PDF/PNG/JPEG/WebP）。",
          extract_failed: "SDSから情報を読み取れませんでした。鮮明なファイルでお試しください。",
        };
        setError(msg[reason] ?? "抽出に失敗しました。");
        return;
      }
      setResult((data as { extracted: SdsExtraction }).extracted);
    } catch {
      setError("通信エラーが発生しました。");
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <section className="rounded-2xl border border-sky-200 bg-sky-50/60 p-4 sm:p-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
          <FileText className="h-5 w-5 text-sky-600" aria-hidden="true" />
          {L.sdsTitle}
        </h2>
        <label className="flex items-center gap-1 text-xs text-slate-500">
          <span aria-hidden>🌐</span>
          <select
            value={lang}
            onChange={(e) => {
              const next = e.target.value as ChemLang;
              setLang(next);
              storeChemLang(next);
            }}
            aria-label="表示言語 / Display language"
            className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700"
          >
            {CHEM_LANGS.map((l) => (
              <option key={l} value={l}>
                {CHEM_LANG_LABELS[l]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="text-xs text-slate-600">{L.sdsDesc}</p>

      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) void handleFile(f);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition ${
          dragOver ? "border-sky-500 bg-sky-100" : "border-sky-300 bg-white/70 hover:bg-sky-50"
        }`}
      >
        <Upload className="h-6 w-6 text-sky-500" aria-hidden="true" />
        <span className="text-sm font-semibold text-slate-700">
          {L.dropHint}
        </span>
        <span className="text-[11px] text-slate-500">{L.fileHint}</span>
        {fileName && <span className="text-[11px] text-sky-700">選択: {fileName}</span>}
        <input
          id={inputId}
          ref={inputRef}
          type="file"
          accept="application/pdf,image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
        />
      </label>

      {loading && (
        <p className="flex items-center gap-2 text-sm text-sky-700">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          {L.reading}
        </p>
      )}
      {error && <p className="text-sm font-semibold text-rose-700">{error}</p>}

      {result && (
        <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-bold text-slate-900">
            {result.productName || "（物質名不明）"}
            {result.cas && <span className="ml-2 text-xs font-normal text-slate-500">CAS: {result.cas}</span>}
          </p>
          {result.ghs.length > 0 && (
            <p className="text-xs text-slate-700">
              <span className="font-semibold">{L.ghs}:</span> {result.ghs.join(" / ")}
            </p>
          )}
          {result.physicalChemical && (
            <p className="text-xs text-slate-700">
              <span className="font-semibold">{L.physical}:</span> {result.physicalChemical}
            </p>
          )}
          {result.applicableLaws.length > 0 && (
            <p className="text-xs text-slate-700">
              <span className="font-semibold">{L.laws}:</span> {result.applicableLaws.join(" / ")}
            </p>
          )}
          {result.handling && (
            <p className="text-xs text-slate-700">
              <span className="font-semibold">{L.handling}:</span> {result.handling}
            </p>
          )}
          {result.measures && (
            <p className="text-xs text-slate-700">
              <span className="font-semibold">{L.measures}:</span> {result.measures}
            </p>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            {(result.productName || result.cas) && (
              <Link
                href={`/chemical-ra?name=${encodeURIComponent(result.productName || result.cas)}`}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
              >
                {L.runRa}
                <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </Link>
            )}
            {result.cas && (
              <Link
                href={`/chemical-database/${encodeURIComponent(result.cas)}`}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                {L.seeRegs}
              </Link>
            )}
          </div>
          <p className="text-[11px] leading-relaxed text-slate-400">
            {L.aiDisclaimer}
          </p>
        </div>
      )}
    </section>
  );
}
