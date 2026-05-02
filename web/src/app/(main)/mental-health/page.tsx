import type { Metadata } from "next";
import Link from "next/link";
import {
  Brain,
  Heart,
  ShieldAlert,
  Monitor,
  Users2,
  Clock,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ogImageUrl } from "@/lib/og-url";

import { PageJsonLd } from "@/components/page-json-ld";
const _title = "メンタルヘルス・ハラスメント・VDT作業｜労働安全の見えない半分";
const _desc =
  "ストレスチェック制度・カスタマーハラスメント対策法（2025年）・VDT作業ガイドライン・4つのケアをまとめました。労安衛の新しい半分を整理。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  alternates: { canonical: "/mental-health" },
  openGraph: {
    title: `${_title}｜ANZEN AI`,
    description: _desc,
    type: "website",
    images: [{ url: ogImageUrl(_title, _desc), width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${_title}｜ANZEN AI`,
    description: _desc,
    images: [ogImageUrl(_title, _desc)],
  },
};

type InfoCard = {
  title: string;
  body: string;
  law?: string;
};

const STRESS_CHECK: InfoCard[] = [
  {
    title: "対象事業場",
    body: "常時使用する労働者が50人以上の事業場は年1回以上の実施が義務（2015年施行）。50人未満は当分の間努力義務。派遣労働者は派遣元・派遣先で重複実施しない整理。",
    law: "労安衛法第66条の10、同施行規則第52条の9〜21",
  },
  {
    title: "高ストレス者への医師面接",
    body: "高ストレス者と判定された労働者から申出があった場合、おおむね1ヶ月以内に医師面接指導を実施。事業者は就業上の措置（残業制限・配置転換等）を検討する義務。",
  },
  {
    title: "集団分析（努力義務）",
    body: "部署単位10人以上での集団分析結果を職場改善に活用。高ストレス部署への職場環境改善研修・ラインケア研修の実施が推奨される。",
  },
  {
    title: "プライバシー保護",
    body: "個人結果は本人同意なしに事業者に通知不可。実施者（産業医・保健師等）のみが個人結果を取り扱う。同意ありの場合でも最小限。",
  },
];

const FOUR_CARES: InfoCard[] = [
  {
    title: "セルフケア",
    body: "労働者自身によるストレスへの気付き・対処。年1回以上のストレスチェック受検、メンタルヘルス教育、相談窓口の周知が基本。",
  },
  {
    title: "ラインによるケア",
    body: "管理監督者による日常的な声かけ・異変察知・職場環境改善。ラインケア研修（年1回推奨）で管理職のコミュニケーション力を高める。",
  },
  {
    title: "事業場内産業保健スタッフ等によるケア",
    body: "産業医・衛生管理者・保健師・心理職による専門的ケア。長時間労働者面接指導・高ストレス者面接・復職支援プログラムの運営。",
  },
  {
    title: "事業場外資源によるケア",
    body: "地域産業保健センター・EAP（従業員支援プログラム）・精神科医療機関などの外部リソース活用。匿名相談・家族相談窓口の確保。",
  },
];

const CASEHARA: InfoCard[] = [
  {
    title: "カスハラ対策の法制化動向",
    body: "労働施策総合推進法の改正案が国会審議中（2026年4月時点で施行日未確定）。可決・公布後、カスタマーハラスメント（顧客等からの著しい迷惑行為）への事業者の対応措置義務化が見込まれる。先行整備としては、既に施行済みのパワハラ防止指針を準用し、就業規則への規定・相談体制整備・被害者ケアの体制を整えておくのが実務的。",
    law: "労働施策総合推進法（改正案・国会審議中）、パワハラ防止指針（2022年施行済）",
  },
  {
    title: "事業者が講ずべき措置（指針案）",
    body: "① 組織トップのメッセージ発信、② 就業規則への規定、③ 対応マニュアル作成、④ 相談体制、⑤ 被害者ケア（配置転換・専門家相談）、⑥ 悪質事案の警察連携、⑦ 社内研修。",
  },
  {
    title: "対象業種",
    body: "小売・医療介護・コールセンター・公共交通・行政窓口・教育など顧客接点のあるすべての業種。特に医療介護・コールセンターでは離職要因の上位。",
  },
  {
    title: "被害労災認定",
    body: "カスハラを原因とするメンタル疾患は労災認定の対象（精神障害の認定基準令和5年改正で『顧客や取引先から著しい迷惑行為を受けた』が出来事に追加）。",
  },
];

const VDT: InfoCard[] = [
  {
    title: "作業時間",
    body: "連続作業1時間以内（超える場合は作業の間に10〜15分の作業休止）、1日の作業時間は業務内容・個人差を考慮し可能な限り短縮。",
  },
  {
    title: "照明・明るさ",
    body: "室内照明300〜500lx、書類・キーボード面の明るさ差は3:1以内、画面と周囲の明るさ差は1:10以内。直射日光・反射グレアの回避。",
  },
  {
    title: "画面・キーボード距離",
    body: "画面までの距離おおむね40cm以上、画面上端は目の高さ以下。椅子の高さ・キーボードは肘関節90度程度が目安。",
  },
  {
    title: "健康管理",
    body: "配置前健診・定期健診（1年以内ごとに1回）で、視力・筋骨格系・精神的疲労を検査。疲労蓄積時の配置転換・休憩室確保も推奨。",
    law: "情報機器作業における労働衛生管理のためのガイドライン（令和元年基発0712第3号）",
  },
];

export default function MentalHealthPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
      {/* SEO: WebPage + BreadcrumbList */}
      <PageJsonLd name={_title} description={_desc} path="/mental-health" />
      <PageHeader
        title="メンタルヘルス・ハラスメント・VDT作業"
        description="ストレスチェック・4つのケア・カスハラ対策・情報機器作業ガイドライン"
        icon={Heart}
        iconColor="red"
      />

      <section className="mt-6 rounded-2xl border border-violet-200 bg-violet-50/60 p-5">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-violet-700" aria-hidden="true" />
          <div className="text-sm leading-6 text-violet-900">
            <p className="font-semibold">労働安全の『見えない半分』</p>
            <p className="mt-1">
              身体災害と並んで、現代の労働安全の大きな柱がメンタルヘルス・ハラスメント・VDT作業です。
              本ページでは法令と指針の要点をまとめました。具体対応は産業医・臨床心理士・社労士と連携してください。
            </p>
          </div>
        </div>
      </section>

      {/* ストレスチェック */}
      <section id="stress-check" className="mt-8">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <Brain className="h-5 w-5 text-violet-600" aria-hidden="true" />
          ストレスチェック制度
        </h2>
        <p className="mt-1 text-xs text-slate-500">労安衛法第66条の10に基づく法定制度の要点。</p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {STRESS_CHECK.map((s) => (
            <article
              key={s.title}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <h3 className="text-sm font-bold text-slate-900">{s.title}</h3>
              <p className="mt-1 text-sm leading-6 text-slate-700">{s.body}</p>
              {s.law && (
                <p className="mt-2 inline-block rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                  関連：{s.law}
                </p>
              )}
            </article>
          ))}
        </div>
      </section>

      {/* 4つのケア */}
      <section id="four-cares" className="mt-10">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <Users2 className="h-5 w-5 text-violet-600" aria-hidden="true" />
          4つのケア
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          厚労省『労働者の心の健康の保持増進のための指針』（平成18年策定、令和2年改正）の基本フレーム。
        </p>
        <div className="mt-4 space-y-3">
          {FOUR_CARES.map((c, idx) => (
            <article
              key={c.title}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <h3 className="flex items-baseline gap-2 text-sm font-bold text-slate-900">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-violet-600 text-[11px] font-bold text-white">
                  {idx + 1}
                </span>
                {c.title}
              </h3>
              <p className="mt-1.5 text-sm leading-6 text-slate-700">{c.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* カスハラ */}
      <section id="casehara" className="mt-10">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <ShieldAlert className="h-5 w-5 text-rose-600" aria-hidden="true" />
          カスタマーハラスメント対策
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          労働施策総合推進法の改正動向と、既に運用されているパワハラ防止法との整理。
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {CASEHARA.map((c) => (
            <article
              key={c.title}
              className="rounded-xl border border-rose-200 bg-white p-4 shadow-sm"
            >
              <h3 className="text-sm font-bold text-slate-900">{c.title}</h3>
              <p className="mt-1 text-sm leading-6 text-slate-700">{c.body}</p>
              {c.law && (
                <p className="mt-2 inline-block rounded bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                  関連：{c.law}
                </p>
              )}
            </article>
          ))}
        </div>
        <p className="mt-3 text-[11px] leading-5 text-slate-500">
          ※ 法改正の施行日・詳細は厚労省の最新資料を必ずご確認ください。
          当サイトの記述は法案・指針策定段階の情報を含みます。
        </p>
      </section>

      {/* VDT */}
      <section id="vdt" className="mt-10">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <Monitor className="h-5 w-5 text-sky-600" aria-hidden="true" />
          VDT作業（情報機器作業）ガイドライン
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          在宅勤務・オフィスワーク・コールセンター等の画面作業に適用される令和元年の厚労省指針の要点。
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {VDT.map((v) => (
            <article
              key={v.title}
              className="rounded-xl border border-sky-200 bg-white p-4 shadow-sm"
            >
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Clock className="h-4 w-4 text-sky-600" aria-hidden="true" />
                {v.title}
              </h3>
              <p className="mt-1 text-sm leading-6 text-slate-700">{v.body}</p>
              {v.law && (
                <p className="mt-2 inline-block rounded bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
                  関連：{v.law}
                </p>
              )}
            </article>
          ))}
        </div>
      </section>

      {/* 相談窓口 */}
      <section className="mt-10 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <h2 className="text-base font-bold text-emerald-900">相談・支援窓口</h2>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-emerald-900">
          <li>
            <a
              href="https://www.mhlw.go.jp/kokoro/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold underline hover:text-emerald-700"
            >
              厚労省「こころの耳」
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
            — 働く人のメンタルヘルス・ポータル、電話・SNS相談窓口リスト
          </li>
          <li>
            <a
              href="https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000193229.html"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold underline hover:text-emerald-700"
            >
              パワハラ防止法（あかるい職場応援団）
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          </li>
          <li>
            <span className="font-semibold">地域産業保健センター：</span>
            労働者50人未満の事業場向けの無料メンタル相談（全国各地）
          </li>
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/diversity"
            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
          >
            多様な働き方の安全 →
          </Link>
          <Link
            href="/glossary"
            className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-white px-4 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
          >
            安全用語辞書
          </Link>
        </div>
      </section>

      <p className="mt-8 text-center text-xs text-slate-400">
        最終更新：2026年4月。本ページは法令・指針の要点解説です。
        <strong className="text-slate-500">メンタルヘルスの個別診断・治療判断は医師法上、医師の専管事項です。</strong>
        本サイトは個別診断・治療助言を行いません。具体的事案は産業医・臨床心理士・医師・社労士等の専門家にご相談ください。
      </p>
    </main>
  );
}
