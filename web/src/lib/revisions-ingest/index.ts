export { loadSampleRevisions } from "@/lib/revisions-ingest/load-sample";
export { loadRealRevisions, loadRealRevisionsFromPayload } from "@/lib/revisions-ingest/load-real";
export { normalizeRevisionRecord, normalizeRevisionRecords } from "@/lib/revisions-ingest/normalize";
export {
  defaultRevisionImportMapper,
  officialDbRevisionImportMapper,
  resolveRevisionImportMapper,
  revisionImportMappers,
} from "@/lib/revisions-ingest/parse";
export type {
  RevisionImportRecord,
  RevisionImportSource,
  RevisionImportPayload,
  RevisionsIngestSource,
  RevisionImportMapper,
} from "@/lib/revisions-ingest/types";
