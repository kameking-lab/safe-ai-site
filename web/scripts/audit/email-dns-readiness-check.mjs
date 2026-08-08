#!/usr/bin/env node

/**
 * Read-only public DNS readiness check for a mail-sending domain.
 * Record values are intentionally omitted; output contains only counts and
 * boolean policy checks. No provider API or mail delivery is performed.
 */
import { createHash } from "node:crypto";
import { promises as dns } from "node:dns";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const argv = process.argv.slice(2);
if (!argv.includes("--dry-run")) {
  process.stderr.write("Refusing to run without --dry-run.\n");
  process.exit(2);
}
function option(name, fallback = "") {
  const prefix = `${name}=`;
  return argv.find((item) => item.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

const domain = option("--domain").trim().toLowerCase();
const selector = option("--dkim-selector").trim().toLowerCase();
if (
  !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(
    domain,
  )
) {
  throw new Error("--domain must be a public DNS hostname");
}
if (!/^[a-z0-9][a-z0-9_-]{0,62}$/.test(selector)) {
  throw new Error("--dkim-selector is required and must be a DNS label");
}
const outputPath = resolve(
  option(
    "--output",
    "../docs/audits/evidence/final-production-candidate-2026-07-27/external-readiness/email-dns-readiness.json",
  ),
);

async function txt(name) {
  try {
    return (await dns.resolveTxt(name)).map((parts) => parts.join(""));
  } catch {
    return [];
  }
}
async function cname(name) {
  try {
    return await dns.resolveCname(name);
  } catch {
    return [];
  }
}

const [rootTxt, dmarcTxt, dkimTxt, dkimCname] = await Promise.all([
  txt(domain),
  txt(`_dmarc.${domain}`),
  txt(`${selector}._domainkey.${domain}`),
  cname(`${selector}._domainkey.${domain}`),
]);
const spf = rootTxt.filter((record) => /^v=spf1(?:\s|$)/i.test(record));
const dmarc = dmarcTxt.filter((record) => /^v=dmarc1(?:;|$)/i.test(record));
const dkim = dkimTxt.filter((record) => /(?:^|;)\s*(?:v=DKIM1|p=)/i.test(record));
const result = {
  schemaVersion: 1,
  checkedAt: new Date().toISOString(),
  mode: "public-dns-read-only-record-values-omitted",
  domainHash: createHash("sha256").update(domain).digest("hex"),
  selectorHash: createHash("sha256").update(selector).digest("hex"),
  spf: {
    recordCount: spf.length,
    exactlyOne: spf.length === 1,
  },
  dkim: {
    txtRecordCount: dkim.length,
    cnameRecordCount: dkimCname.length,
    present: dkim.length > 0 || dkimCname.length > 0,
  },
  dmarc: {
    recordCount: dmarc.length,
    exactlyOne: dmarc.length === 1,
    policyDeclared:
      dmarc.length === 1 && /(?:^|;)\s*p=(?:none|quarantine|reject)(?:;|$)/i.test(dmarc[0]),
  },
  providerDomainVerified: "manual_check_required",
  mailSent: 0,
  externalStateChanged: false,
  recordValuesIncluded: false,
};
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
process.stdout.write(
  `${JSON.stringify({
    ok: true,
    outputPath,
    recordValuesIncluded: false,
    mailSent: 0,
  })}\n`,
);
