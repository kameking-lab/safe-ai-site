// Reconfirm captured excerpts against live official text. This is not expert review.
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";
import ts from "typescript";
import { buildLaw } from "./egov-fulltext-fetch.ts";
import { lawResponseXml } from "./egov-law-response.ts";

const root = resolve(import.meta.dirname, "../..");
// Read only literal fields; do not execute the production module or its imports.
const verifiedPrimaryNoticeArticles = [];
for (const file of ["verified-primary-notices.ts", "verified-primary-electrical.ts"]) {
  const source = ts.createSourceFile(file, await readFile(resolve(root, "src/data/laws", file), "utf8"), ts.ScriptTarget.Latest, true);
  const visit = (node) => {
    if (ts.isObjectLiteralExpression(node)) {
      const fields = Object.fromEntries(node.properties.filter((property) => ts.isPropertyAssignment(property) && ts.isStringLiteral(property.initializer)).map((property) => [property.name.getText(source), property.initializer.text]));
      if (fields.sourceKind && fields.articleNum && fields.text) verifiedPrimaryNoticeArticles.push(fields);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
}
const evidenceDir = process.argv[2];
if (!evidenceDir) throw new Error("Provide a directory for raw verification evidence");
await mkdir(evidenceDir, { recursive: true });
const normalize = (text) => text.normalize("NFKC").replace(/\s/g, "");
const sha256 = (text) => createHash("sha256").update(text).digest("hex");
const responses = new Map();
const records = [];
const unconfirmed = [];
for (const article of verifiedPrimaryNoticeArticles) {
  // PDF summaries and the inaccessible METI Q&A are not promoted by this verifier.
  if (!article.sourceUrl || article.sourceUrl.endsWith(".pdf")) {
    unconfirmed.push({ lawShort: article.lawShort, articleNum: article.articleNum, reason: "PDF text not independently compared" });
    continue;
  }
  const sourceUrl = article.sourceLawId
    ? `https://laws.e-gov.go.jp/api/2/law_data/${article.sourceLawId}`
    : article.sourceUrl;
  if (!responses.has(sourceUrl)) {
    const response = await fetch(sourceUrl, { headers: { Accept: "application/json,text/html" }, signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`Official fetch failed: HTTP ${response.status}; ledger unchanged`);
    const raw = await response.text();
    responses.set(sourceUrl, raw);
    await writeFile(resolve(evidenceDir, `primary-${article.sourceLawId ?? new URL(sourceUrl).searchParams.get("dataId")}.txt`), raw);
  }
  const raw = responses.get(sourceUrl);
  let scope;
  let revisionId = article.sourceRevisionId ?? null;
  if (article.sourceLawId) {
    const metadata = JSON.parse(raw);
    if (metadata.law_info?.law_id !== article.sourceLawId || metadata.revision_info?.current_revision_status !== "CurrentEnforced" || metadata.revision_info?.law_revision_id !== article.sourceRevisionId) {
      throw new Error(`${article.lawShort}: official current revision mismatch; ledger unchanged`);
    }
    const law = buildLaw(article.sourceLawId, lawResponseXml(raw, article.sourceLawId));
    const official = law.articles.find((row) => row.articleNum === article.articleNum);
    if (!official || normalize(official.text) !== normalize(article.text)) throw new Error(`${article.lawShort} ${article.articleNum}: text mismatch; ledger unchanged`);
    scope = "CurrentEnforced-excerpt-match";
  } else {
    const doc = new JSDOM(raw).window.document;
    const published = normalize(doc.body.textContent ?? "").replaceAll("科目範囲時間", "");
    if (!published.includes(normalize(article.text))) throw new Error(`${article.lawShort} ${article.articleNum}: published text mismatch; ledger unchanged`);
    scope = "official-publication-excerpt-match";
  }
  if (sha256(article.text) !== article.sourceHash) throw new Error(`${article.lawShort}: excerpt hash mismatch; ledger unchanged`);
  records.push({ lawShort: article.lawShort, articleNum: article.articleNum, sourceUrl: article.sourceUrl, sourceHash: article.sourceHash, revisionId, checkedAt: new Date().toISOString(), scope, responseSha256: sha256(raw) });
}
// The 563 supplement restores Subitem2 text omitted by the older flattening
// parser. Verify both the base article and the nested official text separately.
const scaffoldSource = ts.createSourceFile("verified-primary-scaffold.ts", await readFile(resolve(root, "src/data/laws/verified-primary-scaffold.ts"), "utf8"), ts.ScriptTarget.Latest, true);
const scaffoldConstants = new Map();
const collectConstants = (node) => {
  if (ts.isVariableDeclaration(node) && node.initializer && ts.isStringLiteral(node.initializer)) scaffoldConstants.set(node.name.getText(scaffoldSource), node.initializer.text);
  ts.forEachChild(node, collectConstants);
};
collectConstants(scaffoldSource);
const lawId = "347M50002000032";
const response = await fetch(`https://laws.e-gov.go.jp/api/2/law_data/${lawId}`, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(30_000) });
if (!response.ok) throw new Error(`Scaffold official fetch failed: HTTP ${response.status}; ledger unchanged`);
const raw = await response.text();
const payload = JSON.parse(raw);
const revisionId = scaffoldConstants.get("FRAME_SCAFFOLD_SOURCE_REVISION_ID");
if (payload.law_info?.law_id !== lawId || payload.revision_info?.current_revision_status !== "CurrentEnforced" || payload.revision_info?.law_revision_id !== `${lawId}_${revisionId}`) throw new Error("Scaffold current revision mismatch; ledger unchanged");
const findNode = (node, predicate) => {
  if (!node || typeof node !== "object") return null;
  if (predicate(node)) return node;
  for (const child of node.children ?? []) {
    const found = findNode(child, predicate);
    if (found) return found;
  }
  return null;
};
const mainProvision = findNode(payload.law_full_text, (node) => node.tag === "MainProvision");
const official563 = findNode(mainProvision, (node) => node.tag === "Article" && node.attr?.Num === "563");
const textOf = (node) => typeof node === "string" ? node : (node.children ?? []).map(textOf).join("");
const subitems = [];
const collectSubitems = (node) => {
  if (!node || typeof node !== "object") return;
  if (node.tag === "Subitem2") subitems.push(textOf(node));
  else for (const child of node.children ?? []) collectSubitems(child);
};
collectSubitems(official563);
if (normalize(subitems.join("")) !== normalize(scaffoldConstants.get("FRAME_SCAFFOLD_OFFICIAL_SUBITEMS") ?? "")) throw new Error("Scaffold nested official text mismatch; ledger unchanged");
const snapshot = JSON.parse(await readFile(resolve(root, `src/data/laws-fulltext/${lawId}.json`), "utf8"));
const base563 = snapshot.articles.find((row) => row.articleNum === "第563条");
const live563 = buildLaw(lawId, lawResponseXml(raw, lawId)).articles.find((row) => row.articleNum === "第563条");
if (!base563 || !live563 || base563.text !== live563.text) throw new Error("Scaffold base article mismatch; ledger unchanged");
const anchor = scaffoldConstants.get("FRAME_SCAFFOLD_SUBITEM_ANCHOR");
const text = base563.text.replace(anchor, `${anchor}${scaffoldConstants.get("FRAME_SCAFFOLD_OFFICIAL_SUBITEMS")}`);
const sourceHash = scaffoldConstants.get("FRAME_SCAFFOLD_OFFICIAL_TEXT_SHA256");
if (sha256(text) !== sourceHash) throw new Error("Scaffold restored excerpt hash mismatch; ledger unchanged");
await writeFile(resolve(evidenceDir, `primary-${lawId}.json`), raw);
records.push({ lawShort: "安衛則", articleNum: "第563条", sourceUrl: `https://laws.e-gov.go.jp/law/${lawId}`, sourceHash, revisionId, checkedAt: new Date().toISOString(), scope: "CurrentEnforced-base-and-subitem-match", responseSha256: sha256(raw) });
await writeFile(resolve(root, "src/data/laws/primary-current-verification.json"), JSON.stringify({ schemaVersion: 1, records, unconfirmed }, null, 2) + "\n");
console.log(JSON.stringify({ verified: records.length, unconfirmed }));
