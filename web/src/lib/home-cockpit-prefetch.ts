"use client";

const prefetchedRoutes = new Set<string>();

type NetworkInformation = {
  saveData?: boolean;
  effectiveType?: string;
};

function shouldPrefetch(): boolean {
  if (typeof navigator === "undefined") return false;
  const connection = (
    navigator as Navigator & { connection?: NetworkInformation }
  ).connection;
  if (connection?.saveData) return false;
  return !["slow-2g", "2g"].includes(connection?.effectiveType ?? "");
}

export function prefetchCockpitRoute(
  router: { prefetch: (href: string) => void },
  route: "/risk" | "/chemical-ra" | "/chatbot" | "/heat-illness-prevention/slides",
): void {
  if (!shouldPrefetch() || prefetchedRoutes.has(route)) return;
  prefetchedRoutes.add(route);
  router.prefetch(route);
}
