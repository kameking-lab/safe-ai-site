#!/usr/bin/env node

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const webRoot = process.cwd();
const repoRoot = resolve(webRoot, "..");
const evidenceRoot = process.env.BEST_IN_CLASS_EVIDENCE_ROOT
  ? resolve(process.env.BEST_IN_CLASS_EVIDENCE_ROOT)
  : resolve(
      repoRoot,
      "docs/audits/evidence/best-in-class-resume-2026-07-26/quality-gates",
    );
const full = process.argv.includes("--full");
const generatedAt = new Date().toISOString();

mkdirSync(evidenceRoot, { recursive: true });
const auditChildEnv = {
  ...process.env,
  CLIENT_BUNDLE_EMAIL_EVIDENCE_ROOT:
    process.env.CLIENT_BUNDLE_EMAIL_EVIDENCE_ROOT ??
    resolve(evidenceRoot, "privacy", "client-bundle-email"),
  SOURCE_SAFETY_EVIDENCE_ROOT:
    process.env.SOURCE_SAFETY_EVIDENCE_ROOT ??
    resolve(evidenceRoot, "privacy", "source-safety"),
  TRUST_BOUNDARY_EVIDENCE_ROOT:
    process.env.TRUST_BOUNDARY_EVIDENCE_ROOT ??
    resolve(evidenceRoot, "trust-boundaries"),
  KY_ZERO_FRICTION_EVIDENCE_ROOT:
    process.env.KY_ZERO_FRICTION_EVIDENCE_ROOT ??
    resolve(evidenceRoot, "ky-zero-friction"),
  SEARCH_QUALITY_REPORT_PATH:
    process.env.SEARCH_QUALITY_REPORT_PATH ??
    resolve(evidenceRoot, "search-quality-current.json"),
  RAG_100Q_REPORT_PATH:
    process.env.RAG_100Q_REPORT_PATH ??
    resolve(evidenceRoot, "chatbot-rag-100q-current.json"),
  RAG_100Q_FRESH_REPORT_PATH:
    process.env.RAG_100Q_FRESH_REPORT_PATH ??
    resolve(evidenceRoot, "chatbot-rag-100q-fresh-current.json"),
  LEGAL_RAG_EVALUATION_CSV_PATH:
    process.env.LEGAL_RAG_EVALUATION_CSV_PATH ??
    resolve(evidenceRoot, "legal-rag-evaluation.csv"),
  LEGAL_RAG_EVALUATION_SUMMARY_PATH:
    process.env.LEGAL_RAG_EVALUATION_SUMMARY_PATH ??
    resolve(evidenceRoot, "legal-rag-evaluation-summary.json"),
};

