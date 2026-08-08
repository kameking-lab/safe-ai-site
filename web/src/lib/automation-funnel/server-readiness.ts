export type AutomationFunnelServerReadiness = {
  ready: boolean;
  runtime: "production" | "non-production";
  collection: "configured" | "missing";
  database: "configured" | "missing";
  retention: "configured" | "missing" | "invalid";
  retentionDays: number | null;
  rateLimitSecret: "configured" | "missing";
};

export function getAutomationFunnelServerReadiness(
  env: Record<string, string | undefined> = process.env,
): AutomationFunnelServerReadiness {
  const runtime =
    env.VERCEL_ENV?.trim().toLowerCase() === "production"
      ? "production"
      : "non-production";
  const collection =
    env.AUTOMATION_FUNNEL_COLLECTION_ENABLED?.trim().toLowerCase() === "true"
      ? "configured"
      : "missing";
  const database = env.DATABASE_URL?.trim() ? "configured" : "missing";
  const rawRetention = env.AUTOMATION_FUNNEL_RETENTION_DAYS?.trim();
  const parsedRetention = Number(rawRetention);
  const retention =
    !rawRetention
      ? "missing"
      : Number.isInteger(parsedRetention) &&
          parsedRetention >= 1 &&
          parsedRetention <= 30
        ? "configured"
        : "invalid";
  const rateLimitSecret =
    env.RUM_RATE_LIMIT_HASH_SECRET?.trim() &&
    env.RUM_RATE_LIMIT_HASH_SECRET.trim().length >= 32
      ? "configured"
      : "missing";
  return {
    ready:
      runtime === "production" &&
      collection === "configured" &&
      database === "configured" &&
      retention === "configured" &&
      rateLimitSecret === "configured",
    runtime,
    collection,
    database,
    retention,
    retentionDays: retention === "configured" ? parsedRetention : null,
    rateLimitSecret,
  };
}
