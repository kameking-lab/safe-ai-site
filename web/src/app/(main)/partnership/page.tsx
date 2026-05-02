import type { Metadata } from "next";
import Link from "next/link";
import {
  Handshake,
  Tag,
  Briefcase,
  Users2,
  Mail,
  ArrowRight,
  Check,
  Building2,
  Sparkles,
} from "lucide-react";
import { TranslatedPageHeader } from "@/components/translated-page-header";

import { PageJsonLd } from "@/components/page-json-ld";
export const metadata: Metadata = {
  title: "パートナーシップ・OEM/再販案内",
  description:
    "ANZEN AI のホワイトラベル提供・OEM・再販案内。社会保険労務士・労働安全コンサルタント・同業ITベンダー向けに、月額顧問への組み込み・共同セミナー開催等のパートナーメニューを提供しています。",
  alternates: { canonical: "/partnership" },
  openGraph: {
    title: "パートナーシップ・OEM/再販案内｜ANZEN AI",
    description:
      "ANZEN AI のホワイトラベル提供・OEM・再販・共同セミナー等のパートナーメニュー。",
  },
};

const PARTNER_PROFILES = [
  {
    icon: Briefcase,
    title: "社会保険労務士",
    desc: "顧問先への安衛法義務チェック・KY支援・特別教育を、自社サービスに組み込み可能。",
  },
  {
    icon: Users2,
    title: "労働安全コンサルタント",
    desc: "巡回診断・OSHMS構築の現場ツールとして、ANZEN AI を活用してください。",
  },
  {
    icon: Building2,
    title: "同業ITベンダー・LMS事業者",
    desc: "労働安全領域のコンテンツ・データを OEM 提供。SCORM/xAPI 連携検討中。",
  },
];

const PROGRAMS: {
  icon: typeof Handshake;
  title: string;
  desc: string;
  bullets: string[];
  accent: string;
  border: string;
}[] = [
  {
    icon: Tag,
    title: "ホワイトラベル提供",
    desc: "貴社ブランドで ANZEN AI を提供。ロゴ・カラー・独自ドメイン対応。",
    bullets: [
      "貴社ロゴ・カラーへのリブランディング",
      "独自サブドメイン（例：safety.example.co.jp）",
      "顧客一覧・利用状況の管理ダッシュボード",
      "請求は貴社→顧客 / 当方→貴社 の二段構成",
    ],
    accent: "text-emerald-700",
    border: "border-emerald-300",
  },
  {
    icon: Briefcase,
    title: "月額顧問への組み込み",
    desc: "顧問契約のオプション機能として、ANZEN AI を割引価格で再販可能。",
    bullets: [
      "Standard/Pro プランを 30〜50% 割引で卸価格提供",
      "顧問先ごとのアカウント発行・利用ログ確認",
      "請求書一括発行（貴社単位での月次請求）",
      "顧問契約の更新サイクルに合わせた契約期間調整",
    ],
    accent: "text-amber-700",
    border: "border-amber-300",
  },
  {
    icon: Users2,
    title: "共同セミナー・教材提供",
    desc: "貴社主催セミナーへの講師派遣・資料提供。Eラーニング教材の共同制作も可能。",
    bullets: [
      "労働安全コンサルタント（登録番号260022）による講師登壇",
      "業種別 KY・特別教育のテンプレート提供",
      "共同オンラインセミナー（Zoom/Teams 対応）",
      "貴社チャネルでの集客と当方の登壇を組み合わせ可",
    ],
    accent: "text-violet-700",
    border: "border-violet-300",
  },
];

