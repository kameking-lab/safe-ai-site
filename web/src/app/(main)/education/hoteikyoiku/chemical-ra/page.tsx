import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, Clock, FileText, Users, BookOpen, Building2, GraduationCap, MessageSquare, Mail, Download } from "lucide-react";
import { ogImageUrl } from "@/lib/og-url";
import { JsonLd } from "@/components/json-ld";
import { EducationContextSections } from "@/components/education/EducationContextSections";

const TITLE = "化学物質RA実務教育｜ANZEN AI";
const DESCRIPTION =
  "労働安全衛生法第57条の3に基づく自律的化学物質管理対応の実務教育（約2.5〜4時間）。化学物質管理者選任候補・SDS管理担当・RA実務担当向けに、オンデマンド・カスタマイズ・講師派遣の3形式で提供。1社10名¥50,000〜（税込）。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/education/hoteikyoiku/chemical-ra" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: ogImageUrl(TITLE, DESCRIPTION), width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    images: [ogImageUrl(TITLE, DESCRIPTION)],
  },
};

const courseSchema = {
  "@context": "https://schema.org",
  "@type": "Course",
  name: "化学物質RA実務教育",
  description: DESCRIPTION,
  url: "https://safe-ai-site.vercel.app/education/hoteikyoiku/chemical-ra",
  timeRequired: "PT4H",
  educationalLevel: "化学物質管理担当・RA実務担当",
  teaches: [
    "化学物質規制の自律管理制度の概要",
    "SDS・GHS の読み方と化学物質特定",
    "リスクアセスメント手法（CREATE-SIMPLE等）",
    "ばく露低減対策の階層原則",
    "記録・教育・健康管理",
  ],
  provider: {
    "@type": "Organization",
    name: "ANZEN AI",
    url: "https://safe-ai-site.vercel.app",
  },
  offers: [
    {
      "@type": "Offer",
      name: "オンデマンド（1社10名）",
      price: "50000",
      priceCurrency: "JPY",
      priceSpecification: {
        "@type": "PriceSpecification",
        valueAddedTaxIncluded: true,
      },
    },
  ],
  hasCourseInstance: [
    {
      "@type": "CourseInstance",
      courseMode: "OnlineLive",
      name: "オンラインZoom講師派遣",
    },
    {
      "@type": "CourseInstance",
      courseMode: "Blended",
      name: "現地講師派遣（東京都内）",
    },
  ],
  inLanguage: "ja",
  isAccessibleForFree: false,
  audience: {
    "@type": "Audience",
    audienceType: "化学物質管理者選任候補・製造業工程管理者・SDS管理担当・RA実務担当",
  },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "ANZEN AI", item: "https://safe-ai-site.vercel.app/" },
    { "@type": "ListItem", position: 2, name: "教育・研修", item: "https://safe-ai-site.vercel.app/education" },
    { "@type": "ListItem", position: 3, name: "化学物質RA実務教育", item: "https://safe-ai-site.vercel.app/education/hoteikyoiku/chemical-ra" },
  ],
};

const CURRICULUM = [
  { title: "化学物質規制の自律管理制度の概要", minutes: 30, desc: "2022年5月公布の化学物質規制見直し、2024年4月／2026年4月段階施行のポイントを整理。" },
  { title: "SDS・GHS の読み方と化学物質特定", minutes: 30, desc: "SDS（安全データシート）の構成、GHS分類・ラベル表示、取扱物質一覧化の実務。" },
  { title: "リスクアセスメント手法（CREATE-SIMPLE等）", minutes: 90, desc: "CREATE-SIMPLE・ECETOC TRA・コントロール・バンディング・実測の使い分けと演習。" },
  { title: "ばく露低減対策の階層原則", minutes: 30, desc: "排除→代替→工学→管理→保護具の4階層と、呼吸用保護具・化学防護手袋の選定。" },
  { title: "記録・教育・健康管理", minutes: 60, desc: "RA記録（3年以上保存）、がん原性物質関連記録（30年保存）、関係者への教育と健診運用。" },
];

const TARGETS = [
  "化学物質管理者選任候補",
  "製造業 工程管理者",
  "研究開発担当",
  "SDS管理担当",
  "安全衛生管理担当",
  "リスクアセスメント実務担当",
];

const FORMATS = [
  {
    icon: BookOpen,
    title: "オンデマンド配信",
    price: "¥50,000（税込）／1社10名",
    addPrice: "追加1名あたり¥3,300（税込）",
    note: "2026年秋リリース予定",
    desc: "動画で任意のタイミングに受講。受講進捗管理画面に対応。スマホ・PC両対応。",
  },
  {
    icon: Users,
    title: "カスタマイズ研修",
    price: "¥165,000〜（税込）／1コース",
    addPrice: "納期 約3週間",
    note: undefined,
    desc: "貴社の取扱物質・SDS・工程に合わせた専用テキスト・演習を制作。CREATE-SIMPLE実演を含むカリキュラム設計。",
  },
  {
    icon: Building2,
    title: "講師派遣",
    price: "Zoom ¥88,000〜 ／ 現地（東京都内）¥132,000〜（税込）",
    addPrice: "遠方対応可（別途交通費）",
    note: undefined,
    desc: "労働安全コンサルタントが講師として登壇。RAグループ演習・質疑応答・修了証発行をワンストップで対応。",
  },
];

