import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, Clock, FileText, Users, BookOpen, Building2, GraduationCap, MessageSquare, Mail, Download } from "lucide-react";
import { ogImageUrl } from "@/lib/og-url";
import { JsonLd } from "@/components/json-ld";

const TITLE = "熱中症予防 労働衛生教育｜ANZEN AI";
const DESCRIPTION =
  "厚生労働省「職場における熱中症予防基本対策要綱」（基発0420第3号）と2025年6月施行の安衛則改正に基づく約1.5時間の労働衛生教育。屋外・高温環境作業向けにオンデマンド・カスタマイズ・講師派遣の3形式で提供。1社10名¥50,000〜（税込）。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/education/roudoueisei/necchu" },
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
  name: "熱中症予防 労働衛生教育",
  description: DESCRIPTION,
  url: "https://safe-ai-site.vercel.app/education/roudoueisei/necchu",
  timeRequired: "PT1H30M",
  educationalLevel: "職場従事者",
  teaches: [
    "熱中症の発生メカニズムと症状",
    "WBGT測定と作業環境管理",
    "水分・塩分摂取と暑熱順化",
    "緊急時対応と応急処置",
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
    audienceType: "屋外作業従事者・高温環境作業者・警備・清掃・運輸業 等",
  },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "ANZEN AI", item: "https://safe-ai-site.vercel.app/" },
    { "@type": "ListItem", position: 2, name: "教育・研修", item: "https://safe-ai-site.vercel.app/education" },
    { "@type": "ListItem", position: 3, name: "熱中症予防 労働衛生教育", item: "https://safe-ai-site.vercel.app/education/roudoueisei/necchu" },
  ],
};

const CURRICULUM = [
  { title: "熱中症の発生メカニズムと症状", minutes: 15, desc: "体温調節の破綻と段階別症状（I〜III度）、業務上熱中症の発生動向を解説。" },
  { title: "WBGT測定と作業環境管理", minutes: 30, desc: "JIS Z 8504準拠のWBGT測定、作業強度別基準値、遮熱・送風・休憩室整備の実務。" },
  { title: "水分・塩分摂取・暑熱順化", minutes: 15, desc: "計画的な補給時刻と量、塩分濃度0.1〜0.2%、5日〜2週間の暑熱順化計画。" },
  { title: "緊急時対応と応急処置", minutes: 30, desc: "意識確認→涼所搬送・冷却→119通報→記録報告の4STEPと連絡網整備。" },
];

const TARGETS = [
  "屋外作業従事者（建設・農林業）",
  "製造業の高温環境作業者",
  "警備員・交通誘導員",
  "清掃・廃棄物処理業従事者",
  "運輸業の積卸し・配送担当",
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
    desc: "貴社の現場・作業強度・WBGT実測値に合わせた専用テキスト・動画を制作。約1.5時間以上のカリキュラムを設計。",
  },
  {
    icon: Building2,
    title: "講師派遣",
    price: "Zoom ¥88,000〜 ／ 現地（東京都内）¥132,000〜（税込）",
    addPrice: "遠方対応可（別途交通費）",
    note: undefined,
    desc: "労働安全コンサルタントが講師として登壇。実技・質疑応答・修了証発行をワンストップで対応。",
  },
];

const FAQS = [
  {
    q: "2025年6月の改正で何が変わりましたか？",
    a: "労働安全衛生規則の改正により、WBGT 28以上または気温31度以上の作業について、体制整備・報告および記録・緊急時対応の措置が事業者の義務となりました。本教育は改正内容を踏まえた構成です。",
  },
  {
    q: "WBGT計はどのように選べばよいですか？",
    a: "JIS Z 8504に準拠し、屋内外区分の校正済機器を選定してください。直射日光下で使用する場合は黒球付きを推奨します。設置場所と測定頻度のご相談も承ります。",
  },
  {
    q: "屋内デスクワークも対象になりますか？",
    a: "空調管理下の事務室は通常対象外ですが、空調故障時や非空調倉庫、厨房等は対象となります。実態に応じてカスタマイズ研修で取り扱う範囲を調整します。",
  },
];

