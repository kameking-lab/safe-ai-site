import type { Metadata } from "next";
import { JsonLd, personSchema } from "@/components/json-ld";
import Image from "next/image";
import Link from "next/link";
import {
  FileText,
  AlertCircle,
  BookOpen,
  GraduationCap,
  Scale,
  Mail,
  Handshake,
  Users2,
  Sparkles,
  Check,
  Minus,
  ExternalLink,
  HardHat,
  ArrowRight,
} from "lucide-react";
import { TranslatedPageHeader } from "@/components/translated-page-header";
import { MHLW_MERGED_CHEMICAL_COUNT } from "@/lib/mhlw-chemicals";
import { SITE_STATS } from "@/data/site-stats";

export const metadata: Metadata = {
  title: "運営者情報・特商法表記 | ANZEN AI",
  description:
    "ANZEN AI（屋号）の運営者情報・特定商取引法に基づく表記・監修範囲を掲載。労働安全コンサルタント（登録番号260022・土木区分）が監修。建設・製造・林業の労働安全衛生コンサルティングも受託しています。",
  keywords: ["ANZEN AI", "労働安全コンサルタント", "登録番号260022", "労働安全衛生", "安全管理", "特定商取引法"],
  openGraph: {
    title: "運営者情報・特商法表記 | ANZEN AI",
    description:
      "ANZEN AI（屋号）の運営者情報・特定商取引法に基づく表記・監修範囲を掲載。労働安全コンサルタント（登録番号260022・土木区分）が監修。",
  },
};

const STATS = [
  { icon: AlertCircle, label: "事故データベース", value: `${SITE_STATS.accidentDbCount}件`, color: "red" },
  { icon: AlertCircle, label: "死亡災害", value: `${SITE_STATS.mhlwDeathsCount}件`, color: "red" },
  { icon: FileText, label: "法令条文", value: `${SITE_STATS.lawArticleCount}条文`, color: "emerald" },
  { icon: Scale, label: "化学物質", value: `${MHLW_MERGED_CHEMICAL_COUNT.toLocaleString()}物質`, color: "sky" },
  { icon: GraduationCap, label: "過去問", value: "1,000問+", color: "amber" },
  { icon: BookOpen, label: "Eラーニング", value: "200問+", color: "violet" },
] as const;

const COLOR_MAP = {
  sky: {
    bg: "bg-sky-50",
    border: "border-sky-200",
    icon: "bg-sky-100 text-sky-600",
    label: "text-sky-800",
    value: "text-sky-900",
  },
  red: {
    bg: "bg-red-50",
    border: "border-red-200",
    icon: "bg-red-100 text-red-600",
    label: "text-red-800",
    value: "text-red-900",
  },
  amber: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    icon: "bg-amber-100 text-amber-600",
    label: "text-amber-800",
    value: "text-amber-900",
  },
  emerald: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    icon: "bg-emerald-100 text-emerald-600",
    label: "text-emerald-800",
    value: "text-emerald-900",
  },
  violet: {
    bg: "bg-violet-50",
    border: "border-violet-200",
    icon: "bg-violet-100 text-violet-600",
    label: "text-violet-800",
    value: "text-violet-900",
  },
} as const;

