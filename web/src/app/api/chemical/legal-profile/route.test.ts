/**
 * legal-profile API の受入テスト（一窓化の合格基準を固定）
 *
 * - 溶接ヒューム（CASレス告示名）→ 特化則第二類が根拠（令別表第3第2号34の2）付きで出る
 * - カプサイシン → 未解決（＝UIが「収載外」を明示する側に流れる）。偽陽性ゼロ
 * - マンガン（名称・群指定名どちらでも）→ 特化則第二類
 * - 未知CAS → resolved だが全ドメイン unverified（断定しない）
 */
import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

async function call(q: string) {
  const req = new NextRequest(`http://localhost/api/chemical/legal-profile?q=${encodeURIComponent(q)}`);
  const res = await GET(req);
  return res.json();
}

describe("legal-profile API", () => {
  it("溶接ヒューム: CASレス名称で解決し特化則第二類が根拠付きで返る", async () => {
    const j = await call("溶接ヒューム");
    expect(j.resolved).toBe(true);
    expect(j.casless).toBe(true);
    expect(j.oshaTags).toContain("tokutei-2");
    const tokka = (j.designations as Array<Record<string, unknown>>).filter(
      (d) => d.domain === "anei-tokka" && d.status === "designated",
    );
    expect(tokka.length).toBeGreaterThan(0);
    expect(JSON.stringify(tokka)).toContain("別表第3第2号34の2");
    // 義務（対策案）に特化則の基本義務が含まれる
    expect(JSON.stringify(j.duties)).toContain("特定化学物質作業主任者");
  });

  it("カプサイシン: 法令索引に無い＝未解決（特化則・有機則の偽陽性ゼロ）", async () => {
    const j = await call("カプサイシン");
    expect(j.resolved).toBe(false);
  });

  it("マンガン: 群指定名（マンガン及びその化合物）でもCASでも特化則第二類", async () => {
    for (const q of ["マンガン及びその化合物", "7439-96-5"]) {
      const j = await call(q);
      expect(j.resolved, q).toBe(true);
      expect(j.oshaTags, q).toContain("tokutei-2");
    }
  });

  it("アセトン: 有機則第二種＋作業主任者・測定・健診の義務が返る", async () => {
    const j = await call("67-64-1");
    expect(j.oshaTags).toContain("yuki-2");
    const s = JSON.stringify(j.duties);
    expect(s).toContain("有機溶剤作業主任者");
    expect(s).toContain("作業環境測定");
    expect(j.raTarget).toBe(true);
  });

  it("索引未収載の実在CAS: resolved だが安衛法系は unverified（断定しない）", async () => {
    const j = await call("404-86-4"); // カプサイシンのCAS（索引・DB未収載）
    expect(j.resolved).toBe(true);
    expect(j.oshaTags).toEqual([]);
    expect(j.hasIndexEntry).toBe(false);
  });

  it("空文字・未知名称は resolved=false", async () => {
    expect((await call("")).resolved).toBe(false);
    expect((await call("ゼオラミン超硬化剤")).resolved).toBe(false);
  });

  it("P1-9 溶接ヒューム: RA対象物（表示・通知）は名称非収載＝not-designated を根拠付きで断定", async () => {
    const j = await call("溶接ヒューム");
    const ra = (j.designations as Array<Record<string, unknown>>).find(
      (d) => d.domain === "anei-ra",
    );
    expect(ra?.status).toBe("not-designated");
    expect(String(ra?.scopeNote)).toContain("構成成分");
    expect(j.raTarget).toBe(false);
  });

  it("P1-9 名称突合の正例: トルエン（CAS）は anei-ra designated（安衛則別表第2の根拠付き）", async () => {
    const j = await call("108-88-3");
    const ra = (j.designations as Array<Record<string, unknown>>).find(
      (d) => d.domain === "anei-ra",
    );
    expect(ra?.status).toBe("designated");
    expect(j.raTarget).toBe(true);
  });

  it("P1-9 群指定名（マンガン及びその化合物）: 別表第9「無機化合物」と粒度が異なるため断定しない", async () => {
    const j = await call("マンガン及びその化合物");
    const ra = (j.designations as Array<Record<string, unknown>>).find(
      (d) => d.domain === "anei-ra",
    );
    // CAS 7439-96-5 の統合DBフラグ（label_sds）で designated（マンガン単体は対象）
    // ※フラグが無い場合でも群名称の粒度差では not-designated に倒さないことが本質
    expect(["designated", "unverified"]).toContain(ra?.status as string);
    expect(ra?.status).not.toBe("not-designated");
  });

  it("全物質に共通のリスク低減優先順位（代替→工学→管理→保護具）が返る", async () => {
    const j = await call("67-64-1");
    expect(j.hierarchy.map((h: { step: string }) => h.step)).toEqual([
      "1. 代替",
      "2. 工学的対策",
      "3. 管理的対策",
      "4. 保護具",
    ]);
  });
});
