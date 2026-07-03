/**
 * 免許データベース（licenses.ts）の号・実在性・certType 整合テスト
 *
 * 2026-07-03 の全件監査（教育資格DB残・柱1）を恒久固定する:
 * - 各エントリの relatedLaw が引用する「安衛令第6条／第20条 第N号」を、
 *   e-Gov 機械突合済みコーパス（rodo-anzen-eisei-ho-sikokiregu.ts の itemNumberMap・
 *   PR #601 でスナップショット固定）に対して機械照合する。
 * - 是正前に存在した号取り違え（クレーン=令20条7号 実は6号／揚貨装置=8号 実は2号／
 *   ガス溶接=令6条3号 実は2号／エックス線=令6条27号 実在せず正は5号／
 *   ガンマ線=27号の2 実は5号の2／発破=令20条5号 実は1号）の再発を防ぐ。
 * - certType が全件 "license" であることを固定（技能講習・特別教育との取り違え防止）。
 * - 各免許の規則側根拠条（就業制限免許＝免許を受けることができる者の条／作業主任者免許＝
 *   選任条）を e-Gov 生JSON（クレーン則347M50002000034・ボイラー則347M50002000033・
 *   安衛則347M50002000032・2026-07-03取得）で突合した正条にピン留めし、是正前の誤り
 *   （クレーン則224条＝欠格→正223条／クレーン則235条＝欠番→揚貨は安衛則62条+別表4／
 *   ボイラー則24条＝作業主任者選任→正97条／安衛則321条＝避難→発破は安衛則62条+別表4）を固定。
 */
import { describe, expect, it } from "vitest";
import { LICENSES } from "./licenses";
import { rodoAnzenEiseiHoSikokiregu } from "@/data/laws/rodo-anzen-eisei-ho-sikokiregu";

/** 令第6条・第20条の itemNumberMap（漢数字キー）をコーパスから取得 */
const art6 = rodoAnzenEiseiHoSikokiregu.find(
  (a) => a.lawShort === "安衛令" && a.articleNum === "第6条",
);
const art20 = rodoAnzenEiseiHoSikokiregu.find(
  (a) => a.lawShort === "安衛令" && a.articleNum === "第20条",
);

/** アラビア数字号（"5の2" 等）→ コーパスの漢数字キー（"五の二" 等）へ変換 */
const KANJI = [
  "",
  "一",
  "二",
  "三",
  "四",
  "五",
  "六",
  "七",
  "八",
  "九",
  "十",
  "十一",
  "十二",
  "十三",
  "十四",
  "十五",
  "十六",
  "十七",
  "十八",
  "十九",
  "二十",
  "二十一",
  "二十二",
  "二十三",
];
function toKanjiKey(go: string): string {
  const m = go.match(/^(\d+)(?:の(\d+))?$/);
  if (!m) return go;
  const main = KANJI[Number(m[1])] ?? go;
  return m[2] ? `${main}の${KANJI[Number(m[2])]}` : main;
}

/** relatedLaw から「安衛令第6条／第20条 第N号」を抽出 */
function parseSeirei(relatedLaw: string): { article: "第6条" | "第20条"; go: string } | null {
  // 枝番は「第5号の2」の形（号のあとに「のM」）で表記される
  const m = relatedLaw.match(/安衛令(第6条|第20条)第(\d+)号(?:の(\d+))?/);
  if (!m) return null;
  const go = m[3] ? `${m[2]}の${m[3]}` : m[2];
  return { article: m[1] as "第6条" | "第20条", go };
}

/**
 * id → 期待する {令条・号・その号の作業に必ず含まれるキーワード}。
 * 号は e-Gov 機械突合済みコーパスの itemNumberMap と 1対1 で照合される。
 */
