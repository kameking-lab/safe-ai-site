export type { GlossaryTerm } from "./types";
export { BATCH1_TERMS } from "./glossary-batch-1-law";
export { BATCH2_TERMS } from "./glossary-batch-2-chemical";

import { BATCH1_TERMS } from "./glossary-batch-1-law";
import { BATCH2_TERMS } from "./glossary-batch-2-chemical";

export const EXTRA_TERMS = [...BATCH1_TERMS, ...BATCH2_TERMS];
