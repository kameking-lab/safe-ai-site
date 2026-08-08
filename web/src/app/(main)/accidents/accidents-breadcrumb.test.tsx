import { describe, expect, it } from "vitest";
import AccidentSearchLayout from "./layout";

describe("/accidents サイト内検索境界", () => {
  it("PF-009: 検索語を失う恒久転送を行わず、サイト内検索を描画する", () => {
    const child = <div>サイト内事故検索</div>;
    const result = AccidentSearchLayout({
      children: child,
    });
    expect(result).toBe(child);
  });
});
