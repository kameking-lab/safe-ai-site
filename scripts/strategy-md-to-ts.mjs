// One-shot: mirror docs/monetization-strategy-2026-04-26.md into a TS string export
import fs from "node:fs";
const md = fs.readFileSync("docs/monetization-strategy-2026-04-26.md", "utf-8");
const escaped = md
  .replace(/\\/g, "\\\\")
  .replace(/`/g, "\\`")
  .replace(/\$\{/g, "\\${");
const ts =
  "// AUTO-GENERATED MIRROR of docs/monetization-strategy-2026-04-26.md\n" +
  "// Update both files together if editing.\n" +
  "export const monetizationStrategy20260426 = `" + escaped + "`;\n";
fs.writeFileSync("web/src/data/strategy/monetization-2026-04-26.ts", ts);
console.log("Wrote", ts.length, "bytes");
