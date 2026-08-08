import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const SIGNAGE_DEVICE_STATES = [
  "online",
  "delayed",
  "offline",
  "stale",
  "degraded",
  "maintenance",
  "emergency",
  "unknown",
] as const;

export type SignageDeviceState = (typeof SIGNAGE_DEVICE_STATES)[number];

export type SignageDeviceObservation = {
  registrationStatus: "unverified" | "verified" | "revoked";
  lastSeenAt: Date | null;
  staleThresholdSec: number;
  reportedStatus: string | null;
  maintenanceAt: Date | null;
  emergencyActive: boolean;
};

export function deriveSignageDeviceState(
  observation: SignageDeviceObservation,
  now = new Date(),
): SignageDeviceState {
  if (observation.registrationStatus !== "verified") return "unknown";
  if (observation.maintenanceAt) return "maintenance";
  if (observation.emergencyActive) return "emergency";
  if (!observation.lastSeenAt) return "unknown";
  if (
    !Number.isInteger(observation.staleThresholdSec) ||
    observation.staleThresholdSec < 30
  ) {
    return "unknown";
  }
  const ageSec = Math.max(
    0,
    (now.getTime() - observation.lastSeenAt.getTime()) / 1_000,
  );
  if (ageSec > observation.staleThresholdSec * 6) return "offline";
  if (ageSec > observation.staleThresholdSec * 2) return "stale";
  if (ageSec > observation.staleThresholdSec) return "delayed";
  if (observation.reportedStatus === "degraded") return "degraded";
  return "online";
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonical(object[key])}`)
    .join(",")}}`;
}

export function signageConfigChecksum(configuration: unknown): string {
  return createHash("sha256").update(canonical(configuration)).digest("base64url");
}

export function signSignageConfiguration(
  configuration: unknown,
  version: number,
  secret: string,
): { checksum: string; signature: string } {
  if (secret.trim().length < 32) throw new Error("signage_signing_secret_invalid");
  const checksum = signageConfigChecksum(configuration);
  const signature = createHmac("sha256", secret)
    .update("signage-config-v1")
    .update("\0")
    .update(String(version))
    .update("\0")
    .update(checksum)
    .digest("base64url");
  return { checksum, signature };
}

export function verifySignageConfiguration(
  configuration: unknown,
  version: number,
  signature: string,
  secret: string,
): boolean {
  try {
    const expected = signSignageConfiguration(configuration, version, secret);
    const left = Buffer.from(expected.signature);
    const right = Buffer.from(signature);
    return left.length === right.length && timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

export function hashSignageDeviceToken(token: string, secret: string): string {
  if (token.length < 32 || secret.trim().length < 32) {
    throw new Error("signage_device_credential_invalid");
  }
  return createHmac("sha256", secret)
    .update("signage-device-token-v1")
    .update("\0")
    .update(token)
    .digest("base64url");
}

export function hashSignageHeartbeatNonce(
  deviceId: string,
  nonce: string,
  secret: string,
): string {
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(nonce)) {
    throw new Error("signage_heartbeat_nonce_invalid");
  }
  return createHmac("sha256", secret)
    .update("signage-heartbeat-nonce-v1")
    .update("\0")
    .update(deviceId)
    .update("\0")
    .update(nonce)
    .digest("base64url");
}

export function heartbeatTimestampAllowed(
  observedAt: Date,
  now = new Date(),
  maxSkewMs = 5 * 60 * 1_000,
): boolean {
  return (
    !Number.isNaN(observedAt.getTime()) &&
    Math.abs(now.getTime() - observedAt.getTime()) <= maxSkewMs
  );
}

export function isSignageEmergencyOverrideActive(
  value: unknown,
  now = new Date(),
): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const override = value as Record<string, unknown>;
  if (override.active !== true) return false;
  if (override.expiresAt === null || override.expiresAt === undefined) {
    return true;
  }
  if (typeof override.expiresAt !== "string") return false;
  const expiresAt = new Date(override.expiresAt);
  return (
    !Number.isNaN(expiresAt.getTime()) &&
    expiresAt.getTime() > now.getTime()
  );
}
