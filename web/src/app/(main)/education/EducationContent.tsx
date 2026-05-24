"use client";

import Link from "next/link";
import { GraduationCap, Mail, Clock, BookOpen, Users, Building2, MessageSquare, Download } from "lucide-react";
import { JsonLd, serviceSchema } from "@/components/json-ld";
import { useTranslation } from "@/contexts/language-context";

const DESCRIPTION =
  "労働安全衛生法に基づく特別教育・法定教育・労働衛生教育12種のカリキュラム設計を公開している研究プロジェクト。フルハーネス・足場・低圧電気・職長教育など。労働安全衛生コンサルタント（登録番号260022）監修。";

type CategoryKey = "tokubetsu" | "hoteikyoiku" | "roudoueisei";

const CATEGORY_LABEL: Record<CategoryKey, { ja: string; en: string }> = {
  tokubetsu: { ja: "特別教育", en: "Special Education (特別教育)" },
  hoteikyoiku: { ja: "法定教育", en: "Statutory Education (法定教育)" },
  roudoueisei: { ja: "労働衛生教育", en: "Occupational Health Education (労働衛生教育)" },
};

const CATEGORY_COLOR: Record<CategoryKey, string> = {
  tokubetsu: "bg-amber-50 text-amber-800 border-amber-200",
  hoteikyoiku: "bg-sky-50 text-sky-800 border-sky-200",
  roudoueisei: "bg-emerald-50 text-emerald-800 border-emerald-200",
};

const CATEGORY_HEADING_COLOR: Record<CategoryKey, string> = {
  tokubetsu: "border-amber-400 text-amber-900",
  hoteikyoiku: "border-sky-400 text-sky-900",
  roudoueisei: "border-emerald-400 text-emerald-900",
};

type Program = {
  slug: string;
  name: string;
  basis: string;
  hours: string;
  category: CategoryKey;
  note?: string;
};

const PROGRAMS: Program[] = [
  { slug: "kensaku-toishi", name: "研削といしの取替え・試運転の業務", basis: "安衛則第36条第1号 (OSH Rule Art.36-1)", hours: "4時間以上", category: "tokubetsu" },
  { slug: "teiatsu-denki", name: "低圧電気取扱い業務", basis: "安衛則第36条第4号 (OSH Rule Art.36-4)", hours: "7〜14時間", category: "tokubetsu" },
  { slug: "ashiba", name: "足場の組立て・解体・変更の作業", basis: "安衛則第36条第39号 (OSH Rule Art.36-39)", hours: "6時間以上", category: "tokubetsu" },
  { slug: "fullharness", name: "フルハーネス型墜落制止用器具の使用", basis: "安衛則第36条第41号 (OSH Rule Art.36-41)", hours: "6時間以上", category: "tokubetsu" },
  { slug: "tamakake", name: "つり上げ荷重1t未満の玉掛け業務", basis: "安衛則第36条第19号 (OSH Rule Art.36-19)", hours: "9時間以上", category: "tokubetsu" },
  { slug: "sankesu", name: "酸素欠乏危険作業", basis: "酸素欠乏症等防止規則第12条 (Oxygen Deficiency Rule Art.12)", hours: "5.5時間以上", category: "tokubetsu" },
  { slug: "shokucho", name: "職長等教育", basis: "安衛法第60条・安衛則第40条 (OSH Act Art.60)", hours: "12時間以上", category: "hoteikyoiku" },
  { slug: "chemical-ra", name: "化学物質のリスクアセスメント実務教育", basis: "安衛法第57条の3 (OSH Act Art.57-3)", hours: "2.5〜4時間", category: "hoteikyoiku", note: "2026年4月 自律管理制度対応" },
  { slug: "youtsu-yobou", name: "腰痛予防教育", basis: "基発0618第1号通達 (MHLW Low Back Pain Guideline)", hours: "2時間以上", category: "roudoueisei" },
  { slug: "necchu", name: "熱中症予防教育", basis: "基発0420第3号通達 (MHLW Heat Stroke Prevention Guideline)", hours: "1.5時間以上", category: "roudoueisei" },
  { slug: "shindou", name: "振動障害予防教育", basis: "振動障害予防のための作業管理指針 (Vibration Disorder Prevention)", hours: "2時間以上", category: "roudoueisei" },
  { slug: "souon", name: "騒音障害防止教育", basis: "騒音障害防止ガイドライン（令和5年改訂）(Noise Guideline 2023)", hours: "1.5時間以上", category: "roudoueisei" },
];

const CATEGORY_ORDER: CategoryKey[] = ["tokubetsu", "hoteikyoiku", "roudoueisei"];

