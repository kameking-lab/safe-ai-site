import type { Metadata } from "next";
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
import { ogImageUrl } from "@/lib/og-url";
import { JsonLd, serviceSchema } from "@/components/json-ld";

const TITLE = "受託業務｜KYデジタル化・安全管理自動化・法改正通知・Claude Code 開発";
const DESCRIPTION =
  "労働安全コンサルタント監修の受託業務。KYデジタル化¥500k〜、安全管理自動化¥300k〜、法改正通知¥200k〜、教育コンテンツ¥500k〜、化学物質管理¥500k〜、特別教育¥150k〜、Claude Code自動化¥200k〜。無料相談30分実施中。";

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
    id: "ky-digital",
    icon: ClipboardList,
    title: "KY（危険予知）デジタル化",
    tag: "現場で即使える",
    desc: "紙のKY用紙をスマホ入力・クラウド保存・PDF出力までワンストップで置き換え。現場別テンプレート・音声入力・写真添付対応。",
    bullets: [
      "現場別 KY 入力フォーム設計（建設・製造・介護 ほか）",
      "音声入力・写真添付・位置情報タグ",
      "PDF 出力・履歴管理・労基署提出対応",
      "本サイトの KY 機能をベースにカスタマイズ",
    ],
    price: "¥500,000〜",
    accent: "emerald",
  },
  {
    id: "safety-automation",
    icon: ShieldCheck,
    title: "安全管理業務の自動化",
    tag: "Excel・紙の棚卸しから",
    desc: "安全衛生日誌・KY集計・ヒヤリハット集計などのルーティン業務をExcel VBAまたはWebアプリで自動化。月末処理の時間を数時間→数分へ。",
    bullets: [
      "現状ヒアリング → 業務フロー再設計",
      "Excel VBA / Google Apps Script / Webアプリで実装",
      "操作マニュアル・引き継ぎ動画・保守サポート",
      "安全書類・点検記録のデジタル化も対応",
    ],
    price: "¥300,000〜",
    accent: "emerald",
  },
  {
    id: "law-notify",
    icon: BellRing,
    title: "法改正通知システム",
    tag: "見落としゼロ",
    desc: "労働安全衛生法・化学物質管理・特別教育関連の改正を自動で収集 → 自社に影響する項目だけをメール／Slack通知。",
    bullets: [
      "貴社事業（業種・有害物・機械）に合わせた監視ルール設定",
      "月次レポート（影響評価・対応スケジュール）",
      "AI要約・原文リンク・社内通達テンプレート",
      "本サイトの法改正DBを基盤に構築",
    ],
    price: "¥200,000〜",
    accent: "sky",
  },
  {
    id: "edu-content",
    icon: BookOpen,
    title: "教育コンテンツ制作",
    tag: "動画・テスト・修了証込み",
    desc: "新入社員教育・職長教育・特別教育の動画／スライド／テストをセットで制作。LMS組み込み・修了証自動発行まで対応。",
    bullets: [
      "脚本・撮影・編集・ナレーション込み",
      "理解度テスト・合格証 PDF 自動発行",
      "自社LMSへの組み込み、Eラーニングとして単体販売可",
      "安衛法60条・59条対応の教材構成",
    ],
    price: "¥500,000〜",
    accent: "amber",
  },
  {
    id: "chemical",
    icon: FlaskConical,
    title: "化学物質管理体制の構築",
    tag: "SDS・RA 一気通貫",
    desc: "2024年改正安衛法に対応。SDS収集・リスクアセスメント・ばく露評価・教育・記録保存までの運用をまるごと整備。",
    bullets: [
      "取扱化学物質リストアップ → SDS 収集",
      "CREATE-SIMPLE等によるリスクアセスメント",
      "作業手順書・保護具選定・教育カリキュラム",
      "記録様式・内部監査チェックリスト",
    ],
    price: "¥500,000〜",
    accent: "violet",
  },
  {
    id: "special-edu",
    icon: GraduationCap,
    title: "特別教育・安全衛生教育",
    tag: "対面／オンライン対応",
    desc: "フルハーネス・足場・低圧電気・職長教育等、12種類 対応教育＋要相談多数。講師派遣・オンライン配信・修了証発行まで。",
    bullets: [
      "学科・実技を法定時間どおりに実施",
      "少人数・出張開催も対応（全国）",
      "修了証・受講者名簿・教材一式を納品",
      "職長教育・RST・安全大会講演も別途対応",
    ],
    price: "¥150,000〜",
    accent: "amber",
  },
  {
    id: "truck-2024",
    icon: Truck,
    title: "運送業 2024年問題対応",
    tag: "改善基準告示・拘束時間",
    desc: "2024年4月施行の改善基準告示（拘束時間・休息時間）への対応を、運行管理デジタル化と教育コンテンツでサポート。",
    bullets: [
      "運行前点呼・点検記録の電子化（タブレット入力）",
      "拘束時間・休息時間の自動チェックとアラート",
      "ドライバー向け教育（過労運転・カスハラ・健康管理）",
      "運行管理者向け改善基準告示研修",
    ],
    price: "¥300,000〜",
    accent: "sky",
  },
  {
    id: "claude-code",
    icon: Sparkles,
    title: "Claude Code 活用自動化",
    tag: "短納期開発",
    desc: "Claude Code を使った高速開発で、社内ツール・業務Webアプリ・Chatbotを短納期で構築。本サイト ANZEN AI 自体が実例（要件定義〜初版納品 約2週間）。",
    bullets: [
      "要件ヒアリング → 初版納品 最短2週間（規模・要件により別途調整）",
      "Next.js + Vercel + Supabase 構成",
      "社内LLM・RAG・Chatbot構築",
      "運用引き継ぎ・社内人材育成込み",
    ],
    price: "¥200,000〜",
    accent: "sky",
  },
] as const;

