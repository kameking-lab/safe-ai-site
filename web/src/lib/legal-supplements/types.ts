export type XmlNode = {
  tag: string; attributes: Record<string, string>; text: string | null;
  tail: string | null; children: XmlNode[];
};
export type SupplementLaw = {
  lawId: string; lawShort: string; title: string; revisionId: string;
  retrievedAt: string; sourceUrl: string; xmlSha256: string;
};
export type SupplementDocument = {
  id: string; lawId: string; kind: "main" | "supplementary" | "appendix";
  path: string; label: string; text: string; articleNums: string[];
  hasFigures: boolean; hasTables: boolean; referenceSignals: string[]; node: XmlNode;
};
export type SupplementDataset = {
  schema: "safe-ai-supplement-rag/v1"; asOf: string;
  laws: SupplementLaw[]; documents: SupplementDocument[];
};
