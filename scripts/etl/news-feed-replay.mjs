#!/usr/bin/env node
/**
 * Offline replay of the improved judge logic against existing entries.
 *
 * This does NOT call Gemini. It reads the existing approved + rejected JSON,
 * heuristically infers newsType from the headline (mirroring what the prompt
 * now asks the model to do), re-applies prefilter + per-type thresholds, and
 * reports outcome deltas.
 *
 * Purpose: verify that the new logic resolves the two systematic problems the
 * 2026-05-17 audit identified, without burning Gemini calls in CI.
 *
 * Limits:
 *  - Heuristic newsType inference is coarse — a true backfill requires re-
 *    judging with Gemini. Treat the numbers here as directional, not exact.
 *  - Existing scores were produced by the OLD prompt, so `duplication` for an
 *    admin notice may still be high (because the old prompt asked the model to
 *    score duplication uniformly). The replay shows what the NEW threshold
 *    logic would do with the OLD scores — which is the worst-case improvement
 *    floor. Re-judging with the NEW prompt should produce equal-or-better.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prefilter, classifyOutcome } from "./news-feed-filters.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const APPROVED_PATH = path.join(REPO_ROOT, "web", "src", "data", "news-feed", "approved", "index.json");
const REJECTED_PATH = path.join(REPO_ROOT, "web", "src", "data", "news-feed", "rejected", "index.json");

/**
 * Coarse heuristic to infer newsType from the headline alone — mirrors the
 * categories the new prompt asks the model to choose from.
 */
function inferNewsType(headline) {
  const h = headline || "";
  if (/開催案内|開催します|協議会|分科会|検討会|審査会|公示|告示|改正|施行|案内/.test(h)) {
    return "administrative_notice";
  }
  if (/統計|調査結果|公表|白書|発生状況/.test(h)) {
    return "statistics_release";
  }
  if (/死亡|重傷|軽傷|負傷|事故|墜落|転落|崩壊|爆発|火災|感電|はさまれ|巻き込まれ/.test(h)) {
    return "accident_report";
  }
  return "general_news";
}

async function readJsonOrDefault(p, fallback) {
  try {
    return JSON.parse(await fs.readFile(p, "utf8"));
  } catch (err) {
    if (err && err.code === "ENOENT") return fallback;
    throw err;
  }
}

function classify(entry) {
  const pf = prefilter(entry.headline || "");
  if (pf.blocked) return { outcome: "rejected", reasons: [`prefilter:${pf.tag}`], newsType: "general_news" };
  const newsType = inferNewsType(entry.headline || "");
  const scores = {
    relevance: entry.score?.relevance ?? 0,
    copyrightRisk: entry.score?.copyrightRisk ?? 100,
    misinformationRisk: entry.score?.misinformationRisk ?? 100,
    duplication: entry.score?.duplication ?? 0,
  };
  const { outcome, reasons } = classifyOutcome(scores, newsType);
  return { outcome, reasons, newsType };
}

async function main() {
  const approved = (await readJsonOrDefault(APPROVED_PATH, { entries: [] })).entries ?? [];
  const rejected = (await readJsonOrDefault(REJECTED_PATH, { entries: [] })).entries ?? [];

  let originallyApproved = approved.length;
  let originallyRejected = rejected.length;
  let stillApproved = 0;
  let nowPending = 0;
  let nowRejected = 0;
  let wasRejected_nowApproved = 0;
  let wasRejected_nowPending = 0;
  let stillRejected = 0;

  console.log("\n=== REPLAY: approved entries ===");
  for (const e of approved) {
    const r = classify(e);
    if (r.outcome === "approved") stillApproved += 1;
    else if (r.outcome === "pending") nowPending += 1;
    else nowRejected += 1;
    console.log(`[${r.outcome}] (${r.newsType}) ${e.headline}`);
    if (r.outcome !== "approved") {
      console.log(`    -> ${r.reasons.join(" | ")}`);
    }
  }

  console.log("\n=== REPLAY: rejected entries ===");
  for (const e of rejected) {
    const r = classify(e);
    if (r.outcome === "approved") wasRejected_nowApproved += 1;
    else if (r.outcome === "pending") wasRejected_nowPending += 1;
    else stillRejected += 1;
    console.log(`[${r.outcome}] (${r.newsType}) ${e.headline}`);
    if (r.outcome !== "rejected") {
      console.log(`    -> recovered from rejection`);
    }
  }

  const newApprovedTotal = stillApproved + wasRejected_nowApproved;
  const newPendingTotal = nowPending + wasRejected_nowPending;
  const newRejectedTotal = nowRejected + stillRejected;
  const total = newApprovedTotal + newPendingTotal + newRejectedTotal;

  console.log("\n=== SUMMARY ===");
  console.log(`Original: approved=${originallyApproved} rejected=${originallyRejected}`);
  console.log(`Replayed: approved=${newApprovedTotal} pending=${newPendingTotal} rejected=${newRejectedTotal}`);
  console.log(`Originally-approved → still approved: ${stillApproved}`);
  console.log(`Originally-approved → demoted to pending: ${nowPending}`);
  console.log(`Originally-approved → demoted to rejected: ${nowRejected}`);
  console.log(`Originally-rejected → promoted to approved: ${wasRejected_nowApproved}`);
  console.log(`Originally-rejected → promoted to pending: ${wasRejected_nowPending}`);
  console.log(`Originally-rejected → still rejected: ${stillRejected}`);
  console.log(`New approval rate: ${((newApprovedTotal / total) * 100).toFixed(1)}%`);

  const oldFalseRejections = 2; // PR-time audit baseline: 2 false rejections (asbestos committees)
  const recovered = wasRejected_nowApproved + wasRejected_nowPending;
  console.log(
    `\nFalse-rejection recovery (audited baseline ${oldFalseRejections} entries): ${recovered} resolved`,
  );
}

main().catch((err) => {
  console.error("[news-feed-replay] fatal:", err);
  process.exit(1);
});
