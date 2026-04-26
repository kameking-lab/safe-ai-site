"use client";

import { Moon, Sun, MonitorSmartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { useTheme, type ThemeMode } from "@/lib/theme";

const LABELS: Record<ThemeMode, string> = {
  light: "ライトモード",
  dark: "ダークモード",
  system: "システム設定に追従",
};

const NEXT_HINT: Record<ThemeMode, string> = {
  light: "次: ダーク",
  dark: "次: 自動",
  system: "次: ライト",
};

export function ThemeToggle({
  className = "",
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md";
}) {
  const { theme, resolvedTheme, cycleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const dims =
    size === "sm"
      ? "h-8 w-8 [&_svg]:h-4 [&_svg]:w-4"
      : "h-9 w-9 [&_svg]:h-4 [&_svg]:w-4";

  // SSR時はライト固定で描画 → hydration後に実テーマへ
  const displayTheme: ThemeMode = mounted ? theme : "system";
  const Icon =
    displayTheme === "system"
      ? MonitorSmartphone
      : displayTheme === "dark" || (!mounted ? false : resolvedTheme === "dark")
        ? Moon
        : Sun;

  return (
    <button
      type="button"
      onClick={cycleTheme}
      aria-label={`テーマ切替（現在: ${LABELS[displayTheme]}・${NEXT_HINT[displayTheme]}）`}
      title={`${LABELS[displayTheme]}（${NEXT_HINT[displayTheme]}）`}
      className={`inline-flex shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white ${dims} ${className}`}
      suppressHydrationWarning
    >
      <Icon aria-hidden="true" />
    </button>
  );
}
