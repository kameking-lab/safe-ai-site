"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { HUB_PATH, isLibraryPath, listStorageKey, RETURN_PATH_KEY } from "./library-navigation";

export function SafetyImageLibraryReturnLink() {
  const [href, setHref] = useState(HUB_PATH);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("fromLibrary") !== "1") return;
    try {
      const saved = window.sessionStorage.getItem(RETURN_PATH_KEY);
      if (saved && isLibraryPath(saved)) window.setTimeout(() => setHref(saved), 0);
    } catch {
      // The ordinary hub link remains available without session storage.
    }
  }, []);

  return (
    <Link href={href} onClick={() => {
      if (new URLSearchParams(window.location.search).get("fromLibrary") === "1") return;
      try { window.sessionStorage.removeItem(listStorageKey(HUB_PATH)); } catch { /* ordinary link still works */ }
    }} className="inline-flex min-h-11 items-center gap-1 text-sm font-black text-emerald-800 underline underline-offset-4 dark:text-emerald-300">
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />現場安全看板ライブラリへ
    </Link>
  );
}
