"use client";

import { useState } from "react";
import { Search, AlertTriangle, Shield, FlaskConical, BookOpen, ShoppingBag } from "lucide-react";
import { InputWithVoice, TextareaWithVoice } from "@/components/voice-input-field";
import { amazonSearchUrl, rakutenSearchUrl } from "@/lib/affiliate";
import type {
  ChemicalRaResponse,
  GhsHazard,
  PpeRecommendation,
  SafetyMeasure,
} from "@/app/api/chemical-ra/route";

// ────────────────────────────────────────────────────────────
// GHSピクトグラム（絵文字ベース）
// ────────────────────────────────────────────────────────────

function ghsSignalBadge(signal: string | undefined) {
  if (signal === "危険") {
    return (
      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
        🔴 危険
      </span>
    );
  }
  if (signal === "警告") {
    return (
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
        🟡 警告
      </span>
    );
  }
  return null;
}

// ────────────────────────────────────────────────────────────
// サブコンポーネント
// ────────────────────────────────────────────────────────────

function GhsHazardCard({ hazard }: { hazard: GhsHazard }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-slate-900">{hazard.category}</p>
        {ghsSignalBadge(hazard.signal)}
      </div>
      <p className="mt-1 text-xs font-semibold text-slate-700">{hazard.classification}</p>
      {hazard.hazardStatement && (
        <p className="mt-1 text-[11px] text-slate-600">{hazard.hazardStatement}</p>
      )}
    </div>
  );
}