const FAQS = [
  {
    q: "対象物質は何種ありますか？",
    a: "2024年4月時点で約2,900物質がSDS交付・リスクアセスメント実施対象に拡大されています。従来の特化則・有機則等で規制されていた物質に加え、自律的管理制度の対象として段階的に追加されており、2026年4月までに完全施行予定です。",
  },
  {
    q: "化学物質管理者の選任は義務ですか？",
    a: "リスクアセスメント対象物を製造または取り扱う事業場では、化学物質管理者の選任が義務化されています（2024年4月施行・労働安全衛生規則第12条の5）。職務には管理計画の策定、教育、記録の作成・保存等が含まれます。",
  },
  {
    q: "記録の保存期間は？",
    a: "リスクアセスメント記録は通常3年以上の保存が求められます。ただし、がん原性物質として指定された物質の取扱記録は30年保存が必要です。健康診断結果や作業環境測定結果も別途保存期間が定められています。",
  },
];

const RELATED_LINKS = [
  { label: "職長等教育", href: "/education/hoteikyoiku/shokucho" },
  { label: "安全衛生推進者養成講習", href: "/contact?category=education&course=安全衛生推進者養成講習" },
  { label: "腰痛予防労働衛生教育", href: "/education/roudoueisei/youtsu-yobou" },
  { label: "有機溶剤業務従事者特別教育", href: "/contact?category=education&course=有機溶剤業務従事者特別教育" },
];

