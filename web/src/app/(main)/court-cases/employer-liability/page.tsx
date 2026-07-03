import type { Metadata } from "next";
import Link from "next/link";
import { Scale, Gavel, Landmark, ShieldAlert, ClipboardList, ArrowRight } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { PageJsonLd } from "@/components/page-json-ld";
import { ogImageUrl } from "@/lib/og-url";

const _title = "労災が起きたら会社・現場監督はどんな責任を問われるか｜民事・刑事・行政の3つの責任と判例";
const _desc =
  "労働災害が起きると、事業者・経営者・現場監督には民事（安全配慮義務違反の損害賠償・使用者責任・役員個人責任）、刑事（労働安全衛生法違反・業務上過失致死傷罪）、行政・社会的（送検・企業名公表・指名停止）の責任が生じ得ます。実際の判例とともに整理し、責任を問われないための予防・記録の進め方を解説します。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  alternates: { canonical: "/court-cases/employer-liability" },
  openGraph: {
    title: "労災が起きたら会社・現場監督はどんな責任を問われるか",
    description: "民事・刑事・行政の3つの責任を、実際の判例とともに整理。責任を問われないための予防・記録まで。",
    images: [{ url: ogImageUrl("労災の法的責任ガイド｜民事・刑事・行政"), width: 1200, height: 630 }],
  },
};

export const revalidate = 86400;

function IssueLink({ issue, label }: { issue: string; label: string }) {
  return (
    <Link
      href={`/court-cases?issue=${encodeURIComponent(issue)}`}
      className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200"
    >
      <Scale className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
      <ArrowRight className="h-3 w-3" aria-hidden="true" />
    </Link>
  );
}

