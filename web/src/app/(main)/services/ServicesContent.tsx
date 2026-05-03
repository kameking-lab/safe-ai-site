"use client";

import Link from "next/link";
import {
  ShieldCheck,
  ClipboardList,
  BellRing,
  GraduationCap,
  FlaskConical,
  BookOpen,
  Sparkles,
  Mail,
  Zap,
  CheckCircle2,
  Truck,
  ExternalLink,
} from "lucide-react";
import { JsonLd, serviceSchema } from "@/components/json-ld";
import { useTranslation } from "@/contexts/language-context";

const DESCRIPTION =
  "専門家による設計の受託業務。KYデジタル化¥500k〜、安全管理自動化¥300k〜、法改正通知¥200k〜、教育コンテンツ¥500k〜、化学物質管理¥500k〜、特別教育¥150k〜、Claude Code自動化¥200k〜。無料相談30分実施中。";

const SERVICES = [
  {
    id: "ky-digital",
    icon: ClipboardList,
    title: { ja: "KY（危険予知）デジタル化", en: "KY (Hazard Identification) Digitization" },
    tag: { ja: "現場で即使える", en: "Ready for the field" },
    desc: { ja: "紙のKY用紙をスマホ入力・クラウド保存・PDF出力までワンストップで置き換え。現場別テンプレート・音声入力・写真添付対応。", en: "Replace paper KY forms with smartphone input, cloud storage, and PDF export — all in one. Supports site-specific templates, voice input, and photo attachments." },
    bullets: {
      ja: ["現場別 KY 入力フォーム設計（建設・製造・介護 ほか）", "音声入力・写真添付・位置情報タグ", "PDF 出力・履歴管理・労基署提出対応", "本サイトの KY 機能をベースにカスタマイズ"],
      en: ["Site-specific KY form design (construction, manufacturing, care, etc.)", "Voice input, photo attachments, GPS tagging", "PDF export, history management, labor standards office submission", "Customized on top of this site's KY feature"],
    },
    price: "¥500,000〜",
    accent: "emerald",
  },
  {
    id: "safety-automation",
    icon: ShieldCheck,
    title: { ja: "安全管理業務の自動化", en: "Safety Management Automation" },
    tag: { ja: "Excel・紙の棚卸しから", en: "Starting from Excel & paper" },
    desc: { ja: "安全衛生日誌・KY集計・ヒヤリハット集計などのルーティン業務をExcel VBAまたはWebアプリで自動化。月末処理の時間を数時間→数分へ。", en: "Automate routine tasks like safety diaries, KY aggregation, and near-miss reporting with Excel VBA or web apps. Cut month-end processing from hours to minutes." },
    bullets: {
      ja: ["現状ヒアリング → 業務フロー再設計", "Excel VBA / Google Apps Script / Webアプリで実装", "操作マニュアル・引き継ぎ動画・保守サポート", "安全書類・点検記録のデジタル化も対応"],
      en: ["Current-state review → workflow redesign", "Implemented in Excel VBA / Google Apps Script / Web app", "Operation manual, handover video, and maintenance support", "Safety documents and inspection records digitization available"],
    },
    price: "¥300,000〜",
    accent: "emerald",
  },
  {
    id: "law-notify",
    icon: BellRing,
    title: { ja: "法改正通知システム", en: "Law Amendment Notification System" },
    tag: { ja: "見落としゼロ", en: "Zero missed updates" },
    desc: { ja: "労働安全衛生法・化学物質管理・特別教育関連の改正を自動で収集 → 自社に影響する項目だけをメール／Slack通知。", en: "Automatically collect amendments to the Industrial Safety and Health Act, chemical substance regulations, and special education rules — and notify you via email / Slack only for items that affect your business." },
    bullets: {
      ja: ["貴社事業（業種・有害物・機械）に合わせた監視ルール設定", "月次レポート（影響評価・対応スケジュール）", "AI要約・原文リンク・社内通達テンプレート", "本サイトの法改正DBを基盤に構築"],
      en: ["Custom monitoring rules for your industry, hazardous substances, and equipment", "Monthly report (impact assessment + action schedule)", "AI summaries, source links, and internal memo templates", "Built on this site's law amendment database"],
    },
    price: "¥200,000〜",
    accent: "sky",
  },
  {
    id: "edu-content",
    icon: BookOpen,
    title: { ja: "教育コンテンツ制作", en: "Safety Training Content Production" },
    tag: { ja: "動画・テスト・修了証込み", en: "Video + test + certificate" },
    desc: { ja: "新入社員教育・職長教育・特別教育の動画／スライド／テストをセットで制作。LMS組み込み・修了証自動発行まで対応。", en: "Produce a complete set of video, slides, and tests for new-employee, foreman, and special education. Includes LMS integration and automatic certificate issuance." },
    bullets: {
      ja: ["脚本・撮影・編集・ナレーション込み", "理解度テスト・合格証 PDF 自動発行", "自社LMSへの組み込み、Eラーニングとして単体販売可", "安衛法60条・59条対応の教材構成"],
      en: ["Scriptwriting, filming, editing, and narration included", "Comprehension test + automatic PDF certificate", "LMS integration or standalone e-learning sales", "Content structure compliant with OSH Act Articles 59 & 60"],
    },
    price: "¥500,000〜",
    accent: "amber",
  },
  {
    id: "chemical",
    icon: FlaskConical,
    title: { ja: "化学物質管理体制の構築", en: "Chemical Substance Management System" },
    tag: { ja: "SDS・RA 一気通貫", en: "SDS to RA — end to end" },
    desc: { ja: "2024年改正安衛法に対応。SDS収集・リスクアセスメント・ばく露評価・教育・記録保存までの運用をまるごと整備。", en: "Compliant with the 2024 OSH Act amendments. We set up the full workflow: SDS collection, risk assessment, exposure evaluation, training, and record keeping." },
    bullets: {
      ja: ["取扱化学物質リストアップ → SDS 収集", "CREATE-SIMPLE等によるリスクアセスメント", "作業手順書・保護具選定・教育カリキュラム", "記録様式・内部監査チェックリスト"],
      en: ["Inventory of handled substances → SDS collection", "Risk assessment via CREATE-SIMPLE etc.", "Work procedures, PPE selection, and training curriculum", "Record templates and internal audit checklists"],
    },
    price: "¥500,000〜",
    accent: "violet",
  },
  {
    id: "special-edu",
    icon: GraduationCap,
    title: { ja: "特別教育・安全衛生教育", en: "Special Education & OHS Training" },
    tag: { ja: "対面／オンライン対応", en: "In-person or online" },
    desc: { ja: "フルハーネス・足場・低圧電気・職長教育等、12種類 対応教育＋要相談多数。講師派遣・オンライン配信・修了証発行まで。", en: "12 program types including full-harness, scaffolding, low-voltage electrical, and foreman education. Instructor dispatch, online streaming, and certificate issuance." },
    bullets: {
      ja: ["学科・実技を法定時間どおりに実施", "少人数・出張開催も対応（全国）", "修了証・受講者名簿・教材一式を納品", "職長教育・RST・安全大会講演も別途対応"],
      en: ["Theory and practical training conducted per statutory hours", "Small groups and on-site delivery available (nationwide)", "Completion certificates, attendance records, and materials delivered", "Foreman education, RST, and safety convention lectures also available"],
    },
    price: "¥150,000〜",
    accent: "amber",
  },
  {
    id: "truck-2024",
    icon: Truck,
    title: { ja: "運送業 2024年問題対応", en: "Trucking Industry 2024 Compliance" },
    tag: { ja: "改善基準告示・拘束時間", en: "Driving time regulations" },
    desc: { ja: "2024年4月施行の改善基準告示（拘束時間・休息時間）への対応を、運行管理デジタル化と教育コンテンツでサポート。", en: "Support compliance with the April 2024 improvement standard notice (restraint/rest hours) through transport management digitization and training content." },
    bullets: {
      ja: ["運行前点呼・点検記録の電子化（タブレット入力）", "拘束時間・休息時間の自動チェックとアラート", "ドライバー向け教育（過労運転・カスハラ・健康管理）", "運行管理者向け改善基準告示研修"],
      en: ["Pre-departure roll call and inspection records digitization (tablet)", "Automatic check and alerts for restraint/rest hours", "Driver training (fatigue driving, harassment, health management)", "Driving manager training on improvement standard notice"],
    },
    price: "¥300,000〜",
    accent: "sky",
  },
  {
    id: "claude-code",
    icon: Sparkles,
    title: { ja: "Claude Code 活用自動化", en: "Claude Code Rapid Development" },
    tag: { ja: "2〜5倍の開発速度", en: "2–5× development speed" },
    desc: { ja: "Claude Code を使った高速開発で、社内ツール・業務Webアプリ・Chatbotを短納期で構築。本サイト ANZEN AI 自体が実例。", en: "Rapid development with Claude Code to build internal tools, business web apps, and chatbots on short deadlines. This site (ANZEN AI) is a live example." },
    bullets: {
      ja: ["要件ヒアリング → 実装まで最短2週間", "Next.js + Vercel + Supabase 構成", "社内LLM・RAG・Chatbot構築", "運用引き継ぎ・社内人材育成込み"],
      en: ["Requirements to delivery in as little as 2 weeks", "Next.js + Vercel + Supabase stack", "Internal LLM, RAG, and chatbot development", "Operational handover and in-house team training included"],
    },
    price: "¥200,000〜",
    accent: "sky",
  },
] as const;

