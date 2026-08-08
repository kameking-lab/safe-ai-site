#!/usr/bin/env node
/**
 * Legacy stage name retained for workflow compatibility.
 *
 * Safety policy (2026-07-23):
 * - RSS headlines, publishers and URLs are not sent to an external model.
 * - The deterministic negative-keyword prefilter may reject obvious noise.
 * - Every remaining candidate is placed in pending with human review required.
 * - This stage never promotes an item to approved.
 * - Errors are logged only by coarse class; candidate text/provider bodies are
 *   never copied to logs or generated error fields.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prefilter } from "./news-feed-filters.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const CANDIDATES_PATH = path.join(__dirname, "data", "news-feed-candidates.json");
const REJECTED_PATH = path.join(
  REPO_ROOT,
  "web",
  "src",
  "data",
  "news-feed",
  "rejected",
  "index.json",
);
const PENDING_PATH = path.join(
  REPO_ROOT,
  "web",
  "src",
  "data",
  "news-feed",
  "pending",
  "index.json",
);
const REJECTED_CAP = 500;
const PENDING_CAP = 200;

async function readJsonOrDefault(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    if (error && error.code === "ENOENT") return fallback;
    throw error;
  }
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function nowIso() {
  return new Date().toISOString();
}

function dedupeAndSort(entries, cap) {
  const unique = new Map();
  for (const entry of entries) {
    if (entry && typeof entry.id === "string" && !unique.has(entry.id)) {
      unique.set(entry.id, entry);
    }
  }
  return [...unique.values()]
    .sort((a, b) =>
      String(b?.source?.publishedAt ?? b?.score?.judgedAt ?? "").localeCompare(
        String(a?.source?.publishedAt ?? a?.score?.judgedAt ?? ""),
      ),
    )
    .slice(0, cap);
}

async function main() {
  const candidatesFile = await readJsonOrDefault(CANDIDATES_PATH, null);
  if (!candidatesFile || !Array.isArray(candidatesFile.candidates)) {
    console.log("[news-review-gate] no candidate dataset; no changes");
    return;
  }
  const rejected = await readJsonOrDefault(REJECTED_PATH, {
    updatedAt: "1970-01-01T00:00:00.000Z",
    entries: [],
  });
  const pending = await readJsonOrDefault(PENDING_PATH, {
    updatedAt: "1970-01-01T00:00:00.000Z",
    entries: [],
  });

  let rejectedAdded = 0;
  let pendingAdded = 0;
  for (const candidate of candidatesFile.candidates) {
    if (
      !candidate ||
      typeof candidate.id !== "string" ||
      typeof candidate.headline !== "string" ||
      !candidate.source ||
      typeof candidate.source.url !== "string"
    ) {
      rejectedAdded += 1;
      continue;
    }
    const filtered = prefilter(candidate.headline);
    if (filtered.blocked) {
      rejected.entries.unshift({
        id: candidate.id,
        headline: candidate.headline,
        aiSummary: "",
        source: candidate.source,
        score: {
          relevance: 0,
          copyrightRisk: 100,
          misinformationRisk: 100,
          duplication: 0,
          judgedAt: nowIso(),
          model: "deterministic-prefilter",
          rejectionReasons: [`prefilter:${filtered.tag}`],
        },
        approved: false,
        humanReviewRequired: true,
        provenance: "news_auto",
      });
      rejectedAdded += 1;
      continue;
    }

    pending.entries.unshift({
      id: candidate.id,
      headline: candidate.headline,
      aiSummary: "",
      source: candidate.source,
      score: {
        relevance: 0,
        copyrightRisk: 100,
        misinformationRisk: 100,
        duplication: 0,
        judgedAt: nowIso(),
        model: "human-review-required",
        rejectionReasons: ["human_review_required"],
      },
      approved: false,
      humanReviewed: false,
      humanReviewRequired: true,
      provenance: "news_auto",
    });
    pendingAdded += 1;
  }

  const updatedAt = nowIso();
  rejected.updatedAt = updatedAt;
  rejected.entries = dedupeAndSort(rejected.entries, REJECTED_CAP);
  pending.updatedAt = updatedAt;
  pending.entries = dedupeAndSort(pending.entries, PENDING_CAP);
  await writeJson(REJECTED_PATH, rejected);
  await writeJson(PENDING_PATH, pending);
  console.log(
    `[news-review-gate] pending+${pendingAdded} rejected+${rejectedAdded}; externalAI=0 approved=0`,
  );
}

main().catch((error) => {
  console.error("[news-review-gate] failed", {
    kind: error instanceof Error ? error.name : "unknown",
  });
  process.exit(1);
});
