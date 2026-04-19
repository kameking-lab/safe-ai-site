import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-5">
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4 text-center sm:flex sm:items-center sm:justify-between sm:text-left">
          <div>
            <p className="text-sm font-bold text-emerald-900">
              業務自動化・安全管理コンサルのご相談を受付中
            </p>
            <p className="mt-0.5 text-xs text-emerald-800">
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
          <p className="text-xs text-slate-500">
            © 2026 ANZEN AI ·{" "}
            <Link href="/about" className="hover:text-slate-800 hover:underline">
              監修：労働安全コンサルタント（登録番号260022）
            </Link>
          </p>
          <nav aria-label="フッターナビゲーション" className="flex flex-wrap justify-center gap-4 text-xs text-slate-500">
            <Link href="/privacy" className="hover:text-slate-800 hover:underline">
              プライバシーポリシー
            </Link>
            <Link href="/terms" className="hover:text-slate-800 hover:underline">
              利用規約
            </Link>
            <Link href="/about" className="hover:text-slate-800 hover:underline">
              運営者情報
            </Link>
            <Link href="/feedback" className="hover:text-slate-800 hover:underline">
              サイトへのご要望
            </Link>
            <Link href="/contact" className="hover:text-slate-800 hover:underline">
              お問い合わせ
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
