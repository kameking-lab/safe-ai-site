import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  HardHat,
  ShieldCheck,
  FileText,
  AlertTriangle,
  BookOpen,
  CalendarDays,
  ClipboardList,
  Megaphone,
  ExternalLink,
  Building2,
  ScrollText,
  Library,
} from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { Section } from "@/components/layout/section";
import { CardGrid } from "@/components/layout/card-grid";
import { Cluster, Stack } from "@/components/layout/stack";
import { Breadcrumb } from "@/components/breadcrumb";
import {
  JsonLd,
  webPageSchema,
  breadcrumbSchema,
} from "@/components/json-ld";
import { ogImageUrl } from "@/lib/og-url";
import { SITE_URL, withSiteOpenGraph, withSiteTwitter } from "@/lib/seo-metadata";
import { constructionContent } from "@/data/industries-content/construction";
import { getIndustryReport } from "@/lib/accident-analysis";

const _title =
  "建設業の安全衛生ポータル｜職長・元請・現場代理人の3役職向けエントリ";
const _desc =
  "建設業職長・元請安全担当・現場代理人向けに、当日（KY・朝礼ネタ・本日の事故例）／月次（安全衛生委員会議題・パトロール・KY実例）／年次（計画書ジェネレータ）の運用ツールを集約。墜落・足場・クレーン・石綿・熱中症・粉じんの法令早見と統計も同ページに。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  alternates: { canonical: "/for/construction" },
  openGraph: withSiteOpenGraph("/for/construction", {
    title: _title,
    description: _desc,
    images: [
      {
        url: ogImageUrl(_title, "建設業3役職向け 運用エントリ"),
        width: 1200,
        height: 630,
      },
    ],
  }),
  twitter: withSiteTwitter({
    title: _title,
    description: _desc,
    images: [ogImageUrl(_title, "建設業3役職向け 運用エントリ")],
  }),
};

export const revalidate = 2592000;

function num(n: number): string {
  return n.toLocaleString("ja-JP");
}

type RoleEntry = {
  role: string;
  catchphrase: string;
  icon: typeof HardHat;
  accent: {
    border: string;
    badge: string;
    bg: string;
    iconBg: string;
  };
  links: { label: string; href: string; description: string }[];
};

const ROLE_ENTRIES: RoleEntry[] = [
  {
    role: "職長 向け",
    catchphrase: "朝礼前3分で動ける",
    icon: HardHat,
    accent: {
      border: "border-amber-300 dark:border-amber-800",
      badge: "text-amber-800 dark:text-amber-300",
      bg: "bg-amber-50/70 dark:bg-amber-950/30",
      iconBg: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
    },
    links: [
      {
        label: "KY用紙を3分で作る（建設業プリセット）",
        href: "/ky?industry=construction",
        description: "墜落・足場・重機の業種別プリセットと音声入力で当日朝礼に間に合う",
      },
      {
        label: "朝礼ネタを生成（AIチャット）",
        href: "/chatbot",
        description: "本日の天気と直近の事故事例から朝礼で話すネタを根拠付きで生成",
      },
      {
        label: "本日の事故例（建設業）",
        href: "/accidents-reports/construction",
        description: "墜落・転落・はさまれ等、現場で繰り返される建設業の典型事故",
      },
      {
        label: "フルハーネス特別教育の要件",
        href: "/education-certification/finder?q=フルハーネス",
        description: "高さ2m以上で作業床困難な場所での着用と学科4.5h・実技1.5h",
      },
    ],
  },
  {
    role: "元請 安全担当 向け",
    catchphrase: "統括責任を漏らさない",
    icon: ShieldCheck,
    accent: {
      border: "border-blue-300 dark:border-blue-800",
      badge: "text-blue-800 dark:text-blue-300",
      bg: "bg-blue-50/70 dark:bg-blue-950/30",
      iconBg: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200",
    },
    links: [
      {
        label: "統括安全衛生責任者の選任要件",
        href: "/law-search?q=統括安全衛生責任者",
        description: "関係請負人含む常時50人以上（ずい道・橋梁・圧気は30人以上）で選任義務",
      },
      {
        label: "混在作業の連絡調整・協議組織",
        href: "/industries/construction",
        description: "特定元方事業者として実施すべき作業場所巡視・連絡調整・協議組織運営",
      },
      {
        label: "店社安全衛生管理者の選任",
        href: "/law-search?q=店社安全衛生管理者",
        description: "中小規模工事における店社安全衛生管理者選任義務と業務範囲",
      },
      {
        label: "安全衛生協議会 議事録テンプレ",
        href: "/strategy/plan-generator?industry=construction",
        description: "毎月開催する協議会の議題サンプルと年間スケジュール",
      },
    ],
  },
  {
    role: "現場代理人 向け",
    catchphrase: "計画届と年次運用",
    icon: ClipboardList,
    accent: {
      border: "border-emerald-300 dark:border-emerald-800",
      badge: "text-emerald-800 dark:text-emerald-300",
      bg: "bg-emerald-50/70 dark:bg-emerald-950/30",
      iconBg:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200",
    },
    links: [
      {
        label: "計画届（安衛法 第88条）の対象工事",
        href: "/law-search?q=計画の届出",
        description: "高さ31m超建築、堤高15m以上ダム、長さ50m以上橋梁等の労基署届出",
      },
      {
        label: "年次安全衛生計画書を自動生成",
        href: "/strategy/plan-generator?industry=construction",
        description: "建設業×規模別テンプレートから墜落・重機・熱中症の月別取組を網羅",
      },
      {
        label: "安全衛生委員会の年間議題",
        href: "/strategy/plan-generator?industry=construction",
        description: "月別の議題セットと、現場安全衛生委員会の運営チェック項目",
      },
      {
        label: "建設業パトロールチェックリスト",
        href: "/industries/construction",
        description: "足場・開口部・重機・KY・新規入場者教育を網羅した点検観点",
      },
    ],
  },
];

