import Link from "next/link";
import { ExternalLink, Scale, ShieldCheck } from "lucide-react";
import type { VisualKyScenario } from "@/data/visual-ky/schema";

export function VisualKyStaticReference({
  scenario,
}: {
  scenario: VisualKyScenario;
}) {
  return (
    <section
      id="text-equivalent"
      aria-labelledby="text-equivalent-heading"
      className="mt-8 rounded-3xl border border-slate-300 bg-white p-5 dark:border-slate-700 dark:bg-slate-950 sm:p-7"
    >
      <div className="flex items-start gap-3">
        <ShieldCheck
          className="mt-1 h-6 w-6 shrink-0 text-teal-800 dark:text-teal-300"
          aria-hidden="true"
        />
        <div>
          <p className="text-xs font-black tracking-[0.14em] text-teal-800 uppercase dark:text-teal-300">
            画像なしでも同じ内容
          </p>
          <h2
            id="text-equivalent-heading"
            className="mt-2 text-2xl font-black text-slate-950 dark:text-white"
          >
            場面説明・危険・対策のテキスト版
          </h2>
        </div>
      </div>
      <p className="mt-4 leading-8 text-slate-800 dark:text-slate-100">
        {scenario.image.fullDescription}
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {scenario.hazards.map((hazard, index) => {
          const hazardSources = hazard.sourceIds
            .map((sourceId) =>
              scenario.officialSources.find(
                (source) => source.id === sourceId,
              ),
            )
            .filter((source) => source !== undefined);
          return (
            <article
              key={hazard.id}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900"
            >
            <h3 className="text-lg font-black text-slate-950 dark:text-white">
              危険{index + 1}：{hazard.title}
            </h3>
            <dl className="mt-3 space-y-3 text-sm leading-6">
              <div>
                <dt className="font-black text-rose-800 dark:text-rose-300">
                  危険と理由
                </dt>
                <dd>
                  {hazard.what} {hazard.why}
                </dd>
              </div>
              <div>
                <dt className="font-black text-rose-800 dark:text-rose-300">
                  想定される事故
                </dt>
                <dd>{hazard.possibleAccident}</dd>
              </div>
              <div>
                <dt className="font-black text-teal-800 dark:text-teal-300">
                  最初の行動
                </dt>
                <dd>{hazard.firstAction}</dd>
              </div>
              <div>
                <dt className="font-black text-teal-800 dark:text-teal-300">
                  工学的対策
                </dt>
                <dd>
                  <ul className="list-disc pl-5">
                    {hazard.engineeringControls.map((control) => (
                      <li key={control}>{control}</li>
                    ))}
                  </ul>
                </dd>
              </div>
              <div>
                <dt className="font-black text-teal-800 dark:text-teal-300">
                  管理的対策
                </dt>
                <dd>
                  <ul className="list-disc pl-5">
                    {hazard.administrativeControls.map((control) => (
                      <li key={control}>{control}</li>
                    ))}
                  </ul>
                </dd>
              </div>
              <div>
                <dt className="font-black text-teal-800 dark:text-teal-300">
                  PPE
                </dt>
                <dd>
                  <ul className="list-disc pl-5">
                    {hazard.ppe.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </dd>
              </div>
              <div>
                <dt className="font-black text-amber-900 dark:text-amber-200">
                  中止・エスカレーション
                </dt>
                <dd>
                  <ul className="list-disc pl-5">
                    {hazard.stopEscalationConditions.map((condition) => (
                      <li key={condition}>{condition}</li>
                    ))}
                  </ul>
                </dd>
              </div>
              <div>
                <dt className="font-black text-sky-900 dark:text-sky-200">
                  この危険の一次資料
                </dt>
                <dd>
                  <ul className="space-y-3">
                    {hazardSources.map((source) => (
                      <li key={source.id}>
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold text-sky-800 underline dark:text-sky-300"
                        >
                          {source.organization}「{source.title}」
                        </a>
                        <span className="block">
                          該当箇所: {source.locator}
                        </span>
                        <span className="block">
                          適用範囲: {source.applicableScope}
                        </span>
                        <span className="block">
                          URL確認日:{" "}
                          <time dateTime={source.checkedDate}>
                            {source.checkedDate}
                          </time>
                        </span>
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            </dl>
          </article>
          );
        })}
      </div>

      <section className="mt-8" aria-labelledby="hierarchy-heading">
        <h3
          id="hierarchy-heading"
          className="flex items-center gap-2 text-xl font-black text-slate-950 dark:text-white"
        >
          <Scale className="h-5 w-5" aria-hidden="true" />
          対策の優先順位
        </h3>
        <ol className="mt-4 grid gap-3 md:grid-cols-5">
          {[
            ["1. 除去", scenario.preventionHierarchy.elimination],
            ["2. 代替", scenario.preventionHierarchy.substitution],
            ["3. 工学的", scenario.preventionHierarchy.engineering],
            ["4. 管理的", scenario.preventionHierarchy.administrative],
            ["5. PPE", scenario.preventionHierarchy.ppe],
          ].map(([label, items]) => (
            <li
              key={String(label)}
              className="rounded-xl border border-slate-300 p-4 dark:border-slate-700"
            >
              <p className="font-black">{String(label)}</p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-sm leading-6">
                {(items as string[]).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-8" aria-labelledby="sources-heading">
        <h3
          id="sources-heading"
          className="text-xl font-black text-slate-950 dark:text-white"
        >
          一次資料・適用範囲・確認日
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          本文は一次資料を基にしたサイト独自解説で、外部の安全・法務レビューは未完了です。
          実作業では法令原文、メーカー資料、事業場の手順、現場条件を人が確認してください。
        </p>
        <ul className="mt-4 space-y-3">
          {scenario.officialSources.map((source) => (
            <li
              key={source.id}
              className="rounded-xl border border-slate-300 p-4 dark:border-slate-700"
            >
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-2 font-black text-sky-800 underline decoration-2 underline-offset-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 dark:text-sky-300"
              >
                {source.title}
                <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
              </a>
              <p className="mt-2 text-sm leading-6">
                {source.organization}／該当箇所: {source.locator}
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                適用範囲: {source.applicableScope}／URL確認日:{" "}
                <time dateTime={source.checkedDate}>{source.checkedDate}</time>
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl bg-slate-100 p-5 dark:bg-slate-900">
          <h3 className="font-black text-slate-950 dark:text-white">
            関連する事故参考例
          </h3>
          <ul className="mt-3 space-y-2 text-sm leading-6">
            {scenario.relatedAccidents.map((item) => (
              <li key={item.id}>
                <Link className="font-bold text-sky-800 underline dark:text-sky-300" href={item.href}>
                  {item.label}
                </Link>
                <span className="block text-xs text-slate-600 dark:text-slate-400">
                  {item.id}（編集再構成した参考例。公式個票そのものではなく、上の架空のKYT場面とも別です）
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl bg-slate-100 p-5 dark:bg-slate-900">
          <h3 className="font-black text-slate-950 dark:text-white">
            関連法令
          </h3>
          <ul className="mt-3 space-y-2 text-sm leading-6">
            {scenario.relatedLaws.map((item) => (
              <li key={item.id}>
                <Link className="font-bold text-sky-800 underline dark:text-sky-300" href={item.href}>
                  {item.label}
                </Link>
                <span className="block text-xs text-slate-600 dark:text-slate-400">
                  {item.locator}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl bg-slate-100 p-5 dark:bg-slate-900">
          <h3 className="font-black text-slate-950 dark:text-white">
            関連資格・教育
          </h3>
          {scenario.relatedQualifications.length ? (
            <ul className="mt-3 space-y-2 text-sm leading-6">
              {scenario.relatedQualifications.map((item) => (
                <li key={item.id}>
                  <Link className="font-bold text-sky-800 underline dark:text-sky-300" href={item.href}>
                    {item.label}
                  </Link>
                  <span className="block text-xs text-slate-600 dark:text-slate-400">
                    {item.condition}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm leading-6">
              この場面だけで一律に資格を決められません。作業内容・設備・法令適用を資格確認ツールで確認してください。
            </p>
          )}
        </div>
      </section>
    </section>
  );
}
