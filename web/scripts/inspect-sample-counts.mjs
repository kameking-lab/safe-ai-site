import fs from "node:fs/promises";
async function tot(file) {
  const r = JSON.parse(await fs.readFile(file, "utf8"));
  const by = {};
  for (const run of r.runs) {
    for (const iss of run.issues) {
      by[iss.kind] ||= { affected: 0, samples: 0 };
      by[iss.kind].affected++;
      if ("count" in iss) by[iss.kind].samples += iss.count;
    }
  }
  return by;
}
const b = await tot("audit-out/audit-before.json");
const a = await tot("audit-out/audit-after.json");
const kinds = new Set([...Object.keys(b), ...Object.keys(a)]);
console.log("kind".padEnd(22), "before(pages,items)".padEnd(22), "after(pages,items)".padEnd(22), "delta_items");
for (const k of kinds) {
  const bv = b[k] || { affected: 0, samples: 0 };
  const av = a[k] || { affected: 0, samples: 0 };
  console.log(
    k.padEnd(22),
    `${bv.affected}/${bv.samples}`.padEnd(22),
    `${av.affected}/${av.samples}`.padEnd(22),
    av.samples - bv.samples
  );
}
