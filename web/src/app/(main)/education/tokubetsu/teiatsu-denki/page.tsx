import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, Clock, FileText, Users, BookOpen, Building2, GraduationCap, MessageSquare, Mail, Download } from "lucide-react";
import { ogImageUrl } from "@/lib/og-url";
import { JsonLd } from "@/components/json-ld";
import { EducationContextSections } from "@/components/education/EducationContextSections";

const TITLE = "低圧電気取扱い 特別教育｜ANZEN AI";
const DESCRIPTION =
  "労働安全衛生規則第36条第4号に基づく低圧電気取扱い特別教育（学科7時間。活線・活線近接作業の場合は実技7時間追加で計14時間）。配電盤点検・電気工事補助者向けにオンデマンド・カスタマイズ・講師派遣の3形式で提供。1社10名¥50,000〜（税込）。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/education/tokubetsu/teiatsu-denki" },
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
  name: "低圧電気取扱い 特別教育",
  description: DESCRIPTION,
  url: "https://safe-ai-site.vercel.app/education/tokubetsu/teiatsu-denki",
  timeRequired: "PT7H",
  educationalLevel: "職場従事者",
  teaches: [
    "低圧の電気に関する基礎知識",
    "低圧の電気設備に関する基礎知識",
    "低圧用の安全作業用具に関する知識",
    "活線・活線近接作業の方法",
    "関係法令（安衛則第36条第4号・告示第137号）",
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
    audienceType: "配電盤・制御盤点検者・機械修理電気作業者・ビル管理電気作業者・保全エンジニア",
  },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "ANZEN AI", item: "https://safe-ai-site.vercel.app/" },
    { "@type": "ListItem", position: 2, name: "教育・研修", item: "https://safe-ai-site.vercel.app/education" },
    { "@type": "ListItem", position: 3, name: "低圧電気取扱い 特別教育", item: "https://safe-ai-site.vercel.app/education/tokubetsu/teiatsu-denki" },
  ],
};

const CURRICULUM = [
  { title: "低圧の電気に関する基礎知識", minutes: 60, desc: "電圧・電流・電力、抵抗とオームの法則、交流と直流、感電の人体影響を解説。" },
  { title: "低圧の電気設備に関する基礎知識", minutes: 120, desc: "配線・開閉器・電動機・配電盤、絶縁・接地、電気機器の構造と用途を整理。" },
  { title: "低圧用の安全作業用具に関する基礎知識", minutes: 60, desc: "絶縁用保護具・絶縁用防具・活線作業用器具、検電器の使用と日常点検方法。" },
  { title: "低圧の活線・活線近接作業の方法", minutes: 120, desc: "充電電路の防護・停電作業4STEP（検電→開放施錠→接地→作業）の具体手順。" },
  { title: "関係法令", minutes: 60, desc: "安衛法・安衛則・電気設備技術基準の要点を整理。" },
  { title: "実技（活線・活線近接作業を行う場合のみ）", minutes: 420, desc: "活線作業従事者は学科7時間に加え実技7時間を追加し、合計14時間以上を実施。" },
];

const TARGETS = [
  "配電盤・制御盤の点検作業者",
  "機械修理 電気作業者",
  "ビル管理 電気作業者",
  "保全エンジニア",
  "電気工事補助者",
];

const FORMATS = [
  {
    icon: BookOpen,
    title: "オンデマンド配信",
    price: "¥50,000（税込）／1社10名",
    addPrice: "追加1名あたり¥3,300（税込）",
    note: "2026年秋リリース予定",
    desc: "学科7時間を動画で任意のタイミングに受講。活線実技を伴う場合は講師派遣との組合せが必要。",
  },
  {
    icon: Users,
    title: "カスタマイズ研修",
    price: "¥165,000〜（税込）／1コース",
    addPrice: "納期 約3週間",
    note: undefined,
    desc: "貴社の電気設備・配電盤構成に合わせた専用テキスト・動画を制作。法定7時間／14時間を満たすカリキュラムを設計。",
  },
  {
    icon: Building2,
    title: "講師派遣",
    price: "Zoom ¥88,000〜 ／ 現地（東京都内）¥132,000〜（税込）",
    addPrice: "遠方対応可（別途交通費）",
    note: "活線実技を伴う場合は推奨",
    desc: "労働安全コンサルタントが講師として登壇。検電・LOTO・絶縁保護具の実技指導と修了証発行までワンストップで対応。",
  },
];

const FAQS = [
  {
    q: "学科7時間と計14時間の違いは何ですか？",
    a: "充電部の活線・活線近接作業を行うか否かで分かれます。停電作業のみの場合は学科7時間で完了し、活線または活線近接作業を行う場合は学科7時間に加えて実技7時間が必要となり、合計14時間以上を実施します（安衛則第36条第4号・特別教育規程第6条）。",
  },
  {
    q: "第二種電気工事士を保有している場合も必要ですか？",
    a: "必要です。電気工事士免許は工事の資格、特別教育は労働者が低圧電気取扱業務に就くための教育であり、別制度です。免許保有者であっても、低圧電気取扱業務に就く前に本特別教育の受講が義務付けられています。",
  },
  {
    q: "教育内容を自社の現場に合わせてカスタマイズできますか？",
    a: "可能です。業種・現場の電気設備・想定作業（配電盤点検・モータ交換・盤内配線変更等）に合わせて学科内容を調整し、実技も貴社設備で実施できます。カスタマイズ研修・講師派遣のいずれかをご選択ください。",
  },
];

