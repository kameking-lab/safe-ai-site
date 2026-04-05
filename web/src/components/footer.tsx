import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-slate-50 px-4 py-4">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 sm:flex-row sm:justify-between">
        <p className="text-xs text-slate-500">© 2026 ANZEN AI</p>
        <nav aria-label="フッターナビゲーション" className="flex gap-4 text-xs text-slate-500">
          <Link href="/privacy" className="hover:text-slate-800 hover:underline">
            プライバシーポリシー
          </Link>
          <Link href="/terms" className="hover:text-slate-800 hover:underline">
            利用規約
          </Link>
        </nav>
      </div>
    </footer>
  );
}
