import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, Clock, FileText, Users, BookOpen, Building2, GraduationCap, MessageSquare, Mail, Download } from "lucide-react";
import { ogImageUrl } from "@/lib/og-url";
import { JsonLd } from "@/components/json-ld";
import { EducationContextSections } from "@/components/education/EducationContextSections";

const TITLE = "フルハーネス型墜落制止用器具 特別教育｜ANZEN AI";
const DESCRIPTION =
  "労働安全衛生規則第36条第41号に基づくフルハーネス型墜落制止用器具の特別教育（学科4.5h+実技1.5h、計約6時間）。高所作業従事者向けにオンデマンド・カスタマイズ・講師派遣の3形式で提供。1社10名¥50,000〜（税込）。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/education/tokubetsu/fullharness" },
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
  name: "フルハーネス型墜落制止用器具 特別教育",
  description: DESCRIPTION,
  url: "https://safe-ai-site.vercel.app/education/tokubetsu/fullharness",
  timeRequired: "PT6H",
  educationalLevel: "高所作業従事者",
  teaches: [
    "作業に関する知識",
    "墜落制止用器具に関する知識",
    "労働災害の防止に関する知識",
    "関係法令",
    "墜落制止用器具の装着・使用方法（実技）",
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
    audienceType: "高さ2m以上の作業床がない箇所での作業者・屋根工事・鉄骨工事・足場組立解体・橋梁/タンク工事・設備保全従事者",
  },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "ANZEN AI", item: "https://safe-ai-site.vercel.app/" },
    { "@type": "ListItem", position: 2, name: "教育・研修", item: "https://safe-ai-site.vercel.app/education" },
    { "@type": "ListItem", position: 3, name: "フルハーネス型墜落制止用器具 特別教育", item: "https://safe-ai-site.vercel.app/education/tokubetsu/fullharness" },
  ],
};

const CURRICULUM = [
  { title: "作業に関する知識", minutes: 60, desc: "高所作業の種類・設備・取扱い、作業に伴う災害事例とその防止方法を解説。" },
  { title: "墜落制止用器具に関する知識", minutes: 120, desc: "フルハーネス・ランヤード・接続器具の構造・規格・点検・選定基準を学習。" },
  { title: "労働災害の防止に関する知識", minutes: 60, desc: "墜落防止措置、宙吊り対応、救助手順、応急処置を体系的に習得。" },
  { title: "関係法令", minutes: 30, desc: "安衛法・安衛令・安衛則第36条第41号関連条項および構造規格・ガイドライン。" },
  { title: "装着・使用方法（実技）", minutes: 90, desc: "ハーネス装着・取付け・始業前点検の実習。胸/腿ベルト調整とフック掛けの実演。" },
];

const TARGETS = [
  "高さ2m以上の作業床がない箇所での作業者",
  "屋根工事・鉄骨工事業者",
  "足場上での組立解体作業者",
  "橋梁・タンク工事従事者",
  "設備保全・点検技術者",
];

const FORMATS = [
  {
    icon: BookOpen,
    title: "オンデマンド配信",
    price: "¥50,000（税込）／1社10名",
    addPrice: "追加1名あたり¥3,300（税込）",
    note: "2026年秋リリース予定",
    desc: "動画で任意のタイミングに学科を受講。受講進捗管理画面に対応。スマホ・PC両対応。",
  },
  {
    icon: Users,
    title: "カスタマイズ研修",
    price: "¥165,000〜（税込）／1コース",
    addPrice: "納期 約3週間",
    note: undefined,
    desc: "貴社の現場・設備・事例に合わせた専用テキスト・動画を制作。法定6時間を満たすカリキュラムを設計。",
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
    q: "胴ベルト型ハーネスでもよいですか？",
    a: "2022年1月以降、高さ6.75m超の作業では原則フルハーネス型が必須となりました。建設業では5m超でもフルハーネスが推奨されます。胴ベルト型は限定的な用途のみ使用可能です。",
  },
  {
    q: "既受講者は再教育が必要ですか？",
    a: "厚生労働省告示第11号に定められた科目と同等内容を受講済の場合、再教育は不要です。法定資格証や修了証で受講済みであることが確認できれば、受講免除の判断材料となります。",
  },
  {
    q: "屋外足場のみの作業も対象ですか？",
    a: "高さ2m超で作業床がない箇所での作業は、足場の有無にかかわらず対象となります。作業形態と高さを確認したうえで受講要否をご判断ください。",
  },
];

