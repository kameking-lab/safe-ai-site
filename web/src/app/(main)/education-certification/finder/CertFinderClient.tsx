"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  GraduationCap,
  RotateCcw,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Scale,
  Zap,
} from "lucide-react";
import { TaskPageIntro } from "@/components/task-page-intro";
import { ContextualNextActions } from "@/components/contextual-next-actions";
import { TransientChatLink } from "@/components/home-safety-cockpit/transient-chat-link";
import {
  createCertCandidateResult,
  determineRequiredCerts,
  CERT_TYPE_LABELS,
  CERT_TYPE_COLORS,
  WORK_CATEGORY_LABELS,
  WORK_TAG_PRESETS,
} from "@/lib/education-cert-engine";
import { WORK_SCENARIOS, getCertIdsForScenarios } from "@/lib/work-certification-mapper";
import { ALL_CERTS } from "@/data/education-rules";
import { buildFinderConclusion } from "@/lib/education/finder-conclusion";
import { ConclusionCard } from "@/components/ui/conclusion-card";
import type { WorkCategory, RequiredCertResult } from "@/types/education-cert";
import {
  qualificationMissingQuestions,
  qualificationSearchTerms,
} from "@/lib/education/qualification-context";
import {
  QUALIFICATION_FINDER_PATH,
  createEmptyQualificationFinderInitialState,
  type QualificationFinderConditions,
  type QualificationFinderInitialState,
  type QualificationFinderPrefill,
} from "@/lib/education/qualification-finder-query";

const CATEGORIES: WorkCategory[] = [
  "construction",
  "manufacturing",
  "logistics",
  "chemical",
  "electrical",
  "forestry",
  "mining",
  "shipbuilding",
  "general",
];

function CategoryChip({
  cat,
  selected,
  onToggle,
}: {
  cat: WorkCategory;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className={`min-h-[44px] rounded-full border px-3 py-1.5 text-xs font-medium transition ${
        selected
          ? "border-blue-500 bg-blue-600 text-white"
          : "border-slate-300 bg-white text-slate-700 hover:border-blue-400 hover:bg-blue-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
      }`}
    >
      {WORK_CATEGORY_LABELS[cat]}
    </button>
  );
}

function WorkTagChip({
  tag,
  selected,
  onToggle,
}: {
  tag: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className={`min-h-[44px] rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
        selected
          ? "border-amber-500 bg-amber-500 text-white"
          : "border-slate-200 bg-slate-50 text-slate-600 hover:border-amber-400 hover:bg-amber-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
      }`}
    >
      {tag}
    </button>
  );
}

type VisualKyQualificationLink = {
  id: string;
  label: string;
  href: string;
};

