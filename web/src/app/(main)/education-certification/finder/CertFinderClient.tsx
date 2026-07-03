"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  GraduationCap,
  ChevronRight,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Clock,
  Scale,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import {
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

function ResultCard({ result }: { result: RequiredCertResult }) {
  const { cert, matchReason, priority } = result;
  const colors = CERT_TYPE_COLORS[cert.certType];
  const label = CERT_TYPE_LABELS[cert.certType];

  return (
    <div
      className={`rounded-xl border bg-white shadow-sm dark:bg-slate-800 border-l-4 ${colors.border} ${
        priority === "required" ? "" : "opacity-80"
      }`}
    >
      <div className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${colors.badge}`}>
            {label}
          </span>
          {priority === "required" ? (
            <span className="flex items-center gap-0.5 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-900/30 dark:text-red-400">
              <AlertCircle className="h-3 w-3" aria-hidden />
              法令義務
            </span>
          ) : (
            <span className="flex items-center gap-0.5 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
              <CheckCircle2 className="h-3 w-3" aria-hidden />
              推奨
            </span>
          )}
        </div>

        <h3 className="mt-2 text-sm font-bold text-slate-900 dark:text-slate-100">{cert.name}</h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{cert.targetWork}</p>

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
            ⚠ {cert.notes}
          </p>
        )}

        <p className="mt-2 text-[10px] text-slate-400 dark:text-slate-500">
          判定理由: {matchReason}
        </p>
      </div>
    </div>
  );
}

export function CertFinderClient() {
  const [selectedCategories, setSelectedCategories] = useState<WorkCategory[]>([]);
  const [selectedWorks, setSelectedWorks] = useState<string[]>([]);
  const [freeText, setFreeText] = useState("");
  const [selectedScenarios, setSelectedScenarios] = useState<string[]>([]);

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
    if (freeText.trim()) terms.push(...freeText.split(/[\s,、。]+/).filter(Boolean));
    return terms;
  }, [selectedWorks, freeText]);

  // 業務シナリオから直接資格を引くモード
  const scenarioResults = useMemo((): RequiredCertResult[] | null => {
    if (selectedScenarios.length === 0) return null;
    const certIds = getCertIdsForScenarios(selectedScenarios);
    const certs = certIds.map((id) => ALL_CERTS.find((c) => c.id === id)).filter(Boolean) as typeof ALL_CERTS;
    return certs.map((cert) => {
      const scenario = WORK_SCENARIOS.find((s) => s.requiredCertIds.includes(cert.id));
      return {
        cert,
        matchReason: scenario?.legalNote ?? "業務シナリオに該当",
        priority: (cert.certType === "job_chief" ? "recommended" : "required") as "required" | "recommended",
      };
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

  const requiredResults = results?.filter((r) => r.priority === "required") ?? [];
  const recommendedResults = results?.filter((r) => r.priority === "recommended") ?? [];
  const conclusion =
    results !== null
      ? buildFinderConclusion(requiredResults.length, recommendedResults.length)
      : null;

  const reset = () => {
    setSelectedCategories([]);
    setSelectedWorks([]);
    setFreeText("");
    setSelectedScenarios([]);
  };

  const isUsingScenarioMode = selectedScenarios.length > 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <PageHeader
        title="業務別 必要資格判定"
        description="業種と作業内容を選択して、必要な特別教育・技能講習・職長教育を確認。"
        icon={Search}
        iconColor="blue"
      />

      <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
        {/* Breadcrumb */}
        <nav aria-label="パンくずリスト" className="mb-4">
          <ol className="flex items-center gap-1 text-xs text-slate-500">
            <li>
              <Link href="/education-certification" className="hover:text-blue-600 hover:underline">
                特別教育・技能講習DB
              </Link>
            </li>
            <li aria-hidden><ChevronRight className="h-3 w-3" /></li>
            <li className="font-medium text-slate-700 dark:text-slate-300">資格判定ツール</li>
          </ol>
        </nav>

        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          {/* Left: Filter panel */}
          <aside className="space-y-4">
            {/* Scenario quick-select */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/20">
              <div className="mb-3 flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-600" aria-hidden />
                <h2 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                  クイック選択（業務シナリオ）
                </h2>
              </div>
              <p className="mb-3 text-[11px] text-amber-700 dark:text-amber-300">
                よくある業務を選択すると、必要な資格が即時表示されます
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
                  {isUsingScenarioMode ? "詳細検索（任意）" : "Step 1: 業種を選択"}
                </h2>
                {(selectedCategories.length > 0 || selectedWorks.length > 0 || freeText || selectedScenarios.length > 0) && (
                  <button
                    type="button"
                    onClick={reset}
                    className="flex min-h-[44px] items-center gap-1 text-xs text-slate-500 hover:text-red-600"
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
                    className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-500">作業名・機械名・化学物質名など自由に入力</p>
              </div>
            </div>
          </aside>

          {/* Right: Results */}
          <section aria-label="判定結果" aria-live="polite">
            {results === null ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center dark:border-slate-700">
                <GraduationCap className="mb-3 h-12 w-12 text-slate-300 dark:text-slate-600" aria-hidden />
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  業種または作業内容を選択すると
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  必要な資格・講習が表示されます
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
                      <AlertCircle className="h-4 w-4 text-red-500" aria-hidden />
                      法令義務（{requiredResults.length}件）
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {requiredResults.map((r) => (
                        <ResultCard key={r.cert.id} result={r} />
                      ))}
                    </div>
                  </div>
                )}

                {recommendedResults.length > 0 && (
                  <div>
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300">
                      <CheckCircle2 className="h-4 w-4 text-slate-400" aria-hidden />
                      推奨・関連（{recommendedResults.length}件）
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {recommendedResults.map((r) => (
                        <ResultCard key={r.cert.id} result={r} />
                      ))}
                    </div>
                  </div>
                )}

                <p className="rounded-lg bg-slate-100 px-3 py-2.5 text-[11px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  ※ 本判定は参考情報です。実際の適用可否は各都道府県労働局・厚生労働省の最新情報をご確認ください。
                  また、業務内容・機械の規格等により適用法令が異なる場合があります。
                </p>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
