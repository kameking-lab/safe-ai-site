import type { Metadata } from "next";
import Link from "next/link";
import {
  ShieldCheck,
  ClipboardList,
  Code2,
  Globe,
  Sparkles,
  FileText,
  Mail,
  Zap,
} from "lucide-react";
import { ogImageUrl } from "@/lib/og-url";
import { JsonLd, serviceSchema } from "@/components/json-ld";

const TITLE = "受託業務｜安全診断・KYシステム・Excel VBA・AI研修";
const DESCRIPTION =
  "労働安全コンサルタント監修の受託業務サービス。安全診断・KYシステム構築・Excel VBA 自動化・Web サイト制作・AI 活用研修・安全書類のデジタル化まで対応。Claude Code を活用した高速開発で短納期・高品質を実現。¥198,000〜。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/services" },
  openGraph: {
    title: `${TITLE}｜ANZEN AI`,
    description: DESCRIPTION,
    images: [{ url: ogImageUrl(TITLE, DESCRIPTION), width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    images: [ogImageUrl(TITLE, DESCRIPTION)],
  },
};

const SERVICES = [
  {
    icon: ShieldCheck,
    title: "労働安全診断",
    desc: "現場巡回・書類監査・ヒアリングをもとに、安全管理体制の課題と改善優先度をレポート化。安全衛生計画書のテンプレート提供まで。",
    bullets: [
      "現場巡回チェックリスト（業種別）",
      "安全管理規程・社内ルールの監査",
      "改善提案書（リスクスコア順）",
    ],
    price: "¥198,000〜 / 1拠点",
  },
  {
    icon: ClipboardList,
    title: "KY・安全書類システム構築",
    desc: "KY 用紙・安全衛生計画書・グリーンファイル等のデジタル化。スマホで入力 → クラウド保存 → PDF 出力までワンストップ。",
    bullets: [
      "現場別 KY 入力フォーム設計",
      "音声入力・写真添付対応",
      "PDF 出力・共有・履歴管理",
    ],
    price: "¥498,000〜 / 1システム",
  },
  {
    icon: Code2,
    title: "Excel VBA 自動化",
    desc: "毎月の安全集計・帳票作成・点検記録の集約など、ルーティン業務を VBA で自動化。マクロ保守・引き継ぎマニュアルも込み。",
    bullets: [
      "ヒアリング → 業務フロー再設計",
      "VBA マクロ実装＆動作検証",
      "操作マニュアル・引き継ぎ動画",
    ],
    price: "¥198,000〜 / 1業務",
  },
  {
    icon: Globe,
    title: "Web サイト・LP 制作",
    desc: "コーポレートサイト・採用 LP・サービス紹介ページを制作。Next.js + Vercel の高速構成。スマホ最適化・SEO 基本対応込み。",
    bullets: [
      "デザイン → コーディング → 公開",
      "問い合わせフォーム・GA4 計測",
      "公開後の軽微修正サポート（3か月）",
    ],
    price: "¥498,000〜 / 1サイト",
  },
  {
    icon: Sparkles,
    title: "AI 活用研修・伴走支援",
    desc: "Claude / ChatGPT を業務に組み込むための社内研修。実際の業務データを使ったハンズオンと、研修後3か月の質問サポート付き。",
    bullets: [
      "Claude / ChatGPT の業務活用ワークショップ",
      "プロンプト集・社内ガイドライン整備",
      "研修後3か月の Q&A サポート",
    ],
    price: "¥298,000〜 / 半日コース",
  },
  {
    icon: FileText,
    title: "ドキュメント・マニュアル制作",
    desc: "安全マニュアル・作業手順書・教育用テキスト・社内規程の制作。法令準拠＋現場で読まれるレイアウトを両立。",
    bullets: [
      "現場ヒアリング → 構成設計",
      "Word / PDF / Web 形式で納品",
      "改訂版の差分管理にも対応",
    ],
    price: "¥298,000〜 / 1冊",
  },
] as const;

export default function ServicesPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      <JsonLd
        schema={serviceSchema({
          name: "ANZEN AI 受託業務サービス",
          description: DESCRIPTION,
          url: "https://safe-ai-site.vercel.app/services",
          serviceType: "ProfessionalService",
          priceFrom: 198000,
        })}
      />
      <header className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
          <Zap className="h-3.5 w-3.5" />
          受託業務メニュー
        </div>
        <h1 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">
          現場の「面倒」を AI と VBA で削る、受託サービス。
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
          労働安全コンサルタント（登録番号260022・土木区分）が監修する受託業務メニューです。
          スーパーゼネコンでの施工管理経験と、Claude Code を活用した高速開発で、現場が本当に使えるシステム・帳票・ドキュメントを短納期で提供します。
        </p>
      </header>

      {/* Claude Code 高速開発のアピール */}
      <section className="mb-8 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-emerald-50 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Claude Code を活用した高速開発
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              本サイト ANZEN AI 自体が Claude Code で構築された実例です。
              従来の Web 制作と比べて<strong className="font-bold text-emerald-800">2〜5倍の速度</strong>で、
              要件ヒアリングから本番公開までを駆け抜けます。短納期・低コストで現場改善を実現したい企業様にこそ最適です。
            </p>
          </div>
        </div>
      </section>

      {/* サービス一覧 */}
      <section className="mb-10 grid gap-4 sm:grid-cols-2">
        {SERVICES.map((s) => {
          const Icon = s.icon;
          return (
            <article
              key={s.title}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-emerald-300 hover:shadow"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-slate-900">{s.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{s.desc}</p>
                </div>
              </div>
              <ul className="mt-3 space-y-1 text-xs text-slate-700">
                {s.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-1.5">
                    <span className="mt-0.5 shrink-0 text-emerald-600">✓</span>
                    {b}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-sm font-bold text-emerald-700">{s.price}</p>
            </article>
          );
        })}
      </section>

      <p className="mb-8 text-xs leading-5 text-slate-500">
        ※ 価格は税抜目安。要件・規模・納期により変動します。複数メニューの組合せ割引や、月額顧問契約への切替もご相談ください。
      </p>

      {/* CTA */}
      <section className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 text-center">
        <p className="text-sm font-semibold text-emerald-800">無料相談・お見積り受付中</p>
        <p className="mt-2 text-xs text-slate-600">
          現状の課題と希望ゴールをお知らせください。原則3営業日以内にご返信いたします。
        </p>
        <Link
          href="/contact"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors"
        >
          <Mail className="h-4 w-4" />
          お問い合わせはこちら
        </Link>
      </section>
    </main>
  );
}