const FORMATS = {
  ja: [
    { icon: BookOpen, title: "オンデマンド配信", desc: "対応12種を動画で受講。受講進捗の管理画面に対応。スマホ・PC両対応。", badge: "準備中", preorder: "公開のお知らせを希望される方は事前登録ください" },
    { icon: Users, title: "カスタマイズ研修", desc: "貴社の現場・機械・KY事例に合わせた専用テキスト・動画を制作。法定時間を満たす独自カリキュラムを設計。" },
    { icon: Building2, title: "講師派遣（対面・オンライン）", desc: "労働安全コンサルタントが講師として登壇。実技指導や質疑応答、修了証発行までワンストップ対応。" },
  ],
  en: [
    { icon: BookOpen, title: "On-demand Video", desc: "Watch all 12 program types as video. Progress dashboard included. Works on smartphone and PC.", badge: "In preparation", preorder: "Sign up to be notified when available" },
    { icon: Users, title: "Customized Training", desc: "We create bespoke text and video matched to your site, equipment, and KY examples — designed to meet statutory hours." },
    { icon: Building2, title: "Instructor Dispatch (in-person / online)", desc: "A registered Occupational Safety Consultant serves as instructor. Practical guidance, Q&A, and certificate issuance — all in one." },
  ],
};

const OTHER_EXAMPLES = {
  ja: [
    "雇入れ時の安全衛生教育（安衛法第59条）",
    "安全衛生責任者教育",
    "アーク溶接等の業務（特別教育）",
    "高所作業車運転（特別教育）",
    "フォークリフト運転（特別教育）",
    "石綿（アスベスト）取扱い作業（特別教育）",
    "粉じん作業（特別教育）",
    "化学物質管理者講習",
    "保護具着用管理責任者教育",
  ],
  en: [
    "New hire safety and health orientation (OSH Act Art.59)",
    "Safety & health officer education",
    "Arc welding operations (special education)",
    "Elevated work platform operation (special education)",
    "Forklift operation (special education)",
    "Asbestos handling work (special education)",
    "Dusty work (special education)",
    "Chemical substance manager training",
    "Protective equipment supervisor education",
  ],
};

