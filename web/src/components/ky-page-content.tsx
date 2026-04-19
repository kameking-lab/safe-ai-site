"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { KyIndustryPresetPicker } from "@/components/ky-industry-preset-picker";
import type { KyIndustryPreset } from "@/data/mock/ky-industry-presets";
import { KyRecordList } from "@/components/ky-record-list";
import { KySignatureCanvas } from "@/components/ky-signature-canvas";
import { TranslatedPageHeader } from "@/components/translated-page-header";
import { RelatedPageCards } from "@/components/related-page-cards";
import { InputWithVoice, TextareaWithVoice } from "@/components/voice-input-field";
import { KY_INDUSTRY_PRESETS } from "@/data/mock/ky-industry-presets";
import { createServices } from "@/lib/services/service-factory";
import { normalizeKyInstructionRecord } from "@/lib/services/operations-service";
import type {
  KyInstructionFallCheck,
  KyInstructionParticipant,
  KyInstructionRecordState,
  KyInstructionRiskRow,
  KyInstructionWorkRow,
  KyRecordSummary,
} from "@/lib/types/operations";

type KyMode = "detail" | "simple" | "custom";

type CustomSections = {
  basicInfo: boolean;
  workContent: boolean;
  riskAssessment: boolean;
  participants: boolean;
  fallCheck: boolean;
  closingNote: boolean;
};

const DEFAULT_CUSTOM: CustomSections = {
  basicInfo: true,
  workContent: true,
  riskAssessment: true,
  participants: true,
  fallCheck: false,
  closingNote: false,
};

const SECTION_LABELS: Record<keyof CustomSections, string> = {
  basicInfo: "基本情報",
  workContent: "作業内容",
  riskAssessment: "現地KY",
  participants: "参加者・署名",
  fallCheck: "墜落防止点検",
  closingNote: "終了確認",
};

const FALL_CHECK_LABELS = [
  "足場の墜落・転落防止設備が取外しされてないか？（交さ筋かい・さん・幅木・手すり・ネット等）",
  "吊足場の墜落・転落防止設備が取外しされてないか？（構成部材の損傷・腐食・状態は？）",
  "構台の墜落防止設備が取外しされてないか？",
] as const;

function makeInitialRecord(): KyInstructionRecordState {
  // SSR/hydration対策: 日付は初期値を空文字にして、マウント後 useEffect で現在日付を入れる
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
  const emptyP = (): KyInstructionParticipant => ({ name: "", qualNo: "", preWork: "", onExit: "" });
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
    riskRows: [emptyRisk("上記"), emptyRisk("①"), emptyRisk("②"), emptyRisk("③"), emptyRisk("④")],
    participants: Array.from({ length: 6 }, () => emptyP()),
    participantTotal: "",
    breaks: ["", "", "", "", ""],
    safetyVest: "",
    exitLarge: "",
    exitMedium: "",
    exitSmall: "",
    closingNote: "",
    fallChecks: [
      { good: "", bad: "", done: "" },
      { good: "", bad: "", done: "" },
      { good: "", bad: "", done: "" },
    ],
    correctionNote: "",
  };
}