const SPECIAL_EDU_LAWS = [
  { label: "安衛法 第59条第3項 (OSH Act Art.59)", href: "https://laws.e-gov.go.jp/law/347AC0000000057" },
  { label: "安衛法 第60条（職長等）(Art.60 Foreman)", href: "https://laws.e-gov.go.jp/law/347AC0000000057" },
  { label: "安衛則 第36条（特別教育12種）(Rule Art.36)", href: "https://laws.e-gov.go.jp/law/347M50002000032" },
] as const;

type AccentKey = (typeof SERVICES)[number]["accent"];

const ACCENT_STYLES: Record<AccentKey, { icon: string; tag: string; price: string }> = {
  emerald: { icon: "bg-emerald-100 text-emerald-700", tag: "bg-emerald-50 text-emerald-700 border-emerald-200", price: "text-emerald-700" },
  sky: { icon: "bg-sky-100 text-sky-700", tag: "bg-sky-50 text-sky-700 border-sky-200", price: "text-sky-700" },
  amber: { icon: "bg-amber-100 text-amber-700", tag: "bg-amber-50 text-amber-700 border-amber-200", price: "text-amber-700" },
  violet: { icon: "bg-violet-100 text-violet-700", tag: "bg-violet-50 text-violet-700 border-violet-200", price: "text-violet-700" },
};

