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
    id: "claude-code",
    icon: Sparkles,
    title: "Claude Code 活用自動化",
    tag: "2〜5倍の開発速度",
    desc: "Claude Code を使った高速開発で、社内ツール・業務Webアプリ・Chatbotを短納期で構築。本サイト ANZEN AI 自体が実例。",
    bullets: [
      "要件ヒアリング → 実装まで最短2週間",
      "Next.js + Vercel + Supabase 構成",
      "社内LLM・RAG・Chatbot構築",
      "運用引き継ぎ・社内人材育成込み",
    ],
    price: "¥200,000〜",
    accent: "sky",
  },
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
          受託メニュー（全7種）
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
