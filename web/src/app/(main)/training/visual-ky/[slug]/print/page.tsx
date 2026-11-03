import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VisualKyPrintView } from "./print-view";
import {
  PUBLIC_VISUAL_KY_SCENARIOS,
  getVisualKyScenarioBySlug,
} from "@/data/visual-ky";

const HUB_PATH = "/training/visual-ky";

export function generateStaticParams() {
  return PUBLIC_VISUAL_KY_SCENARIOS.map((scenario) => ({
    slug: scenario.slug,
  }));
}

export const dynamicParams = false;
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const scenario = getVisualKyScenarioBySlug(slug);
  if (!scenario) return {};
  return {
    title: `${scenario.shortTitle}｜印刷・配布`,
    description: `${scenario.shortTitle}のA4印刷用問題、記入欄、解説、講師台本です。`,
    alternates: { canonical: `${HUB_PATH}/${scenario.slug}` },
    robots: { index: false, follow: true },
  };
}

export default async function VisualKyPrintPage({params,searchParams}:{params:Promise<{slug:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const [{slug},query]=await Promise.all([params,searchParams]);
  const scenario=getVisualKyScenarioBySlug(slug);
  if(!scenario || !PUBLIC_VISUAL_KY_SCENARIOS.some(item=>item.id===scenario.id))notFound();
  return <VisualKyPrintView scenario={scenario} initialFormat={query.format} initialTimestamp={new Date().toISOString()}/>;
}
