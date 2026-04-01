import sample from "@/lib/revisions-ingest/sample-revisions.json";
import { normalizeRevisionRecords } from "@/lib/revisions-ingest/normalize";
import { parseRevisionImportPayload } from "@/lib/revisions-ingest/parse";
import type { LawRevision } from "@/lib/types/domain";

export function loadSampleRevisions(): LawRevision[] {
  const parsed = parseRevisionImportPayload(sample as unknown);
  return normalizeRevisionRecords(parsed);
}