const SPECIAL_EDU_LAWS = [
  { label: "安衛法 第59条第3項", href: "https://laws.e-gov.go.jp/law/347AC0000000057" },
  { label: "安衛法 第60条（職長等）", href: "https://laws.e-gov.go.jp/law/347AC0000000057" },
  { label: "安衛則 第36条（特別教育12種）", href: "https://laws.e-gov.go.jp/law/347M50002000032" },
] as const;

type AccentKey = (typeof SERVICES)[number]["accent"];

const ACCENT_STYLES: Record<AccentKey, { icon: string; tag: string; price: string }> = {
  emerald: {
    icon: "bg-emerald-100 text-emerald-700",
    tag: "bg-emerald-50 text-emerald-700 border-emerald-200",
    price: "text-emerald-700",
  },
  sky: {
    icon: "bg-sky-100 text-sky-700",
    tag: "bg-sky-50 text-sky-700 border-sky-200",
    price: "text-sky-700",
  },
  amber: {
    icon: "bg-amber-100 text-amber-700",
    tag: "bg-amber-50 text-amber-700 border-amber-200",
    price: "text-amber-700",
  },
  violet: {
    icon: "bg-violet-100 text-violet-700",
    tag: "bg-violet-50 text-violet-700 border-violet-200",
    price: "text-violet-700",
  },
};

const TRACK_RECORD = [
  { label: "労働安全コンサル実績", value: "大手ゼネコン大型土木インフラ" },
  { label: "監修者の資格", value: "労働安全コンサルタント 登録番号260022" },
  { label: "Claude Code 実装サイト", value: "本サイト ANZEN AI ほか" },
  { label: "対応業種", value: "建設・製造・介護・林業・運輸 等" },
];

const FAQ = [
  {
    q: "遠方でも対応できますか？",
    a: "オンライン（Zoom / Teams）での相談・研修・納品は全国対応可能です。現地訪問が必要な場合は別途交通費を見積もります。",
  },
  {
    q: "最短でどれくらいの納期で対応できますか？",
    a: "Claude Code を活用した開発の場合、要件確定から最短2週間で初版納品が可能です。教育コンテンツは内容量次第で4〜8週間が目安です。",
  },
  {
    q: "見積りは無料ですか？",
    a: "はい。無料相談30分で課題・ゴールをヒアリングし、2〜3営業日以内にお見積りをお送りします。相談後にキャンセルいただいても費用は発生しません。",
  },
  {
    q: "複数メニューの組合せや月額顧問はできますか？",
    a: "可能です。「安全管理自動化＋特別教育＋月額顧問」のようなパッケージや、1年契約による割引もご用意しています。",
  },
  {
    q: "助成金は活用できますか？",
    a: "人材開発支援助成金・エイジフレンドリー補助金・業務改善助成金などが活用できる場合があります。申請書類の作成サポートも対応可能です。",
  },
  {
    q: "契約書・請求書払い・源泉徴収に対応していますか？",
    a: "すべて対応可能です。個人事業主へのお支払いとなるため、源泉徴収の要否はご相談のうえ決定します。",
  },
];