export function EducationContent() {
  const { t, language } = useTranslation();
  const isEn = language === "en";
  const formats = isEn ? FORMATS.en : FORMATS.ja;
  const others = isEn ? OTHER_EXAMPLES.en : OTHER_EXAMPLES.ja;

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      <JsonLd
        schema={serviceSchema({
          name: "安全AIポータル 特別教育・安全衛生教育",
          description: DESCRIPTION,
          url: "https://www.anzen-ai-portal.jp/education",
          serviceType: "EducationalService",
        })}
      />
      <header className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
          <GraduationCap className="h-3.5 w-3.5" />
          {isEn ? "Special Education & OHS Training (research project)" : "特別教育・安全衛生教育（教材公開）"}
        </div>
        <h1 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">
          {isEn
            ? "12 program designs. Curricula, slides, and reference notes published openly."
            : "12種の教育プログラム設計を公開。カリキュラム・スライド・参考資料を無料で閲覧できます。"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
          {isEn
            ? "An open archive of special education, statutory training, and occupational health curricula under Japan's Occupational Safety and Health Act (安全衛生法). Supervised by an Occupational Safety & Health Consultant (registration no. 260022) and published as part of this independent research project. Field practitioners are encouraged to share gaps, errors, or improvement suggestions."
            : "労働安全衛生法に基づく特別教育・法定教育・労働衛生教育のカリキュラムを、労働安全衛生コンサルタント（登録番号260022）監修のもと公開している研究プロジェクトです。教材設計の参考としてご活用ください。現場での気づき・誤りの指摘・追加してほしいテーマがあれば、フィードバックフォームよりお寄せください。"}
        </p>
      </header>

      {/* Delivery formats */}
      <section className="mb-10">
        <h2 className="mb-4 text-lg font-bold text-slate-900">
          {isEn ? "Delivery Formats" : "受講形式"}
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {formats.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">{f.title}</h3>
                  {"badge" in f && f.badge && (
                    <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                      {f.badge}
                    </span>
                  )}
                  {"preorder" in f && f.preorder && (
                    <span className="inline-flex items-center rounded-full border border-emerald-300 bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                      {f.preorder}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-600">{f.desc}</p>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          {isEn
            ? "* Pricing fields are part of a future paid mode design (M6 phase) — they are not currently active offers from this research project."
            : "※ 各形式に表示している料金は、将来の課金モード（M6期）の設計上の数値です。本研究プロジェクトとして現時点で提供しているサービスではありません。"}
        </p>
      </section>

      {/* 12 program listing */}
      <section className="mb-10">
        <h2 className="mb-6 text-lg font-bold text-slate-900">
          {isEn ? "Available Programs (12 types)" : "対応する教育メニュー（12種）"}
        </h2>
        <div className="space-y-8">
          {CATEGORY_ORDER.map((catKey) => {
            const programs = PROGRAMS.filter((p) => p.category === catKey);
            return (
              <div key={catKey}>
                <h3 className={`mb-3 border-l-4 pl-3 text-base font-bold ${CATEGORY_HEADING_COLOR[catKey]}`}>
                  {isEn ? CATEGORY_LABEL[catKey].en : CATEGORY_LABEL[catKey].ja}
                  <span className="ml-2 text-sm font-normal text-slate-500">
                    ({programs.length}{isEn ? " types" : "種"})
                  </span>
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {programs.map((p) => {
                    const detailHref = `/education/${p.category}/${p.slug}`;
                    const pptxHref = `/seminars/${p.slug}.pptx`;
                    return (
                      <div
                        key={p.slug}
                        className="group flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-emerald-400 hover:shadow"
                      >
                        <Link
                          href={detailHref}
                          aria-label={`${p.name} 詳細ページへ`}
                          className="flex flex-1 flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-sm font-bold leading-snug text-slate-900 group-hover:text-emerald-900">
                              {p.name}
                            </h4>
                            <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${CATEGORY_COLOR[catKey]}`}>
                              {isEn ? CATEGORY_LABEL[catKey].en.split(" ")[0] : CATEGORY_LABEL[catKey].ja}
                            </span>
                          </div>
                          <p className="mt-2 text-[11px] text-slate-500">{p.basis}</p>
                          {p.note && (
                            <p className="mt-1 text-[10px] font-semibold text-sky-700 bg-sky-50 rounded px-1.5 py-0.5 w-fit">
                              {p.note}
                            </p>
                          )}
                          <div className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-slate-700">
                            <Clock className="h-3 w-3" aria-hidden="true" />
                            {p.hours}
                          </div>
                          <p className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 group-hover:underline">
                            {t("education.detail_link")}
                          </p>
                        </Link>
                        <a
                          href={pptxHref}
                          download
                          aria-label={`${p.name} PPTXサンプルをダウンロード`}
                          className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:border-slate-900 hover:bg-slate-900 hover:text-white transition-colors"
                        >
                          <Download className="h-3 w-3" aria-hidden="true" />
                          {isEn ? "PPTX sample" : "PPTXサンプル"}
                        </a>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-xs leading-5 text-slate-500">
          {isEn
            ? "* Statutory hours are guidelines based on MHLW notices. Actual duration may be adjusted based on participants' knowledge and experience."
            : "※ 法定時間は厚労省告示・通達に基づく目安です。実際の所要時間は受講者の知識・経験に応じ調整します。"}
        </p>
      </section>

      {/* Other programs */}
      <section className="mb-10 rounded-2xl border border-slate-200 bg-slate-50 p-6">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare className="h-5 w-5 text-slate-600" />
          <h2 className="text-base font-bold text-slate-900">
            {isEn ? "Other Programs (inquire)" : "その他の教育（要相談）"}
          </h2>
        </div>
        <p className="text-sm text-slate-600 mb-4">
          {isEn
            ? "Beyond the listed programs, we are continually expanding curricula based on field feedback. Suggestions for additional themes are welcome."
            : "下記以外のテーマについても、現場からのフィードバックに応じて教材を順次拡充しています。追加してほしい教育テーマがあればお知らせください。"}
        </p>
        <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {others.map((item) => (
            <li key={item} className="flex items-start gap-1.5 text-xs text-slate-700">
              <span className="mt-0.5 text-slate-400">•</span>
              {item}
            </li>
          ))}
        </ul>
        <Link
          href="/contact?category=education&course=その他"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-900 hover:underline"
        >
          <Mail className="h-4 w-4" />
          {isEn
            ? "Inquire about programs not listed →"
            : "掲載外の教育についてお問い合わせ →"}
        </Link>
      </section>

      {/* CTA */}
      <section className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 text-center">
        <p className="text-sm font-semibold text-emerald-800">
          {isEn ? "Training inquiry & feedback" : "教育プログラムのお問い合わせ・改善提案"}
        </p>
        <p className="mt-2 text-xs text-slate-600">
          {isEn
            ? "Share questions, errors found, or themes you'd like added. We reply within 3 business days."
            : "教材内容のご質問・誤りの指摘・追加してほしいテーマをお寄せください。原則3営業日以内にご返信いたします。"}
        </p>
        <Link
          href="/contact"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors"
        >
          <Mail className="h-4 w-4" />
          {t("education.contact.cta")}
        </Link>
      </section>
    </main>
  );
}
