/**
 * Server-rendered checkup-decision document.
 *
 * Pure presentational. Accepts the engine's decision plus the resolved
 * worker profile and renders the full structure:
 *   cover → required checkups → annual schedule → missing/overdue summary.
 *
 * Reuses the shared `.plan-print-root` @media print styles in globals.css so
 * window.print() yields an A4-friendly document with no extra CSS.
 */

import {
  CHECKUP_TYPE_LABELS,
  INDUSTRY_LABELS,
  MONTH_LABELS_JA,
  SUBSTANCE_LABELS,
  WORK_CONDITION_LABELS,
  type MonthIndex,
  type SubstanceId,
  type WorkConditionId,
  type WorkerProfile,
} from "@/types/health-checkup";
import type { CheckupDecision } from "@/lib/health-checkup-engine";
import {
  optimiseDecision,
  type OptimisedDecision,
} from "@/lib/annual-schedule-optimizer";
import { getJobById } from "@/data/health-checkup-rules";

interface Props {
  profile: WorkerProfile;
  decision: CheckupDecision;
  generatedAt: string;
}

function formatJaDate(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const [y, m, d] = iso.split("-");
  return `${y}年${Number(m)}月${Number(d)}日`;
}

const MONTHS: MonthIndex[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export function SchedulerDocument({ profile, decision, generatedAt }: Props) {
  const { required, schedule, missing } = decision;
  const optimised: OptimisedDecision = optimiseDecision(required, schedule);
  const grouped: Record<MonthIndex, typeof schedule.entries> = {
    1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [], 9: [], 10: [], 11: [], 12: [],
  };
  for (const e of schedule.entries) grouped[e.month].push(e);

  const jobs = profile.jobIds
    .map((id) => getJobById(id))
    .filter((j): j is NonNullable<typeof j> => Boolean(j));

  return (
    <article className="plan-print-root space-y-8 bg-white text-slate-900">
      <header className="border-b border-slate-300 pb-6">
        <p className="text-sm text-slate-500">
          {INDUSTRY_LABELS[profile.industry]}
        </p>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
          健康診断スケジュール判定結果
        </h1>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="font-semibold text-slate-600">雇入日 / 起算日</dt>
            <dd>{formatJaDate(profile.hireDate)}</dd>
          </div>
          <div>
            <dt className="font-semibold text-slate-600">判定実施日</dt>
            <dd>{formatJaDate(generatedAt)}</dd>
          </div>
          <div>
            <dt className="font-semibold text-slate-600">対象職種</dt>
            <dd>{jobs.length === 0 ? "（未指定）" : jobs.map((j) => j.name).join("・")}</dd>
          </div>
          <div>
            <dt className="font-semibold text-slate-600">該当する健診件数</dt>
            <dd>{required.length} 件</dd>
          </div>
        </dl>
        {profile.substances.length + profile.workConditions.length > 0 ? (
          <div className="mt-3 text-xs text-slate-600">
            <p>
              <span className="font-semibold">手動追加の物質:</span>{" "}
              {profile.substances.length === 0
                ? "なし"
                : profile.substances
                    .map((s: SubstanceId) => SUBSTANCE_LABELS[s])
                    .join("・")}
            </p>
            <p className="mt-1">
              <span className="font-semibold">手動追加の作業条件:</span>{" "}
              {profile.workConditions.length === 0
                ? "なし"
                : profile.workConditions
                    .map((c: WorkConditionId) => WORK_CONDITION_LABELS[c])
                    .join("・")}
            </p>
          </div>
        ) : null}
      </header>

      <section>
        <h2 className="border-l-4 border-emerald-600 pl-3 text-xl font-bold">
          1. 必要な健康診断
        </h2>
        {required.length === 0 ? (
          <p className="mt-3 rounded border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            判定条件に該当する健診はありません。雇入日や作業条件の入力を確認してください。
          </p>
        ) : (
          <ol className="mt-4 space-y-4">
            {required.map(({ rule, triggeredBy }) => (
              <li
                key={rule.id}
                className="rounded border border-slate-200 p-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
                  <h3 className="text-lg font-semibold">{rule.title}</h3>
                  <span className="inline-block rounded bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                    {CHECKUP_TYPE_LABELS[rule.type]}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-700">{rule.shortDescription}</p>
                <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="font-semibold text-emerald-800">実施頻度</dt>
                    <dd>{rule.frequency.humanReadable}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-emerald-800">根拠条文</dt>
                    <dd>
                      {rule.relatedLaw.name}
                      {rule.relatedLaw.articles.length > 0
                        ? `（${rule.relatedLaw.articles.join("・")}）`
                        : ""}
                    </dd>
                  </div>
                </dl>
                <p className="mt-2 text-sm text-slate-700">{rule.relatedLaw.summary}</p>
                <details className="mt-3 text-sm">
                  <summary className="cursor-pointer font-semibold text-slate-700">
                    主な検査項目を表示
                  </summary>
                  <div className="mt-2 space-y-1 pl-2 text-slate-700">
                    <p className="font-semibold text-slate-700">必須項目:</p>
                    <ul className="list-disc pl-5">
                      {rule.testItems.mandatory.map((t, i) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                    {rule.testItems.omissible && rule.testItems.omissible.length > 0 ? (
                      <>
                        <p className="mt-2 font-semibold text-slate-700">医師判断で省略可:</p>
                        <ul className="list-disc pl-5">
                          {rule.testItems.omissible.map((t, i) => (
                            <li key={i}>{t}</li>
                          ))}
                        </ul>
                      </>
                    ) : null}
                  </div>
                </details>
                {rule.notes && rule.notes.length > 0 ? (
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-slate-600">
                    {rule.notes.map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                ) : null}
                <div className="mt-3 border-t border-dashed border-slate-200 pt-2 text-xs text-slate-500">
                  判定理由：
                  {triggeredBy.map((t, i) => (
                    <span key={i} className="ml-1">
                      {i > 0 ? "／" : ""}
                      {t.kind === "unconditional" && "全労働者が対象"}
                      {t.kind === "industry" && `業種(${INDUSTRY_LABELS[t.value]})`}
                      {t.kind === "substance" && `物質(${SUBSTANCE_LABELS[t.value]})`}
                      {t.kind === "work-condition" &&
                        `作業条件(${WORK_CONDITION_LABELS[t.value]})`}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section>
        <h2 className="border-l-4 border-emerald-600 pl-3 text-xl font-bold">
          2. 年間スケジュール（月別）
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          雇入日（{formatJaDate(profile.hireDate)}）を起点に、雇入時健診と各健診の法定間隔ごとの実施月を割り当てています。複数月にまたがる事業場は、該当月の前後でまとめて実施することも検討してください。
        </p>
        <div className="mt-4 space-y-3">
          {MONTHS.map((m) => {
            const events = grouped[m];
            return (
              <div
                key={m}
                className={`rounded border p-3 ${
                  events.length === 0
                    ? "border-slate-200 bg-slate-50"
                    : "border-emerald-200 bg-white"
                }`}
              >
                <h3 className="text-base font-bold text-emerald-800">
                  {MONTH_LABELS_JA[m]}{events.length > 0 ? `（${events.length}件）` : ""}
                </h3>
                {events.length === 0 ? (
                  <p className="mt-1 text-sm text-slate-500">該当なし</p>
                ) : (
                  <ul className="mt-2 space-y-1 text-sm">
                    {events.map((e, i) => (
                      <li key={`${e.ruleId}-${i}`}>
                        <span
                          className={`mr-2 inline-block rounded px-1.5 py-0.5 text-xs font-semibold ${
                            e.isAtHire
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {e.isAtHire ? "雇入時" : "定期"}
                        </span>
                        <span className="font-semibold">{e.ruleTitle}</span>
                        <span className="ml-1 text-xs text-slate-500">
                          [{CHECKUP_TYPE_LABELS[e.type]}]
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="border-l-4 border-emerald-600 pl-3 text-xl font-bold">
          3. 随時実施対象（イベント駆動の健診・面接指導）
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          月別カレンダーに固定配置できない、トリガー事象が発生したときに実施する健診・面接指導です。長時間労働者の医師面接（安衛法第66条の8）と海外派遣前後の健診（安衛則第45条の2）が代表例です。
        </p>
        {optimised.onDemand.length === 0 ? (
          <p className="mt-3 rounded border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            随時実施対象は該当ありません。
          </p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {optimised.onDemand.map((e) => (
              <li
                key={e.rule.id}
                className="rounded border border-purple-200 bg-purple-50 p-3"
              >
                <p className="font-semibold text-purple-900">{e.rule.title}</p>
                <p className="text-purple-800">
                  <span className="font-semibold">トリガー:</span> {e.trigger}
                </p>
                <p className="text-purple-800">
                  <span className="font-semibold">根拠:</span>{" "}
                  {e.rule.relatedLaw.name}（{e.rule.relatedLaw.articles.join("・")}）
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="border-l-4 border-emerald-600 pl-3 text-xl font-bold">
          4. 年間スケジュール最適化（推奨配置）
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          法定の起点（雇入時）は固定し、繁忙月に偏った定期健診の繰返しを操業閑散期（5月・6月・9月・11月）へ自動再配置した推奨スケジュールです。再配置の最大件数は4件まで。
        </p>
        {optimised.moves.length === 0 ? (
          <p className="mt-3 rounded border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            集中月が検出されなかったため、再配置は不要でした。法定の月別配置で運用可能です。
          </p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {optimised.moves.map((m, i) => (
              <li
                key={`${m.ruleId}-${i}`}
                className="rounded border border-amber-200 bg-amber-50 p-3"
              >
                <p className="font-semibold text-amber-900">{m.ruleTitle}</p>
                <p className="text-amber-800">
                  {MONTH_LABELS_JA[m.from]} → {MONTH_LABELS_JA[m.to]} に再配置
                </p>
                <p className="text-xs text-amber-700">{m.reason}</p>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 space-y-3">
          {optimised.monthlyView.map((v) => (
            <div
              key={`opt-${v.month}`}
              className={`rounded border p-3 ${
                v.entries.length === 0
                  ? "border-slate-200 bg-slate-50"
                  : "border-blue-200 bg-blue-50"
              }`}
            >
              <h3 className="text-base font-bold text-blue-900">
                {MONTH_LABELS_JA[v.month]}
                {v.entries.length > 0 ? `（${v.entries.length}件）` : ""}
              </h3>
              {v.entries.length === 0 ? (
                <p className="mt-1 text-sm text-slate-500">該当なし</p>
              ) : (
                <>
                  <ul className="mt-2 space-y-1 text-sm">
                    {v.entries.map((e, i) => (
                      <li key={`opt-${e.ruleId}-${i}`}>
                        <span
                          className={`mr-2 inline-block rounded px-1.5 py-0.5 text-xs font-semibold ${
                            e.isAtHire
                              ? "bg-amber-100 text-amber-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {e.isAtHire ? "雇入時" : "定期"}
                        </span>
                        <span className="font-semibold">{e.ruleTitle}</span>
                      </li>
                    ))}
                  </ul>
                  {v.consolidatedItems.length > 0 ? (
                    <details className="mt-2 text-xs">
                      <summary className="cursor-pointer text-blue-700">
                        統合済み検査項目（{v.consolidatedItems.length}項目）
                      </summary>
                      <ul className="mt-1 list-disc pl-5 text-blue-900">
                        {v.consolidatedItems.map((it, i) => (
                          <li key={i}>{it}</li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                </>
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="border-l-4 border-emerald-600 pl-3 text-xl font-bold">
          5. 漏れ・期限超過の警告
        </h2>
        {missing.length === 0 ? (
          <p className="mt-3 rounded border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            実施済みの記録は未入力のため警告は表示していません。本ツールでは過去実施日の入力欄を簡略化していますが、現場での運用では年度初に前回実施日を入力して期限超過を確認することを推奨します。
          </p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {missing.map((m, i) => (
              <li
                key={`${m.rule.id}-${i}`}
                className="rounded border border-red-200 bg-red-50 p-3"
              >
                <p className="font-semibold text-red-900">{m.rule.title}</p>
                <p className="text-red-800">{m.reason}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="border-t border-slate-300 pt-4 text-xs text-slate-500">
        <p>
          本結果は安全AIポータルの「健康診断スケジューラ」が労働安全衛生関係法令の基本構造に基づき自動判定したものです。具体的な検査項目・判定区分は事業場の作業実態と産業医・労働基準監督署の指導に従って最終決定してください。
        </p>
      </footer>
    </article>
  );
}
