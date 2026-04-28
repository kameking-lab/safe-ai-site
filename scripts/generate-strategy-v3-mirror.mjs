import { readFileSync, writeFileSync } from "node:fs";

const md = readFileSync("docs/monetization-strategy-v3-2026-04-26.md", "utf8");

const escaped = md
  .replace(/\\/g, "\\\\")
  .replace(/`/g, "\\`")
  .replace(/\$\{/g, "\\${");

const out =
  "// AUTO-GENERATED MIRROR of docs/monetization-strategy-v3-2026-04-26.md\n" +
  "// Update both files together if editing.\n" +
  "export const monetizationStrategyV3 = `" +
  escaped +
  "`;\n";

writeFileSync("web/src/data/strategy/monetization-v3-2026-04-26.ts", out);
console.log("wrote", out.length, "bytes");
