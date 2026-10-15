"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  FUNDING_PURPOSES,
  FUNDING_SCHEMES,
  FUNDING_TRAINING_SUPPLEMENT,
  FUNDING_VERIFIED_ON,
  fundingDeadlineText,
  type FundingPurpose,
} from "@/data/business-funding";
import type { AutomationConsultAvailability } from "@/lib/automation-consult/availability";

export function BusinessFundingGuide({
  availability,
  standalone = false,
}: {
  availability: AutomationConsultAvailability;
  standalone?: boolean;
}) {
  const [purpose, setPurpose] = useState<FundingPurpose>("ai-training");
  const [now, setNow] = useState<Date>();
  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const consultHref =
    availability.contactMode === "mail_client"
      ? "/contact/automation-email"
      : standalone
        ? "/services/automation#consult-form"
        : "#consult-form";

  return (
    <section
      id="funding"
      aria-labelledby="funding-title"
      className="mt-10 scroll-mt-24"
      data-business-funding
    >
      <h2 id="funding-title" className="text-2xl font-black text-slate-950">
        補助金・助成金を目的から探す
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-700">
        やりたいことを選ぶと、候補の制度と申請前の条件を確認できます。
      </p>
      <p className="mt-1 text-sm text-slate-700">
        公式情報の確認日：<time dateTime={FUNDING_VERIFIED_ON}>2026年10月14日</time>
        。受付・対象の確定は各公式窓口で確認してください。
      </p>
      <div className="mt-4 grid grid-cols-3 gap-2" role="group" aria-label="補助金を探す目的">
        {FUNDING_PURPOSES.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={purpose === item.id}
            aria-controls={`funding-${item.id}`}
            onClick={() => setPurpose(item.id)}
            className={`min-h-[44px] rounded-xl border-2 px-2 py-3 text-sm font-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-700/30 ${purpose === item.id ? "border-emerald-800 bg-emerald-800 text-white" : "border-slate-400 bg-white text-slate-900 hover:bg-slate-100"}`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <noscript>
        <style>{`@layer base{[data-funding-group][hidden]{display:block!important}}`}</style>
        <p className="mt-3 text-sm">目的別のすべての候補を下に表示しています。</p>
      </noscript>
      {FUNDING_PURPOSES.map((group) => (
        <div
          key={group.id}
          id={`funding-${group.id}`}
          hidden={purpose !== group.id}
          data-funding-group
          className="mt-4"
        >
          <h3 className="font-black text-slate-900">
            {group.label}の候補 <span className="font-normal">— {group.hint}</span>
          </h3>
          <div className={`mt-3 grid gap-4 ${group.id === "automation" ? "xl:grid-cols-2" : ""}`}>
            {FUNDING_SCHEMES.filter((scheme) => scheme.purpose === group.id).map((scheme) => (
              <article
                key={scheme.id}
                data-funding-scheme={scheme.id}
                className="rounded-2xl border border-slate-300 bg-white p-4 sm:p-5"
              >
                <h4 className="text-lg font-black leading-7 text-slate-950">{scheme.name}</h4>
                <p className="mt-2 text-sm leading-6 text-slate-700">{scheme.summary}</p>
                <dl className="mt-3 space-y-3 text-sm leading-6 text-slate-700">
                  {[
                    ["対象企業・受講者", scheme.company],
                    ["対象費用", scheme.costs],
                    ["率・上限", `${scheme.rate} ${scheme.cap}`],
                    ["事前手続き", scheme.preparation],
                    ["期限（日本時間）", fundingDeadlineText(scheme, now)],
                  ].map(([label, text]) => (
                    <div key={label}>
                      <dt className="font-black text-slate-900">{label}</dt>
                      <dd>{text}</dd>
                    </div>
                  ))}
                </dl>
                <details className="group mt-3 border-t border-slate-200">
                  <summary className="flex min-h-[44px] cursor-pointer items-center py-2 font-bold text-emerald-900 underline underline-offset-4">
                    必要条件・対象外・申請の流れ
                    <span
                      aria-hidden="true"
                      className="ml-auto pl-2 no-underline group-open:rotate-45"
                    >
                      ＋
                    </span>
                  </summary>
                  <div className="pb-3 text-sm leading-6 text-slate-700">
                    <ul className="list-disc space-y-2 pl-5">
                      {scheme.conditions.map((condition) => (
                        <li key={condition}>{condition}</li>
                      ))}
                    </ul>
                    <p className="mt-3">
                      <strong className="text-slate-900">対象外・注意：</strong>
                      {scheme.excluded}
                    </p>
                    <p className="mt-3">
                      <strong className="text-slate-900">申請・受取：</strong>
                      {scheme.application}
                    </p>
                  </div>
                </details>
                <div className="mt-1 flex flex-wrap gap-x-4">
                  {scheme.sources.map((source) => (
                    <a
                      key={source.url}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-[44px] items-center text-sm font-bold text-emerald-900 underline underline-offset-4"
                    >
                      {source.label}（別タブ）
                    </a>
                  ))}
                </div>
              </article>
            ))}
          </div>
          {group.id === "ai-training" ? (
            <details className="group mt-3 rounded-xl border border-slate-300 px-4">
              <summary className="flex min-h-[44px] cursor-pointer items-center py-2 text-sm font-bold text-slate-900">
                ほかの職務研修・高度デジタル・定額制の候補
                <span aria-hidden="true" className="ml-auto pl-2 group-open:rotate-45">
                  ＋
                </span>
              </summary>
              <div className="space-y-4 pb-4 text-sm leading-6 text-slate-700">
                {FUNDING_TRAINING_SUPPLEMENT.map((item) => (
                  <div key={item.name}>
                    <h4 className="font-black text-slate-900">{item.name}</h4>
                    <p>{item.text}</p>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-[44px] items-center font-bold text-emerald-900 underline"
                    >
                      厚労省の要領（別タブ）
                    </a>
                  </div>
                ))}
              </div>
            </details>
          ) : null}
        </div>
      ))}
      <div className="mt-5 rounded-2xl border border-emerald-800 bg-emerald-50 p-4 sm:p-5">
        <h3 className="font-black text-slate-950">研修・自動化と、申請準備を一緒に整理</h3>
        <p className="mt-2 text-sm leading-6 text-slate-800">
          制度情報の整理、研修内容の検討、工数・効果の見積もり、受講記録などの準備を支援します。
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-800">
          助成金の有償の申請書作成・提出代行は、社会保険労務士等の法令上対応可能な専門家へご相談ください。提携専門家や当サービスの認定・登録、採択・支給は保証していません。
        </p>
        <a
          href="https://jsite.mhlw.go.jp/tokyo-roudoukyoku/content/contents/002091323.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[44px] items-center text-sm font-bold text-emerald-900 underline"
        >
          東京労働局：申請代行の注意（別タブ）
        </a>
        {availability.accepting ? (
          <Link
            href={consultHref}
            prefetch={false}
            className="mt-2 flex min-h-[44px] w-fit items-center justify-center rounded-xl bg-emerald-800 px-5 py-3 text-sm font-black text-white hover:bg-emerald-900 focus-visible:ring-4 focus-visible:ring-emerald-700/30"
          >
            補助金も含めて相談する
          </Link>
        ) : (
          <p className="mt-2 text-sm font-bold text-slate-800">
            {availability.label}。公式窓口へご相談ください。
          </p>
        )}
      </div>
      <details className="group mt-3 rounded-xl border border-slate-300 px-4">
        <summary className="flex min-h-[44px] cursor-pointer items-center py-2 text-sm font-bold text-slate-900">
          申し込む前に確認すること
          <span aria-hidden="true" className="ml-auto pl-2 group-open:rotate-45">
            ＋
          </span>
        </summary>
        <ul className="list-disc space-y-2 pb-4 pl-5 text-sm leading-6 text-slate-700">
          <li>
            設備の補助金は原則、交付決定後の発注・契約。訓練助成は開始前の計画届などコース固有の手続きで、同じ順序とは限りません。
          </li>
          <li>企業規模は業種・資本金・人数等で判定されます。人数だけでは対象を確定できません。</li>
          <li>
            採択・事前計画は支給の確約ではありません。先に費用を支払い、実績報告・審査等の後に受け取るため、立替資金が必要です。
          </li>
          <li>
            同一経費の国費による重複助成、申請履歴、賃上げ・雇用保険・受講記録等を確認。上限額がそのまま支給されるわけではありません。
          </li>
          <li>
            無料教材の閲覧に受講料の助成はありません。掲載中の有料講習や開発も、制度・企業・内容ごとの確認が必要です。
          </li>
        </ul>
      </details>
    </section>
  );
}
