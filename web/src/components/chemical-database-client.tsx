"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/layout";
import { ConclusionCard } from "@/components/ui/conclusion-card";
import type { SafetyTone } from "@/lib/design/safety-tone";
import {
  Search,
  FlaskConical,
  AlertTriangle,
  Hand,
  ShieldAlert,
  ExternalLink,
  Info,
  ClipboardCheck,
  Filter,
  X,
} from "lucide-react";
import {
  chemicalSubstances,
  chemicalCategoryInfo,
  type ChemicalCategory,
  type ChemicalSubstance,
} from "@/data/mock/chemical-substances-db";
import type { MergedChemical } from "@/lib/mhlw-chemicals";
import { getAllMergedChemicalsSlim as getAllMergedChemicals } from "@/lib/mhlw-chemicals-slim";
import { ContextualPpePicks } from "@/components/ContextualPpePicks";
import {
  ALL_REGULATION_TAGS,
  REGULATION_TAGS,
  TAG_CATEGORY_ORDER,
  TAG_CATEGORY_LABELS,
  CONSTRUCTION_PRIORITY_CAS_SET,
  normalizeTags,
  type RegulationTag,
} from "@/lib/regulation-tag-labels";
import { RegulationTagBadgeList } from "@/components/regulation-tag-badge";


const CATEGORY_FILTERS: ChemicalCategory[] = [
  "特化則1類",
  "特化則2類",
  "特化則3類",
  "有機溶剤1種",
  "有機溶剤2種",
  "皮膚等障害化学物質等",
  "リスクアセスメント対象物",
];

function normalize(v: string): string {
  return v.toLowerCase().replace(/\s+/g, "");
}

function matches(sub: ChemicalSubstance, q: string): boolean {
  if (!q) return true;
  const n = normalize(q);
  const haystack = [
    sub.name,
    sub.name_en ?? "",
    sub.cas,
    ...(sub.synonyms ?? []),
    sub.uses,
    sub.health_effects,
    ...sub.categories,
    ...sub.related_laws,
  ]
    .map(normalize)
    .join(" ");
  return haystack.includes(n);
}

function normalizeMhlw(v: string): string {
  return v.toLowerCase().replace(/\s+/g, "");
}

function matchesMhlw(c: MergedChemical, q: string): boolean {
  if (!q) return true;
  const n = normalizeMhlw(q);
  return (
    normalizeMhlw(c.primaryName).includes(n) ||
    (c.cas !== null && normalizeMhlw(c.cas).includes(n)) ||
    c.aliases.some((a) => normalizeMhlw(a).includes(n))
  );
}