const EXPECTED: Record<string, { article: "第6条" | "第20条"; go: string; label: string }> = {
  // 就業制限業務（令第20条）
  "lic-crane-derrick": { article: "第20条", go: "6", label: "クレーン" },
  "lic-mobile-crane": { article: "第20条", go: "7", label: "移動式クレーン" },
  "lic-yangu": { article: "第20条", go: "2", label: "揚貨装置" },
  "lic-boiler-2": { article: "第20条", go: "3", label: "ボイラー" },
  "lic-boiler-1": { article: "第20条", go: "3", label: "ボイラー" },
  "lic-diver": { article: "第20条", go: "9", label: "潜水" },
  "lic-hakka": { article: "第20条", go: "1", label: "発破" },
  // 作業主任者を選任すべき作業（令第6条）
  "lic-gas-welding-chief": { article: "第6条", go: "2", label: "ガス溶接" },
  "lic-xray-chief": { article: "第6条", go: "5", label: "放射線" },
  "lic-gamma-chief": { article: "第6条", go: "5の2", label: "ガンマ線" },
  "lic-koatsu-shitsunai-chief": { article: "第6条", go: "1", label: "高圧室内" },
};

describe("licenses: 令第6条／第20条の号がコーパスと機械突合", () => {
  it("令第6条・第20条がコーパスに存在し itemNumberMap を持つ", () => {
    expect(art6?.itemNumberMap, "令第6条 itemNumberMap").toBeDefined();
    expect(art20?.itemNumberMap, "令第20条 itemNumberMap").toBeDefined();
  });

  it("全エントリが certType='license'（技能講習・特別教育との取り違え防止）", () => {
    for (const lic of LICENSES) {
      expect(lic.certType, `${lic.id} の certType`).toBe("license");
    }
  });

  it("令を引用する全エントリの号が期待表と一致し、その号が実在する（実在性）", () => {
    // 令第6条／第20条を引用するエントリは EXPECTED に必ず載っていること
    const seireiIds = LICENSES.filter((l) => parseSeirei(l.relatedLaw) !== null).map((l) => l.id);
    expect(seireiIds.sort()).toEqual(Object.keys(EXPECTED).sort());

    for (const lic of LICENSES) {
      const parsed = parseSeirei(lic.relatedLaw);
      if (!parsed) continue;
      const exp = EXPECTED[lic.id];
      expect(exp, `${lic.id} が EXPECTED に無い`).toBeDefined();
      // 引用条・号が期待どおり
      expect(parsed.article, `${lic.id} の引用条`).toBe(exp.article);
      expect(parsed.go, `${lic.id} の引用号`).toBe(exp.go);
      // その号がコーパス itemNumberMap に実在（存在しない号=捏造を検出）
      const map = (parsed.article === "第6条" ? art6 : art20)!.itemNumberMap!;
      const key = toKanjiKey(parsed.go);
      expect(map[key], `${lic.id} が令${parsed.article}に存在しない第${parsed.go}号を引用`).toBeDefined();
      // その号の作業内容がライセンスに対応（号取り違えを内容で検出）
      expect(map[key], `${lic.id} の号(${parsed.go})が別作業を指す`).toContain(exp.label);
    }
  });

  it("是正済みの既知号誤りが再発していない", () => {
    const byId = new Map(LICENSES.map((l) => [l.id, l]));
    // クレーン・デリック運転士: 令20条7号(移動式)→正6号
    expect(byId.get("lic-crane-derrick")!.relatedLaw).toContain("安衛令第20条第6号");
    expect(byId.get("lic-crane-derrick")!.relatedLaw).not.toContain("第20条第7号");
    // 揚貨装置: 令20条8号(デリック)→正2号
    expect(byId.get("lic-yangu")!.relatedLaw).toContain("安衛令第20条第2号");
    expect(byId.get("lic-yangu")!.relatedLaw).not.toContain("第20条第8号");
    // ガス溶接作業主任者: 令6条3号(機械集材)→正2号
    expect(byId.get("lic-gas-welding-chief")!.relatedLaw).toContain("安衛令第6条第2号");
    expect(byId.get("lic-gas-welding-chief")!.relatedLaw).not.toContain("第6条第3号");
    // エックス線作業主任者: 令6条27号(実在せず)→正5号
    expect(byId.get("lic-xray-chief")!.relatedLaw).toContain("安衛令第6条第5号");
    expect(byId.get("lic-xray-chief")!.relatedLaw).not.toContain("第27号");
    // ガンマ線: 令6条27号の2(実在せず)→正5号の2
    expect(byId.get("lic-gamma-chief")!.relatedLaw).toContain("安衛令第6条第5号の2");
    expect(byId.get("lic-gamma-chief")!.relatedLaw).not.toContain("第27号の2");
    // 発破技士: 令20条5号(ボイラー整備)→正1号
    expect(byId.get("lic-hakka")!.relatedLaw).toContain("安衛令第20条第1号");
    expect(byId.get("lic-hakka")!.relatedLaw).not.toContain("第20条第5号");
    // 揚貨装置運転士免許の対象は制限荷重5トン以上（0.5トンはクレーン則の揚貨装置定義域）
    expect(byId.get("lic-yangu")!.targetWork).toContain("制限荷重5トン以上");
    expect(byId.get("lic-yangu")!.targetWork).not.toContain("0.5トン");
  });
});

