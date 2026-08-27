import Link from "next/link";
import { AutomationConsultCta } from "@/components/automation/automation-consult-cta";
import { UsageNotesLink } from "@/components/usage-notes-link";
import type { AutomationConsultAvailability } from "@/lib/automation-consult/availability";
import { AutomationConsultForm } from "./AutomationConsultForm";
import { AutomationConsultPreparation } from "./AutomationConsultPreparation";

const buttonPrimary =
  "inline-flex min-h-[44px] items-center justify-center rounded-xl bg-emerald-800 px-5 py-3 text-center text-sm font-black text-white hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-700/30 forced-colors:border-2 forced-colors:border-[LinkText] forced-colors:bg-[Canvas] forced-colors:text-[LinkText]";
const buttonSecondary =
  "inline-flex min-h-[44px] items-center justify-center rounded-xl border-2 border-slate-700 bg-white px-5 py-3 text-center text-sm font-black text-slate-950 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-400/40 forced-colors:border-[LinkText] forced-colors:bg-[Canvas] forced-colors:text-[LinkText]";

const PRIMARY_PRICES = [
  {
    title: "ちょこっと自動化",
    price: "33,000〜88,000円",
    scope: "Excel・CSV・定型メールなど、1つの定型業務",
    delivery: "目安1〜2週間・軽微修正1回",
  },
  {
    title: "業務フロー自動化",
    price: "110,000〜440,000円",
    scope: "複数工程の整理、設定・開発、操作手順の引き渡し",
    delivery: "目安3〜8週間・修正2回",
  },
  {
    title: "講習・資料作成",
    price: "55,000円から",
    scope: "60分講習、または支給原稿を使った資料作成",
    delivery: "内容により2〜6週間・見積時に確定",
  },
] as const;

const EXAMPLES = [
  {
    title: "週次CSV集計",
    before: "複数ファイルの結合と重複確認を毎週手作業",
    after: "同じ形式のCSVをまとめ、要確認分だけを一覧化",
    price: "55,000円の想定",
  },
  {
    title: "KY・点検記録の月次集計",
    before: "紙や複数ファイルから件数と傾向を転記",
    after: "項目をそろえ、分類別件数を出力して人が確定",
    price: "165,000円の想定",
  },
  {
    title: "90分の社内AI研修",
    before: "入力禁止情報と確認手順が部署ごとに異なる",
    after: "共通ルール、身近な例、演習を1回で共有",
    price: "77,000円の想定",
  },
] as const;

function PrimaryAction({
  availability,
}: {
  availability: AutomationConsultAvailability;
}) {
  if (!availability.accepting) {
    return (
      <Link href="#pricing" data-primary-action="true" className={buttonPrimary}>
        料金・事例を見る
      </Link>
    );
  }

  const mailAvailable = availability.contactMode === "mail_client";
  return (
    <AutomationConsultCta
      position="hero"
      href={mailAvailable ? "/contact/automation-email" : "#consult-form"}
      data-primary-action="true"
      className="bg-emerald-800 text-white hover:bg-emerald-900"
    >
      {mailAvailable ? "メールで相談する" : "Webフォームで相談する"}
    </AutomationConsultCta>
  );
}