export function ChemicalDatabaseClient() {
  const mhlwChemicals = useMemo(() => getAllMergedChemicals(), []);
  const mhlwCount = mhlwChemicals.length;
  const [mode, setMode] = useState<"curated" | "mhlw">("mhlw");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ChemicalCategory | "">("");
  const [skinOnly, setSkinOnly] = useState(false);
  // Phase 1e: 規制タグフィルタ
  const [selectedTags, setSelectedTags] = useState<Set<RegulationTag>>(new Set());
  const [tagMatchMode, setTagMatchMode] = useState<"and" | "or">("and");
  const [constructionOnly, setConstructionOnly] = useState(false);

  const toggleTag = (t: RegulationTag) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };
  const clearTagFilter = () => {
    setSelectedTags(new Set());
    setConstructionOnly(false);
  };

  const filtered = useMemo(() => {
    return chemicalSubstances.filter((s) => {
      if (!matches(s, query)) return false;
      if (category && !s.categories.includes(category)) return false;
      if (skinOnly && !s.skin_hazard) return false;
      return true;
    });
  }, [query, category, skinOnly]);

  const filteredMhlw = useMemo(() => {
    return mhlwChemicals.filter((c) => {
      if (!matchesMhlw(c, query)) return false;
      // 建設業頻出物質プリセット
      if (constructionOnly) {
        if (!c.cas || !CONSTRUCTION_PRIORITY_CAS_SET.has(c.cas)) return false;
      }
      // 規制タグフィルタ
      if (selectedTags.size > 0) {
        const tags = new Set(normalizeTags(c.details?.limits?.regulationTags));
        if (tagMatchMode === "and") {
          for (const t of selectedTags) if (!tags.has(t)) return false;
        } else {
          let any = false;
          for (const t of selectedTags) if (tags.has(t)) { any = true; break; }
          if (!any) return false;
        }
      }
      return true;
    });
  }, [mhlwChemicals, query, selectedTags, tagMatchMode, constructionOnly]);

  // 結論カード（柱0）: 本文を読まず3秒で「いまの状態（収録数／該当件数）」が分かる。
  // 収録数・該当数は「OK/完了」ではないため緑(safe)を使わず案内色の info（青）。該当0だけ warning（黄）。
  const mhlwHasFilter =
    query.trim() !== "" || selectedTags.size > 0 || constructionOnly;
  const conclusion: {
    tone: SafetyTone;
    value?: string;
    unit?: string;
    title: string;
    description: string;
  } =
    mode === "curated"
      ? {
          tone: "info",
          value: chemicalSubstances.length.toLocaleString(),
          unit: "物質",
          title: "専門解説",
          description: "労働安全コンサルタントによる解説付きの主要物質。",
        }
      : mhlwHasFilter
        ? filteredMhlw.length > 0
          ? {
              tone: "info",
              value: filteredMhlw.length.toLocaleString(),
              unit: "件",
              title: "該当",
              description: `全 ${mhlwCount.toLocaleString()} 物質から絞り込み中。`,
            }
          : {
              tone: "warning",
              title: "該当なし",
              description:
                "条件に一致する物質がありません。キーワードや規制法令の絞り込みを見直してください。",
            }
        : {
            tone: "info",
            value: mhlwCount.toLocaleString(),
            unit: "物質",
            title: "収録",
            description:
              "厚労省の公開4リスト（皮膚等障害・SDS交付義務・がん原性・濃度基準値）をCAS番号で統合。物質名・CAS番号で検索できます。",
          };

  return (
    <PageContainer width="wide">
      <ConclusionCard
        tone={conclusion.tone}
        value={conclusion.value}
        unit={conclusion.unit}
        title={conclusion.title}
        description={conclusion.description}
        icon={conclusion.tone === "info" ? FlaskConical : undefined}
        className="mb-5"
      />
      <header className="mb-5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-emerald-700">
          <FlaskConical className="h-4 w-4" aria-hidden="true" />
          化学物質検索DB
        </div>
        <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
          化学物質データベース（MHLW {mhlwCount.toLocaleString()}物質 ＋ 専門解説50物質）
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-700">
          厚生労働省の公開 4 リスト（皮膚等障害・SDS交付義務・がん原性・濃度基準値）を CAS 番号で統合した
          {mhlwCount.toLocaleString()} 物質を CAS・物質名で横断検索。労働安全コンサルタントによる専門解説 50 物質も併読できます。
        </p>
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          ⚠️ 最終判断は必ず厚生労働省 <Link href="https://anzeninfo.mhlw.go.jp/" className="font-semibold underline" target="_blank" rel="noopener noreferrer">職場のあんぜんサイト</Link>
          と各物質の SDS をご確認ください。本データベースは管理補助を目的としています。
        </div>
      </header>

      <div className="mb-4 flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1 w-fit">
        {(
          [
            { id: "mhlw", label: `MHLW ${mhlwCount.toLocaleString()}物質（CAS統合）` },
            { id: "curated", label: "専門解説 50物質" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setMode(tab.id)}
            className={`inline-flex min-h-[44px] items-center justify-center rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors ${
              mode === tab.id
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {mode === "mhlw" && (
        <section className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800">
              <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
              物質名・CAS番号で検索
            </div>
            <label className="block">
              <span className="sr-only">物質名・CAS番号で検索</span>
              <input
                type="search"
                inputMode="search"
                placeholder="例: ベンゼン / 71-43-2"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
            </label>
            <p className="mt-2 text-xs text-slate-500">
              {query || selectedTags.size > 0 || constructionOnly
                ? `${filteredMhlw.length.toLocaleString()} 件 / 全 ${mhlwCount.toLocaleString()} 件`
                : `全 ${mhlwCount.toLocaleString()} 件`}（CAS 統合）
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                <Filter className="h-4 w-4 text-slate-400" aria-hidden="true" />
                規制法令で絞り込み
                {selectedTags.size > 0 && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
                    {selectedTags.size} 件選択中
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={constructionOnly}
                    onChange={(e) => setConstructionOnly(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-400 text-amber-600 focus:ring-amber-500"
                  />
                  建設業頻出物質のみ
                </label>
                <div
                  className="inline-flex rounded-md border border-slate-300 text-xs overflow-hidden"
                  role="radiogroup"
                  aria-label="複数タグの結合方法"
                >
                  {(["and", "or"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setTagMatchMode(m)}
                      className={`inline-flex min-h-[44px] items-center justify-center px-2.5 py-1 ${
                        tagMatchMode === m
                          ? "bg-slate-800 text-white"
                          : "bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {m === "and" ? "全て満たす (AND)" : "いずれか (OR)"}
                    </button>
                  ))}
                </div>
                {(selectedTags.size > 0 || constructionOnly) && (
                  <button
                    type="button"
                    onClick={clearTagFilter}
                    className="inline-flex min-h-[44px] items-center gap-1 rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                    クリア
                  </button>
                )}
              </div>
            </div>
            <div className="space-y-2">
              {TAG_CATEGORY_ORDER.map((cat) => {
                const tagsInCat = ALL_REGULATION_TAGS.filter(
                  (t) => REGULATION_TAGS[t].category === cat,
                );
                if (tagsInCat.length === 0) return null;
                return (
                  <div key={cat} className="flex flex-wrap items-baseline gap-2">
                    <span className="text-[11px] font-semibold uppercase text-slate-500 min-w-[8rem]">
                      {TAG_CATEGORY_LABELS[cat]}
                    </span>
                    {tagsInCat.map((t) => {
                      const info = REGULATION_TAGS[t];
                      const selected = selectedTags.has(t);
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => toggleTag(t)}
                          className={`inline-flex min-h-[44px] items-center rounded border text-xs px-2 py-0.5 font-medium whitespace-nowrap ${info.badgeClass} ${
                            selected ? "ring-2 ring-offset-1 ring-slate-700" : "opacity-70 hover:opacity-100"
                          }`}
                          title={info.fullLabel}
                        >
                          {info.shortLabel}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
          {filteredMhlw.length === 0 ? (
            <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
              該当する物質が見つかりませんでした。別の語句でお試しください。
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-xs">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">CAS番号</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">物質名 / 規制タグ</th>
                    <th className="px-3 py-2 text-center font-semibold text-slate-700">がん原性</th>
                    <th className="px-3 py-2 text-center font-semibold text-slate-700">皮膚障害</th>
                    <th className="px-3 py-2 text-center font-semibold text-slate-700">濃度基準</th>
                    <th className="px-3 py-2 text-center font-semibold text-slate-700">SDS義務</th>
                    <th className="px-3 py-2 text-center font-semibold text-slate-700">詳細</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMhlw.slice(0, 100).map((c, i) => {
                    const tags = c.details?.limits?.regulationTags;
                    const isPriority = c.cas && CONSTRUCTION_PRIORITY_CAS_SET.has(c.cas);
                    return (
                      <tr
                        key={c.cas ?? `${c.primaryName}-${i}`}
                        className="hover:bg-slate-50"
                      >
                        <td className="px-3 py-2 font-mono text-slate-400 align-top">{c.cas ?? "—"}</td>
                        <td className="px-3 py-2 align-top">
                          <div className="flex flex-col gap-1">
                            <span className="font-medium text-slate-800 flex items-center gap-1.5 flex-wrap">
                              {c.primaryName}
                              {isPriority && (
                                <span className="rounded-full bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0 text-[10px]">
                                  建設業頻出
                                </span>
                              )}
                            </span>
                            {tags && tags.length > 0 && (
                              <RegulationTagBadgeList
                                tags={tags}
                                maxVisible={4}
                                size="xs"
                                onTagClick={(t) => toggleTag(t)}
                              />
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center text-red-600 align-top">{c.flags.carcinogenic ? "●" : ""}</td>
                        <td className="px-3 py-2 text-center text-amber-600 align-top">{c.flags.skin ? "●" : ""}</td>
                        <td className="px-3 py-2 text-center text-blue-600 align-top">{c.flags.concentration ? "●" : ""}</td>
                        <td className="px-3 py-2 text-center text-emerald-600 align-top">{c.flags.label_sds ? "●" : ""}</td>
                        <td className="px-3 py-2 text-center align-top">
                          {c.cas ? (
                            <Link
                              href={`/chemical-database/${encodeURIComponent(c.cas)}`}
                              className="inline-flex items-center gap-0.5 text-emerald-700 hover:text-emerald-900 underline text-[11px]"
                            >
                              開く
                            </Link>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredMhlw.length > 100 && (
                <p className="px-4 py-3 text-center text-xs text-slate-400">
                  さらに {(filteredMhlw.length - 100).toLocaleString()} 件 — キーワードを入力して絞り込んでください
                </p>
              )}
            </div>
          )}
        </section>
      )}

      {mode === "curated" && (<>

      <section aria-labelledby="search-heading" className="mb-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 id="search-heading" className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800">
          <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
          検索 / 絞り込み
        </h2>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <label className="relative block">
            <span className="sr-only">物質名・CAS番号で検索</span>
            <input
              type="search"
              inputMode="search"
              placeholder="例: ベンゼン / 71-43-2 / 金属脱脂"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="min-h-[48px] w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ChemicalCategory | "")}
            className="min-h-[48px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
            aria-label="規制区分で絞り込み"
          >
            <option value="">全ての規制区分</option>
            {CATEGORY_FILTERS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <label className="inline-flex min-h-[48px] items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={skinOnly}
              onChange={(e) => setSkinOnly(e.target.checked)}
              className="h-4 w-4 rounded border-slate-400 text-emerald-600 focus:ring-emerald-500"
            />
            皮膚等障害のみ
          </label>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          該当 {filtered.length} 件 / 全 {chemicalSubstances.length} 件
        </p>
      </section>

      <section aria-labelledby="results-heading">
        <h2 id="results-heading" className="sr-only">
          検索結果
        </h2>
        {filtered.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
            該当する物質が見つかりませんでした。別の語句や区分でお試しください。
          </p>
        ) : (
          <ul className="space-y-3">
            {filtered.map((s) => (
              <li
                key={s.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900">
                        {s.name}
                      </h3>
                      {s.name_en && (
                        <span className="text-xs text-slate-500">
                          {s.name_en}
                        </span>
                      )}
                      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">
                        CAS {s.cas}
                      </span>
                      {s.skin_hazard && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-800">
                          <Hand className="h-3 w-3" aria-hidden="true" />
                          皮膚等障害
                        </span>
                      )}
                    </div>

                    {s.synonyms && s.synonyms.length > 0 && (
                      <p className="mt-1 text-xs text-slate-500">
                        別名: {s.synonyms.join(" / ")}
                      </p>
                    )}

                    <div className="mt-2 flex flex-wrap gap-1">
                      {s.categories.map((c) => (
                        <span
                          key={c}
                          className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-800"
                          title={chemicalCategoryInfo[c]}
                        >
                          {c}
                        </span>
                      ))}
                    </div>

                    <dl className="mt-3 grid gap-2 text-xs text-slate-700 sm:grid-cols-2">
                      {s.oel && (
                        <div>
                          <dt className="font-semibold text-slate-500">管理濃度/OEL</dt>
                          <dd>{s.oel}</dd>
                        </div>
                      )}
                      <div>
                        <dt className="font-semibold text-slate-500">主な用途</dt>
                        <dd>{s.uses}</dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="flex items-center gap-1 font-semibold text-slate-500">
                          <AlertTriangle className="h-3.5 w-3.5 text-rose-500" aria-hidden="true" />
                          主な健康影響
                        </dt>
                        <dd>{s.health_effects}</dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="flex items-center gap-1 font-semibold text-slate-500">
                          <ShieldAlert className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
                          関連法令
                        </dt>
                        <dd>{s.related_laws.join(" / ")}</dd>
                      </div>
                      {s.ghs && s.ghs.length > 0 && (
                        <div className="sm:col-span-2">
                          <dt className="font-semibold text-slate-500">GHS分類（主要）</dt>
                          <dd>{s.ghs.join(" / ")}</dd>
                        </div>
                      )}
                    </dl>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link
                        href={
                          s.cas
                            ? `/chemical-ra?cas=${encodeURIComponent(s.cas)}`
                            : `/chemical-ra?name=${encodeURIComponent(s.name)}`
                        }
                        className="inline-flex min-h-[44px] items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-emerald-700"
                      >
                        <ClipboardCheck className="h-3.5 w-3.5" aria-hidden="true" />
                        この物質のリスクアセスメントを実施
                      </Link>
                      {s.sds_url && (
                        <a
                          href={s.sds_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-[44px] items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                          厚労省SDS情報を見る
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      </>)}

      {/* この場面で必要な保護具: 化学物質 → 防塵防毒マスク・保護メガネ・保護手袋・保護衣 */}
      <ContextualPpePicks
        context="化学物質 有機溶剤 特化則 防塵 防毒 マスク 保護メガネ 保護手袋"
        fallbackCategoryIds={["respiratory", "eye-ear-protection", "hand-foot"]}
        heading="🛡 化学物質作業で必要な保護具"
        description="呼吸用保護具・保護メガネ・耐薬品手袋など、SDS の指示に沿って選定するための候補。"
      />

      <aside className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <p className="flex items-center gap-2 font-semibold">
          <Info className="h-4 w-4 text-slate-500" aria-hidden="true" />
          関連ページ
        </p>
        <ul className="mt-2 flex flex-wrap gap-3 text-xs">
          <li>
            <Link
              href="/chemical-ra"
              className="inline-flex min-h-[44px] items-center rounded-md border border-emerald-300 bg-white px-3 py-1.5 font-semibold text-emerald-700 hover:bg-emerald-50"
            >
              化学物質リスクアセスメント
            </Link>
          </li>
          <li>
            <Link
              href="/circulars"
              className="inline-flex min-h-[44px] items-center rounded-md border border-emerald-300 bg-white px-3 py-1.5 font-semibold text-emerald-700 hover:bg-emerald-50"
            >
              通達・判例
            </Link>
          </li>
          <li>
            <Link
              href="/glossary"
              className="inline-flex min-h-[44px] items-center rounded-md border border-emerald-300 bg-white px-3 py-1.5 font-semibold text-emerald-700 hover:bg-emerald-50"
            >
              安全用語辞書
            </Link>
          </li>
        </ul>
      </aside>
    </PageContainer>
  );
}
