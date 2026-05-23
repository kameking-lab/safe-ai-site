"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Printer,
  Eye,
  EyeOff,
  RefreshCw,
  BookOpen,
  Sparkles,
  Save,
} from "lucide-react";
import { KyPaperSheet } from "./ky-paper-sheet";
import { KyExamplesPanel } from "@/components/ky-examples-panel";
import { LocalStorageWarningBanner } from "@/components/local-storage-warning-banner";
import { TranslatedPageHeader } from "@/components/translated-page-header";
import { RelatedPageCards } from "@/components/related-page-cards";
import { loadProfile } from "@/lib/company-profile";
import { normalizeKyInstructionRecord } from "@/lib/services/operations-service";
import { createServices } from "@/lib/services/service-factory";
import type {
  KyInstructionRecordState,
  KyInstructionRiskRow,
  KyInstructionParticipant,
  KyInstructionWorkRow,
  KyInstructionFallCheck,
} from "@/lib/types/operations";
import type { KyExample, KyIndustryId } from "@/types/ky-example";

const STORAGE_KEY_RECORD = "ky-record";

function makeInitialRecord(): KyInstructionRecordState {
  const emptyWork = (): KyInstructionWorkRow => ({
    workPlace: "",
    workDetail: "",
    machinery: "",
    fireMark: "",
    heightMark: "",
    ppeNote: "",
    safetyInstruction: "",
    responsible: "",
    primeSign: "",
  });
  const emptyRisk = (label: string): KyInstructionRiskRow => ({
    targetLabel: label,
    hazard: "",
    qualNo: "",
    likelihood: 1,
    severity: 1,
    reduction: "",
    reLikelihood: 1,
    reSeverity: 1,
    reducedBelow2: "",
    primeSign: "",
  });
  const emptyP = (): KyInstructionParticipant => ({
    name: "",
    qualNo: "",
    preWork: "",
    onExit: "",
  });
  const emptyFall = (): KyInstructionFallCheck => ({ good: "", bad: "", done: "" });
  return {
    reportStamps: ["", "", "", "", ""],
    workDateYear: "",
    workDateMonth: "",
    workDateDay: "",
    workDateNote: "",
    weather: "",
    coop1Name: "",
    coop1Chief: "",
    coop2Name: "",
    coop2Chief: "",
    coop3Name: "",
    coop3Chief: "",
    workRows: [emptyWork(), emptyWork(), emptyWork(), emptyWork()],
    riskRows: [
      emptyRisk("自由記述欄"),
      emptyRisk("○"),
      emptyRisk("○"),
      emptyRisk("○"),
      emptyRisk("○"),
    ],
    participants: Array.from({ length: 8 }, () => emptyP()),
    participantTotal: "",
    breaks: ["", "", "", "", ""],
    safetyVest: "",
    exitLarge: "",
    exitMedium: "",
    exitSmall: "",
    closingNote: "",
    fallChecks: [emptyFall(), emptyFall(), emptyFall()],
    correctionNote: "",
  };
}

const PROFILE_TO_KY_INDUSTRY: Record<string, KyIndustryId> = {
  construction: "construction",
  manufacturing: "manufacturing",
  transport: "transport",
  logistics: "transport",
  healthcare: "medical-welfare",
  it: "service",
  forestry: "construction",
  other: "service",
};