const RELATED_LINKS = [
  { label: "玉掛け特別教育（1t未満）", href: "/contact?category=education&course=玉掛け特別教育" },
  { label: "酸素欠乏危険作業特別教育", href: "/contact?category=education&course=酸素欠乏危険作業特別教育" },
  { label: "アーク溶接特別教育", href: "/contact?category=education&course=アーク溶接特別教育" },
  { label: "低圧電気取扱業務特別教育", href: "/contact?category=education&course=低圧電気取扱業務特別教育" },
];

export default function FullharnessPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      <JsonLd schema={courseSchema} />
      <JsonLd schema={breadcrumbSchema} />

      {/* パンくず */}
      <nav className="mb-4 flex items-center gap-1.5 text-xs text-slate-500" aria-label="パンくずリスト">
        <Link href="/education" className="hover:underline hover:text-slate-700">教育メニュー</Link>
        <span aria-hidden="true">›</span>
        <span className="text-slate-700">フルハーネス型墜落制止用器具 特別教育</span>
      </nav>

      {/* ヘッダー */}
      <header className="mb-8">
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-0.5 text-xs font-bold text-amber-700">
            <GraduationCap className="mr-1 h-3 w-3" />
            特別教育
          </span>
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-0.5 text-xs font-semibold text-slate-600">
            省令ベース
          </span>
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-0.5 text-xs font-semibold text-slate-600">
            <Clock className="mr-1 h-3 w-3" />
            約6時間
          </span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">フルハーネス型墜落制止用器具 特別教育</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
          高さ2m以上の作業床がない箇所でフルハーネス型墜落制止用器具を用いて作業に従事する労働者を対象に、労働安全衛生規則第36条第41号および厚生労働省告示第11号に基づく特別教育を実施します。
        </p>
      </header>

      {/* 法的根拠 */}
      <section className="mb-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <h2 className="mb-3 text-base font-bold text-slate-900">法的根拠</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
            <dt className="w-28 shrink-0 font-semibold text-slate-700">根拠</dt>
            <dd className="text-slate-600">
              労働安全衛生規則 第36条第41号
            </dd>
          </div>
          <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
            <dt className="w-28 shrink-0 font-semibold text-slate-700">関連条文</dt>
            <dd className="text-slate-600">安衛則第518条〜第521条／厚生労働省告示第11号（2018年）</dd>
          </div>
          <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
            <dt className="w-28 shrink-0 font-semibold text-slate-700">指針原文</dt>
            <dd>
              <a
                href="https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/roudoukijun/anzen/0000200468.html"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-amber-700 hover:underline"
              >
                厚生労働省ウェブサイト（フルハーネス型墜落制止用器具の使用に関する指針）
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
          <span className="ml-2 text-sm font-normal text-slate-500">学科4.5時間＋実技1.5時間</span>
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
        <p className="mt-2 text-xs text-slate-500">※ カスタマイズ対応可能。受講者の業種・作業内容に応じて項目・時間配分を調整します。</p>
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
              実際のカリキュラム構成に沿ったセミナー資料の一部を無料でご覧いただけます。表紙・目次・学科法定4区分・装着4STEP・ランヤード選定・救助5ステップ等、特別教育の構成がそのまま把握できます。
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <a
                href="/seminars/fullharness.pptx"
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

      {/* 業種別統計・実事故事例・関連法令・チェックリスト・監修者コメント */}
      <EducationContextSections slug="tokubetsu/fullharness" />

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
        <p className="text-base font-bold text-amber-900">フルハーネス特別教育のご相談・お見積り</p>
        <p className="mt-1 text-sm text-slate-600">受講人数・業種・希望時期をお知らせください。原則3営業日以内にご返信します。</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/contact?category=education&course=fullharness"
            className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-amber-700 transition-colors"
          >
            <Mail className="h-4 w-4" />
            無料相談
          </Link>
          <Link
            href="/contact?category=education&course=fullharness&type=document"
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