function ResultCard({
  result,
  visualKyLinks,
}: {
  result: RequiredCertResult;
  visualKyLinks: readonly VisualKyQualificationLink[];
}) {
  const { cert, matchReason, decision, conditionState } = result;
  const colors = CERT_TYPE_COLORS[cert.certType];
  const label = CERT_TYPE_LABELS[cert.certType];

  return (
    <div
      className={`rounded-xl border bg-white shadow-sm dark:bg-slate-800 border-l-4 ${colors.border} ${
        decision === "unverified" ? "opacity-80" : ""
      }`}
    >
      <div className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${colors.badge}`}>
            {label}
          </span>
          {decision === "statutoryCandidate" ? (
            <span className="flex items-center gap-0.5 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
              <AlertCircle className="h-3 w-3" aria-hidden />
              法定制度候補・要条件確認
            </span>
          ) : decision === "unverified" ? (
            <span className="flex items-center gap-0.5 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
              <AlertTriangle className="h-3 w-3" aria-hidden />
              一次資料の内容確認待ち
            </span>
          ) : (
            <span className="flex items-center gap-0.5 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
              <CheckCircle2 className="h-3 w-3" aria-hidden />
              関連・推奨
            </span>
          )}
        </div>

        <h3 className="mt-2 text-sm font-bold text-slate-900 dark:text-slate-100">{cert.name}</h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-slate-700 dark:text-slate-200">対象作業・必要条件:</span> {cert.targetWork}
        </p>

        <div className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          <div className="flex items-start gap-1.5 text-xs text-slate-600 dark:text-slate-300">
            <Scale className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
            <span>{cert.relatedLaw}</span>
          </div>
          <div className="flex items-start gap-1.5 text-xs text-slate-600 dark:text-slate-300">
            <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
            <span>{cert.duration}</span>
          </div>
        </div>

        {cert.frequency && (
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium">定期教育:</span> {cert.frequency}
          </p>
        )}

        {cert.notes && (
          <p className="mt-1.5 rounded-md bg-amber-50 px-2 py-1.5 text-[11px] text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
            <AlertTriangle className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />
            {cert.notes}
          </p>
        )}
        {!cert.notes && (
          <p className="mt-1.5 rounded-md bg-slate-100 px-2 py-1.5 text-[11px] text-slate-700 dark:bg-slate-700 dark:text-slate-200">
            対象外・分岐条件: 能力、方式、担当範囲により変わるため、一次資料と実際の作業条件で確認してください。
          </p>
        )}

        <p className="mt-2 text-[10px] text-slate-400 dark:text-slate-500">
          判定理由: {matchReason}
        </p>
        <p className="mt-1 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
          条件状態:{" "}
          {conditionState === "satisfied"
            ? "入力上は一致（人間確認が必要）"
            : conditionState === "conflicting"
              ? "入力条件と不一致"
              : "能力・方式・役割等が不足"}
        </p>
        {cert.primarySources && cert.primarySources.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
            {cert.primarySources.map((source) => (
              <a
                key={`${source.url}-${source.title}`}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-blue-700 underline underline-offset-2 dark:text-blue-300"
              >
                公式資料: {source.title}
              </a>
            ))}
            <span className="text-slate-500">
              内容確認状態:{" "}
              {cert.sourceVerification === "humanVerified"
                ? "人手確認済み"
                : cert.sourceVerification === "sourceLocated"
                  ? "URL確認済み・人手確認待ち"
                  : "未確認"}
            </span>
          </div>
        )}
        {visualKyLinks.length > 0 && (
          <div className="mt-3 rounded-lg border border-teal-200 bg-teal-50 p-3 text-xs text-teal-950 dark:border-teal-800 dark:bg-teal-950/30 dark:text-teal-100">
            <p className="font-bold">この資格に関係する現場問題</p>
            <ul className="mt-1 space-y-1">
              {visualKyLinks.map((link) => (
                <li key={link.id}>
                  <Link
                    href={link.href}
                    className="inline-flex min-h-11 items-center font-bold underline underline-offset-2"
                  >
                    {link.label}（合成KYT教材）
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

type CertFinderClientProps = {
  initialState?: QualificationFinderInitialState;
  visualKyLinksByQualification?: Record<
    string,
    VisualKyQualificationLink[]
  >;
};

export function CertFinderClient({
  initialState = createEmptyQualificationFinderInitialState(),
  visualKyLinksByQualification = {},
}: CertFinderClientProps = {}) {
  const router = useRouter();
  const [selectedCategories, setSelectedCategories] = useState<WorkCategory[]>(
    () => [...initialState.selectedCategories],
  );
  const [selectedWorks, setSelectedWorks] = useState<string[]>([]);
  const [freeText, setFreeText] = useState(initialState.freeText);
  const [selectedScenarios, setSelectedScenarios] = useState<string[]>([]);
  const [conditions, setConditions] =
    useState<QualificationFinderConditions>(() => ({
      ...initialState.conditions,
    }));
  const [prefill, setPrefill] = useState<QualificationFinderPrefill>(
    initialState.prefill,
  );

  const toggleCategory = (cat: WorkCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const toggleWork = (tag: string) => {
    setSelectedWorks((prev) =>
      prev.includes(tag) ? prev.filter((w) => w !== tag) : [...prev, tag]
    );
  };

  const toggleScenario = (sid: string) => {
    setSelectedScenarios((prev) =>
      prev.includes(sid) ? prev.filter((s) => s !== sid) : [...prev, sid]
    );
  };

  const availableWorkTags = useMemo(() => {
    if (selectedCategories.length === 0) return [];
    const tags = new Set<string>();
    for (const cat of selectedCategories) {
      for (const tag of WORK_TAG_PRESETS[cat]) tags.add(tag);
    }
    return Array.from(tags);
  }, [selectedCategories]);

  const allWorkTerms = useMemo(() => {
    const terms = [...selectedWorks];
    terms.push(...qualificationSearchTerms({
      work: freeText,
      ...conditions,
    }));
    return terms;
  }, [selectedWorks, freeText, conditions]);

  const missingQuestions = useMemo(
    () => qualificationMissingQuestions({
      work: [...selectedWorks, freeText].filter(Boolean).join(" "),
      ...conditions,
    }),
    [selectedWorks, freeText, conditions]
  );

  // 業務シナリオから直接資格を引くモード
  const scenarioResults = useMemo((): RequiredCertResult[] | null => {
    if (selectedScenarios.length === 0) return null;
    const certIds = getCertIdsForScenarios(selectedScenarios);
    const certs = certIds.map((id) => ALL_CERTS.find((c) => c.id === id)).filter(Boolean) as typeof ALL_CERTS;
    return certs.map((cert) => {
      const scenario = WORK_SCENARIOS.find((s) => s.requiredCertIds.includes(cert.id));
      return createCertCandidateResult(
        cert,
        scenario?.legalNote ?? "業務シナリオに該当",
        "missing",
        false,
      );
    });
  }, [selectedScenarios]);

  const results = useMemo(() => {
    if (scenarioResults !== null) return scenarioResults;
    if (selectedCategories.length === 0 && allWorkTerms.length === 0) return null;
    return determineRequiredCerts({
      businessTypes: selectedCategories.length > 0 ? selectedCategories : ["general"],
      works: allWorkTerms,
    });
  }, [selectedCategories, allWorkTerms, scenarioResults]);

  const requiredResults =
    results?.filter((result) => result.decision === "statutoryCandidate") ?? [];
  const recommendedResults =
    results?.filter((result) => result.decision !== "statutoryCandidate") ?? [];
  const conclusion =
    results !== null
      ? buildFinderConclusion(requiredResults.length, recommendedResults.length)
      : null;

  const reset = () => {
    setSelectedCategories([]);
    setSelectedWorks([]);
    setFreeText("");
    setSelectedScenarios([]);
    setConditions({ height: "", equipment: "", target: "", voltage: "", role: "" });
    setPrefill(createEmptyQualificationFinderInitialState().prefill);
    router.replace(QUALIFICATION_FINDER_PATH, { scroll: false });
  };

  const isUsingScenarioMode = selectedScenarios.length > 0;
  const hasAnyCondition = Object.values(conditions).some(
    (value) => value.trim().length > 0,
  );
  const hasSearchCriteria =
    selectedCategories.length > 0 ||
    selectedWorks.length > 0 ||
    freeText.trim().length > 0 ||
    selectedScenarios.length > 0 ||
    hasAnyCondition;
  const hasAnyInput = hasSearchCriteria || prefill.status !== "none";
  const chatQuestion = useMemo(() => {
    if (!hasSearchCriteria) return "";
    const scenarioLabels = selectedScenarios
      .map((id) => WORK_SCENARIOS.find((scenario) => scenario.id === id)?.label)
      .filter((label): label is string => Boolean(label));
    const categoryLabels = selectedCategories.map(
      (category) => `業種: ${WORK_CATEGORY_LABELS[category]}`,
    );
    const work = [...scenarioLabels, ...selectedWorks, freeText.trim()]
      .map((value) => value.trim())
      .filter(
        (value, index, values) =>
          Boolean(value) && values.indexOf(value) === index,
      );
    const conditionLabels: Array<[keyof QualificationFinderConditions, string]> = [
      ["equipment", "機械・設備"],
      ["role", "立場・担当"],
      ["target", "対象物"],
      ["height", "高さ"],
      ["voltage", "電圧・充電状態"],
    ];
    const conditionText = [
      ...categoryLabels,
      ...conditionLabels
        .map(([key, label]) =>
          conditions[key].trim() ? `${label}: ${conditions[key].trim()}` : "",
        )
        .filter(Boolean),
    ].join("、");
    const target = work.length > 0 ? work.join("、") : "選択した作業";
    return `${target}に必要な資格・教育を教えて。${conditionText ? `条件は${conditionText}です。` : ""}`;
  }, [
    conditions,
    freeText,
    hasSearchCriteria,
    selectedCategories,
    selectedScenarios,
    selectedWorks,
  ]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6">
        <TaskPageIntro
          eyebrow="学ぶ・資格"
          title="作業から資格を確認"
          summary="作業を選び、不足条件へ答えて資格・教育の候補を確認します。"
          status="候補表示・要確認"
          primaryAction={{ href: "#cert-work", label: "作業内容を選ぶ" }}
          secondaryActions={[
            { href: "/education-certification", label: "制度一覧を見る" },
            { href: "/about/usage-notes", label: "注意事項" },
          ]}
          compactOnMobile
          visual="learning"
        />
      </div>

      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
        {prefill.status === "accepted" && (
          <section
            role="status"
            aria-labelledby="qualification-prefill-title"
            className="mb-4 rounded-xl border border-blue-300 bg-blue-50 p-4 text-sm text-blue-950 dark:border-blue-700 dark:bg-blue-950/30 dark:text-blue-100"
          >
            <h2 id="qualification-prefill-title" className="font-bold">
              前ページの条件を引き継ぎました
            </h2>
            <ul className="mt-2 flex flex-wrap gap-2" aria-label="引き継いだ条件">
              {prefill.inheritedItems.map((item) => (
                <li
                  key={item}
                  className="rounded-full border border-blue-300 bg-white px-3 py-1 text-xs font-semibold text-blue-900 dark:border-blue-600 dark:bg-slate-900 dark:text-blue-100"
                >
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs leading-relaxed">
              引継ぎ値は候補を探すための初期条件です。資格・教育の要否を確定するものではありません。
            </p>
            {prefill.termCoverage === "reviewRequired" && (
              <p className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-950 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100">
                この語は現行の収録候補だけでは一致を特定できません。作業内容・機械・役割などを追加し、候補が0件でも資格不要と判断せず、公式窓口で確認してください。
              </p>
            )}
            {prefill.termCoverage === "topicGuide" &&
              prefill.guideHref &&
              prefill.guideLabel && (
                <p className="mt-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-100">
                  このテーマには専用の実務ガイドがあります。資格候補が0件でも「対策不要」を意味しません。{" "}
                  <Link
                    href={prefill.guideHref}
                    className="inline-flex min-h-[44px] items-center font-bold underline underline-offset-2"
                  >
                    {prefill.guideLabel}
                  </Link>
                </p>
              )}
          </section>
        )}

        {prefill.status === "rejected" && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100"
          >
            <p className="font-bold">URLの条件は引き継いでいません</p>
            <p className="mt-1 text-xs leading-relaxed">
              未知・重複・長すぎる値などを検出したため、URL内の値を入力欄や検索へ使用しませんでした。画面上で条件を選び直してください。
            </p>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          {/* Left: Filter panel */}
          <aside className="space-y-4">
            {/* Scenario quick-select */}
            <div
              id="cert-work"
              className="scroll-mt-28 rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/20"
            >
              <div className="mb-3 flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-600" aria-hidden />
                <h2 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                  Step 1: 作業内容を選ぶ
                </h2>
              </div>
              <p className="mb-3 text-[11px] text-amber-700 dark:text-amber-300">
                  よくある業務から関連資格の候補を表示します（適用条件は要確認）
              </p>
              <div className="flex flex-wrap gap-1.5">
                {WORK_SCENARIOS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleScenario(s.id)}
                    aria-pressed={selectedScenarios.includes(s.id)}
                    className={`min-h-[44px] rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                      selectedScenarios.includes(s.id)
                        ? "border-amber-500 bg-amber-500 text-white"
                        : "border-amber-300 bg-white text-amber-800 hover:border-amber-500 hover:bg-amber-100 dark:border-amber-700 dark:bg-slate-800 dark:text-amber-300"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {isUsingScenarioMode ? "追加条件（任意）" : "追加条件：業種を選ぶ"}
                </h2>
                {hasAnyInput && (
                  <button
                    type="button"
                    onClick={reset}
                    className="flex min-h-[44px] items-center gap-1 text-xs text-slate-500 hover:text-rose-600"
                    aria-label="条件をリセット"
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                    リセット
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <CategoryChip
                    key={cat}
                    cat={cat}
                    selected={selectedCategories.includes(cat)}
                    onToggle={() => toggleCategory(cat)}
                  />
                ))}
              </div>

              {availableWorkTags.length > 0 && (
                <>
                  <h2 className="mb-2 mt-5 text-sm font-bold text-slate-900 dark:text-slate-100">
                    Step 2: 作業内容を選択（複数可）
                  </h2>
                  <div className="flex flex-wrap gap-1.5">
                    {availableWorkTags.map((tag) => (
                      <WorkTagChip
                        key={tag}
                        tag={tag}
                        selected={selectedWorks.includes(tag)}
                        onToggle={() => toggleWork(tag)}
                      />
                    ))}
                  </div>
                </>
              )}

              <div className="mt-5">
                <label
                  htmlFor="freetext"
                  className="mb-1.5 block text-sm font-bold text-slate-900 dark:text-slate-100"
                >
                  {availableWorkTags.length > 0 ? "Step 3:" : "Step 2:"} フリー入力（任意）
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
                  <input
                    id="freetext"
                    type="text"
                    value={freeText}
                    onChange={(e) => setFreeText(e.target.value)}
                    placeholder="例: 足場 玉掛け 有機溶剤"
                    maxLength={160}
                    className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-500">作業名・機械名・化学物質名など自由に入力</p>
              </div>

              <fieldset className="mt-4 rounded-xl border border-blue-200 bg-blue-50/50 p-3">
                <legend className="px-1 text-xs font-bold text-blue-950">条件確認（該当要件の分岐に使用）</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {([
                    ["equipment", "機械・設備と能力", "例: フォークリフト 最大荷重1t"],
                    ["role", "立場・担当", "例: 運転、操作、補助、作業主任者"],
                    ["target", "対象物・材料", "例: パレット、石綿含有材"],
                    ["height", "高さ", "例: 作業床5m"],
                    ["voltage", "電圧・充電状態", "例: 低圧200V、停電済み"],
                  ] as const).map(([key, label, placeholder]) => (
                    <label key={key} className="text-[11px] font-semibold text-slate-700">
                      {label}
                      <input
                        value={conditions[key]}
                        onChange={(event) => setConditions((current) => ({ ...current, [key]: event.target.value }))}
                        placeholder={placeholder}
                        maxLength={160}
                        className="mt-1 min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-2 text-sm"
                      />
                    </label>
                  ))}
                </div>
              </fieldset>
              {missingQuestions.length > 0 && hasSearchCriteria && (
                <div role="status" className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950">
                  <p className="font-bold">判定を確定できない不足条件</p>
                  <ul className="mt-1 list-disc pl-5">
                    {missingQuestions.map((question) => <li key={question}>{question}</li>)}
                  </ul>
                  <p className="mt-1">候補が0件でも「資格不要」とは判断できません。</p>
                </div>
              )}
            </div>
          </aside>

          {/* Right: Results */}
          <section id="cert-results" className="scroll-mt-28" aria-label="候補検索結果" aria-live="polite">
            {results === null ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center dark:border-slate-700">
                <GraduationCap className="mb-3 h-12 w-12 text-slate-300 dark:text-slate-600" aria-hidden />
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  業種または作業内容を選択すると
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  関連する資格・教育候補と不足条件が表示されます
                </p>
              </div>
            ) : results.length === 0 ? (
              conclusion && (
                <ConclusionCard
                  tone={conclusion.tone}
                  value={conclusion.value}
                  unit="件"
                  title={conclusion.title}
                  description={conclusion.description}
                />
              )
            ) : (
              <div className="space-y-6">
                {conclusion && (
                  <ConclusionCard
                    tone={conclusion.tone}
                    value={conclusion.value}
                    unit="件"
                    title={conclusion.title}
                    description={conclusion.description}
                  />
                )}

                {requiredResults.length > 0 && (
                  <div>
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                      <AlertCircle className="h-4 w-4 text-rose-500" aria-hidden />
                      条件確認が必要な法定制度候補（{requiredResults.length}件）
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {requiredResults.map((r) => (
                        <ResultCard
                          key={r.cert.id}
                          result={r}
                          visualKyLinks={
                            visualKyLinksByQualification[r.cert.id] ?? []
                          }
                        />
                      ))}
                    </div>
                  </div>
                )}

                {recommendedResults.length > 0 && (
                  <div>
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300">
                      <CheckCircle2 className="h-4 w-4 text-slate-400" aria-hidden />
                      関連・未確認候補（{recommendedResults.length}件）
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {recommendedResults.map((r) => (
                        <ResultCard
                          key={r.cert.id}
                          result={r}
                          visualKyLinks={
                            visualKyLinksByQualification[r.cert.id] ?? []
                          }
                        />
                      ))}
                    </div>
                  </div>
                )}

                <p className="rounded-lg bg-slate-100 px-3 py-2.5 text-[11px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  ※ これは資格候補の絞り込みであり、法令義務の確定判定ではありません。業務内容・機械能力・方式等により必要資格が分岐します。
                  <a className="ml-1 font-semibold underline" href="https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/roudoukijun/anzen/anzeneisei04.html" target="_blank" rel="noopener noreferrer">
                    厚生労働省の免許・技能講習案内を確認
                  </a>
                </p>
              </div>
            )}
          </section>
        </div>
        {chatQuestion && (
          <div className="mt-6 flex flex-wrap items-center gap-2 rounded-xl border border-blue-100 bg-white px-3 py-2 text-xs text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            <span>選択した条件を引き継いで会話で確認できます。</span>
            <TransientChatLink
              question={chatQuestion}
              data-qualification-chat-handoff=""
              className="inline-flex min-h-11 items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-2 font-semibold text-blue-800 hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200"
            >
              この条件で安衛法AIに質問
            </TransientChatLink>
          </div>
        )}
        <div className="mt-6">
          <ContextualNextActions
            actions={[
              { href: "/law-search", label: "関連法令を確認する" },
              { href: "/ky/paper", label: "資格確認をKYへ反映する" },
              { href: "/education-certification", label: "教育制度一覧を見る" },
              { href: "/services/automation", label: "資格管理を相談する" },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