const TOKUSHO_ROWS: { label: string; value: React.ReactNode }[] = [
  {
    label: "販売業者名",
    value: "個人事業主（氏名は請求により開示）",
  },
  {
    label: "運営責任者",
    value: "労働安全コンサルタント（登録番号260022・土木区分）",
  },
  {
    label: "所在地",
    value: (
      <>
        東京都内（請求により詳細開示）。消費者からのご請求があれば遅滞なく書面にて開示いたします。
        <Link href="/contact" className="ml-1 underline hover:text-slate-800">
          お問い合わせフォーム
        </Link>
        よりご連絡ください。
      </>
    ),
  },
  {
    label: "電話番号",
    value: (
      <>
        請求により開示（原則メール対応）。通常のご連絡は
        <Link href="/contact" className="mx-1 underline hover:text-slate-800">
          お問い合わせフォーム
        </Link>
        からお願いいたします（原則3営業日以内に返信）。
      </>
    ),
  },
  {
    label: "メールアドレス",
    value: (
      <>
        お問い合わせは
        <Link href="/contact" className="mx-1 underline hover:text-slate-800">
          お問い合わせフォーム
        </Link>
        よりご連絡ください。メールアドレスは消費者からのご請求により遅滞なく開示いたします。
      </>
    ),
  },
  {
    label: "販売価格",
    value: "各サービスページに記載（税抜表示／受託業務・顧問契約は別途見積）",
  },
  {
    label: "支払方法",
    value: "クレジットカード（Visa／Mastercard／American Express／JCB、Stripeにて処理）／銀行振込（受託業務・顧問契約）",
  },
  {
    label: "支払時期",
    value: "受託業務：請求書発行月の翌月末払い／サブスク：お申し込み時",
  },
  {
    label: "サービス提供時期",
    value: "受託業務：契約書記載の納期／サブスク：お申し込み完了後、即時提供",
  },
  {
    label: "返品・キャンセル",
    value:
      "デジタルコンテンツおよび役務提供の性質上、原則として返金はお受けできません。詳細はお問い合わせフォームよりご相談ください。",
  },
];

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <JsonLd schema={personSchema()} />
      <TranslatedPageHeader
        titleJa="運営者情報・特定商取引法に基づく表記"
        titleEn="About ANZEN AI"
        descriptionJa="ANZEN AI の運営者情報と特商法表記"
        descriptionEn="Operator information and legal disclosures for ANZEN AI"
        iconName="Info"
        iconColor="emerald"
      />

      <div className="mt-6 space-y-6">
        {/* One Big Thing — サイトの独自価値宣言（ID_060・ID_002・ID_048） */}
        <section
          aria-labelledby="one-big-thing-heading"
          className="rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 via-white to-amber-50 p-5 shadow-sm"
        >
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-800">
            <Sparkles className="h-4 w-4 text-amber-500" aria-hidden="true" />
            ANZEN AI の One Big Thing
          </div>
          <h2
            id="one-big-thing-heading"
            className="mt-2 text-xl font-bold leading-snug text-slate-900 sm:text-2xl"
          >
            現場の声を反映して継続的に進化する、公開PDCA型の安全ポータル
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-700">
            私たちの差別化は、機能の数ではありません。
            <strong className="font-bold text-emerald-900">
              現場担当者・安全管理者・外国人労働者など多様な立場からのフィードバックを公開 PDCA で回し続ける運営
            </strong>
            そのものです。
            労働安全コンサルタント（登録番号260022）の監修のもと、ユーザーの指摘は全件確認し、短いサイクルで実装・検証を繰り返します。
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Pill
              k="更新頻度"
              v="週次"
              note="法改正・事故DB・UIを継続改善"
            />
            <Pill
              k="透明性"
              v="公開PDCA"
              note="指摘と対応はコミット履歴で追跡可能"
            />
            <Pill
              k="出典必須"
              v="RAG 33 法令"
              note="e-Gov直リンク・通達・判例併記"
            />
          </div>
          <p className="mt-3 text-[11px] leading-5 text-slate-500">
            ※ 批判を隠さず受け止めて前進する運用速度そのものが、サイト全体の一次差別化軸です。
          </p>
        </section>

        {/* 監修者プロフィール */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-bold text-slate-900">
            監修者プロフィール
          </h2>
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
            {/* マスコット */}
            <div className="flex-shrink-0">
              <Image
                src="/mascot/mascot-chihuahua-4.png"
                alt="ANZEN AI マスコット"
                width={100}
                height={100}
                className="drop-shadow-md"
              />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <p className="text-2xl font-bold text-slate-900 sm:text-3xl">
                労働安全コンサルタント
              </p>
              <p className="mt-1 text-base text-slate-500">
                登録番号 260022（土木区分）
              </p>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-sm font-semibold text-emerald-700 border border-emerald-200">
                <Scale className="h-4 w-4" />
                屋号：ANZEN AI
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                スーパーゼネコンでの大型インフラ施工管理の実務経験を活かし、労働安全衛生コンサルティングと安全管理システムの開発・提供を行っています。
                AI・DX の活用で現場の安全業務を効率化するデジタルツールとして、屋号 ANZEN AI のもと本サイトを監修・運営しています。
              </p>
              <div className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50/60 p-3 text-left">
                <p className="text-xs font-semibold text-emerald-800">監修範囲</p>
                <ul className="mt-1 list-disc pl-4 text-xs leading-5 text-slate-700">
                  <li>法令・法改正情報の選定および要約方針のレビュー</li>
                  <li>KY用紙・リスクアセスメント様式の適合性確認</li>
                  <li>事故データベース掲載基準および出典の取扱い</li>
                  <li>Eラーニング・過去問の内容整合性のスポットチェック</li>
                </ul>
                <p className="mt-2 text-[11px] leading-5 text-slate-500">
                  ※ AI生成の要約・回答は最新法令や個別事案の判断を保証するものではありません。具体的な判断は必ず一次資料・専門家をご確認ください。
                </p>
              </div>

              {/* 施工安全事例へのリンク */}
              <div className="mt-4">
                <Link
                  href="/about/cases"
                  className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800 hover:bg-amber-100 transition-colors"
                >
                  <HardHat className="h-4 w-4" />
                  監修者の施工安全事例を見る（5事例）
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              {/* 資格・経歴 */}
              <div className="mt-4 grid gap-3 sm:grid-cols-2 text-left">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold text-slate-700 mb-1">取得資格</p>
                  <ul className="text-xs leading-5 text-slate-600 space-y-0.5">
                    <li>・ 労働安全コンサルタント（土木区分・登録番号 260022）</li>
                    <li>・ 1級土木施工管理技士</li>
                    <li>・ 監理技術者</li>
                  </ul>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold text-slate-700 mb-1">実務経験</p>
                  <ul className="text-xs leading-5 text-slate-600 space-y-0.5">
                    <li>・ スーパーゼネコンでの施工管理</li>
                    <li>・ 大型インフラ工事の安全管理</li>
                    <li>・ 下請・協力会社を含む現場統括</li>
                  </ul>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold text-slate-700 mb-1">AI・DX 活用</p>
                  <ul className="text-xs leading-5 text-slate-600 space-y-0.5">
                    <li>・ Python / OpenAI API による安全業務自動化</li>
                    <li>・ Excel VBA で帳票・KY・安全書類をデジタル化</li>
                    <li>・ Claude Code を用いた高速 Web 開発</li>
                  </ul>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold text-slate-700 mb-1">専門分野</p>
                  <ul className="text-xs leading-5 text-slate-600 space-y-0.5">
                    <li>・ 建設・製造業の労働安全衛生</li>
                    <li>・ リスクアセスメント・KY の仕組み化</li>
                    <li>・ 安全衛生教育・特別教育の企画運営</li>
                  </ul>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold text-slate-700 mb-1">表彰実績</p>
                  <ul className="text-xs leading-5 text-slate-600 space-y-0.5">
                    <li>・ 大規模プロジェクトで表彰実績あり</li>
                  </ul>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold text-slate-700 mb-1">所属</p>
                  <ul className="text-xs leading-5 text-slate-600 space-y-0.5">
                    <li>・ 日本労働安全衛生コンサルタント会</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* サイトの実績 */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-bold text-slate-900">
            サイトの実績
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {STATS.map((stat) => {
              const c = COLOR_MAP[stat.color];
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className={`flex flex-col items-center gap-2 rounded-xl border p-3 text-center ${c.bg} ${c.border}`}
                >
                  <span
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-full ${c.icon}`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <p className={`text-lg font-bold leading-none ${c.value}`}>
                    {stat.value}
                  </p>
                  <p className={`text-xs font-medium ${c.label}`}>
                    {stat.label}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* パートナー／連携先 */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-2 flex items-center gap-2 text-base font-bold text-slate-900">
            <Handshake className="h-4 w-4 text-emerald-600" aria-hidden="true" />
            パートナー／連携先
          </h2>
          <p className="mb-4 text-xs leading-5 text-slate-500">
            当サイトは下記の公的機関・団体が公開する一次資料を引用・参照しています。
            連携・相互リンク等のご提案はお問い合わせフォームよりご連絡ください。
          </p>
          <ul className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            {[
              { name: "厚生労働省 労働基準局", url: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/roudoukijun/index.html", role: "法令・通達・統計の一次出典" },
              { name: "e-Gov 法令検索", url: "https://laws.e-gov.go.jp/", role: "条文の原文リンク先" },
              { name: "中央労働災害防止協会（中災防）", url: "https://www.jisha.or.jp/", role: "RST・安全大会・OSHMS資料" },
              { name: "建設業労働災害防止協会（建災防）", url: "https://www.kensaibou.or.jp/", role: "建設業の講習・安全衛生計画" },
              { name: "独立行政法人 労働者健康安全機構", url: "https://www.johas.go.jp/", role: "労災認定・エイジフレンドリー補助金" },
              { name: "外国人技能実習機構（OTIT）", url: "https://www.otit.go.jp/", role: "技能実習生相談窓口（多言語）" },
            ].map((p) => (
              <li
                key={p.name}
                className="rounded-lg border border-slate-200 bg-slate-50/60 p-3"
              >
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-semibold text-slate-800 hover:text-emerald-700"
                >
                  {p.name}
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
                <p className="mt-0.5 text-[11px] leading-5 text-slate-500">{p.role}</p>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] leading-5 text-slate-400">
            ※ 上記は公開資料の参照・リンク関係であり、各団体との公式な業務提携・推薦関係を意味するものではありません。
          </p>
        </section>

        {/* 競合比較 */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-2 flex items-center gap-2 text-base font-bold text-slate-900">
            <Sparkles className="h-4 w-4 text-amber-500" aria-hidden="true" />
            競合比較
          </h2>
          <p className="mb-4 text-xs leading-5 text-slate-500">
            他の労働安全情報サイト・公的資源と比較した本サイトの位置づけです。
            それぞれに得意領域があるため、目的に応じて併用されることを推奨します。
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[540px] text-xs sm:text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">機能・特徴</th>
                  <th className="px-3 py-2 text-center font-semibold">ANZEN AI</th>
                  <th className="px-3 py-2 text-center font-semibold">厚労省<br />e-Gov</th>
                  <th className="px-3 py-2 text-center font-semibold">中災防</th>
                  <th className="px-3 py-2 text-center font-semibold">大手有料LMS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {[
                  { label: "法令条文の一次出典", self: true, egov: true, jisha: true, lms: false },
                  { label: "事故DBのグラフ可視化", self: true, egov: false, jisha: false, lms: true },
                  { label: "KY用紙（シンプル/詳細切替）", self: true, egov: false, jisha: false, lms: true },
                  { label: "化学物質RA入力ツール", self: true, egov: false, jisha: false, lms: false },
                  { label: "過去問1,000問超", self: true, egov: false, jisha: true, lms: true },
                  { label: "Eラーニング（業種別250問+）", self: true, egov: false, jisha: true, lms: true },
                  { label: "助成金早見（中小向け）", self: true, egov: false, jisha: false, lms: false },
                  { label: "現場向けスマホ導線", self: true, egov: false, jisha: false, lms: false },
                  { label: "無料で全機能試せる", self: true, egov: true, jisha: false, lms: false },
                  { label: "多言語（やさしい日本語以外）", self: false, egov: false, jisha: false, lms: false },
                  { label: "SCORM/xAPI対応", self: false, egov: false, jisha: false, lms: true },
                ].map((r) => (
                  <tr key={r.label}>
                    <td className="px-3 py-2 font-medium">{r.label}</td>
                    <td className="px-3 py-2 text-center">
                      {r.self ? <Check className="mx-auto h-4 w-4 text-emerald-600" aria-label="対応" /> : <Minus className="mx-auto h-4 w-4 text-slate-300" aria-label="未対応" />}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {r.egov ? <Check className="mx-auto h-4 w-4 text-emerald-600" aria-label="対応" /> : <Minus className="mx-auto h-4 w-4 text-slate-300" aria-label="未対応" />}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {r.jisha ? <Check className="mx-auto h-4 w-4 text-emerald-600" aria-label="対応" /> : <Minus className="mx-auto h-4 w-4 text-slate-300" aria-label="未対応" />}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {r.lms ? <Check className="mx-auto h-4 w-4 text-emerald-600" aria-label="対応" /> : <Minus className="mx-auto h-4 w-4 text-slate-300" aria-label="未対応" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] leading-5 text-slate-400">
            ※ 2026年4月時点の各サービス公開情報をもとに比較。機能は随時変更されます。多言語・SCORM対応は今後の開発課題として認識しています。
          </p>
        </section>

        {/* サイト設計思想 */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-2 flex items-center gap-2 text-base font-bold text-slate-900">
            <Users2 className="h-4 w-4 text-sky-600" aria-hidden="true" />
            誰のためのサイトか
          </h2>
          <p className="text-sm leading-6 text-slate-700">
            労働安全は、建設業の男性ベテランのためだけにある領域ではありません。
            外国人実習生・女性施工管理・高齢パート・在宅フリーランス・障害者・LGBTQ当事者の労働者にも、等しく届く情報ポータルを目指しています。
          </p>
          <ul className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
            {[
              "建設・製造の現場職長",
              "中小企業の経営者",
              "新人安全衛生担当者",
              "外国人技能実習の指導員",
              "医療・介護の管理職",
              "行政・協会・士業",
              "高齢・非正規労働者",
              "女性施工管理・現場監督",
              "障害者雇用の担当者",
            ].map((u) => (
              <li
                key={u}
                className="rounded-lg bg-sky-50 px-2.5 py-1.5 text-center font-medium text-sky-800"
              >
                {u}
              </li>
            ))}
          </ul>
        </section>

        {/* お問い合わせ */}
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 text-center">
          <p className="text-sm font-semibold text-emerald-800 mb-1">
            ご質問・ご要望はお気軽に
          </p>
          <p className="text-xs text-slate-600 mb-4">
            システムの導入相談・機能リクエスト・不具合報告など何でもお問い合わせください。
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors"
          >
            <Mail className="h-4 w-4" />
            お問い合わせはこちら
          </Link>
        </div>

        {/* 特定商取引法 */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-bold text-slate-900">
            特定商取引法に基づく表記
          </h2>
          <dl className="divide-y divide-slate-100">
            {TOKUSHO_ROWS.map((row) => (
              <div
                key={row.label}
                className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[160px_1fr] sm:gap-4"
              >
                <dt className="text-xs font-semibold text-slate-500 sm:text-sm">
                  {row.label}
                </dt>
                <dd className="text-sm leading-6 text-slate-700">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800 leading-5">
            プラン詳細・解約方法は
            <Link href="/pricing" className="underline hover:text-blue-900">料金プランページ</Link>
            および
            <Link href="/terms" className="underline hover:text-blue-900">利用規約</Link>
            をご確認ください。
          </p>
        </section>

        {/* 免責事項 */}
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-xs text-amber-800 leading-6">
          <p className="font-semibold mb-1">免責事項</p>
          <p>
            本サービスが提供する情報は、労働安全衛生に関する一般的な情報提供を目的としています。
            個別の法的判断・安全管理措置については、必ず専門家にご相談ください。
            本サービスの利用によって生じた損害について、運営者は責任を負いかねます。
          </p>
        </div>
      </div>
    </main>
  );
}

function Pill({ k, v, note }: { k: string; v: string; note: string }) {
  return (
    <div className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-center shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">{k}</p>
      <p className="mt-1 text-lg font-bold leading-tight text-slate-900">{v}</p>
      <p className="mt-0.5 text-[10px] leading-4 text-slate-500">{note}</p>
    </div>
  );
}
