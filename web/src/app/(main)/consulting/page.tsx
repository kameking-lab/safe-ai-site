import type { Metadata } from "next";
import Link from "next/link";
import { Handshake, Mail, ShieldCheck, Sparkles, Crown, Check } from "lucide-react";
import { ogImageUrl } from "@/lib/og-url";
import { JsonLd, serviceSchema } from "@/components/json-ld";

const TITLE = "月額顧問サービス｜労働安全顧問・AI/DX 顧問";
const DESCRIPTION =
  "ANZEN AI の月額顧問プラン。労働安全コンサルタント（登録番号260022・土木区分）が貴社の安全衛生体制を継続支援。AI・DX 顧問プランでは Claude / ChatGPT を活用した業務改善を伴走サポート。¥150,000〜/月。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/consulting" },
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

const PLANS = [
  {
    id: "safety",
    icon: ShieldCheck,
    name: "労働安全顧問プラン",
    price: 150000,
    accent: "emerald",
    description:
      "労働安全衛生体制の継続的な改善を月額で支援。月1回の定例ミーティング＋いつでも相談できるチャット窓口を提供します。",
    features: [
      "月1回 90分の定例ミーティング（オンライン）",
      "Slack / Chatwork 等での随時相談",
      "安全衛生計画書・KY 様式のレビュー",
      "労働災害発生時の初動対応サポート",
      "法改正情報の月次サマリー",
      "労基署対応のアドバイス",
    ],
  },
  {
    id: "ai",
    icon: Sparkles,
    name: "AI・DX 顧問プラン",
    price: 150000,
    accent: "amber",
    description:
      "Claude / ChatGPT / Excel VBA を業務に組み込みたい企業向け。実務に直結する AI 活用を伴走支援します。",
    features: [
      "月1回 90分の定例ミーティング（オンライン）",
      "業務プロンプト集の継続更新",
      "Claude / ChatGPT 利用ガイドラインの整備",
      "Excel VBA・Python 自動化のレシピ提供",
      "AI 関連の最新情報・社内勉強会レジュメ",
      "小規模ツール開発（月8時間まで）",
    ],
  },
  {
    id: "set",
    icon: Crown,
    name: "セットプラン（安全 + AI/DX）",
    price: 250000,
    accent: "violet",
    description:
      "安全顧問と AI・DX 顧問をまとめてご契約いただけるお得なセット。安全業務の DX 化を一気に進めたい企業様に最適です。",
    features: [
      "労働安全顧問プランの全機能",
      "AI・DX 顧問プランの全機能",
      "月2回の定例ミーティング（合計3時間）",
      "KY・安全書類の AI 化伴走支援",
      "経営層向け四半期レビュー",
      "受託業務メニューを15%割引で利用可",
    ],
    recommended: true,
  },
] as const;

const ACCENT_MAP = {
  emerald: {
    border: "border-emerald-200",
    badge: "bg-emerald-50 text-emerald-800 border-emerald-200",
    icon: "bg-emerald-100 text-emerald-700",
    price: "text-emerald-700",
  },
  amber: {
    border: "border-amber-200",
    badge: "bg-amber-50 text-amber-800 border-amber-200",
    icon: "bg-amber-100 text-amber-700",
    price: "text-amber-700",
  },
  violet: {
    border: "border-violet-300 ring-2 ring-violet-200",
    badge: "bg-violet-50 text-violet-800 border-violet-200",
    icon: "bg-violet-100 text-violet-700",
    price: "text-violet-700",
  },
} as const;

const yen = new Intl.NumberFormat("ja-JP");

export default function ConsultingPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      <JsonLd
        schema={serviceSchema({
          name: "ANZEN AI 月額顧問サービス",
          description: DESCRIPTION,
          url: "https://safe-ai-site.vercel.app/consulting",
          serviceType: "ProfessionalService",
          priceFrom: 150000,
        })}
      />
      <header className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
          <Handshake className="h-3.5 w-3.5" />
          月額顧問サービス
        </div>
        <h1 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">
          安全 × AI/DX を、月額で伴走支援。
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
          スポット相談ではなく、現場と並走しながら継続的に改善する月額顧問サービスです。
          労働安全コンサルタント（登録番号260022・土木区分）が、安全衛生体制の運用と AI・DX 活用の双方で、貴社の伴走パートナーとなります。
        </p>
      </header>

      {/* プラン一覧 */}
      <section className="mb-10 grid gap-4 lg:grid-cols-3">
        {PLANS.map((p) => {
          const Icon = p.icon;
          const accent = ACCENT_MAP[p.accent];
          return (
            <article
              key={p.id}
              className={`flex flex-col rounded-2xl border bg-white p-5 shadow-sm ${accent.border}`}
            >
              {"recommended" in p && p.recommended ? (
                <div className="-mt-1 mb-2 inline-flex w-fit items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-800">
                  <Crown className="h-3 w-3" />
                  おすすめ
                </div>
              ) : null}
              <div className="flex items-start gap-3">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${accent.icon}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h2 className="text-base font-bold text-slate-900">{p.name}</h2>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{p.description}</p>
                </div>
              </div>
              <div className="mt-4">
                <p className={`text-3xl font-bold ${accent.price}`}>
                  ¥{yen.format(p.price)}
                  <span className="text-sm font-medium text-slate-500">〜 / 月（税抜）</span>
                </p>
              </div>
              <ul className="mt-4 space-y-2 text-xs leading-5 text-slate-700">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/contact"
                className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors"
              >
                <Mail className="h-4 w-4" />
                このプランを相談
              </Link>
            </article>
          );
        })}
      </section>

      <section className="mb-10 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-base font-bold text-slate-900">契約条件</h2>
        <ul className="mt-3 space-y-1.5 text-xs leading-5 text-slate-700">
          <li>・ 最低契約期間：6か月（以降は月単位の自動更新）</li>
          <li>・ 解約：契約満了月の前月末までにご連絡ください</li>
          <li>・ 請求：月末締め・翌月末払い（銀行振込）</li>
          <li>・ 業務量が見込みを大幅に超過する場合は事前にご相談のうえ調整します</li>
          <li>・ 機密保持契約（NDA）の締結に対応可能です</li>
        </ul>
      </section>

      {/* CTA */}
      <section className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 text-center">
        <p className="text-sm font-semibold text-emerald-800">まずは30分の無料オンライン面談から</p>
        <p className="mt-2 text-xs text-slate-600">
          現状の体制と課題をお聞きし、最適なプランをご提案します。継続契約前提のご提案ではありません。
        </p>
        <Link
          href="/contact"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors"
        >
          <Mail className="h-4 w-4" />
          無料相談を申し込む
        </Link>
      </section>
    </main>
  );
}
