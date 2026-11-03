import { allLawArticles, mhlwLawArticles } from "@/data/laws";
import { searchLawArticles } from "@/lib/law-search";

import { LAW_OPTIONS, safeLawParam, safeArticleParam } from "@/lib/law-search-query";
export {safeLawParam,safeArticleParam} from "@/lib/law-search-query";
const quarantinedLawArticles = new Set(mhlwLawArticles);
const serverSearchableArticles = allLawArticles.filter(
  (article) => !quarantinedLawArticles.has(article),
);

export function NoScriptLawSearch({
  selectedLaw,
  articleNumber,
}: {
  selectedLaw: string;
  articleNumber: string;
}) {
  const safeLaw = safeLawParam(selectedLaw);
  const safeArticle = safeArticleParam(articleNumber);
  const submitted = safeLaw !== "all" || safeArticle.length > 0;
  const hits = submitted
    ? searchLawArticles(serverSearchableArticles, safeArticle, safeLaw, 5)
    : [];

  return (
    <section
      aria-labelledby="law-search-nojs-title"
      className="mx-auto max-w-7xl px-4 py-5"
      data-law-search-nojs
    >
      <h2 id="law-search-nojs-title" className="text-xl font-black text-slate-950">
        法令名と条番号で検索
      </h2>
      <form
        action="/law-search"
        method="get"
        className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,.7fr)_auto]"
      >
        <label className="text-sm font-bold text-slate-800">
          法令名
          <select
            name="law"
            defaultValue={safeLaw}
            className="mt-1 min-h-11 w-full rounded-xl border border-slate-400 bg-white px-3"
          >
            {LAW_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-bold text-slate-800">
          条番号
          <input
            name="art"
            type="text"
            inputMode="numeric"
            maxLength={24}
            pattern="第?[0-9]{1,4}条(の[0-9]{1,3}){0,2}"
            defaultValue={safeArticle}
            placeholder="例: 第61条"
            className="mt-1 min-h-11 w-full rounded-xl border border-slate-400 px-3"
          />
        </label>
        <button
          type="submit"
          className="min-h-11 self-end rounded-xl bg-emerald-700 px-5 font-black text-white"
        >
          検索
        </button>
      </form>
      <details className="mt-2 text-xs text-slate-600">
        <summary className="min-h-11 cursor-pointer py-3 font-bold">
          入力の取り扱い
        </summary>
        <p>URLへ送るのは選択した法令名と条番号だけです。</p>
      </details>
      {submitted ? (
        <section aria-labelledby="law-search-nojs-results" className="mt-5">
          <h3 id="law-search-nojs-results" className="text-lg font-black text-slate-950">
            検索結果
          </h3>
          {hits.length > 0 ? (
            <ol className="mt-3 space-y-3">
              {hits.map(({ article, stableKey }) => (
                <li
                  key={stableKey}
                  className="rounded-xl border border-slate-300 bg-white p-4"
                >
                  <p className="font-black text-slate-950">
                    {article.law} {article.articleNum}
                    {article.articleTitle ? `（${article.articleTitle}）` : ""}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {article.text.slice(0, 240)}
                    {article.text.length > 240 ? "…" : ""}
                  </p>
                  <a
                    href={article.sourceUrl ?? "https://laws.e-gov.go.jp/"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex min-h-11 items-center font-bold text-brand-primary underline underline-offset-4"
                  >
                    e-Govで現行条文を確認
                  </a>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-2 text-sm font-bold text-slate-700">
              一致する収録条文が見つかりません。e-Govで確認してください。
            </p>
          )}
        </section>
      ) : (
        <p className="mt-4 text-sm font-bold text-slate-700">
          法令名を選ぶか、条番号を入力してください。
        </p>
      )}
    </section>
  );
}
