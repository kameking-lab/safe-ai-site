#!/usr/bin/env node
// Detect within-law duplicate articleNum entries across all law data files.
// A duplicate signals either:
//  - two entries for the same article (data integrity bug)
//  - one entry mis-numbered (citation accuracy bug)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");
const lawsDir = path.join(repoRoot, "web/src/data/laws");

const dupes = [];
for (const f of fs.readdirSync(lawsDir).filter((n) => n.endsWith(".ts"))) {
  const text = fs.readFileSync(path.join(lawsDir, f), "utf8");
  // Track per-(lawShort, articleNum) within file.
  const seen = new Map();
  let curLaw = null;
  let curArt = null;
  let curTitle = null;
  const re = /lawShort:\s*"([^"]+)"|articleNum:\s*"(第\d+条(?:の\d+)?(?:第\d+項)?(?:第\d+号)?)"|articleTitle:\s*"([^"]*)"/g;
  let m;
  let pendingLaw = null;
  let pendingArt = null;
  while ((m = re.exec(text)) !== null) {
    if (m[1]) {
      // lawShort signals start of an entry
      // If a pending entry is incomplete, ignore.
      pendingLaw = m[1];
      pendingArt = null;
    } else if (m[2]) {
      pendingArt = m[2];
    } else if (m[3] !== undefined) {
      if (pendingLaw && pendingArt) {
        const key = `${pendingLaw}::${pendingArt}`;
        const prev = seen.get(key);
        if (prev) {
          dupes.push({
            file: path.relative(repoRoot, path.join(lawsDir, f)).replaceAll("\\", "/"),
            law: pendingLaw,
            articleNum: pendingArt,
            firstTitle: prev,
            secondTitle: m[3],
          });
        } else {
          seen.set(key, m[3]);
        }
      }
      pendingLaw = null;
      pendingArt = null;
    }
  }
}

console.log(`Duplicate (law, articleNum) entries: ${dupes.length}`);
for (const d of dupes) console.log(`  ${d.file} :: ${d.law} ${d.articleNum} -- "${d.firstTitle}" vs "${d.secondTitle}"`);
fs.writeFileSync(path.join(here, "duplicates.json"), JSON.stringify(dupes, null, 2), "utf8");
