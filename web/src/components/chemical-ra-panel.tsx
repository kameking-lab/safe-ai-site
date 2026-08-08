"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, BookOpen, Database, FileText, FlaskConical, FolderOpen, Gauge, Printer } from "lucide-react";
import { TextareaWithVoice } from "@/components/voice-input-field";
import { getChemicalKeyPoints, hasKeyPoints } from "@/lib/chemical/key-points";
import { auditedRegulationTags, type LegalProfileTagSource } from "@/lib/chemical/legal-profile-tags";
import { ChemicalRaReportHeader, ChemicalRaSignoffBoxes } from "@/components/chemical/chemical-ra-report-print";
import {
  createChemicalRaRecordPayload,
  getChemicalRaRecord,
  inspectChemicalRaRecordPayload,
  type ChemicalRaDispersion,
  type ChemicalRaFrequency,
  type ChemicalRaPayloadInspection,
  type ChemicalRaPpeSuitability,
  type ChemicalRaSdsStatus,
  type ChemicalRaSnapshotMissingField,
  type ChemicalRaSubstitutionStatus,
  type ChemicalRaTriState,
} from "@/lib/chemical/ra-cloud";
import { MainFeatureNextActions } from "@/components/main-feature-next-actions";
import type { MergedChemical } from "@/lib/mhlw-chemicals";
import { UnifiedChemicalSearch, type LegalNameHit } from "@/components/chemical/unified-chemical-search";
import { TransientChatLink } from "@/components/home-safety-cockpit/transient-chat-link";
import { useTransientQueryBridge } from "@/components/home-safety-cockpit/transient-query-bridge";
import {
  findChemicalByCas,
  searchChemicalCatalog,
} from "@/lib/chemical/search-client";
import type {
  ChemicalRaResponse,
  GhsHazard,
  SafetyMeasure,
} from "@/app/api/chemical-ra/route";
import { trackEvent } from "@/components/Analytics";
import { GhsPictogram } from "@/components/chemical/ghs-pictogram";
import { resolveGhsSymbol } from "@/lib/chemical/ghs-pictogram-map";
import { UsageNotesLink } from "@/components/usage-notes-link";
import { sanitizeChemicalRaResponse } from "@/lib/chemical/response-safety";
import { parseExposureLimit } from "@/lib/chemical/concentration-comparison";
import { inspectChemicalNavigationQuery } from "@/lib/chemical/query-safety";
import { fetchChemicalLegalProfile } from "@/lib/chemical/legal-profile-client";
import { KyHandoffLink } from "@/components/ky-handoff-link";

const ChemicalRaSaveButton = dynamic(
  () =>
    import("@/components/chemical/chemical-ra-save").then((module) => ({
      default: module.ChemicalRaSaveButton,
    })),
  {
    ssr: false,
    loading: () => (
      <span className="inline-flex min-h-[44px] items-center rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
        保存機能を読み込み中…
      </span>
    ),
  },
);

const ChemicalPpeSelectionBoundary = dynamic(
  () =>
    import("@/components/chemical/chemical-ppe-selection-boundary").then(
      (module) => module.ChemicalPpeSelectionBoundary,
    ),
  {
    ssr: false,
    loading: () => (
      <p
        role="status"
        className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700"
      >
        保護具選定の安全境界を読み込んでいます。
      </p>
    ),
  },
);

const MhlwChemicalInfoCard = dynamic(
  () =>
    import("@/components/mhlw-chemical-info-card").then(
      (module) => module.MhlwChemicalInfoCard,
    ),
  {
    ssr: false,
    loading: () => (
      <p
        role="status"
        className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700"
      >
        収録済みの公的物質情報を読み込んでいます。
      </p>
    ),
  },
);

const LegalConclusionCard = dynamic(
  () =>
    import("@/components/chemical/legal-conclusion-card").then(
      (module) => module.LegalConclusionCard,
    ),
  {
    ssr: false,
    loading: () => (
      <p
        role="status"
        className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700"
      >
        法的位置付けと一次資料リンクを確認しています。
      </p>
    ),
  },
);

const RaConclusionCard = dynamic(
  () =>
    import("@/components/chemical/ra-conclusion").then(
      (module) => module.RaConclusionCard,
    ),
  {
    ssr: false,
    loading: () => (
      <p
        role="status"
        className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700"
      >
        評価結果の安全境界を読み込んでいます。
      </p>
    ),
  },
);

// ────────────────────────────────────────────────────────────
// GHSピクトグラム（絵文字ベース）
// ────────────────────────────────────────────────────────────

