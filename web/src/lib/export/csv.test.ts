import { describe, expect, it } from "vitest";
import { csvEscape, sectionsToCsv } from "./csv";

describe("csvEscape", () => {
  it("カンマ・引用符・改行を含まない値はそのまま", () => {
    expect(csvEscape("建設業")).toBe("建設業");
    expect(csvEscape(123)).toBe("123");
  });

  it("カンマを含む値はダブルクォートで囲む", () => {
    expect(csvEscape("墜落,転落")).toBe('"墜落,転落"');
  });

  it("ダブルクォートは2重化して囲む", () => {
    expect(csvEscape('「囲い」"あり"')).toBe('"「囲い」""あり"""');
  });

  it("改行を含む値はダブルクォートで囲む", () => {
    expect(csvEscape("1行目\n2行目")).toBe('"1行目\n2行目"');
  });
});

describe("sectionsToCsv", () => {
  it("見出し＋ヘッダ＋行をCRLFで連結する", () => {
    const csv = sectionsToCsv([
      { title: "KPI", headers: ["項目", "値"], rows: [["件数", 10]] },
    ]);
    expect(csv).toBe("KPI\r\n項目,値\r\n件数,10");
  });

  it("複数セクションは空行(CRLF×2)で区切る", () => {
    const csv = sectionsToCsv([
      { title: "A", headers: ["x"], rows: [["1"]] },
      { title: "B", headers: ["y"], rows: [["2"]] },
    ]);
    expect(csv).toBe("A\r\nx\r\n1\r\n\r\nB\r\ny\r\n2");
  });

  it("titleを省略できる", () => {
    const csv = sectionsToCsv([{ headers: ["a", "b"], rows: [["1", "2"]] }]);
    expect(csv).toBe("a,b\r\n1,2");
  });

  it("行内のカンマはエスケープされ列数を壊さない", () => {
    const csv = sectionsToCsv([
      { headers: ["業種", "事故型"], rows: [["建設業", "墜落,転落"]] },
    ]);
    expect(csv).toBe('業種,事故型\r\n建設業,"墜落,転落"');
  });
});
