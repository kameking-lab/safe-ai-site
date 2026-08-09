/**
 * Public-route allowlist / quarantine boundary.
 *
 * A route is listed here only when a currently reachable legacy implementation
 * must not be presented as a usable safety decision aid until its source
 * records and outcome logic have been independently re-verified.
 *
 * Keep dependencies limited to other pure policy modules so navigation,
 * search, sitemap and feature catalogs can apply the same fail-closed rule.
 */
import { isArticleQuarantined } from "@/lib/article-quarantine";

export const PUBLIC_CONSTRUCTION_CALCULATOR_SLUGS = [
  "soil-volume-conversion",
  "slope-ratio-convert",
  "rebar-mass",
  "concrete-volume",
] as const;

const publicCalculatorSlugs = new Set<string>(
  PUBLIC_CONSTRUCTION_CALCULATOR_SLUGS,
);

export const PUBLIC_SAFETY_LEARNING_PATHS = [
  "/e-learning/safety",
  "/e-learning/safety/first-class-health-officer",
  "/e-learning/safety/second-class-health-officer",
  "/e-learning/safety/occupational-safety-consultant",
  "/e-learning/safety/occupational-health-consultant",
] as const;

const publicSafetyLearningPaths = new Set<string>(
  PUBLIC_SAFETY_LEARNING_PATHS,
);

export function isPublicConstructionCalculatorSlug(slug: string): boolean {
  return publicCalculatorSlugs.has(slug);
}

function pathOnly(href: string): string {
  const value = href.trim();
  if (!value.startsWith("/")) return value;
  return value.split(/[?#]/, 1)[0] || "/";
}

function isPublishedSafetyLearningPath(path: string): boolean {
  const normalized = path.length > 1 ? path.replace(/\/+$/u, "") : path;
  return publicSafetyLearningPaths.has(normalized);
}

export function isQuarantinedPublicPath(href: string): boolean {
  const path = pathOnly(href);

  if (
    path === "/faq" ||
    path.startsWith("/faq/") ||
    ((path === "/e-learning" || path.startsWith("/e-learning/")) &&
      !isPublishedSafetyLearningPath(path)) ||
    path === "/work-environment-measurement" ||
    path.startsWith("/work-environment-measurement/") ||
    path === "/health-checkup-scheduler" ||
    path.startsWith("/health-checkup-scheduler/") ||
    path === "/accidents-reports" ||
    path.startsWith("/accidents-reports/") ||
    path === "/accidents-analytics" ||
    path.startsWith("/accidents-analytics/") ||
    (path.startsWith("/accidents/") && path !== "/accidents/mhlw-100620") ||
    path === "/strategy/plan-generator" ||
    path.startsWith("/strategy/plan-generator/") ||
    path === "/risk-prediction" ||
    path.startsWith("/risk-prediction/") ||
    path === "/industries" ||
    path.startsWith("/industries/") ||
    path === "/guides/industry-accident-reports" ||
    path === "/guides/annual-safety-plan-generator" ||
    (path.startsWith("/heat-illness-prevention/") &&
      path !== "/heat-illness-prevention/slides" &&
      path !== "/heat-illness-prevention/elearning") ||
    path === "/features/comparison" ||
    path === "/features/quick-tour" ||
    path === "/features/use-cases" ||
    path === "/features/print" ||
    path === "/pricing" ||
    path === "/leaflet" ||
    path === "/safety-signs" ||
    path.startsWith("/safety-signs/") ||
    path === "/treatment-work-balance/plan-builder" ||
    path.startsWith("/treatment-work-balance/plan-builder/") ||
    path === "/mental-health-management" ||
    path.startsWith("/mental-health-management/") ||
    path === "/mental-health" ||
    path.startsWith("/mental-health/") ||
    path === "/asbestos-management" ||
    path.startsWith("/asbestos-management/") ||
    path === "/diversity" ||
    path.startsWith("/diversity/")
  ) {
    return true;
  }

  if (path === "/education" || path.startsWith("/education/")) {
    return true;
  }

  if (path === "/court-cases" || path.startsWith("/court-cases/")) {
    return true;
  }

  const calculatorMatch = path.match(/^\/construction-calc\/([^/]+)$/);
  if (
    calculatorMatch &&
    !isPublicConstructionCalculatorSlug(calculatorMatch[1])
  ) {
    return true;
  }

  const articleMatch = path.match(/^\/articles\/([^/]+)$/);
  if (articleMatch && isArticleQuarantined(articleMatch[1])) {
    return true;
  }

  return false;
}

export function isPublicRouteAvailable(href: string): boolean {
  return !isQuarantinedPublicPath(href);
}
