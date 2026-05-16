export type { GlossaryTerm } from "./types";
export { BATCH1_TERMS } from "./glossary-batch-1-law";
export { BATCH2_TERMS } from "./glossary-batch-2-chemical";
export { BATCH3_TERMS } from "./glossary-batch-3-machinery";

import { BATCH1_TERMS } from "./glossary-batch-1-law";
import { BATCH2_TERMS } from "./glossary-batch-2-chemical";
import { BATCH3_TERMS } from "./glossary-batch-3-machinery";

export const EXTRA_TERMS = [...BATCH1_TERMS, ...BATCH2_TERMS, ...BATCH3_TERMS];
