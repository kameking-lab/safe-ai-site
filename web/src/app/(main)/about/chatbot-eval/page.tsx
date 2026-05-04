import type { Metadata } from "next";
import Link from "next/link";
import results from "@/data/chatbot-eval-results.json";

export const metadata: Metadata = {
  title: "AIチャットボット精度評価（Recall@5 100問ベンチマーク） | ANZEN AI",
  description:
    "労働安全衛生 AI チャットボットの根拠条文検索精度を 100 問ベンチマークで定量公開。RAG 検索結果に正答条文が top-5 内に含まれるか（Recall@5）を判定し、トピック別の Recall@5 と全失敗問の期待/取得値を開示します。",
  alternates: { canonical: "/about/chatbot-eval" },
  openGraph: {
    title: "AIチャットボット精度評価（Recall@5） | ANZEN AI",
    description:
      "100 問ベンチマークによる根拠条文 Recall@5 を全件公開。トピック別スコアと失敗問の詳細を含む。",
    type: "article",
  },
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

export default function ChatbotEvalPage() {
  const r = results as EvalResult;
  const sortedTopics = Object.entries(r.topic_breakdown).sort(
    ([, a], [, b]) => b.total - a.total
  );

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
      <nav aria-label="パンくず" className="mb-4 text-xs text-slate-500">
        <Link href="/about" className="hover:underline">
          研究・実証プロジェクトについて
        </Link>
        <span className="mx-2">/</span>
        <span>AIチャットボット精度評価</span>
      </nav>

      <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
        AIチャットボット精度評価（100問ベンチマーク）
      </h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        労働安全衛生 AI チャットボットが「正しい根拠条文を検索できているか」を 100 問のクローズドセットで評価し、
        結果を全件公開しています。各問は <code className="rounded bg-slate-100 px-1">{`{question, gold[]}`}</code>{" "}
        の組で、RAG 検索の上位 5 件に gold（期待される条文）のいずれか 1 件以上が含まれていれば正答とみなします。
      </p>

      {/* サマリ */}
      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="正答数（Recall@5）" value={`${r.correct} / ${r.total}`} accent />
        <Stat label="Recall@5" value={formatPct(r.accuracy)} accent />
        <Stat label="目標値" value={formatPct(r.target)} />
        <Stat
          label="判定"
          value={r.passed ? "✅ 達成" : "❌ 未達"}
          accent={r.passed}
        />
      </section>
      <p className="mt-3 text-xs text-slate-500">
        最終評価: {formatDate(r.generated_at)} ／ ソース:{" "}
        <code className="rounded bg-slate-100 px-1">test/chatbot-basic-100.json</code>
        ／ 実行コマンド:{" "}
        <code className="rounded bg-slate-100 px-1">npm run eval:chatbot</code>
      </p>

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
            ・評価対象は <strong>RAG 検索の根拠条文ヒット率</strong>。Gemini の生成回答の文章品質は別途評価。
          </li>
          <li>
            ・上位 5 件のうち gold 1 件でも含まれれば正答（Recall@5 ベース）。
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
