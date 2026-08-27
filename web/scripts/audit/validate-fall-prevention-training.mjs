import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = join(here, "..", "..");
const dataDir = join(webRoot, "src", "data", "safety-seminars");
const publicDir = join(webRoot, "public", "training", "safety-seminars", "fall-prevention");
const training = JSON.parse(readFileSync(join(dataDir, "fall-prevention.json"), "utf8"));
const claims = JSON.parse(readFileSync(join(dataDir, "claims.json"), "utf8"));
const sources = JSON.parse(readFileSync(join(dataDir, "source-registry.json"), "utf8"));
const quiz = JSON.parse(readFileSync(join(dataDir, "quiz.json"), "utf8"));

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

invariant(training.slides.length === 20, "slide count must be 20");
invariant(quiz.questions.length === 5, "quiz count must be 5");
invariant(training.boundary.includes("法定の特別教育等を代替するものではありません"), "training boundary missing");

const claimById = new Map(claims.map((claim) => [claim.claimId, claim]));
const sourceById = new Map(sources.map((source) => [source.sourceId, source]));
invariant(claimById.size === claims.length, "duplicate claim ID");
invariant(sourceById.size === sources.length, "duplicate source ID");

const numericStatisticsSourceIds = [
  "STAT-H28-FINAL-XLS", "STAT-H29-FINAL-XLS", "STAT-R1-FINAL-XLSX",
  "STAT-R3-FINAL-XLSX", "STAT-R4-FINAL-XLSX", "STAT-R6-FINAL-XLSX",
  "STAT-R7-FINAL-PDF", "STAT-R7-FINAL-XLSX", "STAT-R7-INJURY-ANALYSIS",
];

for (const source of sources) {
  invariant(/^sha256:[a-f0-9]{64}$/u.test(source.checksum), `bad checksum: ${source.sourceId}`);
  invariant(source.checkedAt.startsWith("2026-08-27"), `bad checkedAt: ${source.sourceId}`);
  for (const claimId of source.claimIds) {
    const claim = claimById.get(claimId);
    invariant(claim, `missing claim: ${source.sourceId} -> ${claimId}`);
    invariant(claim.sourceIds.includes(source.sourceId), `missing claim reverse link: ${source.sourceId} -> ${claimId}`);
  }
}
for (const sourceId of numericStatisticsSourceIds) {
  const locator = sourceById.get(sourceId)?.locator ?? "";
  for (const field of ["対象年", "全国", "確定", "単位: 人", "分母: なし", "COVID-19"]) {
    invariant(locator.includes(field), `missing ${field} in numeric source metadata: ${sourceId}`);
  }
}
for (const claim of claims) {
  invariant(claim.sourceIds.length > 0, `unreferenced claim: ${claim.claimId}`);
  for (const sourceId of claim.sourceIds) {
    const source = sourceById.get(sourceId);
    invariant(source, `missing source: ${claim.claimId} -> ${sourceId}`);
    invariant(source.claimIds.includes(claim.claimId), `missing source reverse link: ${claim.claimId} -> ${sourceId}`);
  }
}
for (const slide of training.slides) {
  invariant(slide.narration.length > slide.message.length, `short transcript: ${slide.id}`);
  for (const claimId of slide.claimIds) invariant(claimById.has(claimId), `missing claim: ${slide.id} -> ${claimId}`);
}

invariant(claimById.get("CLM-STAT-001").statement.includes("135,333"), "all-industry injury mismatch");
invariant(claimById.get("CLM-STAT-003").statement.includes("4,343"), "construction fall injury mismatch");
invariant(
  JSON.stringify(claimById.get("CLM-STAT-004").sourceIds) === JSON.stringify([
    "STAT-H28-FINAL-XLS", "STAT-H29-FINAL-XLS", "STAT-R1-FINAL-XLSX",
    "STAT-R3-FINAL-XLSX", "STAT-R4-FINAL-XLSX", "STAT-R6-FINAL-XLSX",
    "STAT-R7-FINAL-PDF", "STAT-R7-FINAL-XLSX",
  ]),
  "ten-year trend source registry mismatch",
);
invariant(sourceById.get("STAT-R7-FINAL-PDF").finalOrPreliminary === "final", "2025 source is not final");
invariant(sourceById.get("STAT-R8-JULY-PRELIM").finalOrPreliminary === "preliminary", "2026 source is not preliminary");
invariant(sourceById.get("LAW-EGOV-003").updatedAt === "2026-08-01", "ordinance applicable revision mismatch");

let audioSeconds = 0;
for (const slide of training.slides) {
  const path = join(publicDir, "audio", `slide-${String(slide.number).padStart(2, "0")}.mp3`);
  invariant(existsSync(path), `missing audio: ${path}`);
  invariant(statSync(path).size > 100_000, `small audio: ${path}`);
  const duration = Number(
    execFileSync("ffprobe", [
      "-v", "error", "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1", path,
    ], { encoding: "utf8" }).trim(),
  );
  invariant(Number.isFinite(duration) && duration > 30, `invalid duration: ${path}`);
  audioSeconds += duration;
}
invariant(audioSeconds >= 35 * 60 && audioSeconds <= 50 * 60, `audio total outside 35-50 minutes: ${audioSeconds}`);

const artifacts = [
  "fall-prevention-training.pptx",
  "fall-prevention-training.pdf",
  "fall-prevention-instructor-script.pdf",
  "fall-prevention-handout.pdf",
  "fall-prevention-field-checklist.pdf",
  "fall-prevention-quiz-and-answers.pdf",
  "fall-prevention-sources.pdf",
];
const missingArtifacts = artifacts.filter((name) => !existsSync(join(publicDir, "downloads", name)));

if (!missingArtifacts.length) {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const trainingPdfPath = join(publicDir, "downloads", "fall-prevention-training.pdf");
  const trainingPdf = await getDocument({ data: new Uint8Array(readFileSync(trainingPdfPath)) }).promise;
  const trainingMetadata = await trainingPdf.getMetadata();
  invariant(trainingMetadata.info?.Title === training.title, "training PDF title metadata mismatch");
  const handoutPath = join(publicDir, "downloads", "fall-prevention-handout.pdf");
  const handout = await getDocument({ data: new Uint8Array(readFileSync(handoutPath)) }).promise;
  let handoutText = "";
  for (let pageNumber = 1; pageNumber <= handout.numPages; pageNumber += 1) {
    const page = await handout.getPage(pageNumber);
    const content = await page.getTextContent();
    handoutText += content.items.map((item) => ("str" in item ? item.str : "")).join("");
  }
  const expectedStatsSourceIds = [...new Set(
    ["CLM-STAT-002", "CLM-STAT-003", "CLM-STAT-009"]
      .flatMap((claimId) => claimById.get(claimId).sourceIds),
  )];
  const expectedStatsRefs = expectedStatsSourceIds
    .map((sourceId) => `[${sources.findIndex((source) => source.sourceId === sourceId) + 1}]`)
    .join("");
  invariant(
    handoutText.includes(expectedStatsRefs),
    `handout statistics source mismatch: expected ${expectedStatsRefs}`,
  );
}

console.log(JSON.stringify({
  status: missingArtifacts.length ? "content-valid-artifacts-pending" : "pass",
  slides: training.slides.length,
  claims: claims.length,
  sources: sources.length,
  quizQuestions: quiz.questions.length,
  audioFiles: training.slides.length,
  audioSeconds: Number(audioSeconds.toFixed(1)),
  audioMinutes: Number((audioSeconds / 60).toFixed(1)),
  missingArtifacts,
}, null, 2));

if (missingArtifacts.length) process.exitCode = 2;
