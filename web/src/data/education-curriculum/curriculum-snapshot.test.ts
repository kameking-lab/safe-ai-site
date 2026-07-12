/**
 * カリキュラム正本レジストリのスナップショット整合テスト（企画 02章 保証4「正本の鮮度」）。
 *
 * 告示正本（e-Gov／MHLW法令等DB／JAISH）から 2026-07-12 に転記した科目名・範囲・時間を
 * ピン留めする。転記の改変（科目削除・時間改変・範囲の水増し）は CI で赤になる。
 * special-education.test.ts の OFFICIAL_ART36_ITEMS ／ DURATION_PINS と同型。
 */
import { describe, expect, it } from "vitest";
import { EDUCATION_CURRICULA } from "./registry";
import { getCurriculum, deriveGakkaHours, deriveJitsugiHours } from "./index";
import type { EducationCurriculum } from "./types";

describe("カリキュラム正本レジストリ: 整合", () => {
  it("curriculumId が一意", () => {
    const ids = EDUCATION_CURRICULA.map((c) => c.curriculumId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("初弾5教育が収載されている", () => {
    const ids = EDUCATION_CURRICULA.map((c) => c.curriculumId).sort();
    expect(ids).toEqual(
      [
        "circular-necchu",
        "se-36-26-oxygen",
        "se-36-29-dust",
        "se-36-4-teiatsu",
        "se-36-41-fullharness",
      ].sort(),
    );
  });

  it("全トラックで units 導出時間 == 宣言 totalGakkaHours/totalJitsugiHours（改変検知）", () => {
    for (const c of EDUCATION_CURRICULA) {
      for (const t of c.tracks) {
        expect(deriveGakkaHours(t), `${c.curriculumId}/${t.trackId} 学科合計`).toBe(
          t.totalGakkaHours,
        );
        const jitsugi = deriveJitsugiHours(t);
        expect(t.totalJitsugiHours ?? 0, `${c.curriculumId}/${t.trackId} 実技合計`).toBe(jitsugi);
      }
    }
  });

  it("全 scopeItems が非空・重複 unitId が無い", () => {
    for (const c of EDUCATION_CURRICULA) {
      const unitIds = c.tracks.flatMap((t) => t.units.map((u) => u.unitId));
      expect(new Set(unitIds).size, `${c.curriculumId} の unitId 重複`).toBe(unitIds.length);
      for (const t of c.tracks) {
        for (const u of t.units) {
          expect(u.scopeItems.length, `${u.unitId} の範囲が空`).toBeGreaterThan(0);
          for (const s of u.scopeItems) expect(s.trim().length).toBeGreaterThan(0);
        }
      }
    }
  });
});

describe("カリキュラム正本レジストリ: 時間数の法定合計ピン", () => {
  // 各告示正本の法定合計（2026-07-12 突合・special-education.ts DURATION_PINS と一致）
  const HOURS_PINS: Record<string, { gakka: number; jitsugi: number | null }> = {
    "se-36-41-fullharness|default": { gakka: 4.5, jitsugi: 1.5 },
    "circular-necchu|manager": { gakka: 3.75, jitsugi: null },
    "se-36-29-dust|default": { gakka: 4.5, jitsugi: null },
    "se-36-4-teiatsu|default": { gakka: 7, jitsugi: 7 },
    "se-36-26-oxygen|type-1": { gakka: 4, jitsugi: null },
    "se-36-26-oxygen|type-2": { gakka: 5.5, jitsugi: null },
  };

  it("宣言時間が正本ピンと一致する", () => {
    for (const [key, pin] of Object.entries(HOURS_PINS)) {
      const [cid, tid] = key.split("|");
      const track = getCurriculum(cid)?.tracks.find((t) => t.trackId === tid);
      expect(track, `${key} が無い`).toBeDefined();
      expect(track!.totalGakkaHours, `${key} 学科`).toBe(pin.gakka);
      expect(track!.totalJitsugiHours, `${key} 実技`).toBe(pin.jitsugi);
    }
  });
});

describe("カリキュラム正本レジストリ: 科目名の正本ピン", () => {
  it("フルハーネス（規程第24条）の学科4科目＋実技1科目が正本表記", () => {
    const fh = getCurriculum("se-36-41-fullharness")!;
    const subjects = fh.tracks[0].units.map((u) => u.subject);
    expect(subjects).toEqual([
      "作業に関する知識",
      "墜落制止用器具に関する知識",
      "労働災害の防止に関する知識",
      "関係法令",
      "墜落制止用器具の使用方法等",
    ]);
    // 墜落制止用器具に関する知識の範囲5項目（正本）
    const kigu = fh.tracks[0].units.find((u) => u.unitId === "fh-gakka-2")!;
    expect(kigu.scopeItems.length).toBe(5);
    expect(kigu.scopeItems[0]).toContain("フルハーネス及びランヤードの種類及び構造");
  });

  it("熱中症 管理者教育の5科目が225分（3.75時間）配分の正本表記", () => {
    const nc = getCurriculum("circular-necchu")!;
    const mgr = nc.tracks.find((t) => t.trackId === "manager")!;
    expect(mgr.units.map((u) => u.subject)).toEqual([
      "熱中症の症状",
      "熱中症の予防方法",
      "緊急時の救急処置",
      "熱中症の事例",
      "関係法令等",
    ]);
    // 予防方法が最大配分（150分＝2.5時間）
    expect(mgr.units.find((u) => u.unitId === "nc-mgr-2")!.minHours).toBe(2.5);
  });
});

describe("カリキュラム正本レジストリ: 既存誤記3件の是正がレジストリに反映", () => {
  it("フルハーネスの科目根拠は規程第24条であり、告示第11号を科目根拠として掲げない（企画01章§2-1）", () => {
    const fh = getCurriculum("se-36-41-fullharness")!;
    // 器具規格の告示第11号は科目根拠ではない → kokuji は規程第24条を指す
    expect(fh.basis.kokuji).toContain("第24条");
    expect(fh.basis.kokuji).not.toMatch(/告示第11号|告示第十一号/);
    expect(fh.basis.ruleRef).toBe("安衛則第36条第41号");
  });

  it("熱中症の根拠は基発0318第1号であり、廃止済み基発0420第3号を引用しない（企画01章§2-2）", () => {
    const nc = getCurriculum("circular-necchu")!;
    expect(nc.basis.kokuji).toContain("基発0318第1号");
    expect(nc.basis.kokuji).not.toContain("基発0420第3号");
    expect(nc.educationClass).toBe("circular");
  });
});

describe("裏切り検出の実証（これが落ちなくなったらレジストリ整合の故障）", () => {
  it("時間数を1つ改変すると導出合計が宣言合計とずれる（EDU-D1 完了条件）", () => {
    const fh = getCurriculum("se-36-41-fullharness")!;
    // 正本を複製し、器具の知識2h→1hに改竄
    const tampered: EducationCurriculum = {
      ...fh,
      tracks: fh.tracks.map((t) => ({
        ...t,
        units: t.units.map((u) =>
          u.unitId === "fh-gakka-2" ? { ...u, minHours: 1 } : u,
        ),
      })),
    };
    // 改竄トラックの導出学科合計は宣言 4.5h と一致しなくなる
    expect(deriveGakkaHours(tampered.tracks[0])).not.toBe(tampered.tracks[0].totalGakkaHours);
  });
});
