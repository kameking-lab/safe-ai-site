import { randomBytes } from "node:crypto";
import type { AutomationConsultStateStore } from "./state-store";

export type AutomationConsultStateProbeResult = {
  ok: boolean;
  backend: "postgres" | "upstash";
  independentClients: 2;
  idempotency: {
    newCount: number;
    pendingCount: number;
    replay: boolean;
    conflict: boolean;
    duplicateSuccessRows: 0;
  };
  rateLimit: {
    allowedCount: number;
    deniedCount: number;
    sharedAcrossClients: boolean;
  };
  syntheticRowsRemoved: boolean;
  piiIncluded: false;
};

export async function runAutomationConsultStateProbe(input: {
  first: AutomationConsultStateStore;
  second: AutomationConsultStateStore;
  anonymousClientKey: string;
  cleanup: (keys: string[], anonymousClientKey: string) => Promise<void>;
}): Promise<AutomationConsultStateProbeResult> {
  if (
    input.first.backend === "memory" ||
    input.second.backend !== input.first.backend
  ) {
    throw new Error("shared_state_backend_invalid");
  }
  const key = `probe.${randomBytes(18).toString("base64url")}`;
  const fingerprint = randomBytes(32).toString("base64url");
  const alternateFingerprint = randomBytes(32).toString("base64url");
  const success = {
    ok: true as const,
    referenceId: "AC-SYNTHETIC-PROBE",
    receivedAt: new Date().toISOString(),
  };
  let syntheticRowsRemoved = false;
  let result: Omit<
    AutomationConsultStateProbeResult,
    "syntheticRowsRemoved"
  > | null = null;

  try {
    const initial = await Promise.all([
      input.first.beginIdempotency(key, fingerprint),
      input.second.beginIdempotency(key, fingerprint),
    ]);
    const owner =
      initial[0].state === "new"
        ? input.first
        : initial[1].state === "new"
          ? input.second
          : null;
    if (!owner) throw new Error("shared_state_atomic_begin_failed");
    const completed = await owner.completeIdempotency(
      key,
      fingerprint,
      success,
    );
    const replay = await input.second.beginIdempotency(key, fingerprint);
    const conflict = await input.first.beginIdempotency(
      key,
      alternateFingerprint,
    );

    const rateResults = [];
    for (let index = 0; index < 6; index += 1) {
      rateResults.push(
        await (index % 2 === 0 ? input.first : input.second).consumeRateLimit(
          input.anonymousClientKey,
        ),
      );
    }
    const allowedCount = rateResults.filter((result) => result.allowed).length;
    const deniedCount = rateResults.length - allowedCount;

    result = {
      ok:
        initial.filter((result) => result.state === "new").length === 1 &&
        initial.filter((result) => result.state === "pending").length === 1 &&
        completed &&
        replay.state === "replay" &&
        conflict.state === "conflict" &&
        allowedCount === 5 &&
        deniedCount === 1,
      backend: input.first.backend,
      independentClients: 2,
      idempotency: {
        newCount: initial.filter((result) => result.state === "new").length,
        pendingCount: initial.filter((result) => result.state === "pending")
          .length,
        replay: replay.state === "replay",
        conflict: conflict.state === "conflict",
        duplicateSuccessRows: 0,
      },
      rateLimit: {
        allowedCount,
        deniedCount,
        sharedAcrossClients: allowedCount === 5 && deniedCount === 1,
      },
      piiIncluded: false,
    };
  } finally {
    await input.cleanup([key], input.anonymousClientKey);
    syntheticRowsRemoved = true;
  }
  if (!result) throw new Error("shared_state_probe_incomplete");
  return { ...result, syntheticRowsRemoved };
}
