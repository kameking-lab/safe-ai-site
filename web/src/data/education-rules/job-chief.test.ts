/**
 * 職長教育・管理者研修DB（job-chief.ts）の制度名・根拠条・研修時間 整合テスト
 *
 * 2026-07-03 の全件監査（O13・柱1「教育資格DB残」）を恒久固定する。
 * 6件を e-Gov（安衛則 347M50002000032・安衛法 347AC0000000057）＋厚労省一次資料
 * （基発通達・告示）と機械突合し、以下を是正した:
 *   - jc-construction: 「実技2h」は誤り＝職長教育に実技区分なし。14hは全学科（職長12h＋安全衛生責任者2h・基発179号）。
 *   - jc-upgrade: 能力向上教育の根拠は安衛法19条の2＋能力向上教育指針。安衛則40条は初任時のみで誤り。7h→概ね6h。
 *   - jc-health-supervisor: 「衛生管理者選任時研修（9h）」は実在しない制度（安全管理者選任時研修との混同）。
 *       衛生管理者は免許（国家試験）等が資格（安衛則10条）＝certType を license に是正。
 *   - jc-safety-officer: 「11時間」は政府公開一次資料で未確認のため主張しない。
 *
 * 根拠条の実在・見出し整合は、PR #601 等でe-Gov機械突合済みのスナップショット
 * （egov-caption-snapshot.ts の安衛則・安衛法 caption マップ）に対して照合する。
 */
import { describe, expect, it } from "vitest";
import { JOB_CHIEF_EDUCATION } from "./job-chief";
import {
  OFFICIAL_CAPTIONS_ANZEN_EISEI_KISOKU,
  OFFICIAL_CAPTIONS_RODO_ANZEN_EISEI_HO,
} from "@/data/laws/egov-caption-snapshot";

const byId = new Map(JOB_CHIEF_EDUCATION.map((c) => [c.id, c]));
const get = (id: string) => {
  const c = byId.get(id);
  if (!c) throw new Error(`${id} が JOB_CHIEF_EDUCATION に無い`);
  return c;
};

describe("job-chief: 引用する安衛法／安衛則の条が実在し見出しが制度と一致（e-Gov突合済スナップショット照合）", () => {
  /** relatedLaw が引用する「安衛則第N条」の見出しが期待テーマを含むこと（条ズレ・誤引用の検出） */
  const REG_ARTICLE_CAPTION: Array<{ id: string; article: string; expect: string }> = [
    { id: "jc-standard", article: "第40条", expect: "職長等の教育" },
    { id: "jc-construction", article: "第40条", expect: "職長等の教育" },
    { id: "jc-supervisor", article: "第5条", expect: "安全管理者の資格" },
    { id: "jc-health-supervisor", article: "第7条", expect: "衛生管理者の選任" },
    { id: "jc-health-supervisor", article: "第10条", expect: "衛生管理者の資格" },
    { id: "jc-safety-officer", article: "第12条の2", expect: "安全衛生推進者等を選任すべき事業場" },
    { id: "jc-safety-officer", article: "第12条の3", expect: "安全衛生推進者等の選任" },
  ];

  it("安衛則の引用条が実在し、その見出しが制度テーマと一致する", () => {
    for (const { id, article, expect: cap } of REG_ARTICLE_CAPTION) {
      const cert = get(id);
      expect(cert.relatedLaw, `${id} が安衛則${article}を引用`).toContain(`安衛則${article}`);
      const caption = OFFICIAL_CAPTIONS_ANZEN_EISEI_KISOKU[article];
      expect(caption, `安衛則${article}がスナップショットに実在`).toBeDefined();
      expect(caption, `安衛則${article}の見出しが「${cap}」を含む（条ズレ検出）`).toContain(cap);
    }
  });

  /** relatedLaw が引用する「安衛法第N条」の見出しが期待テーマを含むこと */
  const LAW_ARTICLE_CAPTION: Array<{ id: string; article: string; expect: string }> = [
    { id: "jc-standard", article: "第60条", expect: "安全衛生教育" },
    { id: "jc-construction", article: "第60条", expect: "安全衛生教育" },
    { id: "jc-construction", article: "第16条", expect: "安全衛生責任者" },
    { id: "jc-upgrade", article: "第19条の2", expect: "安全管理者等に対する教育等" },
    { id: "jc-supervisor", article: "第11条", expect: "安全管理者" },
    { id: "jc-health-supervisor", article: "第12条", expect: "衛生管理者" },
    { id: "jc-safety-officer", article: "第12条の2", expect: "安全衛生推進者等" },
  ];

  it("安衛法の引用条が実在し、その見出しが制度テーマと一致する", () => {
    for (const { id, article, expect: cap } of LAW_ARTICLE_CAPTION) {
      const cert = get(id);
      expect(cert.relatedLaw, `${id} が安衛法${article}を引用`).toContain(`安衛法${article}`);
      const caption = OFFICIAL_CAPTIONS_RODO_ANZEN_EISEI_HO[article];
      expect(caption, `安衛法${article}がスナップショットに実在`).toBeDefined();
      expect(caption, `安衛法${article}の見出しが「${cap}」を含む`).toContain(cap);
    }
  });
});

