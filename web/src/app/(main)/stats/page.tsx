import type { Metadata } from "next";
import { StatsDashboard } from "./StatsDashboard";
import { withSiteOpenGraph, withSiteTwitter, SITE_URL } from "@/lib/seo-metadata";
import { JsonLd, webPageSchema, breadcrumbSchema } from "@/components/json-ld";
import { hasAdminPageAccess } from "@/lib/server/admin-access";
import Link from "next/link";
import { PageContainer } from "@/components/layout";

const _title = "利用統計ダッシュボード";
const _desc =
  "安全AIポータルの利用統計ダッシュボード。Google Analytics 4 / Search Console を接続した期間の実数値のみを表示します（未接続時はサンプル数値を表示せず、準備中の案内のみ表示）。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  alternates: { canonical: "/stats" },
  // 実データ蓄積前は noindex（運営用ダッシュボードのため検索結果に出さない）
  // (content-quality audit 2026-05-16 C-1)
  robots: { index: false, follow: true },
  openGraph: withSiteOpenGraph("/stats", {
    title: _title,
    description: _desc,
  }),
  twitter: withSiteTwitter({
    card: "summary",
    title: _title,
    description: _desc,
  }),
};

export default async function StatsPage() {
  if (!(await hasAdminPageAccess())) {
    return <PageContainer width="narrow" paddingY="tight">
      <h1 className="text-xl font-bold">サイト利用統計</h1>
      <p className="mt-3 text-sm leading-7">アクセス解析は運営者向けです。一般公開の利用人数や成果は掲載していません。</p>
      <p className="mt-2 text-sm leading-7">労働災害の件数・死亡者数を調べる場合は、事故統計をご利用ください。</p>
      <div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold underline">
        <Link href="/accidents-analytics">労働災害の統計を見る</Link>
        <Link href="/about/quality">情報の出典・確認状態を見る</Link>
      </div>
    </PageContainer>;
  }
  const url = `${SITE_URL}/stats`;
  return (
    <>
      <JsonLd
        schema={[
          webPageSchema({ name: _title, description: _desc, url }),
          breadcrumbSchema([
            { name: "ホーム", url: SITE_URL },
            { name: "利用統計", url },
          ]),
        ]}
      />
      <StatsDashboard />
    </>
  );
}
