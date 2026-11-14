"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function MembershipRefreshButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  async function refresh() {
    if (loading || pending) return;
    setLoading(true); setMessage("");
    try {
      const response = await fetch("/api/me/entitlements?refresh=1", { cache: "no-store", signal: AbortSignal.timeout(25000) });
      const member = await response.json();
      if (!response.ok || member.syncState !== "verified" || !["free", "pro"].includes(member.plan)) throw new Error("unverified");
      startTransition(() => router.refresh());
      setMessage("最新の状態です。");
    } catch { setMessage("会員情報を確認できませんでした。もう一度お試しください。"); }
    finally { setLoading(false); }
  }
  const busy = loading || pending;
  return <div className="mt-4 text-sm">
    <button type="button" disabled={busy} aria-busy={busy} onClick={() => void refresh()} className="min-h-11 rounded-lg border border-slate-400 px-4 font-semibold disabled:opacity-60">
      {busy ? "会員情報を読み込み中…" : "会員情報を再読み込み"}
    </button>
    <p role="status" className="mt-1 min-h-6">{busy ? "会員情報を読み込み中です…" : message}</p>
  </div>;
}
