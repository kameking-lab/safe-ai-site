export type GlossaryTerm = {
  term: string;
  reading: string;
  definition: string;
  relatedPages?: Array<{ href: string; label: string }>;
};
