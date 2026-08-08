import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("AppShell navigation safeguards", () => {
  const shellSource = readFileSync(
    resolve(process.cwd(), "src/components/app-shell.tsx"),
    "utf8",
  );
  const interactionScriptSource = readFileSync(
    resolve(process.cwd(), "src/lib/app-shell-interactions-script.ts"),
    "utf8",
  );
  const navigationSource = readFileSync(
    resolve(process.cwd(), "src/components/app-shell-navigation.tsx"),
    "utf8",
  );
  const layoutSource = readFileSync(
    resolve(process.cwd(), "src/app/layout.tsx"),
    "utf8",
  );

  it("常設ナビゲーションで全リンクの自動prefetchを発生させない", () => {
    expect(navigationSource).toContain("prefetch={false}");
  });

  it("モバイルメニューは44px標的・focus trap・Escape・フォーカス復帰を備える", () => {
    expect(shellSource).toContain("h-[44px]");
    expect(shellSource).toContain("min-w-[76px]");
    expect(shellSource).toContain('aria-controls="mobile-site-menu"');
    expect(interactionScriptSource).toContain("event.key!=='Escape'");
    expect(interactionScriptSource).toContain("event.key==='Tab'");
    expect(interactionScriptSource).toContain("summary.focus()");
  });

  it("大きなナビ登録簿と表示設定をReact client islandへ含めない", () => {
    expect(shellSource).not.toContain('"use client"');
    expect(interactionScriptSource).not.toContain("NAV_CATEGORIES");
    expect(interactionScriptSource).not.toContain("SITE_STATS");
    expect(navigationSource).not.toContain('"use client"');
  });

  it("JavaScript無効時は操作不能な表示設定を露出しない", () => {
    expect(shellSource.match(/data-display-settings/g)).toHaveLength(2);
    expect(layoutSource).toContain(
      "[data-display-settings]{display:none!important}",
    );
  });
});
