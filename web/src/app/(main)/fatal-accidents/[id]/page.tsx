import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd, breadcrumbSchema } from "@/components/json-ld";
import { PageContainer } from "@/components/layout/page-container";
import { SITE_NAME, SITE_URL, withSiteAlternates, withSiteOpenGraph } from "@/lib/seo-metadata";
import {
  VERIFIED_FATAL_RECORDS,
  fatalRecordDescription,
  fatalRecordSource,
  fatalRecordTitle,
  getVerifiedFatalRecord,
} from "@/lib/seo/fatal-records";

// No request-bound fetching, auth or AI. Each URL is generated once per build.
export const dynamic = "force-static";
export const dynamicParams = false;
export function generateStaticParams() { return VERIFIED_FATAL_RECORDS.map(({ id }) => ({ id })); }
type Props = { params: Promise<{ id: string }> };
function requireRecord(id: string) { const record = getVerifiedFatalRecord(id); if (!record) notFound(); return record; }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const record = requireRecord((await params).id);
  const title = fatalRecordTitle(record);
  const description = fatalRecordDescription(record);
  return {
    title, description: `${record.year}年・${record.industry}の${record.type}（${record.id}）。${description}`,
    alternates: withSiteAlternates(`/fatal-accidents/${record.id}`),
    openGraph: withSiteOpenGraph(`/fatal-accidents/${record.id}`, { title, description, type: "article" }),
  };
}
export default async function FatalRecordPage({ params }: Props) {
  const record = requireRecord((await params).id);
  const source = fatalRecordSource(record);
  const title = fatalRecordTitle(record);
  const description = fatalRecordDescription(record);
  const url = `${SITE_URL}/fatal-accidents/${record.id}`;
  const related = VERIFIED_FATAL_RECORDS.filter((other) => other.id !== record.id && other.type === record.type && other.industry === record.industry).slice(0, 3);
  return <PageContainer width="prose">
    <JsonLd schema={[
      breadcrumbSchema([{ name: "ホーム", url: SITE_URL }, { name: "死亡事故データベース", url: `${SITE_URL}/fatal-accidents` }, { name: title, url }]),
      { "@context": "https://schema.org", "@type": "Article", "@id": `${url}#article`, headline: title, description, url, mainEntityOfPage: url, inLanguage: "ja", dateModified: source.verifiedOn, author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL }, citation: { "@type": "CreativeWork", name: `厚生労働省 死亡災害データベース ${record.year}年 ID ${source.officialId}`, url: source.url }, isBasedOn: source.url },
    ]} />
    <nav className="py-4 text-sm"><Link href="/fatal-accidents" className="underline">死亡事故データベース</Link></nav>
    <header className="space-y-3"><h1 className="text-2xl font-bold leading-relaxed">{title}</h1><p className="text-sm text-slate-600">出典照合・ページ更新 <time dateTime={source.verifiedOn}>{source.verifiedOn}</time></p></header>
    <section className="mt-6"><h2 className="text-xl font-bold">災害の発生状況</h2><p className="mt-3 whitespace-pre-line leading-8">{description}</p></section>
    <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-5 gap-y-3 rounded-xl border bg-white p-5 text-sm">
      {[["発生年月", `${record.year}年${record.month ? `${record.month}月` : "（月不明）"}`], ["業種", record.industry], ["業種（中分類）", record.industryMedium], ["事故の型", record.type], ["起因物（大分類）", record.cause], ["事業場規模", record.workplaceSize], ["発生時間帯", record.occurrenceTime]].map(([label, value]) => <div key={label} className="contents"><dt className="font-bold">{label}</dt><dd>{value ?? "記載なし"}</dd></div>)}
    </dl>
    <section className="mt-7 space-y-3"><h2 className="text-xl font-bold">出典</h2><p className="text-sm leading-7"><a className="underline" href={source.url}>厚生労働省「職場のあんぜんサイト」死亡災害データベース {record.year}年（Excel）</a>、ID {source.officialId}・シート1の{source.row}行目をもとに整理。発生状況は公表本文{description !== record.description ? "（一部省略）" : ""}、見出しと項目配置は当サイトによる編集です。</p><a className="text-sm underline" href={source.termsUrl}>厚生労働省のコンテンツ利用条件</a></section>
    {related.length > 0 && <section className="mt-7"><h2 className="text-xl font-bold">同じ業種・事故型の事例</h2><ul className="mt-3 space-y-3">{related.map((other) => <li key={other.id}><Link className="text-sm underline" href={`/fatal-accidents/${other.id}`}>{fatalRecordTitle(other)}</Link></li>)}</ul></section>}
    <nav className="mt-8 flex flex-wrap gap-5 text-sm underline"><Link href="/fatal-accidents">死亡事故を検索</Link><Link href="/accidents">原因・再発防止策のある事例</Link><Link href="/ky/paper">KY用紙を作成</Link></nav>
  </PageContainer>;
}
