#!/usr/bin/env node
/** Warm the Next dev server by hitting each page once via fetch. */
const PAGES = [
  "/",
  "/about",
  "/accidents",
  "/accidents-analytics",
  "/accidents-reports",
  "/articles",
  "/asbestos-management",
  "/bcp",
  "/chatbot",
  "/chemical-database",
  "/chemical-ra",
  "/circulars",
  "/community-cases",
  "/contact",
  "/diversity",
  "/e-learning",
  "/education",
  "/equipment",
  "/equipment-finder",
  "/exam-quiz",
  "/faq",
  "/features",
  "/foreign-workers",
  "/glossary",
  "/goods",
  "/handover",
  "/heat-illness-prevention",
  "/industries",
  "/insurance",
  "/ky",
  "/law-hierarchy",
  "/law-search",
  "/laws",
  "/mental-health",
  "/notifications",
  "/pricing",
  "/qa-knowledge",
  "/risk-prediction",
  "/safety-diary",
  "/safety-signs",
];
const BASE = process.env.AUDIT_BASE || "http://127.0.0.1:3000";
for (const p of PAGES) {
  const t0 = Date.now();
  let status = "?";
  try {
    const r = await fetch(BASE + p, { redirect: "manual" });
    status = String(r.status);
  } catch (e) {
    status = "err:" + (e.message || e).toString().slice(0, 60);
  }
  const dt = Date.now() - t0;
  console.log(`${status} ${dt}ms ${p}`);
}
