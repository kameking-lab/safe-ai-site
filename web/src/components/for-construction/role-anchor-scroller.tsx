"use client";

import { useEffect } from "react";

const ROLE_TO_ANCHOR: Record<string, string> = {
  foreman: "for-foreman",
  manager: "for-manager",
  supervisor: "for-supervisor",
};

export function RoleAnchorScroller() {
  // C-1: useSearchParams を使うと CSR ベイルアウトで静的プリレンダーが最寄りの
  // Suspense 境界（このページでは app/loading.tsx）へ落ち、本文全体が
  // 「スケルトン先行ペイント→クライアント差し替え」になる。?role= はマウント後の
  // スクロール挙動にしか使わないため、window.location から1回読む。
  useEffect(() => {
    const role = new URLSearchParams(window.location.search).get("role");
    if (!role) return;
    const anchorId = ROLE_TO_ANCHOR[role];
    if (!anchorId) return;
    const el = document.getElementById(anchorId);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    el.focus({ preventScroll: true });
  }, []);

  return null;
}
