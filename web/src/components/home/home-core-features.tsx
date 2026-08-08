import Link from "next/link";
import {
  ArrowRight,
  Bell,
  ClipboardList,
  FileText,
  MonitorUp,
  ShoppingBag,
} from "lucide-react";

const PRIMARY_LINKS = [
  { href: "/ky/paper", label: "KY用紙", status: "作成・印刷", icon: ClipboardList },
  { href: "/risk", label: "朝礼要点", status: "今日の確認", icon: FileText },
  { href: "/safety-diary", label: "工程打合せ書", status: "記録・共有", icon: FileText },
  { href: "/signage", label: "サイネージ", status: "全画面", icon: MonitorUp },
  { href: "/goods", label: "安全グッズ", status: "用途別", icon: ShoppingBag },
  { href: "/notifications", label: "通知設定", status: "配信条件", icon: Bell },
] as const;

const ROLE_LINKS = [
  { href: "/for/construction", label: "職長" },
  { href: "/for/solo", label: "一人親方" },
  { href: "/for/manager", label: "安全衛生担当" },
  { href: "/pricing", label: "経営者" },
  { href: "/for/consultant", label: "専門家" },
  { href: "/training/visual-ky", label: "作業員" },
] as const;

export function HomeCoreFeatures() {
  return (
    <section
      id="home-tools"
      aria-labelledby="home-core-features"
      className="scroll-mt-24 border-y border-slate-200 bg-white px-4 py-7 dark:border-slate-800 dark:bg-slate-950"
      data-home-section="core-features"
    >
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-xs font-black tracking-[.16em] text-emerald-800 dark:text-emerald-300">
              現場で使う
            </p>
            <h2
              id="home-core-features"
              className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl dark:text-white"
            >
              次の作業へ1クリック
            </h2>
          </div>
          <Link
            href="/features"
            className="inline-flex min-h-11 items-center gap-1 text-sm font-black text-emerald-900 underline underline-offset-4 dark:text-emerald-200"
          >
            すべての機能
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </header>

        <ul className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
          {PRIMARY_LINKS.map(({ href, label, status, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="flex min-h-16 items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-3 text-slate-950 focus-visible:ring-4 focus-visible:ring-emerald-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                <Icon className="h-5 w-5 shrink-0 text-emerald-800 dark:text-emerald-300" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block text-sm font-black leading-5">{label}</span>
                  <span className="block text-[10px] text-slate-600 dark:text-slate-300">{status}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <nav aria-label="役割別の入口" className="mt-4 flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-black text-slate-600 dark:text-slate-300">
            役割別
          </span>
          {ROLE_LINKS.map((role) => (
            <Link
              key={role.label}
              href={role.href}
              className="inline-flex min-h-11 items-center rounded-full border border-slate-400 bg-white px-3 text-xs font-black text-slate-800 dark:bg-slate-900 dark:text-white"
            >
              {role.label}
            </Link>
          ))}
        </nav>
      </div>
    </section>
  );
}
