import type { LawRevision } from "@/lib/types/domain";

export type RevisionImportSource = {
  url?: string | null;
  label?: string | null;
};

export type RevisionImportRecord = {
  id: string;
  title: string;
  publishedAt: string;
  revisionNumber?: string | null;
  category?: string | null;
  kind?: string | null;
  issuer?: string | null;
  summary?: string | null;
  source?: RevisionImportSource | null;
};

export type RevisionImportPayload = {
  records: RevisionImportRecord[];
};

export type RevisionNormalizer = (input: RevisionImportRecord) => LawRevision | null;
