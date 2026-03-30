import { lawRevisionCores } from "@/data/mock/law-revisions";
import type { LawRevision } from "@/lib/types/domain";

export function getLawRevisions(): LawRevision[] {
  return lawRevisionCores;
}
