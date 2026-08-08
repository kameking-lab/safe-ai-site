import Link from "next/link";
import { AppShellNavigation } from "@/components/app-shell-navigation";
import { MascotBadge } from "@/components/mascot-badge";

interface AppShellProps {
  children: React.ReactNode;
  footerSlot?: React.ReactNode;
}

/**
 * 共通レイアウトのServer Component境界。
 * ナビゲーションとブランド表示はHTMLで即時配信し、操作UIだけを小さな島に分ける。
 */
export function AppShell({
  children,
  footerSlot,
}: AppShellProps) {
  return (
    <div className="grid min-h-full w-full grid-cols-1 grid-rows-[auto_minmax(0,1fr)_auto] bg-background lg:grid-cols-[240px_minmax(0,1fr)]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:inline-flex focus:min-h-11 focus:items-center focus:rounded-[var(--radius-sm)] focus:bg-brand-primary-solid focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-white focus:shadow-[var(--shadow-sm)] focus:outline-none focus:ring-4 focus:ring-brand-primary/25"
      >
        メインコンテンツへスキップ
      </a>

      <aside className="hidden w-60 flex-col border-r border-portal-border bg-portal-surface px-3 py-5 lg:col-start-1 lg:row-span-3 lg:row-start-1 lg:flex print:!hidden">
        <Link
          href="/"
          prefetch={false}
          className="mb-4 flex items-center gap-2 rounded-[var(--radius-md)] border border-portal-border bg-portal-surface-emphasis p-2.5 shadow-[var(--shadow-xs)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-primary/25"
        >
          <MascotBadge
            size={32}
            alt=""
            className="shrink-0 rounded-xl"
          />
          <span className="min-w-0">
            <span className="block text-xs font-black tracking-wide text-brand-primary">
              安全AIポータル
            </span>
          </span>
        </Link>

        <AppShellNavigation
          position="desktop"
          automationHref="/services/automation"
        />

        <details
          data-display-settings
          className="mt-4 border-t border-portal-border pt-3"
        >
          <summary className="flex min-h-10 cursor-pointer items-center rounded-[var(--radius-sm)] px-3 text-xs font-bold text-brand-secondary hover:bg-portal-surface-emphasis focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-primary/25">
            表示設定
          </summary>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {[
              ["furigana", "ふりがな"],
              ["large", "文字大"],
              ["contrast", "屋外表示"],
            ].map(([preference, label]) => (
              <button
                key={preference}
                type="button"
                data-display-preference={preference}
                data-active="false"
                aria-pressed="false"
                className="min-h-10 rounded-[var(--radius-sm)] border border-portal-border bg-portal-surface px-2 text-[11px] font-bold text-portal-muted data-[active=true]:border-brand-primary-solid data-[active=true]:bg-brand-primary-solid data-[active=true]:text-white"
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              data-display-preference="theme"
              data-theme="system"
              className="min-h-10 rounded-[var(--radius-sm)] border border-portal-border bg-portal-surface px-2 text-[11px] font-bold text-portal-muted"
              aria-label="テーマ切替。現在は端末設定"
            >
              テーマ
            </button>
            <Link
              href="/account"
              prefetch={false}
              className="col-span-2 inline-flex min-h-10 items-center justify-center rounded-[var(--radius-sm)] text-[11px] font-bold text-brand-primary hover:bg-portal-surface-emphasis"
            >
              ログイン・マイページ
            </Link>
          </div>
        </details>
      </aside>

      <div className="col-start-1 row-start-1 min-w-0 lg:col-start-2">
        <header
          data-app-shell-header=""
          className="relative border-b border-portal-border bg-portal-surface lg:hidden print:!hidden"
        >
          <div className="flex min-h-[64px] items-center gap-[8px] px-[12px] py-[10px] pr-[104px]">
            <Link
              href="/"
              prefetch={false}
              className="flex min-w-0 flex-1 items-center gap-2 rounded-[var(--radius-sm)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-primary/25"
            >
              <MascotBadge
                size={32}
                alt=""
                className="shrink-0 rounded-lg"
              />
              <span className="min-w-0">
                <span data-compact-text className="block truncate text-[11px] font-black tracking-wide text-brand-primary">
                  安全AIポータル
                </span>
              </span>
            </Link>
            <Link
              href="/search"
              prefetch={false}
              aria-label="サイト内検索を開く（Ctrl+K）"
              aria-keyshortcuts="Control+K"
              className="inline-flex size-[44px] shrink-0 items-center justify-center rounded-full border border-portal-border bg-portal-surface text-brand-secondary shadow-[var(--shadow-xs)] hover:bg-portal-surface-emphasis focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-primary/25"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="size-[20px]"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.4-3.4" />
              </svg>
            </Link>
          </div>

          <details
            data-mobile-site-menu
            suppressHydrationWarning
            className="group"
          >
            <summary
              role="button"
              data-compact-text
              className="absolute right-[12px] top-[10px] z-10 inline-flex h-[44px] min-w-[76px] cursor-pointer list-none items-center justify-center rounded-full border border-emerald-300 bg-white px-[12px] text-[12px] font-black text-emerald-800 shadow-sm hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 dark:border-emerald-500/50 dark:bg-slate-800 dark:text-emerald-200"
              aria-controls="mobile-site-menu"
              aria-label="メニューを開閉"
            >
              <span className="group-open:hidden">メニュー</span>
              <span className="hidden group-open:inline">閉じる</span>
            </summary>
            <div
              id="mobile-site-menu"
              role="region"
              aria-label="モバイルサイトメニュー。Escキーで閉じます"
              className="border-t border-portal-border bg-portal-surface px-3 py-3 shadow-[var(--shadow-md)]"
            >
              <div className="flex flex-wrap items-center gap-2 border-b border-portal-border pb-2">
                <Link
                  href="/notifications"
                  prefetch={false}
                  className="inline-flex min-h-11 items-center rounded-xl px-3 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800"
                >
                  通知
                </Link>
                <Link
                  href="/account"
                  prefetch={false}
                  className="inline-flex min-h-11 items-center rounded-xl px-3 text-xs font-bold text-emerald-800 hover:bg-emerald-50 dark:text-emerald-200 dark:hover:bg-emerald-950/40"
                >
                  ログイン・マイページ
                </Link>
              </div>

              <details
                data-display-settings
                className="mt-2 border-b border-portal-border pb-2"
              >
                <summary className="flex min-h-11 cursor-pointer items-center rounded-[var(--radius-sm)] px-3 text-sm font-bold text-brand-secondary hover:bg-portal-surface-emphasis">
                  表示設定
                </summary>
                <div aria-label="表示・入力支援" className="mt-2 grid grid-cols-2 gap-2">
                  {[
                    ["furigana", "ふりがな"],
                    ["easy", "やさしい日本語"],
                    ["large", "文字大"],
                    ["contrast", "屋外表示"],
                  ].map(([preference, label]) => (
                    <button
                      key={preference}
                      type="button"
                      data-display-preference={preference}
                      data-active="false"
                      aria-pressed="false"
                      className="min-h-11 rounded-[var(--radius-sm)] border border-portal-border bg-portal-surface px-3 py-2 text-xs font-bold text-portal-muted data-[active=true]:border-brand-primary-solid data-[active=true]:bg-brand-primary-solid data-[active=true]:text-white"
                    >
                      {label}
                    </button>
                  ))}
                  <button
                    type="button"
                    data-display-preference="theme"
                    data-theme="system"
                    className="col-span-2 min-h-11 rounded-[var(--radius-sm)] border border-portal-border bg-portal-surface px-3 text-xs font-bold text-portal-muted"
                    aria-label="テーマ切替。現在は端末設定"
                  >
                    テーマ
                  </button>
                </div>
              </details>

              <div className="mt-3">
                <AppShellNavigation
                  position="mobile"
                  automationHref="/services/automation"
                />
              </div>
            </div>
          </details>
        </header>
      </div>

      <main
        id="main-content"
        tabIndex={-1}
        className="col-start-1 row-start-2 flex min-w-0 flex-col scroll-mt-20 pb-[calc(4rem+env(safe-area-inset-bottom))] focus:outline-none lg:col-start-2 lg:pb-0"
      >
        <div className="mx-auto w-full max-w-7xl flex-1">{children}</div>
      </main>
      <div className="col-start-1 row-start-3 min-w-0 print:hidden lg:col-start-2">
        {footerSlot}
      </div>
    </div>
  );
}