export default function EmployerLiabilityPage() {
  return (
    <>
      <PageJsonLd
        name="労災の法的責任ガイド（民事・刑事・行政）"
        description={_desc}
        path="/court-cases/employer-liability"
      />
      <PageContainer width="prose">
        <header className="mb-6">
          <div className="flex items-center gap-2">
            <Gavel className="h-6 w-6 text-emerald-600" aria-hidden="true" />
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 lg:text-2xl">
              労災が起きたら、会社・現場監督はどんな責任を問われるか
            </h1>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            労働災害が発生すると、事業者・経営者・現場の管理者には大きく分けて
            <strong className="font-semibold">3つの責任（民事・刑事・行政／社会的）</strong>が生じ得ます。
            重大災害では会社だけでなく<strong className="font-semibold">現場監督・職長・役員が個人として</strong>責任を問われることもあります。
            「知らなかった」では済まされません。だからこそ、日々の予防と<strong className="font-semibold">記録（証跡）</strong>が重要です。
          </p>
        </header>

        {/* 1. 民事 */}
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-100">
            <Scale className="h-5 w-5 text-emerald-600" aria-hidden="true" /> 1. 民事責任（損害賠償）
          </h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            <li><strong>安全配慮義務違反</strong>：使用者は労働者が安全に働けるよう配慮する義務（労働契約法5条・信義則）を負い、これを怠って被災させれば債務不履行（民法415条）として損害賠償責任を負います。</li>
            <li><strong>使用者責任（民法715条）・不法行為（709条）</strong>：従業員の不法行為等についても使用者が賠償責任を負うことがあります。</li>
            <li><strong>元請・注文者の責任</strong>：直接の雇用関係がない下請労働者に対しても、設備の提供・事実上の指揮監督等の実態によっては元請が安全配慮義務を負います（大石塗装・鹿島建設事件、三菱重工業神戸造船所事件）。</li>
            <li><strong>役員個人の責任</strong>：取締役が悪意・重過失で安全体制の整備を怠った場合、会社法429条により<strong>個人として</strong>対第三者責任を負うことがあります。</li>
            <li>過労死・重度後遺障害では賠償額が<strong>数千万円〜億単位</strong>になることもあります。</li>
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <IssueLink issue="安全配慮義務" label="安全配慮義務の判例" />
            <IssueLink issue="元請・下請責任" label="元請・下請責任の判例" />
            <IssueLink issue="役員・個人責任" label="役員・個人責任の判例" />
          </div>
        </section>

        {/* 2. 刑事 */}
        <section className="mb-6 rounded-2xl border border-rose-200 bg-rose-50/40 p-5 shadow-sm dark:border-rose-500/40 dark:bg-rose-500/5">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-100">
            <Gavel className="h-5 w-5 text-rose-600" aria-hidden="true" /> 2. 刑事責任
          </h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            <li><strong>労働安全衛生法違反</strong>：墜落防止・機械の囲い・有害物対策など必要な措置を怠ると刑事罰の対象です。違反した条項に応じた懲役・罰金が科され、実際に違反した個人だけでなく<strong>法人にも罰金</strong>（両罰規定・労安法122条）が科されます。</li>
            <li><strong>業務上過失致死傷罪（刑法211条）</strong>：注意義務を怠って労働者を死傷させた<strong>個人（事業者・現場所長・職長等）</strong>は、5年以下の懲役・禁錮または100万円以下の罰金に問われ得ます。</li>
            <li>法人そのものに業務上過失致死傷罪は成立しませんが、<strong>現場を管理すべき立場の個人</strong>が対象になり得ます。</li>
            <li>実例：東海村JCO臨界事故（法人＋現場幹部6名が有罪）、天六ガス爆発事故（施工会社員・発注機関の職員らが有罪）。</li>
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <IssueLink issue="刑事責任" label="刑事責任が問われた判例" />
          </div>
        </section>

        {/* 3. 行政・社会的 */}
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-100">
            <Landmark className="h-5 w-5 text-violet-600" aria-hidden="true" /> 3. 行政上・社会的な責任
          </h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            <li>労働基準監督署による<strong>是正勧告・使用停止等命令</strong>、重大・悪質な事案では<strong>書類送検</strong>。</li>
            <li>重大な労働災害・送検事案では<strong>企業名が公表</strong>されることがあります。</li>
            <li>公共工事の<strong>指名停止</strong>、労災保険のメリット制による<strong>保険料の増加</strong>、信用・受注・採用への影響など、事業継続に関わる打撃に発展し得ます。</li>
          </ul>
        </section>

        {/* 予防 */}
        <section className="mb-6 rounded-2xl border border-emerald-300 bg-emerald-50 p-5 shadow-sm dark:border-emerald-500/40 dark:bg-emerald-500/10">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-100">
            <ShieldAlert className="h-5 w-5 text-emerald-700" aria-hidden="true" /> だからこそ「予防」と「記録（証跡）」
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            責任を問われないために最も重要なのは、日々の予防活動と、それを実施した<strong>記録</strong>です。
            当ポータルの無料ツールで、予防と記録をその場で完結できます。
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Link href="/ky/paper" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-800 hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
              <ClipboardList className="h-4 w-4 text-emerald-600" aria-hidden="true" /> KY（危険予知）で当日の危険を洗い出す
            </Link>
            <Link href="/site-records" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-800 hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
              <ClipboardList className="h-4 w-4 text-emerald-600" aria-hidden="true" /> 受入教育・パトロール・点検などを記録する
            </Link>
            <Link href="/heat-illness-prevention" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-800 hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
              <ClipboardList className="h-4 w-4 text-emerald-600" aria-hidden="true" /> 熱中症対策（令和7年義務化）に対応する
            </Link>
            <Link href="/court-cases" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-800 hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
              <Scale className="h-4 w-4 text-emerald-600" aria-hidden="true" /> 判例で「何が問われたか」を学ぶ
            </Link>
          </div>
        </section>

        <footer className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-[12px] leading-relaxed text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
          本ページは一般的な情報提供であり、個別事案に対する法的助言ではありません。具体的な対応は弁護士・社会保険労務士・労働安全/衛生コンサルタント等の専門家にご相談ください。
          条文・罰則の詳細は<a className="font-semibold text-emerald-700 hover:underline dark:text-emerald-300" href="https://laws.e-gov.go.jp/" target="_blank" rel="noopener noreferrer">e-Gov法令検索</a>、厚生労働省の解説等の一次情報をご確認ください。掲載判例はいずれも実在を確認した確定判例（または確定した刑事事件）です。
        </footer>
      </PageContainer>
    </>
  );
}
