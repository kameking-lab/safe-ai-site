import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = join(here, "..", "..");
const dataDir = join(webRoot, "src", "data", "ai-seminars");
const publicDir = join(webRoot, "public", "training", "ai-seminars", "ai-chat-work");
const training = readJson("ai-chat-work.json");
const claims = readJson("claims.json");
const sources = readJson("source-registry.json");
const quiz = readJson("quiz.json");
const promptTemplate = readJson("prompt-template.json");

function readJson(name) {
  return JSON.parse(readFileSync(join(dataDir, name), "utf8"));
}

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

invariant(training.slideCount === 20 && training.slides.length === 20, "slide count must be 20");
invariant(training.exercises.length === 3, "exercise count must be 3");
invariant(quiz.questions.length === 5, "quiz count must be 5");
invariant(promptTemplate.caseTemplates.length === 5, "case template count must be 5");
invariant(training.boundary.includes("資格・認定講座ではなく"), "training boundary missing");

const caseSlides = training.slides.filter((slide) => /^ケース[1-5]$/u.test(slide.label));
invariant(caseSlides.length === 5, `practical case slide count must be 5: ${caseSlides.length}`);
for (const slide of caseSlides) {
  const content = [slide.message, ...slide.body].join("\n");
  invariant(/(?:悪い|危険な)依頼/u.test(content), `${slide.id} is missing the unsafe/vague request`);
  invariant(/(?:改善プロンプト|安全な書換え)/u.test(content), `${slide.id} is missing the improved request`);
  invariant(content.includes("出力例"), `${slide.id} is missing the output example`);
  invariant(content.includes("人の確認"), `${slide.id} is missing the human check`);
}

const narrationChars = training.slides.reduce((total, slide) => total + slide.narration.length, 0);
const estimatedNarrationSeconds = training.slides.reduce((total, slide) => total + slide.estimatedSeconds, 0);
invariant(narrationChars >= 10_000 && narrationChars <= 10_800, `narration characters outside 10,000-10,800: ${narrationChars}`);
invariant(estimatedNarrationSeconds >= 35 * 60 && estimatedNarrationSeconds <= 37 * 60, `estimated narration outside 35-37 minutes: ${estimatedNarrationSeconds}`);
for (const slide of training.slides) {
  invariant(slide.narration.length > slide.message.length, `short transcript: ${slide.id}`);
  invariant(slide.estimatedSeconds >= 60 && slide.estimatedSeconds <= 150, `slide estimate outside 60-150 seconds: ${slide.id}`);
}

const claimById = new Map(claims.map((claim) => [claim.claimId, claim]));
const sourceById = new Map(sources.map((source) => [source.sourceId, source]));
invariant(claimById.size === claims.length, "duplicate claim ID");
invariant(sourceById.size === sources.length, "duplicate source ID");
for (const source of sources) {
  invariant(/^sha256-id-v1:[a-f0-9]{64}$/u.test(source.checksum), `bad checksum: ${source.sourceId}`);
  invariant(source.checkedAt <= training.asOf, `source checked after training asOf: ${source.sourceId}`);
  for (const claimId of source.claimIds) {
    const claim = claimById.get(claimId);
    invariant(claim, `missing claim: ${source.sourceId} -> ${claimId}`);
    invariant(claim.sourceIds.includes(source.sourceId), `missing claim reverse link: ${source.sourceId} -> ${claimId}`);
  }
}
for (const claim of claims) {
  invariant(claim.sourceIds.length > 0, `unsupported claim: ${claim.claimId}`);
  for (const sourceId of claim.sourceIds) {
    const source = sourceById.get(sourceId);
    invariant(source, `missing source: ${claim.claimId} -> ${sourceId}`);
    invariant(source.claimIds.includes(claim.claimId), `missing source reverse link: ${claim.claimId} -> ${sourceId}`);
  }
}
for (const slide of training.slides) {
  for (const claimId of slide.claimIds) invariant(claimById.has(claimId), `missing claim: ${slide.id} -> ${claimId}`);
}

let audioSeconds = 0;
for (const slide of training.slides) {
  const path = join(publicDir, "audio", `slide-${String(slide.number).padStart(2, "0")}.mp3`);
  invariant(existsSync(path), `missing audio: ${path}`);
  invariant(statSync(path).size > 100_000, `small audio: ${path}`);
  const duration = Number(execFileSync("ffprobe", [
    "-v", "error", "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1", path,
  ], { encoding: "utf8" }).trim());
  invariant(Number.isFinite(duration) && duration > 30, `invalid duration: ${path}`);
  audioSeconds += duration;
}
invariant(audioSeconds >= 30 * 60 && audioSeconds <= 40 * 60, `audio total outside 30-40 minutes: ${audioSeconds}`);

const downloads = join(publicDir, "downloads");
const artifactPages = new Map([
  ["ai-chat-work-training.pdf", 20],
  ["ai-chat-work-instructor-script.pdf", 8],
  ["ai-chat-work-handout.pdf", 1],
  ["ai-chat-work-prompt-template.pdf", 2],
  ["ai-chat-work-quiz-and-answers.pdf", 2],
  ["ai-chat-work-sources.pdf", 2],
]);
const pptxPath = join(downloads, "ai-chat-work-training.pptx");
invariant(existsSync(pptxPath) && statSync(pptxPath).size > 100_000, "PPTX missing or too small");
invariant(readFileSync(pptxPath).subarray(0, 2).toString("ascii") === "PK", "PPTX is not a valid ZIP package");
const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
for (const [name, expectedPages] of artifactPages) {
  const path = join(downloads, name);
  invariant(existsSync(path) && statSync(path).size > 20_000, `PDF missing or too small: ${name}`);
  const pdf = await getDocument({ data: new Uint8Array(readFileSync(path)) }).promise;
  invariant(pdf.numPages === expectedPages, `${name} page count mismatch: ${pdf.numPages}`);
}

console.log(JSON.stringify({
  status: "pass",
  slides: training.slides.length,
  practicalCases: caseSlides.length,
  exercises: training.exercises.length,
  promptTemplates: promptTemplate.caseTemplates.length,
  quizQuestions: quiz.questions.length,
  claims: claims.length,
  sources: sources.length,
  audioFiles: training.slides.length,
  audioSeconds: Number(audioSeconds.toFixed(1)),
  audioMinutes: Number((audioSeconds / 60).toFixed(1)),
  narrationChars,
  estimatedNarrationSeconds,
  artifacts: artifactPages.size + 1,
}, null, 2));
