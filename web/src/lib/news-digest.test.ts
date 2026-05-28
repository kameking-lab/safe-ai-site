import { describe, it, expect } from "vitest";
import { buildMonthlyDigest } from "@/lib/news-digest";
import type { NewsHubItem } from "@/lib/news-hub-types";

const items: NewsHubItem[] = [
  { id: "l1", category: "law-revision", title: "安衛則改正A", summary: "x", date: "2026-06-01", url: "https://laws.e-gov.go.jp/law/X", badge: "施行前（あと3日）" },
  { id: "l2", category: "law-revision", title: "安衛法改正B", summary: "y", date: "2026-04-01", url: "https://laws.e-gov.go.jp/law/Y", badge: "施行済" },
  { id: "a1", category: "accident", title: "月次速報", summary: "z", date: "2026-05-27", url: "https://anzeninfo.mhlw.go.jp/" },
  { id: "n1", category: "notice", title: "通達C <test>", summary: "w", date: "2026-05-20", url: "https://www.mhlw.go.jp/" },
];

describe("P3-1 月次ダイジェスト本文", () => {
  const d = buildMonthlyDigest({ items, monthLabel: "2026年5月" });

  it("件名に月ラベルと施行前件数を含む", () => {
    expect(d.subject).toContain("2026年5月");
    expect(d.subject).toContain("施行前1件");
  });

  it("本文に法改正・事故・通達と公式リンクを含む", () => {
    expect(d.text).toContain("安衛則改正A");
    expect(d.text).toContain("月次速報");
    expect(d.text).toContain("https://laws.e-gov.go.jp/law/X");
  });

  it("解除導線（ワンクリック）を必ず含む", () => {
    expect(d.text).toContain("配信停止");
    expect(d.html).toContain("配信停止");
  });

  it("HTMLはエスケープされる", () => {
    expect(d.html).toContain("通達C &lt;test&gt;");
    expect(d.html).not.toContain("通達C <test>");
  });

  it("カスタム解除URLを使える", () => {
    const d2 = buildMonthlyDigest({ items, monthLabel: "2026年5月", unsubscribeUrl: "https://x/unsub?t=abc" });
    expect(d2.text).toContain("https://x/unsub?t=abc");
  });
});
