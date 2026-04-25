import Link from "next/link";
import { ArrowLeft, BookOpen, ExternalLink, Sparkles } from "lucide-react";

export type ScaffoldLink = {
  label: string;
  href: string;
  /** external url */
  external?: boolean;
  description?: string;
};

const SITE_ORIGIN = "https://anzen-ai.com";

export type ScaffoldPageProps = {
  /** Breadcrumb back-link label */
  backLabel: string;
  backHref: string;
  /** Canonical path for this page (e.g. "/laws/bcp"). Enables BreadcrumbList JSON-LD. */
  canonicalPath?: string;
  /** Small uppercase eyebrow above the H1 */
  eyebrow: string;
  title: string;
  lead: string;
  /** Key bullets describing the scope of the page (intro骨組) */
  keyPoints: string[];
  /** Relevant laws / ordinances / notices */
  relatedLaws?: ScaffoldLink[];
  /** Resources to cross-navigate */
  resources?: ScaffoldLink[];
  /** Official external references */
  officialRefs?: ScaffoldLink[];
  /** Call-to-action block at bottom */
  cta?: {
    label: string;
    href: string;
    description?: string;
  };
};

/**
 * 共通スカフォールド ページ。大規模提案の骨組みだけを先出しする場合に使用する
 * 軽量レイアウト。各ページの個別実装（フォーム・ツール等）が揃ったら、
 * このコンポーネントの利用を外して独自 UI に置き換える想定。
 */
export function ScaffoldPage({
  backLabel,
  backHref,
  canonicalPath,
  eyebrow,
  title,
  lead,
  keyPoints,
  relatedLaws = [],
  resources = [],
  officialRefs = [],
  cta,
}: ScaffoldPageProps) {
  const sectionName = backLabel.replace(/に戻る$/, "");
  const breadcrumbLd = canonicalPath
    ? {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "ANZEN AI", item: `${SITE_ORIGIN}/` },
          { "@type": "ListItem", position: 2, name: sectionName, item: `${SITE_ORIGIN}${backHref}` },
          { "@type": "ListItem", position: 3, name: title, item: `${SITE_ORIGIN}${canonicalPath}` },
        ],
      }
    : null;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
      {breadcrumbLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
        />
      )}
      <div className="mb-4">
        <Link
          href={backHref}
          className="inline-flex min-h-[44px] items-center gap-1 rounded-lg px-2 py-1 text-sm text-slate-600 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {backLabel}
        </Link>
      </div>

      <header className="mb-5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-emerald-700">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          {eyebrow}
        </div>
        <h1 className="mt-2 text-2xl font-bold leading-snug text-slate-900 sm:text-3xl">
          {title}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-700 sm:text-base">
          {lead}
        </p>
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          🛠 この特集ページは<strong>骨組み公開中</strong>です。
          利用者の要望が多いテーマを確定版に先んじて立ち上げています。
          解説本文・図表・事例集は今後のアップデートで拡充していきます。
        </div>
      </header>

      <section aria-labelledby="key-points" className="mb-6">
        <h2
          id="key-points"
          className="mb-2 text-base font-bold text-slate-900 sm:text-lg"
        >
          このページで扱う論点
        </h2>
        <ul className="space-y-1.5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          {keyPoints.map((p) => (
            <li key={p} className="flex items-start gap-2 text-sm leading-6 text-slate-700">
              <span className="mt-1 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500" />
              {p}
            </li>
          ))}
        </ul>
      </section>

      {relatedLaws.length > 0 && (
        <section aria-labelledby="related-laws" className="mb-6">
          <h2
            id="related-laws"
            className="mb-2 flex items-center gap-2 text-base font-bold text-slate-900 sm:text-lg"
          >
            <BookOpen className="h-5 w-5 text-blue-600" aria-hidden="true" />
            関連法令・通達
          </h2>
          <ul className="space-y-2">
            {relatedLaws.map((l) => (
              <li key={l.href + l.label}>
                <ScaffoldLinkCard link={l} tone="blue" />
              </li>
            ))}
          </ul>
        </section>
      )}

      {resources.length > 0 && (
        <section aria-labelledby="related-resources" className="mb-6">
          <h2
            id="related-resources"
            className="mb-2 text-base font-bold text-slate-900 sm:text-lg"
          >
            サイト内の関連ページ
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {resources.map((r) => (
              <li key={r.href + r.label}>
                <ScaffoldLinkCard link={r} tone="emerald" />
              </li>
            ))}
          </ul>
        </section>
      )}

      {officialRefs.length > 0 && (
        <section aria-labelledby="official-refs" className="mb-6">
          <h2
            id="official-refs"
            className="mb-2 text-base font-bold text-slate-900 sm:text-lg"
          >
            公的機関の一次情報
          </h2>
          <ul className="space-y-2">
            {officialRefs.map((r) => (
              <li key={r.href + r.label}>
                <ScaffoldLinkCard link={{ ...r, external: true }} tone="slate" />
              </li>
            ))}
          </ul>
        </section>
      )}

      {cta && (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
          {cta.description && (
            <p className="mb-3 text-sm text-slate-700">{cta.description}</p>
          )}
          <Link
            href={cta.href}
            className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700"
          >
            {cta.label}
          </Link>
        </div>
      )}
    </main>
  );
}

function ScaffoldLinkCard({
  link,
  tone,
}: {
  link: ScaffoldLink;
  tone: "blue" | "emerald" | "slate";
}) {
  const toneMap = {
    blue: "border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-900",
    emerald: "border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-900",
    slate: "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-900",
  } as const;

  const classes = `block min-h-[56px] rounded-xl border px-3 py-2.5 text-sm transition-colors ${toneMap[tone]}`;

  if (link.external) {
    return (
      <a
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        className={classes}
      >
        <span className="flex items-center gap-1.5 font-semibold">
          {link.label}
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        {link.description && (
          <span className="mt-0.5 block text-[11px] leading-5 opacity-80">
            {link.description}
          </span>
        )}
      </a>
    );
  }
  return (
    <Link href={link.href} className={classes}>
      <span className="block font-semibold">{link.label}</span>
      {link.description && (
        <span className="mt-0.5 block text-[11px] leading-5 opacity-80">
          {link.description}
        </span>
      )}
    </Link>
  );
}
