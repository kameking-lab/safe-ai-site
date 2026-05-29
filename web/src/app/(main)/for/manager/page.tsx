import type { Metadata } from "next";
import Link from "next/link";
import {
  Building2,
  ListChecks,
  Brain,
  Stethoscope,
  FlaskConical,
  RefreshCw,
  CalendarDays,
  MessageSquare,
  ArrowRight,
  ShieldCheck,
  Scale,
} from "lucide-react";
import { PageContainer } from "@/components/layout";
import { JsonLd, breadcrumbSchema, webPageSchema } from "@/components/json-ld";
import { ogImageUrl } from "@/lib/og-url";
import { MainFeatureNextActions } from "@/components/main-feature-next-actions";

const TITLE = "企業の安全衛生担当者ポータル — 体制づくり・委員会・ストレスチェック・年次計画を一気通貫で";
const DESCRIPTION =
  "総務・人事・安全衛生担当者が、衛生管理者や委員会などの体制づくりから、ストレスチェック・健康診断・化学物質の自律管理・年次安全衛生計画までを一箇所で。規模別の義務早見つき。労働安全衛生コンサルタント (登録番号260022) 監修の無料の研究プロジェクト。";
const CANONICAL = "/for/manager";
const FULL_URL = "https://www.anzen-ai-portal.jp/for/manager";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: FULL_URL,
    type: "website",
    images: [{ url: ogImageUrl("企業の安全衛生担当者ポータル", "体制・委員会・ストレスチェック・年次計画"), width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

// 体制づくり 3ステップ（確立した実務フローをツールにルート化）
const SETUP_STEPS = [
  {
    no: "STEP 1",
    title: "体制をつくる",
    body: "事業場の規模・業種から、選任すべき管理者と設置すべき委員会を確認。必要な特別教育・資格も逆引きで把握します。",
    links: [
      { label: "必要資格・特別教育を判定", href: "/education-certification/finder" },
      { label: "安衛法を体系マップで俯瞰", href: "/law-hierarchy" },
    ],
  },
  {
    no: "STEP 2",
    title: "計画をつくる",
    body: "年次安全衛生計画を業種・規模別テンプレートから自動生成。目標・対策・月別イベント・関連法令を1枚に。",
    links: [
      { label: "年次安全衛生計画を生成", href: "/strategy/plan-generator" },
      { label: "健診の年間スケジュールを作る", href: "/health-checkup-scheduler" },
    ],
  },
  {
    no: "STEP 3",
    title: "回す（月次運用）",
    body: "委員会の議題、ストレスチェック、化学物質RA、法改正ウォッチを毎月のサイクルに乗せます。",
    links: [
      { label: "メンタル対策・ストレスチェック実務", href: "/mental-health-management" },
      { label: "化学物質リスクアセスメント", href: "/chemical-ra" },
    ],
  },
];

// 規模別義務の早見（共通閾値「常時50人以上」を中心に。業種で異なる項目は要確認と明示）
const DUTY_TABLE = [
  { item: "衛生管理者の選任", threshold: "常時50人以上", note: "規模に応じて人数増。安衛法第12条・安衛則第7条" },
  { item: "産業医の選任", threshold: "常時50人以上", note: "1,000人以上等は専属。安衛法第13条" },
  { item: "（安全）衛生委員会の設置", threshold: "常時50人以上", note: "毎月1回以上開催・議事録3年保存。安衛則第22〜23条" },
  { item: "ストレスチェックの実施", threshold: "常時50人以上が義務", note: "年1回・50人未満は努力義務。安衛法第66条の10" },
  { item: "定期健康診断", threshold: "規模を問わず", note: "雇入れ時＋年1回。安衛則第43〜44条" },
  { item: "安全管理者の選任", threshold: "一定業種で50人以上", note: "対象業種は要確認。安衛法第11条" },
];

// 月次運用の例
const MONTHLY_TOPICS = [
  { month: "毎月", topic: "（安全）衛生委員会の開催・議事録作成 (3年保存)" },
  { month: "4月", topic: "新年度の安全衛生方針・体制の周知。新規採用者の雇入れ時健診・教育" },
  { month: "5〜9月", topic: "熱中症予防 (WBGT・休憩計画)。ストレスチェック実施準備" },
  { month: "7月", topic: "全国安全週間 (7/1〜7/7) に合わせた点検・啓発" },
  { month: "10月", topic: "全国労働衛生週間。定期健診結果のフォロー・就業判定" },
  { month: "通年", topic: "化学物質RAの見直し・法改正の反映・是正記録の蓄積" },
];

export default function ForManagerPage() {
  return (
    <PageContainer width="full">
      <JsonLd
        schema={[
          webPageSchema({
            name: TITLE,
            description: DESCRIPTION,
            url: FULL_URL,
            keywords: [
              "安全衛生担当者",
              "衛生管理者",
              "産業医",
              "安全衛生委員会",
              "ストレスチェック",
              "健康診断",
              "化学物質管理",
              "年次安全衛生計画",
              "総務",
              "人事",
              "労働安全衛生コンサルタント",
            ],
          }),
          breadcrumbSchema([
            { name: "ホーム", url: "https://www.anzen-ai-portal.jp/" },
            { name: "立場から探す", url: "https://www.anzen-ai-portal.jp/" },
            { name: "企業の安全衛生担当者", url: FULL_URL },
          ]),
        ]}
      />

      {/* Hero */}
      <section className="rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-emerald-50 p-6 sm:p-10">
        <div className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-3 py-1 text-xs font-bold text-white">
          <Building2 className="h-3.5 w-3.5" />
          企業の安全衛生担当者（総務・人事）
        </div>
        <h1 className="mt-4 text-3xl font-extrabold leading-tight text-slate-900 sm:text-4xl">
          体制づくりから月次運用まで、迷わない。
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-700">
          「うちの規模だと何が義務？」「年次計画はどう作る？」を、体制づくり・計画・月次運用の3ステップで整理。
          専任の安全担当がいない総務・人事の方でも、ここから順にたどれば回せます。労働安全衛生コンサルタント (登録番号260022) 監修の無料の研究プロジェクトです。
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="#setup" className="inline-flex items-center gap-1.5 rounded-full bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-700">
            <ListChecks className="h-4 w-4" /> 3ステップで始める
          </Link>
          <Link href="#duties" className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700">
            <ShieldCheck className="h-4 w-4" /> 規模別の義務早見
          </Link>
          <Link href="#monthly" className="inline-flex items-center gap-1.5 rounded-full bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-700">
            <CalendarDays className="h-4 w-4" /> 月次運用
          </Link>
        </div>
      </section>

      {/* 3ステップ */}
      <section id="setup" className="mt-10 scroll-mt-20">
        <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
          <ListChecks className="h-5 w-5 text-sky-700" />
          立ち上げ・見直しの3ステップ
        </h2>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {SETUP_STEPS.map((s, i) => (
            <div key={i} className="flex flex-col rounded-2xl border-2 border-sky-200 bg-white p-5">
              <p className="text-[11px] font-bold uppercase tracking-widest text-sky-700">{s.no}</p>
              <p className="mt-1 text-lg font-bold text-slate-900">{s.title}</p>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{s.body}</p>
              <div className="mt-3 space-y-1.5">
                {s.links.map((l, j) => (
                  <Link key={j} href={l.href} className="flex items-center gap-1 rounded-md bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-800 hover:bg-sky-100">
                    {l.label} <ArrowRight className="ml-auto h-3 w-3" />
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 規模別義務早見 */}
      <section id="duties" className="mt-12 scroll-mt-20">
        <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
          <ShieldCheck className="h-5 w-5 text-emerald-700" />
          規模別の義務 早見表
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          多くの体制義務は「常時50人以上」が分かれ目です。業種で異なる項目 (安全管理者・安全委員会など) は対象業種の確認が必要です。
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border border-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="w-48 border-b border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">項目</th>
                <th className="w-40 border-b border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">主な閾値</th>
                <th className="border-b border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">根拠・補足</th>
              </tr>
            </thead>
            <tbody>
              {DUTY_TABLE.map((d, i) => (
                <tr key={i} className={i % 2 ? "bg-white" : "bg-slate-50/40"}>
                  <td className="border-b border-slate-200 px-3 py-2 font-bold text-slate-800">{d.item}</td>
                  <td className="border-b border-slate-200 px-3 py-2 font-semibold text-emerald-700">{d.threshold}</td>
                  <td className="border-b border-slate-200 px-3 py-2 text-slate-600">{d.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/chatbot?q=%E5%BD%93%E7%A4%BE%E3%81%AE%E4%BA%8B%E6%A5%AD%E5%A0%B4%E8%A6%8F%E6%A8%A1%E3%81%A7%E5%BF%85%E8%A6%81%E3%81%AA%E5%AE%89%E5%85%A8%E8%A1%9B%E7%94%9F%E4%BD%93%E5%88%B6%E3%82%92%E6%95%99%E3%81%88%E3%81%A6" className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700">
            自社の規模・業種で必要な体制を確認 →
          </Link>
          <Link href="/faq" className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-white px-3 py-1.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-50">
            FAQ 200問で確認 →
          </Link>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          ※ 閾値・対象業種・人数要件の正確な適用は、所轄労働基準監督署または産業医・労働安全衛生コンサルタントにご確認ください。
        </p>
      </section>

      {/* 主要テーマ別ツール */}
      <section id="tools" className="mt-12 scroll-mt-20">
        <h2 className="text-xl font-bold text-slate-900">テーマ別のツール</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: Brain, color: "violet", title: "メンタル・ストレスチェック", desc: "義務・面接指導・50人未満事業場の対応まで実務ガイドと書式。", href: "/mental-health-management" },
            { icon: Stethoscope, color: "emerald", title: "健康診断スケジューラ", desc: "業種・職種・物質・作業条件から必要健診と年間スケジュールを判定。", href: "/health-checkup-scheduler" },
            { icon: FlaskConical, color: "amber", title: "化学物質の自律管理", desc: "CREATE-SIMPLE準拠の簡易RA。約3,700物質の規制タグ・基準値も検索。", href: "/chemical-ra" },
            { icon: ListChecks, color: "sky", title: "年次安全衛生計画", desc: "13業種×3規模・39テンプレートから計画書を自動生成・保存。", href: "/strategy/plan-generator" },
            { icon: RefreshCw, color: "rose", title: "法改正ウォッチ", desc: "施行日カウントダウン付きの法改正カレンダーと新着情報。", href: "/whats-new" },
            { icon: CalendarDays, color: "slate", title: "安全工程打合せ書", desc: "各社の作業・予想災害・指示を1枚に。月次報告のまとめにも。", href: "/safety-diary" },
          ].map((t, i) => {
            const Icon = t.icon;
            return (
              <Link key={i} href={t.href} className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-400 hover:shadow-md">
                <Icon className="h-5 w-5 text-sky-700" />
                <p className="mt-2 text-sm font-bold text-slate-900 group-hover:text-sky-700">{t.title}</p>
                <p className="mt-1 flex-1 text-xs leading-relaxed text-slate-600">{t.desc}</p>
                <span className="mt-2 inline-flex items-center gap-0.5 text-xs font-semibold text-sky-700">開く <ArrowRight className="h-3 w-3" /></span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 月次運用 */}
      <section id="monthly" className="mt-12 scroll-mt-20">
        <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
          <CalendarDays className="h-5 w-5 text-violet-700" />
          月次・年間運用カレンダー
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border border-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="w-24 border-b border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">時期</th>
                <th className="border-b border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">重点</th>
              </tr>
            </thead>
            <tbody>
              {MONTHLY_TOPICS.map((t, i) => (
                <tr key={i} className={i % 2 ? "bg-white" : "bg-slate-50/40"}>
                  <td className="border-b border-slate-200 px-3 py-2 font-bold text-slate-700">{t.month}</td>
                  <td className="border-b border-slate-200 px-3 py-2 text-slate-700">{t.topic}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          （安全）衛生委員会は月1回以上の開催が義務 (安衛則第23条第1項)。議事録は3年保存。
        </p>
      </section>

      {/* 法令チャットCTA */}
      <section className="mt-12 rounded-2xl bg-gradient-to-r from-sky-600 to-emerald-600 p-6 text-white">
        <div className="flex items-start gap-4">
          <MessageSquare className="h-8 w-8 flex-shrink-0" />
          <div>
            <h2 className="text-xl font-bold">体制・義務の判断に迷ったら</h2>
            <p className="mt-2 text-sm leading-relaxed opacity-95">
              「常時50人の判定は？」「衛生管理者の資格は？」など、体制づくりの疑問を条文番号・出典付きで回答します。
            </p>
            <Link href="/chatbot" className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-bold text-sky-700 hover:bg-sky-50">
              法令チャットを開く →
            </Link>
          </div>
        </div>
      </section>

      {/* 関連: 業種ハブ */}
      <section className="mt-12 rounded-xl border border-slate-200 bg-slate-50/60 p-5">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-800">
          <Scale className="h-4 w-4" /> 業種別の重点を見る
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          製造・医療福祉・運輸・サービスなど、自社の業種に絞った課題・法令・KY例は業種ハブにまとまっています。
        </p>
        <Link href="/industries" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-sky-700 hover:underline">
          10業種ハブを開く →
        </Link>
      </section>

      {/* 統一CTA */}
      <div className="mt-10">
        <MainFeatureNextActions contextLabel="企業の安全衛生担当者ポータル" />
      </div>

      <p className="mt-8 text-xs text-slate-400">
        本ページは個人運営の研究プロジェクトです。義務の適用範囲・最新の施行内容は、所轄の労働基準監督署または産業医・労働安全衛生コンサルタント (登録番号260022 含む) にご確認ください。
      </p>
    </PageContainer>
  );
}
