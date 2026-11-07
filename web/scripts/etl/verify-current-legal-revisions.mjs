// Bind each captured corpus to e-Gov's CurrentEnforced revision; never refresh
// the corpus date or infer current law solely from a recent download.
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { buildLaw, runGates } from "./egov-fulltext-fetch.ts";
import { lawResponseXml } from "./egov-law-response.ts";

const root = resolve(import.meta.dirname, "../..");
const evidenceDir = process.argv[2];
if (!evidenceDir) throw new Error("Usage: node scripts/etl/verify-current-legal-revisions.mjs <raw-evidence-directory>");
await mkdir(evidenceDir, { recursive: true });
const records = [];
const mismatches = [];
for (const file of (await readdir(resolve(root, "src/data/laws-fulltext"))).filter((name) => /^[0-9A-Z]{15}\.json$/.test(name)).sort()) {
  const snapshot = JSON.parse(await readFile(resolve(root, "src/data/laws-fulltext", file), "utf8"));
  const lawId = snapshot.lawId;
  const sourceUrl = `https://laws.e-gov.go.jp/api/2/law_data/${lawId}`;
  const response = await fetch(sourceUrl, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`${lawId}: HTTP ${response.status}; verification ledger unchanged`);
  const raw = await response.text();
  const json = raw.trimStart().startsWith("{");
  const xmlField = (tag) => raw.match(new RegExp(`<${tag}>([^<]*)</${tag}>`))?.[1];
  const metadata = json ? JSON.parse(raw) : { law_info: { law_id: xmlField("law_id") }, revision_info: {
    law_revision_id: xmlField("law_revision_id"), current_revision_status: xmlField("current_revision_status"), amendment_enforcement_date: xmlField("amendment_enforcement_date"),
  } };
  const revision = metadata.revision_info;
  await writeFile(resolve(evidenceDir, `egov-${lawId}.${json ? "json" : "xml"}`), raw);
  if (metadata.law_info?.law_id !== lawId || revision?.law_revision_id !== `${lawId}_${snapshot.revisionId}` || revision?.current_revision_status !== "CurrentEnforced") {
    mismatches.push({ lawId, captured: snapshot.revisionId, official: revision?.law_revision_id ?? null, status: revision?.current_revision_status ?? null });
    continue;
  }
  const canonical = JSON.stringify(snapshot.articles.map(({ articleNum, caption, isDeleted, paragraphs, text, sortKey }) => ({ articleNum, caption, isDeleted, paragraphs, text, sortKey })));
  if (createHash("sha256").update(canonical).digest("hex") !== snapshot.sha256) throw new Error(`${lawId}: captured text hash mismatch; verification ledger unchanged`);
  const official = buildLaw(lawId, lawResponseXml(raw, lawId));
  const gateErrors = runGates(official, 9999);
  if (gateErrors.length) throw new Error(`${lawId}: official article import gates failed: ${gateErrors.join(", ")}`);
  if (official.sha256 !== snapshot.sha256) {
    mismatches.push({ lawId, capturedHash: snapshot.sha256, officialHash: official.sha256, reason: "official article text differs" });
    continue;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(revision.amendment_enforcement_date ?? "")) throw new Error(`${lawId}: invalid effective date`);
  records.push({ lawId, revisionId: snapshot.revisionId, snapshotHash: snapshot.sha256, checkedAt: new Date().toISOString(), effectiveOn: revision.amendment_enforcement_date, status: "CurrentEnforced", sourceUrl, responseSha256: createHash("sha256").update(raw).digest("hex") });
}
await writeFile(resolve(root, "src/data/laws/current-revision-verification.json"), JSON.stringify({ schemaVersion: 1, records }, null, 2) + "\n");
await writeFile(resolve(evidenceDir, "current-revision-mismatches.json"), JSON.stringify(mismatches, null, 2) + "\n");
console.log(JSON.stringify({ verified: records.length, mismatches }));
