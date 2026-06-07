import type { Metadata } from "next";
import Link from "next/link";
import {
  ClipboardList,
  UserPlus,
  Users,
  Footprints,
  AlertTriangle,
  Wrench,
  ListOrdered,
  GraduationCap,
  Thermometer,
  CalendarCheck,
  HeartPulse,
  FileSpreadsheet,
  Megaphone,
} from "lucide-react";
import { PageContainer } from "@/components/layout";
import { PageHeader } from "@/components/page-header";
import { PageJsonLd } from "@/components/page-json-ld";
import { ogImageUrl } from "@/lib/og-url";
import { RecordsOverview } from "./records-overview";

const _title = "現場の安全記録キット｜受入教育・KY・打合せ書・WBGT記録を無料で作成・印刷・保存";
const _desc =
  "中小ゼネコンの現場監督・安全担当・一人親方が、現場で日々・定期に作成する安全記録をまとめて作れる無料ツール集。新規入場者の受入教育記録、KY用紙、安全工程打合せ書、WBGT日次記録簿・暑熱順化計画など、法令で求められる記録をこの端末に保存し、印刷・CSV出力できます。登録不要。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  alternates: { canonical: "/site-records" },
  openGraph: {
    title: _title,
    description: _desc,
    images: [{ url: ogImageUrl("現場の安全記録キット"), width: 1200, height: 630 }],
  },
};

type Tool = {
  href: string;
  title: string;
  desc: string;
  icon: typeof ClipboardList;
  color: string;
  badge?: string;
};

const NEW_TOOLS: Tool[] = [
  {
    href: "/site-records/induction",
    title: "新規入場者 受入教育 記録",
    desc: "安衛法59条・安衛則35条の教育項目＋現場ルールをチェックして実施記録を作成。名簿CSV・受講記録の印刷に対応。",
    icon: UserPlus,
    color: "emerald",
    badge: "NEW",
  },
  {
    href: "/site-records/committee",
    title: "安全衛生委員会 議事録",
    desc: "安衛法17〜19条の委員会議事録を標準議題テンプレで作成。決定・担当・期日を記録し、3年保存・周知用に印刷・CSV。",
    icon: Users,
    color: "indigo",
    badge: "NEW",
  },
  {
    href: "/site-records/patrol",
    title: "安全パトロール・職場巡視 記録",
    desc: "5大災害＋衛生の標準項目でチェックし、指摘事項を場所・危険度・担当・期日・是正状況まで管理。印刷・指摘CSV。",
    icon: Footprints,
    color: "rose",
    badge: "NEW",
  },
  {
    href: "/site-records/near-miss",
    title: "ヒヤリハット報告・集計",
    desc: "ヒヤリハットを蓄積し事故の型別に傾向を集計。要因・対策・是正状況を管理し、印刷・CSVで月次集計に。",
    icon: AlertTriangle,
    color: "amber",
    badge: "NEW",
  },
  {
    href: "/site-records/inspection",
    title: "作業開始前点検 記録",
    desc: "建設機械・クレーン・フォークリフト・高所作業車・電動工具の始業前点検を機種別項目で記録。使用可否・印刷・CSV。",
    icon: Wrench,
    color: "sky",
    badge: "NEW",
  },
  {
    href: "/site-records/procedure",
    title: "作業手順書 作成",
    desc: "手順×危険（急所）×対策の3列で作業手順書を作成。使用機械・必要資格も記載し、印刷・CSV。KY・受入教育の土台に。",
    icon: ListOrdered,
    color: "indigo",
    badge: "NEW",
  },
  {
    href: "/site-records/qualifications",
    title: "特別教育・資格 受講管理簿",
    desc: "作業者ごとに特別教育・技能講習・資格と取得日を記録。名簿CSV・印刷で有資格者への適正配置の証跡に。",
    icon: GraduationCap,
    color: "teal",
    badge: "NEW",
  },
];

