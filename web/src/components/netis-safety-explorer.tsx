"use client";

import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";
import { ExternalLink, RotateCcw, ShieldCheck } from "lucide-react";
import {
  FEATURED_NETIS_TECHNOLOGIES,
  isNetisSafetyCategoryId,
  NETIS_CHECKED_AT,
  NETIS_RELEASE_URL,
  NETIS_SAFETY_CATEGORIES,
  NETIS_SEARCH_URL,
  netisDetailUrl,
  type NetisSafetyCategoryId,
} from "./netis-safety-data";

function categoryFor(id: NetisSafetyCategoryId) {
  return NETIS_SAFETY_CATEGORIES.find((category) => category.id === id)!;
}

function focusResults(heading: HTMLHeadingElement | null) {
  heading?.focus({ preventScroll: true });
  heading?.scrollIntoView({
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "instant"
      : "smooth",
    block: "start",
  });
}

export function NetisSafetyExplorer() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawCategory = searchParams.get("risk");
  const selectedCategoryId = isNetisSafetyCategoryId(rawCategory)
    ? rawCategory
    : null;
  const selectedCategory = selectedCategoryId
    ? categoryFor(selectedCategoryId)
    : null;
  const resultsHeadingRef = useRef<HTMLHeadingElement>(null);
  const shouldFocusResultsRef = useRef(false);
  const explorerRef = useRef<HTMLElement>(null);

  const technologies = useMemo(
    () =>
      selectedCategoryId
        ? FEATURED_NETIS_TECHNOLOGIES.filter((technology) =>
            (technology.categoryIds as readonly string[]).includes(
              selectedCategoryId,
            ),
          )
        : FEATURED_NETIS_TECHNOLOGIES,
    [selectedCategoryId],
  );

  useEffect(() => {
    explorerRef.current?.setAttribute("data-netis-explorer-ready", "true");
  }, []);

  useEffect(() => {
    if (!shouldFocusResultsRef.current) return;
    shouldFocusResultsRef.current = false;
    focusResults(resultsHeadingRef.current);
  }, [selectedCategoryId]);

  function updateCategory(categoryId: NetisSafetyCategoryId | null) {
    if (categoryId === selectedCategoryId) {
      focusResults(resultsHeadingRef.current);
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    if (categoryId) params.set("risk", categoryId);
    else params.delete("risk");
    const query = params.toString();
    shouldFocusResultsRef.current = true;
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <section
      ref={explorerRef}
      aria-labelledby="netis-category-title"
      className="py-1"
      data-netis-explorer-ready="false"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black tracking-[.14em] text-sky-800 dark:text-sky-300">
            危険から1クリックで絞り込み
          </p>
          <h2
            id="netis-category-title"
            className="mt-1 text-xl font-black tracking-tight text-slate-950 sm:text-2xl dark:text-white"
          >
            現場の課題を画像で選ぶ
          </h2>
        </div>
        <a
          href={NETIS_SEARCH_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-sky-700 bg-white px-4 text-sm font-black text-sky-900 hover:bg-sky-50 dark:bg-slate-900 dark:text-sky-200"
        >
          NETIS公式検索
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>

      <div
        className="mt-3 grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4"
        role="group"
        aria-label="安全課題カテゴリ"
      >
        {NETIS_SAFETY_CATEGORIES.map((category) => {
          const selected = selectedCategoryId === category.id;
          return (
            <button
              key={category.id}
              type="button"
              aria-label={category.label}
              aria-pressed={selected}
              aria-controls="netis-technology-results"
              onClick={() => updateCategory(category.id)}
              className={`group min-h-44 overflow-hidden rounded-2xl border-2 bg-white text-left shadow-sm transition focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-sky-600 sm:min-h-56 dark:bg-slate-900 ${
                selected
                  ? "border-sky-700 ring-2 ring-sky-200 dark:border-sky-300"
                  : "border-slate-200 hover:border-sky-500 dark:border-slate-700"
              }`}
            >
              <span className="relative block h-24 overflow-hidden bg-slate-100 sm:h-36 dark:bg-slate-800">
                <Image
                  src={category.image}
                  alt={category.imageAlt}
                  fill
                  loading="eager"
                  sizes="(max-width: 1024px) 46vw, 280px"
                  className={`transition duration-300 group-hover:scale-[1.03] ${category.id === "heat-environment" ? "object-cover object-top" : "object-contain"}`}
                />
              </span>
              <span className="flex min-h-16 items-center justify-between gap-2 px-3 py-2.5 sm:px-4">
                <span className="text-sm font-black leading-5 text-slate-950 sm:text-lg dark:text-white">
                  {category.label}
                </span>
                <span
                  aria-hidden="true"
                  className={`h-3 w-3 shrink-0 rounded-full border-2 ${
                    selected
                      ? "border-sky-700 bg-sky-700"
                      : "border-slate-400 bg-white dark:bg-slate-900"
                  }`}
                />
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
        カテゴリ画像は危険の図解です。製品写真ではありません。
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
        当サイトで出典を確認した{FEATURED_NETIS_TECHNOLOGIES.length}件を掲載しています。NETIS全登録技術の一覧ではありません。
      </p>

      <div
        id="netis-technology-results"
        className="mt-7 scroll-mt-24"
        aria-labelledby="netis-results-title"
      >
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-3 dark:border-slate-800">
          <div>
            <p className="text-xs font-black text-emerald-800 dark:text-emerald-300">
              {selectedCategory ? "選択中" : "出典確認済み技術"} ・ {NETIS_CHECKED_AT}
            </p>
            <h3
              ref={resultsHeadingRef}
              id="netis-results-title"
              tabIndex={-1}
              className="mt-1 text-xl font-black text-slate-950 outline-none dark:text-white"
            >
              {selectedCategory
                ? `${selectedCategory.label}：${technologies.length}件`
                : `当サイト掲載：${technologies.length}件`}
            </h3>
          </div>
          {selectedCategory ? (
            <div className="flex flex-wrap gap-2">
              <a
                href="#netis-category-title"
                className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-3 text-sm font-black text-slate-800 dark:border-slate-700 dark:text-slate-100"
              >
                カテゴリを変更
              </a>
              <button
                type="button"
                onClick={() => updateCategory(null)}
                className="inline-flex min-h-11 items-center gap-1 rounded-xl bg-slate-900 px-3 text-sm font-black text-white dark:bg-white dark:text-slate-950"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                掲載全{FEATURED_NETIS_TECHNOLOGIES.length}件を見る
              </button>
            </div>
          ) : null}
        </div>

        <p className="sr-only" role="status" aria-live="polite">
          {selectedCategory
            ? `${selectedCategory.label}の対応技術を${technologies.length}件表示しました。`
            : `当サイト掲載技術を${technologies.length}件表示しています。`}
        </p>

        {technologies.length > 0 ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {technologies.map((technology) => {
              const primaryCategory = categoryFor(technology.categoryIds[0]);
              return (
                <article
                  key={technology.registrationNumber}
                  className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm dark:border-emerald-900 dark:bg-slate-900"
                >
                  <div>
                    <div className="p-4 sm:p-5">
                      <div className="flex flex-wrap items-center gap-2">
                        {technology.categoryIds.map((categoryId) => (
                          <span
                            key={categoryId}
                            className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-black text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
                          >
                            {categoryFor(categoryId).label}
                          </span>
                        ))}
                        <span className="font-mono text-xs font-black text-sky-800 dark:text-sky-300">
                          {technology.registrationNumber}
                        </span>
                      </div>
                      <h4 className="mt-3 text-base font-black leading-6 text-slate-950 dark:text-white">
                        {technology.name}
                      </h4>
                      <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
                        {technology.summary}
                      </p>
                    </div>
                  </div>

                  <details className="border-t border-slate-200 px-4 py-2 open:pb-4 dark:border-slate-800 sm:px-5">
                    <summary className="flex min-h-11 cursor-pointer items-center font-black text-sky-900 underline decoration-sky-300 underline-offset-4 dark:text-sky-200">
                      仕組み・適用条件を詳しく見る
                    </summary>
                    <dl className="mt-2 space-y-3 text-sm leading-6">
                      <div>
                        <dt className="font-black text-slate-950 dark:text-white">仕組み</dt>
                        <dd className="text-slate-700 dark:text-slate-200">{technology.mechanism}</dd>
                      </div>
                      <div>
                        <dt className="font-black text-slate-950 dark:text-white">向いている現場</dt>
                        <dd className="text-slate-700 dark:text-slate-200">{technology.useCase}</dd>
                      </div>
                      <div>
                        <dt className="font-black text-slate-950 dark:text-white">比較前に確認</dt>
                        <dd className="text-slate-700 dark:text-slate-200">{primaryCategory.checks}</dd>
                      </div>
                    </dl>
                    <div className="mt-3 flex flex-wrap gap-3 text-xs font-black">
                      <a
                        href={netisDetailUrl(technology.registrationNumber)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-11 items-center gap-1 text-sky-900 underline underline-offset-4 dark:text-sky-200"
                      >
                        NETIS公式で照合
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                      <a
                        href={technology.productUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-11 items-center gap-1 text-emerald-900 underline underline-offset-4 dark:text-emerald-200"
                      >
                        提供元の技術情報
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                    </div>
                  </details>
                </article>
              );
            })}
          </div>
        ) : selectedCategory ? (
          <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-950/30">
            <h4 className="font-black text-slate-950 dark:text-white">
              このカテゴリの当サイト掲載技術は0件です
            </h4>
            <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
              無関係な技術は表示していません。公式検索へ「{selectedCategory.searchTerms}」を入力し、登録状態と適用条件を確認してください。
            </p>
            <a
              href={NETIS_SEARCH_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-sky-800 px-4 text-sm font-black text-white hover:bg-sky-900"
            >
              NETIS公式検索を開く
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        ) : null}

        <div className="mt-5 space-y-2 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
          <p>
            登録番号の末尾、掲載期間、評価情報、販売・レンタル条件は更新されます。導入前にNETIS公式と提供元の最新情報を照合してください。
          </p>
          <p className="flex items-start gap-1.5">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-300" aria-hidden="true" />
            NETIS掲載は現場適合・安全性の自動保証ではなく、法令上必要な措置を置き換えるものでもありません。
          </p>
          <a
            href={NETIS_RELEASE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-1 font-black text-sky-900 underline underline-offset-4 dark:text-sky-200"
          >
            国交省のAI検索機能発表
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}