function getSimilarCases(workText: string): KyIndustryPreset | null {
  if (!workText.trim()) return null;
  const lower = workText.toLowerCase();
  const scored = KY_INDUSTRY_PRESETS.map((preset) => {
    const score = preset.workExamples.reduce((acc, ex) => {
      const words = ex.split(/[\s・、。,（）]/g).filter((w) => w.length > 1);
      return acc + words.filter((w) => lower.includes(w.toLowerCase())).length;
    }, 0);
    return { preset, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored[0]?.preset ?? null;
}

function evalScore(a: number, b: number) {
  return a * b;
}

function ChipSelect<V extends 1 | 2 | 3>({
  value,
  onChange,
  options,
}: {
  value: V;
  onChange: (v: V) => void;
  options: { value: V; label: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup">
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.value)}
            className={`min-h-[36px] rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
              selected
                ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                : "border-slate-300 bg-white text-slate-700 hover:border-emerald-400 hover:bg-emerald-50"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

const WORK_NUMBERS = ["①", "②", "③", "④"] as const;

export function KyPageContent() {
  const services = useMemo(() => createServices(), []);
  const [record, setRecord] = useState<KyInstructionRecordState>(makeInitialRecord);
  const [signatures, setSignatures] = useState<Record<number, string>>({});
  const [mode, setMode] = useState<KyMode>("detail");
  const [customSections, setCustomSections] = useState<CustomSections>(DEFAULT_CUSTOM);
  const [guideOpen, setGuideOpen] = useState(false);
  const [recordList, setRecordList] = useState<KyRecordSummary[]>([]);
  const [savedLabel, setSavedLabel] = useState("記入すると自動保存されます");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState<string | null>(null);

  // Load from localStorage on mount, then load record list
  useEffect(() => {
    // 日付の初期化はマウント後に（SSR hydration mismatch を避ける）
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
    try {
      const saved = localStorage.getItem("ky-record");
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        setRecord(normalizeKyInstructionRecord(parsed));
      }
      const sigs = localStorage.getItem("ky-signatures");
      if (sigs) {
        const parsed: unknown = JSON.parse(sigs);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          setSignatures(parsed as Record<number, string>);
        }
      }
    } catch {
      // corrupted data — reset
      try {
        localStorage.removeItem("ky-record");
        localStorage.removeItem("ky-signatures");
      } catch {}
    }
    void services.operations.getKyRecordList().then((r) => {
      if (r.ok) setRecordList(r.data);
    });
  }, [services.operations]);

  // Auto-save record to localStorage with 1s debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem("ky-record", JSON.stringify(record));
        setSavedLabel(`自動保存: ${new Date().toLocaleTimeString("ja-JP")}`);
      } catch {}
    }, 1000);
    return () => clearTimeout(timer);
  }, [record]);

  // Save signatures immediately
  useEffect(() => {
    try {
      localStorage.setItem("ky-signatures", JSON.stringify(signatures));
    } catch {}
  }, [signatures]);

  const patch = useCallback((p: Partial<KyInstructionRecordState>) => {
    setRecord((prev) => ({ ...prev, ...p }));
  }, []);

  const handleManualSave = async () => {
    setSaveError(null);
    try {
      const result = await services.operations.saveKyInstructionRecord(record);
      if (result.ok) {
        setSavedLabel(`手動保存: ${new Date().toLocaleTimeString("ja-JP")}`);
        const list = await services.operations.getKyRecordList();
        if (list.ok) setRecordList(list.data);
      } else {
        setSaveError(result.error?.message ?? "保存に失敗しました");
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "保存に失敗しました");
    }
  };

  const handlePresetApply = useCallback((preset: KyIndustryPreset) => {
    setRecord((prev) => {
      const workRows = prev.workRows.map((r, i) =>
        i === 0 ? { ...r, workDetail: preset.workExamples[0] ?? r.workDetail } : r
      );
      const riskRows = prev.riskRows.map((r, i) => {
        const p = preset.risks[i - 1];
        if (i === 0 || !p) return r;
        return { ...r, hazard: p.hazard, reduction: p.reduction };
      });
      return { ...prev, workRows, riskRows };
    });
  }, []);

  const setWorkRow = useCallback((i: number, row: KyInstructionWorkRow) => {
    setRecord((prev) => ({
      ...prev,
      workRows: prev.workRows.map((r, idx) => (idx === i ? row : r)),
    }));
  }, []);

  const setRiskRow = useCallback((i: number, row: KyInstructionRiskRow) => {
    setRecord((prev) => ({
      ...prev,
      riskRows: prev.riskRows.map((r, idx) => (idx === i ? row : r)),
    }));
  }, []);

  const setParticipant = useCallback((i: number, p: KyInstructionParticipant) => {
    setRecord((prev) => ({
      ...prev,
      participants: prev.participants.map((pp, idx) => (idx === i ? p : pp)),
    }));
  }, []);

  const setFallCheck = useCallback((i: number, row: KyInstructionFallCheck) => {
    setRecord((prev) => ({
      ...prev,
      fallChecks: prev.fallChecks.map((r, idx) => (idx === i ? row : r)),
    }));
  }, []);

  const addParticipant = () =>
    patch({ participants: [...record.participants, { name: "", qualNo: "", preWork: "", onExit: "" }] });

  const removeParticipant = (i: number) => {
    if (record.participants.length <= 1) return;
    patch({ participants: record.participants.filter((_, idx) => idx !== i) });
    setSignatures((prev) => {
      const next = { ...prev };
      delete next[i];
      return next;
    });
  };

  const addRiskRow = () =>
    patch({
      riskRows: [
        ...record.riskRows,
        {
          targetLabel: `(${record.riskRows.length})`,
          hazard: "",
          qualNo: "",
          likelihood: 1,
          severity: 1,
          reduction: "",
          reLikelihood: 1,
          reSeverity: 1,
          reducedBelow2: "",
          primeSign: "",
        },
      ],
    });

  const fetchAiAssist = useCallback(async (body: Record<string, unknown>): Promise<string> => {
    const res = await fetch("/api/ky-assist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("assist failed");
    const j = (await res.json()) as { text?: string };
    return j.text ?? "";
  }, []);

  const workContextStr = useMemo(
    () =>
      record.workRows
        .map((r) => [r.workPlace, r.workDetail].filter(Boolean).join(" "))
        .filter(Boolean)
        .join(" / ")
        .slice(0, 500),
    [record.workRows]
  );

  const similarCases = useMemo(() => getSimilarCases(workContextStr), [workContextStr]);

  const isVisible = (section: keyof CustomSections): boolean => {
    if (mode === "detail") return true;
    if (mode === "simple")
      return section === "basicInfo" || section === "riskAssessment" || section === "participants";
    return customSections[section];
  };

  const signatureCount = Object.values(signatures).filter((v) => v && v.length > 5).length;
  const mainWork = record.workRows[0];
  const topRisks = record.riskRows.slice(0, 3).filter((r) => r.hazard);

  return (
    <div className="pb-20 print:pb-0">
      {/* Sticky mode selector */}
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-2 backdrop-blur-sm lg:px-8 print:hidden">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
          <span className="hidden text-xs text-slate-500 sm:block">
            <a href="/risk" className="font-semibold text-emerald-700 underline">今日のリスク</a>{" "}
            と組み合わせて使えます
          </span>
          <div className="flex items-center gap-0.5 rounded-full border border-slate-300 bg-slate-50 p-0.5">
            {(["detail", "simple", "custom"] as KyMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                aria-pressed={mode === m}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  mode === m
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {m === "detail" ? "詳細モード" : m === "simple" ? "シンプル" : "カスタム"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        {/* Page header */}
        <div className="pt-4">
          <TranslatedPageHeader
            titleJa="KY用紙"
            titleEn="KY Form (Hazard Identification)"
            descriptionJa="危険予知活動表の作成・記録。音声入力対応で現場から入力"
            descriptionEn="Create and record hazard identification sheets. Voice input supported."
            iconName="ClipboardList"
            iconColor="emerald"
          />
        </div>

        {/* Usage guide */}
        <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50/60 print:hidden">
          <button
            type="button"
            className="flex w-full items-center justify-between px-4 py-3"
            onClick={() => setGuideOpen((v) => !v)}
            aria-expanded={guideOpen}
          >
            <span className="text-sm font-bold text-blue-900">使い方ガイド（朝礼での運用方法）</span>
            <span className="text-blue-700">{guideOpen ? "▲" : "▼"}</span>
          </button>
          {guideOpen && (
            <div className="border-t border-blue-200 px-4 pb-4 pt-3 text-xs text-blue-900">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    step: "1. 朝礼前",
                    icon: "📋",
                    desc: "業種プリセットを選んで危険予知項目を自動入力。作業内容を追記して準備完了。",
                  },
                  {
                    step: "2. 朝礼中",
                    icon: "👥",
                    desc: "スマホ・タブレットを全員で囲んで縦スクロールで確認。AIが類似事例を提案します。",
                  },
                  {
                    step: "3. 署名",
                    icon: "✍️",
                    desc: '「署名する」ボタン → スマホを横向きにして各メンバーが指でサイン。',
                  },
                  {
                    step: "4. 保存・出力",
                    icon: "📄",
                    desc: "画面下の「PDF出力」で印刷。保存ボタンで記録を蓄積。自動保存で入力も安心。",
                  },
                ].map((item) => (
                  <div key={item.step} className="rounded-lg bg-white p-3 shadow-sm">
                    <div className="mb-1 text-2xl">{item.icon}</div>
                    <p className="font-bold text-blue-800">{item.step}</p>
                    <p className="mt-1 leading-relaxed text-blue-700">{item.desc}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                <p className="font-semibold text-amber-800">参加者署名の方法</p>
                <ul className="mt-1 space-y-0.5 text-amber-700">
                  <li>方法1: スマホ/タブレットを横向きにして、各メンバーが指でキャンバスに署名（推奨）</li>
                  <li>方法2: 氏名テキスト入力（簡易版）</li>
                  <li>方法3: PDF印刷後に各自押印・記入</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Industry preset */}
        <div className="mt-3">
          <KyIndustryPresetPicker onApply={handlePresetApply} />
        </div>

        {/* Custom section toggles */}
        {mode === "custom" && (
          <div className="mt-3 rounded-xl border border-violet-200 bg-violet-50/60 p-3 print:hidden">
            <p className="mb-2 text-xs font-bold text-violet-800">表示するセクションを選択</p>
            <div className="flex flex-wrap gap-3">
              {(Object.keys(DEFAULT_CUSTOM) as (keyof CustomSections)[]).map((key) => (
                <label key={key} className="flex cursor-pointer items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={customSections[key]}
                    onChange={(e) => setCustomSections((prev) => ({ ...prev, [key]: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-xs font-semibold text-violet-700">{SECTION_LABELS[key]}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Main 2-column layout */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
          {/* Left: form sections */}
          <div className="space-y-4">

            {/* ① 基本情報 */}
            {isVisible("basicInfo") && (
              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="mb-3 text-sm font-bold text-slate-900">① 基本情報</h2>
                <div className="grid grid-cols-3 gap-2">
                  <label className="space-y-1">
                    <span className="text-[11px] font-semibold text-slate-600">年</span>
                    <InputWithVoice
                      type="number"
                      value={record.workDateYear}
                      onChange={(e) => patch({ workDateYear: e.target.value })}
                      placeholder="2026"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[11px] font-semibold text-slate-600">月</span>
                    <InputWithVoice
                      type="number"
                      min={1}
                      max={12}
                      value={record.workDateMonth}
                      onChange={(e) => patch({ workDateMonth: e.target.value })}
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[11px] font-semibold text-slate-600">日</span>
                    <InputWithVoice
                      type="number"
                      min={1}
                      max={31}
                      value={record.workDateDay}
                      onChange={(e) => patch({ workDateDay: e.target.value })}
                    />
                  </label>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <label className="space-y-1">
                    <span className="text-[11px] font-semibold text-slate-600">天候</span>
                    <InputWithVoice
                      value={record.weather}
                      onChange={(e) => patch({ weather: e.target.value })}
                      placeholder="晴・曇・雨・雪"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[11px] font-semibold text-slate-600">備考</span>
                    <InputWithVoice
                      value={record.workDateNote}
                      onChange={(e) => patch({ workDateNote: e.target.value })}
                      placeholder="例: 強風注意"
                    />
                  </label>
                </div>
                {mode !== "simple" && (
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <div className="space-y-1.5 rounded-lg border border-slate-200 p-2">
                      <p className="text-[10px] font-bold text-slate-600">協力会社（1次）</p>
                      <InputWithVoice
                        value={record.coop1Name}
                        onChange={(e) => patch({ coop1Name: e.target.value })}
                        placeholder="会社名"
                      />
                      <InputWithVoice
                        value={record.coop1Chief}
                        onChange={(e) => patch({ coop1Chief: e.target.value })}
                        placeholder="安全衛生責任者"
                      />
                    </div>
                    <div className="space-y-1.5 rounded-lg border border-slate-200 p-2">
                      <p className="text-[10px] font-bold text-slate-600">協力会社（2次）</p>
                      <InputWithVoice
                        value={record.coop2Name}
                        onChange={(e) => patch({ coop2Name: e.target.value })}
                        placeholder="会社名"
                      />
                      <InputWithVoice
                        value={record.coop2Chief}
                        onChange={(e) => patch({ coop2Chief: e.target.value })}
                        placeholder="安全衛生責任者"
                      />
                    </div>
                    <div className="space-y-1.5 rounded-lg border border-slate-200 p-2">
                      <p className="text-[10px] font-bold text-slate-600">協力会社（3次）</p>
                      <InputWithVoice
                        value={record.coop3Name}
                        onChange={(e) => patch({ coop3Name: e.target.value })}
                        placeholder="会社名"
                      />
                      <InputWithVoice
                        value={record.coop3Chief}
                        onChange={(e) => patch({ coop3Chief: e.target.value })}
                        placeholder="安全衛生責任者"
                      />
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* ② 作業内容 (detail / custom のみ) */}
            {isVisible("workContent") && mode !== "simple" && (
              <section className="rounded-2xl border border-amber-200 bg-amber-50/30 p-4 shadow-sm">
                <h2 className="mb-3 text-sm font-bold text-slate-900">② 作業内容</h2>
                <div className="space-y-3">
                  {record.workRows.map((row, i) => (
                    <div key={i} className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="mb-2 text-[11px] font-bold text-amber-800">
                        作業 {WORK_NUMBERS[i] ?? `(${i + 1})`}
                      </p>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <label className="space-y-1">
                          <span className="text-[11px] text-slate-600">作業箇所</span>
                          <TextareaWithVoice
                            rows={2}
                            value={row.workPlace}
                            onChange={(e) => setWorkRow(i, { ...row, workPlace: e.target.value })}
                            className="text-xs"
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="text-[11px] text-slate-600">作業実施内容</span>
                          <TextareaWithVoice
                            rows={2}
                            value={row.workDetail}
                            onChange={(e) => setWorkRow(i, { ...row, workDetail: e.target.value })}
                            className="text-xs"
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="text-[11px] text-slate-600">使用機械</span>
                          <InputWithVoice
                            value={row.machinery}
                            onChange={(e) => setWorkRow(i, { ...row, machinery: e.target.value })}
                            placeholder="バックホウ、クレーン等"
                          />
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <label className="space-y-1">
                            <span className="text-[11px] text-slate-600">火気使用</span>
                            <InputWithVoice
                              value={row.fireMark}
                              onChange={(e) => setWorkRow(i, { ...row, fireMark: e.target.value })}
                              placeholder="〇"
                            />
                          </label>
                          <label className="space-y-1">
                            <span className="text-[11px] text-slate-600">高所作業</span>
                            <InputWithVoice
                              value={row.heightMark}
                              onChange={(e) => setWorkRow(i, { ...row, heightMark: e.target.value })}
                              placeholder="〇"
                            />
                          </label>
                        </div>
                        <label className="space-y-1 sm:col-span-2">
                          <span className="text-[11px] text-slate-600">使用保護具</span>
                          <TextareaWithVoice
                            rows={2}
                            value={row.ppeNote}
                            onChange={(e) => setWorkRow(i, { ...row, ppeNote: e.target.value })}
                            placeholder="安全帯・ヘルメット・保護メガネ等"
                            className="text-xs"
                          />
                        </label>
                        <label className="space-y-1 sm:col-span-2">
                          <span className="text-[11px] text-slate-600">安全衛生指示事項</span>
                          <TextareaWithVoice
                            rows={2}
                            value={row.safetyInstruction}
                            onChange={(e) => setWorkRow(i, { ...row, safetyInstruction: e.target.value })}
                            className="text-xs"
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="text-[11px] text-slate-600">責任者</span>
                          <InputWithVoice
                            value={row.responsible}
                            onChange={(e) => setWorkRow(i, { ...row, responsible: e.target.value })}
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="text-[11px] text-slate-600">元請サイン</span>
                          <InputWithVoice
                            value={row.primeSign}
                            onChange={(e) => setWorkRow(i, { ...row, primeSign: e.target.value })}
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* MHLW 類似事例 */}
            {similarCases && mode !== "simple" && (
              <section className="rounded-2xl border border-sky-200 bg-sky-50/50 p-4 shadow-sm print:hidden">
                <h2 className="mb-1 text-sm font-bold text-sky-900">
                  MHLW類似事例（{similarCases.label}）
                </h2>
                <p className="mb-3 text-[11px] text-sky-700">
                  作業内容のキーワードから判定。危険予知の参考にしてください。
                </p>
                <div className="space-y-2">
                  {similarCases.risks.slice(0, 5).map((r, i) => (
                    <div key={i} className="rounded-lg border border-sky-200 bg-white p-2.5 text-xs">
                      <p>
                        <span className="font-semibold text-red-700">危険：</span>
                        {r.hazard}
                      </p>
                      <p className="mt-1">
                        <span className="font-semibold text-emerald-700">対策：</span>
                        {r.reduction}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ③ 現地KY */}
            {isVisible("riskAssessment") && (
              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-sm font-bold text-slate-900">③ 現地KY（リスクアセスメント）</h2>
                  <button
                    type="button"
                    onClick={addRiskRow}
                    className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 print:hidden"
                  >
                    ＋ リスクを追加
                  </button>
                </div>
                {mode !== "simple" && (
                  <div className="mb-3 rounded-lg bg-slate-50 px-3 py-2 text-[10px] text-slate-600">
                    <span className="font-semibold">可能性:</span> 3=かなり発生 / 2=たまに / 1=ほとんどなし
                    <span className="font-semibold">重大性:</span> 3=死亡・重大 / 2=休業4日以上 / 1=4日未満
                    評価値 = 可能性 × 重大性（2以下も対策を検討）
                  </div>
                )}
                <div className="space-y-3">
                  {(mode === "simple" ? record.riskRows.slice(0, 3) : record.riskRows).map((row, i) => (
                    <div key={i} className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 space-y-2">
                      <div className="flex flex-wrap items-center gap-2 print:hidden">
                        <span className="rounded bg-sky-100 px-2 py-0.5 text-[11px] font-bold text-sky-800">
                          {row.targetLabel}
                        </span>
                        {mode !== "simple" && (
                          <>
                            <button
                              type="button"
                              disabled={aiBusy === `hz-${i}`}
                              onClick={async () => {
                                setAiBusy(`hz-${i}`);
                                try {
                                  const text = await fetchAiAssist({
                                    field: "hazard",
                                    targetLabel: row.targetLabel,
                                    workContext: workContextStr,
                                    seed: Date.now() + i,
                                  });
                                  setRiskRow(i, { ...row, hazard: text });
                                } catch {
                                  setRiskRow(i, { ...row, hazard: row.hazard + "\n（AI取得失敗）" });
                                } finally {
                                  setAiBusy(null);
                                }
                              }}
                              className="rounded border border-sky-300 bg-sky-50 px-1.5 py-0.5 text-[10px] font-bold text-sky-800 hover:bg-sky-100 disabled:opacity-40"
                            >
                              {aiBusy === `hz-${i}` ? "生成中…" : "AI危険下書き"}
                            </button>
                            <button
                              type="button"
                              disabled={aiBusy === `rd-${i}`}
                              onClick={async () => {
                                setAiBusy(`rd-${i}`);
                                try {
                                  const text = await fetchAiAssist({
                                    field: "reduction",
                                    targetLabel: row.targetLabel,
                                    workContext: workContextStr,
                                    hazardSoFar: row.hazard,
                                    likelihood: row.likelihood,
                                    severity: row.severity,
                                    seed: Date.now() + i * 3,
                                  });
                                  setRiskRow(i, { ...row, reduction: text });
                                } catch {}
                                finally {
                                  setAiBusy(null);
                                }
                              }}
                              className="rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 hover:bg-amber-100 disabled:opacity-40"
                            >
                              {aiBusy === `rd-${i}` ? "…" : "AI対策"}
                            </button>
                          </>
                        )}
                      </div>
                      {/* label visible on print */}
                      <span className="hidden rounded bg-sky-100 px-2 py-0.5 text-[11px] font-bold text-sky-800 print:inline">
                        {row.targetLabel}
                      </span>

                      <label className="block space-y-1">
                        <span className="text-[11px] font-semibold text-slate-600">
                          どんな危険が潜んでいますか
                        </span>
                        <TextareaWithVoice
                          rows={3}
                          value={row.hazard}
                          onChange={(e) => setRiskRow(i, { ...row, hazard: e.target.value })}
                          className="text-xs"
                        />
                      </label>

                      {mode !== "simple" && (
                        <div className="space-y-2">
                          <div>
                            <p className="mb-1 text-[11px] font-semibold text-slate-600">可能性</p>
                            <ChipSelect
                              value={row.likelihood}
                              onChange={(v) => setRiskRow(i, { ...row, likelihood: v })}
                              options={[
                                { value: 3, label: "3 高い" },
                                { value: 2, label: "2 中" },
                                { value: 1, label: "1 低い" },
                              ]}
                            />
                          </div>
                          <div>
                            <p className="mb-1 text-[11px] font-semibold text-slate-600">重大性</p>
                            <ChipSelect
                              value={row.severity}
                              onChange={(v) => setRiskRow(i, { ...row, severity: v })}
                              options={[
                                { value: 3, label: "3 重大" },
                                { value: 2, label: "2 中" },
                                { value: 1, label: "1 軽微" },
                              ]}
                            />
                          </div>
                          <div>
                            <p className="mb-1 text-[11px] font-semibold text-slate-600">評価値</p>
                            <div
                              className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-bold ${
                                evalScore(row.likelihood, row.severity) >= 6
                                  ? "border-red-300 bg-red-50 text-red-700"
                                  : evalScore(row.likelihood, row.severity) >= 4
                                    ? "border-amber-300 bg-amber-50 text-amber-700"
                                    : "border-slate-300 bg-slate-50 text-slate-700"
                              }`}
                            >
                              {evalScore(row.likelihood, row.severity)}
                            </div>
                          </div>
                        </div>
                      )}

                      <label className="block space-y-1">
                        <span className="text-[11px] font-semibold text-slate-600">低減対策</span>
                        <TextareaWithVoice
                          rows={2}
                          value={row.reduction}
                          onChange={(e) => setRiskRow(i, { ...row, reduction: e.target.value })}
                          className="text-xs"
                        />
                      </label>

                      {mode !== "simple" && (
                        <>
                          <div className="space-y-2">
                            <div>
                              <p className="mb-1 text-[11px] font-semibold text-slate-600">再評価・可能性</p>
                              <ChipSelect
                                value={row.reLikelihood}
                                onChange={(v) => setRiskRow(i, { ...row, reLikelihood: v })}
                                options={[
                                  { value: 3, label: "3 高い" },
                                  { value: 2, label: "2 中" },
                                  { value: 1, label: "1 低い" },
                                ]}
                              />
                            </div>
                          </div>
                          <div>
                            <p className="mb-1 text-[11px] font-semibold text-slate-600">再評価・重大性</p>
                            <ChipSelect
                              value={row.reSeverity}
                              onChange={(v) => setRiskRow(i, { ...row, reSeverity: v })}
                              options={[
                                { value: 3, label: "3 重大" },
                                { value: 2, label: "2 中" },
                                { value: 1, label: "1 軽微" },
                              ]}
                            />
                          </div>
                          <div>
                            <p className="mb-1 text-[11px] font-semibold text-slate-600">再評価値</p>
                            <div
                              className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-bold ${
                                evalScore(row.reLikelihood, row.reSeverity) <= 2
                                  ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                                  : "border-amber-300 bg-amber-50 text-amber-700"
                              }`}
                            >
                              {evalScore(row.reLikelihood, row.reSeverity)}
                            </div>
                          </div>
                          <label className="block space-y-1">
                            <span className="text-[11px] text-slate-600">2以下になりましたか？</span>
                            <InputWithVoice
                              value={row.reducedBelow2}
                              onChange={(e) => setRiskRow(i, { ...row, reducedBelow2: e.target.value })}
                              placeholder="はい / いいえ"
                            />
                          </label>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ④ 参加者署名エリア */}
            {isVisible("participants") && (
              <section className="rounded-2xl border border-emerald-200 bg-emerald-50/30 p-4 shadow-sm">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-sm font-bold text-slate-900">
                    ④ 参加者署名エリア
                    {signatureCount > 0 && (
                      <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        {signatureCount}名署名済み
                      </span>
                    )}
                  </h2>
                  <button
                    type="button"
                    onClick={addParticipant}
                    className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 print:hidden"
                  >
                    ＋ 参加者を追加
                  </button>
                </div>
                <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800 print:hidden">
                  <p className="font-semibold">署名方法（3通り）</p>
                  <p>
                    方法1: スマホを<strong>横向き</strong>にして各メンバーが「署名する」→ 指でサイン（推奨）
                  </p>
                  <p>方法2: 氏名テキスト入力（簡易署名）</p>
                  <p>方法3: PDF印刷後に各自押印</p>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {record.participants.map((p, i) => (
                    <div key={i} className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-600">参加者 {i + 1}</span>
                        <button
                          type="button"
                          onClick={() => removeParticipant(i)}
                          disabled={record.participants.length <= 1}
                          className="rounded px-1.5 text-[10px] text-rose-500 hover:bg-rose-50 disabled:opacity-30 print:hidden"
                        >
                          ×削除
                        </button>
                      </div>
                      <label className="block space-y-1">
                        <span className="text-[11px] text-slate-600">氏名</span>
                        <InputWithVoice
                          value={p.name}
                          onChange={(e) => setParticipant(i, { ...p, name: e.target.value })}
                          placeholder="氏名"
                        />
                      </label>
                      {mode !== "simple" && (
                        <label className="block space-y-1">
                          <span className="text-[11px] text-slate-600">必要資格No.</span>
                          <InputWithVoice
                            value={p.qualNo}
                            onChange={(e) => setParticipant(i, { ...p, qualNo: e.target.value })}
                            placeholder="例: 1,10"
                          />
                        </label>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        <label className="space-y-1">
                          <span className="text-[11px] text-slate-600">体調（作業前）</span>
                          <InputWithVoice
                            value={p.preWork}
                            onChange={(e) => setParticipant(i, { ...p, preWork: e.target.value })}
                            placeholder="良好○ / 不良×"
                          />
                        </label>
                        {mode !== "simple" && (
                          <label className="space-y-1">
                            <span className="text-[11px] text-slate-600">退場時</span>
                            <InputWithVoice
                              value={p.onExit}
                              onChange={(e) => setParticipant(i, { ...p, onExit: e.target.value })}
                              placeholder="異常なし○"
                            />
                          </label>
                        )}
                      </div>
                      <KySignatureCanvas
                        label="署名"
                        savedData={signatures[i]}
                        onSave={(data) => setSignatures((prev) => ({ ...prev, [i]: data }))}
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600">合計</span>
                  <InputWithVoice
                    value={record.participantTotal}
                    onChange={(e) => patch({ participantTotal: e.target.value })}
                    placeholder="名"
                    className="w-20"
                  />
                  <span className="text-xs text-slate-600">名</span>
                </div>
                <p className="mt-1 text-[10px] text-slate-500">
                  ※体調不良（×）は就業不可。新規入場者は入場者教育を実施すること。
                </p>
              </section>
            )}

            {/* ⑤ 墜落防止点検 */}
            {isVisible("fallCheck") && (
              <section className="rounded-2xl border border-rose-200 bg-rose-50/30 p-4 shadow-sm">
                <h2 className="mb-3 text-sm font-bold text-slate-900">⑤ 墜落防止設備等の点検</h2>
                <div className="space-y-2">
                  {FALL_CHECK_LABELS.map((label, i) => {
                    const row = record.fallChecks[i] ?? { good: "", bad: "", done: "" };
                    return (
                      <div key={i} className="rounded-lg border border-slate-200 bg-white p-2.5">
                        <p className="mb-2 text-[11px] text-slate-700">{label}</p>
                        <div className="grid grid-cols-3 gap-2">
                          {(["good", "bad", "done"] as const).map((key, ki) => (
                            <label key={key} className="space-y-0.5">
                              <span className="text-[10px] font-semibold text-slate-600">
                                {["良", "否", "済"][ki]}
                              </span>
                              <InputWithVoice
                                value={row[key]}
                                onChange={(e) => setFallCheck(i, { ...row, [key]: e.target.value })}
                                placeholder="〇"
                              />
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <label className="mt-3 block space-y-1">
                  <span className="text-[11px] font-semibold text-slate-700">是正場所・内容</span>
                  <TextareaWithVoice
                    rows={2}
                    value={record.correctionNote}
                    onChange={(e) => patch({ correctionNote: e.target.value })}
                    className="text-xs"
                  />
                </label>
                <p className="mt-1 text-[10px] text-slate-500">
                  是正の必要がある場合は元請へ報告すること。
                </p>
              </section>
            )}

            {/* ⑥ 終了確認 */}
            {isVisible("closingNote") && (
              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="mb-3 text-sm font-bold text-slate-900">⑥ 終了確認</h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-slate-600">本日の休憩時間</span>
                    <div className="space-y-1.5">
                      {record.breaks.slice(0, 3).map((b, i) => (
                        <InputWithVoice
                          key={i}
                          value={b}
                          onChange={(e) => {
                            const next = [...record.breaks];
                            next[i] = e.target.value;
                            patch({ breaks: next });
                          }}
                          placeholder={`休憩${i + 1}: 〇:〇〜〇:〇`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block space-y-1">
                      <span className="text-[11px] font-semibold text-slate-600">安全チョッキ</span>
                      <InputWithVoice
                        value={record.safetyVest}
                        onChange={(e) => patch({ safetyVest: e.target.value })}
                        placeholder="着用〇 / 未着用×"
                      />
                    </label>
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-semibold text-slate-600">作業終了時間（退出）</span>
                      {(
                        [
                          { label: "大型車", key: "exitLarge" as const },
                          { label: "中型車", key: "exitMedium" as const },
                          { label: "普通車", key: "exitSmall" as const },
                        ] as const
                      ).map(({ label, key }) => (
                        <label key={key} className="flex items-center gap-2">
                          <span className="w-14 shrink-0 text-[11px] text-slate-600">{label}</span>
                          <InputWithVoice
                            value={record[key]}
                            onChange={(e) => patch({ [key]: e.target.value })}
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <label className="mt-3 block space-y-1">
                  <span className="text-[11px] font-semibold text-slate-600">
                    終了報告（全員怪我なし → 本日異常なし）
                  </span>
                  <TextareaWithVoice
                    rows={2}
                    value={record.closingNote}
                    onChange={(e) => patch({ closingNote: e.target.value })}
                    className="text-xs"
                  />
                </label>
              </section>
            )}

            {/* 保存済み記録 */}
            <KyRecordList
              records={recordList}
              onDelete={(id) => {
                void services.operations.deleteKyRecord(id).then((result) => {
                  if (result.ok) setRecordList(result.data);
                });
              }}
            />
          </div>

          {/* Right: Preview pane (PC only) */}
          <div className="hidden lg:block print:hidden">
            <div className="sticky top-16 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-[11px]">
              <h3 className="mb-2 text-xs font-bold text-slate-700">KY用紙 プレビュー</h3>
              <div className="space-y-2">
                <div className="rounded-lg bg-white p-2">
                  <p className="font-semibold text-slate-700">作業日</p>
                  <p className="text-slate-600">
                    {record.workDateYear}年{record.workDateMonth}月{record.workDateDay}日
                    {record.weather ? ` / ${record.weather}` : ""}
                  </p>
                </div>
                {mainWork?.workDetail && (
                  <div className="rounded-lg bg-white p-2">
                    <p className="font-semibold text-slate-700">主な作業</p>
                    <p className="text-slate-600">{mainWork.workDetail}</p>
                    {mainWork.workPlace && (
                      <p className="mt-0.5 text-slate-500">{mainWork.workPlace}</p>
                    )}
                  </div>
                )}
                {topRisks.length > 0 && (
                  <div className="rounded-lg bg-white p-2">
                    <p className="font-semibold text-slate-700">主なリスク</p>
                    <ul className="mt-1 space-y-1">
                      {topRisks.map((r, i) => (
                        <li key={i} className="text-slate-600">
                          <span className="font-semibold text-red-600">危:</span>{" "}
                          {r.hazard.length > 50 ? `${r.hazard.slice(0, 50)}…` : r.hazard}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="rounded-lg bg-white p-2">
                  <p className="font-semibold text-slate-700">参加者</p>
                  <p className="text-slate-600">
                    {record.participants.filter((p) => p.name).length}名
                    {signatureCount > 0 ? ` / ${signatureCount}名署名済み` : ""}
                  </p>
                  <ul className="mt-1 space-y-0.5">
                    {record.participants
                      .map((p, idx) => ({ p, idx }))
                      .filter(({ p }) => p.name)
                      .slice(0, 6)
                      .map(({ p, idx }) => (
                        <li key={idx} className="flex items-center gap-1 text-slate-600">
                          {signatures[idx] && signatures[idx]!.length > 5 && (
                            <span className="text-emerald-600">✓</span>
                          )}
                          {p.name}
                        </li>
                      ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Related pages */}
      <div className="mt-6 px-4 lg:px-8">
        <RelatedPageCards
          heading="合わせて使う"
          pages={[
            {
              href: "/risk-prediction",
              label: "AIリスク予測",
              description:
                "作業種別・環境条件からAIが潜在リスクを予測。KY用紙の危険予知項目の参考にできます。",
              color: "blue",
              cta: "リスクを予測する",
            },
            {
              href: "/accidents",
              label: "事故データベース",
              description:
                "504,415件のMHLW全件検索と268件の詳細事例を業種・種別で検索。危険予知の根拠として活用できます。",
              color: "orange",
              cta: "事故事例を確認する",
            },
          ]}
        />
      </div>

      {/* Fixed bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-2.5 shadow-lg backdrop-blur-sm print:hidden">
        {saveError && (
          <div className="mx-auto mb-1 max-w-7xl rounded border border-rose-300 bg-rose-50 px-3 py-1.5 text-[11px] text-rose-800">
            保存に失敗しました: {saveError}
            <button
              type="button"
              className="ml-2 underline"
              onClick={() => {
                try {
                  localStorage.removeItem("ky-record");
                  localStorage.removeItem("ky-signatures");
                  localStorage.removeItem("safe-ai:ky-instruction-record:v1");
                  localStorage.removeItem("safe-ai:ky-record-list:v1");
                } catch {}
                setSaveError(null);
                window.location.reload();
              }}
            >
              データをリセットして再読込
            </button>
          </div>
        )}
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] text-slate-500">{savedLabel}</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void handleManualSave()}
              className="rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
            >
              保存
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-lg bg-sky-600 px-5 py-1.5 text-xs font-bold text-white shadow hover:bg-sky-700"
            >
              PDF出力 / 印刷
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
