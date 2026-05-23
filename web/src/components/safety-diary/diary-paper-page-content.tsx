"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Printer,
  Eye,
  EyeOff,
  RefreshCw,
  Sparkles,
  Save,
  List,
  History,
} from "lucide-react";
import { DiaryPaperSheet, type DiaryPaperState } from "./diary-paper-sheet";
import { LocalStorageWarningBanner } from "@/components/local-storage-warning-banner";
import { TranslatedPageHeader } from "@/components/translated-page-header";
import { RelatedPageCards } from "@/components/related-page-cards";
import { loadProfile } from "@/lib/company-profile";
import {
  addEntry,
  loadEntries,
  newId,
} from "@/lib/safety-diary/store";
import {
  requiredFieldsSchema,
  type IndustryPreset,
  type RequiredFields,
  type OptionalFields,
  type SafetyDiaryEntry,
} from "@/lib/safety-diary/schema";

const DRAFT_KEY = "safety-diary:paper-draft";

const PROFILE_TO_DIARY: Record<string, IndustryPreset> = {
  construction: "construction",
  manufacturing: "manufacturing",
  healthcare: "healthcare",
  transport: "transport",
  it: "it",
  forestry: "other",
  logistics: "transport",
  other: "other",
};

function makeInitialState(): DiaryPaperState {
  const today = new Date().toISOString().slice(0, 10);
  return {
    industry: "construction",
    required: {
      date: today,
      weather: "晴れ",
      siteName: "",
      workContent: "",
      kyResult: "",
      nearMissOccurred: false,
    },
    optional: {
      contractorWorks: [],
      requiredQualifications: [],
      predictedDisasters: [],
      patrolRecord: "",
      safetyInstructions: "",
      nextDayPlan: "",
    },
    recorderName: "",
    supervisorName: "",
  };
}

