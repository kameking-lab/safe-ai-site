import NextLink from "next/link";
import type { ComponentProps } from "react";
import { getAutomationConsultAvailability } from "@/lib/automation-consult/availability";

function Link(props: ComponentProps<typeof NextLink>) {
  return <NextLink {...props} prefetch={false} />;
}

const TRUST_LINKS = [
  { href: "/safety-ai", label: "安全AIポータル" },
  { href: "/about/usage-notes", label: "ご利用上の注意" },
  { href: "/about/data-sources", label: "データの出典" },
  { href: "/about/quality", label: "情報品質" },
  { href: "/about", label: "サイトについて" },
  { href: "/about/project-story", label: "プロジェクトについて" },
  { href: "/contact", label: "お問い合わせ" },
  { href: "/privacy", label: "プライバシー" },
  { href: "/terms", label: "利用規約" },
] as const;

const NOTE_GUIDES = [
  {
    href: "https://note.com/anzen_ai_jp/n/nbe0fafcf0f34?utm_source=anzen_ai_portal&utm_medium=referral&utm_campaign=height_2m_note_funnel&utm_content=free_guide",
    label: "無料：2m高所作業の確認順",
  },
  {
    href: "https://note.com/anzen_ai_jp/n/n838317f8153d?utm_source=anzen_ai_portal&utm_medium=referral&utm_campaign=height_2m_note_funnel&utm_content=paid_template",
    label: "有料：作業計画・KY・点検の5点テンプレート",
  },
] as const;

export function Footer() {
  const availability = getAutomationConsultAvailability();
  const consultationHref =
    availability.contactMode === "mail_client"
      ? "/contact/automation-email"
      : "/services/automation";
  return (
    <footer data-site-footer className="mt-auto border-t border-white/15 bg-brand-secondary-solid text-white">
      <div className="mx-auto max-w-7xl px-[min(1rem,16px)] py-[min(2rem,32px)] sm:px-6">
        <section
          aria-labelledby="footer-automation-title"
          className="grid grid-cols-1 gap-4 rounded-[var(--radius-lg)] border border-white/25 bg-white/5 p-[min(1.25rem,20px)] sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"
        >
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-black tracking-[.12em] text-brand-accent-cool-on-dark">
                自動化相談
              </p>
              <span className="rounded-full border border-white/35 px-2.5 py-1 text-[11px] font-bold">
                {availability.label}
              </span>
            </div>
            <h2 id="footer-automation-title" className="mt-2 text-xl font-black">
              安全業務の「毎回同じ」を整理する
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-200">
              {availability.accepting
                ? "対応範囲と料金を確認し、小さな業務から相談できます。"
                : "対応範囲・料金目安・自動化サンプルを確認できます。"}
            </p>
          </div>
          <Link
            href={consultationHref}
            data-automation-cta-position="footer"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-semantic-ai-solid px-5 py-3 text-sm font-black text-white hover:bg-semantic-ai-solid-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/70"
          >
            {availability.contactMode === "mail_client"
              ? "メールで相談する"
              : "自動化例・料金を見る"}
            <span aria-hidden="true">↗</span>
          </Link>
        </section>

        <section
          aria-labelledby="footer-note-guides-title"
          className="mt-6 rounded-[var(--radius-lg)] border border-white/20 bg-white/5 p-4 sm:p-5"
        >
          <h2 id="footer-note-guides-title" className="text-base font-black">
            高所作業の実務ガイドをnoteで読む
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-200">
            2m以上の作業で確認する順番と、現場で複製して使える記録様式を用途別に案内します。
          </p>
          <nav
            aria-label="安全AI編集部のnote記事"
            className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap"
          >
            {NOTE_GUIDES.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center rounded-[var(--radius-sm)] border border-white/30 bg-white/10 px-4 py-2 text-sm font-bold text-white underline-offset-4 hover:bg-white/15 hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/70"
              >
                {item.label}
                <span className="ml-2" aria-hidden="true">
                  ↗
                </span>
              </Link>
            ))}
          </nav>
        </section>

        <div className="mt-6 border-t border-white/15 pt-4">
          <nav
            aria-label="運営・規約"
            className="flex flex-wrap gap-x-5 gap-y-1"
          >
            {TRUST_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex min-h-11 items-center text-xs font-semibold text-slate-300 underline-offset-4 hover:text-white hover:underline"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <p className="mt-3 text-xs text-slate-300">
            © 2026 安全AIポータル
          </p>
        </div>
      </div>
    </footer>
  );
}
