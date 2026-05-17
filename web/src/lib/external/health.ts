/**
 * On-demand health checks for the services in service-registry.
 *
 * Each probe runs in parallel with a tight timeout. The intent is to feed the
 * /admin/health dashboard, not to substitute for real production monitoring.
 */
import { fetchWithTimeout } from "./fetch-with-timeout";
import { getSnapshot } from "./circuit-breaker";
import {
  SERVICE_REGISTRY,
  isConfigured,
  listServices,
  type ServiceDescriptor,
  type ServiceId,
} from "./service-registry";

export type HealthStatus = "ok" | "degraded" | "down" | "not_configured";

export type ServiceHealth = {
  id: ServiceId;
  label: string;
  status: HealthStatus;
  latencyMs: number | null;
  detail: string;
  fallbackBehavior: string;
  configured: boolean;
  circuit: {
    state: "closed" | "open" | "half_open" | "unknown";
    consecutiveFailures: number;
    lastErrorMessage: string | null;
  };
};

const PROBE_TIMEOUT_MS = 4000;

async function timeIt<T>(fn: () => Promise<T>): Promise<{ result: T; ms: number }> {
  const start = Date.now();
  const result = await fn();
  return { result, ms: Date.now() - start };
}

async function probeGemini(): Promise<{ status: HealthStatus; detail: string; latencyMs: number | null }> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey || apiKey === "dummy") {
    return { status: "not_configured", detail: "GEMINI_API_KEY unset; RAG-only fallback in use.", latencyMs: null };
  }
  try {
    const { result, ms } = await timeIt(async () => {
      const res = await fetchWithTimeout(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
        { method: "GET", timeoutMs: PROBE_TIMEOUT_MS }
      );
      return res;
    });
    if (result.ok) return { status: "ok", detail: `models endpoint ${result.status}`, latencyMs: ms };
    if (result.status === 429) return { status: "degraded", detail: "quota / rate limit", latencyMs: ms };
    return { status: "down", detail: `HTTP ${result.status}`, latencyMs: ms };
  } catch (err) {
    return { status: "down", detail: err instanceof Error ? err.message : String(err), latencyMs: null };
  }
}

async function probeFormspree(): Promise<{ status: HealthStatus; detail: string; latencyMs: number | null }> {
  const id = process.env.NEXT_PUBLIC_FORMSPREE_ID;
  if (!id) {
    return { status: "not_configured", detail: "NEXT_PUBLIC_FORMSPREE_ID unset; contact form uses /api/contact only.", latencyMs: null };
  }
  try {
    const { result, ms } = await timeIt(() =>
      fetchWithTimeout("https://formspree.io/", { method: "HEAD", timeoutMs: PROBE_TIMEOUT_MS })
    );
    // 200 or 405 (HEAD not allowed) both prove TCP+TLS is healthy.
    if (result.ok || result.status === 405) return { status: "ok", detail: `reachable (${result.status})`, latencyMs: ms };
    return { status: "degraded", detail: `HTTP ${result.status}`, latencyMs: ms };
  } catch (err) {
    return { status: "down", detail: err instanceof Error ? err.message : String(err), latencyMs: null };
  }
}

async function probeResend(): Promise<{ status: HealthStatus; detail: string; latencyMs: number | null }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { status: "not_configured", detail: "RESEND_API_KEY unset; submissions are logged for manual handling.", latencyMs: null };
  }
  try {
    const { result, ms } = await timeIt(() =>
      fetchWithTimeout("https://api.resend.com/domains", {
        method: "GET",
        headers: { Authorization: `Bearer ${apiKey}` },
        timeoutMs: PROBE_TIMEOUT_MS,
      })
    );
    if (result.ok) return { status: "ok", detail: `domains endpoint ${result.status}`, latencyMs: ms };
    if (result.status === 401 || result.status === 403) {
      return { status: "degraded", detail: `auth failed (${result.status})`, latencyMs: ms };
    }
    return { status: "down", detail: `HTTP ${result.status}`, latencyMs: ms };
  } catch (err) {
    return { status: "down", detail: err instanceof Error ? err.message : String(err), latencyMs: null };
  }
}

async function probeStripe(): Promise<{ status: HealthStatus; detail: string; latencyMs: number | null }> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return { status: "not_configured", detail: "STRIPE_SECRET_KEY unset; checkout returns 503.", latencyMs: null };
  }
  try {
    const { result, ms } = await timeIt(() =>
      fetchWithTimeout("https://api.stripe.com/v1/balance", {
        method: "GET",
        headers: { Authorization: `Bearer ${key}` },
        timeoutMs: PROBE_TIMEOUT_MS,
      })
    );
    if (result.ok) return { status: "ok", detail: `balance endpoint ${result.status}`, latencyMs: ms };
    return { status: "degraded", detail: `HTTP ${result.status}`, latencyMs: ms };
  } catch (err) {
    return { status: "down", detail: err instanceof Error ? err.message : String(err), latencyMs: null };
  }
}

async function probeVercelBlob(): Promise<{ status: HealthStatus; detail: string; latencyMs: number | null }> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return { status: "not_configured", detail: "BLOB_READ_WRITE_TOKEN unset; MHLW search uses bundled data.", latencyMs: null };
  }
  try {
    const { result, ms } = await timeIt(async () => {
      const { list } = await import("@vercel/blob");
      return list({ prefix: "mhlw-accidents/", limit: 1, token });
    });
    if (result.blobs.length >= 0) return { status: "ok", detail: `listed ${result.blobs.length} blob(s)`, latencyMs: ms };
    return { status: "degraded", detail: "list returned empty payload", latencyMs: ms };
  } catch (err) {
    return { status: "down", detail: err instanceof Error ? err.message : String(err), latencyMs: null };
  }
}

