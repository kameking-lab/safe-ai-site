import type { Metadata } from "next";
import Link from "next/link";
import { GraduationCap, Mail, Clock, BookOpen, Users, Building2 } from "lucide-react";
import { ogImageUrl } from "@/lib/og-url";
import { JsonLd, serviceSchema } from "@/components/json-ld";

const TITLE = "特別教育・安全衛生教育｜21種の教育メニュー";
const DESCRIPTION =
  "労働安全衛生法に基づく特別教育（安衛則第36条）21種を提供。オンデマンド配信・カスタマイズ研修・講師派遣に対応。¥50,000〜の明朗会計、修了証発行まで一括対応。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/education" },
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

type Program = {
  name: string;
  basis: string;
  hours: string;
  category: "建設" | "機械" | "化学" | "電気" | "その他";
  /** /contact への遷移時に使うコース識別子（name と同一でもよい） */
  slug?: string;
};

const PROGRAMS: Program[] = [
  { name: "アーク溶接等の業務", basis: "安衛則第36条第3号", hours: "11時間以上", category: "機械" },
  { name: "低圧電気取扱い業務", basis: "安衛則第36条第4号", hours: "7〜14時間", category: "電気" },
  { name: "高圧・特別高圧電気取扱い業務", basis: "安衛則第36条第4号", hours: "11〜15時間", category: "電気" },
  { name: "フォークリフト運転（最大荷重1t未満）", basis: "安衛則第36条第5号", hours: "12時間以上", category: "機械" },
  { name: "ショベルローダー等運転（機体質量3t未満）", basis: "安衛則第36条第5号の3", hours: "12時間以上", category: "機械" },
  { name: "車両系建設機械（小型・整地等）", basis: "安衛則第36条第9号", hours: "13時間以上", category: "建設" },
  { name: "高所作業車運転（作業床高さ10m未満）", basis: "安衛則第36条第10号の5", hours: "9時間以上", category: "機械" },
  { name: "玉掛け業務（吊り上げ荷重1t未満）", basis: "安衛則第36条第19号", hours: "9時間以上", category: "建設" },
  { name: "クレーン運転（吊り上げ荷重5t未満）", basis: "クレーン則第21条", hours: "9時間以上", category: "建設" },
  { name: "床上操作式クレーン運転", basis: "クレーン則第21条", hours: "9〜13時間", category: "建設" },
  { name: "移動式クレーン運転（吊り上げ荷重1t未満）", basis: "クレーン則第67条", hours: "9〜13時間", category: "建設" },
  { name: "デリック運転（吊り上げ荷重5t未満）", basis: "クレーン則第107条", hours: "9〜13時間", category: "建設" },
  { name: "巻上げ機（ウインチ）の運転", basis: "安衛則第36条第11号", hours: "9時間以上", category: "建設" },
  { name: "丸のこ等取扱い作業", basis: "安衛則第36条（通達）", hours: "6時間以上", category: "機械" },
  { name: "刈払機（草刈機）取扱い作業", basis: "安衛則第36条（通達）", hours: "6時間以上", category: "機械" },
  { name: "チェーンソー取扱い業務", basis: "安衛則第36条第8号", hours: "18時間以上", category: "建設" },
  { name: "酸素欠乏・硫化水素危険作業", basis: "酸欠則第12条", hours: "5.5時間以上", category: "化学" },
  { name: "石綿（アスベスト）取扱い作業", basis: "石綿則第27条", hours: "4.5時間以上", category: "化学" },
  { name: "粉じん作業", basis: "粉じん則第22条", hours: "4.5時間以上", category: "化学" },
  { name: "高さ2m以上のフルハーネス型墜落制止用器具", basis: "安衛則第36条第41号", hours: "6時間以上", category: "建設" },
  { name: "ロープ高所作業（特別教育）", basis: "安衛則第36条第40号", hours: "7時間以上", category: "建設" },
];

const CATEGORY_COLOR: Record<Program["category"], string> = {
  建設: "bg-amber-50 text-amber-800 border-amber-200",
  機械: "bg-sky-50 text-sky-800 border-sky-200",
  化学: "bg-violet-50 text-violet-800 border-violet-200",
  電気: "bg-rose-50 text-rose-800 border-rose-200",
  その他: "bg-slate-50 text-slate-800 border-slate-200",
};

