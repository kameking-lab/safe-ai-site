"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";

const NotificationBell = dynamic(() =>
  import("@/components/notifications/notification-bell").then(
    (module) => module.NotificationBell,
  ),
);
const BACKGROUND_LOAD_DELAY_MS = 20_000;

/**
 * 通知一覧・気象由来表示・localStorage処理は、ベルを押した時だけ即時取得する。
 * 押さない場合も20秒後に従来の通知センターへ置換し、常時表示機能を失わない。
 */
export function NotificationBellTrigger() {
  const [activated, setActivated] = useState(false);
  const [openWhenReady, setOpenWhenReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setActivated(true),
      BACKGROUND_LOAD_DELAY_MS,
    );
    return () => window.clearTimeout(timer);
  }, []);

  if (activated) {
    return <NotificationBell initialOpen={openWhenReady} />;
  }

  return (
    <button
      type="button"
      onClick={() => {
        setOpenWhenReady(true);
        setActivated(true);
      }}
      aria-haspopup="dialog"
      aria-expanded="false"
      aria-label="通知センター"
      data-testid="notification-bell"
      className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
    >
      <Bell className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}