describe("job-chief: certType の正本化", () => {
  it("研修・教育系は job_chief、衛生管理者（免許）は license", () => {
    const EXPECTED_TYPE: Record<string, "job_chief" | "license"> = {
      "jc-standard": "job_chief",
      "jc-construction": "job_chief",
      "jc-upgrade": "job_chief",
      "jc-supervisor": "job_chief",
      "jc-health-supervisor": "license", // 衛生管理者は免許（国家試験）＝研修ではない
      "jc-safety-officer": "job_chief",
    };
    // 監査対象6件が過不足なく存在する
    expect(new Set(JOB_CHIEF_EDUCATION.map((c) => c.id))).toEqual(
      new Set(Object.keys(EXPECTED_TYPE)),
    );
    for (const [id, t] of Object.entries(EXPECTED_TYPE)) {
      expect(get(id).certType, `${id} の certType`).toBe(t);
    }
  });
});

describe("job-chief: 是正済みの既知誤りが再発していない", () => {
  it("jc-standard: 職長教育12時間・全学科（実技区分なし）", () => {
    const c = get("jc-standard");
    expect(c.relatedLaw).toContain("安衛法第60条");
    expect(c.relatedLaw).toContain("安衛則第40条");
    expect(c.duration).toContain("12時間");
    expect(c.duration).toContain("学科");
  });

  it("jc-construction: 14時間は全学科＝『実技2h』の誤りが消えている（基発179号・安全衛生責任者2h）", () => {
    const c = get("jc-construction");
    expect(c.duration).toContain("14時間");
    expect(c.duration).toContain("学科");
    // 職長教育に実技区分は存在しない（是正前は「実技2h」と誤記）
    expect(c.duration).not.toMatch(/実技\s*[0-9０-９]/);
    expect(c.relatedLaw).toContain("基発第179号");
    expect(c.relatedLaw).toContain("安衛法第16条"); // 安全衛生責任者
  });

  it("jc-upgrade: 能力向上教育の根拠は安衛法19条の2＋指針（安衛則40条ではない）・概ね6時間（7時間ではない）", () => {
    const c = get("jc-upgrade");
    expect(c.relatedLaw).toContain("第19条の2");
    expect(c.relatedLaw).toContain("能力向上教育指針");
    // 安衛則第40条は初任時の職長教育の条＝能力向上の根拠として誤り。再混入を禁止
    expect(c.relatedLaw).not.toContain("安衛則第40条");
    expect(c.duration).toContain("6時間");
    expect(c.duration).not.toContain("7時間");
  });

  it("jc-supervisor: 安全管理者選任時研修は実在（安衛則5条・平成18年告示24号・9時間）", () => {
    const c = get("jc-supervisor");
    expect(c.relatedLaw).toContain("安衛則第5条");
    expect(c.relatedLaw).toContain("告示第24号");
    expect(c.duration).toContain("9時間");
  });

  it("jc-health-supervisor: 『衛生管理者選任時研修』の捏造を排し免許として正本化", () => {
    const c = get("jc-health-supervisor");
    // 名称に『選任時研修』を掲げない（実在しない制度）
    expect(c.name).not.toContain("選任時研修");
    expect(c.name).toContain("免許");
    // 資格根拠は安衛則第10条（資格）＋安衛法第12条。研修時間を主張しない
    expect(c.relatedLaw).toContain("安衛則第10条");
    expect(c.relatedLaw).toContain("安衛法第12条");
    expect(c.duration).toContain("免許");
    expect(c.duration).not.toContain("研修");
    expect(c.duration).not.toContain("9時間");
    expect(c.keywords).toContain("衛生管理者免許");
    // 制度不存在を明記
    expect(c.notes).toContain("選任時研修");
    expect(c.notes).toContain("存在しない");
  });

  it("jc-safety-officer: 未確認の『11時間』を主張せず選任要件（登録養成講習 or 学歴＋実務経験）で記述", () => {
    const c = get("jc-safety-officer");
    expect(c.relatedLaw).toContain("安衛則第12条の2");
    expect(c.relatedLaw).toContain("安衛則第12条の3");
    expect(c.relatedLaw).toContain("告示第80号");
    // 政府公開一次資料で未確認の具体時数は主張しない
    expect(c.duration).not.toContain("11時間");
    expect(c.duration).toContain("養成講習");
    expect(c.duration).toContain("学歴");
  });
});