const suitesByGate = {
  "source-and-legal": [
    "src/data/source-registry.test.ts",
    "src/components/evidence/evidence-card.test.tsx",
    "src/data/laws/law-metadata-sync.test.ts",
    "src/data/laws/heat-notice-currency.test.ts",
    "src/data/laws/egov-verified-excerpts.test.ts",
    "src/data/laws/mhlw-extras-quarantine.test.ts",
    "src/data/law-navi/topics-integrity.test.ts",
    "src/lib/article-registry-pin-integrity.test.ts",
  ],
  "ai-emergency-pii-citations": [
    "src/app/api/chat/route.test.ts",
    "src/app/api/chatbot/route-safety.test.ts",
    "src/app/api/chatbot/stream/route-safety.test.ts",
    "src/app/api/pii-logging.test.ts",
    "src/app/api/ai-outbound-route-guards.test.ts",
    "src/lib/server/ai-outbound-safety.test.ts",
    "src/lib/client-bundle-email.test.ts",
    "src/lib/chatbot-citation-validator.test.ts",
    "src/lib/chatbot-safety.test.ts",
    "src/lib/chatbot-no-hit-response.test.ts",
    "src/lib/chatbot-genquality.test.ts",
    "src/lib/chatbot-genquality-scorer.test.ts",
    "src/lib/rag-100q.test.ts",
    "src/lib/rag-100q-fresh.test.ts",
    "src/lib/rag-100q.fixture-integrity.test.ts",
    "src/lib/rag-100q-fresh.fixture-integrity.test.ts",
    "src/lib/field-vernacular-bench.test.ts",
    "src/lib/chatbot-share-fragment.test.ts",
    "src/app/api/construction-calc/route.test.ts",
    "src/lib/ky/gemini-suggest.test.ts",
    "src/lib/ky-suggestion.test.ts",
  ],
  "chemical-fail-closed": [
    "src/lib/chemical/response-safety.test.ts",
    "src/lib/chemical/mixture-ra.test.ts",
    "src/lib/chemical/mixture-server-validation.test.ts",
    "src/lib/cross-search/chemical-detail-cas.test.ts",
    "src/lib/chemical/ra-cloud.test.ts",
    "src/app/api/chemical-ra/route.test.ts",
    "src/app/api/chemical/legal-profile/route.test.ts",
    "src/components/chemical/ra-conclusion.legal-badges.test.tsx",
    "src/lib/chemical/official-source-url.test.ts",
    "src/lib/chemical/create-simple-copy-policy.test.ts",
    "src/lib/chemical/accident-cross-search.test.ts",
  ],
  "qualification-boundaries": [
    "src/data/education-rules/licenses.test.ts",
    "src/data/education-rules/skill-training.test.ts",
    "src/data/education-rules/special-education.test.ts",
    "src/data/education-rules/job-chief.test.ts",
    "src/lib/education/qualification-context.test.ts",
    "src/lib/education/finder-conclusion.test.ts",
    "src/lib/education/qualification-finder-query.test.ts",
    "src/app/(main)/education-certification/finder/CertFinderClient.test.tsx",
    "src/app/(main)/education-certification/finder/qualification-finder-links.test.ts",
  ],
  "accident-provenance-relevance": [
    "src/lib/accidents/search-ranking.test.ts",
    "src/lib/accidents/ai-relevant.test.ts",
    "src/lib/accident-source.test.ts",
    "src/data/mock/accident-provenance-integrity.test.ts",
    "src/lib/accidents/education-pick.test.ts",
    "src/lib/accident-news/serious-cases.test.ts",
    "src/app/api/accidents/analyze/route.test.ts",
    "src/app/api/accidents/estat/route.test.ts",
    "src/app/api/mhlw/search/route.test.ts",
    "src/lib/seo/index-quality.test.ts",
  ],
  "weather-time-stale-failure": [
    "src/app/api/weather-risk/route.test.ts",
    "src/app/api/weather-forecast/route.test.ts",
    "src/components/risk/today-safety-panel.test.tsx",
    "src/lib/services/weather-risk-safety.test.ts",
    "src/lib/signage/weather-warning-panel-state.test.ts",
    "src/lib/jma/jma-data-trust.test.ts",
    "src/lib/jma/data-freshness.test.ts",
  ],
  "ky-meeting-approval": [
    "src/lib/ky/approval.test.ts",
    "src/lib/ky/paper-status.test.ts",
    "src/lib/ky/risk-source.test.ts",
    "src/lib/ky/deep-link-prefill.test.ts",
    "src/app/api/ky-assist/route.test.ts",
    "src/app/api/ky/signage/route.activation.test.ts",
    "src/lib/ky/storage-adapter.test.ts",
    "src/lib/meeting/document-state.test.ts",
    "src/lib/meeting/paper-status.test.ts",
    "src/components/meeting/meeting-print-sheet.test.tsx",
  ],
  "search-gold-and-safe-zero": [
    "src/lib/search-quality-evaluator.test.ts",
    "src/lib/search-safety-quality.test.ts",
    "src/lib/search-index.test.ts",
    "src/lib/equipment-catalog-quarantine.test.ts",
    "src/data/site-stats.test.ts",
  ],
  "privacy-shared-state-cache-csp": [
    "src/app/api/automation-consult/route.test.ts",
    "src/lib/automation-consult/state-store.test.ts",
    "src/lib/automation-consult/idempotency.test.ts",
    "src/lib/service-worker-privacy.test.ts",
    "src/lib/next-config-security.test.ts",
    "src/app/api/signage/pins/route.test.ts",
    "src/app/api/stripe/portal/route.test.ts",
    "src/components/signage-map/use-signage-pins.test.ts",
    "src/auth-privacy.test.ts",
    "src/lib/gsc-oauth-secret-output.test.ts",
    "src/lib/root-script-privacy.test.ts",
  ],
  "heat-illness-campaign": [
    "src/data/heat-illness-rules/legal-source.test.ts",
    "src/data/heat-illness-learning/integrity.test.ts",
    "src/data/heat-illness-campaign.test.ts",
    "src/data/industries-content/heat-illness-boundary.test.ts",
    "src/lib/heat-illness/campaign-season.test.ts",
    "src/components/heat-illness/heat-safety-special.test.tsx",
    "src/app/(main)/heat-illness-prevention/page.test.tsx",
    "src/app/(main)/heat-illness-prevention/slides/page.test.tsx",
    "src/app/(main)/heat-illness-prevention/elearning/page.test.tsx",
    "src/lib/signage/heat-special-state.test.ts",
    "src/components/signage/signage-heat-special.test.tsx",
    "src/components/ky-paper/heat-illness-ky-start.test.tsx",
    "src/lib/ky/deep-link-prefill.test.ts",
    "src/lib/automation-consult/prefill.test.ts",
    "src/app/(main)/services/automation/AutomationConsultForm.test.tsx",
    "src/app/(main)/services/automation/AutomationServiceContent.test.tsx",
    "src/components/automation/automation-entry-points.test.ts",
  ],
  "seo-indexability-structured-data": [
    "src/app/sitemap.test.ts",
    "src/app/sitemap-index.xml/route.test.ts",
    "src/app/sitemap-laws.xml/route.test.ts",
    "src/app/sitemap-circulars.xml/route.test.ts",
    "src/app/sitemap-chemicals.xml/route.test.ts",
    "src/app/sitemap-accidents.xml/route.test.ts",
    "src/app/sitemap-equipment.xml/route.test.ts",
    "src/app/sitemap-articles.xml/route.test.ts",
    "src/app/layout-metadata-single-source.test.ts",
    "src/app/(main)/articles/article-review-status.test.tsx",
    "src/app/(main)/articles/[slug]/heat-article-indexability.test.ts",
    "src/components/json-ld-security.test.tsx",
  ],
  "accessibility-contract": [
    "src/lib/global-accessibility-contract.test.ts",
    "src/components/app-shell-security-performance.test.ts",
    "src/lib/voice-permissions-policy.test.ts",
  ],
};

