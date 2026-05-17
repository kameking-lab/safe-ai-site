/**
 * Canonical names + display metadata for every external dependency the site
 * relies on. The /admin/health dashboard and the circuit breakers both key
 * off these IDs, so add new services here when they're introduced.
 */
export type ServiceId =
  | "gemini"
  | "formspree"
  | "resend"
  | "stripe"
  | "vercel-blob"
  | "ga4"
  | "gsc"
  | "open-meteo"
  | "google-news-rss"
  | "supabase";

export type ServiceCriticality = "core" | "important" | "best-effort";

export type ServiceDescriptor = {
  id: ServiceId;
  /** Short human label, e.g. "Gemini API". */
  label: string;
  /** What the site shows or skips when this service fails. Keep concise. */
  fallbackBehavior: string;
  /** Server env vars that must be set to enable real calls. Empty = no key needed. */
  envVars: string[];
  /** Site impact tier when degraded. */
  criticality: ServiceCriticality;
};

export const SERVICE_REGISTRY: Record<ServiceId, ServiceDescriptor> = {
  gemini: {
    id: "gemini",
    label: "Gemini AI",
    fallbackBehavior:
      "RAG hits and pre-curated MHLW data are returned without AI generation; existing templated answers are surfaced for safety alerts and quiz explanations.",
    envVars: ["GEMINI_API_KEY"],
    criticality: "important",
  },
  formspree: {
    id: "formspree",
    label: "Formspree",
    fallbackBehavior:
      "Contact form posts still succeed against the in-house /api/contact endpoint; Formspree email archival is fire-and-forget and silently retried.",
    envVars: ["NEXT_PUBLIC_FORMSPREE_ID"],
    criticality: "best-effort",
  },
  resend: {
    id: "resend",
    label: "Resend (transactional email)",
    fallbackBehavior:
      "Submission is still acknowledged to the user; payload is written to server logs for manual processing.",
    envVars: ["RESEND_API_KEY"],
    criticality: "important",
  },
  stripe: {
    id: "stripe",
    label: "Stripe",
    fallbackBehavior:
      "Checkout endpoints return 503 with a human message; the rest of the site (including pricing pages) remains accessible.",
    envVars: ["STRIPE_SECRET_KEY"],
    criticality: "important",
  },
  "vercel-blob": {
    id: "vercel-blob",
    label: "Vercel Blob (MHLW corpus)",
    fallbackBehavior:
      "Accident search falls back to the in-bundle aggregates dataset; the search UI shows a degraded-mode banner.",
    envVars: ["BLOB_READ_WRITE_TOKEN"],
    criticality: "important",
  },
  ga4: {
    id: "ga4",
    label: "Google Analytics 4 Data API",
    fallbackBehavior: "Stats dashboard renders mock data with a clearly labelled fallback source.",
    envVars: ["GA4_PROPERTY_ID", "GOOGLE_APPLICATION_CREDENTIALS_JSON"],
    criticality: "best-effort",
  },
  gsc: {
    id: "gsc",
    label: "Google Search Console",
    fallbackBehavior: "Search Console widgets render mock data; IndexNow notifications are skipped.",
    envVars: ["INDEXNOW_KEY"],
    criticality: "best-effort",
  },
  "open-meteo": {
    id: "open-meteo",
    label: "Open-Meteo Weather",
    fallbackBehavior:
      "Weather widgets display 'unavailable' state with cached regional advisories; safety scoring uses neutral baseline.",
    envVars: [],
    criticality: "best-effort",
  },
  "google-news-rss": {
    id: "google-news-rss",
    label: "Google News RSS",
    fallbackBehavior:
      "Signage continues to rotate the curated headline pool; latest items are skipped.",
    envVars: [],
    criticality: "best-effort",
  },
  supabase: {
    id: "supabase",
    label: "Supabase / Postgres",
    fallbackBehavior:
      "Auth and subscription persistence are skipped; JWT-only flows continue to work.",
    envVars: ["DATABASE_URL"],
    criticality: "important",
  },
};

export function listServices(): ServiceDescriptor[] {
  return Object.values(SERVICE_REGISTRY);
}

export function isConfigured(id: ServiceId): boolean {
  const desc = SERVICE_REGISTRY[id];
  if (desc.envVars.length === 0) return true;
  return desc.envVars.every((name) => {
    const value = process.env[name];
    return typeof value === "string" && value.trim().length > 0 && value !== "dummy";
  });
}
