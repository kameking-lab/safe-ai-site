"use client";

const NOTE_GUIDES = [
  {
    id: "free",
    href: "https://note.com/anzen_ai_jp/n/nbe0fafcf0f34?utm_source=anzen_ai_portal&utm_medium=referral&utm_campaign=height_2m_note_funnel&utm_content=free_guide",
    label: "無料：2m高所作業の確認順",
  },
  {
    id: "paid",
    href: "https://note.com/anzen_ai_jp/n/n838317f8153d?utm_source=anzen_ai_portal&utm_medium=referral&utm_campaign=height_2m_note_funnel&utm_content=paid_template",
    label: "有料：作業計画・KY・点検の5点テンプレート",
  },
] as const;

// Keep SSR markup while avoiding a second copy of this static section in RSC.
export function FooterNoteGuides() {
  return (
    <section
      aria-labelledby="footer-note-guides-title"
      className="footer-guides"
    >
      <h2 id="footer-note-guides-title" className="text-base font-black">
        高所作業の実務ガイドをnoteで読む
      </h2>
      <p className="footer-description">
        2m以上の作業で確認する順番と、現場で複製して使える記録様式を用途別に案内します。
      </p>
      <nav
        aria-label="安全AI編集部のnote記事"
        className="footer-guide-links"
      >
        {NOTE_GUIDES.map((item) => (
          <a
            key={item.id}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            className="footer-guide-link"
          >
            <span>{item.label}</span>
            <span aria-hidden="true">
              ↗
            </span>
          </a>
        ))}
      </nav>
    </section>
  );
}
