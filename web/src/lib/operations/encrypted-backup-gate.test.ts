import { createCipheriv, createHash, hkdfSync, randomBytes } from "node:crypto";
import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { verifyEncryptedBackupBuffer } from "../../../scripts/audit/operations-growth-encrypted-backup.mjs";

const BACKUP_INFO = Buffer.from(
  "safe-ai-site:operations-growth:encrypted-logical-backup:v1",
  "utf8",
);

type Envelope = {
  version: number;
  backupId: string;
  createdAt: string;
  targetFingerprint: string;
  cipher: string;
  kdf: string;
  compression: string;
  keyProtection: string;
  keyFile: string;
  salt: string;
  iv: string;
  authTag: string;
  plaintextSha256: string;
  schemaSqlSha256: string;
  tableCount: number;
  sequenceCount: number;
  rowCount: number;
  ciphertext: string;
};

function sha256(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function fixture() {
  const createdAt = "2026-07-29T11:14:04.321Z";
  const backupId = "operations-growth-20260729T111404321Z";
  const targetFingerprint = "a".repeat(64);
  const schemaSql = 'CREATE TABLE "Example" ("id" bigint PRIMARY KEY);\n';
  const payload = {
    version: 1,
    backupId,
    createdAt,
    targetFingerprint,
    schemaSql,
    tables: [{ name: "Example", rows: ['{"id":1}'] }],
    sequences: [],
  };
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
  const compressed = gzipSync(plaintext);
  const salt = randomBytes(32);
  const iv = randomBytes(12);
  const keySource = randomBytes(32);
  const key = Buffer.from(hkdfSync("sha256", keySource, salt, BACKUP_INFO, 32));
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(compressed), cipher.final()]);
  key.fill(0);
  const envelope = {
    version: 1,
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
    tableCount: 1,
    sequenceCount: 0,
    rowCount: 1,
    ciphertext: ciphertext.toString("base64"),
  };
  return { envelope, keySource, targetFingerprint };
}

function verify(
  envelope: Envelope,
  keySource: Buffer,
  targetFingerprint: string,
) {
  const fileBuffer = Buffer.from(`${JSON.stringify(envelope)}\n`, "utf8");
  return verifyEncryptedBackupBuffer({
    fileBuffer,
    keySource,
    expectedKeyFile: envelope.keyFile,
    expectedFileSha256: sha256(fileBuffer),
    expectedTargetFingerprint: targetFingerprint,
  });
}

describe("operations growth encrypted backup freshness binding", () => {
  it("accepts a fully bound authenticated envelope and payload", () => {
    const { envelope, keySource, targetFingerprint } = fixture();

    expect(verify(envelope, keySource, targetFingerprint)).toMatchObject({
      ok: true,
      createdAt: envelope.createdAt,
      targetFingerprint,
    });
  });

  it("rejects a changed envelope createdAt even with a recomputed file SHA", () => {
    const { envelope, keySource, targetFingerprint } = fixture();
    const tamperedEnvelope = {
      ...envelope,
      createdAt: "2026-07-29T12:14:04.321Z",
    };

    expect(() =>
      verify(tamperedEnvelope, keySource, targetFingerprint),
    ).toThrow("encrypted backup payload metadata is invalid");
  });
});