export default function ServicesPage() {
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
          受託業務メニュー
        </div>
        <h1 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">
          現場の安全を、AIと高速開発で形にします。
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
          労働安全コンサルタント（登録番号260022・土木区分）が直接担当する受託サービスです。
          大型土木インフラの施工管理経験と Claude Code による高速開発で、
          「現場で使える」システム・教材・仕組みを短納期で提供します。
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 transition-colors"
          >
            <Mail className="h-4 w-4" />
            無料相談30分を申し込む
          </Link>
          <a
            href="#services"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 hover:border-emerald-400 transition-colors"
          >
            メニューを見る ↓
          </a>
        </div>
      </header>

      {/* 実績・強みセクション */}
      <section className="mb-10 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-amber-50 p-6">
        <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-700">
          監修者・実績
        </p>
        <h2 className="mt-1 text-base font-bold text-slate-900 sm:text-lg">
          「労働安全」と「AI・Claude Code」の掛け算は、ここでしか依頼できません。
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TRACK_RECORD.map((r) => (
            <div
              key={r.label}
              className="rounded-xl border border-emerald-100 bg-white p-3"
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                {r.label}
              </p>
              <p className="mt-1 text-sm font-bold text-slate-900 leading-5">{r.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* サービス一覧 */}
      <section id="services" className="mb-10">
        <h2 className="mb-4 text-lg font-bold text-slate-900">
          受託メニュー（全8種）
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
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${accent.icon}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900">{s.title}</h3>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${accent.tag}`}
                      >
                        {s.tag}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-600">{s.desc}</p>
                  </div>
                </div>
                <ul className="mt-3 space-y-1 text-xs text-slate-700">
                  {s.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-1.5">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      {b}
                    </li>
                  ))}
                </ul>
                {s.id === "special-edu" && (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2">
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">根拠条文（e-Gov）</p>
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
                  <p className={`text-base font-bold ${accent.price}`}>{s.price}</p>
                  <Link
                    href={`/contact?category=automation&service=${s.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors"
                  >
                    無料相談30分
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
        <p className="mt-4 text-xs leading-5 text-slate-500">
          ※ 価格は税抜目安。要件・規模・納期により変動します。複数メニューの組合せ割引、月額顧問契約への切替もご相談ください。
        </p>
      </section>

      {/* 助成金活用 概算試算 */}
      <section className="mb-10 rounded-2xl border border-amber-200 bg-amber-50/40 p-6">
        <p className="text-[11px] font-bold uppercase tracking-widest text-amber-700">
          助成金活用 概算試算
        </p>
        <h2 className="mt-1 text-lg font-bold text-slate-900">
          実質負担を最大75%削減できる組み合わせがあります。
        </h2>
        <p className="mt-2 text-xs leading-5 text-slate-600">
          以下は典型ケースの概算です。実際の支給率・上限額は事業規模・業種・要件達成状況で変動します。申請書類の作成サポートも対応可能。
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            {
              name: "人材開発支援助成金（人への投資促進コース）",
              rate: "賃金助成 ¥760／人時 ＋ 経費助成 45〜75%",
              example: "教育コンテンツ ¥500,000 → 実質負担 ¥125,000〜¥275,000",
              link: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000216097_00007.html",
            },
            {
              name: "業務改善助成金",
              rate: "設備・コンサル費の 1/2〜9/10（上限¥6M）",
              example: "安全管理自動化 ¥300,000 → 実質負担 ¥30,000〜¥150,000",
              link: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/roudoukijun/zigyonushi/shienjigyou/03.html",
            },
            {
              name: "エイジフレンドリー補助金",
              rate: "高年齢労働者の安全衛生対策 1/2（上限¥1M）",
              example: "化学物質管理体制構築 ¥500,000 → 実質負担 ¥250,000",
              link: "https://www.jashcon.or.jp/contents/age-friendly/",
            },
          ].map((s) => (
            <article
              key={s.name}
              className="rounded-xl border border-amber-100 bg-white p-4"
            >
              <p className="text-sm font-bold text-slate-900">{s.name}</p>
              <p className="mt-2 text-[11px] font-semibold text-amber-700">{s.rate}</p>
              <p className="mt-2 text-xs leading-5 text-slate-600">{s.example}</p>
              <a
                href={s.link}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block text-[11px] font-semibold text-emerald-700 underline hover:text-emerald-800"
              >
                公式情報 ↗
              </a>
            </article>
          ))}
        </div>
        <p className="mt-4 text-[11px] text-slate-500">
          ※ 助成金は「事前申請・要件確認」が必須です。導入前にご相談ください。
        </p>
      </section>

      {/* 導入事例（パイロット中・サンプル） */}
      <section className="mb-10 rounded-2xl border border-slate-200 bg-white p-6">
        <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-700">
          導入事例（パイロット段階・サンプル）
        </p>
        <h2 className="mt-1 text-lg font-bold text-slate-900">
          実際の現場で、こう使われ始めています。
        </h2>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          いずれもパイロット段階の匿名サンプルです。実名公表は契約後に個別協議のうえ、許諾を得たもののみ掲載します。
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {[
            {
              industry: "中堅ゼネコン（土木）",
              size: "社員120名／協力会社30社",
              before: "朝礼KYは紙、月末に職長が集計してExcel入力（月8時間）",
              after: "現場でスマホ入力 → 自動集計 → 月次レポート自動生成",
              effect: "月次集計時間 −50%（8h → 4h）",
              accent: "emerald",
            },
            {
              industry: "化学プラント（製造）",
              size: "社員260名／取扱化学物質120種",
              before: "SDSが紙ファイルで担当者依存、RA作成に1物質3時間",
              after: "SDS取込 → CREATE-SIMPLE 半自動RA、レビュー込で1物質40分",
              effect: "RA作成時間 −78%（30日プロジェクト）",
              accent: "violet",
            },
            {
              industry: "介護施設（特養）",
              size: "入居80名／職員45名",
              before: "カスハラ対応が口頭引継ぎ、対応マニュアルなし",
              after: "事例DB＋mental-health コンテンツで研修化、相談記録も電子化",
              effect: "離職率改善（前年比 −2.4pt、内部資料）",
              accent: "amber",
            },
          ].map((c) => (
            <article
              key={c.industry}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                {c.industry}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">{c.size}</p>
              <dl className="mt-3 space-y-2 text-xs">
                <div>
                  <dt className="font-bold text-slate-700">Before</dt>
                  <dd className="mt-0.5 leading-5 text-slate-600">{c.before}</dd>
                </div>
                <div>
                  <dt className="font-bold text-slate-700">After</dt>
                  <dd className="mt-0.5 leading-5 text-slate-600">{c.after}</dd>
                </div>
              </dl>
              <p className="mt-3 inline-block rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold text-emerald-800">
                効果：{c.effect}
              </p>
            </article>
          ))}
        </div>
        <p className="mt-4 text-[11px] text-slate-500">
          ※ 数字は実プロジェクトに基づく概算（業種・規模で変動します）。御社の状況に合わせた試算は無料相談で提示します。
        </p>
      </section>

      {/* FAQ */}
      <section className="mb-10 rounded-2xl border border-slate-200 bg-slate-50 p-6">
        <h2 className="mb-4 text-lg font-bold text-slate-900">よくある質問</h2>
        <dl className="grid gap-4 sm:grid-cols-2">
          {FAQ.map(({ q, a }) => (
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
          まずは話を聞かせてください
        </p>
        <h2 className="mt-2 text-xl font-bold sm:text-2xl">
          無料相談30分（オンライン）
        </h2>
        <p className="mt-3 text-xs leading-5 text-emerald-50 sm:text-sm">
          現状の課題・目指すゴールをヒアリングし、最適なメニュー構成と概算見積をお伝えします。
          <br className="hidden sm:block" />
          無理な営業・しつこい追客は一切ありません。
        </p>
        <Link
          href="/contact?category=automation"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-emerald-700 hover:bg-emerald-50 transition-colors"
        >
          <Mail className="h-4 w-4" />
          無料相談を申し込む
        </Link>
        <p className="mt-3 text-[11px] text-emerald-100">
          メール／フォームからのお問い合わせには24時間以内にご返信します（土日祝を除く）。
        </p>
      </section>
    </main>
  );
}
