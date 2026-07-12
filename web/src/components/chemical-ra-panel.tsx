"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Shield, FlaskConical, BookOpen, ShoppingBag, Gauge, Database, FileText, FolderOpen } from "lucide-react";
import { TextareaWithVoice } from "@/components/voice-input-field";
import { generateAmazonAffiliateUrl, generateRakutenSearchUrl } from "@/lib/affiliate-url";
import { MhlwChemicalInfoCard } from "@/components/mhlw-chemical-info-card";
import { SimpleMarkdown } from "@/components/simple-markdown";
import { ContextualPpePicks } from "@/components/ContextualPpePicks";
import { getChemicalKeyPoints, hasKeyPoints } from "@/lib/chemical/key-points";
import { auditedRegulationTags, type LegalProfileTagSource } from "@/lib/chemical/legal-profile-tags";
import { ChemicalRaReportHeader, ChemicalRaSignoffBoxes } from "@/components/chemical/chemical-ra-report-print";
import { ChemicalRaSaveButton } from "@/components/chemical/chemical-ra-save";
import { getChemicalRaRecord } from "@/lib/chemical/ra-cloud";
import { MainFeatureNextActions } from "@/components/main-feature-next-actions";
import type { MergedChemical } from "@/lib/mhlw-chemicals";
import { UnifiedChemicalSearch, type LegalNameHit } from "@/components/chemical/unified-chemical-search";
import { LegalConclusionCard } from "@/components/chemical/legal-conclusion-card";
import {
  findByCasSlim as findByCas,
  searchMergedChemicalsSlim as searchMergedChemicals,
} from "@/lib/mhlw-chemicals-slim";
import { getSupplementalInfo } from "@/lib/chemical/supplemental-info";
import { findChemicalEquipmentProfile } from "@/lib/chemical-equipment-mapping";
import type {
  ChemicalRaResponse,
  GhsHazard,
  PpeRecommendation,
  SafetyMeasure,
} from "@/app/api/chemical-ra/route";
import { trackEvent } from "@/components/Analytics";
import { RaConclusionCard } from "@/components/chemical/ra-conclusion";
import { GhsPictogram } from "@/components/chemical/ghs-pictogram";
import { resolveGhsSymbol } from "@/lib/chemical/ghs-pictogram-map";
import { PpePictogram } from "@/components/equipment/ppe-pictogram";
import { resolvePpeItemIcon } from "@/lib/equipment/ppe-pictogram-map";
import { Mascot } from "@/components/mascot";