describe("licenses: 規則側根拠条（e-Gov生JSON突合）", () => {
  /** id → relatedLaw に必ず含まれる正条（就業制限=免許付与要件条／作業主任者=選任条） */
  const REG_ARTICLE: Record<string, string> = {
    "lic-crane-derrick": "クレーン則第223条", // 免許を受けることができる者（224条は欠格事項）
    "lic-mobile-crane": "クレーン則第229条", // 免許を受けることができる者
    "lic-yangu": "安衛則第62条・別表第四", // 揚貨装置運転士免許はクレーン則になく安衛則別表第四
    "lic-boiler-2": "ボイラー則第97条", // 免許を受けることができる者（24条は作業主任者選任）
    "lic-boiler-1": "ボイラー則第97条",
    "lic-diver": "高圧則第52条", // 免許を受けることができる者
    "lic-gas-welding-chief": "安衛則第314条", // ガス溶接作業主任者の選任
    "lic-xray-chief": "電離則第46条", // エックス線作業主任者の選任
    "lic-gamma-chief": "電離則第52条の2", // ガンマ線透過写真撮影作業主任者の選任
    "lic-koatsu-shitsunai-chief": "高気圧作業安全衛生規則第10条", // 作業主任者の選任・職務
    "lic-hakka": "安衛則第62条・別表第四", // 発破技士免許は安衛則別表第四
  };

  it("全エントリの規則側根拠条が正条にピン留めされている", () => {
    const byId = new Map(LICENSES.map((l) => [l.id, l]));
    expect(new Set(Object.keys(REG_ARTICLE))).toEqual(new Set(LICENSES.map((l) => l.id)));
    for (const [id, article] of Object.entries(REG_ARTICLE)) {
      expect(byId.get(id)!.relatedLaw, `${id} の規則側根拠条`).toContain(article);
    }
  });

  it("是正済みの誤条（欠格/欠番/作業主任者選任/避難）が再発していない", () => {
    const byId = new Map(LICENSES.map((l) => [l.id, l]));
    expect(byId.get("lic-crane-derrick")!.relatedLaw).not.toContain("クレーン則第224条");
    expect(byId.get("lic-yangu")!.relatedLaw).not.toContain("クレーン則第235条");
    expect(byId.get("lic-boiler-2")!.relatedLaw).not.toContain("ボイラー則第24条");
    expect(byId.get("lic-boiler-1")!.relatedLaw).not.toContain("ボイラー則第24条");
    expect(byId.get("lic-hakka")!.relatedLaw).not.toContain("安衛則第321条");
  });
});
