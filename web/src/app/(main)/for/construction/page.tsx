import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Building2, CalendarDays, ClipboardList, FileText, FlaskConical, FolderOpen, Footprints, HardHat, MessageSquare, Monitor, Scale, TestTube2, Thermometer, UserRound, Users, Wrench } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { JsonLd, breadcrumbSchema, webPageSchema } from "@/components/json-ld";
import { ogImageUrl } from "@/lib/og-url";
import { CONSTRUCTION_PRIORITY_CAS } from "@/lib/regulation-tag-labels";
import { MHLW_MERGED_CHEMICAL_COUNT } from "@/lib/mhlw-chemicals";
import { MainFeatureNextActions } from "@/components/main-feature-next-actions";
import { RoleAnchorScroller } from "@/components/for-construction/role-anchor-scroller";

const TITLE = "建設業の安全衛生 — 職長・元請担当・現場代理人のための実務ポータル";
const DESCRIPTION =
  "墜落・足場・クレーン・粉じん・化学物質まで、建設業の現場で当日から使える KY 用紙・朝礼ネタ・年次計画・法令早見を集約。労働安全衛生コンサルタント (登録番号260022) 監修の研究プロジェクト。";
const CANONICAL = "/for/construction";
const FULL_URL = "https://www.anzen-ai-portal.jp/for/construction";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: FULL_URL,
    type: "website",
    images: [{ url: ogImageUrl("建設業の安全衛生", "職長・元請担当・現場代理人のための実務ポータル"), width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

const KY_PRESET_SUMMARY = [
  {
    work: "鉄骨建方作業 (高所での梁接合・ボルト締め)",
    hazard: "足場端部から墜落・転落 (手すり欠損、踏み板ずれ)",
    reduction: "手すり・幅木の作業前点検。フルハーネスを足場親綱に掛け替えながら移動",
  },
  {
    work: "型枠解体作業 (2F床スラブ下の支保工撤去)",
    hazard: "資材の落下・飛来により下方作業者が被災",
    reduction: "水平安全ネット設置。立入禁止ロープで作業区画を明示",
  },
  {
    work: "コンクリート打設 (ポンプ車使用・バイブレーター操作)",
    hazard: "重機との接触・はさまれ (バックホウ旋回半径内立入)",
    reduction: "重機オペレーターと合図確認。旋回半径内は必ず停止後に立入",
  },
];

const LAW_HIGHLIGHTS = [
  { law: "安衛則 第518〜575条", topic: "墜落防止・足場の構造・作業床", url: "/law-search?q=%E5%AE%89%E8%A1%9B%E5%89%87+518" },
  { law: "足場の組立て等作業主任者技能講習修了者の選任", topic: "安衛則 第565条", url: "/law-search?q=%E8%B6%B3%E5%A0%B4+%E4%BD%9C%E6%A5%AD%E4%B8%BB%E4%BB%BB%E8%80%85" },
  { law: "クレーン等安全規則", topic: "玉掛け・転倒防止・定期自主検査", url: "/law-search?q=%E3%82%AF%E3%83%AC%E3%83%BC%E3%83%B3%E7%AD%89%E5%AE%89%E5%85%A8%E8%A6%8F%E5%89%87" },
  { law: "有機溶剤中毒予防規則", topic: "塗装・防水での溶剤暴露管理", url: "/law-search?q=%E6%9C%89%E6%A9%9F%E5%89%87" },
  { law: "粉じん障害防止規則", topic: "ずい道・はつり作業の局排・健診", url: "/law-search?q=%E7%B2%89%E3%81%98%E3%82%93%E5%89%87" },
  { law: "じん肺法", topic: "粉じん作業歴の管理と健診頻度", url: "/law-search?q=%E3%81%98%E3%82%93%E8%82%BA%E6%B3%95" },
  { law: "建設業労働災害防止規程", topic: "建災防の自主基準 (元請の統括管理含む)", url: "/circulars?q=%E5%BB%BA%E7%81%BD%E9%98%B2" },
  { law: "石綿障害予防規則 第3条 (事前調査)", topic: "解体・改修工事の電子報告義務", url: "/law-search?q=%E7%9F%B3%E7%B6%BF%E5%89%87" },
];

const CIRCULAR_HIGHLIGHTS = [
  { title: "フルハーネス型墜落制止用器具に関する規制 (基発0625第3号)", url: "/circulars?q=%E3%83%95%E3%83%AB%E3%83%8F%E3%83%BC%E3%83%8D%E3%82%B9" },
  { title: "足場からの墜落防止措置の強化 (基発0314第2号)", url: "/circulars?q=%E8%B6%B3%E5%A0%B4+%E5%A2%9C%E8%90%BD" },
  { title: "石綿事前調査結果の電子報告制度", url: "/circulars?q=%E7%9F%B3%E7%B6%BF+%E4%BA%8B%E5%89%8D%E8%AA%BF%E6%9F%BB" },
  { title: "建設業における一人親方等の安全衛生対策", url: "/circulars?q=%E4%B8%80%E4%BA%BA%E8%A6%AA%E6%96%B9" },
  { title: "職場における熱中症予防のためのガイドライン (建設業向け運用)", url: "/circulars?q=%E7%86%B1%E4%B8%AD%E7%97%87" },
];

const MONTHLY_TOPICS = [
  { month: "4月", topic: "新規入場者教育・新年度安全衛生方針の周知" },
  { month: "5〜9月", topic: "熱中症予防 (WBGT測定・休憩計画)・夏季公衆災害" },
  { month: "6月", topic: "全国安全週間 準備 (7月)・パトロール強化" },
  { month: "10月", topic: "全国労働衛生週間・健康診断結果のフォロー" },
  { month: "12〜2月", topic: "凍結・降雪災害防止・年末年始安全大会" },
  { month: "通年", topic: "安全衛生委員会 (毎月) 議題・現場パトロール記録" },
];

const CHEMICAL_CATEGORIES: Array<{
  key: "塗装系" | "解体系" | "防水系" | "地盤改良系" | "溶剤系";
  label: string;
  caption: string;
}> = [
  { key: "塗装系", label: "塗装系", caption: "溶剤蒸気・有機則対応" },
  { key: "解体系", label: "解体系", caption: "石綿・鉛・重金属" },
  { key: "防水系", label: "防水系", caption: "イソシアネート・塩素系" },
  { key: "地盤改良系", label: "地盤改良系", caption: "アクリルアミド等" },
  { key: "溶剤系", label: "溶剤系", caption: "特化則・有機則対象" },
];

const CONSTRUCTION_STATS = {
  totalAccidents: 66713,
  topTypes: [
    { name: "墜落・転落 (合計)", count: 15443 + 7271 },
    { name: "転倒", count: 6537 },
    { name: "はさまれ・巻き込まれ", count: 4983 },
    { name: "飛来・落下", count: 4601 },
  ],
  source: "厚生労働省「労働者死傷病報告」業種別集計 (建設業)",
};

export default function ForConstructionPage() {
  return (
    <PageContainer width="full">
      <JsonLd
        schema={[
          webPageSchema({
            name: TITLE,
            description: DESCRIPTION,
            url: FULL_URL,
            keywords: [
              "建設業",
              "安全衛生",
              "KY用紙",
              "墜落防止",
              "足場",
              "クレーン",
              "粉じん",
              "じん肺",
              "化学物質",
              "職長",
              "統括安全衛生責任者",
              "現場代理人",
              "労働安全衛生コンサルタント",
            ],
          }),
          breadcrumbSchema([
            { name: "ホーム", url: "https://www.anzen-ai-portal.jp/" },
            { name: "業種別ポータル", url: "https://www.anzen-ai-portal.jp/industries" },
            { name: "建設業", url: FULL_URL },
          ]),
        ]}
      />
      <RoleAnchorScroller />

      {/* Hero */}
      <section className="rounded-3xl bg-gradient-to-br from-emerald-50 via-white to-amber-50 p-6 sm:p-10 border border-emerald-100">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white">
          <HardHat className="h-3.5 w-3.5" />
          建設業 実務ポータル
        </div>
        <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold leading-tight text-slate-900">
          建設現場の安全衛生、ここに集約。
        </h1>
        <p className="mt-4 text-base text-slate-700 leading-relaxed max-w-3xl">
          職長・元請安全担当・現場代理人が、当日から使える KY 用紙・朝礼ネタ・年次計画・法令早見・化学物質情報を一箇所に。
          労働安全衛生コンサルタント (登録番号260022) 監修の研究プロジェクトです。
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href="#for-foreman"
            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700"
          >
            <HardHat className="h-4 w-4" /> 職長 (朝礼・KY)
          </Link>
          <Link
            href="#for-manager"
            className="inline-flex items-center gap-1.5 rounded-full bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-700"
          >
            <Users className="h-4 w-4" /> 元請担当 (統括管理)
          </Link>
          <Link
            href="#for-supervisor"
            className="inline-flex items-center gap-1.5 rounded-full bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-700"
          >
            <FileText className="h-4 w-4" /> 現場代理人 (計画・報告)
          </Link>
        </div>
      </section>

      {/* 当日使える機能 */}
      <section id="today" className="mt-10">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-emerald-700" />
          当日使える機能 (朝礼前 5 分)
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Link
            href="/ky?industry=construction"
            className="rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4 hover:bg-emerald-100"
          >
            <p className="font-bold text-emerald-900">KY 用紙を作る</p>
            <p className="mt-1 text-xs text-emerald-800">建設業プリセット (鉄骨建方・型枠解体・打設) を初期表示。音声入力対応。</p>
            <p className="mt-2 text-xs font-semibold text-emerald-700 inline-flex items-center gap-0.5">/ky を開く <ArrowRight className="h-3 w-3" /></p>
          </Link>
          <Link
            href="/chatbot?q=%E4%BB%8A%E6%97%A5%E3%81%AE%E5%BB%BA%E8%A8%AD%E6%A5%AD%E3%81%AE%E6%9C%9D%E7%A4%BC%E3%81%A7%E8%A9%B1%E3%81%99%E3%83%8D%E3%82%BF%E3%82%92%E6%8F%90%E6%A1%88%E3%81%97%E3%81%A6"
            className="rounded-xl border-2 border-sky-300 bg-sky-50 p-4 hover:bg-sky-100"
          >
            <p className="font-bold text-sky-900">朝礼ネタを提案</p>
            <p className="mt-1 text-xs text-sky-800">法令チャットに「今日の建設業の朝礼ネタ」を投げて、季節・時事に応じた話題を引き出す。</p>
            <p className="mt-2 text-xs font-semibold text-sky-700 inline-flex items-center gap-0.5">/chatbot を開く <ArrowRight className="h-3 w-3" /></p>
          </Link>
          <Link
            href="/signage"
            className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4 hover:bg-amber-100"
          >
            <p className="font-bold text-amber-900">サイネージで掲示</p>
            <p className="mt-1 text-xs text-amber-800">気象警報・法改正・事故速報を、現場の常時表示画面で全員に共有。</p>
            <p className="mt-2 text-xs font-semibold text-amber-700 inline-flex items-center gap-0.5">/signage を開く <ArrowRight className="h-3 w-3" /></p>
          </Link>
        </div>
      </section>

      {/* 役職別エントリ - 職長 */}
      <section
        id="for-foreman"
        tabIndex={-1}
        className="mt-12 scroll-mt-20 rounded-2xl border-2 border-emerald-200 bg-white p-5 sm:p-7"
        aria-labelledby="for-foreman-heading"
      >
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
          <HardHat className="h-3.5 w-3.5" /> 職長向け
        </div>
        <h2 id="for-foreman-heading" className="mt-3 text-2xl font-bold text-slate-900">
          職長 (作業班長) の毎日: 朝礼・KY・現場点検
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          朝礼前にネタが思いつかない・KY 用紙が白紙になる、を解消する3つの即実行ルート。
        </p>
        <div className="mt-5 space-y-3">
          <p className="text-sm font-semibold text-slate-800">建設業 KY プリセット (作業×リスク×対策)</p>
          <ol className="space-y-2.5">
            {KY_PRESET_SUMMARY.map((p, i) => (
              <li key={i} className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-3">
                <p className="text-sm font-bold text-emerald-900">{i + 1}. {p.work}</p>
                <p className="mt-1 text-xs text-slate-700">
                  <span className="font-semibold text-rose-700">リスク:</span> {p.hazard}
                </p>
                <p className="mt-0.5 text-xs text-slate-700">
                  <span className="font-semibold text-emerald-700">対策:</span> {p.reduction}
                </p>
              </li>
            ))}
          </ol>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/ky?industry=construction" className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700">
            KY 用紙を作成 →
          </Link>
          <Link href="/ky-examples" className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-white px-3 py-1.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-50">
            KY 事例 150 件を見る →
          </Link>
          <Link href="/risk-prediction" className="inline-flex items-center gap-1 rounded-md border border-violet-300 bg-white px-3 py-1.5 text-sm font-semibold text-violet-800 hover:bg-violet-50">
            AI で潜在リスクを予測 →
          </Link>
        </div>
      </section>

      {/* 役職別エントリ - 元請担当 */}
      <section
        id="for-manager"
        tabIndex={-1}
        className="mt-8 scroll-mt-20 rounded-2xl border-2 border-sky-200 bg-white p-5 sm:p-7"
        aria-labelledby="for-manager-heading"
      >
        <div className="inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-800">
          <Users className="h-3.5 w-3.5" /> 元請安全担当向け
        </div>
        <h2 id="for-manager-heading" className="mt-3 text-2xl font-bold text-slate-900">
          元請担当の毎月: 統括管理・委員会・報告書
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          重層下請の元方事業者責任・統括安全衛生責任者の選任要件・委員会議題まで、月次運用を一気に整える。
        </p>
        <ul className="mt-5 space-y-2 text-sm text-slate-700">
          <li className="flex items-start gap-2">
            <span className="font-bold text-sky-700">▸</span>
            <span>
              <strong>統括安全衛生責任者・元方安全衛生管理者の選任要件</strong> (安衛法 第15条・第15条の2)。
              <Link href="/chatbot?q=%E7%B5%B1%E6%8B%AC%E5%AE%89%E5%85%A8%E8%A1%9B%E7%94%9F%E8%B2%AC%E4%BB%BB%E8%80%85%E3%81%AE%E9%81%B8%E4%BB%BB%E8%A6%81%E4%BB%B6%E3%82%92%E6%95%99%E3%81%88%E3%81%A6" className="ml-1 font-semibold text-sky-700 hover:underline">法令チャットで確認</Link>
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold text-sky-700">▸</span>
            <span>
              <strong>協議組織の運営・作業間の連絡調整</strong> (安衛則 第635〜636条)。
              <Link href="/safety-diary" className="ml-1 font-semibold text-sky-700 hover:underline">安全工程打合せ書で月次報告まとめ</Link>
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold text-sky-700">▸</span>
            <span>
              <strong>関係請負人の労働者に対する作業内容の周知</strong> (安衛法 第30条)。
              <Link href="/signage" className="ml-1 font-semibold text-sky-700 hover:underline">サイネージ掲示で全員周知</Link>
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold text-sky-700">▸</span>
            <span>
              <strong>建設業労働災害防止規程 (建災防)</strong> の自主基準を年次計画に反映。
              <Link href="/strategy/plan-generator?industry=construction" className="ml-1 font-semibold text-sky-700 hover:underline">年次計画書を生成</Link>
            </span>
          </li>
        </ul>
      </section>

      {/* 役職別エントリ - 現場代理人 */}
      <section
        id="for-supervisor"
        tabIndex={-1}
        className="mt-8 scroll-mt-20 rounded-2xl border-2 border-violet-200 bg-white p-5 sm:p-7"
        aria-labelledby="for-supervisor-heading"
      >
        <div className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-800">
          <FileText className="h-3.5 w-3.5" /> 現場代理人向け
        </div>
        <h2 id="for-supervisor-heading" className="mt-3 text-2xl font-bold text-slate-900">
          現場代理人の年次: 計画書・計画届・パトロール
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          年次安全衛生計画書の作成、計画届 (安衛法第88条) の提出時期、パトロールチェックの蓄積をワンストップで。
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Link href="/strategy/plan-generator?industry=construction" className="rounded-lg border-2 border-violet-300 bg-violet-50 p-4 hover:bg-violet-100 block">
            <p className="font-bold text-violet-900">年次安全衛生計画書を生成</p>
            <p className="mt-1 text-xs text-violet-800">建設業テンプレ: 目標2件 + 対策5項 + 月別イベント12件 + 関連法令12件。</p>
          </Link>
          <Link href="/safety-diary" className="rounded-lg border-2 border-violet-300 bg-violet-50 p-4 hover:bg-violet-100 block">
            <p className="font-bold text-violet-900">安全工程打合せ書で月次まとめ</p>
            <p className="mt-1 text-xs text-violet-800">元請が前日5分で各社の作業・予想災害・指示を1枚に。印刷・KY転記に対応。</p>
          </Link>
        </div>
        <p className="mt-4 text-xs text-slate-500">
          ※ 計画届 (安衛法第88条): 高さ31mを超える建築物の建設・足場の組立て等は、工事開始の14日前までに労働基準監督署長へ届出が必要。
        </p>
      </section>

      {/* 現場の安全記録・帳票 */}
      <section id="records" className="mt-12">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          現場の安全記録・帳票（無料・登録不要・この端末に保存）
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          受入教育・パトロール・ヒヤリハット・点検・作業手順書・委員会議事録などを、その場で作成して印刷・CSV保存。法令で求められる記録（証跡）づくりに。
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {[
            { href: "/site-records", icon: FolderOpen, label: "安全記録キット", sub: "6帳票＋状況" },
            { href: "/site-records/induction", icon: UserRound, label: "受入教育 記録", sub: "安衛則35条" },
            { href: "/site-records/patrol", icon: Footprints, label: "安全パトロール", sub: "指摘の是正管理" },
            { href: "/site-records/near-miss", icon: AlertTriangle, label: "ヒヤリハット集計", sub: "型別の傾向" },
            { href: "/site-records/inspection", icon: Wrench, label: "作業開始前点検", sub: "機種別" },
            { href: "/site-records/procedure", icon: FileText, label: "作業手順書", sub: "手順×危険×対策" },
            { href: "/heat-illness-prevention", icon: Thermometer, label: "熱中症対策", sub: "WBGT・記録・掲示" },
            { href: "/court-cases/employer-liability", icon: Scale, label: "労災の法的責任", sub: "民事・刑事・行政" },
          ].map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="flex flex-col items-center justify-center gap-0.5 rounded-xl border border-emerald-200 bg-white px-2 py-3 text-center shadow-sm transition hover:border-emerald-400 hover:bg-emerald-50"
            >
              <t.icon className="h-5 w-5 text-emerald-700" aria-hidden="true" />
              <span className="text-[12px] font-bold leading-tight text-slate-800">{t.label}</span>
              <span className="text-[10px] leading-tight text-slate-500">{t.sub}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* 月次運用 */}
      <section id="monthly" className="mt-12">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-sky-700" />
          月次運用 (安全衛生委員会・パトロール)
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          建設業の年間カレンダーに沿った委員会議題と季節要素。
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm border border-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="border-b border-slate-200 px-3 py-2 text-left font-semibold text-slate-700 w-24">時期</th>
                <th className="border-b border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">議題・重点</th>
              </tr>
            </thead>
            <tbody>
              {MONTHLY_TOPICS.map((t, i) => (
                <tr key={i} className={i % 2 ? "bg-white" : "bg-slate-50/40"}>
                  <td className="border-b border-slate-200 px-3 py-2 font-bold text-slate-700">{t.month}</td>
                  <td className="border-b border-slate-200 px-3 py-2 text-slate-700">{t.topic}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          安全衛生委員会は月1回以上の開催が義務 (安衛則 第23条第1項)。議事録は3年保存。
        </p>
      </section>

      {/* 法令早見 */}
      <section id="laws" className="mt-12">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Scale className="h-5 w-5 text-violet-700" />
          建設業の法令早見
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          現場で「これは何条だっけ？」となりやすい主要条文。各リンクから条文検索 or 通達アーカイブへ。
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {LAW_HIGHLIGHTS.map((l, i) => (
            <Link key={i} href={l.url} className="block rounded-lg border border-slate-200 bg-white p-3 hover:bg-slate-50 hover:border-violet-300">
              <p className="font-bold text-slate-900 text-sm">{l.law}</p>
              <p className="mt-0.5 text-xs text-slate-600">{l.topic}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* 化学物質 */}
      <section id="chemical" className="mt-12">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-amber-700" />
          建設業頻出 {CONSTRUCTION_PRIORITY_CAS.length} 物質クイック
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          塗装・解体・防水・地盤改良・溶剤系で扱う代表物質。クリックで物質詳細 (規制タグ・GHS・濃度基準) を表示。
        </p>
        <div className="mt-4 space-y-3">
          {CHEMICAL_CATEGORIES.map((cat) => {
            const items = CONSTRUCTION_PRIORITY_CAS.filter((x) => x.category === cat.key);
            if (items.length === 0) return null;
            return (
              <div key={cat.key} className="rounded-lg border border-amber-200 bg-amber-50/40 p-3">
                <p className="font-bold text-amber-900 text-sm">
                  {cat.label} <span className="font-normal text-amber-700 text-xs">— {cat.caption}</span>
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {items.map((it) => (
                    <Link
                      key={it.cas}
                      href={`/chemical-database/${it.cas}`}
                      className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-white px-2.5 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                    >
                      {it.name} <span className="text-amber-600 font-normal">({it.cas})</span>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/chemical-ra" className="inline-flex items-center gap-1 rounded-md bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-700">
            <TestTube2 className="h-4 w-4" /> 化学物質 RA を開始 →
          </Link>
          <Link href="/chemical-database" className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-white px-3 py-1.5 text-sm font-semibold text-amber-800 hover:bg-amber-50">
            {MHLW_MERGED_CHEMICAL_COUNT.toLocaleString()} 物質を検索 →
          </Link>
        </div>
      </section>

      {/* 統計 */}
      <section id="stats" className="mt-12 rounded-2xl border border-rose-200 bg-rose-50/40 p-5 sm:p-7">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-rose-700" />
          建設業の労災発生状況 (厚労省データ)
        </h2>
        <p className="mt-2 text-sm text-slate-700">
          全業種で {CONSTRUCTION_STATS.totalAccidents.toLocaleString()} 件 (建設業) の労働災害が記録されています。事故型上位:
        </p>
        <ul className="mt-3 space-y-1 text-sm">
          {CONSTRUCTION_STATS.topTypes.map((t, i) => (
            <li key={i} className="flex justify-between rounded bg-white px-3 py-1.5 border border-rose-200">
              <span className="font-semibold text-slate-800">{i + 1}. {t.name}</span>
              <span className="font-bold text-rose-700">{t.count.toLocaleString()} 件</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-slate-500">{CONSTRUCTION_STATS.source}</p>
        <div className="mt-4">
          <Link href="/accidents-reports/construction" className="inline-flex items-center gap-1 rounded-md bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-rose-700">
            業種別事故レポートを詳しく見る →
          </Link>
        </div>
      </section>

      {/* 関連通達 */}
      <section id="circulars" className="mt-12">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <FileText className="h-5 w-5 text-slate-700" />
          関連通達・告示・指針
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          建設業に直接影響する厚労省通達・建災防自主基準のクイックリンク。
        </p>
        <ul className="mt-4 space-y-2">
          {CIRCULAR_HIGHLIGHTS.map((c, i) => (
            <li key={i}>
              <Link href={c.url} className="block rounded-lg border border-slate-200 bg-white p-3 hover:bg-slate-50 hover:border-slate-400">
                <p className="text-sm font-semibold text-slate-800">{c.title}</p>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-slate-500">
          通達原文 URL は <Link href="/chatbot" className="text-emerald-700 underline">法令チャット</Link> の回答末尾にも自動添付されます。
        </p>
      </section>

      {/* 関連: 法令チャット */}
      <section className="mt-12 rounded-2xl bg-gradient-to-r from-emerald-600 to-sky-600 p-6 text-white">
        <div className="flex items-start gap-4">
          <MessageSquare className="h-8 w-8 flex-shrink-0" />
          <div>
            <h2 className="text-xl font-bold">法令を自然言語で質問</h2>
            <p className="mt-2 text-sm leading-relaxed opacity-95">
              「足場の手すり高さは?」「フルハーネスの特別教育は必要か?」など、現場の疑問を自然な日本語で投げかけてください。条文番号付きで回答し、関連通達 URL も自動添付します。
            </p>
            <Link href="/chatbot" className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-50">
              法令チャットを開く →
            </Link>
          </div>
        </div>
      </section>

      {/* 既存の業種ハブへの導線 */}
      <section className="mt-12 rounded-xl border border-slate-200 bg-slate-50/60 p-5">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <Building2 className="h-4 w-4" /> 建設業の詳細情報をさらに知りたい方
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          法令一覧・事故事例・FAQ・教育プログラムなど、本ページの背景情報は業種ハブにまとまっています。
        </p>
        <Link href="/industries/construction" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:underline">
          /industries/construction の業種ハブを開く →
        </Link>
      </section>

      {/* 統一 CTA */}
      <div className="mt-10">
        <MainFeatureNextActions contextLabel="建設業 実務ポータル" />
      </div>

      <p className="mt-8 text-xs text-slate-400">
        本ページは個人運営の研究プロジェクトです。法令解釈は労働基準監督署または労働安全衛生コンサルタント (登録番号260022 含む) にご相談ください。
        統計値は厚労省「労働者死傷病報告」公開データに基づきます。
      </p>
    </PageContainer>
  );
}
