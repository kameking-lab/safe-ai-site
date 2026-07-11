"use client";

import { useEffect, useRef, useState } from "react";
import { levelLabel } from "@/lib/jma/jma-data";
import { levelFromWarningCode } from "@/lib/jma/parse-jma-warning";
import {
  osNotifyPermission,
  requestOsNotifyPermission,
  showOsNotification,
} from "@/lib/notifications/os-notify";

/**
 * サイネージの「画面表示中OS通知」（鍵なし通知ライト③）。
 *
 * 既存の15分ポーリング（refreshAll→bundle更新）に便乗し、選択地点の警報コードが
 * 増えたらOS通知を出す。常時表示TVの前に人がいなくても、同じ画面を開いている
 * 事務所PCのOS通知センターに履歴が残るのが狙い。
 * トグルは端末内保存（signage-danger-autospeak と同じ作法）。
 */

const STORAGE_KEY = "signage-os-notify";

/** 気象庁コード→区分名（signage/page.tsx の hintForJmaCode と同じ「捏造しない」方針） */
function hintForJmaCode(code: string): string {
  const level = levelFromWarningCode(code);
  return level && level !== "none" ? levelLabel(level) : `コード ${code}`;
}

type Props = {
  warnings?: { code: string; status: string }[] | null;
  regionLabel: string;
};

export function SignageOsNotifier({ warnings, regionLabel }: Props) {
  const [enabled, setEnabled] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  const prevCodes = useRef<Set<string> | null>(null);

  useEffect(() => {
    // 端末内トグルはSSRに存在しないためマウント後に読む
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnabled(window.localStorage.getItem(STORAGE_KEY) === "1");
    setPermission(osNotifyPermission());
  }, []);

  // 警報コードの増分を検知して通知（初回スナップショットは通知しない＝リロード時の再通知防止）
  useEffect(() => {
    const codes = new Set((warnings ?? []).map((w) => w.code));
    if (prevCodes.current === null) {
      prevCodes.current = codes;
      return;
    }
    const appeared = [...codes].filter((c) => !prevCodes.current!.has(c));
    prevCodes.current = codes;
    if (!enabled || permission !== "granted" || appeared.length === 0) return;
    for (const code of appeared) {
      const w = (warnings ?? []).find((x) => x.code === code);
      showOsNotification({
        id: `signage-jma-${code}-${Date.now()}`,
        category: "weather",
        title: `${regionLabel}: ${hintForJmaCode(code)}（${w?.status ?? "発表"}）`,
        body: "気象庁の警報・注意報が更新されました。サイネージ画面で詳細を確認してください。",
        date: new Date().toISOString(),
        internalHref: "/signage",
        severity: "warning",
      });
    }
  }, [warnings, enabled, permission, regionLabel]);

  const toggle = async () => {
    if (!enabled) {
      const p = await requestOsNotifyPermission();
      setPermission(p);
      if (p !== "granted") return;
      window.localStorage.setItem(STORAGE_KEY, "1");
      setEnabled(true);
    } else {
      window.localStorage.setItem(STORAGE_KEY, "0");
      setEnabled(false);
    }
  };

  if (permission === "unsupported") return null;

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      aria-pressed={enabled}
      data-testid="signage-os-notify-toggle"
      title="この端末で画面表示中に警報の増加をOS通知する（ブラウザを閉じている間は届きません）"
      className={`flex items-center rounded-lg border px-2 py-2.5 text-[10px] font-semibold min-h-[44px] ${
        enabled
          ? "border-emerald-500 bg-emerald-700 text-white"
          : "border-slate-600 bg-slate-900 text-slate-300 hover:bg-slate-800"
      }`}
    >
      🔔 OS通知{enabled ? " ON" : ""}
    </button>
  );
}
