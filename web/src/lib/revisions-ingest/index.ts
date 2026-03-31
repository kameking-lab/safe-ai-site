export { loadSampleRevisions } from "@/lib/revisions-ingest/load-sample";
export { loadRealRevisions, loadRealRevisionsFromPayload } from "@/lib/revisions-ingest/load-real";
export { normalizeRevisionRecord, normalizeRevisionRecords } from "@/lib/revisions-ingest/normalize";
export type {
  RevisionImportRecord,
  RevisionImportSource,
  RevisionImportPayload,
  RevisionsIngestSource,
} from "@/lib/revisions-ingest/types";
