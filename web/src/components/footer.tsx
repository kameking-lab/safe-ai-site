import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/80">
      <div className="mx-auto max-w-7xl px-4 py-5">
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
        <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            © 2026 ANZEN AI ·{" "}
            <Link href="/about" className="hover:text-slate-800 hover:underline dark:hover:text-slate-200">
              監修：労働安全コンサルタント（登録番号260022）
            </Link>
          </p>
          <nav aria-label="フッターナビゲーション" className="flex flex-wrap justify-center gap-4 text-xs text-slate-500 dark:text-slate-400">
            <Link href="/services" className="hover:text-slate-800 hover:underline dark:hover:text-slate-200">
              受託業務
            </Link>
            <Link href="/education" className="hover:text-slate-800 hover:underline dark:hover:text-slate-200">
              特別教育
            </Link>
            <Link href="/consulting" className="hover:text-slate-800 hover:underline dark:hover:text-slate-200">
              月額顧問
            </Link>
            <Link href="/wizard" className="hover:text-slate-800 hover:underline dark:hover:text-slate-200">
              コンプラ診断
            </Link>
            <Link href="/privacy" className="hover:text-slate-800 hover:underline dark:hover:text-slate-200">
              プライバシーポリシー
            </Link>
            <Link href="/terms" className="hover:text-slate-800 hover:underline dark:hover:text-slate-200">
              利用規約
            </Link>
            <Link href="/about" className="hover:text-slate-800 hover:underline dark:hover:text-slate-200">
              運営者情報
            </Link>
            <Link href="/security" className="hover:text-slate-800 hover:underline dark:hover:text-slate-200">
              セキュリティ
            </Link>
            <Link href="/dpa" className="hover:text-slate-800 hover:underline dark:hover:text-slate-200">
              DPA
            </Link>
            <Link href="/bcp" className="hover:text-slate-800 hover:underline dark:hover:text-slate-200">
              BCP
            </Link>
            <Link href="/insurance" className="hover:text-slate-800 hover:underline dark:hover:text-slate-200">
              保険加入状況
            </Link>
            <Link href="/contact" className="hover:text-slate-800 hover:underline dark:hover:text-slate-200">
              お問い合わせ・ご要望
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