export default function PartnershipPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
      {/* SEO: WebPage + BreadcrumbList */}
      <PageJsonLd name="パートナーシップ・OEM/再販案内" description="ANZEN AI のホワイトラベル提供・OEM・再販案内。社会保険労務士・労働安全コンサルタント・同業ITベンダー向けに、月額顧問への組み込み・共同セミナー開催等のパートナーメニューを提供しています。" path="/partnership" />
      <TranslatedPageHeader
        titleJa="パートナーシップ・OEM/再販案内"
        titleEn="Partnership & OEM/Reseller Program"
        descriptionJa="社労士・労働安全コンサル・同業ITベンダー向けの提携メニュー"
        descriptionEn="Partnership menu for SR consultants, safety consultants, and IT vendors"
        iconName="Handshake"
        iconColor="emerald"
      />

      <div className="mt-6 space-y-6">
        {/* イントロ */}
        <section className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-amber-50 p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-700">
            <Sparkles className="h-4 w-4 text-amber-500" aria-hidden="true" />
            同業のみなさまへ
          </div>
          <h2 className="mt-2 text-xl font-bold leading-snug text-slate-900 sm:text-2xl">
            「労働安全のITは作れない」を、ANZEN AI で解決します。
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-700">
            社労士・労働安全コンサルタント・同業ITベンダーのみなさまへ、
            <strong className="font-bold text-emerald-900">ホワイトラベル提供・OEM・再販</strong>
            の枠組みをご用意しています。
            ANZEN AI は労働安全コンサルタント（登録番号260022・土木区分）が監修する現場運用ポータルで、
            KY用紙・法改正・事故DB・特別教育・化学物質RAを1つのサービスに集約しています。
            貴社の顧問契約・コンサルメニューに組み込むことで、IT開発の初期投資なしに即時にデジタル提供価値を強化できます。
          </p>
        </section>

        {/* こんな方に */}
        <section
          aria-labelledby="partner-target-heading"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-600">
            こんな方に
          </p>
          <h3
            id="partner-target-heading"
            className="mt-1 text-base font-bold text-slate-900 sm:text-lg"
          >
            提携メリットが大きい3つの業態
          </h3>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {PARTNER_PROFILES.map((p) => {
              const Icon = p.icon;
              return (
                <div
                  key={p.title}
                  className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-emerald-700">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <p className="text-sm font-bold text-emerald-900">{p.title}</p>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-700">{p.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* 3つのプログラム */}
        <section
          aria-labelledby="programs-heading"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <p className="text-[11px] font-bold uppercase tracking-widest text-amber-600">
            提携プログラム
          </p>
          <h3
            id="programs-heading"
            className="mt-1 text-base font-bold text-slate-900 sm:text-lg"
          >
            3つの選べる連携メニュー
          </h3>
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
            {PROGRAMS.map((p) => {
              const Icon = p.icon;
              return (
                <article
                  key={p.title}
                  className={`flex flex-col rounded-xl border-2 ${p.border} bg-white p-4 shadow-sm`}
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50">
                      <Icon className={`h-4 w-4 ${p.accent}`} aria-hidden="true" />
                    </span>
                    <h4 className={`text-sm font-bold ${p.accent}`}>{p.title}</h4>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-700">{p.desc}</p>
                  <ul className="mt-3 space-y-1.5">
                    {p.bullets.map((b) => (
                      <li
                        key={b}
                        className="flex items-start gap-1.5 text-[11px] leading-5 text-slate-600"
                      >
                        <Check
                          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600"
                          aria-hidden="true"
                        />
                        {b}
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
        </section>

        {/* 提携プロセス */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h3 className="text-base font-bold text-slate-900 sm:text-lg">
            提携までの流れ
          </h3>
          <ol className="mt-3 space-y-3 text-sm text-slate-700">
            {[
              {
                k: "1",
                title: "お問い合わせ（無料）",
                d: "下記フォームより貴社情報・希望メニューをお知らせください。1〜3営業日以内に返信します。",
              },
              {
                k: "2",
                title: "オンライン打合せ（30〜60分）",
                d: "貴社の顧客層・想定価格・連携範囲をすり合わせ。NDA 締結も可能です。",
              },
              {
                k: "3",
                title: "提携契約・運用開始",
                d: "ホワイトラベル設定・卸価格・請求フローを取り決め、最短2週間で提供開始。",
              },
            ].map((s) => (
              <li key={s.k} className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                  {s.k}
                </span>
                <div>
                  <p className="text-sm font-bold text-slate-900">{s.title}</p>
                  <p className="mt-0.5 text-xs leading-5 text-slate-600">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* お問い合わせCTA */}
        <section className="rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-white p-5 text-center shadow-sm sm:p-6">
          <Handshake className="mx-auto h-8 w-8 text-emerald-600" aria-hidden="true" />
          <p className="mt-2 text-base font-bold text-slate-900 sm:text-lg">
            提携・OEM・再販についてのご相談
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            まずは無料で30分の打合せ。秘密保持契約（NDA）も対応可能です。
          </p>
          <Link
            href="/contact?topic=partnership"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700"
          >
            <Mail className="h-4 w-4" aria-hidden="true" />
            提携の相談を申し込む
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <p className="mt-3 text-[11px] text-slate-400">
            ※ 同業からの問い合わせは「相談カテゴリ：パートナーシップ」と明記してください。
          </p>
        </section>

        {/* 関連ページ */}
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-xs font-bold text-slate-600">関連ページ</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <Link
              href="/about"
              className="rounded-full border border-slate-300 bg-white px-3 py-1 font-semibold text-slate-700 hover:bg-slate-100"
            >
              運営者情報・監修体制
            </Link>
            <Link
              href="/pricing"
              className="rounded-full border border-slate-300 bg-white px-3 py-1 font-semibold text-slate-700 hover:bg-slate-100"
            >
              料金プラン（卸価格の参考）
            </Link>
            <Link
              href="/api-docs"
              className="rounded-full border border-slate-300 bg-white px-3 py-1 font-semibold text-slate-700 hover:bg-slate-100"
            >
              API ドキュメント
            </Link>
            <Link
              href="/services"
              className="rounded-full border border-slate-300 bg-white px-3 py-1 font-semibold text-slate-700 hover:bg-slate-100"
            >
              受託業務メニュー
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
