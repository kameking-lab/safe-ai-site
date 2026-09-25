"use client";

import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, ImageOff, RotateCcw, Search, ShieldCheck, X } from "lucide-react";
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
import {
  NETIS_EFFICIENCY_CATEGORIES,
  NETIS_EFFICIENCY_TECHNOLOGIES,
  isNetisEfficiencyCategoryId,
  type NetisEfficiencyCategoryId,
} from "./netis-efficiency-data";

type CategoryId = NetisSafetyCategoryId | NetisEfficiencyCategoryId;
type Purpose = "safety" | "efficiency" | "all";
const ALL_TECHNOLOGIES = [...FEATURED_NETIS_TECHNOLOGIES, ...NETIS_EFFICIENCY_TECHNOLOGIES];

function categoryFor(id: CategoryId) {
  return [...NETIS_SAFETY_CATEGORIES, ...NETIS_EFFICIENCY_CATEGORIES].find(
    (category) => category.id === id,
  )!;
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

// 同じタブでNETIS公式詳細へ移動し、戻るで絞り込み（URL）とスクロール位置・フォーカスを復元する
const RETURN_POSITION_KEY = "netis-safety-return-position";

function rememberReturnPosition(registrationNumber: string) {
  try {
    window.sessionStorage.setItem(
      RETURN_POSITION_KEY,
      JSON.stringify({
        href: `${window.location.pathname}${window.location.search}`,
        scrollY: window.scrollY,
        registrationNumber,
      }),
    );
  } catch {
    // ストレージ不可（プライベートモード等）でも遷移自体は妨げない
  }
}

function restoreReturnPosition() {
  try {
    const raw = window.sessionStorage.getItem(RETURN_POSITION_KEY);
    if (!raw) return;
    window.sessionStorage.removeItem(RETURN_POSITION_KEY);
    const saved = JSON.parse(raw) as {
      href?: unknown;
      scrollY?: unknown;
      registrationNumber?: unknown;
    };
    if (saved.href !== `${window.location.pathname}${window.location.search}`) return;
    if (typeof saved.scrollY === "number") {
      window.scrollTo({ top: saved.scrollY, behavior: "instant" });
    }
    if (typeof saved.registrationNumber === "string") {
      document
        .getElementById(`netis-tech-${saved.registrationNumber}`)
        ?.focus({ preventScroll: true });
    }
  } catch {
    // 破損した値は無視する
  }
}

function normalizeSearchText(value: string) {
  return value.normalize("NFKC").trim().toLocaleLowerCase("ja");
}

export function NetisSafetyExplorer() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawCategory = searchParams.get("risk");
  const rawSearch = searchParams.get("q")?.trim() ?? "";
  const rawPurpose = searchParams.get("purpose");
  const purpose: Purpose = rawPurpose === "efficiency" || rawPurpose === "all" ? rawPurpose : isNetisEfficiencyCategoryId(rawCategory) ? "efficiency" : "safety";
  const selectedCategoryId: CategoryId | null = isNetisSafetyCategoryId(rawCategory) || isNetisEfficiencyCategoryId(rawCategory)
    ? rawCategory
    : null;
  const selectedCategory = selectedCategoryId
    ? categoryFor(selectedCategoryId)
    : null;
  const resultsHeadingRef = useRef<HTMLHeadingElement>(null);
  const shouldFocusResultsRef = useRef(false);
  const explorerRef = useRef<HTMLElement>(null);
  const [searchInput, setSearchInput] = useState(rawSearch);

  const technologies = useMemo(
    () =>
      ALL_TECHNOLOGIES.filter((technology) => {
        const isEfficiency = "officialSourceUrl" in technology;
        if (purpose === "safety" && isEfficiency) return false;
        if (purpose === "efficiency" && !isEfficiency) return false;
        const categoryMatches = selectedCategoryId
          ? (technology.categoryIds as readonly string[]).includes(
              selectedCategoryId,
            )
          : true;
        if (!categoryMatches) return false;
        const query = normalizeSearchText(rawSearch);
        if (!query) return true;
        return normalizeSearchText(
          [
            technology.name,
            technology.registrationNumber,
            "sourceRegistrationNumber" in technology ? technology.sourceRegistrationNumber : "",
            technology.summary,
            technology.mechanism,
            technology.useCase,
            technology.limitations,
          ].join(" "),
        ).includes(query);
      }),
    [purpose, rawSearch, selectedCategoryId],
  );

  useEffect(() => {
    restoreReturnPosition();
    // bfcacheから戻った場合もスクロール位置の記録を消費する
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) restoreReturnPosition();
    };
    window.addEventListener("pageshow", onPageShow);
    explorerRef.current?.setAttribute("data-netis-explorer-ready", "true");
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  useEffect(() => {
    setSearchInput(rawSearch);
  }, [rawSearch]);

  useEffect(() => {
    if (!shouldFocusResultsRef.current) return;
    shouldFocusResultsRef.current = false;
    focusResults(resultsHeadingRef.current);
  }, [purpose, rawSearch, selectedCategoryId]);

  function updateCategory(categoryId: CategoryId | null) {
    if (categoryId === selectedCategoryId) {
      focusResults(resultsHeadingRef.current);
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    if (categoryId) {
      params.set("risk", categoryId);
      if (isNetisEfficiencyCategoryId(categoryId)) params.set("purpose", "efficiency");
      else params.delete("purpose");
    }
    else {
      params.delete("risk");
      params.delete("q");
    }
    const query = params.toString();
    shouldFocusResultsRef.current = true;
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function updatePurpose(nextPurpose: Purpose) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextPurpose === "safety") params.delete("purpose");
    else params.set("purpose", nextPurpose);
    params.delete("risk");
    shouldFocusResultsRef.current = true;
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function updateSearch(value: string) {
    const queryValue = value.trim();
    if (queryValue === rawSearch) {
      focusResults(resultsHeadingRef.current);
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    if (queryValue) params.set("q", queryValue);
    else params.delete("q");
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
            現場の目的から1クリックで絞り込み
          </p>
          <h2
            id="netis-category-title"
            className="mt-1 text-xl font-black tracking-tight text-slate-950 sm:text-2xl dark:text-white"
          >
            現場の安全・省力化技術を探す
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

      <div className="mt-3 grid grid-cols-3 gap-2" role="group" aria-label="探す目的">
        {([
          ["safety", "安全を高める"],
          ["efficiency", "作業を効率化"],
          ["all", "すべて"],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={purpose === id}
            onClick={() => updatePurpose(id)}
            className={`min-h-11 rounded-xl border px-2 py-2 text-xs font-black sm:text-sm ${purpose === id ? "border-sky-800 bg-sky-800 text-white" : "border-slate-300 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div
        className="mt-3 grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4"
        role="group"
        aria-label={purpose === "safety" ? "安全課題カテゴリ" : "技術カテゴリ"}
      >
        {(purpose === "efficiency" ? NETIS_EFFICIENCY_CATEGORIES : purpose === "all" ? [...NETIS_SAFETY_CATEGORIES, ...NETIS_EFFICIENCY_CATEGORIES] : NETIS_SAFETY_CATEGORIES).map((category) => {
          const selected = selectedCategoryId === category.id;
          const visualCategory = "image" in category ? category : null;
          return (
            <button
              key={category.id}
              type="button"
              aria-label={category.label}
              aria-pressed={selected}
              aria-controls="netis-technology-results"
              onClick={() => updateCategory(category.id)}
              className={`group overflow-hidden rounded-2xl border-2 bg-white text-left shadow-sm transition focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-sky-600 dark:bg-slate-900 ${visualCategory ? "min-h-44 sm:min-h-56" : "min-h-24"} ${
                selected
                  ? "border-sky-700 ring-2 ring-sky-200 dark:border-sky-300"
                  : "border-slate-200 hover:border-sky-500 dark:border-slate-700"
              }`}
            >
              {visualCategory ? (
                <span className="relative block h-24 overflow-hidden bg-slate-100 sm:h-36 dark:bg-slate-800">
                  <Image
                    src={visualCategory.image}
                    alt={visualCategory.imageAlt}
                    fill
                    loading="eager"
                    sizes="(max-width: 1024px) 46vw, 280px"
                    className="object-cover transition duration-300 group-hover:scale-[1.03]"
                  />
                </span>
              ) : null}
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
              {visualCategory && isNetisEfficiencyCategoryId(category.id) ? (
                <span className="block px-3 pb-3 text-xs leading-5 text-slate-600 dark:text-slate-300">{category.description}</span>
              ) : null}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
        カテゴリ写真は作業場面・機材の代表例（実写）です。NETIS掲載製品の写真ではありません。
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
        当サイトで出典を確認した{FEATURED_NETIS_TECHNOLOGIES.length}件を掲載しています。NETIS全登録技術の一覧ではありません。
      </p>
      <p className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-200">
        効率化の追加{NETIS_EFFICIENCY_TECHNOLOGIES.length}件のうち5件は国交省の2026年4月一覧、1件は過去の地方整備局資料で確認した参考技術です。2026年9月時点の現行NETIS登録は未確認です。
      </p>
      <details className="mt-1 text-xs text-slate-600 dark:text-slate-300">
        <summary className="flex min-h-11 cursor-pointer items-center font-bold underline underline-offset-4">
          写真の出典・ライセンスを確認
        </summary>
        <ul className="space-y-1.5 pb-2 leading-5">
          {[...NETIS_SAFETY_CATEGORIES, ...NETIS_EFFICIENCY_CATEGORIES].map((category) => (
            <li key={category.id} className="break-words">
              <span className="font-black">{category.label}</span>：
              <a
                href={category.imageCredit.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 min-w-11 items-center underline underline-offset-2"
              >
                {category.imageCredit.title}
              </a>
              ／{category.imageCredit.author}／
              {category.imageCredit.licenseUrl ? (
                <a
                  href={category.imageCredit.licenseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 min-w-11 items-center underline underline-offset-2"
                >
                  {category.imageCredit.license}
                </a>
              ) : (
                category.imageCredit.license
              )}
              ／Wikimedia Commonsより{category.imageCredit.retrievedAt}取得、{ "changeNote" in category.imageCredit ? category.imageCredit.changeNote : "縮小・WebP変換" }
            </li>
          ))}
        </ul>
      </details>

      <form
        role="search"
        aria-label="当サイト掲載NETIS技術を検索"
        className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900"
        onSubmit={(event) => {
          event.preventDefault();
          updateSearch(searchInput);
        }}
      >
        <label
          htmlFor="netis-catalog-search"
          className="text-sm font-black text-slate-950 dark:text-white"
        >
          名称・登録番号・用途で掲載技術を検索
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            id="netis-catalog-search"
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="例：WBGT、ハーネス、KK-210002"
            className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
          <button
            type="submit"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-sky-800 px-4 text-sm font-black text-white hover:bg-sky-900"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            掲載技術を検索
          </button>
          {rawSearch ? (
            <button
              type="button"
              onClick={() => {
                setSearchInput("");
                updateSearch("");
              }}
              className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl border border-slate-300 bg-white px-3 text-sm font-black text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              <X className="h-4 w-4" aria-hidden="true" />
              検索を解除
            </button>
          ) : null}
        </div>
      </form>

      <div
        id="netis-technology-results"
        className="mt-7 scroll-mt-24"
        aria-labelledby="netis-results-title"
      >
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-3 dark:border-slate-800">
          <div>
            <p className="text-xs font-black text-emerald-800 dark:text-emerald-300">
              {selectedCategory ? "選択中" : "掲載技術"} ・ {purpose === "safety" ? NETIS_CHECKED_AT : "効率化候補の現行NETIS掲載は未照合"}
            </p>
            <h3
              ref={resultsHeadingRef}
              id="netis-results-title"
              tabIndex={-1}
              className="mt-1 text-xl font-black text-slate-950 outline-none dark:text-white"
            >
              {selectedCategory
                ? `${selectedCategory.label}：${technologies.length}件`
                : `${purpose === "safety" ? "当サイト掲載" : purpose === "efficiency" ? "作業効率化候補" : "安全・効率化候補"}：${technologies.length}件`}
            </h3>
            {rawSearch ? (
              <p className="mt-1 text-sm font-bold text-slate-600 dark:text-slate-300">
                「{rawSearch}」で絞り込み中
              </p>
            ) : null}
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
                {purpose === "safety" ? `掲載全${FEATURED_NETIS_TECHNOLOGIES.length}件を見る` : "絞り込みを解除"}
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
              const efficiency = "officialSourceUrl" in technology;
              const productImage = efficiency ? null : technology.productImage;
              const mainUrl = efficiency ? technology.officialSourceUrl : netisDetailUrl(technology.registrationNumber);
              return (
                <article
                  key={technology.registrationNumber}
                  className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm dark:border-emerald-900 dark:bg-slate-900"
                >
                  {/* 画像枠と名称は同じ一次資料へ。キーボード操作は名称リンクに一本化する */}
                  <a
                    href={mainUrl}
                    tabIndex={-1}
                    aria-hidden="true"
                    onClick={() => rememberReturnPosition(technology.registrationNumber)}
                    className={`group relative block overflow-hidden border-b border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-800 ${
                      productImage?.status === "verified" ? "h-40 sm:h-48" : "h-28 sm:h-32"
                    }`}
                  >
                    {productImage?.status === "verified" ? (
                      <Image
                        src={productImage.src}
                        alt=""
                        fill
                        sizes="(max-width: 1024px) 92vw, 560px"
                        className="object-contain p-2 transition duration-300 group-hover:scale-[1.02]"
                      />
                    ) : (
                      <span className="flex h-full flex-col items-center justify-center gap-1.5 px-4 text-center">
                        <ImageOff className="h-7 w-7 text-slate-500 dark:text-slate-400" />
                        <span className="text-sm font-black text-slate-800 dark:text-slate-100">
                          製品画像は未掲載
                        </span>
                        <span className="text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
                          利用許諾を確認中。汎用写真やAI画像では代替していません
                        </span>
                      </span>
                    )}
                  </a>
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
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        {efficiency ? technology.sourceBasis : `出典確認：${technology.checkedAt}`}
                      </span>
                    </div>
                    <h4 className="mt-2 text-base font-black leading-6 text-slate-950 dark:text-white">
                      <a
                        id={`netis-tech-${technology.registrationNumber}`}
                        href={mainUrl}
                        onClick={() => rememberReturnPosition(technology.registrationNumber)}
                        className="flex min-h-11 items-center break-words underline decoration-sky-300 underline-offset-4 hover:text-sky-900 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-sky-600 dark:hover:text-sky-200"
                      >
                        <span>
                          {technology.name}
                          <span className="sr-only">{efficiency ? "（国交省の紹介資料を開く）" : "（NETIS公式の詳細を開く）"}</span>
                        </span>
                      </a>
                    </h4>
                    <p className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-200">
                      {technology.summary}
                    </p>
                    {productImage?.status === "verified" ? (
                      <p className="mt-2 text-[11px] font-semibold leading-5 text-slate-500 dark:text-slate-400">
                        製品画像：{productImage.credit}（{productImage.retrievedAt}取得）
                      </p>
                    ) : null}
                    {efficiency ? (
                      <p className="mt-2 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
                        開発会社：{technology.provider}／確認資料記載番号：{technology.sourceRegistrationNumber}
                      </p>
                    ) : null}
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
                      <div>
                        <dt className="font-black text-slate-950 dark:text-white">制約・注意点</dt>
                        <dd className="text-slate-700 dark:text-slate-200">{technology.limitations}</dd>
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
                        href={efficiency ? technology.providerSourceUrl : technology.productUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-11 items-center gap-1 text-emerald-900 underline underline-offset-4 dark:text-emerald-200"
                      >
                        {efficiency ? "提供元の技術資料" : "提供元の技術情報"}
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                      {efficiency ? <a href={technology.officialSourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 text-sky-900 underline underline-offset-4 dark:text-sky-200">国交省の紹介一覧<ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /></a> : null}
                    </div>
                  </details>
                </article>
              );
            })}
          </div>
        ) : selectedCategory || rawSearch ? (
          <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-950/30">
            <h4 className="font-black text-slate-950 dark:text-white">
              条件に合う当サイト掲載技術は0件です
            </h4>
            <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
              無関係な技術は表示していません。NETIS公式検索で「{rawSearch || selectedCategory?.label || "現場の課題"}」を検索し、登録状態と適用条件を確認してください。
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
