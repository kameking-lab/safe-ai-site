import Link from "next/link";
import { Building2, Sparkles, ShieldCheck, ArrowRight, Calendar } from "lucide-react";

interface EnterpriseFunnelProps {
  /** 関連するサービスID（contactフォームのプリセットに渡す） */
  service?:
    | "ky-digital"
    | "safety-automation"
    | "law-notify"
    | "edu-content"
    | "chemical"
    | "special-edu"
    | "claude-code";
  /** ページ固有のヘッドライン上書き */
  headline?: string;
  /** ページ固有のサブテキスト上書き */
  subline?: string;
  /** 上下の余白を制御 */
  spacing?: "default" | "compact";
}

const BENEFITS = [
  {
    icon: Sparkles,
    title: "貴社専用カスタマイズ",
    desc: "業種・規模・既存ワークフローに合わせて機能を作り込み",
  },
  {
    icon: Calendar,
    title: "月額顧問契約",
    desc: "改正法対応・運用相談・改善提案を継続サポート",
  },
  {
    icon: ShieldCheck,
    title: "労働安全コンサル監修",
    desc: "登録番号260022 の有資格者が直接担当",
  },
] as const;

export function EnterpriseFunnel({
  service,
  headline = "貴社の安全管理を、次のレベルへ",
  subline = "本機能は無料で公開していますが、現場ごとの運用に合わせたカスタマイズ・専用環境構築・データ連携までワンストップで対応します。",
  spacing = "default",
}: EnterpriseFunnelProps) {
  const contactHref = service
    ? `/enterprise/contact?service=${service}`
    : "/enterprise/contact";

  const wrapperPadding = spacing === "compact" ? "my-6" : "my-10";

  return (
    <section
      aria-labelledby="enterprise-funnel-heading"
      className={`mx-auto w-full max-w-7xl px-4 ${wrapperPadding}`}
    >
      <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-amber-50 p-6 shadow-sm sm:p-8 dark:border-emerald-800/60 dark:from-emerald-950/40 dark:via-slate-900 dark:to-amber-950/30">
        <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-emerald-200/40 blur-3xl dark:bg-emerald-700/20" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-amber-200/30 blur-3xl dark:bg-amber-700/20" />

        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-bold text-white shadow-sm">
              <Building2 className="h-3.5 w-3.5" aria-hidden />
              法人向け（Enterprise）
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-white px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:border-emerald-700 dark:bg-slate-900 dark:text-emerald-300">
              無料相談30分
            </span>
          </div>

          <h2
            id="enterprise-funnel-heading"
            className="mt-3 text-xl font-bold leading-snug text-slate-900 sm:text-2xl dark:text-slate-50"
          >
            {headline}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700 dark:text-slate-300">
            {subline}
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {BENEFITS.map((b) => {
              const Icon = b.icon;
              return (
                <div
                  key={b.title}
                  className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-white/80 p-3 backdrop-blur-sm dark:border-emerald-900/60 dark:bg-slate-900/60"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                    <Icon className="h-4.5 w-4.5" aria-hidden />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {b.title}
                    </p>
                    <p className="mt-0.5 text-xs leading-5 text-slate-600 dark:text-slate-400">
                      {b.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href={contactHref}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
            >
              無料相談を予約する
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href="/services/proposal"
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-white px-5 py-3 text-sm font-bold text-emerald-700 transition-colors hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:border-emerald-700 dark:bg-slate-900 dark:text-emerald-300 dark:hover:bg-slate-800"
            >
              提案書サンプルを見る
            </Link>
            <Link
              href="/services"
              className="inline-flex items-center gap-1 px-2 py-1 text-sm font-semibold text-slate-700 underline-offset-4 hover:text-emerald-700 hover:underline dark:text-slate-300 dark:hover:text-emerald-300"
            >
              受託メニュー一覧 →
            </Link>
          </div>

          <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-500">
            ※ 24時間以内にご返信（土日祝を除く）／無理な営業はありません
          </p>
        </div>
      </div>
    </section>
  );
}

export default EnterpriseFunnel;