const TODAY_TOOLS: { icon: string; title: string; href: string; reason: string; cta: string }[] = [
  {
    icon: "📝",
    title: "KY用紙（建設業プリセット）",
    href: "/ky?industry=construction",
    reason: "墜落・足場・重機・玉掛け・熱中症のプリセットを音声入力で3分作成",
    cta: "KYを開く",
  },
  {
    icon: "💬",
    title: "朝礼ネタ提案（AIチャット）",
    href: "/chatbot",
    reason: "天気と直近の建設業事故事例を踏まえた朝礼コメントを根拠条文付きで生成",
    cta: "AIに質問",
  },
  {
    icon: "🚨",
    title: "本日の事故例（建設業）",
    href: "/accidents-reports/construction",
    reason: "建設業の最新労災事例から事故型ランキングと推奨対策を即座に確認",
    cta: "事故例を見る",
  },
];

const MONTHLY_TOOLS: { icon: string; title: string; href: string; reason: string; cta: string }[] = [
  {
    icon: "🗓",
    title: "安全衛生委員会 議題テンプレ",
    href: "/strategy/plan-generator?industry=construction",
    reason: "毎月の議題セット（月別取組）を業種別テンプレートから抽出",
    cta: "議題を見る",
  },
  {
    icon: "🔎",
    title: "建設業 パトロールチェックリスト",
    href: "/industries/construction",
    reason: "足場・開口部・重機・KY・新規入場者教育の点検観点を一覧化",
    cta: "チェック観点",
  },
  {
    icon: "📚",
    title: "KY実例データベース（建設業）",
    href: "/ky-examples?industry=construction",
    reason: "建設業の作業別KY実例を蓄積。KY用紙作成の出発点として活用",
    cta: "実例を見る",
  },
];

