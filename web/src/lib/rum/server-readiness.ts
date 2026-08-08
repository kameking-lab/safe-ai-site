export type RumServerReadiness = {
  ready: boolean;
  collection: "configured" | "missing";
  sink: "configured" | "missing" | "invalid";
  retention: "configured" | "missing" | "invalid";
  dpa: "configured" | "pending-external-verification";
  edgeRateLimit: "configured" | "pending-external-verification";
  runtime: "production" | "non-production";
  sampleRate: number;
  retentionDays: number | null;
  sinkEndpoint: string | null;
  sinkBackend: "postgres" | "external" | null;
  rateLimitSecret: "configured" | "missing";
};

function parseSampleRate(value: string | undefined): number {
  if (!value?.trim()) return 0.1;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 && parsed <= 1 ? parsed : 0;
}

export function getRumServerReadiness(
  env: Record<string, string | undefined> = process.env,
): RumServerReadiness {
  const collection =
    env.RUM_COLLECTION_ENABLED?.trim().toLowerCase() === "true"
      ? "configured"
      : "missing";
  const runtime =
    env.VERCEL_ENV?.trim().toLowerCase() === "production"
      ? "production"
      : "non-production";
  const dpa =
    env.RUM_DPA_APPROVED?.trim().toLowerCase() === "true"
      ? "configured"
      : "pending-external-verification";
  const edgeRateLimit =
    env.RUM_EDGE_RATE_LIMIT_VERIFIED?.trim().toLowerCase() === "true"
      ? "configured"
      : "pending-external-verification";

  const retentionValue = env.RUM_RETENTION_DAYS?.trim();
  const retentionDays = Number(retentionValue);
  const retention =
    !retentionValue
      ? "missing"
      : Number.isInteger(retentionDays) &&
          retentionDays >= 1 &&
          retentionDays <= 30
        ? "configured"
        : "invalid";

  let sink: RumServerReadiness["sink"] = "missing";
  let sinkEndpoint: string | null = null;
  let sinkBackend: RumServerReadiness["sinkBackend"] = null;
  const configuredBackend = env.RUM_SINK_BACKEND?.trim().toLowerCase();
  const sinkValue = env.RUM_SINK_ENDPOINT?.trim();
  if (configuredBackend === "postgres") {
    if (env.DATABASE_URL?.trim()) {
      sink = "configured";
      sinkBackend = "postgres";
    }
  } else if (
    configuredBackend &&
    configuredBackend !== "external"
  ) {
    sink = "invalid";
  } else if (sinkValue) {
    try {
      const parsed = new URL(sinkValue);
      const isRecursivePortalEndpoint =
        parsed.hostname === "www.anzen-ai-portal.jp" &&
        parsed.pathname === "/api/rum";
      if (parsed.protocol === "https:" && !isRecursivePortalEndpoint) {
        sink = "configured";
        sinkEndpoint = parsed.toString();
        sinkBackend = "external";
      } else {
        sink = "invalid";
      }
    } catch {
      sink = "invalid";
    }
  }

  const sampleRate = parseSampleRate(env.RUM_SAMPLE_RATE);
  const rateLimitSecret =
    env.RUM_RATE_LIMIT_HASH_SECRET?.trim() &&
    env.RUM_RATE_LIMIT_HASH_SECRET.trim().length >= 32
      ? "configured"
      : "missing";
  const ready =
    collection === "configured" &&
    sink === "configured" &&
    retention === "configured" &&
    dpa === "configured" &&
    edgeRateLimit === "configured" &&
    runtime === "production" &&
    sampleRate > 0 &&
    (sinkBackend !== "postgres" || rateLimitSecret === "configured");

  return {
    ready,
    collection,
    sink,
    retention,
    dpa,
    edgeRateLimit,
    runtime,
    sampleRate,
    retentionDays: retention === "configured" ? retentionDays : null,
    sinkEndpoint,
    sinkBackend,
    rateLimitSecret,
  };
}
