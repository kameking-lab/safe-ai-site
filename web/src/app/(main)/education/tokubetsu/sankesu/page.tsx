import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, Clock, FileText, Users, BookOpen, Building2, GraduationCap, MessageSquare, Mail, Download } from "lucide-react";
import { ogImageUrl } from "@/lib/og-url";
import { JsonLd } from "@/components/json-ld";

const TITLE = "酸素欠乏危険作業 特別教育｜ANZEN AI";
const DESCRIPTION =
  "酸素欠乏症等防止規則第12条に基づく第一種・第二種の酸素欠乏危険作業特別教育（約5.5時間）。地下ピット・タンク・下水道作業者向けにオンデマンド・カスタマイズ・講師派遣の3形式で提供。1社10名¥50,000〜（税込）。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/education/tokubetsu/sankesu" },
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
  name: "酸素欠乏危険作業 特別教育",
  description: DESCRIPTION,
  url: "https://safe-ai-site.vercel.app/education/tokubetsu/sankesu",
  timeRequired: "PT5H30M",
  educationalLevel: "酸素欠乏危険場所作業従事者",
  teaches: [
    "酸素欠乏の発生原因と症状",
    "換気・保護具・救助方法",
    "関係法令",
    "酸素濃度測定（実技）",
    "救助・退避訓練（実技）",
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
    audienceType: "地下ピット・マンホール・タンク内作業者・果実野菜貯蔵庫作業者・不活性ガス区画立入作業者・下水道メンテ作業者・トンネル坑内作業者",
  },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "ANZEN AI", item: "https://safe-ai-site.vercel.app/" },
    { "@type": "ListItem", position: 2, name: "教育・研修", item: "https://safe-ai-site.vercel.app/education" },
    { "@type": "ListItem", position: 3, name: "酸素欠乏危険作業 特別教育", item: "https://safe-ai-site.vercel.app/education/tokubetsu/sankesu" },
  ],
};

const CURRICULUM = [
  { title: "酸欠の発生原因と症状", minutes: 60, desc: "微生物による酸素消費・酸化反応・不活性ガス置換などの発生機序と濃度別の症状を解説。" },
  { title: "換気・保護具・救助方法", minutes: 120, desc: "強制換気、酸素濃度計、空気呼吸器、送気マスク、命綱・墜落制止用器具の選定と使用方法を学習。" },
  { title: "関係法令", minutes: 30, desc: "酸欠則・安衛法・関係省令の関係条項を整理。第一種と第二種の区分も確認。" },
  { title: "酸素濃度測定（実技）", minutes: 60, desc: "酸素濃度計・硫化水素濃度計を用いた上層・中層・下層の3点測定実習。" },
  { title: "救助・退避訓練（実技）", minutes: 60, desc: "空気呼吸器装着・命綱を用いた救助手順と退避動作を訓練。二次災害防止の徹底。" },
];

const TARGETS = [
  "地下ピット・マンホール・タンク内作業者",
  "果実・野菜貯蔵庫作業者",
  "不活性ガス区画 立入作業者",
  "下水道・浄化槽メンテ作業者",
  "トンネル・坑内作業者",
];

const FORMATS = [
  {
    icon: BookOpen,
    title: "オンデマンド配信",
    price: "¥50,000（税込）／1社10名",
    addPrice: "追加1名あたり¥3,300（税込）",
    note: "2026年秋リリース予定",
    desc: "学科部分を動画で任意のタイミングに受講。受講進捗管理画面に対応。スマホ・PC両対応。",
  },
  {
    icon: Users,
    title: "カスタマイズ研修",
    price: "¥165,000〜（税込）／1コース",
    addPrice: "納期 約3週間",
    note: undefined,
    desc: "貴社の現場・作業場所・取扱い物質に合わせた専用テキスト・動画を制作。法定5.5時間を満たすカリキュラムを設計。",
  },
  {
    icon: Building2,
    title: "講師派遣",
    price: "Zoom ¥88,000〜 ／ 現地（東京都内）¥132,000〜（税込）",
    addPrice: "遠方対応可（別途交通費）",
    note: undefined,
    desc: "労働安全コンサルタントが講師として登壇。学科・実技・修了証発行をワンストップで対応。",
  },
];

const FAQS = [
  {
    q: "第一種と第二種の違いは何ですか？",
    a: "第一種は酸素欠乏のみを対象とし、第二種は酸素欠乏に加えて硫化水素中毒も対象に含みます。両方の危険があるおそれがある場所（下水道・し尿処理施設など）では第二種を受講してください。",
  },
  {
    q: "法定の酸素濃度・硫化水素濃度はどの程度ですか？",
    a: "酸素欠乏症等防止規則では、酸素濃度18%以上を維持することが定められています。硫化水素については10ppm以下が基準です。これらを下回る場合は即時退避が必要です。",
  },
  {
    q: "監視員の常時配置は必要ですか？",
    a: "酸素欠乏症等防止規則第14条等に基づき、酸素欠乏危険作業中の監視員配置は必須です。入槽者と槽外で常時連絡を取り、異常時に即座に救助手順を開始できる体制を整備してください。",
  },
];

const RELATED_LINKS = [
  { label: "フルハーネス特別教育", href: "/contact?category=education&course=フルハーネス特別教育" },
  { label: "玉掛け特別教育（1t未満）", href: "/contact?category=education&course=玉掛け特別教育" },
  { label: "アーク溶接特別教育", href: "/contact?category=education&course=アーク溶接特別教育" },
  { label: "低圧電気取扱業務特別教育", href: "/contact?category=education&course=低圧電気取扱業務特別教育" },
];