const YEARLY_TOOLS: { icon: string; title: string; href: string; reason: string; cta: string }[] = [
  {
    icon: "📋",
    title: "年次安全衛生計画ジェネレータ",
    href: "/strategy/plan-generator?industry=construction",
    reason: "建設業×規模別テンプレから基本方針・重点目標・月別実施事項を網羅",
    cta: "計画を作成",
  },
  {
    icon: "🎓",
    title: "特別教育・技能講習リスト",
    href: "/education-certification/finder?industry=construction",
    reason: "フルハーネス・足場・玉掛け・車両系建設機械・石綿の法定教育要件を一覧化",
    cta: "教育要件",
  },
  {
    icon: "☣️",
    title: "石綿事前調査・電子報告",
    href: "/asbestos-management",
    reason: "解体80㎡以上・改修100万円以上の電子報告と事前調査者要件をハブ化",
    cta: "石綿対応へ",
  },
  {
    icon: "🌡",
    title: "熱中症対策（WBGT・R7安衛則）",
    href: "/heat-illness-prevention",
    reason: "屋外作業のWBGT計算・暑熱順化・R7改正チェックリストを集約",
    cta: "熱中症対策へ",
  },
];

const LAW_QUICKVIEW: { category: string; icon: string; rows: { name: string; note: string; href: string }[] }[] = [
  {
    category: "墜落・転落",
    icon: "🪜",
    rows: [
      {
        name: "労働安全衛生規則 第518条〜第533条",
        note: "高さ2m以上の作業床・囲い・手すり・墜落制止用器具の使用義務",
        href: "/law-search?q=安衛則%20第518条",
      },
      {
        name: "墜落制止用器具の規格",
        note: "フルハーネス型・胴ベルト型の選定と特別教育（学科4.5h・実技1.5h）",
        href: "/education-certification/finder?q=フルハーネス",
      },
    ],
  },
  {
    category: "足場",
    icon: "🏗",
    rows: [
      {
        name: "労働安全衛生規則 第564条〜第575条",
        note: "足場の構造・点検・組立て等作業主任者の選任義務",
        href: "/law-search?q=足場",
      },
    ],
  },
  {
    category: "クレーン・玉掛け",
    icon: "🚜",
    rows: [
      {
        name: "クレーン等安全規則",
        note: "玉掛け作業者・運転者・誘導者の資格と作業基準",
        href: "/law-search?q=クレーン等安全規則",
      },
      {
        name: "車両系建設機械（安衛則第151条の177〜）",
        note: "ドラグショベル等の主たる用途以外の使用制限と接触防止",
        href: "/law-search?q=車両系建設機械",
      },
    ],
  },
  {
    category: "石綿・粉じん・じん肺",
    icon: "☣️",
    rows: [
      {
        name: "石綿障害予防規則 第3条〜第4条の2",
        note: "解体・改修工事における事前調査の電子報告義務（2022年4月〜）",
        href: "/law-search?q=石綿障害予防規則",
      },
      {
        name: "粉じん障害防止規則 / じん肺法",
        note: "ずい道・トンネル粉じんの局排・呼吸用保護具・じん肺健診",
        href: "/law-search?q=粉じん障害防止規則",
      },
    ],
  },
  {
    category: "熱中症・屋外作業",
    icon: "🌡",
    rows: [
      {
        name: "労働安全衛生規則 第612条の2",
        note: "WBGTの測定と熱中症予防対策（R7改正対応）",
        href: "/law-search?q=熱中症",
      },
    ],
  },
  {
    category: "元請責任・計画届",
    icon: "🤝",
    rows: [
      {
        name: "労働安全衛生法 第15条〜第15条の3",
        note: "特定元方事業者の統括管理義務、店社安全衛生管理者の選任",
        href: "/law-search?q=統括安全衛生責任者",
      },
      {
        name: "労働安全衛生法 第88条",
        note: "高さ31m超建築・堤高15m以上ダム・長さ50m以上橋梁等の計画届",
        href: "/law-search?q=計画の届出",
      },
    ],
  },
];

const EXTERNAL_RESOURCES: { name: string; org: string; url: string; note: string }[] = [
  {
    name: "職場のあんぜんサイト 労働災害事例",
    org: "厚生労働省",
    url: "https://anzeninfo.mhlw.go.jp/anzen_pg/sai_fnd.aspx",
    note: "建設業の労働災害事例を業種・作業別に検索できる公的データベース",
  },
  {
    name: "建災防（建設業労働災害防止協会）",
    org: "建災防",
    url: "https://www.kensaibou.or.jp/",
    note: "建設業向け安全衛生教育資料・統計・ゼロ災運動の元締め",
  },
  {
    name: "建設工事従事者の安全と健康の確保に関する基本計画",
    org: "厚生労働省",
    url: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000165006_00009.html",
    note: "国の建設業安全衛生基本計画。重点課題と達成指標が示される",
  },
];

