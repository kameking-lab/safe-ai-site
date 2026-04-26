#!/usr/bin/env node
// Convert data/*.jsonl into web/src/data/*.ts modules.
// Single source of truth = JSONL. This script regenerates TS exports.

import { readFile, writeFile } from "node:fs/promises";

const tasks = [
  {
    src: "data/mhlw-notices.jsonl",
    dst: "web/src/data/mhlw-notices.ts",
    typeName: "MhlwNotice",
    exportName: "mhlwNotices",
    typeDef: `export type MhlwNoticeBindingLevel = "binding" | "indirect" | "reference";

export type MhlwNoticeDocType = "通達" | "告示" | "指針";

export type MhlwNotice = {
  id: string;
  title: string;
  issuedDate: string | null;
  issuedDateRaw: string | null;
  noticeNumber: string | null;
  issuer: string | null;
  bindingLevel: MhlwNoticeBindingLevel;
  sourceUrl: string;
  detailUrl: string;
  pdfUrl: string | null;
  category: string;
  docType: MhlwNoticeDocType;
  era?: string;
  lawRef?: string;
};
`,
  },
  {
    src: "data/mhlw-leaflets.jsonl",
    dst: "web/src/data/mhlw-leaflets.ts",
    typeName: "MhlwLeaflet",
    exportName: "mhlwLeaflets",
    typeDef: `export type MhlwLeaflet = {
  id: string;
  title: string;
  publisher: string;
  publishedDate: string | null;
  publishedDateRaw: string | null;
  target: string;
  category: string;
  categoryLabel: string;
  subCategory: string | null;
  languages: string[];
  sourceUrl: string;
  pdfUrl: string | null;
  detailUrl: string | null;
  pageCount: number | null;
};
`,
  },
];

async function main() {
  for (const t of tasks) {
    const raw = await readFile(t.src, "utf8");
    const lines = raw.split("\n").filter(Boolean);
    const items = lines.map((l) => JSON.parse(l));
    const banner =
      `// AUTO-GENERATED FROM ${t.src} — do not edit manually.\n` +
      `// Regenerate with: node scripts/jsonl-to-ts.mjs\n\n`;
    const body =
      `${banner}${t.typeDef}\nexport const ${t.exportName}: ${t.typeName}[] = ${JSON.stringify(items, null, 2)};\n`;
    await writeFile(t.dst, body, "utf8");
    console.log(`wrote ${items.length} → ${t.dst}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
