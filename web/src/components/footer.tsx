import Link from "next/link";

type FooterLink = {
  label: string;
  href: string;
};

type FooterColumn = {
  heading: string;
  links: FooterLink[];
};

const FOOTER_COLUMNS: FooterColumn[] = [
  {
    heading: "サービス",
    links: [
      { label: "受託業務", href: "/services" },
      { label: "特別教育", href: "/education" },
      { label: "月額顧問", href: "/consulting" },
      { label: "コンプラ診断", href: "/wizard" },
      { label: "料金プラン", href: "/pricing" },
      { label: "導入事例", href: "/cases" },
    ],
  },
  {
    heading: "サポート",
    links: [
      { label: "お問い合わせ・ご要望", href: "/contact" },
      { label: "助成金ガイド", href: "/subsidies" },
      { label: "通知/配信", href: "/notifications" },
      { label: "BCP", href: "/bcp" },
      { label: "保険加入状況", href: "/insurance" },
      { label: "セキュリティ", href: "/security" },
    ],
  },
  {
    heading: "会社情報",
    links: [
      { label: "運営者情報", href: "/about" },
      { label: "プライバシーポリシー", href: "/privacy" },
      { label: "利用規約", href: "/terms" },
      { label: "DPA（データ処理契約）", href: "/dpa" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/80">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
        {/* CTAバナー */}
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4 text-center dark:border-emerald-500/30 dark:from-emerald-500/10 dark:to-slate-800 sm:flex sm:items-center sm:justify-between sm:text-left">
          <div>
            <p className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
              業務自動化・安全管理コンサルのご相談を受付中
            </p>
            <p className="mt-0.5 text-xs text-emerald-800 dark:text-emerald-200/80">
              Excel・KY・安全書類のデジタル化、AI活用の業務効率化、お気軽にご相談ください。
            </p>
          </div>
          <Link
            href="/contact"
            className="mt-3 inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-emerald-700 sm:mt-0"
          >
            業務のご相談 →
          </Link>
        </div>

        {/* 3カラムリンク */}
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-8">
          {FOOTER_COLUMNS.map((col) => (
            <nav
              key={col.heading}
              aria-label={`フッター: ${col.heading}`}
              className="text-xs"
            >
              <h2 className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                {col.heading}
              </h2>
              <ul className="space-y-1.5">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-slate-600 hover:text-slate-900 hover:underline dark:text-slate-300 dark:hover:text-slate-100"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* コピーライト */}
        <div className="mt-6 border-t border-slate-200 pt-4 text-center text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400 sm:flex sm:items-center sm:justify-between sm:text-left">
          <p>
            © 2026 ANZEN AI ·{" "}
            <Link
              href="/about"
              className="hover:text-slate-800 hover:underline dark:hover:text-slate-200"
            >
              監修：労働安全コンサルタント（登録番号260022）
            </Link>
          </p>
          <p className="mt-2 text-[11px] sm:mt-0">
            現場の安全を、AIで変える。
          </p>
        </div>
      </div>
    </footer>
  );
}