const TRACK_RECORD = [
  { label: { ja: "労働安全コンサル実績", en: "Safety consulting track record" }, value: "大手ゼネコン大型土木インフラ / Major general contractor — large-scale civil infrastructure" },
  { label: { ja: "専門家設計", en: "Expert-designed" }, value: "ANZEN AI 専門家チーム / ANZEN AI expert team" },
  { label: { ja: "Claude Code 実装サイト", en: "Claude Code showcase" }, value: "本サイト ANZEN AI / This site — ANZEN AI" },
  { label: { ja: "対応業種", en: "Industries served" }, value: "建設・製造・介護・林業・運輸 / Construction, Manufacturing, Care, Forestry, Transport" },
];

const FAQ = {
  ja: [
    { q: "遠方でも対応できますか？", a: "オンライン（Zoom / Teams）での相談・研修・納品は全国対応可能です。現地訪問が必要な場合は別途交通費を見積もります。" },
    { q: "最短でどれくらいの納期で対応できますか？", a: "Claude Code を活用した開発の場合、要件確定から最短2週間で初版納品が可能です。教育コンテンツは内容量次第で4〜8週間が目安です。" },
    { q: "見積りは無料ですか？", a: "はい。無料相談30分で課題・ゴールをヒアリングし、2〜3営業日以内にお見積りをお送りします。相談後にキャンセルいただいても費用は発生しません。" },
    { q: "複数メニューの組合せや月額顧問はできますか？", a: "可能です。「安全管理自動化＋特別教育＋月額顧問」のようなパッケージや、1年契約による割引もご用意しています。" },
    { q: "助成金は活用できますか？", a: "人材開発支援助成金・エイジフレンドリー補助金・業務改善助成金などが活用できる場合があります。申請書類の作成サポートも対応可能です。" },
    { q: "契約書・請求書払い・源泉徴収に対応していますか？", a: "すべて対応可能です。個人事業主へのお支払いとなるため、源泉徴収の要否はご相談のうえ決定します。" },
    { q: "個人事業主との契約に不安があります。事業継続性は？", a: "業務委託契約書に「成果物の知的財産権は発注者に帰属」「ソースコード・データの引渡条項」「保守期間中の体制継続義務」を明記します。万一の事業休止時にも、納品済みコードはお客様が独立運用できる形で引き渡します。" },
    { q: "相談後にしつこい営業はありませんか？", a: "ありません。無料相談後は、相談内容に基づくご提案メール1通のみお送りします。その後の営業連絡はご希望に応じてオプトアウト可能（返信『今回はパスします』で追客停止）です。" },
  ],
  en: [
    { q: "Can you work with clients far from Tokyo?", a: "Yes. Consultations, training, and deliveries via Zoom / Teams are available nationwide. Travel expenses are quoted separately when on-site visits are needed." },
    { q: "What is the shortest possible delivery time?", a: "With Claude Code development, we can deliver a first version in as little as 2 weeks from requirements sign-off. Education content typically takes 4–8 weeks depending on volume." },
    { q: "Is the estimate free?", a: "Yes. A free 30-min consultation covers your challenges and goals, and we send a quote within 2–3 business days. No cost if you cancel after the consultation." },
    { q: "Can I combine multiple services or get a monthly retainer?", a: "Yes. Packages like 'safety automation + special education + monthly retainer' are available, with discounts for annual contracts." },
    { q: "Can government subsidies be used?", a: "Yes, depending on the project. Human Resource Development Support Subsidies, Age-Friendly Subsidies, and Business Improvement Subsidies may apply. We can assist with the application paperwork." },
    { q: "Do you handle contracts, invoice payments, and withholding tax?", a: "All of the above. Since payment goes to a sole proprietor, withholding tax applicability is confirmed on a case-by-case basis." },
  ],
};

