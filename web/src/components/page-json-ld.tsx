import { JsonLd, webPageSchema, breadcrumbSchema } from "./json-ld";
import { Breadcrumb, type BreadcrumbItem } from "./breadcrumb";

const SITE_BASE = "https://www.anzen-ai-portal.jp";

type Crumb = { name: string; url: string };

/**
 * トップレベルページ向けの汎用 JSON-LD（WebPage + BreadcrumbList）+ 可視 breadcrumb。
 * - path はサイトルート相対 (例: "/pricing")
 * - breadcrumbs を省略すると Home → ページ名 の2段
 */
export function PageJsonLd({
  name,
  description,
  path,
  breadcrumbs,
  keywords,
  contributor,
}: {
  name: string;
  description: string;
  path: string;
  breadcrumbs?: Crumb[];
  keywords?: string[];
  /** E-E-A-T監修者をcontributorとして付与するか（法令隣接コンテンツ向け） */
  contributor?: boolean;
}) {
  const url = `${SITE_BASE}${path}`;
  const crumbs: Crumb[] = breadcrumbs ?? [
    { name: "ホーム", url: SITE_BASE },
    { name, url },
  ];

  // Map JSON-LD crumbs to visible breadcrumb items (skip the "ホーム" root entry — it's the Home icon)
  const visibleItems: BreadcrumbItem[] = crumbs.slice(1).map((c) => ({
    name: c.name,
    href: c.url.startsWith(SITE_BASE) ? c.url.slice(SITE_BASE.length) || "/" : c.url,
  }));

  return (
    <>
      <JsonLd
        schema={[
          webPageSchema({ name, description, url, keywords, contributor }),
          breadcrumbSchema(crumbs),
        ]}
      />
      <div className="px-4 pt-3 sm:px-6">
        <Breadcrumb items={visibleItems} />
      </div>
    </>
  );
}
