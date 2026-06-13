/**
 * 技能講習・免許データベースの資格区分（certType）整合テスト
 *
 * 2026-06-13 の柱1是正を恒久固定する。一次資料（e-Gov 法令・粉じん則・
 * 高気圧作業安全衛生規則第10条・公益財団法人 安全衛生技術試験協会）で確認した
 * 「技能講習DBの捏造2件」の再混入を防ぐ:
 *
 *  (1) 特定粉じん作業: 作業主任者制度も技能講習も存在せず、就業時の資格要件は
 *      「特別教育」（粉じん則第22条・安衛則第36条第29号 = se-36-29-dust）のみ。
 *      旧「特定粉じん作業主任者技能講習」(st-dust-chief) は実在しない資格の捏造。
 *  (2) 高圧室内作業主任者: 「技能講習」ではなく「免許」。安衛令第6条第1号の作業に
 *      ついて高気圧則第10条により作業室ごとに高圧室内作業主任者免許保有者から選任。
 *      旧「高圧室内作業主任者技能講習」(st-highpressure-chief) は技能講習⇄免許の
 *      取り違え。正本は LICENSES の lic-koatsu-shitsunai-chief。
 */
import { describe, expect, it } from "vitest";
import { SKILL_TRAINING } from "./skill-training";
import { LICENSES } from "./licenses";
import { ALL_CERTS } from "./index";
import { WORK_TAGS } from "@/lib/work-certification-mapper";

describe("技能講習・免許DBの資格区分整合", () => {
  it("SKILL_TRAINING は全件 certType=skill_training", () => {
    for (const cert of SKILL_TRAINING) {
      expect(cert.certType, `${cert.id} の certType`).toBe("skill_training");
    }
  });

  it("LICENSES は全件 certType=license", () => {
    for (const cert of LICENSES) {
      expect(cert.certType, `${cert.id} の certType`).toBe("license");
    }
  });

  it("捏造IDが復活していない（st-dust-chief / st-highpressure-chief は削除済み）", () => {
    const allIds = new Set(ALL_CERTS.map((c) => c.id));
    expect(allIds.has("st-dust-chief")).toBe(false);
    expect(allIds.has("st-highpressure-chief")).toBe(false);
  });

  it("粉じんに作業主任者の技能講習エントリは存在しない（特別教育のみが正本）", () => {
    const dustChief = SKILL_TRAINING.filter(
      (c) => c.name.includes("粉じん") && c.name.includes("作業主任者"),
    );
    expect(dustChief).toEqual([]);
    // 正本（特別教育）は存在する
    const dustSpecial = ALL_CERTS.find((c) => c.id === "se-36-29-dust");
    expect(dustSpecial?.certType).toBe("special_education");
  });

  it("高圧室内作業主任者は免許としてのみ存在する（技能講習ではない）", () => {
    const inSkill = SKILL_TRAINING.filter((c) => c.name.includes("高圧室内作業主任者"));
    expect(inSkill).toEqual([]);

    const lic = LICENSES.find((c) => c.id === "lic-koatsu-shitsunai-chief");
    expect(lic, "lic-koatsu-shitsunai-chief が LICENSES に存在").toBeDefined();
    expect(lic?.certType).toBe("license");
    expect(lic?.name).toContain("免許");
    // 選任根拠は高気圧作業安全衛生規則第10条（旧データの「高圧則第11条」誤りを是正）
    expect(lic?.relatedLaw).toContain("高気圧作業安全衛生規則第10条");
    expect(lic?.relatedLaw).toContain("安衛令第6条第1号");
  });

  it("粉じんタグは捏造IDを参照しない", () => {
    const dustTag = WORK_TAGS.find((t) => t.id === "tag-dust");
    expect(dustTag?.certIds).toEqual(["se-36-29-dust"]);
  });

  it("certIds参照の健全性: 全タグの参照先が実在する", () => {
    const allIds = new Set(ALL_CERTS.map((c) => c.id));
    for (const tag of WORK_TAGS) {
      for (const id of tag.certIds) {
        expect(allIds.has(id), `${tag.id} -> ${id}`).toBe(true);
      }
    }
  });

  it("relatedCertIds参照の健全性: 全資格の関連IDが実在する", () => {
    const allIds = new Set(ALL_CERTS.map((c) => c.id));
    for (const cert of ALL_CERTS) {
      for (const rid of cert.relatedCertIds ?? []) {
        expect(allIds.has(rid), `${cert.id} -> ${rid}`).toBe(true);
      }
    }
  });
});