export function ServicesContent() {
  const { t, language } = useTranslation();
  const isEn = language === "en";
  const faq = isEn ? FAQ.en : FAQ.ja;

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <JsonLd
        schema={serviceSchema({
          name: "ANZEN AI 受託業務サービス",
          description: DESCRIPTION,
          url: "https://safe-ai-site.vercel.app/services",
          serviceType: "ProfessionalService",
          priceFrom: 150000,
        })}
      />

      {/* Hero */}
      <header className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
          <Zap className="h-3.5 w-3.5" />
          {isEn ? "Service Menu" : "受託業務メニュー"}
        </div>
        <h1 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">
          {isEn
            ? "We turn workplace safety into action — with AI and rapid development."
            : "現場の安全を、AIと高速開発で形にします。"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
          {isEn
            ? "Services directly handled by the ANZEN AI expert team. We combine large-scale infrastructure project management experience with Claude Code rapid development to deliver systems, materials, and workflows that work on the field — on short deadlines."
            : "ANZEN AI 専門家チームが直接担当する受託サービスです。大型土木インフラの施工管理経験と Claude Code による高速開発で、「現場で使える」システム・教材・仕組みを短納期で提供します。"}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 transition-colors"
          >
            <Mail className="h-4 w-4" />
            {isEn ? "Book free 30-min consultation" : "無料相談30分を申し込む"}
          </Link>
          <a
            href="#services"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 hover:border-emerald-400 transition-colors"
          >
            {isEn ? "View services ↓" : "メニューを見る ↓"}
          </a>
        </div>
      </header>

      {/* Track record */}
      <section className="mb-10 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-amber-50 p-6">
        <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-700">
          {isEn ? "Credentials & Track Record" : "監修者・実績"}
        </p>
        <h2 className="mt-1 text-base font-bold text-slate-900 sm:text-lg">
          {isEn
            ? "The intersection of occupational safety and Claude Code — only here."
            : "「労働安全」と「AI・Claude Code」の掛け算は、ここでしか依頼できません。"}
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TRACK_RECORD.map((r) => (
            <div key={r.value} className="rounded-xl border border-emerald-100 bg-white p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                {isEn ? r.label.en : r.label.ja}
              </p>
              <p className="mt-1 text-sm font-bold text-slate-900 leading-5">{r.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Services list */}
      <section id="services" className="mb-10">
        <h2 className="mb-4 text-lg font-bold text-slate-900">
          {isEn ? "Service Menu (8 types)" : "受託メニュー（全8種）"}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {SERVICES.map((s) => {
            const Icon = s.icon;
            const accent = ACCENT_STYLES[s.accent];
            return (
              <article
                key={s.id}
                className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${accent.icon}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900">{isEn ? s.title.en : s.title.ja}</h3>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${accent.tag}`}>
                        {isEn ? s.tag.en : s.tag.ja}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-600">{isEn ? s.desc.en : s.desc.ja}</p>
                  </div>
                </div>
                <ul className="mt-3 space-y-1 text-xs text-slate-700">
                  {(isEn ? s.bullets.en : s.bullets.ja).map((b) => (
                    <li key={b} className="flex items-start gap-1.5">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      {b}
                    </li>
                  ))}
                </ul>
                {s.id === "special-edu" && (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2">
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                      {isEn ? "Legal basis (e-Gov)" : "根拠条文（e-Gov）"}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {SPECIAL_EDU_LAWS.map((law) => (
                        <a
                          key={law.label}
                          href={law.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded border border-amber-300 bg-white px-2 py-0.5 text-[10px] font-medium text-amber-800 hover:bg-amber-100 transition-colors"
                        >
                          {law.label}
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                  <p className={`text-base font-bold ${accent.price}`}>{t("services.price_label")} {s.price}</p>
                  <Link
                    href={`/contact?category=automation&service=${s.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors"
                  >
                    {isEn ? "Free 30-min consult" : "無料相談30分"}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
        <p className="mt-4 text-xs leading-5 text-slate-500">
          {isEn
            ? "* Prices are tax-exclusive estimates. Vary with requirements, scale, and timeline. Package discounts and monthly retainer options available."
            : "※ 価格は税抜目安。要件・規模・納期により変動します。複数メニューの組合せ割引、月額顧問契約への切替もご相談ください。"}
        </p>
      </section>

      {/* Subsidy section */}
      <section className="mb-10 rounded-2xl border border-amber-200 bg-amber-50/40 p-6">
        <p className="text-[11px] font-bold uppercase tracking-widest text-amber-700">
          {isEn ? "Subsidy Estimate" : "助成金活用 概算試算"}
        </p>
        <h2 className="mt-1 text-lg font-bold text-slate-900">
          {isEn
            ? "Reduce your net cost by up to 75% with the right subsidies."
            : "実質負担を最大75%削減できる組み合わせがあります。"}
        </h2>
        <p className="mt-2 text-xs leading-5 text-slate-600">
          {isEn
            ? "These are typical-case estimates. Actual rates and caps vary by business size, industry, and requirements. We can assist with subsidy applications."
            : "以下は典型ケースの概算です。実際の支給率・上限額は事業規模・業種・要件達成状況で変動します。申請書類の作成サポートも対応可能。"}
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            {
              name: isEn ? "Human Resource Development Support Subsidy (人材開発支援助成金)" : "人材開発支援助成金（人への投資促進コース）",
              rate: isEn ? "Wage subsidy ¥760/person-hour + cost subsidy 45–75%" : "賃金助成 ¥760／人時 ＋ 経費助成 45〜75%",
              example: isEn ? "Training content ¥500,000 → Net cost ¥125,000–¥275,000" : "教育コンテンツ ¥500,000 → 実質負担 ¥125,000〜¥275,000",
              link: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000216097_00007.html",
            },
            {
              name: isEn ? "Business Improvement Subsidy (業務改善助成金)" : "業務改善助成金",
              rate: isEn ? "1/2–9/10 of equipment & consulting costs (cap ¥6M)" : "設備・コンサル費の 1/2〜9/10（上限¥6M）",
              example: isEn ? "Safety automation ¥300,000 → Net cost ¥30,000–¥150,000" : "安全管理自動化 ¥300,000 → 実質負担 ¥30,000〜¥150,000",
              link: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/roudoukijun/zigyonushi/shienjigyou/03.html",
            },
            {
              name: isEn ? "Age-Friendly Subsidy (エイジフレンドリー補助金)" : "エイジフレンドリー補助金",
              rate: isEn ? "1/2 of OHS measures for older workers (cap ¥1M)" : "高年齢労働者の安全衛生対策 1/2（上限¥1M）",
              example: isEn ? "Chemical management setup ¥500,000 → Net cost ¥250,000" : "化学物質管理体制構築 ¥500,000 → 実質負担 ¥250,000",
              link: "https://www.jashcon.or.jp/contents/age-friendly/",
            },
          ].map((s) => (
            <article key={s.name} className="rounded-xl border border-amber-100 bg-white p-4">
              <p className="text-sm font-bold text-slate-900">{s.name}</p>
              <p className="mt-2 text-[11px] font-semibold text-amber-700">{s.rate}</p>
              <p className="mt-2 text-xs leading-5 text-slate-600">{s.example}</p>
              <a
                href={s.link}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block text-[11px] font-semibold text-emerald-700 underline hover:text-emerald-800"
              >
                {isEn ? "Official info ↗" : "公式情報 ↗"}
              </a>
            </article>
          ))}
        </div>
        <p className="mt-4 text-[11px] text-slate-500">
          {isEn
            ? "* Subsidies require advance application and eligibility confirmation. Contact us before starting the project."
            : "※ 助成金は「事前申請・要件確認」が必須です。導入前にご相談ください。"}
        </p>
      </section>

      {/* FAQ */}
      <section className="mb-10 rounded-2xl border border-slate-200 bg-slate-50 p-6">
        <h2 className="mb-4 text-lg font-bold text-slate-900">
          {isEn ? "FAQ" : "よくある質問"}
        </h2>
        <dl className="grid gap-4 sm:grid-cols-2">
          {faq.map(({ q, a }) => (
            <div key={q} className="rounded-xl border border-slate-100 bg-white p-4">
              <dt className="text-sm font-bold text-slate-800">Q. {q}</dt>
              <dd className="mt-2 text-xs leading-5 text-slate-600">A. {a}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Final CTA */}
      <section className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-600 to-emerald-700 p-8 text-center text-white shadow-lg">
        <p className="text-xs font-bold uppercase tracking-widest text-emerald-100">
          {isEn ? "Let's talk first" : "まずは話を聞かせてください"}
        </p>
        <h2 className="mt-2 text-xl font-bold sm:text-2xl">
          {isEn ? "Free 30-min consultation (online)" : "無料相談30分（オンライン）"}
        </h2>
        <p className="mt-3 text-xs leading-5 text-emerald-50 sm:text-sm">
          {isEn
            ? "We listen to your current challenges and goals, then give you the best service combination and a rough estimate. No pressure, no hard follow-up."
            : "現状の課題・目指すゴールをヒアリングし、最適なメニュー構成と概算見積をお伝えします。無理な営業・しつこい追客は一切ありません。"}
        </p>
        <Link
          href="/contact?category=automation"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-emerald-700 hover:bg-emerald-50 transition-colors"
        >
          <Mail className="h-4 w-4" />
          {isEn ? "Book free consultation" : "無料相談を申し込む"}
        </Link>
        <p className="mt-3 text-[11px] text-emerald-100">
          {isEn
            ? "We reply to email/form inquiries within 24 hours (Mon–Fri)."
            : "メール／フォームからのお問い合わせには24時間以内にご返信します（土日祝を除く）。"}
        </p>
      </section>
    </main>
  );
}
