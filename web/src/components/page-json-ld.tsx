import { JsonLd, webPageSchema, breadcrumbSchema } from "./json-ld";

const SITE_BASE = "https://safe-ai-site.vercel.app";

type Crumb = { name: string; url: string };

/**
 * トップレベルページ向けの汎用 JSON-LD（WebPage + BreadcrumbList）。
 * - path はサイトルート相対 (例: "/pricing")
 * - breadcrumbs を省略すると Home → ページ名 の2段
 */
export function PageJsonLd({
  name,
  description,
  path,
  breadcrumbs,
}: {
  name: string;
  description: string;
  path: string;
  breadcrumbs?: Crumb[];
}) {
  const url = `${SITE_BASE}${path}`;
  const crumbs: Crumb[] = breadcrumbs ?? [
    { name: "ホーム", url: SITE_BASE },
    { name, url },
  ];
  return (
    <JsonLd
      schema={[
        webPageSchema({ name, description, url }),
        breadcrumbSchema(crumbs),
      ]}
    />
  );
}