function PpeCard({ ppe }: { ppe: PpeRecommendation }) {
  return (
    <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3">
      <div className="flex items-start gap-2">
        <Shield className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900">{ppe.item}</p>
          <p className="mt-0.5 text-xs text-slate-600">{ppe.specification}</p>
          <div className="mt-2 flex gap-1.5">
            <a
              href={amazonSearchUrl(ppe.searchQuery)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded-md bg-amber-500 px-2 py-1 text-[10px] font-bold text-white hover:bg-amber-600"
            >
              <ShoppingBag className="h-2.5 w-2.5" />
              Amazon
            </a>
            <a
              href={rakutenSearchUrl(ppe.searchQuery)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded-md bg-rose-500 px-2 py-1 text-[10px] font-bold text-white hover:bg-rose-600"
            >
              <ShoppingBag className="h-2.5 w-2.5" />
              楽天
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

const MEASURE_CATEGORY_STYLE: Record<string, string> = {
  工学的対策: "bg-blue-100 text-blue-800",
  管理的対策: "bg-purple-100 text-purple-800",
  保護具: "bg-emerald-100 text-emerald-800",
};

function MeasureItem({ measure }: { measure: SafetyMeasure }) {
  const badgeClass = MEASURE_CATEGORY_STYLE[measure.category] ?? "bg-slate-100 text-slate-700";
  return (
    <li className="flex items-start gap-2 text-sm text-slate-700">
      <span className={`mt-0.5 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${badgeClass}`}>
        {measure.category}
      </span>
      {measure.action}
    </li>
  );
}

// ────────────────────────────────────────────────────────────
// クイック検索候補
// ────────────────────────────────────────────────────────────

const QUICK_CHEMICALS = [
  "トルエン",
  "キシレン",
  "ノルマルヘキサン",
  "アセトン",
  "水酸化ナトリウム（苛性ソーダ）",
  "塩酸（塩化水素）",
  "硫酸",
  "アクリル酸",
  "ホルムアルデヒド",
  "アンモニア",
  "メタノール",
  "二酸化チタン（ナノ粒子）",
];

// ────────────────────────────────────────────────────────────
// メインパネル
// ────────────────────────────────────────────────────────────

export function ChemicalRaPanel() {
  const [chemicalName, setChemicalName] = useState("");
  const [workContent, setWorkContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ChemicalRaResponse | null>(null);

  const handleSearch = async () => {
    if (!chemicalName.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/chemical-ra", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chemicalName: chemicalName.trim(), workContent: workContent.trim() }),
      });
      const data = (await res.json()) as ChemicalRaResponse | { error: { message: string } };
      if ("error" in data) {
        setError(data.error.message);
      } else {
        setResult(data);
      }
    } catch {
      setError("通信エラーが発生しました。しばらく経ってから再試行してください。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 lg:px-8">
      {/* ヘッダー */}
      <div>
        <div className="flex items-center gap-2">
          <FlaskConical className="h-6 w-6 text-emerald-600" />
          <h1 className="text-xl font-bold text-slate-900 lg:text-2xl">化学物質リスクアセスメント</h1>
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">Gemini AI</span>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          化学物質名を入力すると、SDS情報・GHS分類・必要保護具・安全対策チェックリストを表示します。
        </p>
        <p className="mt-1 text-xs text-slate-500">
          参考: 厚労省「職場のあんぜんサイト」・化管法SDS制度・労働安全衛生法 第57条の3
        </p>
      </div>

      {/* 検索フォーム */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              化学物質名（日本語・英語・IUPAC名・俗称いずれも可）
            </label>
            <div className="flex gap-2">
              <InputWithVoice
                className="flex-1"
                value={chemicalName}
                onChange={(e) => setChemicalName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleSearch();
                }}
                placeholder="例: トルエン、Toluene、2-エトキシエタノール"
              />
              <button
                type="button"
                onClick={() => void handleSearch()}
                disabled={!chemicalName.trim() || loading}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow hover:bg-emerald-700 disabled:opacity-50"
              >
                <Search className="h-4 w-4" />
                調査
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              作業内容（任意）— より精度の高い保護具推奨のために入力
            </label>
            <TextareaWithVoice
              className="min-h-16"
              value={workContent}
              onChange={(e) => setWorkContent(e.target.value)}
              placeholder="例: 塗装作業（局所排気なし）、溶接、配管洗浄など"
            />
          </div>
        </div>

        {/* クイック検索 */}
        <div className="mt-4">
          <p className="text-xs font-semibold text-slate-500 mb-2">よく検索される物質</p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_CHEMICALS.map((chem) => (
              <button
                key={chem}
                type="button"
                onClick={() => {
                  setChemicalName(chem);
                }}
                className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-600 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700"
              >
                {chem}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ローディング */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      )}

      {/* エラー */}
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* 結果 */}
      {result && !loading && (
        <div className="space-y-6">
          {/* 物質概要 */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
              <FlaskConical className="h-5 w-5 text-emerald-600" />
              {result.chemicalName}
              {result.casNumber && (
                <span className="ml-2 text-xs font-normal text-slate-500">CAS: {result.casNumber}</span>
              )}
            </h2>
            {result.flashPoint && (
              <p className="mt-2 text-sm text-slate-700">
                <span className="font-semibold">引火点:</span> {result.flashPoint}
              </p>
            )}
            {result.exposureLimit && (
              <p className="mt-1 text-sm text-slate-700">
                <span className="font-semibold">許容濃度:</span> {result.exposureLimit}
              </p>
            )}
            {result.rawReply && (
              <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700" style={{ whiteSpace: "pre-wrap" }}>
                {result.rawReply}
              </div>
            )}
          </div>

          {/* GHSハザード */}
          {result.ghsHazards.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                GHSハザード分類 ({result.ghsHazards.length}項目)
              </h2>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {result.ghsHazards.map((hazard, i) => (
                  <GhsHazardCard key={i} hazard={hazard} />
                ))}
              </div>
            </div>
          )}

          {/* 保護具推奨 */}
          {result.ppeRecommendations.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
                <Shield className="h-4 w-4 text-emerald-600" />
                必要保護具 ({result.ppeRecommendations.length}件)
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {result.ppeRecommendations.map((ppe, i) => (
                  <PpeCard key={i} ppe={ppe} />
                ))}
              </div>
            </div>
          )}

          {/* 安全対策 */}
          {result.safetyMeasures.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
                <BookOpen className="h-4 w-4 text-blue-600" />
                安全対策チェックリスト
              </h2>
              <ul className="space-y-2">
                {result.safetyMeasures.map((measure, i) => (
                  <MeasureItem key={i} measure={measure} />
                ))}
              </ul>
            </div>
          )}

          {/* 緊急時対応 */}
          {result.emergencyMeasures.length > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-5 shadow-sm">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-red-900">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                緊急時対応措置
              </h2>
              <ul className="space-y-1.5">
                {result.emergencyMeasures.map((measure, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-red-800">
                    <span className="mt-0.5 shrink-0 text-red-500">▶</span>
                    {measure}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 法規制 */}
          {result.regulatoryNotes.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-sm font-bold text-slate-900">適用法規制・規制区分</h2>
              <ul className="space-y-1.5">
                {result.regulatoryNotes.map((note, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="mt-0.5 shrink-0 text-emerald-500">✓</span>
                    {note}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 免責事項 */}
          <p className="text-[11px] leading-relaxed text-slate-400">
            ※ 本情報はAIが一般的なSDS・GHSデータに基づいて生成した参考情報です。
            実際の作業においては、製品の公式SDS・最新の法令・専門家の指導に従ってください。
            保護具購入リンクはアフィリエイトプログラムを利用しています。
          </p>
        </div>
      )}
    </div>
  );
}