export function DiaryPaperPageContent() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<DiaryPaperState>(makeInitialState);
  const [hydrated, setHydrated] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [savedLabel, setSavedLabel] = useState("入力すると下書きが自動保存されます");
  const [error, setError] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);

  // 初回ロード: localStorage draft 復元 + プロファイル
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<DiaryPaperState>;
        if (parsed && typeof parsed === "object") {
          const init = makeInitialState();
          setState({
            industry: (parsed.industry as IndustryPreset) ?? init.industry,
            required: { ...init.required, ...(parsed.required ?? {}) },
            optional: { ...init.optional, ...(parsed.optional ?? {}) },
            recorderName: parsed.recorderName ?? "",
            supervisorName: parsed.supervisorName ?? "",
          });
        }
      }
    } catch {
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {}
    }
    const profile = loadProfile();
    setState((prev) => {
      const next: DiaryPaperState = { ...prev };
      if (profile.industry) {
        const mapped = PROFILE_TO_DIARY[profile.industry];
        if (mapped && !prev.industry) next.industry = mapped;
        if (mapped) next.industry = mapped;
      }
      if (profile.sites[0] && !prev.required.siteName) {
        next.required = { ...prev.required, siteName: profile.sites[0] };
      }
      if (profile.companyName && !prev.recorderName) {
        next.recorderName = profile.companyName;
      }
      return next;
    });
    setHydrated(true);
  }, []);

  // fromYesterday=1 で直近の日誌から流用
  useEffect(() => {
    if (!hydrated) return;
    if (searchParams?.get("fromYesterday") !== "1") return;
    const all = loadEntries();
    if (all.length === 0) {
      setSavedLabel("直近の日誌が見つかりませんでした");
      return;
    }
    const latest = [...all].sort((a, b) =>
      b.required.date.localeCompare(a.required.date)
    )[0];
    setState((prev) => ({
      ...prev,
      industry: latest.industry,
      required: {
        ...prev.required,
        siteName: latest.required.siteName,
        workContent: latest.required.workContent,
        kyResult: latest.required.kyResult,
      },
      optional: {
        ...prev.optional,
        patrolRecord: latest.optional.patrolRecord ?? prev.optional.patrolRecord,
        nextDayPlan: latest.optional.nextDayPlan ?? prev.optional.nextDayPlan,
        safetyInstructions:
          latest.optional.safetyInstructions ?? prev.optional.safetyInstructions,
      },
    }));
    setSavedLabel(`${latest.required.date} の日誌を流用しました (日付・ヒヤリは要更新)`);
  }, [hydrated, searchParams]);

  // draft 自動保存 (1秒デバウンス)
  useEffect(() => {
    if (!hydrated) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(state));
        setSavedLabel(`下書き保存: ${new Date().toLocaleTimeString("ja-JP")}`);
      } catch {}
    }, 1000);
    return () => clearTimeout(t);
  }, [state, hydrated]);

  const patch = useCallback((p: Partial<DiaryPaperState>) => {
    setState((prev) => ({ ...prev, ...p }));
  }, []);
  const patchRequired = useCallback((p: Partial<RequiredFields>) => {
    setState((prev) => ({ ...prev, required: { ...prev.required, ...p } }));
  }, []);
  const patchOptional = useCallback((p: Partial<OptionalFields>) => {
    setState((prev) => ({ ...prev, optional: { ...prev.optional, ...p } }));
  }, []);

  const handlePrint = useCallback(() => {
    setPreviewMode(true);
    setTimeout(() => window.print(), 100);
  }, []);

  const handleReset = useCallback(() => {
    if (!window.confirm("用紙の内容をリセットします。よろしいですか?")) return;
    setState(makeInitialState());
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {}
  }, []);

  const handleSave = useCallback(() => {
    setError(null);
    const parsed = requiredFieldsSchema.safeParse({
      date: state.required.date,
      weather: state.required.weather,
      siteName: state.required.siteName,
      workContent: state.required.workContent,
      kyResult: state.required.kyResult,
      nearMissOccurred: state.required.nearMissOccurred,
      nearMissDetail: state.required.nearMissOccurred
        ? state.required.nearMissDetail
        : undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "必須項目に未入力があります");
      return;
    }
    const id = newId();
    const now = new Date().toISOString();
    const entry: SafetyDiaryEntry = {
      id,
      industry: state.industry,
      required: parsed.data,
      optional: state.optional,
      weatherAlerts: [],
      similarAccidentIds: [],
      relatedLawRevisionIds: [],
      createdAt: now,
      updatedAt: now,
    };
    addEntry(entry);
    setSavedLabel(`保存しました: ${new Date().toLocaleTimeString("ja-JP")}`);
    // 保存後も draft を残すと続けて書きやすい
  }, [state]);

  const handleAiDraftKy = useCallback(async () => {
    if (!state.required.workContent.trim()) {
      setError("先に「作業内容」を入力してください");
      return;
    }
    setAiBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ky-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "table",
          workContext: state.required.workContent,
          industryId: state.industry,
        }),
      });
      if (!res.ok) throw new Error(`AI生成失敗 (${res.status})`);
      const data = (await res.json()) as {
        rows?: { hazard?: string; reduction?: string }[];
      };
      const rows = (data.rows ?? []).slice(0, 3);
      if (rows.length === 0) throw new Error("AIが生成できませんでした");
      const text = rows
        .map((r, i) => `${i + 1}. 危険: ${r.hazard ?? ""}\n   対策: ${r.reduction ?? ""}`)
        .join("\n");
      patchRequired({ kyResult: text });
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI生成に失敗しました");
    } finally {
      setAiBusy(false);
    }
  }, [state.required.workContent, state.industry, patchRequired]);

  return (
    <div className="min-h-screen bg-slate-50 pb-12 print:bg-white print:pb-0">
      <div className="mx-auto max-w-[1200px] px-3 pt-4 print:hidden sm:px-6">
        <TranslatedPageHeader
          titleJa="安全衛生日誌"
          titleEn="Daily Safety Diary (Paper-First)"
          descriptionJa="必須5項目を完成形そのままの用紙に書き込んで保存。3〜5分で1日が完了します。"
          descriptionEn="Daily on-site safety diary, edited directly on a printable sheet."
          iconName="ClipboardList"
          iconColor="emerald"
        />
        <LocalStorageWarningBanner />
      </div>

      {/* ツールバー */}
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-2 px-3 py-2 sm:px-6">
          <div className="flex flex-wrap items-center gap-1.5">
            <ToolbarLink
              href="/safety-diary/list"
              icon={<List className="h-3.5 w-3.5" />}
              label="保存済み一覧"
            />
            <ToolbarLink
              href="/safety-diary?fromYesterday=1"
              icon={<History className="h-3.5 w-3.5" />}
              label="昨日から流用"
            />
            <ToolbarButton
              onClick={handleAiDraftKy}
              disabled={aiBusy}
              icon={<Sparkles className="h-3.5 w-3.5" />}
              tone="violet"
              label={aiBusy ? "AI生成中…" : "KY結果のAIたたき台"}
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
              onClick={handleSave}
              icon={<Save className="h-3.5 w-3.5" />}
              tone="primary"
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
        {error && (
          <div className="mx-auto max-w-[1200px] px-3 pb-2 sm:px-6">
            <p className="rounded border border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] text-rose-800">
              {error}
            </p>
          </div>
        )}
      </div>

      <div className="mx-auto mt-4 max-w-[1200px] px-3 print:m-0 print:px-0 sm:px-6">
        <DiaryPaperSheet
          state={state}
          patch={patch}
          patchRequired={patchRequired}
          patchOptional={patchOptional}
          previewMode={previewMode}
        />
      </div>

      {/* 関連ページ */}
      <div className="mx-auto mt-8 max-w-[1200px] px-3 print:hidden sm:px-6">
        <RelatedPageCards
          heading="合わせて使う"
          pages={[
            {
              href: "/ky",
              label: "KY用紙を作成",
              description: "朝礼のKY結果をKY用紙で詳しく作成し、本日の日誌へ転記できます。",
              color: "emerald",
              cta: "KYを書く",
            },
            {
              href: "/safety-diary/list",
              label: "過去の日誌一覧",
              description: "保存済みの日誌を月別に一覧表示。検索・編集も可能。",
              color: "sky",
              cta: "一覧を見る",
            },
            {
              href: "/accidents",
              label: "類似事故事例",
              description: "本日の作業内容に近い事故事例を参照し、KYに反映。",
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

function ToolbarLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
