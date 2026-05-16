/**
 * Server-rendered safety & health annual plan document.
 *
 * Pure presentational — accepts a {@link GeneratedPlan} and renders the full
 * structure (cover → policy → goals → measures → schedule → laws → notes).
 * Designed to look correct both on screen and via window.print() (the @media
 * print rules live in globals.css under .plan-print-root).
 */

import {
  MEASURE_LABELS,
  MONTH_LABELS_JA,
  type GeneratedPlan,
} from "@/types/safety-plan";

interface Props {
  plan: GeneratedPlan;
}

export function PlanDocument({ plan }: Props) {
  const { template } = plan;
  const allGoals = [...plan.customGoals, ...template.goals];

  return (
    <article className="plan-print-root space-y-8 bg-white text-slate-900">
      <header className="border-b border-slate-300 pb-6">
        <p className="text-sm text-slate-500">
          {template.industryLabel}・{template.scaleLabel}
        </p>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
          {plan.fiscalYear}年度 安全衛生計画書
        </h1>
        <p className="mt-3 text-base">
          <span className="font-semibold">事業者名：</span>
          {plan.organizationName || "（事業者名）"}
        </p>
        <p className="text-xs text-slate-500">
          作成日：{new Date(plan.generatedAt).toLocaleDateString("ja-JP")} / 計画ID：{plan.id}
        </p>
      </header>

      <section>
        <h2 className="border-l-4 border-emerald-600 pl-3 text-xl font-bold">
          1. 基本方針
        </h2>
        <p className="mt-3 whitespace-pre-line text-base leading-relaxed">
          {template.basicPolicy}
        </p>
      </section>

      <section>
        <h2 className="border-l-4 border-emerald-600 pl-3 text-xl font-bold">
          2. 重点目標と数値目標
        </h2>
        <ol className="mt-4 space-y-4">
          {allGoals.map((g, i) => (
            <li
              key={`${g.category}-${g.title}-${i}`}
              className="rounded border border-slate-200 p-4"
            >
              <p className="text-sm text-slate-500">目標 {i + 1}</p>
              <h3 className="mt-1 text-lg font-semibold">{g.title}</h3>
              <p className="mt-1 text-sm text-slate-700">{g.description}</p>
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="font-semibold text-emerald-800">数値目標</dt>
                  <dd>{g.target}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-emerald-800">測定方法（KPI）</dt>
                  <dd>{g.kpi}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="border-l-4 border-emerald-600 pl-3 text-xl font-bold">
          3. 実施事項
        </h2>
        <table className="mt-4 w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-100 text-left">
              <th className="border border-slate-300 p-2 w-32">分類</th>
              <th className="border border-slate-300 p-2">項目・内容</th>
              <th className="border border-slate-300 p-2 w-28">頻度</th>
              <th className="border border-slate-300 p-2 w-32">担当</th>
            </tr>
          </thead>
          <tbody>
            {template.measures.map((m, i) => (
              <tr key={`${m.category}-${m.title}-${i}`} className="align-top">
                <td className="border border-slate-300 p-2 font-semibold">
                  {MEASURE_LABELS[m.category]}
                </td>
                <td className="border border-slate-300 p-2">
                  <p className="font-semibold">{m.title}</p>
                  <p className="mt-1 text-slate-700">{m.description}</p>
                  {m.reference ? (
                    <p className="mt-1 text-xs text-slate-500">関連: {m.reference}</p>
                  ) : null}
                </td>
                <td className="border border-slate-300 p-2">{m.frequency}</td>
                <td className="border border-slate-300 p-2">{m.responsible}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="border-l-4 border-emerald-600 pl-3 text-xl font-bold">
          4. 月別実施スケジュール
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          会計年度（4月始まり）の順で記載。 法定 = 必須、推奨 = 自主実施。
        </p>
        <div className="mt-4 space-y-4">
          {template.monthlySchedule.map((entry) => (
            <div
              key={entry.month}
              className="rounded border border-slate-200 p-3"
            >
              <h3 className="text-base font-bold text-emerald-800">
                {MONTH_LABELS_JA[entry.month]}
              </h3>
              <ul className="mt-2 space-y-2">
                {entry.events.map((ev, j) => (
                  <li key={`${entry.month}-${j}`} className="text-sm">
                    <span
                      className={`mr-2 inline-block rounded px-1.5 py-0.5 text-xs font-semibold ${
                        ev.required
                          ? "bg-red-50 text-red-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {ev.required ? "法定" : "推奨"}
                    </span>
                    <span className="font-semibold">{ev.title}</span>
                    <p className="ml-1 mt-0.5 text-slate-700">{ev.description}</p>
                    {ev.reference ? (
                      <p className="ml-1 mt-0.5 text-xs text-slate-500">
                        関連: {ev.reference}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="border-l-4 border-emerald-600 pl-3 text-xl font-bold">
          5. 関連法令
        </h2>
        <ul className="mt-3 space-y-3 text-sm">
          {template.relatedLaws.map((law, i) => (
            <li key={i} className="rounded border border-slate-200 p-3">
              <p className="font-semibold">{law.name}</p>
              {law.articles.length > 0 ? (
                <p className="mt-1 text-slate-700">
                  関連条文: {law.articles.join("、")}
                </p>
              ) : null}
              <p className="mt-1 text-slate-700">{law.summary}</p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="border-l-4 border-emerald-600 pl-3 text-xl font-bold">
          6. 関連通達・告示
        </h2>
        <ul className="mt-3 space-y-2 text-sm">
          {template.relatedCirculars.map((c, i) => (
            <li key={i} className="rounded border border-slate-200 p-3">
              <p>
                <span className="font-semibold">{c.number}</span>
                <span className="ml-2 text-slate-500">{c.date}</span>
              </p>
              <p className="mt-1 text-slate-700">{c.title}</p>
            </li>
          ))}
        </ul>
      </section>

      {plan.notes ? (
        <section>
          <h2 className="border-l-4 border-emerald-600 pl-3 text-xl font-bold">
            7. 備考・自社特記事項
          </h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed">
            {plan.notes}
          </p>
        </section>
      ) : null}

      <footer className="border-t border-slate-300 pt-4 text-xs text-slate-500">
        <p>
          本計画書は安全AIポータルの「年次安全衛生計画ジェネレーター」が作成した雛形です。最終的な内容は事業場の実情に応じて安全衛生委員会で審議・決定してください。
        </p>
      </footer>
    </article>
  );
}