export default function SankesuPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      <JsonLd schema={courseSchema} />
      <JsonLd schema={breadcrumbSchema} />

      {/* パンくず */}
      <nav className="mb-4 flex items-center gap-1.5 text-xs text-slate-500" aria-label="パンくずリスト">
        <Link href="/education" className="hover:underline hover:text-slate-700">教育メニュー</Link>
        <span aria-hidden="true">›</span>
        <span className="text-slate-700">酸素欠乏危険作業 特別教育</span>
      </nav>

      {/* ヘッダー */}
      <header className="mb-8">
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-0.5 text-xs font-bold text-amber-700">
            <GraduationCap className="mr-1 h-3 w-3" />
            特別教育
          </span>
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-0.5 text-xs font-semibold text-slate-600">
            規則ベース
          </span>
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-0.5 text-xs font-semibold text-slate-600">
            <Clock className="mr-1 h-3 w-3" />
            約5.5時間
          </span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">酸素欠乏危険作業 特別教育</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
          地下ピット・タンク内・マンホールなどの酸素欠乏危険場所で作業に従事する労働者を対象に、酸素欠乏症等防止規則第12条に基づく第一種・第二種の特別教育を実施します。
        </p>
      </header>

      {/* 法的根拠 */}
      <section className="mb-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <h2 className="mb-3 text-base font-bold text-slate-900">法的根拠</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
            <dt className="w-28 shrink-0 font-semibold text-slate-700">根拠</dt>
            <dd className="text-slate-600">
              酸素欠乏症等防止規則 第12条
            </dd>
          </div>
          <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
            <dt className="w-28 shrink-0 font-semibold text-slate-700">関連条文</dt>
            <dd className="text-slate-600">安衛法第59条第3項／酸欠則 第3条（作業環境測定）／第5条（換気）</dd>
          </div>
          <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
            <dt className="w-28 shrink-0 font-semibold text-slate-700">指針原文</dt>
            <dd>
              <a
                href="https://laws.e-gov.go.jp/law/347M50002000042"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-amber-700 hover:underline"
              >
                e-Gov法令検索（酸素欠乏症等防止規則）
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
              <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-amber-500" aria-hidden="true" />
              {t}
            </li>
          ))}
        </ul>
      </section>

      {/* カリキュラム */}
      <section className="mb-8">
        <h2 className="mb-3 text-base font-bold text-slate-900">
          教育内容（カリキュラム）
          <span className="ml-2 text-sm font-normal text-slate-500">合計約5.5時間</span>
        </h2>
        <div className="space-y-3">
          {CURRICULUM.map((item, i) => (
            <div key={item.title} className="flex gap-4 rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-700">
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
        <p className="mt-2 text-xs text-slate-500">※ 第二種は硫化水素中毒に関する内容を含みます。受講者の作業場所に応じて第一種・第二種を選択ください。</p>
      </section>

      {/* 受講形式と料金 */}
      <section className="mb-8">
        <h2 className="mb-3 text-base font-bold text-slate-900">受講形式と料金（税込）</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {FORMATS.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
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
                <p className="mt-3 text-sm font-bold text-amber-700">{f.price}</p>
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
              実際のカリキュラム構成に沿ったセミナー資料の一部を無料でご覧いただけます。表紙・目次・学科法定4区分・入槽前4STEP・リスク場所と保護具・救助5ステップ等、特別教育の構成がそのまま把握できます。
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <a
                href="/seminars/sankesu.pptx"
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
        <FileText className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div>
          <h2 className="text-sm font-bold text-slate-900">修了証</h2>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            PDF形式で発行します（2026年秋より対応予定）。修了証は3年間保存することを推奨します。
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="mb-8">
        <h2 className="mb-4 text-base font-bold text-slate-900">よくあるご質問</h2>
        <div className="space-y-4">
          {FAQS.map((faq) => (
            <details
              key={faq.q}
              className="group rounded-xl border border-slate-200 bg-white"
            >
              <summary className="flex cursor-pointer items-start gap-3 px-4 py-3 text-sm font-semibold text-slate-900 hover:text-amber-700 list-none">
                <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
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
        <h2 className="mb-3 text-sm font-bold text-slate-700">関連する特別教育</h2>
        <div className="flex flex-wrap gap-2">
          {RELATED_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-amber-400 hover:text-amber-700 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-6">
        <p className="text-base font-bold text-amber-900">酸素欠乏危険作業特別教育のご相談・お見積り</p>
        <p className="mt-1 text-sm text-slate-600">受講人数・業種・希望時期をお知らせください。原則3営業日以内にご返信します。</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/contact?category=education&course=sankesu"
            className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-amber-700 transition-colors"
          >
            <Mail className="h-4 w-4" />
            無料相談
          </Link>
          <Link
            href="/contact?category=education&course=sankesu&type=document"
            className="inline-flex items-center gap-2 rounded-lg border border-amber-600 bg-white px-5 py-2.5 text-sm font-bold text-amber-700 hover:bg-amber-50 transition-colors"
          >
            <FileText className="h-4 w-4" />
            資料請求
          </Link>
        </div>
      </section>

      {/* 監修者 */}
      <p className="mt-6 text-center text-xs text-slate-400">
        労働安全コンサルタント（登録番号260022・土木区分）監修
      </p>
    </main>
  );
}
