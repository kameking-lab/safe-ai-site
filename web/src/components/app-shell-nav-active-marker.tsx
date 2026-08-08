"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Server-rendered navigationへ現在地だけを付与する小さなclient island。
 * ナビ本文・説明・アイコンをclient module graphへ戻さない。
 */
export function AppShellNavActiveMarker() {
  const pathname = usePathname();

  useEffect(() => {
    const links = document.querySelectorAll<HTMLAnchorElement>(
      "a[data-app-shell-nav-href]",
    );
    for (const link of links) {
      const href = link.dataset.appShellNavHref ?? "";
      const active = isActive(pathname, href);
      link.dataset.navActive = String(active);
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    }
  }, [pathname]);

  return null;
}
