import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, Clock, FileText, Users, BookOpen, Building2, MessageSquare, Mail, Download } from "lucide-react";
import { ogImageUrl } from "@/lib/og-url";
import { JsonLd } from "@/components/json-ld";
import { EducationContextSections } from "@/components/education/EducationContextSections";
import { CourseConclusion } from "@/components/education/CourseConclusion";
import { getCurriculum } from "@/data/education-curriculum";

const TITLE = "フルハーネス型墜落制止用器具 特別教育";
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
  url: "https://www.anzen-ai-portal.jp/education/tokubetsu/fullharness",
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
    name: "安全AIポータル",
    url: "https://www.anzen-ai-portal.jp",
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
    { "@type": "ListItem", position: 1, name: "安全AIポータル", item: "https://www.anzen-ai-portal.jp/" },
    { "@type": "ListItem", position: 2, name: "教育・研修", item: "https://www.anzen-ai-portal.jp/education" },
    { "@type": "ListItem", position: 3, name: "フルハーネス型墜落制止用器具 特別教育", item: "https://www.anzen-ai-portal.jp/education/tokubetsu/fullharness" },
  ],
};

// カリキュラム正本レジストリ（規程第24条）から導出＝ページ表示・網羅ゲート・PPTXの単一正本（企画02章§3）
const CURRICULUM = (getCurriculum("se-36-41-fullharness")?.tracks[0].units ?? []).map((u) => ({
  title: u.kind === "jitsugi" ? `${u.subject}（実技）` : u.subject,
  minutes: Math.round(u.minHours * 60),
  desc: u.scopeItems.join("／"),
}));

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
    a: "安全衛生特別教育規程第24条に定められた科目と同等内容を受講済の場合、再教育は不要です。法定資格証や修了証で受講済みであることが確認できれば、受講免除の判断材料となります。（教育科目の根拠は同規程第24号。墜落制止用器具の規格〔平31厚労省告示第11号〕は器具の構造規格で、別物です）",
  },
  {
    q: "屋外足場のみの作業も対象ですか？",
    a: "高さ2m超で作業床がない箇所での作業は、足場の有無にかかわらず対象となります。作業形態と高さを確認したうえで受講要否をご判断ください。",
  },
];

const RELATED_LINKS = [
  { label: "玉掛け特別教育（1t未満）", href: "/contact?tab=business&topic=edu-pack&course=玉掛け特別教育" },
  { label: "酸素欠乏危険作業特別教育", href: "/contact?tab=business&topic=edu-pack&course=酸素欠乏危険作業特別教育" },
  { label: "アーク溶接特別教育", href: "/contact?tab=business&topic=edu-pack&course=アーク溶接特別教育" },
  { label: "低圧電気取扱業務特別教育", href: "/contact?tab=business&topic=edu-pack&course=低圧電気取扱業務特別教育" },
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

      {/* 結論カード（柱0）: 区分・時間とサンプル資料への導線を最上部に集約 */}
      <CourseConclusion
        kind="special"
        duration="約6時間"
        basis="省令ベース"
        summary="安衛則第36条第41号・安全衛生特別教育規程第24条に基づく、高さ2m超の高所作業従事者向け特別教育（学科4.5h＋実技1.5h）。"
      />

      {/* ヘッダー */}
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">フルハーネス型墜落制止用器具 特別教育</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
          高さ2m以上の作業床がない箇所でフルハーネス型墜落制止用器具を用いて作業に従事する労働者を対象に、労働安全衛生規則第36条第41号および安全衛生特別教育規程（昭47労告92号）第24条に基づく特別教育を実施します。
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
            <dd className="text-slate-600">科目の根拠: 安全衛生特別教育規程（昭47労告92号）第24条（平30告示249号で追加）／墜落防止措置: 安衛則第518条〜第521条／墜落制止用器具の規格（平31厚労省告示第11号）は器具の構造規格（科目根拠ではない）</dd>
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

      {/* フル教材（無償）— 投影・印刷・編集可 */}
      <section id="course-sample" className="mb-8 scroll-mt-20 rounded-2xl border border-emerald-300 bg-gradient-to-br from-emerald-50 via-white to-slate-50 p-5 sm:p-6">
        <div className="flex flex-wrap items-start gap-4">
          <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <FileText className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-[240px]">
            <h2 className="text-base font-bold text-slate-900">
              フル教材（無償） <span className="ml-1 text-xs font-normal text-slate-500">申請不要・編集可</span>
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              規程第24条の学科4科目の範囲を全てカバーしたフルデッキ。法定科目の網羅をCIで機械検証し法定対応表を同梱します。統計は最新の災害データに自動追従。
            </p>
            <ul className="mt-2 space-y-1">
              <li className="text-xs text-emerald-900">・出典を明記すれば、自社の教育で自由に投影・印刷・改変できます</li>
              <li className="text-xs text-emerald-900">・改変された教材には法定対応表の保証は適用されません</li>
              <li className="text-xs text-emerald-900">・教材そのものの販売・有償配布はできません（<Link href="/education/pack/terms" className="underline">利用規約全文</Link>）</li>
            </ul>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/education/pack/fullharness"
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 min-h-[44px] text-sm font-bold text-white shadow-sm hover:bg-emerald-800 transition-colors"
              >
                <FileText className="h-4 w-4" />
                投影・印刷で開く（無償フルデッキ）
              </Link>
              <a
                href="/seminars/fullharness.pptx"
                download
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 min-h-[44px] text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
              >
                <Download className="h-4 w-4" />
                PPTX（編集用サンプル）
              </a>
            </div>
            <p className="mt-3 text-[11px] leading-5 text-slate-500">
              本教材の閲覧・配布は労働安全衛生法第59条第3項の特別教育の「実施」には当たりません。科目・時間の充足、講師の選定、実技教育の対面実施、記録の作成・3年保存（安衛則第38条）は、教育を実施する事業者の責任で行ってください。
            </p>
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
        <p className="text-base font-bold text-amber-900">フルハーネス特別教育のお問い合わせ・改善提案</p>
        <p className="mt-1 text-sm text-slate-600">教材内容のご質問・誤りの指摘・追加してほしいテーマなどをお寄せください。原則3営業日以内にご返信します。</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/contact?tab=business&topic=edu-pack&course=fullharness"
            className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-5 py-2.5 min-h-[44px] text-sm font-bold text-white shadow-sm hover:bg-amber-700 transition-colors"
          >
            <Mail className="h-4 w-4" />
            ご質問・改善提案を送る
          </Link>
          <Link
            href="/contact?tab=business&topic=edu-pack&course=fullharness&type=document"
            className="inline-flex items-center gap-2 rounded-lg border border-amber-600 bg-white px-5 py-2.5 min-h-[44px] text-sm font-bold text-amber-700 hover:bg-amber-50 transition-colors"
          >
            <FileText className="h-4 w-4" />
            教材についての質問
          </Link>
        </div>
      </section>

      {/* 監修者 */}
      <p className="mt-6 text-center text-xs text-slate-400">
        労働安全衛生コンサルタント（登録番号260022）監修
      </p>
    </main>
  );
}