const EXISTING_TOOLS: Tool[] = [
  { href: "/ky/paper", title: "KY用紙（危険予知）", desc: "4ラウンド法の危険予知活動シート。AI提案・音声入力・印刷・保存に対応。", icon: ClipboardList, color: "sky" },
  { href: "/safety-diary", title: "安全工程打合せ書", desc: "北海道労働局公式版ベース。各社マトリクス・点検8カテゴリ・翌日複製・印刷。", icon: FileSpreadsheet, color: "indigo" },
  { href: "/heat-illness-prevention/log", title: "WBGT日次記録簿", desc: "WBGTと実施対策を時刻別に記録。最高WBGT自動集計・印刷・CSV（令和7年改正対応）。", icon: Thermometer, color: "amber" },
  { href: "/heat-illness-prevention/acclimatization", title: "暑熱順化 計画・進捗", desc: "新規入場者・復帰者の7日間以上の暑熱順化を計画・記録。", icon: CalendarCheck, color: "teal" },
  { href: "/heat-illness-prevention/poster", title: "熱中症 緊急対応 掲示", desc: "緊急連絡先を入れてA4掲示用ポスターを印刷（対応手順の周知）。", icon: Megaphone, color: "rose" },
  { href: "/health-checkup-scheduler", title: "健康診断スケジューラ", desc: "業種・職種・取扱物質から必要な健診を判定し年間計画を生成。", icon: HeartPulse, color: "fuchsia" },
];

const COLOR: Record<string, string> = {
  emerald: "border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50/40 text-emerald-600",
  sky: "border-sky-200 hover:border-sky-400 hover:bg-sky-50/40 text-sky-600",
  indigo: "border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50/40 text-indigo-600",
  amber: "border-amber-200 hover:border-amber-400 hover:bg-amber-50/40 text-amber-600",
  teal: "border-teal-200 hover:border-teal-400 hover:bg-teal-50/40 text-teal-600",
  rose: "border-rose-200 hover:border-rose-400 hover:bg-rose-50/40 text-rose-600",
  fuchsia: "border-fuchsia-200 hover:border-fuchsia-400 hover:bg-fuchsia-50/40 text-fuchsia-600",
};

function ToolCard({ t }: { t: Tool }) {
  const Icon = t.icon;
  return (
    <Link href={t.href} className={`group relative rounded-2xl border bg-white p-5 shadow-sm transition ${COLOR[t.color] ?? COLOR.sky}`}>
      {t.badge && (
        <span className="absolute right-3 top-3 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">{t.badge}</span>
      )}
      <Icon className="h-7 w-7" aria-hidden="true" />
      <h2 className="mt-3 text-base font-bold text-slate-900">{t.title}</h2>
      <p className="mt-1 text-sm leading-6 text-slate-600">{t.desc}</p>
      <p className="mt-3 text-xs font-semibold group-hover:underline">開く →</p>
    </Link>
  );
}

export default function SiteRecordsPage() {
  return (
    <PageContainer width="wide">
      <PageJsonLd name="現場の安全記録キット" description={_desc} path="/site-records" />
      <PageHeader
        title="現場の安全記録キット"
        description="現場で日々・定期に作成する安全記録を、まとめて作成・印刷・保存。法令で求められる記録づくりを無料・登録不要で。"
        icon={ClipboardList}
        iconColor="emerald"
      />

      <RecordsOverview />

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-bold text-slate-700">新着</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {NEW_TOOLS.map((t) => (
            <ToolCard key={t.href} t={t} />
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-2 text-sm font-bold text-slate-700">よく使う記録・帳票</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {EXISTING_TOOLS.map((t) => (
            <ToolCard key={t.href} t={t} />
          ))}
        </div>
      </section>

      <p className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-6 text-slate-500">
        各ツールの記録はお使いの端末（ブラウザ）に保存され、サーバーには送信されません。印刷・CSV出力で社内提出・監督指導時の証跡としてご利用ください。
        記載内容は一般的な情報提供であり、個別の法令適用は所轄労働基準監督署・専門家にご確認ください。
      </p>
    </PageContainer>
  );
}