export default function ChemicalRaPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      <JsonLd schema={courseSchema} />
      <JsonLd schema={breadcrumbSchema} />

      {/* パンくず */}
      <nav className="mb-4 flex items-center gap-1.5 text-xs text-slate-500" aria-label="パンくずリスト">
        <Link href="/education" className="hover:underline hover:text-slate-700">教育メニュー</Link>
        <span aria-hidden="true">›</span>
        <span className="text-slate-700">化学物質RA実務教育</span>
      </nav>

      {/* ヘッダー */}
      <header className="mb-8">
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-0.5 text-xs font-bold text-sky-800">
            <GraduationCap className="mr-1 h-3 w-3" />
            法定教育
          </span>
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-0.5 text-xs font-semibold text-slate-600">
            法律ベース
          </span>
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-0.5 text-xs font-semibold text-slate-600">
            <Clock className="mr-1 h-3 w-3" />
            約2.5〜4時間
          </span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">化学物質RA実務教育</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
          労働安全衛生法第57条の3に基づく自律的化学物質管理制度に対応した実務教育。化学物質管理者選任候補・SDS管理担当・RA実務担当を対象に、CREATE-SIMPLE等の手法演習を含めて実施します。
        </p>
      </header>

      {/* 法的根拠 */}
      <section className="mb-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <h2 className="mb-3 text-base font-bold text-slate-900">法的根拠</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
            <dt className="w-28 shrink-0 font-semibold text-slate-700">根拠</dt>
            <dd className="text-slate-600">
              <a
                href="https://laws.e-gov.go.jp/law/347AC0000000057"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sky-700 hover:underline"
              >
                労働安全衛生法 第57条の3
                <ExternalLink className="h-3 w-3" />
              </a>
              （リスクアセスメント実施義務）
            </dd>
          </div>
          <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
            <dt className="w-28 shrink-0 font-semibold text-slate-700">関連条文</dt>
            <dd className="text-slate-600">
              <a
                href="https://laws.e-gov.go.jp/law/347M50002000032"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sky-700 hover:underline"
              >
                労働安全衛生規則 第34条の2の7
                <ExternalLink className="h-3 w-3" />
              </a>
              ／
              <a
                href="https://laws.e-gov.go.jp/law/347M50002000032"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sky-700 hover:underline"
              >
                同 第577条の2
                <ExternalLink className="h-3 w-3" />
              </a>
              ／化学物質規制の見直し（2022年5月公布、2024年4月／2026年4月段階施行）
            </dd>
          </div>
          <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
            <dt className="w-28 shrink-0 font-semibold text-slate-700">指針原文</dt>
            <dd>
              <a
                href="https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/roudoukijun/anzeneisei14/index.html"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sky-700 hover:underline"
              >
                厚生労働省ウェブサイト（化学物質規制の見直し）
                <ExternalLink className="h-3 w-3" />
              </a>
            </dd>
          </div>
        </dl>
      </section>

      {/* 対象者 */}
      <section className="mb-8">
        <h2 className="mb-3 text-base font-bold text-slate-900">対象者</h2>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {TARGETS.map((t) => (
            <li key={t} className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">
              <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-sky-500" aria-hidden="true" />
              {t}
            </li>
          ))}
        </ul>
      </section>

      {/* カリキュラム */}
      <section className="mb-8">
        <h2 className="mb-3 text-base font-bold text-slate-900">
          教育内容（カリキュラム）
          <span className="ml-2 text-sm font-normal text-slate-500">合計2.5〜4時間</span>
        </h2>
        <div className="space-y-3">
          {CURRICULUM.map((item, i) => (
            <div key={item.title} className="flex gap-4 rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sm font-bold text-sky-800">
                {i + 1}
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                  <span className="inline-flex items-center gap-0.5 text-xs text-slate-500">
                    <Clock className="h-3 w-3" />
                    {item.minutes}分
                  </span>
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-600">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">※ カスタマイズ対応可能。貴社の取扱物質・工程に応じて演習内容と時間配分を調整します。</p>
      </section>

      {/* 受講形式と料金 */}
      <section className="mb-8">
        <h2 className="mb-3 text-base font-bold text-slate-900">受講形式と料金（税込）</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {FORMATS.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 text-sky-800">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">{f.title}</h3>
                  {f.note && (
                    <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                      {f.note}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-600">{f.desc}</p>
                <p className="mt-3 text-sm font-bold text-sky-800">{f.price}</p>
                <p className="text-xs text-slate-500">{f.addPrice}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* サンプル資料ダウンロード */}
      <section className="mb-8 rounded-2xl border border-amber-300 bg-gradient-to-br from-amber-50 via-white to-slate-50 p-5 sm:p-6">
        <div className="flex flex-wrap items-start gap-4">
          <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <FileText className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-[240px]">
            <h2 className="text-base font-bold text-slate-900">
              サンプル資料ダウンロード <span className="ml-1 text-xs font-normal text-slate-500">PowerPoint 形式 / 10スライド</span>
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              実際のカリキュラム構成に沿ったセミナー資料の一部を無料でご覧いただけます。表紙・目次・自律管理4要素・RA 4STEP・リスク低減4階層・化学物質管理者の5責務等、実務教育の構成がそのまま把握できます。
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <a
                href="/seminars/chemical-ra.pptx"
                download
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-slate-800 transition-colors"
              >
                <Download className="h-4 w-4" />
                PPTXサンプルをダウンロード
              </a>
              <span className="inline-flex items-center text-xs text-slate-500">
                ※ カスタマイズ版・講師派遣版はお問い合わせください
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 修了証 */}
      <section className="mb-8 flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <FileText className="mt-0.5 h-5 w-5 shrink-0 text-sky-700" />
        <div>
          <h2 className="text-sm font-bold text-slate-900">修了証</h2>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            PDF形式で発行します（2026年秋より対応予定）。修了証は3年間保存することを推奨します。
          </p>
        </div>
      </section>

      {/* 業種別統計・実事故事例・関連法令・チェックリスト・監修者コメント */}
      <EducationContextSections slug="hoteikyoiku/chemical-ra" />

      {/* FAQ */}
      <section className="mb-8">
        <h2 className="mb-4 text-base font-bold text-slate-900">よくあるご質問</h2>
        <div className="space-y-4">
          {FAQS.map((faq) => (
            <details
              key={faq.q}
              className="group rounded-xl border border-slate-200 bg-white"
            >
              <summary className="flex cursor-pointer items-start gap-3 px-4 py-3 text-sm font-semibold text-slate-900 hover:text-sky-800 list-none">
                <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-sky-500" aria-hidden="true" />
                {faq.q}
              </summary>
              <p className="border-t border-slate-100 px-4 py-3 text-xs leading-6 text-slate-600">
                {faq.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* 関連教育 */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-bold text-slate-700">関連する教育</h2>
        <div className="flex flex-wrap gap-2">
          {RELATED_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-sky-400 hover:text-sky-800 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 to-white p-6">
        <p className="text-base font-bold text-sky-900">化学物質RA実務教育のご相談・お見積り</p>
        <p className="mt-1 text-sm text-slate-600">受講人数・取扱物質・希望時期をお知らせください。原則3営業日以内にご返信します。</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/contact?category=education&course=chemical-ra"
            className="inline-flex items-center gap-2 rounded-lg bg-sky-700 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-sky-800 transition-colors"
          >
            <Mail className="h-4 w-4" />
            無料相談
          </Link>
          <Link
            href="/contact?category=education&course=chemical-ra&type=document"
            className="inline-flex items-center gap-2 rounded-lg border border-sky-700 bg-white px-5 py-2.5 text-sm font-bold text-sky-800 hover:bg-sky-50 transition-colors"
          >
            <FileText className="h-4 w-4" />
            資料請求
          </Link>
        </div>
      </section>

      {/* 監修者 */}
      <p className="mt-6 text-center text-xs text-slate-400">
        ANZEN AI 専門家チームによる設計
      </p>
    </main>
  );
}
