import { summaryMockByRevisionId } from "@/data/mock/summaries";
import type { RevisionSummary } from "@/lib/types/domain";

export async function getSummaryByRevisionId(
  revisionId: string
): Promise<RevisionSummary | null> {
  await new Promise((resolve) => setTimeout(resolve, 650));
  return summaryMockByRevisionId[revisionId] ?? null;
}
