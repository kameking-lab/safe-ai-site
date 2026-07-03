"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Scale, Search, ExternalLink, Printer } from "lucide-react";
import {
  COURT_CASES,
  COURT_CASE_ISSUES,
  COURT_CASE_FIELDS,
  type CourtCaseIssue,
  type CourtCaseField,
} from "@/data/court-cases";
import {
  filterCourtCases,
  computeFacets,
  courtFilterToQuery,
  type CourtType,
} from "@/lib/court-cases/search";
import { FIELD_ICON } from "@/lib/court-cases/case-visual";
import { ISSUE_COLOR } from "@/lib/court-cases/issue-color";
import { CollapsibleDetail } from "@/components/ui/collapsible-detail";

// フェーズB: 数百件規模に備え、検索ロジックは lib/court-cases/search.ts の純関数に集約。
// 裁判所種別・年代は既存データから導出するためデータ移行不要。
const FACETS = computeFacets(COURT_CASES);

// 柱C-6: モバイル全高が約26,000pxまで伸びていたため、初期表示を絞り「もっと見る」で追加読込。
// 88件全件を一度に描画しない＝初訪ユーザーがスクロール地獄に陥らない。
const PAGE_SIZE = 24;

export function CourtCasesBrowser() {
  // 事故事例など他機能からの ?field= / ?issue= / ?q= ディープリンクで初期フィルタを反映。
  // 不正値は無視（未選択扱い）。フィルタ済みビューを共有・ブックマークできるようにもなる。
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialField = ((): CourtCaseField | "" => {
    const f = searchParams?.get("field") ?? "";
    return (COURT_CASE_FIELDS as readonly string[]).includes(f) ? (f as CourtCaseField) : "";
  })();
  const initialIssue = ((): CourtCaseIssue | "" => {
    const i = searchParams?.get("issue") ?? "";
    return (COURT_CASE_ISSUES as readonly string[]).includes(i) ? (i as CourtCaseIssue) : "";
  })();
  const initialQ = searchParams?.get("q") ?? "";
  const courtTypeValues = FACETS.courtTypes.map((c) => c.value);
  const decadeValues = FACETS.decades.map((d) => d.value);
  const initialCourtType = ((): CourtType | "" => {
    const ct = searchParams?.get("court") ?? "";
    return (courtTypeValues as string[]).includes(ct) ? (ct as CourtType) : "";
  })();
  const initialDecade = ((): string => {
    const d = searchParams?.get("decade") ?? "";
    return decadeValues.includes(d) ? d : "";
  })();

  const [issue, setIssue] = useState<CourtCaseIssue | "">(initialIssue);
  const [field, setField] = useState<CourtCaseField | "">(initialField);
  const [courtType, setCourtType] = useState<CourtType | "">(initialCourtType);
  const [decade, setDecade] = useState<string>(initialDecade);
  const [q, setQ] = useState(initialQ);

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filtered = useMemo(
    () => filterCourtCases(COURT_CASES, { issue, field, courtType, decade, query: q }),
    [issue, field, courtType, decade, q],
  );
  const hasFilter = !!(issue || field || courtType || decade || q);

  // 絞り込み条件が変わったら先頭から表示し直す（前回の「もっと見る」展開を引きずらない）。
  // React 推奨の「レンダー中に派生状態を調整」パターン（useEffect+setState の連鎖レンダーを避ける）。
  const filterKey = `${issue}|${field}|${courtType}|${decade}|${q}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setVisibleCount(PAGE_SIZE);
  }

  const visible = filtered.slice(0, visibleCount);
  const remaining = filtered.length - visible.length;

  // 絞り込みをURLに書き戻す（共有・ブラウザ戻る対応／印刷ページへ条件を引き継ぐため）。
  // 既存の accidents hub-filter と同じ作法: scroll:false・テキストはデバウンス。
  const query = useMemo(
    () => courtFilterToQuery({ issue, field, courtType, decade, query: q }),
    [issue, field, courtType, decade, q],
  );
  useEffect(() => {
    const handle = window.setTimeout(() => {
      router.replace(query ? `/court-cases?${query}` : "/court-cases", { scroll: false });
    }, 250);
    return () => window.clearTimeout(handle);
  }, [query, router]);

  const printHref = query ? `/court-cases/print?${query}` : "/court-cases/print";

  const clearAll = useCallback(() => {
    setIssue("");
    setField("");
    setCourtType("");
    setDecade("");
    setQ("");
  }, []);

  return (
    <div className="space-y-4">
      {/* 柱0: 分野アイコングリッド＝読まずに自分の分野へ（タップで絞り込み・再タップで解除） */}
      <section aria-label="分野から探す" data-testid="court-field-grid">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">分野から探す</h2>
        <div className="mt-2 grid grid-cols-3 gap-1.5 lg:grid-cols-9">
          {FACETS.fields.map(({ value, count }) => {
            const Icon = FIELD_ICON[value];
            const isActive = field === value;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={isActive}
                onClick={() => setField(isActive ? "" : value)}
                className={`flex min-h-[44px] flex-col items-center gap-1 rounded-xl border p-2 text-center shadow-sm transition ${
                  isActive
                    ? "border-emerald-500 bg-emerald-50 dark:border-emerald-400 dark:bg-emerald-500/10"
                    : "border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/40 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-emerald-500/40"
                }`}
              >
                <Icon className="h-6 w-6 text-emerald-700 dark:text-emerald-300" aria-hidden="true" />
                <span className="text-[11px] font-bold leading-tight text-slate-800 dark:text-slate-200">{value}</span>
                <span className="text-lg font-bold leading-none text-slate-900 dark:text-slate-100">
                  {count}
                  <span className="ml-0.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400">件</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* フィルタ */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block flex-1">
            <span className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">キーワード（事件名・内容）</span>
            <span className="flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
              <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="例: 安全配慮義務、墜落、過労、石綿"
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                aria-label="判例をキーワードで絞り込む"
              />
            </span>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">争点</span>
            <select
              value={issue}
              onChange={(e) => setIssue(e.target.value as CourtCaseIssue | "")}
              className="min-h-[44px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 sm:w-48"
            >
              <option value="">すべての争点</option>
              {COURT_CASE_ISSUES.map((i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">分野</span>
            <select
              value={field}
              onChange={(e) => setField(e.target.value as CourtCaseField | "")}
              className="min-h-[44px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 sm:w-44"
            >
              <option value="">すべての分野</option>
              {COURT_CASE_FIELDS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">裁判所</span>
            <select
              value={courtType}
              onChange={(e) => setCourtType(e.target.value as CourtType | "")}
              className="min-h-[44px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 sm:w-36"
            >
              <option value="">すべての裁判所</option>
              {FACETS.courtTypes.map((c) => (
                <option key={c.value} value={c.value}>{c.value}（{c.count}）</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">年代</span>
            <select
              value={decade}
              onChange={(e) => setDecade(e.target.value)}
              className="min-h-[44px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 sm:w-32"
            >
              <option value="">すべての年代</option>
              {FACETS.decades.map((d) => (
                <option key={d.value} value={d.value}>{d.value}（{d.count}）</option>
              ))}
            </select>
          </label>
        </div>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          {filtered.length} 件中 {visible.length} 件を表示（全 {COURT_CASES.length} 件・すべて実在する確定判例）
          {hasFilter && (
            <button
              type="button"
              onClick={clearAll}
              className="ml-2 inline-flex min-h-[44px] items-center font-semibold text-emerald-700 hover:underline dark:text-emerald-300"
            >
              絞り込みを解除
            </button>
          )}
        </p>
        {/* 顧問先説明: 絞り込んだ結果だけをA4にまとめて配れる導線（条件を印刷ページへ引き継ぐ） */}
        {hasFilter && filtered.length > 0 && (
          <Link
            href={printHref}
            className="mt-2 inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200"
          >
            <Printer className="h-3.5 w-3.5" aria-hidden="true" />
            この {filtered.length} 件だけをA4で印刷／PDF保存（実務ポイント付き）
          </Link>
        )}
      </div>

      {/* 一覧 */}
      <ul className="space-y-3">
        {visible.map((c) => (
          <li key={c.id}>
            <Link
              href={`/court-cases/${c.id}`}
              className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-emerald-300 hover:bg-emerald-50/40 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-emerald-500/40 dark:hover:bg-emerald-500/5"
            >
              <div className="flex flex-wrap items-center gap-2">
                {c.issues.map((i) => (
                  <span key={i} className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${ISSUE_COLOR[i]}`}>{i}</span>
                ))}
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{c.field}</span>
              </div>
              <h2 className="mt-2 flex items-start gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
                <Scale className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                {c.name}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {c.court}　{c.dateLabelJa}（{c.date.replace(/-/g, "/")}）{c.citation ? `　${c.citation}` : ""}
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">{c.oneLine}</p>
            </Link>
          </li>
        ))}
      </ul>

      {/* 柱C-6: 残りを追加表示。44px以上のフル幅ボタンで指でも押しやすく。 */}
      {remaining > 0 && (
        <button
          type="button"
          data-testid="court-load-more"
          onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
          className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 text-sm font-bold text-emerald-800 shadow-sm transition hover:bg-emerald-100 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200 dark:hover:bg-emerald-500/15"
        >
          もっと見る（残り {remaining} 件）
        </button>
      )}

      {filtered.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/50">
          条件に合う判例がありません。絞り込みを解除してください。
        </p>
      )}

      {/* 出典・免責（文字ダイエット: 詳細層へ・内容は不変） */}
      <CollapsibleDetail
        summary={
          <span className="inline-flex items-center gap-1">
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /> 出典・ご利用にあたって
          </span>
        }
      >
        <p>
          各判例の要旨は、裁判所「裁判例検索」・厚生労働省・法務省・判例集等の公表情報をもとにした
          <strong className="font-semibold">当サイトによる要約</strong>です。正確な内容は各判例の出典（判決原文）をご確認ください。
          事件名は実務・学術で定着した通称を用い、当事者の特定情報は掲載していません。
          掲載は実在を確認できた確定判例に限っています。
        </p>
        <p className="mt-1">
          本コーナーは一般的な情報提供であり、個別の事案に対する法的助言ではありません。
          具体的な対応は、弁護士・社会保険労務士・労働安全/衛生コンサルタント等の専門家にご相談ください。
        </p>
      </CollapsibleDetail>
    </div>
  );
}