function ghsSignalBadge(signal: string | undefined) {
  if (signal === "危険") {
    return (
      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
        危険
      </span>
    );
  }
  if (signal === "警告") {
    return (
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
        警告
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

// ────────────────────────────────────────────────────────────
// クイック検索候補
// ────────────────────────────────────────────────────────────

const QUICK_CHEMICALS = [
  "トルエン",
  "溶接ヒューム",
  "キシレン",
];

const SNAPSHOT_MISSING_LABEL: Record<
  ChemicalRaSnapshotMissingField,
  string
> = {
  "work-content": "作業内容",
  "sds-confirmation": "SDS確認",
  "sds-issued-on": "SDS発行日",
  "component-version": "成分・製品版",
  ventilation: "換気",
  "general-ventilation": "全体換気の有無",
  "local-exhaust": "局所排気の有無",
  amount: "取扱量",
  "duration-hours": "作業時間",
  frequency: "作業頻度",
  "use-temperature": "使用温度",
  dispersion: "飛散・噴霧の状態",
  "skin-contact": "皮膚接触の可能性",
  ppe: "使用する保護具",
  "ppe-suitability": "保護具の適合性確認",
  substitution: "代替物質の検討",
  "existing-controls": "既存措置",
  "additional-controls": "追加措置",
  "action-owner": "追加措置の担当",
  "action-due-on": "追加措置の期限",
  "reassessment-on": "再評価日",
  "measured-concentration": "測定濃度",
  "measured-unit": "測定単位",
  "rule-version": "記録ルール版",
  "captured-at": "保存時刻",
};

// ────────────────────────────────────────────────────────────
// メインパネル
// ────────────────────────────────────────────────────────────

type ErrorKind = "validation" | "ratelimit" | "apikey" | "timeout" | "network" | "unknown";

function categorizeError(message: string): { kind: ErrorKind; hint: string } {
  const lower = message.toLowerCase();
  if (lower.includes("api key") || lower.includes("apikey") || message.includes("APIキー") || message.includes("未設定")) {
    return { kind: "apikey", hint: "AI回答を利用できません。公的データによる結果を表示します。" };
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

export function ChemicalRaPanel({
  initialQuery = "",
}: {
  initialQuery?: string;
} = {}) {
  const {
    revision: transientQueryRevision,
    peekChemicalQuery,
    consumeChemicalQuery,
    discardChemicalQuery,
  } = useTransientQueryBridge();
  const initialPendingChemicalQueryRef = useRef(peekChemicalQuery());
  // CR2-T3(LCP): useSearchParams() は静的プリレンダーを Suspense フォールバックへ落とし、
  // 本パネル（STEP1 フォーム＝LCP要素）が「スケルトン先行→$RCスワップ」でしか描画されず
  // LCP 4.1s の主因になっていた（/laws C-1 と同じ構造）。マウント後に window.location から
  // 読み取り、静的HTMLにフォームを含める（page.tsx の Suspense も撤去）。
  const [urlParams, setUrlParams] = useState<URLSearchParams | null>(null);
  useEffect(() => {
    setUrlParams(new URLSearchParams(window.location.search));
  }, []);
  const [chemicalName, setChemicalName] = useState(
    initialQuery || initialPendingChemicalQueryRef.current?.query || "",
  );
  const [workContent, setWorkContent] = useState("");
  const [measuredConc, setMeasuredConc] = useState("");
  const [measuredUnit, setMeasuredUnit] = useState("");
  const [ventilation, setVentilation] = useState<"none" | "general" | "local" | "">("");
  const [amount, setAmount] = useState<"small" | "medium" | "large" | "">("");
  const [durationHours, setDurationHours] = useState<string>("");
  const [sdsStatus, setSdsStatus] = useState<ChemicalRaSdsStatus>("unknown");
  const [sdsIssuedOn, setSdsIssuedOn] = useState("");
  const [componentVersion, setComponentVersion] = useState("");
  const [generalVentilation, setGeneralVentilation] =
    useState<ChemicalRaTriState>("unknown");
  const [localExhaust, setLocalExhaust] =
    useState<ChemicalRaTriState>("unknown");
  const [frequency, setFrequency] = useState<ChemicalRaFrequency>(null);
  const [useTemperatureC, setUseTemperatureC] = useState("");
  const [dispersion, setDispersion] = useState<ChemicalRaDispersion>(null);
  const [skinContact, setSkinContact] =
    useState<ChemicalRaTriState>("unknown");
  const [ppeDescription, setPpeDescription] = useState("");
  const [ppeSuitability, setPpeSuitability] =
    useState<ChemicalRaPpeSuitability>("unknown");
  const [substitution, setSubstitution] =
    useState<ChemicalRaSubstitutionStatus>("unknown");
  const [existingControls, setExistingControls] = useState("");
  const [additionalControls, setAdditionalControls] = useState("");
  const [actionOwner, setActionOwner] = useState("");
  const [actionDueOn, setActionDueOn] = useState("");
  const [reassessmentOn, setReassessmentOn] = useState("");
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
  const [restoredPayloadState, setRestoredPayloadState] =
    useState<ChemicalRaPayloadInspection | null>(null);
  // 詳細モードでは作業条件と測定値の記録欄を表示する。独自のばく露推定には使わない。
  const [detailedMode, setDetailedMode] = useState(false);
  const conditionsAnchorRef = useRef<HTMLDivElement | null>(null);
  const resultAnchorRef = useRef<HTMLDivElement | null>(null);
  // ?run=1 付きで遷移してきた時に判定を一度だけ自動実行するためのガード。
  const autoRanRef = useRef(false);

  // P0-6: AI調査の結果生成完了時に結果セクションへスムーズスクロール＋フォーカス移動。
  // 読み上げ・キーボード操作ユーザーが結果に到達できるよう、tabIndex=-1 のアンカーに focus する。
  useEffect(() => {
    if (result && !loading && resultAnchorRef.current) {
      const node = resultAnchorRef.current;
      if (typeof node.scrollIntoView === "function") {
        node.scrollIntoView({ behavior: "smooth", block: "start" });
      }
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

  useEffect(() => {
    if (!detailedMode || !conditionsAnchorRef.current) return;
    const node = conditionsAnchorRef.current;
    node.scrollIntoView?.({ behavior: "smooth", block: "start" });
    window.requestAnimationFrame(() => node.focus({ preventScroll: true }));
  }, [detailedMode]);

  const displayedMhlw = mhlwSelected;

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
    let active = true;
    fetchChemicalLegalProfile<LegalProfileTagSource>(legalTagQuery)
      .then((j: LegalProfileTagSource) =>
        active
          ? setLegalTags({ q: legalTagQuery, tags: auditedRegulationTags(j) })
          : undefined,
      )
      .catch(() => {
        if (active) setLegalTags({ q: legalTagQuery, tags: [] });
      });
    return () => {
      active = false;
    };
  }, [legalTagQuery]);

  // 軸I: 結果の冒頭に「まず押さえる要点」を出すための抽出（GHS・対策の再構成＋監査済み規制タグ）。
  const keyPoints = useMemo(
    () =>
      result
        ? getChemicalKeyPoints(result, legalTags?.q === legalTagQuery ? legalTags.tags : [])
        : null,
    [result, legalTags, legalTagQuery],
  );

  // 数値比較は、APIが厚労省一次資料URLまで確認して返した値だけに限定する。
  // ローカル補助表やURL未確認の収録値を、安全判断へ昇格させない。
  const activeLimit = useMemo(() => {
    return result?.exposureLimit ?? null;
  }, [result]);

  const untraceableStoredLimit = Boolean(
    displayedMhlw?.details?.limit8h && !activeLimit,
  );

  const activeLimitUnit = useMemo(() => parseExposureLimit(activeLimit)?.unit ?? "", [activeLimit]);

  const savePayload = useMemo(
    () =>
      result
        ? createChemicalRaRecordPayload(result, {
            workContent,
            sdsStatus,
            sdsIssuedOn,
            componentVersion,
            ventilation,
            generalVentilation,
            localExhaust,
            amount,
            durationHours,
            frequency: frequency ?? "",
            useTemperatureC,
            dispersion: dispersion ?? "",
            skinContact,
            ppeDescription,
            ppeSuitability,
            substitution,
            existingControls,
            additionalControls,
            actionOwner,
            actionDueOn,
            reassessmentOn,
            measuredConcentration: measuredConc,
            measuredUnit,
          })
        : null,
    [
      result,
      workContent,
      sdsStatus,
      sdsIssuedOn,
      componentVersion,
      ventilation,
      generalVentilation,
      localExhaust,
      amount,
      durationHours,
      frequency,
      useTemperatureC,
      dispersion,
      skinContact,
      ppeDescription,
      ppeSuitability,
      substitution,
      existingControls,
      additionalControls,
      actionOwner,
      actionDueOn,
      reassessmentOn,
      measuredConc,
      measuredUnit,
    ],
  );

  // /chemical-ra?raId=... は台帳から保存済み実施記録を再表示（原本を再印刷するため、API再実行はしない）。
  // /chemical-ra?cas=... / ?name=... は新規実施の物質プリセット。
  useEffect(() => {
    const raId = urlParams?.get("raId");
    if (raId) {
      let cancelled = false;
      void getChemicalRaRecord(raId).then(async (rec) => {
        if (cancelled || !rec) return;
        const inspected = inspectChemicalRaRecordPayload(rec.payload);
        setRestoredPayloadState(inspected);
        if (
          !inspected.result ||
          typeof inspected.result !== "object" ||
          Array.isArray(inspected.result)
        ) {
          setError(
            "保存記録の結果本文を確認できません。条件を再入力し、最新SDSと公式ツールで再評価してください。",
          );
          setResult(null);
          setLoading(false);
          return;
        }
        // 旧版の独自判定・未検証AI応答は再表示時に隔離する。
        setResult(
          sanitizeChemicalRaResponse(
            inspected.result as ChemicalRaResponse,
          ),
        );
        setRestoredAt(rec.savedAt);
        const snapshot = inspected.assessmentSnapshot;
        if (snapshot) {
          setWorkContent(snapshot.workContent);
          setSdsStatus(snapshot.sds.status);
          setSdsIssuedOn(snapshot.sds.issuedOn ?? "");
          setComponentVersion(snapshot.sds.componentVersion ?? "");
          setVentilation(snapshot.ventilation ?? "");
          setGeneralVentilation(
            snapshot.engineeringControls.generalVentilation,
          );
          setLocalExhaust(snapshot.engineeringControls.localExhaust);
          setAmount(snapshot.amount ?? "");
          setDurationHours(
            snapshot.durationHours === null
              ? ""
              : String(snapshot.durationHours),
          );
          setFrequency(snapshot.frequency);
          setUseTemperatureC(
            snapshot.useTemperatureC === null
              ? ""
              : String(snapshot.useTemperatureC),
          );
          setDispersion(snapshot.dispersion);
          setSkinContact(snapshot.skinContact);
          setPpeDescription(snapshot.ppe.description);
          setPpeSuitability(snapshot.ppe.suitability);
          setSubstitution(snapshot.substitution);
          setExistingControls(snapshot.controls.existing);
          setAdditionalControls(snapshot.controls.additional);
          setActionOwner(snapshot.action.owner);
          setActionDueOn(snapshot.action.dueOn ?? "");
          setReassessmentOn(snapshot.action.reassessmentOn ?? "");
          setMeasuredConc(snapshot.measuredConcentration.value ?? "");
          setMeasuredUnit(snapshot.measuredConcentration.unit ?? "");
          setDetailedMode(true);
        } else {
          setWorkContent(rec.workContent);
        }
        if (rec.substance) setChemicalName(rec.substance);
        if (rec.cas) {
          try {
            const found = await findChemicalByCas(rec.cas);
            if (!cancelled && found) setMhlwSelected(found);
          } catch {
            if (!cancelled) {
              setErrorHint(
                "化学物質データベースを現在検索できません。保存済み評価の物質情報は、最新SDSとCAS番号で再確認してください。",
              );
            }
          }
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
      const ac = new AbortController();
      void findChemicalByCas(cas, ac.signal)
        .then((found) => {
          if (!found || ac.signal.aborted) return;
          setMhlwSelected(found);
          setChemicalName(found.primaryName);
        })
        .catch((error: unknown) => {
          if (
            ac.signal.aborted ||
            (error instanceof DOMException && error.name === "AbortError")
          ) {
            return;
          }
          setErrorHint(
            "化学物質データベースを現在検索できないため、CAS番号の収載有無を判定できません。最新SDSと公式ツールで確認してください。",
          );
        });
      return () => ac.abort();
    }
    const name = urlParams?.get("name");
    if (name) {
      const inspection = inspectChemicalNavigationQuery(name);
      if (inspection.allowed) {
        setChemicalName(inspection.normalized);
      } else {
        setChemicalName("");
        setErrorHint(
          "URLの入力は安全確認を通過しなかったため使用していません。物質名またはCAS番号だけを入力してください。",
        );
      }
    }
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

  // クイック候補は物質を選ぶところまで。判定前に作業条件を入力できる状態を保つ。
  const runQuickSearch = (name: string) => {
    setChemicalName(name);
    setMhlwSelected(null);
    void searchChemicalCatalog(name, 1)
      .then((items) => {
        if (items[0]) setMhlwSelected(items[0]);
      })
      .catch(() => {
        setErrorHint(
          "化学物質データベースを現在検索できないため、収載有無を判定できません。最新SDSとCAS番号を確認してください。",
        );
      });
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
    setRestoredPayloadState(null);

    const flowStartAt = Date.now();
    const MAX_RETRIES = 3;
    const dur = durationHours.trim() ? parseFloat(durationHours) : undefined;
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
          setResult(sanitizeChemicalRaResponse(data));
          trackEvent("flow_complete", { flow_type: "chemical-ra", duration: Math.round((Date.now() - flowStartAt) / 1000) });
          if (
            data.aiStatus &&
            data.aiStatus !== "ok" &&
            data.aiStatus !== "disabled_for_safety"
          ) {
            setErrorHint("一部を確認できません。公的データによる結果を表示します。");
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

  useEffect(() => {
    const pending = peekChemicalQuery();
    if (!pending) return;
    const inspection = inspectChemicalNavigationQuery(pending.query);
    if (!inspection.allowed) {
      discardChemicalQuery(pending.id);
      setChemicalName("");
      setErrorHint(
        "受け渡された入力は安全確認を通過しなかったため使用していません。物質名またはCAS番号だけを入力してください。",
      );
      return;
    }
    autoRanRef.current = true;
    consumeChemicalQuery(pending.id);
    setChemicalName(inspection.normalized);
    if (pending.confirmedCas) {
      void findChemicalByCas(pending.confirmedCas)
        .then((found) => {
          if (!found) {
            setErrorHint(
              "確認済みCAS番号の収載情報を再取得できません。最新SDSとCAS番号を確認してください。",
            );
            return;
          }
          setMhlwSelected(found);
          setChemicalName(found.primaryName);
          void handleSearch(found.primaryName);
        })
        .catch(() => {
          setErrorHint(
            "化学物質データベースを現在検索できません。通信回復後に再確認してください。",
          );
        });
    } else {
      void handleSearch(inspection.normalized);
    }
    // The pending value is an in-memory, single-use snapshot. The non-sensitive
    // revision also lets an already-open /chemical-ra consume a same-page link.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transientQueryRevision]);

  // 職種別クイックスタート等が ?name=…&run=1 / ?cas=…&run=1 で遷移してきた場合、
  // 着地時に判定を自動実行する（押した先で「何も起きない」を解消。raId 再表示時は実行しない）。
  useEffect(() => {
    if (autoRanRef.current) return;
    if (urlParams?.get("run") !== "1") return;
    if (urlParams?.get("raId")) return;
    const cas = urlParams?.get("cas");
    const nameParam = urlParams?.get("name");
    if (cas) {
      void findChemicalByCas(cas)
        .then((found) => {
          if (!found || autoRanRef.current) return;
          autoRanRef.current = true;
          setMhlwSelected(found);
          setChemicalName(found.primaryName);
          void handleSearch(found.primaryName);
        })
        .catch(() => {
          setErrorHint(
            "化学物質データベースを現在検索できないため、CAS番号の収載有無を判定できません。通信回復後に再試行してください。",
          );
        });
      return;
    }
    if (!nameParam) return;
    const inspection = inspectChemicalNavigationQuery(nameParam);
    if (!inspection.allowed) {
      setChemicalName("");
      setErrorHint(
        "URLの入力は安全確認を通過しなかったため使用していません。物質名またはCAS番号だけを入力してください。",
      );
      return;
    }
    autoRanRef.current = true;
    void handleSearch(inspection.normalized);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlParams]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 lg:px-8">
      {/* 検索フォーム（入力UI。印刷=A4実施記録では不要なので隠す） */}
      <div
        data-primary-task=""
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm print:hidden"
      >
        <div className="space-y-4">
          {/* 一窓化 (2026-07-11): 入力窓は1つ。物質名・CAS・法令名称（溶接ヒューム等）・
              製品名らしき入力を1つの窓で受け、収載外は正直に明示して次の一歩を出す */}
          <UnifiedChemicalSearch
            query={chemicalName}
            selectedChemical={mhlwSelected}
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
          <UsageNotesLink className="text-brand-primary" />

          {/* 該当法令の結論カード（結論ファースト: 物質が決まった瞬間に一窓の直下へ） */}
          {(displayedMhlw || legalSelected) && (
            <LegalConclusionCard
              q={legalSelected?.label ?? displayedMhlw?.cas ?? displayedMhlw?.primaryName ?? ""}
            />
          )}

          {/* ③ 作業条件メモ（詳細モードのみ） */}
          {detailedMode && (
          <div
            ref={conditionsAnchorRef}
            id="chemical-ra-work-conditions"
            tabIndex={-1}
            className="scroll-mt-24 rounded-lg border border-blue-200 bg-blue-50/40 p-3 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-300"
          >
            <p className="text-xs font-semibold text-blue-900">
              作業条件
            </p>
            <label className="mt-2 block text-[11px] font-semibold text-blue-950">
              作業内容（任意）— 最新SDS・公式ツール確認用のメモ
              <TextareaWithVoice
                rows={2}
                value={workContent}
                onChange={(event) => setWorkContent(event.target.value)}
                placeholder="例: 屋内で刷毛塗り、1日2時間"
                className="mt-1 text-xs"
              />
            </label>
            <fieldset className="mt-2 rounded-lg border border-blue-200 bg-white/70 p-3">
              <legend className="px-1 text-[11px] font-bold text-blue-950">
                製品固有SDSの確認記録
              </legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <label className="text-[11px] text-slate-700">
                  SDS確認状況
                  <select
                    value={sdsStatus}
                    onChange={(event) =>
                      setSdsStatus(
                        event.target.value as ChemicalRaSdsStatus,
                      )
                    }
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs"
                  >
                    <option value="unknown">未選択・不明</option>
                    <option value="not-confirmed">未確認</option>
                    <option value="confirmed">製品固有のSDSを確認済み</option>
                  </select>
                </label>
                <label className="text-[11px] text-slate-700">
                  SDS発行日
                  <input
                    type="date"
                    value={sdsIssuedOn}
                    onChange={(event) => setSdsIssuedOn(event.target.value)}
                    className="mt-1 min-h-[44px] w-full rounded-md border border-slate-300 bg-white px-2 text-xs"
                  />
                </label>
                <label className="text-[11px] text-slate-700">
                  成分・製品版
                  <input
                    type="text"
                    value={componentVersion}
                    onChange={(event) =>
                      setComponentVersion(event.target.value)
                    }
                    placeholder="例: 製品A / 第3版"
                    className="mt-1 min-h-[44px] w-full rounded-md border border-slate-300 bg-white px-2 text-xs"
                  />
                </label>
              </div>
              <p className="mt-2 text-[10px] leading-4 text-slate-600">
                「確認済み」は、使用する製品と成分版が一致するSDSを人が確認した場合だけ選んでください。
              </p>
            </fieldset>
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
            <fieldset className="mt-3 rounded-lg border border-blue-200 bg-white/70 p-3">
              <legend className="px-1 text-[11px] font-bold text-blue-950">
                使用条件
              </legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <label className="text-[11px] text-slate-700">
                  使用温度（℃）
                  <input
                    type="number"
                    min="-50"
                    max="200"
                    step="0.1"
                    value={useTemperatureC}
                    onChange={(event) =>
                      setUseTemperatureC(event.target.value)
                    }
                    placeholder="例: 25"
                    className="mt-1 min-h-[44px] w-full rounded-md border border-slate-300 bg-white px-2 text-xs"
                  />
                </label>
                <label className="text-[11px] text-slate-700">
                  作業頻度
                  <select
                    value={frequency ?? ""}
                    onChange={(event) =>
                      setFrequency(
                        (event.target.value || null) as ChemicalRaFrequency,
                      )
                    }
                    className="mt-1 min-h-[44px] w-full rounded-md border border-slate-300 bg-white px-2 text-xs"
                  >
                    <option value="">未選択</option>
                    <option value="one-off">単発</option>
                    <option value="daily">毎日</option>
                    <option value="weekly">毎週</option>
                    <option value="monthly">毎月</option>
                    <option value="less-than-monthly">月1回未満</option>
                  </select>
                </label>
                <label className="text-[11px] text-slate-700">
                  飛散・噴霧の状態
                  <select
                    value={dispersion ?? ""}
                    onChange={(event) =>
                      setDispersion(
                        (event.target.value || null) as ChemicalRaDispersion,
                      )
                    }
                    className="mt-1 min-h-[44px] w-full rounded-md border border-slate-300 bg-white px-2 text-xs"
                  >
                    <option value="">未選択</option>
                    <option value="none">飛散なし</option>
                    <option value="dust">粉じん</option>
                    <option value="mist">ミスト</option>
                    <option value="spray">スプレー・噴霧</option>
                    <option value="vapor">蒸気</option>
                    <option value="other">その他</option>
                  </select>
                </label>
                <label className="text-[11px] text-slate-700">
                  皮膚接触の可能性
                  <select
                    value={skinContact}
                    onChange={(event) =>
                      setSkinContact(
                        event.target.value as ChemicalRaTriState,
                      )
                    }
                    className="mt-1 min-h-[44px] w-full rounded-md border border-slate-300 bg-white px-2 text-xs"
                  >
                    <option value="unknown">不明・未確認</option>
                    <option value="yes">あり</option>
                    <option value="no">なし</option>
                  </select>
                </label>
              </div>
            </fieldset>
            <fieldset className="mt-3 rounded-lg border border-blue-200 bg-white/70 p-3">
              <legend className="px-1 text-[11px] font-bold text-blue-950">
                換気設備
              </legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="text-[11px] text-slate-700">
                  全体換気
                  <select
                    value={generalVentilation}
                    onChange={(event) => {
                      const next = event.target.value as ChemicalRaTriState;
                      setGeneralVentilation(next);
                      if (next === "yes" && localExhaust !== "yes") {
                        setVentilation("general");
                      } else if (next === "no" && localExhaust === "no") {
                        setVentilation("none");
                      }
                    }}
                    className="mt-1 min-h-[44px] w-full rounded-md border border-slate-300 bg-white px-2 text-xs"
                  >
                    <option value="unknown">不明・未確認</option>
                    <option value="yes">あり</option>
                    <option value="no">なし</option>
                  </select>
                </label>
                <label className="text-[11px] text-slate-700">
                  局所排気
                  <select
                    value={localExhaust}
                    onChange={(event) => {
                      const next = event.target.value as ChemicalRaTriState;
                      setLocalExhaust(next);
                      if (next === "yes") {
                        setVentilation("local");
                      } else if (next === "no" && generalVentilation === "yes") {
                        setVentilation("general");
                      } else if (
                        next === "no" &&
                        generalVentilation === "no"
                      ) {
                        setVentilation("none");
                      }
                    }}
                    className="mt-1 min-h-[44px] w-full rounded-md border border-slate-300 bg-white px-2 text-xs"
                  >
                    <option value="unknown">不明・未確認</option>
                    <option value="yes">あり</option>
                    <option value="no">なし</option>
                  </select>
                </label>
              </div>
              <p className="mt-2 text-[10px] leading-4 text-slate-600">
                「あり」は設備の存在だけでなく、対象作業で稼働し、点検状態と捕捉位置を人が確認した場合に選択してください。
              </p>
            </fieldset>
            <fieldset className="mt-3 rounded-lg border border-blue-200 bg-white/70 p-3">
              <legend className="px-1 text-[11px] font-bold text-blue-950">
                保護具・代替物質
              </legend>
              <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                <label className="text-[11px] text-slate-700">
                  使用する保護具
                  <TextareaWithVoice
                    value={ppeDescription}
                    onChange={(event) =>
                      setPpeDescription(event.target.value)
                    }
                    placeholder="例: SDSと作業条件に基づき選定した防毒マスク、耐薬品手袋、保護眼鏡"
                    className="mt-1 min-h-20 bg-white"
                  />
                </label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <label className="text-[11px] text-slate-700">
                    保護具の適合性
                    <select
                      value={ppeSuitability}
                      onChange={(event) =>
                        setPpeSuitability(
                          event.target.value as ChemicalRaPpeSuitability,
                        )
                      }
                      className="mt-1 min-h-[44px] w-full rounded-md border border-slate-300 bg-white px-2 text-xs"
                    >
                      <option value="unknown">不明・未確認</option>
                      <option value="not-confirmed">未確認</option>
                      <option value="confirmed">
                        SDS・作業条件・製品仕様で確認済み
                      </option>
                    </select>
                  </label>
                  <label className="text-[11px] text-slate-700">
                    代替物質の検討
                    <select
                      value={substitution}
                      onChange={(event) =>
                        setSubstitution(
                          event.target.value as ChemicalRaSubstitutionStatus,
                        )
                      }
                      className="mt-1 min-h-[44px] w-full rounded-md border border-slate-300 bg-white px-2 text-xs"
                    >
                      <option value="unknown">不明・未確認</option>
                      <option value="considered">検討済み</option>
                      <option value="not-considered">未検討</option>
                      <option value="not-applicable">該当なし（理由を記録）</option>
                    </select>
                  </label>
                </div>
              </div>
            </fieldset>
            <fieldset className="mt-3 rounded-lg border border-blue-200 bg-white/70 p-3">
              <legend className="px-1 text-[11px] font-bold text-blue-950">
                措置・担当・期限
              </legend>
              <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                <label className="text-[11px] text-slate-700">
                  既存措置
                  <TextareaWithVoice
                    value={existingControls}
                    onChange={(event) =>
                      setExistingControls(event.target.value)
                    }
                    placeholder="現在実施している代替、密閉、換気、作業手順、教育、保護具など"
                    className="mt-1 min-h-20 bg-white"
                  />
                </label>
                <label className="text-[11px] text-slate-700">
                  追加措置
                  <TextareaWithVoice
                    value={additionalControls}
                    onChange={(event) =>
                      setAdditionalControls(event.target.value)
                    }
                    placeholder="追加で実施する措置。不要の場合も、その理由を記録してください"
                    className="mt-1 min-h-20 bg-white"
                  />
                </label>
              </div>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <label className="text-[11px] text-slate-700">
                  担当
                  <input
                    type="text"
                    value={actionOwner}
                    onChange={(event) => setActionOwner(event.target.value)}
                    placeholder="例: 化学物質管理者"
                    className="mt-1 min-h-[44px] w-full rounded-md border border-slate-300 bg-white px-2 text-xs"
                  />
                </label>
                <label className="text-[11px] text-slate-700">
                  期限
                  <input
                    type="date"
                    value={actionDueOn}
                    onChange={(event) => setActionDueOn(event.target.value)}
                    className="mt-1 min-h-[44px] w-full rounded-md border border-slate-300 bg-white px-2 text-xs"
                  />
                </label>
                <label className="text-[11px] text-slate-700">
                  再評価日
                  <input
                    type="date"
                    value={reassessmentOn}
                    onChange={(event) =>
                      setReassessmentOn(event.target.value)
                    }
                    className="mt-1 min-h-[44px] w-full rounded-md border border-slate-300 bg-white px-2 text-xs"
                  />
                </label>
              </div>
            </fieldset>
            <p className="mt-1 text-[10px] text-slate-500">
              ※ 本サイトではこの条件から判定値を算出しません。製品固有の最新SDSと厚生労働省の公式CREATE-SIMPLEへ入力し、化学物質管理者または専門家が確認してください。
            </p>
          </div>
          )}

          {/* ④ 測定濃度は記録のみ。時間基準・採取法・代表性を確認できないため自動比較しない。 */}
          {detailedMode && (
          <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-amber-900">
              <Gauge className="h-3.5 w-3.5" />
              ④ 作業環境の測定値メモ（任意）— 自動判定しません
            </label>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input
                type="text"
                inputMode="decimal"
                value={measuredConc}
                onChange={(e) => setMeasuredConc(e.target.value)}
                placeholder="例: 15"
                className="w-32 rounded-md border border-amber-300 bg-white px-2.5 py-1.5 text-sm"
                aria-label="測定濃度の数値"
              />
              <label className="text-xs font-semibold text-amber-900">
                単位
                <select
                  value={measuredUnit}
                  onChange={(event) => setMeasuredUnit(event.target.value)}
                  className="ml-1 min-h-[44px] rounded-md border border-amber-300 bg-white px-2 text-sm"
                >
                  <option value="">選択必須</option>
                  <option value="ppm">ppm</option>
                  <option value="mg/m3">mg/m³</option>
                  {activeLimitUnit && !["ppm", "mg/m3"].includes(activeLimitUnit) && (
                    <option value={activeLimitUnit}>{activeLimitUnit}</option>
                  )}
                </select>
              </label>
              <span className="text-xs text-amber-800">
                {activeLimit ? (
                  <>
                    参照値: <span className="font-bold">{activeLimit}</span>（自動比較には使用しません）
                  </>
                ) : (
                  untraceableStoredLimit
                    ? "一次資料URLを個別確認できない収録値のため、数値比較を停止しています"
                    : "物質を選択し、追跡可能な基準値がある場合だけ比較できます"
                )}
              </span>
            </div>
            <p className="mt-2 text-xs font-semibold leading-5 text-amber-950">
              8時間TWA・短時間値・天井値と測定値は、時間基準、採取法、単位、代表性を確認しないと比較できません。
              ここでは測定メモだけを保存し、超過／非超過は判定しません。公式CREATE-SIMPLE、作業環境測定機関または専門家で確認してください。
            </p>
          </div>
          )}
        </div>

        {/* 初期表示の候補は3件まで。自由入力も常に使える。 */}
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold text-slate-500">よく扱う物質</p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_CHEMICALS.map((chem) => (
              <button
                key={chem}
                data-chemical-quick-substance="true"
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

        <div className="mt-4 border-t border-slate-100 pt-4">
          <button
            type="button"
            data-primary-action="true"
            onClick={() => {
              if (detailedMode) {
                void handleSearch();
                return;
              }
              setDetailedMode(true);
            }}
            disabled={!chemicalName.trim() || loading}
            aria-busy={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <span aria-hidden="true" className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                確認中…
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" aria-hidden="true" />
                {detailedMode ? "公的情報を確認" : "作業条件へ進む"}
              </>
            )}
          </button>
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
              <p className="font-semibold">化学物質情報を取得できませんでした</p>
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
          aria-label="化学物質情報"
          className="space-y-6 scroll-mt-20 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 print:space-y-3"
        >
          {/* 柱0: 結論カード（1画面1メッセージ）— リスクレベルのデカ表示＋I〜IV色帯＋
              GHS絵表示＋まず行う対策＋保護具動線。旧「まず押さえる要点」の内容を統合
              （hazards/actions/regulations は keyPoints から表示・正確性は不変）。
              下の詳細（GHS分類・濃度基準・保護具・規制）は、この結論の根拠。 */}
          {keyPoints && hasKeyPoints(keyPoints) && (
            <RaConclusionCard
              result={result}
              keyPoints={keyPoints}
            />
          )}
          {mhlwSelected?.cas &&
          result.casNumber === mhlwSelected.cas ? (
            <div className="rounded-xl border-2 border-emerald-700 bg-emerald-50 p-4 print:hidden">
              <h2 className="text-sm font-black text-emerald-950">
                確認済み物質条件をKY候補へ
              </h2>
              <p className="mt-1 text-xs leading-5 text-emerald-950">
                CASと作業下書きを同一originの一時領域で渡します。危険・対策はKY側で人が選択してください。
              </p>
              <KyHandoffLink
                handoff={{
                  source: "chemical-ra",
                  chemicalId: `cas:${mhlwSelected.cas}`,
                  cas: mhlwSelected.cas,
                  workCategory: "chemical",
                  hazardIds: ["chemical-exposure", "chemical-splash"],
                  measureIds: [
                    "chemical-substitute",
                    "chemical-local-exhaust",
                    "chemical-sds",
                  ],
                  ...(workContent.trim() ? { workDraft: workContent } : {}),
                }}
                className="mt-3 inline-flex min-h-11 items-center rounded-lg bg-emerald-800 px-4 py-2 text-sm font-black text-white"
              >
                この作業条件をKYへ
              </KyHandoffLink>
            </div>
          ) : null}
          {restoredAt && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-xs text-sky-900 print:hidden">
              <FolderOpen className="h-4 w-4 shrink-0 text-sky-600" aria-hidden="true" />
              <span>
                <strong className="font-semibold">保存済みの参考情報記録を表示中</strong>（保存日: {new Date(restoredAt).toLocaleDateString("ja-JP")}）。
                結果は再計算せず、安全判断用ではない内容を隔離して表示しています。
              </span>
            </div>
          )}
          {restoredPayloadState?.status === "complete" && (
            <div
              role="note"
              className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-xs text-emerald-950 print:hidden"
            >
              保存時のSDS確認状況・作業条件・測定値・単位・記録ルール版を復元しています。
              現在のSDSや現場条件と一致するか人が再確認してください。
            </div>
          )}
          {restoredPayloadState &&
            restoredPayloadState.status !== "complete" && (
              <div
                role="note"
                className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-950 print:hidden"
              >
                <p className="font-bold">
                  {restoredPayloadState.status === "legacy-missing"
                    ? "旧形式のため、保存時の評価条件を復元できません"
                    : "保存時の評価条件が不完全です"}
                </p>
                <p className="mt-1 leading-5">
                  この記録を条件まで再現した原本とは扱わず、最新SDSと公式CREATE-SIMPLEで再評価してください。
                  不足:{" "}
                  {restoredPayloadState.missingFields
                    .map((field) => SNAPSHOT_MISSING_LABEL[field])
                    .join("、")}
                </p>
              </div>
            )}
          {savePayload &&
            savePayload.assessmentSnapshot.completeness === "incomplete" &&
            !restoredAt && (
              <div
                role="note"
                className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-950 print:hidden"
              >
                <p className="font-bold">保存条件はまだ不完全です</p>
                <p className="mt-1 leading-5">
                  保存はできますが、不完全記録として残ります。不足:{" "}
                  {savePayload.assessmentSnapshot.missingFields
                    .map((field) => SNAPSHOT_MISSING_LABEL[field])
                    .join("、")}
                </p>
              </div>
            )}
          <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
            <p className="text-xs font-bold text-emerald-700">A4 参考情報記録（正式なリスクアセスメント様式ではありません）</p>
            <div className="flex items-center gap-2">
              {/* P1-5: RA結果のクラウド保管（localStorage即時＋クラウド背景同期） */}
              <ChemicalRaSaveButton
                chemicalName={result.chemicalName}
                cas={result.casNumber ?? ""}
                workContent={workContent}
                exposureBand=""
                payload={savePayload ?? result}
              />
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                <Printer className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />A4実施レポート印刷 / PDF保存
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
                <span className="font-semibold">収録済み濃度基準値:</span> {result.exposureLimit}
              </p>
            )}
          </div>

          {result.assessmentNotice && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-900">
              <p>
                <span className="font-bold">判定値</span>
                <span className="ml-2 text-slate-600">未算出</span>
              </p>
              <a
                href="https://anzeninfo.mhlw.go.jp/user/anzen/kag/ankgc07_3.htm"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center font-bold text-emerald-800 underline underline-offset-2"
              >
                公式CREATE-SIMPLEで判定
              </a>
            </div>
          )}

          {/* 関連する有害性 */}
          {result.relatedHazards && result.relatedHazards.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
              <h3 className="flex items-center gap-2 text-sm font-bold text-amber-900">
                <Database className="h-4 w-4" />
                関連する有害性
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

          {/* 旧生成PPEが混入した場合も商品へ誘導せず隔離する。 */}
          {result.ppeRecommendations.length > 0 && (
            <div className="rounded-xl border border-rose-300 bg-rose-50 p-5 text-xs leading-6 text-rose-950">
              旧版の未検証PPE候補 {result.ppeRecommendations.length}
              件を隔離しました。商品名・購入リンクは表示せず、最新SDSと作業条件から再選定してください。
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
              <h2 className="mb-2 text-sm font-bold text-slate-900">
                法規制の確認候補
              </h2>
              <ul className="space-y-1.5">
                {result.regulatoryNotes.map((note, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <span aria-hidden="true" className="mt-0.5 shrink-0 text-amber-700">・</span>
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
              SDS名・CAS・作業条件を添えて、関連条文を確認します。
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <TransientChatLink
                question={`${result.chemicalName} の取扱い基準と関連する特化則・有機則の条文を教えて`}
                className="inline-flex min-h-[44px] items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500"
              >
                法令チャットで質問する →
              </TransientChatLink>
              <a
                href="/law-search"
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
            <div className="mt-3">
              <a
                href="https://anzeninfo.mhlw.go.jp/anzen_pg/SAI_FND.aspx"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] items-center gap-1 rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-500"
              >
                厚生労働省の公式事故検索で確認 →
              </a>
            </div>
          </div>

          <ChemicalPpeSelectionBoundary
            chemicalName={result.chemicalName}
            sdsConfirmed={sdsStatus === "confirmed"}
            suitabilityConfirmed={ppeSuitability === "confirmed"}
          />

          {/* P1-1: 印刷時のみ確認印枠（実施者・化学物質管理者・統括安全衛生責任者）。 */}
          <ChemicalRaSignoffBoxes />

          {/* P2項目9: 統一CTA — メイン3機能 + 現場ツールへの次アクション */}
          <MainFeatureNextActions exclude="chemical-ra" contextLabel={result.chemicalName} />
        </div>
      )}
    </div>
  );
}