const RELATED_LINKS = [
  { label: "振動障害予防教育", href: "/education/roudoueisei/shindou" },
  { label: "騒音障害防止教育", href: "/education/roudoueisei/souon" },
  { label: "腰痛予防教育", href: "/education/roudoueisei/youtsu-yobou" },
  { label: "職長等教育", href: "/contact?category=education&course=職長等教育" },
];

export default function NecchuPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      <JsonLd schema={courseSchema} />
      <JsonLd schema={breadcrumbSchema} />

      {/* パンくず */}
      <nav className="mb-4 flex items-center gap-1.5 text-xs text-slate-500" aria-label="パンくずリスト">
        <Link href="/education" className="hover:underline hover:text-slate-700">教育メニュー</Link>
        <span aria-hidden="true">›</span>
        <span className="text-slate-700">熱中症予防 労働衛生教育</span>
      </nav>

      {/* ヘッダー */}
      <header className="mb-8">
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-0.5 text-xs font-bold text-emerald-700">
            <GraduationCap className="mr-1 h-3 w-3" />
            労働衛生教育
          </span>
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-0.5 text-xs font-semibold text-slate-600">
            通達ベース
          </span>
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-0.5 text-xs font-semibold text-slate-600">
            <Clock className="mr-1 h-3 w-3" />
            約1.5時間
          </span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">熱中症予防 労働衛生教育</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
          屋外作業や高温環境作業に従事する労働者を対象に、厚生労働省「職場における熱中症予防基本対策要綱」（基発0420第3号）と2025年6月施行の安衛則改正に基づく労働衛生教育を実施します。
        </p>
      </header>

      {/* 法的根拠 */}
      <section className="mb-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <h2 className="mb-3 text-base font-bold text-slate-900">法的根拠</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
            <dt className="w-28 shrink-0 font-semibold text-slate-700">根拠</dt>
            <dd className="text-slate-600">
              職場における熱中症予防基本対策要綱（基発0420第3号、令和3年4月20日付）
            </dd>
          </div>
          <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
            <dt className="w-28 shrink-0 font-semibold text-slate-700">関連条文</dt>
            <dd className="text-slate-600">
              <a
                href="https://laws.e-gov.go.jp/law/347M50002000032"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-emerald-700 hover:underline"
              >
                労働安全衛生規則 第612条の2（2025年6月1日施行）
                <ExternalLink className="h-3 w-3" />
              </a>
              ／
              <a
                href="https://laws.e-gov.go.jp/law/347AC0000000057"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-emerald-700 hover:underline"
              >
                労働安全衛生法 第22条
                <ExternalLink className="h-3 w-3" />
              </a>
              （健康障害防止措置）
            </dd>
          </div>
          <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
            <dt className="w-28 shrink-0 font-semibold text-slate-700">指針原文</dt>
            <dd>
              <a
                href="https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/roudoukijun/anzeneisei18/index.html"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-emerald-700 hover:underline"
              >
                厚生労働省ウェブサイト（職場における熱中症予防情報）
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
          <span className="ml-2 text-sm font-normal text-slate-500">合計約1.5時間</span>
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
              実際のカリキュラム構成に沿ったセミナー資料の一部を無料でご覧いただけます。表紙・目次・対策の4要素・WBGT基準値表・緊急時対応フロー・暑熱順化ステップ等、労働衛生教育の構成がそのまま把握できます。
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <a
                href="/seminars/necchu.pptx"
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
        <h2 className="mb-3 text-sm font-bold text-slate-700">関連する労働衛生教育</h2>
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
        <p className="text-base font-bold text-emerald-900">熱中症予防教育のご相談・お見積り</p>
        <p className="mt-1 text-sm text-slate-600">受講人数・業種・希望時期をお知らせください。原則3営業日以内にご返信します。</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/contact?category=education&course=necchu"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors"
          >
            <Mail className="h-4 w-4" />
            無料相談
          </Link>
          <Link
            href="/contact?category=education&course=necchu&type=document"
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
