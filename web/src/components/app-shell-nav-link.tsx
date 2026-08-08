"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";

export function isAppShellPathActive(pathname: string, href: string): boolean {
  const targetPath = href.split(/[?#]/u, 1)[0] || "/";
  return targetPath === "/"
    ? pathname === "/"
    : pathname === targetPath || pathname.startsWith(`${targetPath}/`);
}

type AppShellNavLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
};

/**
 * Nextの現在pathnameだけを正本にするナビリンク。
 * SSRとhydrationで同じ属性を描画し、SPA遷移・戻る・進むにも追従する。
 */
export function AppShellNavLink({ href, ...props }: AppShellNavLinkProps) {
  const pathname = usePathname() ?? "";
  const active = isAppShellPathActive(pathname, href);

  return (
    <Link
      {...props}
      href={href}
      data-app-shell-nav-href={href}
      data-nav-active={String(active)}
      aria-current={active ? "page" : undefined}
    />
  );
}
