import type { Metadata } from "next";
import Link from "next/link";
import results from "@/data/chatbot-eval-results.json";
import freshResults from "@/data/chatbot-eval-fresh-results.json";
import genqualitySnapshot from "@/data/chatbot-genquality-latest.json";
import { PageJsonLd } from "@/components/page-json-ld";
import { withSiteOpenGraph, withSiteTwitter } from "@/lib/seo-metadata";
import { ogImageUrl } from "@/lib/og-url";

const SITE = "https://www.anzen-ai-portal.jp";
const _title = "AIチャットボット精度評価（Recall@5 100問ベンチマーク）";
const _desc =
  "労働安全衛生 AI チャットボットの根拠条文 検索ヒット率（Recall@5）を 100 問ベンチマークで定量公開。RAG 検索結果の上位 5 件に gold 条文が含まれるかを判定し、トピック別の Recall@5 と全失敗問の期待/取得値を開示します。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  alternates: { canonical: "/about/chatbot-eval" },
  openGraph: withSiteOpenGraph("/about/chatbot-eval", {
    title: _title,
    description: _desc,
    type: "article",
    images: [{ url: ogImageUrl(_title, _desc), width: 1200, height: 630 }],
  }),
  twitter: withSiteTwitter({
    title: _title,
    description: _desc,
    images: [ogImageUrl(_title, _desc)],
  }),
};

type EvalResult = {
  generated_at: string;
  total: number;
  correct: number;
  accuracy: number;
  target: number;
  passed: boolean;
  failures: Array<{
    id: number;
    topic: string;
    question: string;
    expected: string;
    actual: string;
  }>;
  topic_breakdown: Record<string, { total: number; correct: number; accuracy: number }>;
};

function formatPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("ja-JP", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

// 生成回答の正答率（本番23問・機械採点）。Recall@5（検索ヒット率）とは別レンズ。
// 実測値は loop-eval-nightly.ps1 が本番へ23問投げて更新する追跡スナップショットから読む。
// スナップショット欠損・破損時は 2026-07-03 のベースライン（19/21 = 90.5%）へ静的フォールバック
// （docs/chatbot-genquality-eval-2026-07-03.md）。
type GenQuality = {
  date: string;
  strictAccuracy: number;
  correct: number;
  partial: number;
  scorable: number;
  usefulRate: number;
  target: number;
  isFallback: boolean;
};

const GENQUALITY_BASELINE: GenQuality = {
  date: "2026-07-03",
  strictAccuracy: 19 / 21,
  correct: 19,
  partial: 1,
  scorable: 21,
  usefulRate: 1,
  target: 0.8,
  isFallback: true,
};

function readNumber(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function loadGenQuality(): GenQuality {
  const raw = genqualitySnapshot as Record<string, unknown>;
  const strictAccuracy = readNumber(raw.strictAccuracy);
  const scorable = readNumber(raw.scorable);
  // 正答率が [0,1] 外・採点母数が非正・欠損なら破綻させずベースラインへ退避。
  if (
    strictAccuracy === undefined ||
    strictAccuracy < 0 ||
    strictAccuracy > 1 ||
    scorable === undefined ||
    scorable <= 0
  ) {
    return GENQUALITY_BASELINE;
  }
  return {
    date: typeof raw.date === "string" ? raw.date : GENQUALITY_BASELINE.date,
    strictAccuracy,
    correct: readNumber(raw.correct) ?? 0,
    partial: readNumber(raw.partial) ?? 0,
    scorable,
    usefulRate: readNumber(raw.usefulRate) ?? GENQUALITY_BASELINE.usefulRate,
    target: readNumber(raw.target) ?? GENQUALITY_BASELINE.target,
    isFallback: false,
  };
}

export default function ChatbotEvalPage() {
  const gq = loadGenQuality();
  const r = results as EvalResult;
  const sortedTopics = Object.entries(r.topic_breakdown).sort(
    ([, a], [, b]) => b.total - a.total
  );

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
      <PageJsonLd
        name="AIチャットボット精度評価（Recall@5 100問ベンチマーク）"
        description="労働安全衛生 AI チャットボットの根拠条文 検索ヒット率（Recall@5）を 100 問ベンチマークで定量公開。"
        path="/about/chatbot-eval"
        breadcrumbs={[
          { name: "ホーム", url: SITE },
          { name: "プロジェクトについて", url: `${SITE}/about` },
          { name: "AIチャット精度評価", url: `${SITE}/about/chatbot-eval` },
        ]}
      />
      <nav aria-label="パンくず" className="mb-4 text-xs text-slate-500">
        <Link href="/about" className="hover:underline">
          研究・実証プロジェクトについて
        </Link>
        <span className="mx-2">/</span>
        <span>AIチャットボット Recall@5 評価</span>
      </nav>

      <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
        AIチャットボット Recall@5 評価（100問ベンチマーク）
      </h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        労働安全衛生 AI チャットボットが「正しい根拠条文を検索できているか」を 100 問のクローズドセットで評価し、
        結果を全件公開しています。各問は <code className="rounded bg-slate-100 px-1">{`{question, gold[]}`}</code>{" "}
        の組で、RAG 検索の上位 5 件に gold（期待される条文）のいずれか 1 件以上が含まれた割合を Recall@5（検索ヒット率）として算出します。
      </p>

      {/* サマリ */}
      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Recall@5（件数）" value={`${r.correct} / ${r.total}`} accent />
        <Stat label="Recall@5（検索ヒット率）" value={formatPct(r.accuracy)} accent />
        <Stat label="目標値" value={formatPct(r.target)} />
        <Stat
          label="判定"
          value={r.passed ? "✅ 達成" : "❌ 未達"}
          accent={r.passed}
        />
      </section>
      <p className="mt-3 text-xs text-slate-500">
        ※ 本ページの「Recall@5」は RAG 検索の根拠条文 検索ヒット率です。Gemini が生成する回答文そのものの正答率は下記「生成回答の正答率」で別途公開しています。<br />
        最終評価: {formatDate(r.generated_at)} ／ ソース:{" "}
        <code className="rounded bg-slate-100 px-1">test/chatbot-basic-100.json</code>
        ／ 実行コマンド:{" "}
        <code className="rounded bg-slate-100 px-1">npm run eval:chatbot</code>
      </p>

      {/* 生成回答の正答率（本番23問・機械採点） */}
      <GenQualitySection g={gq} />

      {/* トピック別 */}
      <section className="mt-8">
        <h2 className="text-lg font-bold text-slate-900">トピック別 Recall@5</h2>
        <p className="mt-1 text-xs text-slate-500">
          法令カテゴリ別に分けた集計。問数の多いトピックから降順表示。Recall@5 = top-5 に gold 条文が 1 件以上含まれた割合。
        </p>
        <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">トピック</th>
                <th className="px-3 py-2 text-right font-semibold">問数</th>
                <th className="px-3 py-2 text-right font-semibold">正答</th>
                <th className="px-3 py-2 text-right font-semibold">Recall@5</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {sortedTopics.map(([topic, t]) => (
                <tr key={topic}>
                  <td className="px-3 py-2 font-medium text-slate-800">{topic}</td>
                  <td className="px-3 py-2 text-right text-slate-700">{t.total}</td>
                  <td className="px-3 py-2 text-right text-slate-700">{t.correct}</td>
                  <td
                    className={`px-3 py-2 text-right font-semibold ${
                      t.accuracy >= r.target ? "text-emerald-700" : "text-amber-700"
                    }`}
                  >
                    {formatPct(t.accuracy)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 失敗ケース */}
      <section className="mt-8">
        <h2 className="text-lg font-bold text-slate-900">不正答ケース（{r.failures.length} 件）</h2>
        {r.failures.length === 0 ? (
          <p className="mt-2 text-sm text-emerald-700">
            ✅ 100 問すべての RAG 検索で期待条文が上位 5 件に含まれました。
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {r.failures.map((f) => (
              <li
                key={f.id}
                className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-slate-800"
              >
                <p className="font-semibold">
                  Q{f.id}{" "}
                  <span className="rounded bg-amber-200 px-1.5 py-0.5 text-[10px] text-amber-900">
                    {f.topic}
                  </span>{" "}
                  {f.question}
                </p>
                <p className="mt-1">
                  <span className="font-semibold">期待:</span> {f.expected}
                </p>
                <p className="mt-0.5">
                  <span className="font-semibold">取得:</span> {f.actual}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* fresh セット結果 */}
      <FreshResultsSection r={freshResults as EvalResult} />

      {/* 評価方法 */}
      <section className="mt-10 rounded-xl border border-slate-200 bg-slate-50 p-5">
        <h2 className="text-base font-bold text-slate-900">評価方法・限界</h2>
        <ul className="mt-2 space-y-1 text-xs leading-6 text-slate-700">
          <li>
            ・テストセットは{" "}
            <code className="rounded bg-white px-1">web/test/chatbot-basic-100.json</code>{" "}
            に固定。トピックは労働安全衛生の主要 33 法令から横断選定。
          </li>
          <li>
            ・本セクションの評価対象は <strong>RAG 検索の根拠条文ヒット率</strong>。Gemini の生成回答そのものの正答率は上記「生成回答の正答率（本番23問・機械採点）」で公開。
          </li>
          <li>
            ・上位 5 件のうち gold 1 件でも含まれれば検索ヒットとみなす（Recall@5 ベース）。
          </li>
          <li>
            ・本ベンチマークは検索段階の代理指標であり、実際の回答精度はモデル生成・プロンプト設計にも依存します。
          </li>
          <li>
            ・評価は CI で自動再走（
            <code className="rounded bg-white px-1">npm test -- rag-100q.test</code>
            ）。本ページは <code className="rounded bg-white px-1">npm run eval:chatbot</code> 実行時に更新される JSON を読み出して描画しています。
          </li>
        </ul>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <Link
            href="/chatbot"
            className="rounded-md border border-blue-200 bg-white px-3 py-1.5 font-semibold text-blue-700 hover:bg-blue-50"
          >
            チャットボットを試す →
          </Link>
          <Link
            href="/about/data-sources"
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-100"
          >
            データソース一覧
          </Link>
          <a
            href="https://laws.e-gov.go.jp/"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-100"
          >
            e-Gov 法令検索 ↗
          </a>
        </div>
      </section>
    </main>
  );
}

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        accent ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-white"
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
        {label}
      </p>
      <p
        className={`mt-1 text-xl font-bold ${
          accent ? "text-blue-800" : "text-slate-800"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function GenQualitySection({ g }: { g: GenQuality }) {
  const passed = g.strictAccuracy >= g.target;
  return (
    <section className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50/60 p-5">
      <div className="flex flex-wrap items-baseline gap-2">
        <h2 className="text-lg font-bold text-slate-900">
          生成回答の正答率（本番23問・機械採点）
        </h2>
        <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
          回答文の中身を採点
        </span>
      </div>
      <p className="mt-2 text-xs leading-6 text-slate-600">
        上の Recall@5 は「正しい条文を<strong>検索</strong>できたか」の指標です。こちらは本番同一エンドポイントに
        23 問の golden 質問を投げ、<strong>Gemini が実際に生成した回答文</strong>を機械採点（完全正答／部分正答／誤答）した
        「回答の中身」の正答率です。数値は本番を毎晩測定したスナップショットを読み出しています。
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="完全正答率" value={formatPct(g.strictAccuracy)} accent />
        <Stat
          label="完全正答数"
          value={`${g.correct} / ${g.scorable}`}
          accent
        />
        <Stat label="有用回答率" value={formatPct(g.usefulRate)} />
        <Stat
          label="判定"
          value={passed ? "✅ 達成" : "❌ 未達"}
          accent={passed}
        />
      </div>
      <p className="mt-3 text-xs text-slate-500">
        測定日: {g.date}
        {g.isFallback ? (
          <>
            （公開ベースライン・スナップショット未配備時のフォールバック）
          </>
        ) : (
          <>（本番23問の夜間自動測定・実測値）</>
        )}
        {" "}／ 目標値: {formatPct(g.target)}
        {" "}／ 採点器:{" "}
        <code className="rounded bg-slate-100 px-1">chatbot-genquality-scorer</code>
        ／ 実行コマンド:{" "}
        <code className="rounded bg-slate-100 px-1">npm run eval:chatbot-gen</code>
      </p>
      <p className="mt-2 text-xs text-slate-500">
        ※ 部分正答（要点は正しいが一部不足）は完全正答率には数えず、有用回答率（完全＋部分）に含みます。
        誤結論・条番号誤り・ハルシネーションは誤答として減点します。
      </p>
    </section>
  );
}

function FreshResultsSection({ r }: { r: EvalResult }) {
  const sortedTopics = Object.entries(r.topic_breakdown).sort(
    ([, a], [, b]) => b.total - a.total
  );
  return (
    <section className="mt-12 rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-baseline gap-2">
        <h2 className="text-lg font-bold text-slate-900">
          fresh セット（第2ベンチマーク）
        </h2>
        <span className="rounded-full border border-violet-300 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-800">
          言い換えロバストネス
        </span>
      </div>
      <p className="mt-2 text-xs leading-6 text-slate-600">
        既存の 100 問とは別の言い回し・観点で同じ法令論点をカバーする 100 問の追加セット。
        質問の表現が変わっても同じ条文を取れるかを観測する。
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="正答数（Recall@5）" value={`${r.correct} / ${r.total}`} accent />
        <Stat label="Recall@5" value={formatPct(r.accuracy)} accent />
        <Stat label="目標値" value={formatPct(r.target)} />
        <Stat
          label="判定"
          value={r.passed ? "✅ 達成" : "❌ 未達"}
          accent={r.passed}
        />
      </div>
      <p className="mt-3 text-xs text-slate-500">
        最終評価: {formatDate(r.generated_at)} ／ ソース:{" "}
        <code className="rounded bg-slate-100 px-1">test/chatbot-fresh-100.json</code>
        ／ 実行コマンド:{" "}
        <code className="rounded bg-slate-100 px-1">npm test -- rag-100q-fresh</code>
      </p>
      <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-600">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">トピック</th>
              <th className="px-3 py-2 text-right font-semibold">問数</th>
              <th className="px-3 py-2 text-right font-semibold">正答</th>
              <th className="px-3 py-2 text-right font-semibold">Recall@5</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {sortedTopics.map(([topic, t]) => (
              <tr key={topic}>
                <td className="px-3 py-2 font-medium text-slate-800">{topic}</td>
                <td className="px-3 py-2 text-right text-slate-700">{t.total}</td>
                <td className="px-3 py-2 text-right text-slate-700">{t.correct}</td>
                <td
                  className={`px-3 py-2 text-right font-semibold ${
                    t.accuracy >= r.target ? "text-emerald-700" : "text-amber-700"
                  }`}
                >
                  {formatPct(t.accuracy)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {r.failures.length > 0 ? (
        <details className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
          <summary className="cursor-pointer font-semibold text-slate-700">
            不正答ケースを表示（{r.failures.length} 件）
          </summary>
          <ul className="mt-3 space-y-2">
            {r.failures.map((f) => (
              <li
                key={f.id}
                className="rounded-md border border-amber-200 bg-amber-50 p-2 text-slate-800"
              >
                <p className="font-semibold">
                  Q{f.id}{" "}
                  <span className="rounded bg-amber-200 px-1.5 py-0.5 text-[10px] text-amber-900">
                    {f.topic}
                  </span>{" "}
                  {f.question}
                </p>
                <p className="mt-1">
                  <span className="font-semibold">期待:</span> {f.expected}
                </p>
                <p className="mt-0.5">
                  <span className="font-semibold">取得:</span> {f.actual}
                </p>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