export function KyPaperPageContent() {
  const services = useMemo(() => createServices(), []);
  const searchParams = useSearchParams();
  const [record, setRecord] = useState<KyInstructionRecordState>(makeInitialRecord);
  const [hydrated, setHydrated] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [savedLabel, setSavedLabel] = useState("記入すると自動保存されます");
  const [profileIndustry, setProfileIndustry] = useState<KyIndustryId | undefined>();

  // 初回ロード: localStorage 復元 + 日付セット + プロファイル
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_RECORD);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        setRecord(normalizeKyInstructionRecord(parsed));
      }
    } catch {
      try {
        localStorage.removeItem(STORAGE_KEY_RECORD);
      } catch {}
    }
    setRecord((prev) => {
      if (prev.workDateYear || prev.workDateMonth || prev.workDateDay) return prev;
      const d = new Date();
      return {
        ...prev,
        workDateYear: String(d.getFullYear()),
        workDateMonth: String(d.getMonth() + 1),
        workDateDay: String(d.getDate()),
      };
    });
    const profile = loadProfile();
    if (profile.wizardCompleted) {
      const mapped = PROFILE_TO_KY_INDUSTRY[profile.industry];
      if (mapped) setProfileIndustry(mapped);
      if (profile.sites[0]) {
        setRecord((prev) => {
          const next = [...prev.reportStamps] as KyInstructionRecordState["reportStamps"];
          if (!next[0]) next[0] = profile.sites[0];
          return { ...prev, reportStamps: next };
        });
      }
    }
    setHydrated(true);
  }, []);

  // 自動保存 (1秒デバウンス)
  useEffect(() => {
    if (!hydrated) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY_RECORD, JSON.stringify(record));
        setSavedLabel(`自動保存: ${new Date().toLocaleTimeString("ja-JP")}`);
      } catch {}
    }, 1000);
    return () => clearTimeout(t);
  }, [record, hydrated]);

  const patch = useCallback((p: Partial<KyInstructionRecordState>) => {
    setRecord((prev) => ({ ...prev, ...p }));
  }, []);

  const handleReset = useCallback(() => {
    if (!window.confirm("用紙の内容をリセットします。よろしいですか?")) return;
    const fresh = makeInitialRecord();
    const d = new Date();
    fresh.workDateYear = String(d.getFullYear());
    fresh.workDateMonth = String(d.getMonth() + 1);
    fresh.workDateDay = String(d.getDate());
    setRecord(fresh);
  }, []);

  const handlePrint = useCallback(() => {
    setPreviewMode(true);
    // 描画反映待ち
    setTimeout(() => window.print(), 100);
  }, []);

  const handleManualSave = useCallback(async () => {
    const result = await services.operations.saveKyInstructionRecord(record);
    if (result.ok) {
      setSavedLabel(`保存しました: ${new Date().toLocaleTimeString("ja-JP")}`);
    } else {
      setSavedLabel(`保存に失敗: ${result.error?.message ?? ""}`);
    }
  }, [record, services.operations]);

  /** KY実例DBから選択 → riskRows[1..3] に hazards/countermeasures を流し込む */
  const handleExampleApply = useCallback((ex: KyExample) => {
    setRecord((prev) => {
      const nextRisks = [...prev.riskRows];
      // riskRows[1..4] の hazard をexample.hazards最大4件で埋める
      for (let i = 0; i < Math.min(4, ex.hazards.length); i++) {
        const slot = i + 1;
        nextRisks[slot] = {
          ...nextRisks[slot],
          hazard: ex.hazards[i],
        };
      }
      // 対策 ①〜③ (riskRows[1..3].reduction) を埋める
      for (let i = 0; i < Math.min(3, ex.countermeasures.length); i++) {
        const slot = i + 1;
        nextRisks[slot] = {
          ...nextRisks[slot],
          reduction: ex.countermeasures[i],
        };
      }
      // 作業内容にも例題タイトルをヒントとして注入 (空のときのみ)
      const nextWork = prev.workRows.map((r, idx) => {
        if (idx === 0 && !r.workDetail) {
          return { ...r, workDetail: ex.title };
        }
        return r;
      });
      return { ...prev, riskRows: nextRisks, workRows: nextWork };
    });
    setSavedLabel(`実例「${ex.title}」を反映しました`);
  }, []);

  const handleAiDraft = useCallback(async () => {
    const workContext = record.workRows[0]?.workDetail?.trim();
    if (!workContext) {
      setAiError("先に作業内容を入力してください");
      return;
    }
    setAiBusy(true);
    setAiError(null);
    try {
      const res = await fetch("/api/ky-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "table",
          workContext,
          industryId: profileIndustry ?? "construction",
        }),
      });
      if (!res.ok) throw new Error(`AI生成に失敗 (${res.status})`);
      const data = (await res.json()) as {
        rows?: { hazard?: string; reduction?: string }[];
      };
      const rows = (data.rows ?? []).slice(0, 4);
      if (rows.length === 0) throw new Error("AIが生成できませんでした");
      setRecord((prev) => {
        const next = [...prev.riskRows];
        rows.forEach((r, i) => {
          const slot = i + 1;
          next[slot] = {
            ...next[slot],
            hazard: r.hazard ?? next[slot].hazard,
            reduction: r.reduction ?? next[slot].reduction,
          };
        });
        return { ...prev, riskRows: next };
      });
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "AI生成に失敗しました");
    } finally {
      setAiBusy(false);
    }
  }, [record.workRows, profileIndustry]);

  const showLegacyHint = searchParams?.get("mode") === "legacy-hint";

  return (
    <div className="min-h-screen bg-slate-50 pb-12 print:bg-white print:pb-0">
      <div className="mx-auto max-w-[1200px] px-3 pt-4 print:hidden sm:px-6">
        <TranslatedPageHeader
          titleJa="KY活動記録表"
          titleEn="KY Activity Record (Paper-First)"
          descriptionJa="朝礼3分で危険予知活動を記録。完成形の用紙を直接書き込めます。"
          descriptionEn="Hazard prediction activity in 3-minute morning briefing. Edit directly on the printable sheet."
          iconName="ClipboardList"
          iconColor="emerald"
        />
        <LocalStorageWarningBanner />
        {showLegacyHint && (
          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
            従来の詳細フォーム (現地KY記録表・墜落防止点検など) は{" "}
            <Link
              href="/ky/legacy"
              className="font-semibold text-emerald-700 underline"
            >
              詳細モード
            </Link>{" "}
            で利用できます。
          </div>
        )}
      </div>

      {/* ツールバー */}
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-2 px-3 py-2 sm:px-6">
          <div className="flex flex-wrap items-center gap-1.5">
            <ToolbarButton
              onClick={() => setShowExamples((v) => !v)}
              icon={<BookOpen className="h-3.5 w-3.5" />}
              tone={showExamples ? "active" : "neutral"}
              label={showExamples ? "実例パネルを閉じる" : "実例から引用 (150件)"}
            />
            <ToolbarButton
              onClick={handleAiDraft}
              disabled={aiBusy}
              icon={<Sparkles className="h-3.5 w-3.5" />}
              tone="violet"
              label={aiBusy ? "AI生成中…" : "AIたたき台"}
            />
            <ToolbarButton
              onClick={() => setPreviewMode((v) => !v)}
              icon={
                previewMode ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )
              }
              tone={previewMode ? "active" : "neutral"}
              label={previewMode ? "編集に戻る" : "完成形プレビュー"}
            />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="hidden text-[10px] text-slate-500 sm:inline">
              {savedLabel}
            </span>
            <ToolbarButton
              onClick={handleManualSave}
              icon={<Save className="h-3.5 w-3.5" />}
              tone="neutral"
              label="保存"
            />
            <ToolbarButton
              onClick={handleReset}
              icon={<RefreshCw className="h-3.5 w-3.5" />}
              tone="neutral"
              label="リセット"
            />
            <ToolbarButton
              onClick={handlePrint}
              icon={<Printer className="h-3.5 w-3.5" />}
              tone="primary"
              label="印刷 / PDF"
            />
          </div>
        </div>
        {aiError && (
          <div className="mx-auto max-w-[1200px] px-3 pb-2 sm:px-6">
            <p className="rounded border border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] text-rose-800">
              {aiError}
            </p>
          </div>
        )}
      </div>

      {/* 用紙本体 */}
      <div className="mx-auto mt-4 grid max-w-[1200px] gap-4 px-3 print:m-0 print:px-0 sm:px-6 lg:grid-cols-[1fr_320px]">
        <div className="print:m-0">
          <KyPaperSheet
            record={record}
            patch={patch}
            previewMode={previewMode}
          />
        </div>

        {/* 右サイド: 実例パネル (PC時のみ表示。スマホでは上部トグルで切替) */}
        {showExamples && (
          <aside className="lg:sticky lg:top-16 lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto print:hidden">
            <KyExamplesPanel
              defaultIndustry={profileIndustry}
              workContextText={record.workRows[0]?.workDetail}
              onApply={handleExampleApply}
              alwaysOpen
            />
          </aside>
        )}
      </div>

      {/* 関連ページ */}
      <div className="mx-auto mt-8 max-w-[1200px] px-3 print:hidden sm:px-6">
        <RelatedPageCards
          heading="合わせて使う"
          pages={[
            {
              href: "/safety-diary",
              label: "安全衛生日誌",
              description: "本日のKY結果をそのまま日誌へ転記し、月次まとめで振り返り可能。",
              color: "emerald",
              cta: "日誌を書く",
            },
            {
              href: "/ky/morning",
              label: "サイネージ朝礼モード",
              description: "現場の大画面でKY活動表を表示。全員で読み合わせ。",
              color: "blue",
              cta: "朝礼を始める",
            },
            {
              href: "/accidents",
              label: "類似事故事例",
              description: "業種・作業に近い事故事例を逆引きして、本日のKYに反映。",
              color: "orange",
              cta: "事例を見る",
            },
          ]}
        />
      </div>
    </div>
  );
}

function ToolbarButton({
  onClick,
  disabled,
  icon,
  label,
  tone,
}: {
  onClick: () => void;
  disabled?: boolean;
  icon: React.ReactNode;
  label: string;
  tone: "neutral" | "primary" | "active" | "violet";
}) {
  const toneClass =
    tone === "primary"
      ? "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
      : tone === "active"
        ? "border-indigo-500 bg-indigo-50 text-indigo-800 hover:bg-indigo-100"
        : tone === "violet"
          ? "border-violet-300 bg-violet-50 text-violet-800 hover:bg-violet-100"
          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${toneClass}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