// 保護具AIファインダーへの連携URL（必要保護具のカテゴリ・ハザードを引き継ぐ）
function buildEquipmentHref(chemicalName: string): string {
  const profile = findChemicalEquipmentProfile(chemicalName);
  const params = new URLSearchParams({ chemical: chemicalName });
  if (profile) {
    params.set("hazards", profile.hazards.join(","));
    params.set("categories", profile.recommendedCategories.join(","));
  }
  return `/equipment-finder?${params.toString()}`;
}

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
  const symbol = resolveGhsSymbol(hazard.category, hazard.classification);
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start gap-2">
        {symbol && <GhsPictogram symbol={symbol} size="sm" className="print:hidden" />}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold text-slate-900">{hazard.category}</p>
            {ghsSignalBadge(hazard.signal)}
          </div>
          <p className="mt-1 text-xs font-semibold text-slate-700">{hazard.classification}</p>
          {hazard.hazardStatement && (
            <p className="mt-1 text-[11px] text-slate-600">{hazard.hazardStatement}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function PpeCard({ ppe }: { ppe: PpeRecommendation }) {
  const icon = resolvePpeItemIcon(ppe.item) ?? "shield";
  return (
    <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3">
      <div className="flex items-start gap-2.5">
        <PpePictogram icon={icon} className="print:hidden" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900">{ppe.item}</p>
          <p className="mt-0.5 text-xs text-slate-600">{ppe.specification}</p>
          <div className="mt-2 flex gap-1.5">
            <a
              href={generateAmazonAffiliateUrl(ppe.searchQuery)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded-md bg-amber-500 px-2 py-1 text-[10px] font-bold text-white hover:bg-amber-600"
            >
              <ShoppingBag className="h-2.5 w-2.5" />
              Amazon
            </a>
            <a
              href={generateRakutenSearchUrl(ppe.searchQuery)}
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
  代替化: "bg-indigo-100 text-indigo-800",
};

const PRIORITY_LABEL: Record<1 | 2 | 3, string> = {
  1: "① 最優先",
  2: "② 次に優先",
  3: "③ 補助",
};

function MeasureItem({ measure }: { measure: SafetyMeasure }) {
  const badgeClass = MEASURE_CATEGORY_STYLE[measure.category] ?? "bg-slate-100 text-slate-700";
  const priority = (measure.priority ?? 2) as 1 | 2 | 3;
  return (
    <li className="flex items-start gap-2 text-sm text-slate-700">
      <span className="mt-0.5 shrink-0 rounded-full bg-slate-50 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200">
        {PRIORITY_LABEL[priority]}
      </span>
      <span className={`mt-0.5 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${badgeClass}`}>
        {measure.category}
      </span>
      <span>{measure.action}</span>
    </li>
  );
}

const LEVEL_BADGE: Record<"I" | "II" | "III" | "IV", string> = {
  I: "bg-emerald-100 text-emerald-800 border-emerald-200",
  II: "bg-amber-100 text-amber-800 border-amber-200",
  III: "bg-orange-100 text-orange-800 border-orange-200",
  IV: "bg-rose-100 text-rose-900 border-rose-300",
};

// ────────────────────────────────────────────────────────────
// クイック検索候補
// ────────────────────────────────────────────────────────────

const QUICK_CHEMICALS = [
  "トルエン",
  "溶接ヒューム",
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

type ErrorKind = "validation" | "ratelimit" | "apikey" | "timeout" | "network" | "unknown";

function categorizeError(message: string): { kind: ErrorKind; hint: string } {
  const lower = message.toLowerCase();
  if (lower.includes("api key") || lower.includes("apikey") || message.includes("APIキー") || message.includes("未設定")) {
    return { kind: "apikey", hint: "GEMINI_API_KEYが未設定のようです。厚労省データによる結果を表示します。" };
  }
  if (lower.includes("rate") || lower.includes("429") || message.includes("制限")) {
    return { kind: "ratelimit", hint: "AIのレート制限に達しました。時間を置いて再試行してください。" };
  }
  if (lower.includes("timeout") || lower.includes("タイムアウト") || lower.includes("deadline")) {
    return { kind: "timeout", hint: "AI応答がタイムアウトしました。再試行してください。" };
  }
  if (lower.includes("network") || lower.includes("fetch") || message.includes("通信")) {
    return { kind: "network", hint: "ネットワーク接続を確認してください。" };
  }
  if (message.includes("入力") || message.includes("validation")) {
    return { kind: "validation", hint: "入力内容を確認してください。" };
  }
  return { kind: "unknown", hint: "原因不明のエラー。厚労省データによる結果のみ表示します。" };
}

function parseLimitValue(limitStr: string | undefined): { value: number; unit: string } | null {
  if (!limitStr) return null;
  const normalized = limitStr
    .replace(/[０-９．]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
  const m = normalized.match(/([\d.]+)\s*([^\d\s]+)?/);
  if (!m) return null;
  const value = parseFloat(m[1]);
  if (!Number.isFinite(value) || value <= 0) return null;
  const unit = (m[2] ?? "ppm").replace(/[()（）]/g, "").trim();
  return { value, unit };
}

export function ChemicalRaPanel() {
  // CR2-T3(LCP): useSearchParams() は静的プリレンダーを Suspense フォールバックへ落とし、
  // 本パネル（STEP1 フォーム＝LCP要素）が「スケルトン先行→$RCスワップ」でしか描画されず
  // LCP 4.1s の主因になっていた（/laws C-1 と同じ構造）。マウント後に window.location から
  // 読み取り、静的HTMLにフォームを含める（page.tsx の Suspense も撤去）。
  const [urlParams, setUrlParams] = useState<URLSearchParams | null>(null);
  useEffect(() => {
    setUrlParams(new URLSearchParams(window.location.search));
  }, []);
  const [chemicalName, setChemicalName] = useState("");
  const [workContent, setWorkContent] = useState("");
  const [measuredConc, setMeasuredConc] = useState("");
  const [ventilation, setVentilation] = useState<"none" | "general" | "local" | "">("");
  const [amount, setAmount] = useState<"small" | "medium" | "large" | "">("");
  const [durationHours, setDurationHours] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [retryStatus, setRetryStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorHint, setErrorHint] = useState<string | null>(null);
  const [result, setResult] = useState<ChemicalRaResponse | null>(null);
  // P0是正(2026-07-11): 結論カードの法規制バッジは監査済み legal-profile のみを源泉とする。
  // 「どのクエリの結果か」を持ち、物質切替時に前物質のタグを誤って出さない。
  const [legalTags, setLegalTags] = useState<{ q: string; tags: string[] } | null>(null);
  const [mhlwSelected, setMhlwSelected] = useState<MergedChemical | null>(null);
  // 一窓化: 法令名称（CASレス告示名・群指定名）で解決した選択
  const [legalSelected, setLegalSelected] = useState<LegalNameHit | null>(null);
  // 台帳から保存済み記録を再表示しているときの実施日(ISO)。新規実施時は null（=当日）。
  const [restoredAt, setRestoredAt] = useState<string | null>(null);
  // 既定は2ステップウィザード（物質検索→作業方法）。詳細モードを ON にすると
  // CREATE-SIMPLE 用の換気・取扱量・作業時間・測定濃度の入力欄が表示される。
  const [detailedMode, setDetailedMode] = useState(false);
  const resultAnchorRef = useRef<HTMLDivElement | null>(null);
  // ?run=1 付きで遷移してきた時に判定を一度だけ自動実行するためのガード。
  const autoRanRef = useRef(false);

  // P0-6: AI調査の結果生成完了時に結果セクションへスムーズスクロール＋フォーカス移動。
  // 読み上げ・キーボード操作ユーザーが結果に到達できるよう、tabIndex=-1 のアンカーに focus する。
  useEffect(() => {
    if (result && !loading && resultAnchorRef.current) {
      const node = resultAnchorRef.current;
      node.scrollIntoView({ behavior: "smooth", block: "start" });
      // スクロール後にフォーカス。preventScroll でスクロール挙動を二重発火させない。
      window.setTimeout(() => {
        try {
          node.focus({ preventScroll: true });
        } catch {
          // 古いブラウザでは preventScroll が未対応 — 無視。
        }
      }, 200);
    }
  }, [result, loading]);

  // 物質名から自動MHLW検索（セレクター選択が優先）
  const autoMhlw = useMemo(() => {
    if (mhlwSelected) return null;
    if (!chemicalName.trim()) return null;
    const results = searchMergedChemicals(chemicalName.trim(), 1);
    return results.length > 0 ? results[0] : null;
  }, [chemicalName, mhlwSelected]);

  const displayedMhlw = mhlwSelected ?? autoMhlw;

  // P0是正: RA結果が出たら、その物質の監査済み法令プロファイルを取得してバッジ源にする。
  // クエリの優先順位は法令名称選択 → DB選択のCAS → AI応答のCAS → 入力名
  // （LegalConclusionCard と同じ解決点 /api/chemical/legal-profile を使う）。
  const legalTagQuery = useMemo(() => {
    if (!result) return null;
    return (
      legalSelected?.label ??
      displayedMhlw?.cas ??
      result.casNumber ??
      result.chemicalName
    );
  }, [result, legalSelected, displayedMhlw]);

  useEffect(() => {
    if (!legalTagQuery) return;
    const ac = new AbortController();
    fetch(`/api/chemical/legal-profile?q=${encodeURIComponent(legalTagQuery)}`, { signal: ac.signal })
      .then((r) => r.json())
      .then((j: LegalProfileTagSource) =>
        setLegalTags({ q: legalTagQuery, tags: auditedRegulationTags(j) }),
      )
      .catch(() => setLegalTags({ q: legalTagQuery, tags: [] }));
    return () => ac.abort();
  }, [legalTagQuery]);

  // 軸I: 結果の冒頭に「まず押さえる要点」を出すための抽出（GHS・対策の再構成＋監査済み規制タグ）。
  const keyPoints = useMemo(
    () =>
      result
        ? getChemicalKeyPoints(result, legalTags?.q === legalTagQuery ? legalTags.tags : [])
        : null,
    [result, legalTags, legalTagQuery],
  );

  // 判定ロジック: MHLW 8h 基準値 → 特化則・有機則 管理濃度 → AI exposureLimit の順で採用
  const activeLimit = useMemo(() => {
    const mhlwLimit = displayedMhlw?.details?.limit8h;
    const oelSupplement = getSupplementalInfo(displayedMhlw?.cas ?? null)?.oel;
    const aiLimit = result?.exposureLimit;
    return mhlwLimit || oelSupplement || aiLimit || null;
  }, [displayedMhlw, result]);

  const concentrationVerdict = useMemo(() => {
    if (!measuredConc.trim() || !activeLimit) return null;
    const parsed = parseLimitValue(activeLimit);
    if (!parsed) return null;
    const measuredNum = parseFloat(measuredConc.replace(/[^\d.]/g, ""));
    if (!Number.isFinite(measuredNum)) return null;
    const ratio = measuredNum / parsed.value;
    if (measuredNum > parsed.value) {
      return {
        level: "danger" as const,
        label: `基準値超過（${ratio.toFixed(2)}倍）`,
        detail: `測定値 ${measuredNum}${parsed.unit} > 基準値 ${parsed.value}${parsed.unit}。直ちに作業改善が必要です。`,
      };
    }
    if (ratio >= 0.5) {
      return {
        level: "warn" as const,
        label: `基準値の ${Math.round(ratio * 100)}%`,
        detail: "余裕は小さく、改善の検討が推奨されます。",
      };
    }
    return {
      level: "safe" as const,
      label: `基準値の ${Math.round(ratio * 100)}%`,
      detail: "現時点で基準値内ですが、継続的な測定が必要です。",
    };
  }, [measuredConc, activeLimit]);

  // /chemical-ra?raId=... は台帳から保存済み実施記録を再表示（原本を再印刷するため、API再実行はしない）。
  // /chemical-ra?cas=... / ?name=... は新規実施の物質プリセット。
  useEffect(() => {
    const raId = urlParams?.get("raId");
    if (raId) {
      let cancelled = false;
      void getChemicalRaRecord(raId).then((rec) => {
        if (cancelled || !rec) return;
        // 保存時の payload（ChemicalRaResponse）をそのまま結果として復元（再判定しない）
        setResult(rec.payload as ChemicalRaResponse);
        setRestoredAt(rec.savedAt);
        if (rec.substance) setChemicalName(rec.substance);
        if (rec.cas) {
          const found = findByCas(rec.cas);
          if (found) setMhlwSelected(found);
        }
        setError(null);
        setLoading(false);
      });
      return () => {
        cancelled = true;
      };
    }
    const cas = urlParams?.get("cas");
    if (cas) {
      const found = findByCas(cas);
      if (found) {
        setMhlwSelected(found);
        setChemicalName(found.primaryName);
        return;
      }
    }
    const name = urlParams?.get("name");
    if (name) setChemicalName(name);
  }, [urlParams]);

  const handleSelectMhlw = (m: MergedChemical | null) => {
    setMhlwSelected(m);
    setLegalSelected(null);
    if (m) {
      setChemicalName(m.primaryName);
    }
  };

  const handleSelectLegal = (hit: LegalNameHit) => {
    setLegalSelected(hit);
    setMhlwSelected(null);
    setChemicalName(hit.label);
  };

  // よく検索される物質チップ等から「1タップで判定まで実行」する。
  // 紙派/IT不慣れなユーザーが物質名を押した時点で結果が出るようにする（入力欄に名前が
  // 入るだけで何も起きない、という離脱要因の解消）。
  const runQuickSearch = (name: string) => {
    setChemicalName(name);
    setMhlwSelected(null);
    void handleSearch(name);
  };

  const handleSearch = async (overrideName?: string) => {
    // クイックチップ等から即時実行するときは state 反映を待たず引数の物質名を使う。
    const nameToUse = (overrideName ?? chemicalName).trim();
    if (!nameToUse) return;
    setLoading(true);
    setRetryStatus(null);
    setError(null);
    setErrorHint(null);
    setResult(null);
    setRestoredAt(null); // 新規実施なので実施日は当日

    const flowStartAt = Date.now();
    const MAX_RETRIES = 3;
    // 作業時間未入力でも換気+取扱量が選ばれていれば8時間（1日TWA相当の保守側既定）で
    // 判定する。簡易モード（STEP 2）には作業時間欄が無く、これが無いと
    // 「選ぶだけで反映」のはずのリスクレベル（I〜IV）が永遠に算出されないため。
    const dur = durationHours.trim()
      ? parseFloat(durationHours)
      : ventilation && amount
        ? 8
        : undefined;
    // overrideName が来ているときは mhlwSelected が古い可能性があるため CAS は名称一致時のみ採用。
    const casForBody =
      overrideName && mhlwSelected?.primaryName !== nameToUse ? undefined : mhlwSelected?.cas;
    const body = JSON.stringify({
      chemicalName: nameToUse,
      workContent: workContent.trim(),
      casNumber: casForBody ?? undefined,
      ventilation: ventilation || undefined,
      amount: amount || undefined,
      durationHours: typeof dur === "number" && Number.isFinite(dur) ? dur : undefined,
    });

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const res = await fetch("/api/chemical-ra", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        });

        if (res.status === 503 && attempt < MAX_RETRIES - 1) {
          setRetryStatus(`再試行中... (${attempt + 1}/${MAX_RETRIES - 1})`);
          await new Promise((r) => setTimeout(r, Math.pow(2, attempt + 1) * 500));
          continue;
        }

        const data = (await res.json()) as ChemicalRaResponse | { error: { message: string } };
        if ("error" in data) {
          const { hint } = categorizeError(data.error.message);
          setError(data.error.message);
          setErrorHint(hint);
        } else {
          setResult(data);
          trackEvent("flow_complete", { flow_type: "chemical-ra", duration: Math.round((Date.now() - flowStartAt) / 1000) });
          if (data.aiStatus && data.aiStatus !== "ok") {
            const statusLabel: Record<string, string> = {
              apikey_missing: "GEMINI_API_KEY未設定",
              ai_failed: "AI生成失敗",
              demo: "デモモード",
            };
            const detail = data.aiErrorDetail ? `（${data.aiErrorDetail}）` : "";
            setErrorHint(`${statusLabel[data.aiStatus] ?? data.aiStatus}${detail}：厚労省データによるフォールバック表示です。`);
          }
        }
        break;
      } catch (err) {
        if (attempt < MAX_RETRIES - 1) {
          setRetryStatus(`再試行中... (${attempt + 1}/${MAX_RETRIES - 1})`);
          await new Promise((r) => setTimeout(r, Math.pow(2, attempt + 1) * 500));
          continue;
        }
        const msg = err instanceof Error ? err.message : "通信エラーが発生しました";
        const { hint } = categorizeError(msg);
        setError(msg);
        setErrorHint(hint);
      }
    }

    setRetryStatus(null);
    setLoading(false);
  };

  // 職種別クイックスタート等が ?name=…&run=1 / ?cas=…&run=1 で遷移してきた場合、
  // 着地時に判定を自動実行する（押した先で「何も起きない」を解消。raId 再表示時は実行しない）。
  useEffect(() => {
    if (autoRanRef.current) return;
    if (urlParams?.get("run") !== "1") return;
    if (urlParams?.get("raId")) return;
    const cas = urlParams?.get("cas");
    const nameParam = urlParams?.get("name");
    const nameToRun = cas ? findByCas(cas)?.primaryName ?? null : nameParam;
    if (!nameToRun) return;
    autoRanRef.current = true;
    void handleSearch(nameToRun);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlParams]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 lg:px-8">
      {/* ヘッダー（画面用イントロ。A4記録には ChemicalRaReportHeader が出るので印刷時は隠す）。
          ページ側 PageHeader が h1 を持つため、ここは h2（多重h1の是正・文言/見た目は不変）。 */}
      <div className="flex items-start justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <FlaskConical className="h-6 w-6 text-emerald-600" />
            <h2 className="text-xl font-bold text-slate-900 lg:text-2xl">化学物質リスクアセスメント</h2>
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">Gemini AI</span>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            化学物質名を入力すると、SDS情報・GHS分類・必要保護具・安全対策チェックリストを表示します。
          </p>
          <p className="mt-1 text-xs text-slate-500">
            参考: 厚労省「職場のあんぜんサイト」・化管法SDS制度・労働安全衛生法 第57条の3
          </p>
        </div>
        <Mascot variant="chemical-lab" size="lg" alt="" className="hidden shrink-0 sm:block" />
      </div>

      {/* 検索フォーム（入力UI。印刷=A4実施記録では不要なので隠す） */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm print:hidden">
        <div className="mb-3 flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            {/* P1-F: 「2ステップウィザード」では入口が3つ並ぶ実態と乖離するため、
                「物質を選ぶ → 作業方法 → A4結果表」の3ステップで実態を表現する。 */}
            <p className="text-xs font-bold text-emerald-700">入力窓1つで判定まで</p>
            <p className="text-[11px] text-slate-500">
              物質名か製品名を入れる → 該当法令の結論 → 作業状況を選ぶ → A4実施記録
            </p>
          </div>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={detailedMode}
              onChange={(e) => setDetailedMode(e.target.checked)}
              className="h-4 w-4"
            />
            詳細モード（数値入力を表示）
          </label>
        </div>
        <div className="space-y-4">
          {/* 一窓化 (2026-07-11): 入力窓は1つ。物質名・CAS・法令名称（溶接ヒューム等）・
              製品名らしき入力を1つの窓で受け、収載外は正直に明示して次の一歩を出す */}
          <UnifiedChemicalSearch
            query={chemicalName}
            onQueryChange={(v) => {
              setChemicalName(v);
              if (mhlwSelected && v !== mhlwSelected.primaryName) setMhlwSelected(null);
              if (legalSelected && v !== legalSelected.label) setLegalSelected(null);
            }}
            onPickDb={(m) => handleSelectMhlw(m)}
            onPickLegal={handleSelectLegal}
            onAiSearch={() => void handleSearch()}
            loading={loading}
          />

          {/* 該当法令の結論カード（結論ファースト: 物質が決まった瞬間に一窓の直下へ） */}
          {(displayedMhlw || legalSelected) && (
            <LegalConclusionCard
              q={legalSelected?.label ?? displayedMhlw?.cas ?? displayedMhlw?.primaryName ?? ""}
            />
          )}

          {/* STEP 2 作業方法の逆質問（簡易モード・物質を決めると表示） */}
          {!detailedMode && chemicalName.trim() !== "" && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-3">
              <p className="text-xs font-bold text-emerald-900">STEP 2 作業の状況を選んでください</p>
              <p className="mt-0.5 text-[11px] text-slate-600">
                2つ選ぶとリスクレベル（I〜IV）を判定します（作業時間は8時間=1日として判定。変更や測定濃度の入力は上の「詳細モード」をON）。
              </p>
              <div className="mt-2">
                <label htmlFor="chemical-ra-work-content" className="block text-[11px] font-semibold text-slate-700 mb-1">
                  作業内容（任意）— より精度の高い保護具推奨のために入力
                </label>
                <TextareaWithVoice
                  id="chemical-ra-work-content"
                  className="min-h-14 bg-white"
                  value={workContent}
                  onChange={(e) => setWorkContent(e.target.value)}
                  placeholder="例: 塗装作業（局所排気なし）、溶接、配管洗浄など"
                />
              </div>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="text-[11px] text-slate-700">
                  換気の状況
                  <select
                    value={ventilation}
                    onChange={(e) => setVentilation(e.target.value as "none" | "general" | "local" | "")}
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs"
                  >
                    <option value="">選んでください</option>
                    <option value="none">屋内・換気なし</option>
                    <option value="general">全体換気あり（窓・扇風機）</option>
                    <option value="local">局所排気装置あり</option>
                  </select>
                </label>
                <label className="text-[11px] text-slate-700">
                  1日の取扱量の目安
                  <select
                    value={amount}
                    onChange={(e) => setAmount(e.target.value as "small" | "medium" | "large" | "")}
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs"
                  >
                    <option value="">選んでください</option>
                    <option value="small">少量（コップ1杯以下）</option>
                    <option value="medium">中量（バケツ1杯まで）</option>
                    <option value="large">大量（ドラム缶以上）</option>
                  </select>
                </label>
              </div>
            </div>
          )}

          {/* ③ CREATE-SIMPLE 入力（詳細モードのみ） */}
          {detailedMode && (
          <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-3">
            <p className="text-xs font-semibold text-blue-900">
              ③ CREATE-SIMPLE 簡易判定（任意）— 4段階リスクレベル（I〜IV）を算出
            </p>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <label className="text-[11px] text-slate-700">
                換気
                <select
                  value={ventilation}
                  onChange={(e) => setVentilation(e.target.value as "none" | "general" | "local" | "")}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
                >
                  <option value="">選択してください</option>
                  <option value="none">換気なし</option>
                  <option value="general">全体換気</option>
                  <option value="local">局所排気</option>
                </select>
              </label>
              <label className="text-[11px] text-slate-700">
                取扱量
                <select
                  value={amount}
                  onChange={(e) => setAmount(e.target.value as "small" | "medium" | "large" | "")}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
                >
                  <option value="">選択してください</option>
                  <option value="small">少量（&lt;1L/日）</option>
                  <option value="medium">中量（1〜10L/日）</option>
                  <option value="large">大量（&gt;10L/日）</option>
                </select>
              </label>
              <label className="text-[11px] text-slate-700">
                作業時間（時間/日）
                <input
                  type="number"
                  min="0"
                  max="24"
                  step="0.5"
                  value={durationHours}
                  onChange={(e) => setDurationHours(e.target.value)}
                  placeholder="例: 4"
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
                />
              </label>
            </div>
            <p className="mt-1 text-[10px] text-slate-500">
              ※ CREATE-SIMPLE は厚労省「化学物質リスクアセスメント支援ツール」を参考にした簡略判定です。最終判断は公式版または専門家（労働衛生コンサルタント等）の判断によること。
            </p>
          </div>
          )}

          {/* ④ 測定濃度入力と判定（詳細モードのみ） */}
          {detailedMode && (
          <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-amber-900">
              <Gauge className="h-3.5 w-3.5" />
              ④ 作業環境の測定濃度（任意）— 基準値との判定
            </label>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input
                type="text"
                inputMode="decimal"
                value={measuredConc}
                onChange={(e) => setMeasuredConc(e.target.value)}
                placeholder="例: 15"
                className="w-32 rounded-md border border-amber-300 bg-white px-2.5 py-1.5 text-sm"
              />
              <span className="text-xs text-amber-800">
                {activeLimit ? (
                  <>
                    基準値: <span className="font-bold">{activeLimit}</span>（同じ単位で入力）
                  </>
                ) : (
                  "物質を選択すると基準値が表示されます"
                )}
              </span>
            </div>
            {concentrationVerdict && (
              <div
                className={`mt-2 rounded-md px-3 py-2 text-xs ${
                  concentrationVerdict.level === "danger"
                    ? "bg-rose-100 text-rose-900"
                    : concentrationVerdict.level === "warn"
                      ? "bg-amber-100 text-amber-900"
                      : "bg-emerald-100 text-emerald-900"
                }`}
              >
                <p className="font-bold">
                  {concentrationVerdict.level === "danger" ? "⚠ " : ""}
                  {concentrationVerdict.label}
                </p>
                <p className="mt-0.5">{concentrationVerdict.detail}</p>
              </div>
            )}
          </div>
          )}
        </div>

        {/* クイック検索: 1タップで判定まで実行（物質名を押すだけで結果が出る） */}
        <div className="mt-4">
          <p className="text-xs font-semibold text-slate-500 mb-2">
            よく扱う物質はこちら（押すとすぐに判定します）
          </p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_CHEMICALS.map((chem) => (
              <button
                key={chem}
                type="button"
                disabled={loading}
                onClick={() => runQuickSearch(chem)}
                className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 disabled:opacity-50 disabled:cursor-progress"
              >
                {chem}
              </button>
            ))}
          </div>
        </div>

        {/* STEP3 トリガ: ①(厚労省選択)/②(直接入力)/クイック検索 のどの経路でも、ここから
            「判定 → A4実施記録(確認印枠つき)」に到達できるようにする明確な主導線。
            第三者実機確認で「A4記録・印刷ボタン・確認印枠に辿り着けない」と報告された問題の是正。 */}
        <div className="mt-4 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={() => void handleSearch()}
            disabled={!chemicalName.trim() || loading}
            aria-busy={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <span aria-hidden="true" className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                判定中…
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" aria-hidden="true" />
                STEP 3：リスクを判定して A4実施記録（確認印枠つき）を作成
              </>
            )}
          </button>
          <p className="mt-1.5 text-center text-[11px] text-slate-500">
            {chemicalName.trim()
              ? "判定後、結果の下に「🖨 A4実施レポート印刷 / PDF保存」ボタンと、厚労省様式相当（実施日・事業場名・確認印枠3つ）の記録が表示されます。"
              : "STEP 1 で物質を選ぶ（または名称を入力する）と、ここから判定して記録を作成できます。"}
          </p>
        </div>
      </div>

      {/* MHLW 物質詳細（選択時 or 名称一致時に即表示） */}
      {displayedMhlw && <MhlwChemicalInfoCard chemical={displayedMhlw} />}

      {/* ローディング */}
      {loading && (
        <div className="space-y-3">
          {retryStatus && (
            <div
              role="status"
              aria-live="polite"
              className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800"
            >
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
              {retryStatus}
            </div>
          )}
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      )}

      {/* エラー */}
      {error && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold">AIによる生成に失敗しました</p>
              <p className="mt-1 text-xs">{error}</p>
              {errorHint && <p className="mt-1 text-xs text-rose-700">{errorHint}</p>}
            </div>
          </div>
          {mhlwSelected && (
            <p className="mt-3 rounded-md bg-white px-3 py-2 text-[11px] text-slate-700">
              <Database className="mr-1 inline h-3 w-3 text-emerald-600" />
              厚労省データ（濃度基準値・規制区分・関連法令）は下のカードに表示されています。
            </p>
          )}
        </div>
      )}
      {errorHint && !error && result && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {errorHint}
        </div>
      )}

      {/* 結果 */}
      {result && !loading && (
        <div
          ref={resultAnchorRef}
          tabIndex={-1}
          aria-label="AI調査結果"
          className="space-y-6 scroll-mt-20 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 print:space-y-3"
        >
          {/* 柱0: 結論カード（1画面1メッセージ）— リスクレベルのデカ表示＋I〜IV色帯＋
              GHS絵表示＋まず行う対策＋保護具動線。旧「まず押さえる要点」の内容を統合
              （hazards/actions/regulations は keyPoints から表示・正確性は不変）。
              下の詳細（GHS分類・濃度基準・保護具・規制）は、この結論の根拠。 */}
          {keyPoints && (hasKeyPoints(keyPoints) || result.createSimple) && (
            <RaConclusionCard
              result={result}
              keyPoints={keyPoints}
              equipmentHref={buildEquipmentHref(result.chemicalName)}
            />
          )}
          {restoredAt && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-xs text-sky-900 print:hidden">
              <FolderOpen className="h-4 w-4 shrink-0 text-sky-600" aria-hidden="true" />
              <span>
                <strong className="font-semibold">保存済みの実施記録を表示中</strong>（実施日: {new Date(restoredAt).toLocaleDateString("ja-JP")}）。
                このまま「🖨 A4実施レポート印刷 / PDF保存」で<strong className="font-semibold">原本を再発行</strong>できます（実施日は保存当時のまま）。
              </span>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
            <p className="text-xs font-bold text-emerald-700">A4 実施記録（ブラウザ印刷で厚労省様式相当の記録に。会社名・実施者・確認印は印刷時に出ます）</p>
            <div className="flex items-center gap-2">
              {/* P1-5: RA結果のクラウド保管（localStorage即時＋クラウド背景同期） */}
              <ChemicalRaSaveButton
                chemicalName={result.chemicalName}
                cas={result.casNumber ?? ""}
                workContent={workContent}
                exposureBand={result.createSimple?.label ?? ""}
                payload={result}
              />
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                🖨 A4実施レポート印刷 / PDF保存
              </button>
            </div>
          </div>
          {/* P1-1: 印刷時のみA4記録様式ヘッダ（自社情報・実施日・実施者）。台帳から再表示時は実施日を保存当時に固定。 */}
          <ChemicalRaReportHeader recordDateIso={restoredAt ?? undefined} />
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
              <div className="mt-3 rounded-lg bg-slate-50 p-3">
                <SimpleMarkdown content={result.rawReply} />
              </div>
            )}
          </div>

          {/* CREATE-SIMPLE 4段階判定 */}
          {result.createSimple && (
            <div className={`rounded-xl border p-5 shadow-sm ${LEVEL_BADGE[result.createSimple.level]}`}>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h2 className="flex items-center gap-2 text-base font-bold">
                  <Gauge className="h-5 w-5" />
                  CREATE-SIMPLE 判定: {result.createSimple.label}
                </h2>
                <span className="rounded-full bg-white/80 px-3 py-0.5 text-xs font-bold">
                  ばく露指数: {result.createSimple.exposureRatio.toFixed(2)}
                </span>
              </div>
              <p className="mt-2 text-xs">
                換気: <span className="font-semibold">{result.createSimple.inputSummary.ventilation}</span> /
                {" "}取扱量: <span className="font-semibold">{result.createSimple.inputSummary.amount}</span> /
                {" "}作業時間: <span className="font-semibold">{result.createSimple.inputSummary.durationHours}h</span>
                {result.createSimple.limit8h && (
                  <> / 8h基準値: <span className="font-semibold">{result.createSimple.limit8h}</span></>
                )}
              </p>
              <details className="mt-2">
                <summary className="cursor-pointer text-[11px] font-semibold underline-offset-2 hover:underline">
                  判定根拠
                </summary>
                <ul className="mt-1 space-y-0.5 text-[11px]">
                  {result.createSimple.rationale.map((r, i) => (
                    <li key={i}>・{r}</li>
                  ))}
                </ul>
              </details>
              {result.createSimple.level === "IV" && (
                <p className="mt-2 rounded-md bg-white/90 px-2 py-1 text-xs font-bold text-rose-900">
                  ⚠ 直ちに作業を中止し、代替化・密閉化・局所排気装置の即時設置が必要です
                </p>
              )}
            </div>
          )}

          {/* 関連ハザード情報の自動引用 */}
          {result.relatedHazards && result.relatedHazards.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
              <h3 className="flex items-center gap-2 text-sm font-bold text-amber-900">
                <Database className="h-4 w-4" />
                関連ハザード情報（厚労省データから自動引用）
              </h3>
              <ul className="mt-2 space-y-1">
                {result.relatedHazards.map((h, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-amber-900">
                    <span className="mt-0.5 shrink-0 text-amber-600">▶</span>
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          )}

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
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <Shield className="h-4 w-4 text-emerald-600" />
                  必要保護具 ({result.ppeRecommendations.length}件)
                </h2>
                <a
                  href={buildEquipmentHref(result.chemicalName)}
                  className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
                >
                  → この物質に必要な保護具を見る
                </a>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {result.ppeRecommendations.map((ppe, i) => (
                  <PpeCard key={i} ppe={ppe} />
                ))}
              </div>
            </div>
          )}

          {/* 安全対策（厚労省指針の優先順位順） */}
          {result.safetyMeasures.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-900">
                <BookOpen className="h-4 w-4 text-blue-600" />
                安全対策チェックリスト（優先順位順）
              </h2>
              <p className="mb-3 text-[11px] text-slate-500">
                厚労省指針：① 代替化／工学的対策 → ② 管理的対策 → ③ 個人保護具 の順で適用
              </p>
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

          {/* 法令チャットへの導線 */}
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <h3 className="text-sm font-bold text-blue-900">この物質の法令取扱いを確認</h3>
            <p className="mt-1 text-xs text-blue-900/80">
              特化則・有機則・酸欠則など、業務で必要な取扱基準・作業主任者選任・作業環境測定の要件を法令チャットで確認できます。
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={`/chatbot?q=${encodeURIComponent(`${result.chemicalName} の取扱い基準と関連する特化則・有機則の条文を教えて`)}`}
                className="inline-flex min-h-[44px] items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500"
              >
                法令チャットで質問する →
              </a>
              <a
                href={`/law-search?q=${encodeURIComponent(result.chemicalName)}`}
                className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
              >
                法令全文検索で調べる →
              </a>
            </div>
          </div>

          {/* exp-r8-a: この物質を扱う作業の事故事例へワンタップ（作業内容を引き継ぎ事故AI分析をプリフィル）。
              社長指摘「物質→その物質の事故事例に飛べるか」への是正。AI分析は作業文から類似災害を返すため、
              汎用裁判例(石綿等に偏る)へのリンクは行き止まり回避のため張らない。 */}
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
            <h3 className="text-sm font-bold text-rose-900">この物質を扱う作業の事故事例を確認</h3>
            <p className="mt-1 text-xs text-rose-900/80">
              {result.chemicalName} を取り扱う作業で実際に起きた労働災害を、AIが過去の事例から抽出し注意点を提示します。
            </p>
            <div className="mt-3">
              <a
                href={`/accidents?work=${encodeURIComponent(`${result.chemicalName}を取り扱う作業`)}`}
                className="inline-flex min-h-[44px] items-center gap-1 rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-500"
              >
                類似の労災事例をAIで調べる →
              </a>
            </div>
          </div>

          {/* この場面で必要な保護具: 化学物質名から関連 PPE を絞り込み（フォールバックは呼吸器系） */}
          <ContextualPpePicks
            context={`${result.chemicalName} 化学物質 SDS 防塵 防毒 マスク 保護メガネ 耐薬品 手袋 保護衣`}
            fallbackCategoryIds={["respiratory", "eye-ear-protection", "hand-foot"]}
            heading={`🛡 ${result.chemicalName} 取扱い時に推奨される保護具`}
            description="GHS 分類・SDS の指示に沿って選定する候補。最終判断は公式 SDS と専門家の指導に従ってください。"
          />

          {/* 免責事項 */}
          <p className="text-[11px] leading-relaxed text-slate-400">
            ※ 本情報はAIが一般的なSDS・GHSデータに基づいて生成した参考情報です。
            実際の作業においては、製品の公式SDS・最新の法令・専門家の指導に従ってください。
            保護具購入リンクはアフィリエイトプログラムを利用しています。
          </p>

          {/* P1-1: 印刷時のみ確認印枠（実施者・化学物質管理者・統括安全衛生責任者）。 */}
          <ChemicalRaSignoffBoxes />

          {/* P2項目9: 統一CTA — メイン3機能 + 現場ツールへの次アクション */}
          <MainFeatureNextActions exclude="chemical-ra" contextLabel={result.chemicalName} />
        </div>
      )}
    </div>
  );
}