export default function ForConstructionPage() {
  const report = getIndustryReport("construction");
  const url = `${SITE_URL}/for/construction`;
  const topCases = report?.topCases?.slice(0, 3) ?? [];

  return (
    <>
      <JsonLd
        schema={[
          webPageSchema({
            name: _title,
            description: _desc,
            url,
            datePublished: "2026-05-23",
            dateModified: "2026-05-23",
          }),
          breadcrumbSchema([
            { name: "ホーム", url: SITE_URL },
            { name: "建設業 安全衛生ポータル", url },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "建設業 役職別エントリ",
            itemListOrder: "https://schema.org/ItemListOrderAscending",
            numberOfItems: ROLE_ENTRIES.length,
            itemListElement: ROLE_ENTRIES.map((r, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: r.role,
              description: r.catchphrase,
              url,
            })),
          },
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "建設業 当日・月次・年次の運用ツール",
            itemListOrder: "https://schema.org/ItemListOrderAscending",
            numberOfItems: TODAY_TOOLS.length + MONTHLY_TOOLS.length + YEARLY_TOOLS.length,
            itemListElement: [...TODAY_TOOLS, ...MONTHLY_TOOLS, ...YEARLY_TOOLS].map((t, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: t.title,
              description: t.reason,
              url: `${SITE_URL}${t.href}`,
            })),
          },
        ]}
      />

      <PageContainer width="full">
        <Breadcrumb items={[{ name: "建設業 安全衛生ポータル" }]} />

        {/* Hero */}
        <header className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-emerald-50/40 p-5 sm:p-7 dark:border-amber-900 dark:from-amber-950/40 dark:via-slate-950 dark:to-emerald-950/30">
          <Cluster gap="sm">
            <span
              className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200"
              aria-hidden="true"
            >
              <HardHat className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-widest text-amber-800 dark:text-amber-300">
                For Construction ・ 建設業向けランディング
              </p>
              <h1 className="mt-1 text-2xl font-bold leading-tight text-slate-900 sm:text-3xl lg:text-4xl dark:text-slate-100">
                建設現場の安全衛生、ここに集約
              </h1>
            </div>
          </Cluster>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-700 sm:text-base dark:text-slate-300">
            職長・元請安全担当・現場代理人の3役職向けに、
            <span className="font-semibold">当日（朝礼で使う）・月次（協議会で使う）・年次（計画書を作る）</span>
            の運用ツールを1ページに集約しました。墜落・足場・クレーン・石綿・熱中症・粉じんの法令早見と、厚労省データを元にした建設業の事故統計も同じ画面で確認できます。
          </p>
          <Cluster gap="xs" className="mt-4">
            <span className="inline-flex items-center rounded-full bg-white px-2.5 py-1 text-xs font-medium text-amber-800 ring-1 ring-amber-200 dark:bg-slate-900 dark:text-amber-200 dark:ring-amber-800">
              #建設業特化
            </span>
            <span className="inline-flex items-center rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700">
              #個人運営の研究プロジェクト
            </span>
            <span className="inline-flex items-center rounded-full bg-white px-2.5 py-1 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200 dark:bg-slate-900 dark:text-emerald-300 dark:ring-emerald-800">
              #無料公開
            </span>
          </Cluster>

          {/* Stats summary */}
          {report && report.stats.total > 0 && (
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-[11px] text-slate-600 dark:text-slate-400">建設業 事例件数</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
                  {num(report.stats.total)}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">件（curated + 厚労省）</p>
              </div>
              <div className="rounded-lg border border-rose-200 bg-rose-50/60 p-3 dark:border-rose-900 dark:bg-rose-950/40">
                <p className="text-[11px] text-slate-600 dark:text-slate-400">うち 死亡事例</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-rose-700 dark:text-rose-300">
                  {num(report.stats.severity.fatal)}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  件 ・ 全産業の{(report.stats.fatalityShareOfAll * 100).toFixed(1)}%
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-[11px] text-slate-600 dark:text-slate-400">最多 事故型</p>
                <p className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">
                  {report.topTypes[0]?.name ?? "—"}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {report.topTypes[0]
                    ? `全体の${(report.topTypes[0].share * 100).toFixed(1)}%`
                    : ""}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-[11px] text-slate-600 dark:text-slate-400">収録期間</p>
                <p className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">
                  {report.stats.yearRange.min || "—"} 〜 {report.stats.yearRange.max || "—"}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">年</p>
              </div>
            </div>
          )}

          {/* Main CTA */}
          <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Link
              href="/ky?industry=construction"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-amber-700"
            >
              <FileText className="h-4 w-4" aria-hidden="true" />
              KY用紙を3分で作る
            </Link>
            <Link
              href="/accidents-reports/construction"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-rose-700"
            >
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              建設業の事故分析レポート
            </Link>
            <Link
              href="/strategy/plan-generator?industry=construction"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
            >
              <ClipboardList className="h-4 w-4" aria-hidden="true" />
              年次計画を自動生成
            </Link>
          </div>
        </header>

        {/* Role-based entries */}
        <Section
          title="役職別エントリ"
          description="あなたの役職に合わせた、よく使うリンクをまとめました"
          spacing="default"
          className="mt-8"
        >
          <CardGrid cols={3} gap="md">
            {ROLE_ENTRIES.map((r) => {
              const Icon = r.icon;
              return (
                <article
                  key={r.role}
                  className={`flex h-full flex-col rounded-2xl border-2 p-4 ${r.accent.border} ${r.accent.bg}`}
                >
                  <Cluster gap="sm">
                    <span
                      className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${r.accent.iconBg}`}
                      aria-hidden="true"
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-[11px] font-semibold ${r.accent.badge}`}>
                        {r.catchphrase}
                      </p>
                      <h2 className="mt-0.5 text-base font-bold text-slate-900 dark:text-slate-100">
                        {r.role}
                      </h2>
                    </div>
                  </Cluster>
                  <ul className="mt-3 flex-1 space-y-2">
                    {r.links.map((l) => (
                      <li key={l.href + l.label}>
                        <Link
                          href={l.href}
                          className="group flex items-start gap-2 rounded-lg border border-transparent bg-white/80 p-2.5 text-left transition hover:border-slate-300 hover:bg-white dark:bg-slate-900/60 dark:hover:bg-slate-900"
                        >
                          <ArrowRight
                            className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${r.accent.badge} transition group-hover:translate-x-0.5`}
                            aria-hidden="true"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                              {l.label}
                            </p>
                            <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                              {l.description}
                            </p>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </CardGrid>
        </Section>

        {/* Today's tools */}
        <Section
          title="当日 使える機能"
          description="朝礼前・作業前に開く。3分で使えるツール"
          spacing="default"
          className="mt-8"
        >
          <CardGrid cols={3} gap="md">
            {TODAY_TOOLS.map((t) => (
              <Link
                key={t.href + t.title}
                href={t.href}
                className="group flex h-full flex-col rounded-xl border border-amber-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-amber-400 hover:shadow-md dark:border-amber-900 dark:bg-slate-900"
              >
                <Cluster gap="sm">
                  <span className="text-2xl" aria-hidden="true">
                    {t.icon}
                  </span>
                  <h3 className="flex-1 text-sm font-bold text-slate-900 group-hover:text-amber-700 dark:text-slate-100">
                    {t.title}
                  </h3>
                </Cluster>
                <p className="mt-2 flex-1 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                  {t.reason}
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
                  {t.cta} <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </span>
              </Link>
            ))}
          </CardGrid>

          {topCases.length > 0 && (
            <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50/40 p-4 dark:border-rose-900 dark:bg-rose-950/30">
              <Cluster gap="sm" className="mb-2">
                <Megaphone className="h-4 w-4 text-rose-700 dark:text-rose-300" aria-hidden="true" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  今日の朝礼で使える事故事例（建設業 直近）
                </h3>
              </Cluster>
              <ul className="space-y-1.5">
                {topCases.map((c) => (
                  <li key={c.id}>
                    <Link
                      href="/accidents-reports/construction"
                      className="group flex items-start gap-2 rounded-md p-1.5 text-xs hover:bg-white/70 dark:hover:bg-slate-900/40"
                    >
                      <AlertTriangle
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-600"
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {c.title}
                        </span>
                        <span className="ml-2 inline-flex items-center rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-800 dark:bg-rose-900/60 dark:text-rose-200">
                          {c.severity}
                        </span>
                        <span className="ml-2 text-[11px] text-slate-500">{c.occurredOn}</span>
                      </span>
                      <ArrowUpRight
                        className="h-3 w-3 shrink-0 text-rose-500 transition group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Section>

        {/* Monthly tools */}
        <Section
          title="月次 運用ツール"
          description="安全衛生委員会・パトロール・KY実例。月1で開くツール"
          spacing="default"
          className="mt-8"
        >
          <CardGrid cols={3} gap="md">
            {MONTHLY_TOOLS.map((t) => (
              <Link
                key={t.href + t.title}
                href={t.href}
                className="group flex h-full flex-col rounded-xl border border-blue-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md dark:border-blue-900 dark:bg-slate-900"
              >
                <Cluster gap="sm">
                  <span className="text-2xl" aria-hidden="true">
                    {t.icon}
                  </span>
                  <h3 className="flex-1 text-sm font-bold text-slate-900 group-hover:text-blue-700 dark:text-slate-100">
                    {t.title}
                  </h3>
                </Cluster>
                <p className="mt-2 flex-1 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                  {t.reason}
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-blue-700 dark:text-blue-300">
                  {t.cta} <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </span>
              </Link>
            ))}
          </CardGrid>
        </Section>

        {/* Yearly tools */}
        <Section
          title="年次 運用ツール"
          description="計画書・教育・石綿・熱中症。年1で準備するもの"
          spacing="default"
          className="mt-8"
        >
          <CardGrid cols={4} gap="md">
            {YEARLY_TOOLS.map((t) => (
              <Link
                key={t.href + t.title}
                href={t.href}
                className="group flex h-full flex-col rounded-xl border border-emerald-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-md dark:border-emerald-900 dark:bg-slate-900"
              >
                <Cluster gap="sm">
                  <span className="text-2xl" aria-hidden="true">
                    {t.icon}
                  </span>
                  <h3 className="flex-1 text-sm font-bold text-slate-900 group-hover:text-emerald-700 dark:text-slate-100">
                    {t.title}
                  </h3>
                </Cluster>
                <p className="mt-2 flex-1 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                  {t.reason}
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  {t.cta} <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </span>
              </Link>
            ))}
          </CardGrid>
        </Section>

        {/* Law quick view */}
        <Section
          title="建設業 法令早見"
          description="頻出条文を6カテゴリに整理。クリックで条文検索へ遷移"
          spacing="default"
          className="mt-8"
        >
          <CardGrid cols={2} gap="md">
            {LAW_QUICKVIEW.map((cat) => (
              <article
                key={cat.category}
                className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
              >
                <Cluster gap="sm">
                  <span className="text-xl" aria-hidden="true">
                    {cat.icon}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {cat.category}
                  </h3>
                </Cluster>
                <Stack gap="xs" className="mt-3">
                  {cat.rows.map((row) => (
                    <Link
                      key={row.href + row.name}
                      href={row.href}
                      className="group flex items-start gap-2 rounded-md p-2 transition hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                    >
                      <BookOpen
                        className="mt-0.5 h-4 w-4 shrink-0 text-slate-500 group-hover:text-emerald-700"
                        aria-hidden="true"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                          {row.name}
                        </p>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                          {row.note}
                        </p>
                      </div>
                      <ArrowUpRight
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400 group-hover:text-emerald-600"
                        aria-hidden="true"
                      />
                    </Link>
                  ))}
                </Stack>
              </article>
            ))}
          </CardGrid>
          <Cluster gap="sm" className="mt-3">
            <Link
              href="/law-search"
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <Library className="h-3 w-3" aria-hidden="true" />
              条文検索を開く
            </Link>
            <Link
              href="/laws"
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <ScrollText className="h-3 w-3" aria-hidden="true" />
              法改正一覧
            </Link>
            <Link
              href="/circulars"
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <FileText className="h-3 w-3" aria-hidden="true" />
              通達原文
            </Link>
          </Cluster>
        </Section>

        {/* Statistics & top types */}
        {report && report.topTypes.length > 0 && (
          <Section
            title="建設業 統計サマリ"
            description="厚労省データと curated 事例から自動集計。詳細は事故分析レポートへ"
            spacing="default"
            className="mt-8"
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <Cluster gap="sm">
                  <AlertTriangle className="h-4 w-4 text-rose-600" aria-hidden="true" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    事故型ランキング（上位5）
                  </h3>
                </Cluster>
                <ol className="mt-3 space-y-1.5">
                  {report.topTypes.slice(0, 5).map((t, i) => (
                    <li
                      key={t.name}
                      className="flex items-baseline justify-between gap-2 border-b border-slate-100 pb-1 text-xs last:border-b-0 dark:border-slate-800"
                    >
                      <span className="flex items-baseline gap-2">
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {i + 1}
                        </span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {t.name}
                        </span>
                      </span>
                      <span className="tabular-nums text-slate-600 dark:text-slate-400">
                        {num(t.count)}件 ・ {(t.share * 100).toFixed(1)}%
                      </span>
                    </li>
                  ))}
                </ol>
              </article>
              <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <Cluster gap="sm">
                  <CalendarDays className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    重点5課題（建設業）
                  </h3>
                </Cluster>
                <ul className="mt-3 space-y-1.5">
                  {constructionContent.challenges.slice(0, 5).map((ch) => (
                    <li key={ch.title} className="flex items-start gap-2 text-xs">
                      <span aria-hidden="true">{ch.icon}</span>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 dark:text-slate-100">
                          {ch.title}
                        </p>
                        <p className="mt-0.5 leading-relaxed text-slate-600 dark:text-slate-400">
                          {ch.body}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </article>
            </div>
            <div className="mt-3">
              <Link
                href="/accidents-reports/construction"
                className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-400"
              >
                建設業の事故分析レポート（詳細）を開く
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </Section>
        )}

        {/* External resources */}
        <Section
          title="外部リソース（公的・業界団体）"
          description="一次情報は必ず公的サイト・業界団体の原文を確認してください"
          spacing="default"
          className="mt-8"
        >
          <Stack gap="sm">
            {EXTERNAL_RESOURCES.map((r) => (
              <a
                key={r.url}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 transition hover:border-emerald-300 hover:bg-emerald-50/30 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-emerald-950/20"
              >
                <Building2
                  className="mt-0.5 h-5 w-5 shrink-0 text-slate-500 group-hover:text-emerald-700"
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {r.name}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                    {r.org} ・ {r.note}
                  </p>
                </div>
                <ExternalLink
                  className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 group-hover:text-emerald-600"
                  aria-hidden="true"
                />
              </a>
            ))}
          </Stack>
        </Section>

        {/* Related pages */}
        <Section title="関連ページ" spacing="tight" className="mt-8">
          <Cluster gap="sm">
            <Link
              href="/industries/construction"
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              🏗 建設業 情報ハブ（網羅版）
            </Link>
            <Link
              href="/accidents-reports/construction"
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              🚨 建設業 事故分析レポート
            </Link>
            <Link
              href="/asbestos-management"
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              ☣️ 石綿管理ハブ
            </Link>
            <Link
              href="/heat-illness-prevention"
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              🌡 熱中症対策ハブ
            </Link>
            <Link
              href="/foreign-workers"
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              🌐 外国人労働者の安全衛生
            </Link>
            <Link
              href="/industries"
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              🗂 他業種のポータル一覧
            </Link>
          </Cluster>
        </Section>

        <p className="mt-8 text-[11px] leading-relaxed text-slate-500 dark:text-slate-500">
          本ページは個人運営の労働安全衛生研究プロジェクトとして提供しています。法令・通達・統計は厚生労働省・国土交通省・建設業労働災害防止協会の公開情報を基にしていますが、最終的な法令解釈・実務運用は所轄労働基準監督署や顧問の労働安全コンサルタントにご確認ください。
        </p>
      </PageContainer>
    </>
  );
}
