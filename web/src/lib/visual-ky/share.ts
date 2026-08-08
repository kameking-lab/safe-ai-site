import type { VisualKyScenario } from "@/data/visual-ky/schema";
import { SITE_URL } from "@/lib/seo-metadata";

export function getVisualKyCanonicalPath(
  scenario: Pick<VisualKyScenario, "slug">,
): string {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(scenario.slug)) {
    throw new Error("Invalid visual KY slug");
  }
  return `/training/visual-ky/${scenario.slug}`;
}

/**
 * QR・投影共有は公開canonical URLだけを使用する。
 * query、fragment、token、利用者識別子、進捗を受け取るAPIを設けない。
 */
export function getVisualKyCanonicalShareUrl(
  scenario: Pick<VisualKyScenario, "slug">,
): string {
  return `${SITE_URL}${getVisualKyCanonicalPath(scenario)}`;
}
