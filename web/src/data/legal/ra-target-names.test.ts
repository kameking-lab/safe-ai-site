/**
 * RA対象物 名称該否層（P1-9）のCIゲート
 *
 * - 件数アンカー: 令別表第9=33群 / 安衛則別表第2=2,276名称（改正時はETL再実行で更新。緩めるの禁止）
 * - 3値判定の代表例を固定（溶接ヒューム=非該当断定・群名称の粒度差=unverified 維持）
 */
import { describe, expect, it } from "vitest";
import { checkRaTargetByName, RA_TARGET_NAMES_META } from "./ra-target-names";

describe("RA対象物 名称スナップショットの件数アンカー", () => {
  it("令別表第9=33群・安衛則別表第2=2,276名称（2026-07-01施行版）", () => {
    expect(RA_TARGET_NAMES_META.reiBeppyo9.count).toBe(33);
    expect(RA_TARGET_NAMES_META.kisokuBeppyo2.count).toBe(2276);
    expect(RA_TARGET_NAMES_META.reiBeppyo9.revisionId).toContain("347CO0000000318");
    expect(RA_TARGET_NAMES_META.kisokuBeppyo2.revisionId).toContain("347M50002000032");
  });
});

describe("checkRaTargetByName の3値判定", () => {
  it("個別名称の正例: トルエン → designated（安衛則別表第2）", () => {
    const r = checkRaTargetByName("トルエン");
    expect(r.status).toBe("designated");
    expect(r.basis?.provision).toContain("安衛則別表第2");
  });

  it("群名称の正例: マンガン及びその無機化合物 → designated（令別表第9第30号）", () => {
    const r = checkRaTargetByName("マンガン及びその無機化合物");
    expect(r.status).toBe("designated");
    expect(r.basis?.provision).toBe("安衛令別表第9 第30号");
  });

  it("溶接ヒューム: 両別表に名称非収載 → not-designated（構成成分の注記つき断定）", () => {
    const r = checkRaTargetByName("溶接ヒューム");
    expect(r.status).toBe("not-designated");
    expect(r.scopeNote).toContain("構成成分");
  });

  it("カプサイシン: 両別表に名称非収載 → not-designated（AIの「表示・通知義務」言及は幻覚と確定）", () => {
    expect(checkRaTargetByName("カプサイシン").status).toBe("not-designated");
  });

  it("群名称の粒度差: マンガン及びその化合物 → unverified（無機化合物との異同を名称一致で断定しない）", () => {
    expect(checkRaTargetByName("マンガン及びその化合物").status).toBe("unverified");
  });

  it("CAS番号などの非名称ラベル → unverified（非該当に倒さない）", () => {
    expect(checkRaTargetByName("404-86-4").status).toBe("unverified");
    expect(checkRaTargetByName("").status).toBe("unverified");
  });
});
