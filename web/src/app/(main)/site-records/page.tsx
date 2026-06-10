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
  CalendarRange,
  CalendarDays,
  FileWarning,
  Thermometer,
  CalendarCheck,
  HeartPulse,
  FileSpreadsheet,
  Megaphone,
  Tv,
} from "lucide-react";
import { PageContainer } from "@/components/layout";
import { CollapsibleDetail } from "@/components/ui/collapsible-detail";
import { PageHeader } from "@/components/page-header";
import { PageJsonLd } from "@/components/page-json-ld";
import { ogImageUrl } from "@/lib/og-url";
import { RecordsOverview } from "./records-overview";
import { RecordsBackup } from "./records-backup";

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

type ToolGroup = { heading: string; note?: string; tools: Tool[] };

const GROUPS: ToolGroup[] = [
  {
    heading: "日々・都度に作成する記録",
    tools: [
      { href: "/ky/paper", title: "KY用紙（危険予知）", desc: "4ラウンド法の危険予知活動シート。AI提案・音声入力・印刷・保存に対応。", icon: ClipboardList, color: "sky" },
      { href: "/safety-diary", title: "安全工程打合せ書", desc: "北海道労働局公式版ベース。各社マトリクス・点検8カテゴリ・翌日複製・印刷。", icon: FileSpreadsheet, color: "indigo" },
      { href: "/site-records/induction", title: "新規入場者 受入教育 記録", desc: "安衛法59条・安衛則35条の教育項目＋現場ルールをチェックして実施記録を作成。名簿CSV・受講記録の印刷に対応。", icon: UserPlus, color: "emerald", badge: "NEW" },
      { href: "/site-records/procedure", title: "作業手順書 作成", desc: "手順×危険（急所）×対策の3列で作業手順書を作成。使用機械・必要資格も記載し、印刷・CSV。", icon: ListOrdered, color: "indigo", badge: "NEW" },
      { href: "/site-records/inspection", title: "作業開始前点検 記録", desc: "建設機械・クレーン・フォークリフト・高所作業車・電動工具の始業前点検を機種別項目で記録。使用可否・印刷・CSV。", icon: Wrench, color: "sky", badge: "NEW" },
      { href: "/site-records/near-miss", title: "ヒヤリハット報告・集計", desc: "ヒヤリハットを蓄積し事故の型別に傾向を集計。要因・対策・是正状況を管理し、印刷・CSVで月次集計に。", icon: AlertTriangle, color: "amber", badge: "NEW" },
    ],
  },
  {
    heading: "定期の点検・会議・教育管理",
    tools: [
      { href: "/site-records/patrol", title: "安全パトロール・職場巡視 記録", desc: "5大災害＋衛生の標準項目でチェックし、指摘事項を場所・危険度・担当・期日・是正状況まで管理。印刷・指摘CSV。", icon: Footprints, color: "rose", badge: "NEW" },
      { href: "/site-records/committee", title: "安全衛生委員会 議事録", desc: "安衛法17〜19条の委員会議事録を標準議題テンプレで作成。決定・担当・期日を記録し、3年保存・周知用に印刷・CSV。", icon: Users, color: "indigo", badge: "NEW" },
      { href: "/site-records/qualifications", title: "特別教育・資格 受講管理簿", desc: "作業者ごとに特別教育・技能講習・資格と取得日を記録。名簿CSV・印刷で有資格者への適正配置の証跡に。", icon: GraduationCap, color: "teal", badge: "NEW" },
      { href: "/health-checkup-scheduler", title: "健康診断スケジューラ", desc: "業種・職種・取扱物質から必要な健診を判定し年間計画を生成。", icon: HeartPulse, color: "fuchsia" },
    ],
  },
  {
    heading: "集計・年間計画",
    tools: [
      { href: "/site-records/monthly", title: "月次安全衛生レポート（自動集計）", desc: "パトロール・ヒヤリ・点検・教育・委員会・WBGTの当月分を自動集計し、月次報告を1枚で作成・印刷。元請提出・委員会資料に。", icon: CalendarRange, color: "emerald", badge: "NEW" },
      { href: "/site-records/calendar", title: "年間 安全衛生カレンダー", desc: "全国安全週間・労働衛生週間・季節リスク・毎月の法定義務を月別に一覧。今月やることが一目で分かり各ツールへ。", icon: CalendarDays, color: "sky", badge: "NEW" },
    ],
  },
  {
    heading: "熱中症対策（令和7年改正対応）",
    tools: [
      { href: "/heat-illness-prevention/log", title: "WBGT日次記録簿", desc: "WBGTと実施対策を時刻別に記録。最高WBGT自動集計・印刷・CSV。", icon: Thermometer, color: "amber" },
      { href: "/heat-illness-prevention/acclimatization", title: "暑熱順化 計画・進捗", desc: "新規入場者・復帰者の7日間以上の暑熱順化を計画・記録。", icon: CalendarCheck, color: "teal" },
      { href: "/heat-illness-prevention/poster", title: "熱中症 緊急対応 掲示", desc: "緊急連絡先を入れてA4掲示用ポスターを印刷（対応手順の周知）。", icon: Megaphone, color: "rose" },
    ],
  },
  {
    heading: "労災が起きたら（届出・責任）",
    tools: [
      { href: "/site-records/incident-report", title: "労働者死傷病報告 作成補助", desc: "労災発生時の届出（安衛則97条・様式23/24号）に必要な情報を整理する下書きを作成・印刷。電子申請の前準備に。", icon: FileWarning, color: "rose", badge: "NEW" },
      { href: "/court-cases/employer-liability", title: "労災の法的責任ガイド", desc: "民事（安全配慮義務）・刑事（労安法違反/業過致死傷）・行政の責任を判例とともに整理。予防の重要性を再確認。", icon: AlertTriangle, color: "rose" },
    ],
  },
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

      {/* ダッシュボード間の役割分担の明示: 作る・管理する=この画面 / TVに掲示する=サイネージ。
          記録の要対応がサイネージへ自動掲示されることは、ここで案内しないとユーザーが知る術がない。 */}
      <section className="mt-4 flex flex-col gap-2 rounded-2xl border border-sky-200 bg-sky-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-1.5 text-sm font-bold text-sky-900">
            <Tv className="h-4 w-4" aria-hidden="true" />
            事務所のTV・モニターに掲示する
          </h2>
          <p className="mt-1 text-xs leading-5 text-sky-800/80">
            この端末で付けた記録の要対応（未是正の指摘・重大ヒヤリ・使用不可の機械など）は、朝礼サイネージの「現場の安全状態」に自動で掲示されます（同じ端末・同じブラウザで開いた場合）。
          </p>
        </div>
        <Link
          href="/signage"
          className="shrink-0 rounded-xl border border-sky-300 bg-white px-4 py-2.5 text-center text-sm font-bold text-sky-700 transition hover:border-sky-500 hover:bg-sky-50"
        >
          サイネージを開く →
        </Link>
      </section>

      {GROUPS.map((g) => (
        <section key={g.heading} className="mt-8">
          <h2 className="mb-2 text-sm font-bold text-slate-700">{g.heading}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {g.tools.map((t) => (
              <ToolCard key={t.href} t={t} />
            ))}
          </div>
        </section>
      ))}

      {/* 文字ダイエット（柱0-0）: 注意書きは消さず折りたたみ詳細へ格納 */}
      <CollapsibleDetail summary="保存先とご利用上の注意" className="mt-8">
        各ツールの記録はお使いの端末（ブラウザ）に保存され、サーバーには送信されません。印刷・CSV出力で社内提出・監督指導時の証跡としてご利用ください。
        記載内容は一般的な情報提供であり、個別の法令適用は所轄労働基準監督署・専門家にご確認ください。
      </CollapsibleDetail>

      <RecordsBackup />
    </PageContainer>
  );
}
