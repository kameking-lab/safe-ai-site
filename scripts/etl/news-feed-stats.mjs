#!/usr/bin/env node
/**
 * Compute audit statistics for the news-feed AI judge pipeline.
 *
 * Reads:
 *   web/src/data/news-feed/approved/index.json
 *   web/src/data/news-feed/rejected/index.json
 *
 * Writes:
 *   web/src/data/news-feed/stats.json
 *
 * Statistics produced
 * -------------------
 *   - counts: { approved, rejected, total, approvalRate }
 *   - byDay: [{ date, approved, rejected, approvalRate }]
 *   - byPublisher: [{ publisher, approved, rejected, approvalRate }]
 *   - byEstimatedWorkCategory: [{ category, approved, rejected }]
 *   - byEstimatedAccidentType: [{ type, approved, rejected }]
 *   - scoreHistograms.{relevance,copyrightRisk,misinformationRisk,duplication}:
 *       { buckets: ["0-9", "10-19", ...], approved: number[], rejected: number[] }
 *   - rejectionReasonRanks: [{ reason, count }]
 *   - samples: { approved: [first 10], rejected: [first 10] }
 *   - generatedAt: ISO
 *
 * Stats are dataset-level, not personal. Source URL is retained because it is
 * already public in the JSON files; no extra PII is added.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const APPROVED_PATH = path.join(REPO_ROOT, "web", "src", "data", "news-feed", "approved", "index.json");
const REJECTED_PATH = path.join(REPO_ROOT, "web", "src", "data", "news-feed", "rejected", "index.json");
const OUT_PATH = path.join(REPO_ROOT, "web", "src", "data", "news-feed", "stats.json");

const BUCKET_SIZE = 10;
const BUCKET_COUNT = 10; // 0-9 ... 90-100 (last bucket holds 90..=100)

async function readJsonOrDefault(p, fallback) {
  try {
    return JSON.parse(await fs.readFile(p, "utf8"));
  } catch (err) {
    if (err && err.code === "ENOENT") return fallback;
    throw err;
  }
}

function bucketIndex(score) {
  if (!Number.isFinite(score)) return -1;
  const idx = Math.min(BUCKET_COUNT - 1, Math.max(0, Math.floor(score / BUCKET_SIZE)));
  return idx;
}

function bucketLabel(i) {
  const lo = i * BUCKET_SIZE;
  const hi = i === BUCKET_COUNT - 1 ? 100 : lo + BUCKET_SIZE - 1;
  return `${lo}-${hi}`;
}

function emptyHistogram() {
  return {
    buckets: Array.from({ length: BUCKET_COUNT }, (_, i) => bucketLabel(i)),
    approved: Array.from({ length: BUCKET_COUNT }, () => 0),
    rejected: Array.from({ length: BUCKET_COUNT }, () => 0),
  };
}

function dayKey(entry) {
  const raw = entry?.score?.judgedAt ?? entry?.source?.fetchedAt;
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  // Bucket by JST date — the daily cron runs at 06:00 JST, so JST date is the
  // canonical operating day for the operator.
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}

function pushHist(hist, key, score) {
  const i = bucketIndex(score);
  if (i < 0) return;
  hist[key][i] += 1;
}

function summarisePair(approved, rejected) {
  const total = approved + rejected;
  return {
    approved,
    rejected,
    total,
    approvalRate: total === 0 ? 0 : Number((approved / total).toFixed(3)),
  };
}

function sortByApprovalRateDesc(rows) {
  return [...rows].sort((a, b) => {
    if (b.approvalRate !== a.approvalRate) return b.approvalRate - a.approvalRate;
    return b.total - a.total;
  });
}

async function main() {
  const approvedFile = await readJsonOrDefault(APPROVED_PATH, { entries: [] });
  const rejectedFile = await readJsonOrDefault(REJECTED_PATH, { entries: [] });
  const approvedEntries = approvedFile.entries ?? [];
  const rejectedEntries = rejectedFile.entries ?? [];

  const byDay = new Map(); // dayKey -> { approved, rejected }
  const byPublisher = new Map();
  const byWorkCategory = new Map();
  const byAccidentType = new Map();
  const histograms = {
    relevance: emptyHistogram(),
    copyrightRisk: emptyHistogram(),
    misinformationRisk: emptyHistogram(),
    duplication: emptyHistogram(),
  };
  const reasonCounts = new Map();

  function bumpMap(map, key) {
    if (!key) return;
    if (!map.has(key)) map.set(key, { approved: 0, rejected: 0 });
    return map.get(key);
  }

  for (const e of approvedEntries) {
    const day = dayKey(e);
    if (day) {
      const row = bumpMap(byDay, day);
      row.approved += 1;
    }
    const pub = e?.source?.publisher;
    if (pub) bumpMap(byPublisher, pub).approved += 1;
    if (e?.estimatedWorkCategory) bumpMap(byWorkCategory, e.estimatedWorkCategory).approved += 1;
    if (e?.estimatedAccidentType) bumpMap(byAccidentType, e.estimatedAccidentType).approved += 1;
    pushHist(histograms.relevance, "approved", e?.score?.relevance);
    pushHist(histograms.copyrightRisk, "approved", e?.score?.copyrightRisk);
    pushHist(histograms.misinformationRisk, "approved", e?.score?.misinformationRisk);
    pushHist(histograms.duplication, "approved", e?.score?.duplication);
  }
  for (const e of rejectedEntries) {
    const day = dayKey(e);
    if (day) {
      const row = bumpMap(byDay, day);
      row.rejected += 1;
    }
    const pub = e?.source?.publisher;
    if (pub) bumpMap(byPublisher, pub).rejected += 1;
    if (e?.estimatedWorkCategory) bumpMap(byWorkCategory, e.estimatedWorkCategory).rejected += 1;
    if (e?.estimatedAccidentType) bumpMap(byAccidentType, e.estimatedAccidentType).rejected += 1;
    pushHist(histograms.relevance, "rejected", e?.score?.relevance);
    pushHist(histograms.copyrightRisk, "rejected", e?.score?.copyrightRisk);
    pushHist(histograms.misinformationRisk, "rejected", e?.score?.misinformationRisk);
    pushHist(histograms.duplication, "rejected", e?.score?.duplication);
    for (const r of e?.score?.rejectionReasons ?? []) {
      // Collapse to the first " " block before the number so similar reasons
      // group together (e.g. "relevance ... < 70" all roll up to "relevance").
      const head = r.split(" ").slice(0, 1).join(" ");
      reasonCounts.set(head, (reasonCounts.get(head) ?? 0) + 1);
    }
  }

  const days = sortByApprovalRateDesc(
    Array.from(byDay, ([date, v]) => ({ date, ...summarisePair(v.approved, v.rejected) })),
  ).sort((a, b) => a.date.localeCompare(b.date));

  const publishers = sortByApprovalRateDesc(
    Array.from(byPublisher, ([publisher, v]) => ({
      publisher,
      ...summarisePair(v.approved, v.rejected),
    })),
  );

  const workCategories = sortByApprovalRateDesc(
    Array.from(byWorkCategory, ([category, v]) => ({
      category,
      ...summarisePair(v.approved, v.rejected),
    })),
  );

  const accidentTypes = sortByApprovalRateDesc(
    Array.from(byAccidentType, ([type, v]) => ({
      type,
      ...summarisePair(v.approved, v.rejected),
    })),
  );

  const rejectionReasonRanks = Array.from(reasonCounts, ([reason, count]) => ({
    reason,
    count,
  })).sort((a, b) => b.count - a.count);

  const samples = {
    approved: approvedEntries.slice(0, 10).map((e) => ({
      headline: e.headline,
      aiSummary: e.aiSummary,
      score: e.score,
      publisher: e?.source?.publisher,
    })),
    rejected: rejectedEntries.slice(0, 10).map((e) => ({
      headline: e.headline,
      aiSummary: e.aiSummary,
      score: e.score,
      publisher: e?.source?.publisher,
    })),
  };

  const out = {
    generatedAt: new Date().toISOString(),
    counts: summarisePair(approvedEntries.length, rejectedEntries.length),
    byDay: days,
    byPublisher: publishers,
    byEstimatedWorkCategory: workCategories,
    byEstimatedAccidentType: accidentTypes,
    scoreHistograms: histograms,
    rejectionReasonRanks,
    samples,
  };

  await fs.mkdir(path.dirname(OUT_PATH), { recursive: true });
  await fs.writeFile(OUT_PATH, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log(
    `[news-feed-stats] approved=${approvedEntries.length} rejected=${rejectedEntries.length} ` +
      `approvalRate=${out.counts.approvalRate} -> ${path.relative(REPO_ROOT, OUT_PATH)}`,
  );
}

main().catch((err) => {
  console.error("[news-feed-stats] fatal:", err);
  process.exit(1);
});
