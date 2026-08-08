#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const webRoot = process.cwd();
const evidenceRoot = resolve(
  process.env.KY_ZERO_FRICTION_EVIDENCE_ROOT ??
    "../docs/audits/evidence/ky-zero-friction-redesign-2026-08-01/full-gate/ky-static",
);
mkdirSync(evidenceRoot, { recursive: true });

const read = (path) => readFileSync(resolve(webRoot, path), "utf8");
const files = {
  builder: read("src/components/ky-paper/ky-zero-friction-builder.tsx"),
  voice: read("src/components/voice-input-field.tsx"),
  storage: read("src/lib/ky/local-registry.ts"),
  types: read("src/lib/ky/zero-friction-types.ts"),
  pdf: read("src/lib/ky/pdf-export.ts"),
  handoff: read("src/lib/ky/handoff.ts"),
  suggestions: read("src/lib/ky/verified-suggestions.ts"),
  weather: read("src/lib/ky/weather-prefill-v2.ts"),
  kyRedirect: read("src/app/(main)/ky/page.tsx"),
};

const checks = [];
const check = (id, passed, scope) => checks.push({ id, passed: Boolean(passed), scope });

check(
  "anonymous-draft-storage-is-local-only",
  /indexedDB\.open\(/u.test(files.storage) &&
    !/\b(?:fetch|sendBeacon|XMLHttpRequest)\s*\(/u.test(files.storage),
  "local-registry.ts",
);
check(
  "retention-is-31-days-and-bounded",
  /KY_RETENTION_DAYS\s*=\s*31/u.test(files.types) &&
    /KY_MAX_DRAFTS\s*=\s*40/u.test(files.types) &&
    /KY_MAX_MEMBERS\s*=\s*80/u.test(files.types),
  "zero-friction-types.ts",
);
check(
  "voice-is-click-started-and-no-raw-audio-persistence",
  /onClick=\{toggle\}/u.test(files.voice) &&
    /recognition\.start\(\)/u.test(files.voice) &&
    !/MediaRecorder|audio\/webm|audioBlob|arrayBuffer\s*\(/u.test(files.voice),
  "voice-input-field.tsx",
);
check(
  "voice-and-ky-free-text-not-logged",
  !/console\.(?:log|info|warn|error)\s*\(/u.test(
    files.voice + files.builder + files.storage + files.pdf,
  ),
  "active KY client/storage/PDF sources",
);
check(
  "verified-suggestions-work-with-external-ai-off",
  !/\b(?:fetch|generateContent|openai|gemini|anthropic)\b/iu.test(
    files.suggestions,
  ),
  "verified-suggestions.ts",
);
check(
  "weather-client-calls-same-origin-allowlisted-routes",
  /`\/api\/weather-risk\?area=/u.test(files.weather) &&
    /`\/api\/wbgt\?area=/u.test(files.weather) &&
    !/https?:\/\//u.test(files.weather),
  "weather-prefill-v2.ts",
);
check(
  "handoff-url-excludes-free-text",
  !/params\.set\(\s*["'](?:q|work|workDraft|member|site|note|payload)["']/u.test(
    files.handoff,
  ) && /sessionStorage/u.test(files.handoff),
  "handoff.ts",
);
check(
  "legacy-ky-redirect-drops-private-query-keys",
  /SAFE_QUERY_KEYS/u.test(files.kyRedirect) &&
    !/["'](?:q|payload|fromDiary)["']\s*,/u.test(files.kyRedirect),
  "app/(main)/ky/page.tsx",
);
check(
  "pdf-is-client-only-and-has-draft-watermark",
  /下書き・未確認/u.test(files.pdf) &&
    /document\.createElement\(["']canvas["']\)/u.test(files.pdf) &&
    !/\bfetch\s*\(/u.test(files.pdf),
  "pdf-export.ts",
);
check(
  "pdf-filename-uses-coarse-area-not-people-or-location-query",
  /draft\.areaLabel\s*\|\|\s*["']地域未確認["']/u.test(files.pdf) &&
    !/selectedMembers|reviewerName/u.test(
      files.pdf.slice(
        files.pdf.indexOf("export function kyPdfFilename"),
        files.pdf.indexOf("export function kyDraftToPdfLines"),
      ),
    ),
  "kyPdfFilename",
);
check(
  "candidate-and-handoff-confirmation-remain-human-gated",
  /isKyDraftContentConfirmable/u.test(files.builder) &&
    /requiresHumanReview:\s*true/u.test(files.builder) &&
    /reviewedAt:\s*confirmedAt/u.test(files.builder),
  "ky-zero-friction-builder.tsx",
);
check(
  "no-recipient-or-email-literal-in-new-ky-flow",
  !/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/iu.test(
    Object.values(files).join("\n"),
  ),
  "new KY flow sources",
);

const failed = checks.filter((item) => !item.passed);
const report = {
  generatedAt: new Date().toISOString(),
  policy:
    "値や自由入力は証跡へ出さず、KYの音声・保存・PDF・URL・AI・気象・確認境界を静的に検証する。",
  checks,
  passed: failed.length === 0,
  failedCheckIds: failed.map((item) => item.id),
};
const reportPath = resolve(evidenceRoot, "ky-zero-friction-static-gate.json");
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
process.stdout.write(
  `${JSON.stringify(
    {
      reportPath,
      checkCount: checks.length,
      passed: report.passed,
      failedCheckIds: report.failedCheckIds,
    },
    null,
    2,
  )}\n`,
);
if (!report.passed) process.exitCode = 1;
