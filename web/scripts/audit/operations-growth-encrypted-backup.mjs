import {
  createCipheriv,
  createDecipheriv,
  createHash,
  hkdfSync,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { gunzipSync, gzipSync } from "node:zlib";
import { Prisma, PrismaClient } from "@prisma/client";

const BACKUP_VERSION = 1;
const BACKUP_INFO = Buffer.from(
  "safe-ai-site:operations-growth:encrypted-logical-backup:v1",
  "utf8",
);
const MAX_PLAINTEXT_BYTES = 50 * 1024 * 1024;
const BACKUP_DIRECTORY = resolve(process.cwd(), "../.vercel/backups");
const gapClosureRequested = process.argv.includes("--gap-closure");

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function equalHex(actual, expected) {
  return (
    /^[a-f0-9]{64}$/.test(actual) &&
    /^[a-f0-9]{64}$/.test(expected) &&
    timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"))
  );
}

function quoteIdentifier(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function currentDatabaseSchemaSql() {
  const prismaCli = resolve(
    process.cwd(),
    "node_modules/prisma/build/index.js",
  );
  const result = spawnSync(
    process.execPath,
    [
      prismaCli,
      "migrate",
      "diff",
      "--from-empty",
      "--to-schema-datasource",
      "prisma/schema.prisma",
      "--script",
    ],
    {
      cwd: process.cwd(),
      env: process.env,
      encoding: "utf8",
      windowsHide: true,
      maxBuffer: 8 * 1024 * 1024,
    },
  );
  if (result.status !== 0 || !result.stdout?.includes("CREATE TABLE")) {
    throw new Error("current database schema snapshot failed");
  }
  if (/postgres(?:ql)?:\/\//i.test(result.stdout)) {
    throw new Error("database schema snapshot exposed a connection value");
  }
  return result.stdout;
}

export function databaseTargetFingerprint(databaseUrl) {
  const parsed = new URL(databaseUrl);
  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
    throw new Error("DATABASE_URL must use PostgreSQL");
  }
  const material = JSON.stringify({
    host: parsed.hostname.toLowerCase(),
    port: parsed.port || "5432",
    database: decodeURIComponent(parsed.pathname.replace(/^\/+/, "")),
    role: decodeURIComponent(parsed.username),
  });
  return sha256(material);
}

function deriveBackupKey(keySource, salt) {
  if (!Buffer.isBuffer(keySource) || keySource.length < 32) {
    throw new Error("backup key source is unavailable");
  }
  return Buffer.from(hkdfSync("sha256", keySource, salt, BACKUP_INFO, 32));
}

function runDpapi(operation, input) {
  const method = operation === "protect" ? "Protect" : "Unprotect";
  const script = `
    $ErrorActionPreference = 'Stop'
    Add-Type -AssemblyName System.Security
    $raw = [Convert]::FromBase64String([Console]::In.ReadToEnd().Trim())
    $result = [System.Security.Cryptography.ProtectedData]::${method}(
      $raw,
      $null,
      [System.Security.Cryptography.DataProtectionScope]::CurrentUser
    )
    [Console]::Out.Write([Convert]::ToBase64String($result))
  `;
  const result = spawnSync(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-Command", script],
    {
      input: input.toString("base64"),
      encoding: "utf8",
      windowsHide: true,
      maxBuffer: 1024 * 1024,
    },
  );
  if (result.status !== 0 || !result.stdout?.trim()) {
    throw new Error(`Windows DPAPI ${operation} failed`);
  }
  return Buffer.from(result.stdout.trim(), "base64");
}

function loadDpapiKey(keyPath) {
  const resolvedPath = resolve(keyPath);
  if (
    resolve(resolvedPath, "..") !== BACKUP_DIRECTORY ||
    basename(resolvedPath) !==
      resolvedPath.slice(BACKUP_DIRECTORY.length + 1) ||
    !/^[A-Za-z0-9._:-]+\.key\.dpapi$/.test(basename(resolvedPath))
  ) {
    throw new Error("backup key path is outside the private backup directory");
  }
  const protectedKey = Buffer.from(
    readFileSync(resolvedPath, "utf8").trim(),
    "base64",
  );
  const keySource = runDpapi("unprotect", protectedKey);
  if (keySource.length !== 32) {
    throw new Error("Windows DPAPI backup key is invalid");
  }
  return keySource;
}

function parseEnvelope(fileBuffer) {
  let envelope;
  try {
    envelope = JSON.parse(fileBuffer.toString("utf8"));
  } catch {
    throw new Error("encrypted backup envelope is invalid");
  }
  if (
    envelope?.version !== BACKUP_VERSION ||
    envelope?.cipher !== "aes-256-gcm" ||
    envelope?.compression !== "gzip" ||
    envelope?.kdf !== "hkdf-sha256" ||
    envelope?.keyProtection !== "windows-dpapi-current-user" ||
    !/^[A-Za-z0-9._:-]+\.key\.dpapi$/.test(envelope?.keyFile ?? "") ||
    !/^[A-Za-z0-9._:-]{8,160}$/.test(envelope?.backupId ?? "") ||
    typeof envelope?.createdAt !== "string" ||
    !Number.isFinite(Date.parse(envelope.createdAt)) ||
    new Date(envelope.createdAt).toISOString() !== envelope.createdAt ||
    !/^[a-f0-9]{64}$/.test(envelope?.targetFingerprint ?? "") ||
    !/^[a-f0-9]{64}$/.test(envelope?.plaintextSha256 ?? "")
  ) {
    throw new Error("encrypted backup envelope metadata is invalid");
  }
  return envelope;
}

export function verifyEncryptedBackupBuffer({
  fileBuffer,
  keySource,
  expectedKeyFile,
  expectedFileSha256,
  expectedTargetFingerprint,
}) {
  if (!Buffer.isBuffer(fileBuffer) || !Buffer.isBuffer(keySource)) {
    throw new Error("encrypted backup verification input is invalid");
  }
  const fileSha256 = sha256(fileBuffer);
  if (!equalHex(fileSha256, expectedFileSha256.toLowerCase())) {
    throw new Error("encrypted backup file fingerprint mismatch");
  }
  const envelope = parseEnvelope(fileBuffer);
  if (
    !equalHex(
      envelope.targetFingerprint,
      expectedTargetFingerprint.toLowerCase(),
    )
  ) {
    throw new Error("encrypted backup target fingerprint mismatch");
  }

  const salt = Buffer.from(envelope.salt, "base64");
  const iv = Buffer.from(envelope.iv, "base64");
  const tag = Buffer.from(envelope.authTag, "base64");
  const ciphertext = Buffer.from(envelope.ciphertext, "base64");
  if (salt.length !== 32 || iv.length !== 12 || tag.length !== 16) {
    throw new Error("encrypted backup cryptographic metadata is invalid");
  }

  if (expectedKeyFile !== envelope.keyFile) {
    throw new Error("encrypted backup key binding mismatch");
  }
  const verificationKeySource = Buffer.from(keySource);
  const key = deriveBackupKey(verificationKeySource, salt);
  let compressed;
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    compressed = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } finally {
    key.fill(0);
    verificationKeySource.fill(0);
  }
  const plaintext = gunzipSync(compressed);
  if (!equalHex(sha256(plaintext), envelope.plaintextSha256)) {
    throw new Error("encrypted backup plaintext fingerprint mismatch");
  }

  let payload;
  try {
    payload = JSON.parse(plaintext.toString("utf8"));
  } catch {
    throw new Error("encrypted backup payload is invalid");
  }
  if (
    payload?.version !== BACKUP_VERSION ||
    payload?.backupId !== envelope.backupId ||
    payload?.createdAt !== envelope.createdAt ||
    payload?.targetFingerprint !== envelope.targetFingerprint ||
    !Array.isArray(payload?.tables) ||
    !Array.isArray(payload?.sequences) ||
    typeof payload?.schemaSql !== "string"
  ) {
    throw new Error("encrypted backup payload metadata is invalid");
  }
  const rowCount = payload.tables.reduce((total, table) => {
    if (
      typeof table?.name !== "string" ||
      !Array.isArray(table?.rows) ||
      table.rows.some((row) => typeof row !== "string")
    ) {
      throw new Error("encrypted backup table payload is invalid");
    }
    return total + table.rows.length;
  }, 0);
  if (
    payload.tables.length !== envelope.tableCount ||
    payload.sequences.length !== envelope.sequenceCount ||
    rowCount !== envelope.rowCount ||
    sha256(payload.schemaSql) !== envelope.schemaSqlSha256
  ) {
    throw new Error("encrypted backup manifest does not match payload");
  }

  return {
    ok: true,
    backupId: envelope.backupId,
    createdAt: envelope.createdAt,
    targetFingerprint: envelope.targetFingerprint,
    fileSha256,
    plaintextSha256: envelope.plaintextSha256,
    schemaSqlSha256: envelope.schemaSqlSha256,
    tableCount: envelope.tableCount,
    sequenceCount: envelope.sequenceCount,
    rowCount: envelope.rowCount,
    plaintextBytes: plaintext.length,
    ciphertextBytes: ciphertext.length,
    encryption: "AES-256-GCM / HKDF-SHA256 / gzip",
    keyProtection: "Windows DPAPI CurrentUser",
    piiPlaintextWrittenToDisk: false,
  };
}

