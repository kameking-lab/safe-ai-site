import type { LawRevision } from "@/lib/types/domain";

export type RevisionImportSource = {
  url?: string | null;
  label?: string | null;
  issuer?: string | null;
};

export type RevisionImportMeta = {
  effectiveDate?: string | null;
  amendmentType?: string | null;
  lawNumber?: string | null;
  issuedBy?: string | null;
};

export type RevisionImportRecord = {
  id: string;
  title: string;
  publishedAt?: string | null;
  revisionNumber?: string | null;
  category?: string | null;
  kind?: string | null;
  issuer?: string | null;
  summary?: string | null;
  source?: RevisionImportSource | null;
  meta?: RevisionImportMeta | null;
};

export type RevisionImportPayload = {
  records: RevisionImportRecord[];
};

export type RevisionNormalizer = (input: RevisionImportRecord) => LawRevision | null;

export type RevisionsIngestSource = "sample" | "real";

export type RevisionImportMapper = {
  sourceName: string;
  mapRecord: (raw: unknown) => RevisionImportRecord | null;
};