async function probeGa4(): Promise<{ status: HealthStatus; detail: string; latencyMs: number | null }> {
  if (!process.env.GA4_PROPERTY_ID || !process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    return { status: "not_configured", detail: "GA4 credentials unset; mock dashboard data is used.", latencyMs: null };
  }
  // Avoid running an expensive real GA4 query on every probe; mark as configured/ok.
  return { status: "ok", detail: "credentials present (no live query in probe)", latencyMs: null };
}

async function probeGsc(): Promise<{ status: HealthStatus; detail: string; latencyMs: number | null }> {
  if (!process.env.INDEXNOW_KEY) {
    return { status: "not_configured", detail: "INDEXNOW_KEY unset; sitemap pings are skipped.", latencyMs: null };
  }
  try {
    const { result, ms } = await timeIt(() =>
      fetchWithTimeout("https://api.indexnow.org/indexnow", {
        method: "HEAD",
        timeoutMs: PROBE_TIMEOUT_MS,
      })
    );
    if (result.ok || result.status === 405 || result.status === 400) {
      return { status: "ok", detail: `reachable (${result.status})`, latencyMs: ms };
    }
    return { status: "degraded", detail: `HTTP ${result.status}`, latencyMs: ms };
  } catch (err) {
    return { status: "down", detail: err instanceof Error ? err.message : String(err), latencyMs: null };
  }
}

async function probeOpenMeteo(): Promise<{ status: HealthStatus; detail: string; latencyMs: number | null }> {
  try {
    const { result, ms } = await timeIt(() =>
      fetchWithTimeout(
        "https://api.open-meteo.com/v1/forecast?latitude=35.69&longitude=139.69&daily=weather_code&timezone=Asia%2FTokyo&forecast_days=1",
        { method: "GET", timeoutMs: PROBE_TIMEOUT_MS }
      )
    );
    if (result.ok) return { status: "ok", detail: `forecast endpoint ${result.status}`, latencyMs: ms };
    return { status: "degraded", detail: `HTTP ${result.status}`, latencyMs: ms };
  } catch (err) {
    return { status: "down", detail: err instanceof Error ? err.message : String(err), latencyMs: null };
  }
}

async function probeGoogleNewsRss(): Promise<{ status: HealthStatus; detail: string; latencyMs: number | null }> {
  try {
    const { result, ms } = await timeIt(() =>
      fetchWithTimeout("https://news.google.com/rss/search?q=%E5%8A%B4%E5%83%8D%E5%AE%89%E5%85%A8&hl=ja", {
        method: "HEAD",
        timeoutMs: PROBE_TIMEOUT_MS,
      })
    );
    if (result.ok || result.status === 405) return { status: "ok", detail: `reachable (${result.status})`, latencyMs: ms };
    return { status: "degraded", detail: `HTTP ${result.status}`, latencyMs: ms };
  } catch (err) {
    return { status: "down", detail: err instanceof Error ? err.message : String(err), latencyMs: null };
  }
}

async function probeSupabase(): Promise<{ status: HealthStatus; detail: string; latencyMs: number | null }> {
  if (!process.env.DATABASE_URL) {
    return { status: "not_configured", detail: "DATABASE_URL unset; subscription persistence is skipped.", latencyMs: null };
  }
  // Don't run a live SQL query here; presence of DATABASE_URL is the most we can
  // safely check from a serverless probe without warming a Prisma client per hit.
  return { status: "ok", detail: "DATABASE_URL present (no live query in probe)", latencyMs: null };
}

const PROBES: Record<ServiceId, () => Promise<{ status: HealthStatus; detail: string; latencyMs: number | null }>> = {
  gemini: probeGemini,
  formspree: probeFormspree,
  resend: probeResend,
  stripe: probeStripe,
  "vercel-blob": probeVercelBlob,
  ga4: probeGa4,
  gsc: probeGsc,
  "open-meteo": probeOpenMeteo,
  "google-news-rss": probeGoogleNewsRss,
  supabase: probeSupabase,
};

function buildResult(desc: ServiceDescriptor, probe: { status: HealthStatus; detail: string; latencyMs: number | null }): ServiceHealth {
  const snap = getSnapshot(desc.id);
  return {
    id: desc.id,
    label: desc.label,
    status: probe.status,
    latencyMs: probe.latencyMs,
    detail: probe.detail,
    fallbackBehavior: desc.fallbackBehavior,
    configured: isConfigured(desc.id),
    circuit: snap
      ? {
          state: snap.state,
          consecutiveFailures: snap.consecutiveFailures,
          lastErrorMessage: snap.lastErrorMessage,
        }
      : { state: "unknown", consecutiveFailures: 0, lastErrorMessage: null },
  };
}

export async function checkAllServices(): Promise<ServiceHealth[]> {
  const services = listServices();
  const results = await Promise.all(
    services.map(async (desc) => {
      try {
        const probe = await PROBES[desc.id]();
        return buildResult(desc, probe);
      } catch (err) {
        return buildResult(desc, {
          status: "down",
          detail: err instanceof Error ? err.message : String(err),
          latencyMs: null,
        });
      }
    })
  );
  return results;
}

export async function checkService(id: ServiceId): Promise<ServiceHealth> {
  const desc = SERVICE_REGISTRY[id];
  try {
    const probe = await PROBES[id]();
    return buildResult(desc, probe);
  } catch (err) {
    return buildResult(desc, {
      status: "down",
      detail: err instanceof Error ? err.message : String(err),
      latencyMs: null,
    });
  }
}