export function AutomationServiceContent({
  availability,
}: {
  availability: AutomationConsultAvailability;
}) {
  const mailAvailable = availability.contactMode === "mail_client";
  const webFormAvailable =
    availability.accepting &&
    availability.webFormEnabled === true &&
    availability.contactMode === "web_form";

  return (
    <div data-automation-service className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <section id="overview" aria-labelledby="automation-title" data-primary-task="">
        <p className="text-sm font-black text-emerald-800">業務自動化・講習</p>
        <h1
          id="automation-title"
          className="mt-2 max-w-4xl text-3xl font-black tracking-tight text-slate-950 sm:text-5xl"
        >
          業務自動化・講習を小さな一件から。
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-slate-700">
          Excel集計、通知、手順書、社内講習を、税込33,000円から相談できます。
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span
            role="status"
            className="inline-flex rounded-full border border-emerald-700 px-3 py-1 text-sm font-black text-emerald-900"
          >
            {availability.label}
          </span>
          {availability.accepting ? (
            <span className="text-sm font-bold text-slate-700">
              初回30分は無料
            </span>
          ) : null}
        </div>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <PrimaryAction availability={availability} />
          {availability.accepting ? (
            <Link href="#pricing" data-secondary-action="true" className={buttonSecondary}>
              料金を見る
            </Link>
          ) : null}
        </div>
        {mailAvailable ? (
          <p className="mt-3 text-sm text-slate-700">
            利用者のメールアプリから送信します。
          </p>
        ) : null}
      </section>

      <section
        id="pricing"
        aria-labelledby="pricing-title"
        className="mt-10 scroll-mt-24"
      >
        <h2 id="pricing-title" className="text-2xl font-black text-slate-950">
          料金
        </h2>
        <p className="mt-2 text-sm text-slate-700">
          表示額はすべて消費税込み。初回相談後、作業前に範囲と総額を見積ります。
        </p>
        <div className="mt-4 grid gap-3 lg:grid-cols-3" data-primary-pricing>
          {PRIMARY_PRICES.map((item) => (
            <article
              key={item.title}
              className="rounded-2xl border border-slate-300 bg-white p-5"
            >
              <h3 className="font-black text-slate-950">{item.title}</h3>
              <p className="mt-2 text-xl font-black text-emerald-900">
                {item.price}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                {item.scope}
              </p>
              <p className="mt-2 text-sm font-bold text-slate-800">
                {item.delivery}
              </p>
            </article>
          ))}
        </div>
        <details className="mt-3 rounded-xl border border-slate-300 px-4">
          <summary className="flex min-h-[44px] cursor-pointer items-center font-bold text-slate-900">
            追加料金と対象外を確認
          </summary>
          <div className="pb-4 text-sm leading-6 text-slate-700">
            <p>
              大幅な仕様変更、現地作業、有料ツール、専門監修、写真購入は別見積です。
            </p>
            <p className="mt-1">見積前に費用は発生しません。</p>
          </div>
        </details>
      </section>

      <section
        id="model-cases"
        aria-labelledby="examples-title"
        className="mt-10 scroll-mt-24"
      >
        <h2 id="examples-title" className="text-2xl font-black text-slate-950">
          代表3件の想定例
        </h2>
        <p className="mt-2 text-sm text-slate-700">
          実在顧客の実績ではなく、条件整理のための想定例です。
        </p>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {EXAMPLES.map((example) => (
            <article
              key={example.title}
              className="rounded-2xl border border-slate-300 bg-slate-50 p-5"
            >
              <h3 className="font-black text-slate-950">{example.title}</h3>
              <dl className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                <div>
                  <dt className="font-black text-slate-900">現在</dt>
                  <dd>{example.before}</dd>
                </div>
                <div>
                  <dt className="font-black text-slate-900">納品イメージ</dt>
                  <dd>{example.after}</dd>
                </div>
                <div>
                  <dt className="font-black text-slate-900">料金</dt>
                  <dd>{example.price}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </section>

      <section
        id="services"
        aria-labelledby="services-title"
        className="mt-10 scroll-mt-24"
      >
        <h2 id="services-title" className="text-2xl font-black text-slate-950">
          依頼できること
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-3">
          <li className="rounded-xl border border-slate-300 p-4">
            <strong>集計・通知</strong>
            <span className="mt-1 block text-sm text-slate-700">
              Excel、CSV、フォーム回答、定型メール
            </span>
            <Link
              href="/tools/construction-calculators"
              className="mt-2 inline-flex min-h-11 items-center text-sm font-black text-emerald-900 underline underline-offset-4"
            >
              建設計算ツールを見る
            </Link>
          </li>
          <li className="rounded-xl border border-slate-300 p-4">
            <strong>安全衛生業務</strong>
            <span className="mt-1 block text-sm text-slate-700">
              KY、点検、教育記録、WBGT通知
            </span>
          </li>
          <li className="rounded-xl border border-slate-300 p-4">
            <strong>講習・資料</strong>
            <span className="mt-1 block text-sm text-slate-700">
              社内講習、スライド、手順書、確認クイズ
            </span>
            <Link
              href="/training/safety-seminars"
              className="mt-2 inline-flex min-h-11 items-center text-sm font-black text-emerald-900 underline underline-offset-4"
            >
              無料の安全研修教材を見る
            </Link>
            <Link
              href="/training/ai-seminars"
              className="inline-flex min-h-11 items-center text-sm font-black text-emerald-900 underline underline-offset-4"
            >
              無料のAI実務研修を見る
            </Link>
          </li>
        </ul>
      </section>

      <section
        id="consult-form"
        aria-labelledby="consult-title"
        className="mt-10 scroll-mt-24 border-t border-slate-300 pt-8"
      >
        <h2 id="consult-title" className="text-2xl font-black text-slate-950">
          相談する
        </h2>
        <p className="mt-2 text-sm text-slate-700">{availability.label}</p>
        {webFormAvailable ? (
          <>
            <AutomationConsultForm />
            <noscript>
              <style>{`[data-automation-consult-ready]{display:none!important}`}</style>
              <p className="mt-4 text-sm font-bold text-slate-800">
                Webフォームを利用できません。
                <Link href="/contact" className="ml-1 underline underline-offset-4">
                  お問い合わせを開く
                </Link>
              </p>
            </noscript>
          </>
        ) : null}
        {availability.accepting && mailAvailable ? (
          <AutomationConsultPreparation mailAvailable={mailAvailable} />
        ) : null}
        {!availability.accepting ? (
          <p className="mt-4 rounded-xl border border-slate-300 bg-slate-50 p-4 font-bold text-slate-800">
            現在は受付を停止しています。
          </p>
        ) : null}
      </section>

      <footer className="mt-10 flex flex-wrap gap-x-5 gap-y-1 border-t border-slate-200 pt-5 text-sm">
        <Link
          href="/about/project-story"
          className="inline-flex min-h-11 items-center font-bold text-emerald-900 underline underline-offset-4"
        >
          プロジェクトと編集方針を見る
        </Link>
        <a
          href="https://elaws.e-gov.go.jp/document?lawid=347M50002000032"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center font-bold text-emerald-900 underline underline-offset-4"
        >
          安衛則の原文
        </a>
        <UsageNotesLink className="text-emerald-900" />
      </footer>
    </div>
  );
}

export default AutomationServiceContent;