const FORMATS = [
  {
    icon: BookOpen,
    title: "オンデマンド配信",
    desc: "全21種を動画で受講。受講進捗の管理画面に対応。スマホ・PC両対応。",
    price: "¥50,000〜 / 1社（10名まで）",
    badge: "2026年秋リリース予定",
    preorder: "事前予約受付中",
  },
  {
    icon: Users,
    title: "カスタマイズ研修",
    desc: "貴社の現場・機械・KY事例に合わせた専用テキスト・動画を制作。法定時間を満たす独自カリキュラムを設計。",
    price: "¥150,000〜 / 1コース",
  },
  {
    icon: Building2,
    title: "講師派遣（対面・オンライン）",
    desc: "労働安全コンサルタントが講師として登壇。実技指導や質疑応答、修了証発行までワンストップ対応。",
    price: "¥80,000〜 / 半日（交通費別）",
  },
] as const;

export default function EducationPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      <JsonLd
        schema={serviceSchema({
          name: "ANZEN AI 特別教育・安全衛生教育",
          description: DESCRIPTION,
          url: "https://safe-ai-site.vercel.app/education",
          serviceType: "EducationalService",
          priceFrom: 50000,
        })}
      />
      <header className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
          <GraduationCap className="h-3.5 w-3.5" />
          特別教育・安全衛生教育サービス
        </div>
        <h1 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">
          21種の特別教育に対応。修了証発行までワンストップ。
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
          労働安全衛生法・安衛則第36条に基づく特別教育を中心に、現場で必要な安全衛生教育を ANZEN AI が提供します。
          労働安全コンサルタント（登録番号260022・土木区分）が監修。オンデマンド配信から講師派遣まで、企業規模・業種に合わせた最適な形で受講いただけます。
        </p>
      </header>

      {/* 受講形式 */}
      <section className="mb-10">
        <h2 className="mb-4 text-lg font-bold text-slate-900">受講形式と料金</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {FORMATS.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">{f.title}</h3>
                  {"badge" in f && f.badge ? (
                    <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                      {f.badge}
                    </span>
                  ) : null}
                  {"preorder" in f && f.preorder ? (
                    <span className="inline-flex items-center rounded-full border border-emerald-300 bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                      {f.preorder}
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-600">{f.desc}</p>
                <p className="mt-3 text-sm font-bold text-emerald-700">{f.price}</p>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          ※ 価格は税抜目安。受講人数・カスタマイズ範囲・出張地域により変動します。詳細はお問い合わせください。
        </p>
      </section>

      {/* 21種教育メニュー */}
      <section className="mb-10">
        <h2 className="mb-4 text-lg font-bold text-slate-900">対応する特別教育（21種）</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PROGRAMS.map((p) => {
            const contactHref = `/contact?category=education&course=${encodeURIComponent(p.name)}`;
            return (
              <Link
                key={p.name}
                href={contactHref}
                aria-label={`${p.name} についてお問い合わせ`}
                className="group flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-emerald-400 hover:bg-emerald-50/30 hover:shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-bold leading-snug text-slate-900 group-hover:text-emerald-900">
                    {p.name}
                  </h3>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${CATEGORY_COLOR[p.category]}`}
                  >
                    {p.category}
                  </span>
                </div>
                <p className="mt-2 text-[11px] text-slate-500">{p.basis}</p>
                <div className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-slate-700">
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  {p.hours}
                </div>
                <p className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 group-hover:underline">
                  この教育を相談する →
                </p>
              </Link>
            );
          })}
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-500">
          ※ 法定時間は厚労省告示・通達に基づく目安です。実際の所要時間は受講者の知識・経験に応じ調整します。
          上記以外の教育（職長・安全衛生責任者教育、雇入れ時教育、化学物質管理者講習など）にもご相談に応じて対応可能です。
        </p>
      </section>

      {/* CTA */}
      <section className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 text-center">
        <p className="text-sm font-semibold text-emerald-800">教育プログラムのご相談・お見積り</p>
        <p className="mt-2 text-xs text-slate-600">
          受講人数・対象業務・希望時期をお知らせください。原則3営業日以内にご返信いたします。
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
