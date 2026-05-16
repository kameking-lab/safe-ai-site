/**
 * Server-rendered safety & health annual plan document.
 *
 * Pure presentational — accepts a {@link GeneratedPlan} and renders the full
 * structure (cover → TOC → policy → goals → measures → schedule → laws →
 * notes). Designed for both on-screen review and window.print() output
 * (A4 print rules live in globals.css under .plan-print-root).
 */

import {
  MEASURE_LABELS,
  MONTH_LABELS_JA,
  type GeneratedPlan,
  type MonthIndex,
} from "@/types/safety-plan";

interface Props {
  plan: GeneratedPlan;
}

const SECTIONS: Array<{ id: string; title: string }> = [
  { id: "policy", title: "1. 基本方針" },
  { id: "goals", title: "2. 重点目標と数値目標" },
  { id: "measures", title: "3. 実施事項" },
  { id: "schedule-summary", title: "4. 月別実施スケジュール（一覧表）" },
  { id: "schedule-detail", title: "5. 月別実施スケジュール（詳細）" },
  { id: "laws", title: "6. 関連法令" },
  { id: "circulars", title: "7. 関連通達・告示" },
];

const NOTES_SECTION = { id: "notes", title: "8. 備考・自社特記事項" };

const FISCAL_MONTH_ORDER: MonthIndex[] = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];

export function PlanDocument({ plan }: Props) {
  const { template } = plan;
  const allGoals = [...plan.customGoals, ...template.goals];
  const sectionList = plan.notes
    ? [...SECTIONS, NOTES_SECTION]
    : SECTIONS;

  return (
    <article className="plan-print-root space-y-8 bg-white text-slate-900">
      <section className="plan-cover border-b border-slate-300 pb-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">
          年次安全衛生計画書 / Annual Safety &amp; Health Plan
        </p>
        <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
          {plan.fiscalYear}年度 安全衛生計画書
        </h1>
        <p className="mt-4 text-base text-slate-600">
          {template.industryLabel}・{template.scaleLabel}
        </p>
        <dl className="mt-6 grid gap-3 text-base sm:grid-cols-2">
          <div>
            <dt className="text-sm font-semibold text-slate-500">事業者名</dt>
            <dd className="mt-1">{plan.organizationName || "（事業者名）"}</dd>
          </div>
          <div>
            <dt className="text-sm font-semibold text-slate-500">対象年度</dt>
            <dd className="mt-1">{plan.fiscalYear}年4月〜{plan.fiscalYear + 1}年3月</dd>
          </div>
          <div>
            <dt className="text-sm font-semibold text-slate-500">作成日</dt>
            <dd className="mt-1">
              {new Date(plan.generatedAt).toLocaleDateString("ja-JP")}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-semibold text-slate-500">計画ID</dt>
            <dd className="mt-1 break-all font-mono text-sm">{plan.id}</dd>
          </div>
        </dl>
        <p className="plan-cover-pagebreak mt-8 text-xs text-slate-500">
          審議：安全衛生委員会 / 決裁：事業者
        </p>
      </section>

      <nav className="plan-toc" aria-label="目次">
        <h2 className="border-l-4 border-emerald-600 pl-3 text-xl font-bold">
          目次
        </h2>
        <ol className="mt-3 space-y-1 text-sm">
          {sectionList.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="text-emerald-800 hover:underline print:text-slate-900 print:no-underline"
              >
                {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <section id="policy">
        <h2 className="border-l-4 border-emerald-600 pl-3 text-xl font-bold">
          1. 基本方針
        </h2>
        <p className="mt-3 whitespace-pre-line text-base leading-relaxed">
          {template.basicPolicy}
        </p>
      </section>

      <section id="goals">
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

      <section id="measures">
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

      <section id="schedule-summary">
        <h2 className="border-l-4 border-emerald-600 pl-3 text-xl font-bold">
          4. 月別実施スケジュール（一覧表）
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          会計年度（4月始まり）順。 法定=必須、推奨=自主実施。
        </p>
        <table className="mt-4 w-full border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100 text-left">
              <th className="border border-slate-300 p-2 w-12">月</th>
              <th className="border border-slate-300 p-2 w-16">件数</th>
              <th className="border border-slate-300 p-2 w-16">うち法定</th>
              <th className="border border-slate-300 p-2">主な実施項目</th>
            </tr>
          </thead>
          <tbody>
            {FISCAL_MONTH_ORDER.map((m) => {
              const entry = template.monthlySchedule.find((e) => e.month === m);
              if (!entry) return null;
              const required = entry.events.filter((e) => e.required).length;
              return (
                <tr key={`row-${m}`} className="align-top">
                  <td className="border border-slate-300 p-2 font-semibold">
                    {MONTH_LABELS_JA[m]}
                  </td>
                  <td className="border border-slate-300 p-2">
                    {entry.events.length}件
                  </td>
                  <td className="border border-slate-300 p-2">{required}件</td>
                  <td className="border border-slate-300 p-2 text-slate-700">
                    {entry.events.map((e) => e.title).join(" / ")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section id="schedule-detail">
        <h2 className="border-l-4 border-emerald-600 pl-3 text-xl font-bold">
          5. 月別実施スケジュール（詳細）
        </h2>
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

      <section id="laws">
        <h2 className="border-l-4 border-emerald-600 pl-3 text-xl font-bold">
          6. 関連法令
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

      <section id="circulars">
        <h2 className="border-l-4 border-emerald-600 pl-3 text-xl font-bold">
          7. 関連通達・告示
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
        <section id="notes">
          <h2 className="border-l-4 border-emerald-600 pl-3 text-xl font-bold">
            8. 備考・自社特記事項
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