const uniqueCriticalSuites = [...new Set(Object.values(suitesByGate).flat())];
const nodeCommandName = process.execPath;
const tscCli = resolve(webRoot, "node_modules/typescript/bin/tsc");
const vitestCli = resolve(webRoot, "node_modules/vitest/vitest.mjs");
const eslintCli = resolve(webRoot, "node_modules/eslint/bin/eslint.js");
const nextCli = resolve(webRoot, "node_modules/next/dist/bin/next");
const playwrightCli = resolve(webRoot, "node_modules/playwright/cli.js");
const clientBundleEmailScan = resolve(
  webRoot,
  "scripts/audit/client-bundle-email-scan.mjs",
);
const sourceSafetyInventory = resolve(
  webRoot,
  "scripts/audit/source-safety-inventory.mjs",
);
const trustBoundaryInventory = resolve(
  webRoot,
  "scripts/audit/trust-boundary-inventory.mjs",
);
const kyZeroFrictionStaticGate = resolve(
  webRoot,
  "scripts/audit/ky-zero-friction-static-gate.mjs",
);

function stripAnsi(value) {
  return value.replaceAll(/\u001b\[[0-9;]*m/g, "");
}

function run(id, command, args, cwd = webRoot) {
  const startedAt = new Date().toISOString();
  const result = spawnSync(command, args, {
    cwd,
    env: auditChildEnv,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    windowsHide: true,
  });
  const stdout = stripAnsi(result.stdout ?? "");
  const stderr = stripAnsi(result.stderr ?? "");
  const exitCode = result.status ?? 1;
  const logPath = resolve(evidenceRoot, `${id}.log`);
  writeFileSync(
    logPath,
    [
      `startedAt=${startedAt}`,
      `finishedAt=${new Date().toISOString()}`,
      `command=${command} ${args.join(" ")}`,
      `exitCode=${exitCode}`,
      "",
      stdout,
      stderr,
    ].join("\n"),
    "utf8",
  );
  return {
    id,
    command: `${command} ${args.join(" ")}`,
    exitCode,
    passed: exitCode === 0,
    log: logPath,
    signal: result.signal ?? null,
    error: result.error?.message ?? null,
  };
}

function runNpm(id, args) {
  if (process.platform === "win32") {
    return run(id, process.env.ComSpec ?? "cmd.exe", [
      "/d",
      "/s",
      "/c",
      `npm ${args.join(" ")}`,
    ]);
  }
  return run(id, "npm", args);
}

const checks = [
  run("typescript", nodeCommandName, [tscCli, "--noEmit"]),
  run("git-diff-check", "git", ["diff", "--check"], repoRoot),
  run("source-safety-inventory", nodeCommandName, [sourceSafetyInventory]),
  run("ky-zero-friction-static-gate", nodeCommandName, [
    kyZeroFrictionStaticGate,
  ]),
];

if (full) {
  checks.push(
    run("eslint-full", nodeCommandName, [eslintCli, "."]),
    run("vitest-full", nodeCommandName, [vitestCli, "run"]),
    run("production-build", nodeCommandName, [nextCli, "build"]),
    run("client-bundle-email-scan", nodeCommandName, [clientBundleEmailScan]),
    run("trust-boundary-inventory", nodeCommandName, [
      trustBoundaryInventory,
    ]),
    run("playwright-full", nodeCommandName, [playwrightCli, "test"]),
    run("playwright-privacy", nodeCommandName, [
      playwrightCli,
      "test",
      "--config=playwright.privacy.config.ts",
    ]),
    runNpm("npm-audit-production", ["audit", "--omit=dev"]),
    runNpm("npm-audit-all", ["audit"]),
  );
} else {
  checks.splice(
    1,
    0,
    run("critical-vitest", nodeCommandName, [
      vitestCli,
      "run",
      ...uniqueCriticalSuites,
    ]),
  );
}

const failed = checks.filter((check) => !check.passed);
const report = {
  generatedAt,
  mode: full ? "full" : "critical",
  policy:
    "高リスクゲートが1件でも失敗した場合は、ローカルリリース可能・本番公開可能と判定しない。",
  suitesByGate,
  criticalSuiteCount: uniqueCriticalSuites.length,
  checks,
  passed: failed.length === 0,
  failedCheckIds: failed.map((check) => check.id),
};

const reportPath = resolve(evidenceRoot, "quality-gates-automated.json");
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
process.stdout.write(
  `${JSON.stringify(
    {
      reportPath,
      mode: report.mode,
      criticalSuiteCount: report.criticalSuiteCount,
      passed: report.passed,
      failedCheckIds: report.failedCheckIds,
    },
    null,
    2,
  )}\n`,
);

if (!report.passed) process.exitCode = 1;
