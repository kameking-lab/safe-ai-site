import type { Metadata } from "next";
import Link from "next/link";
import {
  Scale,
  Search,
  LibraryBig,
  BarChart3,
  Database,
  FlaskConical,
  ListChecks,
  MessageSquare,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  FileSearch,
} from "lucide-react";
import { PageContainer } from "@/components/layout";
import { JsonLd, breadcrumbSchema, webPageSchema } from "@/components/json-ld";
import { ogImageUrl } from "@/lib/og-url";
import { MainFeatureNextActions } from "@/components/main-feature-next-actions";
import { SITE_STATS } from "@/data/site-stats";

const TITLE = "専門家向けポータル — 労働安全コンサルタント・社労士・診断士のためのリサーチ&顧問先支援";
const DESCRIPTION =
  "労働安全衛生コンサルタント・社会保険労務士・中小企業診断士など専門家のために、法令検索・通達判例・法令体系マップ・事故分析・化学物質DB・年次計画テンプレートを一画面に集約。すべて出典・条文番号付き。登録番号260022 のコンサルタント監修の研究プロジェクト。";
const CANONICAL = "/for/consultant";
const FULL_URL = "https://www.anzen-ai-portal.jp/for/consultant";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: FULL_URL,
    type: "website",
    images: [{ url: ogImageUrl("専門家向けポータル", "リサーチ&顧問先支援を一画面に"), width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

const RESEARCH_TOOLS = [
  { icon: Search, title: "法令検索", desc: `主要50法令 約${SITE_STATS.lawArticleCount}条文を全文検索。お気に入り保存に対応。`, href: "/law-search" },
  { icon: Scale, title: "通達・判例", desc: `厚労省通達・告示 ${SITE_STATS.mhlwNoticeCount}件と安全配慮義務の主要判例を拘束力レベル付きで参照。`, href: "/circulars" },
  { icon: LibraryBig, title: "法令体系マップ", desc: "法→政令→省令→告示の階層構造を俯瞰。条文間の関係を一望。", href: "/law-hierarchy" },
  { icon: MessageSquare, title: "安衛法AIチャット (RAG)", desc: "回答に条文番号・通達URLを自動添付。根拠確認しながら下調べを高速化。", href: "/chatbot" },
];

const ANALYSIS_TOOLS = [
  { icon: BarChart3, title: "業種別 事故分析レポート", desc: "5業種・5,000件超を事故型・原因・対策・関連法令で自動集計。", href: "/accidents-reports" },
  { icon: Database, title: "事故データベース", desc: `厚労省データ統合 ${SITE_STATS.accidents10yCount}件を業種・原因・作業区分で全件検索。`, href: "/accidents" },
  { icon: BarChart3, title: "統計ダッシュボード", desc: "事故型・業種・経年の傾向をグラフで把握。提案資料の根拠に。", href: "/accidents-analytics" },
  { icon: FlaskConical, title: "化学物質検索DB", desc: "物質の基準値・GHS・安衛法規制タグを横断検索。SDS情報の確認に。", href: "/chemical-database" },
];

const SUPPORT_TOOLS = [
  { icon: ListChecks, title: "年次安全衛生計画ジェネレーター", desc: "13業種×3規模・39テンプレートから顧問先の計画書を素早く起案。", href: "/strategy/plan-generator" },
  { icon: ShieldCheck, title: "化学物質リスクアセスメント", desc: "CREATE-SIMPLE準拠の簡易RA。顧問先の自律管理支援に。", href: "/chemical-ra" },
  { icon: FileSearch, title: "必要資格・特別教育の判定", desc: "業種・作業から特別教育・技能講習を逆引き。教育計画の根拠に。", href: "/education-certification/finder" },
  { icon: BookOpen, title: "FAQ 200問・用語集", desc: "法令タグ付きFAQと安全用語辞書。顧問先への説明資料づくりに。", href: "/faq" },
];

export default function ForConsultantPage() {
  return (
    <PageContainer width="full">
      <JsonLd
        schema={[
          webPageSchema({
            name: TITLE,
            description: DESCRIPTION,
            url: FULL_URL,
            keywords: [
              "労働安全コンサルタント",
              "労働衛生コンサルタント",
              "社会保険労務士",
              "中小企業診断士",
              "法令検索",
              "通達",
              "判例",
              "事故分析",
              "化学物質",
              "年次安全衛生計画",
              "顧問先支援",
            ],
          }),
          breadcrumbSchema([
            { name: "ホーム", url: "https://www.anzen-ai-portal.jp/" },
            { name: "立場から探す", url: "https://www.anzen-ai-portal.jp/" },
            { name: "専門家向け", url: FULL_URL },
          ]),
        ]}
      />

      {/* Hero */}
      <section className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-slate-50 p-6 sm:p-10">
        <div className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-3 py-1 text-xs font-bold text-white">
          <Scale className="h-3.5 w-3.5" />
          専門家（コンサル・社労士・診断士）
        </div>
        <h1 className="mt-4 text-3xl font-extrabold leading-tight text-slate-900 sm:text-4xl">
          下調べと顧問先支援を、1画面で。
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-700">
          法令リサーチ・事故分析・顧問先への提案資料づくりを、出典と条文番号付きのツール群で高速化します。
          本サイト自体が労働安全衛生コンサルタント (登録番号260022) 監修。エビデンスの出所を常に確認できる設計です。
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="#research" className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700">
            <Search className="h-4 w-4" /> 法令リサーチ
          </Link>
          <Link href="#analysis" className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700">
            <BarChart3 className="h-4 w-4" /> 事故・データ分析
          </Link>
          <Link href="#support" className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700">
            <ListChecks className="h-4 w-4" /> 顧問先支援
          </Link>
        </div>
      </section>

      {/* 法令リサーチ */}
      <ToolSection
        id="research"
        icon={<Search className="h-5 w-5 text-indigo-700" />}
        title="法令リサーチ"
        caption="条文・通達・判例・体系を、根拠を確認しながら横断。"
        tools={RESEARCH_TOOLS}
        accent="indigo"
      />

      {/* 事故・データ分析 */}
      <ToolSection
        id="analysis"
        icon={<BarChart3 className="h-5 w-5 text-rose-700" />}
        title="事故・データ分析"
        caption="提案・診断の根拠となる事故統計と化学物質データ。"
        tools={ANALYSIS_TOOLS}
        accent="rose"
      />

      {/* 顧問先支援 */}
      <ToolSection
        id="support"
        icon={<ListChecks className="h-5 w-5 text-emerald-700" />}
        title="顧問先支援テンプレート"
        caption="計画書・RA・教育計画・説明資料を素早く起案。"
        tools={SUPPORT_TOOLS}
        accent="emerald"
      />

      {/* エビデンス */}
      <section id="evidence" className="mt-12 scroll-mt-20 rounded-2xl border border-slate-200 bg-slate-50/60 p-5 sm:p-7">
        <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
          <ShieldCheck className="h-5 w-5 text-slate-700" />
          エビデンスと出典
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">
          掲載する統計は厚労省「労働者死傷病報告」等の公開データに基づき、各数値に出典・取得時期を明示しています。
          AIチャットの回答には条文番号と通達URLを自動添付し、一次情報へ遡れるようにしています。顧問業務では必ず原典・最新の施行内容をご確認ください。
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/about" className="inline-flex items-center gap-1 rounded-md bg-slate-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800">
            運営・データソースについて →
          </Link>
          <Link href="/glossary" className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            安全用語辞書 →
          </Link>
        </div>
      </section>

      {/* 法令チャットCTA */}
      <section className="mt-12 rounded-2xl bg-gradient-to-r from-indigo-600 to-slate-700 p-6 text-white">
        <div className="flex items-start gap-4">
          <MessageSquare className="h-8 w-8 flex-shrink-0" />
          <div>
            <h2 className="text-xl font-bold">条文の所在を、すぐ特定</h2>
            <p className="mt-2 text-sm leading-relaxed opacity-95">
              「この措置の根拠条文は？」「この通達の拘束力は？」を投げると、条文番号・出典URL付きで返します。下調べの起点に。
            </p>
            <Link href="/chatbot" className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-bold text-indigo-700 hover:bg-indigo-50">
              安衛法AIチャットを開く →
            </Link>
          </div>
        </div>
      </section>

      {/* 統一CTA */}
      <div className="mt-10">
        <MainFeatureNextActions contextLabel="専門家向けポータル" />
      </div>

      <p className="mt-8 text-xs text-slate-400">
        本ページは個人運営の研究プロジェクトです。掲載情報は作成時点のもので、法令解釈・最新の施行内容は原典および所轄労働基準監督署・労働安全衛生コンサルタント (登録番号260022 含む) にてご確認ください。
      </p>
    </PageContainer>
  );
}

function ToolSection({
  id,
  icon,
  title,
  caption,
  tools,
  accent,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  caption: string;
  tools: Array<{ icon: React.ComponentType<{ className?: string }>; title: string; desc: string; href: string }>;
  accent: "indigo" | "rose" | "emerald";
}) {
  const accentText: Record<typeof accent, string> = {
    indigo: "group-hover:text-indigo-700 text-indigo-700",
    rose: "group-hover:text-rose-700 text-rose-700",
    emerald: "group-hover:text-emerald-700 text-emerald-700",
  };
  const accentBorder: Record<typeof accent, string> = {
    indigo: "hover:border-indigo-400",
    rose: "hover:border-rose-400",
    emerald: "hover:border-emerald-400",
  };
  return (
    <section id={id} className="mt-12 scroll-mt-20">
      <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
        {icon}
        {title}
      </h2>
      <p className="mt-2 text-sm text-slate-600">{caption}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tools.map((t, i) => {
          const Icon = t.icon;
          return (
            <Link
              key={i}
              href={t.href}
              className={`group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${accentBorder[accent]}`}
            >
              <Icon className={`h-5 w-5 ${accentText[accent].split(" ")[1]}`} />
              <p className={`mt-2 text-sm font-bold text-slate-900 ${accentText[accent].split(" ")[0]}`}>{t.title}</p>
              <p className="mt-1 flex-1 text-xs leading-relaxed text-slate-600">{t.desc}</p>
              <span className={`mt-2 inline-flex items-center gap-0.5 text-xs font-semibold ${accentText[accent].split(" ")[1]}`}>
                開く <ArrowRight className="h-3 w-3" />
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
