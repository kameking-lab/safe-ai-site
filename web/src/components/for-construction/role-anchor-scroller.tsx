"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

const ROLE_TO_ANCHOR: Record<string, string> = {
  foreman: "for-foreman",
  manager: "for-manager",
  supervisor: "for-supervisor",
};

export function RoleAnchorScroller() {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!searchParams) return;
    const role = searchParams.get("role");
    if (!role) return;
    const anchorId = ROLE_TO_ANCHOR[role];
    if (!anchorId) return;
    const el = document.getElementById(anchorId);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    el.focus({ preventScroll: true });
  }, [searchParams]);

  return null;
}
