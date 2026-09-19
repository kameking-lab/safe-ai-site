import NextLink from "next/link";
import { FooterNoteGuides } from "./footer-note-guides";
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

export function Footer() {
  const availability = getAutomationConsultAvailability();
  const consultationHref =
    availability.contactMode === "mail_client"
      ? "/contact/automation-email"
      : "/services/automation";
  return (
    <footer data-site-footer className="footer-shell">
      <div className="footer-inner">
        <section
          aria-labelledby="footer-automation-title"
          className="footer-consult"
        >
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="footer-eyebrow">
                自動化相談
              </p>
              <span className="footer-availability">
                {availability.label}
              </span>
            </div>
            <h2 id="footer-automation-title" className="mt-2 text-xl font-black">
              安全業務の「毎回同じ」を整理する
            </h2>
            <p className="footer-description">
              {availability.accepting
                ? "対応範囲と料金を確認し、小さな業務から相談できます。"
                : "対応範囲・料金目安・自動化サンプルを確認できます。"}
            </p>
          </div>
          <Link
            href={consultationHref}
            data-automation-cta-position="footer"
            className="footer-consult-link"
          >
            {availability.contactMode === "mail_client"
              ? "メールで相談する"
              : "自動化例・料金を見る"}
            <span aria-hidden="true">↗</span>
          </Link>
        </section>

        <FooterNoteGuides />

        <nav
          aria-label="運営・規約"
          className="footer-legal flex flex-wrap gap-x-5 gap-y-1"
        >
          {TRUST_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="footer-legal-link"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <p className="footer-copyright">
          © 2026 安全AIポータル
        </p>
      </div>
    </footer>
  );
}