const RELATED_LINKS = [
  { label: "研削といし特別教育", href: "/education/tokubetsu/kensaku-toishi" },
  { label: "足場組立て特別教育", href: "/education/tokubetsu/ashiba" },
  { label: "フルハーネス特別教育", href: "/education/tokubetsu/fullharness" },
  { label: "玉掛け特別教育", href: "/education/tokubetsu/tamakake" },
];

export default function TeiatsuDenkiPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      <JsonLd schema={courseSchema} />
      <JsonLd schema={breadcrumbSchema} />

      {/* パンくず */}
      <nav className="mb-4 flex items-center gap-1.5 text-xs text-slate-500" aria-label="パンくずリスト">
        <Link href="/education" className="hover:underline hover:text-slate-700">教育メニュー</Link>
        <span aria-hidden="true">›</span>
        <span className="text-slate-700">低圧電気取扱い 特別教育</span>
      </nav>

      {/* ヘッダー */}
      <header className="mb-8">
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-0.5 text-xs font-bold text-amber-800">
            <GraduationCap className="mr-1 h-3 w-3" />
            特別教育
          </span>
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-0.5 text-xs font-semibold text-slate-600">
            省令ベース
          </span>
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-0.5 text-xs font-semibold text-slate-600">
            <Clock className="mr-1 h-3 w-3" />
            約7時間（活線作業時14時間）
          </span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">低圧電気取扱い 特別教育</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
          配電盤・制御盤の点検や機械修理など、低圧電気取扱業務に就く労働者を対象に、労働安全衛生規則第36条第4号に基づく特別教育を実施します。停電作業4STEP・絶縁保護具・検電など、感電災害防止の実務を体系的に学べます。
        </p>
      </header>

      {/* 法的根拠 */}
      <section className="mb-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <h2 className="mb-3 text-base font-bold text-slate-900">法的根拠</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
            <dt className="w-28 shrink-0 font-semibold text-slate-700">根拠</dt>
            <dd className="text-slate-600">
              労働安全衛生規則 第36条第4号
            </dd>
          </div>
          <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
            <dt className="w-28 shrink-0 font-semibold text-slate-700">関連条文</dt>
            <dd className="text-slate-600">労働安全衛生規則 第38条／告示第137号（低圧電気取扱業務に係る特別教育）</dd>
          </div>
          <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
            <dt className="w-28 shrink-0 font-semibold text-slate-700">指針原文</dt>
            <dd>
              <a
                href="https://laws.e-gov.go.jp/law/347M50002000032"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-emerald-700 hover:underline"
              >
                e-Gov法令検索（労働安全衛生規則）
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
              <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
              {t}
            </li>
          ))}
        </ul>
      </section>

      {/* カリキュラム */}
      <section className="mb-8">
        <h2 className="mb-3 text-base font-bold text-slate-900">
          教育内容（カリキュラム）
          <span className="ml-2 text-sm font-normal text-slate-500">学科7時間以上（活線実技を行う場合 計14時間以上）</span>
        </h2>
        <div className="space-y-3">
          {CURRICULUM.map((item, i) => (
            <div key={item.title} className="flex gap-4 rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
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
        <p className="mt-2 text-xs text-slate-500">※ カスタマイズ対応可能。受講者の業種・取扱設備に応じて項目・時間配分を調整します。</p>
      </section>

      {/* 受講形式と料金 */}
      <section className="mb-8">
        <h2 className="mb-3 text-base font-bold text-slate-900">受講形式と料金（税込）</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {FORMATS.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
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
                <p className="mt-3 text-sm font-bold text-emerald-700">{f.price}</p>
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
              実際のカリキュラム構成に沿ったセミナー資料の一部を無料でご覧いただけます。表紙・目次・学科4要素・停電作業4STEP・ヒューマンエラー防止5ステップ等、低圧電気取扱い特別教育の構成がそのまま把握できます。
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <a
                href="/seminars/teiatsu-denki.pptx"
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
        <FileText className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
        <div>
          <h2 className="text-sm font-bold text-slate-900">修了証</h2>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            PDF形式で発行します（2026年秋より対応予定）。受講記録は安衛則第38条に基づき3年以上保存することが推奨されます。
          </p>
        </div>
      </section>

      {/* 業種別統計・実事故事例・関連法令・チェックリスト・監修者コメント */}
      <EducationContextSections slug="tokubetsu/teiatsu-denki" />

      {/* FAQ */}
      <section className="mb-8">
        <h2 className="mb-4 text-base font-bold text-slate-900">よくあるご質問</h2>
        <div className="space-y-4">
          {FAQS.map((faq) => (
            <details
              key={faq.q}
              className="group rounded-xl border border-slate-200 bg-white"
            >
              <summary className="flex cursor-pointer items-start gap-3 px-4 py-3 text-sm font-semibold text-slate-900 hover:text-emerald-700 list-none">
                <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden="true" />
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
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-emerald-400 hover:text-emerald-700 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6">
        <p className="text-base font-bold text-emerald-900">低圧電気特別教育のご相談・お見積り</p>
        <p className="mt-1 text-sm text-slate-600">受講人数・業種・希望時期をお知らせください。原則3営業日以内にご返信します。</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/contact?category=education&course=teiatsu-denki"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors"
          >
            <Mail className="h-4 w-4" />
            無料相談
          </Link>
          <Link
            href="/contact?category=education&course=teiatsu-denki&type=document"
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-600 bg-white px-5 py-2.5 text-sm font-bold text-emerald-700 hover:bg-emerald-50 transition-colors"
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
