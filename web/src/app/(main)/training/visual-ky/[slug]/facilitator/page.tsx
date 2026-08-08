import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VisualKyFacilitatorMode } from "@/components/visual-ky/facilitator-mode";
import {
  PUBLIC_VISUAL_KY_SCENARIOS,
  getVisualKyScenarioBySlug,
} from "@/data/visual-ky";
import {
  getDeterministicRandomScenario,
  getJstDateKey,
  getNextVisualKyScenario,
} from "@/lib/visual-ky/daily";
import { getVisualKyCanonicalShareUrl } from "@/lib/visual-ky/share";

const HUB_PATH = "/training/visual-ky";

export function generateStaticParams() {
  return PUBLIC_VISUAL_KY_SCENARIOS.map((scenario) => ({
    slug: scenario.slug,
  }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const scenario = getVisualKyScenarioBySlug(slug);
  if (!scenario) return {};
  return {
    title: `${scenario.shortTitle}｜ファシリテーターモード`,
    description: `${scenario.shortTitle}の朝礼・講師向け進行画面です。`,
    alternates: { canonical: `${HUB_PATH}/${scenario.slug}` },
    robots: { index: false, follow: true },
  };
}

export default async function VisualKyFacilitatorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const scenario = getVisualKyScenarioBySlug(slug);
  if (!scenario || !PUBLIC_VISUAL_KY_SCENARIOS.some((item) => item.id === scenario.id)) {
    notFound();
  }
  const next = getNextVisualKyScenario(scenario.id);
  const random = getDeterministicRandomScenario(
    `${getJstDateKey()}|${scenario.id}|facilitator`,
    scenario.id,
  );
  return (
    <VisualKyFacilitatorMode
      scenario={scenario}
      canonicalUrl={getVisualKyCanonicalShareUrl(scenario)}
      nextHref={`${HUB_PATH}/${next.slug}/facilitator`}
      randomHref={`${HUB_PATH}/${random.slug}/facilitator`}
    />
  );
}
