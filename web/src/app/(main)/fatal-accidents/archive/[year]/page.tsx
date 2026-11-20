import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { JsonLd, breadcrumbSchema } from "@/components/json-ld";
import { SITE_URL, withSiteAlternates, withSiteOpenGraph } from "@/lib/seo-metadata";
import {
  FATAL_RECORDS_VERIFIED_ON,
  VERIFIED_FATAL_RECORDS,
  VERIFIED_FATAL_RECORD_YEARS as years,
  fatalRecordTitle,
} from "@/lib/seo/fatal-records";

export const dynamic = "force-static";
export const dynamicParams = false;
export function generateStaticParams() { return years.map((year) => ({ year: String(year) })); }
type Props = { params: Promise<{ year: string }> };
function recordsFor(year: string) { const records = VERIFIED_FATAL_RECORDS.filter((record) => String(record.year) === year); if (!records.length) notFound(); return records; }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { year } = await params;
  const records = recordsFor(year);
  const title = `${year}年の死亡災害事例一覧｜原典照合済み${records.length}件`;
  const path = `/fatal-accidents/archive/${year}`;
  const description = `${year}年の死亡災害のうち、厚生労働省の公式Excelと発生状況・分類を照合した${records.length}件の詳細一覧。各事例から発生状況、業種、事故型、原典の行番号を確認できます。`;
  return { title, description, alternates: withSiteAlternates(path), openGraph: withSiteOpenGraph(path, { title, description }) };
}
export default async function FatalArchivePage({ params }: Props) {
  const { year } = await params;
  const records = recordsFor(year);
  const title = `${year}年の死亡災害事例一覧`;
  const url = `${SITE_URL}/fatal-accidents/archive/${year}`;
  return <PageContainer width="wide">
    <JsonLd schema={[
      breadcrumbSchema([{ name: "ホーム", url: SITE_URL }, { name: "死亡事故データベース", url: `${SITE_URL}/fatal-accidents` }, { name: title, url }]),
      { "@context": "https://schema.org", "@type": "CollectionPage", name: title, url, dateModified: FATAL_RECORDS_VERIFIED_ON, mainEntity: { "@type": "ItemList", numberOfItems: records.length, itemListElement: records.map((record, index) => ({ "@type": "ListItem", position: index + 1, name: fatalRecordTitle(record), url: `${SITE_URL}/fatal-accidents/${record.id}` })) } },
    ]} />
    <nav className="py-4 text-sm"><Link href="/fatal-accidents" className="underline">死亡事故データベース</Link></nav>
    <header><h1 className="text-2xl font-bold">{title}</h1><p className="mt-3 text-sm text-slate-600">原典照合済み {records.length}件 · 更新 <time dateTime={FATAL_RECORDS_VERIFIED_ON}>{FATAL_RECORDS_VERIFIED_ON}</time></p></header>
    <nav aria-label="発生年別の事例" className="my-5 flex flex-wrap gap-5 text-sm underline">{years.map((value) => <Link key={value} href={`/fatal-accidents/archive/${value}`} aria-current={String(value) === year ? "page" : undefined}>{value}年</Link>)}</nav>
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{records.map((record) => <li key={record.id} className="rounded-xl border bg-white p-4 [content-visibility:auto] [contain-intrinsic-block-size:auto_100px]"><Link prefetch={false} className="text-sm leading-7 underline" href={`/fatal-accidents/${record.id}`}>{fatalRecordTitle(record)}</Link></li>)}</ul>
  </PageContainer>;
}
