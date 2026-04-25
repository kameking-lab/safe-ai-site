import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, Clock, FileText, Users, BookOpen, Building2, GraduationCap, MessageSquare, Mail, Download } from "lucide-react";
import { ogImageUrl } from "@/lib/og-url";
import { JsonLd } from "@/components/json-ld";

const TITLE = "騒音障害防止 労働衛生教育｜ANZEN AI";
const DESCRIPTION =
  "厚生労働省「騒音障害防止のためのガイドライン」（基発0420第2号、令和5年4月20日改訂）に基づく約1.5時間の労働衛生教育。等価騒音レベル LAeq,8h、管理区分判定、聴覚保護具（NRR/SNR）選定までをカバー。1社10名¥50,000〜（税込）。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/education/roudoueisei/souon" },
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
  name: "騒音障害防止 労働衛生教育",
  description: DESCRIPTION,
  url: "https://safe-ai-site.vercel.app/education/roudoueisei/souon",
  timeRequired: "PT1H30M",
  educationalLevel: "職場従事者",
  teaches: [
    "騒音性難聴の発生機序と聴覚特性",
    "等価騒音レベル LAeq,8h の測定と管理区分",
    "騒音源対策・伝播対策",
    "聴覚保護具（NRR/SNR）と聴力検査",
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
    audienceType: "製造業 機械加工・建設業 解体・運輸 整備・廃棄物処理 等の85dB以上作業環境従事者",
  },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "ANZEN AI", item: "https://safe-ai-site.vercel.app/" },
    { "@type": "ListItem", position: 2, name: "教育・研修", item: "https://safe-ai-site.vercel.app/education" },
    { "@type": "ListItem", position: 3, name: "騒音障害防止 労働衛生教育", item: "https://safe-ai-site.vercel.app/education/roudoueisei/souon" },
  ],
};

const CURRICULUM = [
  { title: "騒音性難聴の発生機序と聴覚特性", minutes: 15, desc: "蝸牛有毛細胞の障害と4000Hz中心の閾値上昇、不可逆性とその予防原則を解説。" },
  { title: "等価騒音レベル LAeq,8h の測定と管理区分", minutes: 30, desc: "令和5年改訂で導入されたLAeq,8h、第I/II/III管理区分の判定と作業環境測定の頻度。" },
  { title: "騒音源対策・伝播対策", minutes: 15, desc: "発生源対策（最優先）、遮音壁・吸音材・消音器による伝播対策の優先順位。" },
  { title: "聴覚保護具（NRR/SNR）と聴力検査", minutes: 30, desc: "NRR/SNRに基づく適合保護具の選定、装着訓練・フィットテスト、特殊健診の運用。" },
];

const TARGETS = [
  "製造業 機械加工・プレス作業者",
  "建設現場のはつり・解体作業者",
  "運輸業の整備担当",
  "廃棄物処理 破砕機作業者",
  "80dB以上の作業環境で就業する労働者",
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
    desc: "貴社の作業環境測定結果・使用機械・保護具運用に合わせた専用テキスト・動画を制作。約1.5時間以上のカリキュラムを設計。",
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
    q: "令和5年改訂のポイントは何ですか？",
    a: "等価騒音レベル LAeq,8h の導入、85dB以上の作業場で測定義務対象が拡大され、聴覚保護具の選定基準（NRR/SNR）が明確化されました。本教育は改訂内容を踏まえた構成です。",
  },
  {
    q: "90dB以上の作業場の管理区分は？",
    a: "第III管理区分（90dB以上）に区分されます。発生源・伝播対策の実施、聴覚保護具着用の義務化、立入制限が必要です。特殊健診も強化対応となります。",
  },
  {
    q: "聴力検査の頻度は？",
    a: "雇入時・配置転換時、その後は6月以内ごとに1回の特殊健診を実施します。一般定期健診の聴力検査と組み合わせ、4000Hzを中心とした閾値変化を経年で把握します。",
  },
];

const RELATED_LINKS = [
  { label: "熱中症予防教育", href: "/education/roudoueisei/necchu" },
  { label: "振動障害予防教育", href: "/education/roudoueisei/shindou" },
  { label: "腰痛予防教育", href: "/education/roudoueisei/youtsu-yobou" },
  { label: "職長等教育", href: "/contact?category=education&course=職長等教育" },
];

export default function SouonPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      <JsonLd schema={courseSchema} />
      <JsonLd schema={breadcrumbSchema} />

      {/* パンくず */}
      <nav className="mb-4 flex items-center gap-1.5 text-xs text-slate-500" aria-label="パンくずリスト">
        <Link href="/education" className="hover:underline hover:text-slate-700">教育メニュー</Link>
        <span aria-hidden="true">›</span>
        <span className="text-slate-700">騒音障害防止 労働衛生教育</span>
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
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">騒音障害防止 労働衛生教育</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
          製造業・建設業をはじめ85dB以上の作業環境に従事する労働者を対象に、厚生労働省「騒音障害防止のためのガイドライン」（基発0420第2号、令和5年4月20日改訂）に基づく労働衛生教育を実施します。
        </p>
      </header>

      {/* 法的根拠 */}
      <section className="mb-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <h2 className="mb-3 text-base font-bold text-slate-900">法的根拠</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
            <dt className="w-28 shrink-0 font-semibold text-slate-700">根拠</dt>
            <dd className="text-slate-600">
              騒音障害防止のためのガイドライン（基発0420第2号、令和5年4月20日改訂）
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
                労働安全衛生規則 第13条
                <ExternalLink className="h-3 w-3" />
              </a>
              （特殊健康診断）／作業環境測定法
            </dd>
          </div>
          <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
            <dt className="w-28 shrink-0 font-semibold text-slate-700">指針原文</dt>
            <dd>
              <a
                href="https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/roudoukijun/anzeneisei06/index.html"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-emerald-700 hover:underline"
              >
                厚生労働省ウェブサイト（騒音障害防止対策）
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
        <p className="mt-2 text-xs text-slate-500">※ カスタマイズ対応可能。受講者の業種・作業環境測定結果に応じて項目・時間配分を調整します。</p>
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
              実際のカリキュラム構成に沿ったセミナー資料の一部を無料でご覧いただけます。表紙・目次・対策の4要素・等価騒音レベル管理区分表・騒音管理4STEP・聴力検査5ステップ等、労働衛生教育の構成がそのまま把握できます。
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <a
                href="/seminars/souon.pptx"
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
        <p className="text-base font-bold text-emerald-900">騒音障害防止教育のご相談・お見積り</p>
        <p className="mt-1 text-sm text-slate-600">受講人数・業種・希望時期をお知らせください。原則3営業日以内にご返信します。</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/contact?category=education&course=souon"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors"
          >
            <Mail className="h-4 w-4" />
            無料相談
          </Link>
          <Link
            href="/contact?category=education&course=souon&type=document"
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