export function verifyEncryptedBackup({
  backupPath,
  keyPath,
  expectedFileSha256,
  expectedTargetFingerprint,
}) {
  const resolvedPath = resolve(backupPath);
  if (
    resolve(resolvedPath, "..") !== BACKUP_DIRECTORY ||
    basename(resolvedPath) !== resolvedPath.slice(BACKUP_DIRECTORY.length + 1)
  ) {
    throw new Error("backup path is outside the private backup directory");
  }
  const fileBuffer = readFileSync(resolvedPath);
  const keySource = loadDpapiKey(keyPath);
  try {
    return verifyEncryptedBackupBuffer({
      fileBuffer,
      keySource,
      expectedKeyFile: basename(keyPath),
      expectedFileSha256,
      expectedTargetFingerprint,
    });
  } finally {
    keySource.fill(0);
  }
}

async function createEncryptedBackup() {
  if (!process.env.DATABASE_URL?.trim()) {
    try {
      process.loadEnvFile(resolve(process.cwd(), "../.env.local"));
    } catch {
      // The caller may provide the production environment directly.
    }
  }
  const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";
  const expectedTargetFingerprint =
    process.env.OPERATIONS_GROWTH_TARGET_FINGERPRINT?.trim().toLowerCase() ??
    "";
  const targetFingerprint = databaseTargetFingerprint(databaseUrl);
  if (
    !/^[a-f0-9]{64}$/.test(expectedTargetFingerprint) ||
    !equalHex(targetFingerprint, expectedTargetFingerprint)
  ) {
    throw new Error("production target fingerprint mismatch");
  }
  if (!new URL(databaseUrl).hostname.toLowerCase().endsWith(".neon.tech")) {
    throw new Error("backup target is not the confirmed Neon database");
  }

  const schemaSql = gapClosureRequested
    ? currentDatabaseSchemaSql()
    : readFileSync(
        resolve(
          process.cwd(),
          "../docs/audits/evidence/operations-growth-cockpit-2026-07-29/pre-migration-schema-backup.sql",
        ),
        "utf8",
      );
  if (
    /postgres(?:ql)?:\/\//i.test(schemaSql) ||
    (!gapClosureRequested && /AutomationFunnelEvent/.test(schemaSql))
  ) {
    throw new Error("pre-migration schema backup boundary failed");
  }

  const database = new PrismaClient();
  const createdAt = new Date().toISOString();
  const backupPrefix = gapClosureRequested
    ? "japan-leading-gap-closure"
    : "operations-growth";
  const backupId = `${backupPrefix}-${createdAt.replaceAll(/[-:.]/g, "")}`;
  let snapshot;
  try {
    snapshot = await database.$transaction(
      async (transaction) => {
        await transaction.$executeRawUnsafe("SET TRANSACTION READ ONLY");
        const sizeRows = await transaction.$queryRawUnsafe(`
          SELECT COALESCE(sum(pg_total_relation_size(c.oid)), 0)::bigint
            AS "totalBytes"
          FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = 'public' AND c.relkind = 'r'
        `);
        if (Number(sizeRows[0]?.totalBytes ?? 0) > MAX_PLAINTEXT_BYTES) {
          throw new Error("database exceeds the bounded logical backup limit");
        }
        const tableRows = await transaction.$queryRawUnsafe(`
          SELECT tablename AS "tableName"
          FROM pg_tables
          WHERE schemaname = 'public'
          ORDER BY tablename
        `);
        const tables = [];
        for (const { tableName } of tableRows) {
          const identifier = `public.${quoteIdentifier(tableName)}`;
          const rows = await transaction.$queryRawUnsafe(
            `SELECT row_to_json(t)::text AS "rowJson"
             FROM ${identifier} t
             ORDER BY t.ctid`,
          );
          tables.push({
            name: tableName,
            rows: rows.map((row) => row.rowJson),
          });
        }
        const sequenceRows = await transaction.$queryRawUnsafe(`
          SELECT sequencename AS "sequenceName"
          FROM pg_sequences
          WHERE schemaname = 'public'
          ORDER BY sequencename
        `);
        const sequences = [];
        for (const { sequenceName } of sequenceRows) {
          const identifier = `public.${quoteIdentifier(sequenceName)}`;
          const rows = await transaction.$queryRawUnsafe(
            `SELECT last_value::text AS "lastValue",
              is_called AS "isCalled" FROM ${identifier}`,
          );
          sequences.push({
            name: sequenceName,
            lastValue: rows[0]?.lastValue ?? null,
            isCalled: rows[0]?.isCalled ?? false,
          });
        }
        return { tables, sequences };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
        maxWait: 10_000,
        timeout: 120_000,
      },
    );
  } finally {
    await database.$disconnect();
  }

  const rowCount = snapshot.tables.reduce(
    (total, table) => total + table.rows.length,
    0,
  );
  const payload = {
    version: BACKUP_VERSION,
    backupId,
    createdAt,
    targetFingerprint,
    schemaSql,
    tables: snapshot.tables,
    sequences: snapshot.sequences,
  };
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
  if (plaintext.length > MAX_PLAINTEXT_BYTES) {
    throw new Error("logical backup payload exceeds the bounded limit");
  }
  const compressed = gzipSync(plaintext, { level: 9 });
  const salt = randomBytes(32);
  const iv = randomBytes(12);
  const keySource = randomBytes(32);
  const key = deriveBackupKey(keySource, salt);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(compressed), cipher.final()]);
  const envelope = {
    version: BACKUP_VERSION,
    backupId,
    createdAt,
    targetFingerprint,
    cipher: "aes-256-gcm",
    kdf: "hkdf-sha256",
    compression: "gzip",
    keyProtection: "windows-dpapi-current-user",
    keyFile: `${backupId}.key.dpapi`,
    salt: salt.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
    plaintextSha256: sha256(plaintext),
    schemaSqlSha256: sha256(schemaSql),
    tableCount: snapshot.tables.length,
    sequenceCount: snapshot.sequences.length,
    rowCount,
    ciphertext: ciphertext.toString("base64"),
  };
  mkdirSync(BACKUP_DIRECTORY, { recursive: true });
  const keyPath = resolve(BACKUP_DIRECTORY, envelope.keyFile);
  if (existsSync(keyPath)) {
    throw new Error("private backup key file already exists");
  }
  const protectedKey = runDpapi("protect", keySource);
  writeFileSync(keyPath, `${protectedKey.toString("base64")}\n`, {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600,
  });
  key.fill(0);
  keySource.fill(0);
  const backupPath = resolve(BACKUP_DIRECTORY, `${backupId}.enc.json`);
  writeFileSync(backupPath, `${JSON.stringify(envelope)}\n`, {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600,
  });
  const fileSha256 = sha256(readFileSync(backupPath));
  const verified = verifyEncryptedBackup({
    backupPath,
    keyPath,
    expectedFileSha256: fileSha256,
    expectedTargetFingerprint,
  });
  return {
    ...verified,
    backupFile: `.vercel/backups/${basename(backupPath)}`,
    keyFile: `.vercel/backups/${basename(keyPath)}`,
    fileBytes: statSync(backupPath).size,
    databaseReadOnly: true,
    repeatableReadSnapshot: true,
    schemaSource: gapClosureRequested
      ? "live-database-diff"
      : "audited-pre-migration-file",
    restoreExecuted: false,
    secretsIncludedInManifest: false,
  };
}

async function main() {
  if (!process.argv.includes("--create")) {
    throw new Error("--create is required");
  }
  const result = await createEncryptedBackup();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  main().catch((error) => {
    process.stderr.write(`${error.name}: encrypted backup failed\n`);
    process.exitCode = 1;
  });
}
