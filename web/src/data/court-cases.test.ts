import { describe, it, expect } from "vitest";
import {
  COURT_CASES,
  COURT_CASE_ISSUES,
  COURT_CASE_FIELDS,
  COURT_CASE_COUNT,
  getCourtCaseById,
  countByIssue,
} from "./court-cases";

describe("court-cases データ整合性（捏造防止の構造ガード）", () => {
  it("収録件数が COURT_CASES と一致する", () => {
    expect(COURT_CASE_COUNT).toBe(COURT_CASES.length);
    expect(COURT_CASES.length).toBeGreaterThanOrEqual(10);
  });

  it("id は一意", () => {
    const ids = COURT_CASES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("全件が必須フィールドを持ち、争点・分野は統制語彙に含まれる", () => {
    for (const c of COURT_CASES) {
      expect(c.id, c.name).toMatch(/^[a-z0-9-]+$/);
      expect(c.name.length, c.id).toBeGreaterThan(0);
      expect(c.court, c.id).toContain("裁");
      expect(c.oneLine.length, c.id).toBeGreaterThan(0);
      expect(c.summary.length, c.id).toBeGreaterThan(20);
      expect(c.holding.length, c.id).toBeGreaterThan(20);
      expect(c.practicePoints.length, c.id).toBeGreaterThan(0);
      expect(c.issues.length, c.id).toBeGreaterThan(0);
      for (const i of c.issues) expect(COURT_CASE_ISSUES).toContain(i);
      expect(COURT_CASE_FIELDS).toContain(c.field);
    }
  });

  it("判決年月日は妥当な ISO 日付（YYYY-MM-DD・実在範囲）", () => {
    for (const c of COURT_CASES) {
      expect(c.date, c.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const t = Date.parse(c.date);
      expect(Number.isNaN(t), c.id).toBe(false);
      const y = Number(c.date.slice(0, 4));
      // 戦後〜現在の確定判例のみ
      expect(y, c.id).toBeGreaterThanOrEqual(1945);
      expect(y, c.id).toBeLessThanOrEqual(2026);
    }
  });

  it("全件に最低1つの出典があり、URLがある場合は http(s)", () => {
    for (const c of COURT_CASES) {
      expect(c.sources.length, c.id).toBeGreaterThan(0);
      for (const s of c.sources) {
        expect(s.label.length, c.id).toBeGreaterThan(0);
        if (s.url) expect(s.url, c.id).toMatch(/^https?:\/\//);
      }
    }
  });

  it("判断要旨は『すべきである』等の断定的助言ではなく事実記述になっている", () => {
    // 「裁判所は〜と判断した/認めた/是認した」の事実記述で締める（個別助言の断定を避ける）
    for (const c of COURT_CASES) {
      expect(c.holding, c.id).toMatch(/(判断した|認めた|是認した|とした|違法である|あたると|できないと)/);
    }
  });

  it("getCourtCaseById が機能し、未知IDは undefined", () => {
    expect(getCourtCaseById(COURT_CASES[0].id)?.id).toBe(COURT_CASES[0].id);
    expect(getCourtCaseById("___nope___")).toBeUndefined();
  });

  it("countByIssue の合計が各判例の争点数の総和に一致", () => {
    const counts = countByIssue();
    const sum = Object.values(counts).reduce((a, b) => a + b, 0);
    const total = COURT_CASES.reduce((a, c) => a + c.issues.length, 0);
    expect(sum).toBe(total);
  });

  it("R5拡充: 14件以上・新カテゴリ(派遣請負先責任/熱中症屋外)・追加2判例が存在", () => {
    expect(COURT_CASES.length).toBeGreaterThanOrEqual(14);
    expect(COURT_CASE_ISSUES).toContain("派遣・請負先責任");
    expect(COURT_CASE_FIELDS).toContain("熱中症・屋外");
    // 実在裏取り済みの追加2件（アテスト/ニコン＝派遣先責任、造園熱中症＝大阪高裁）
    const atesuto = getCourtCaseById("atesuto-nikon");
    expect(atesuto?.issues).toContain("派遣・請負先責任");
    const necchu = getCourtCaseById("zoen-necchusho-osaka-h28");
    expect(necchu?.field).toBe("熱中症・屋外");
    // 追加2件も出典1つ以上・事実記述の holding を持つ（捏造防止ガードの再確認）
    for (const c of [atesuto, necchu]) {
      expect(c).toBeDefined();
      expect(c!.sources.length).toBeGreaterThan(0);
      expect(c!.holding).toMatch(/(判断した|認めた|是認した|とした)/);
    }
  });

  it("R6拡充: 16件以上・新カテゴリ(役員個人責任)・追加2判例(筑豊じん肺/大庄)が存在", () => {
    expect(COURT_CASES.length).toBeGreaterThanOrEqual(16);
    expect(COURT_CASE_ISSUES).toContain("役員・個人責任");
    const chikuho = getCourtCaseById("chikuho-jinpai");
    expect(chikuho?.issues).toContain("国・行政責任");
    const daisho = getCourtCaseById("daisho-nihonkai-shoya");
    expect(daisho?.issues).toContain("役員・個人責任");
    for (const c of [chikuho, daisho]) {
      expect(c).toBeDefined();
      expect(c!.sources.length).toBeGreaterThan(0);
      expect(c!.holding).toMatch(/(判断した|認めた|是認した|とした)/);
    }
  });

  it("Fable再検証(2026-06-10): 88件以上・シエスパ刑事/長崎じん肺(消滅時効)が存在", () => {
    expect(COURT_CASES.length).toBeGreaterThanOrEqual(88);
    // シエスパ爆発 刑事事件（従業員3名死亡・設計担当者個人の刑事責任・最決平28.5.25で確定）
    const siespa = getCourtCaseById("shibuya-siespa-explosion-criminal");
    expect(siespa?.issues).toContain("刑事責任");
    expect(siespa?.issues).toContain("役員・個人責任");
    // 長崎じん肺訴訟（最三小判平6.2.22 民集48巻2号441頁・消滅時効の起算点）
    const nagasaki = getCourtCaseById("nagasaki-jinpai-h6");
    expect(nagasaki?.field).toBe("じん肺・石綿");
    expect(nagasaki?.citation).toContain("民集48巻2号441頁");
    // 出典2つ以上・事実記述の holding（捏造防止ガード）
    for (const c of [siespa, nagasaki]) {
      expect(c).toBeDefined();
      expect(c!.sources.length).toBeGreaterThanOrEqual(2);
      expect(c!.holding).toMatch(/(判断した|認めた|是認した|とした)/);
    }
  });
});
