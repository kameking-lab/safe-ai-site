import { describe, it, expect } from "vitest";
import {
  formatRecordDate,
  parseAttendeeNames,
  buildRecordRows,
  formatUsedLanguages,
} from "./foreign-worker-training-record";

describe("formatRecordDate", () => {
  it("ISO日付を和暦風表記に変換する", () => {
    expect(formatRecordDate("2026-06-09")).toBe("2026年6月9日");
  });
  it("空文字・不正値は空文字を返す", () => {
    expect(formatRecordDate("")).toBe("");
    expect(formatRecordDate("not-a-date")).toBe("");
  });
});

describe("parseAttendeeNames", () => {
  it("1行1名でトリムし空行を除外する", () => {
    expect(parseAttendeeNames("  グエン \n\n チャン\nレ  ")).toEqual([
      "グエン",
      "チャン",
      "レ",
    ]);
  });
  it("CRLF改行も扱える", () => {
    expect(parseAttendeeNames("A\r\nB")).toEqual(["A", "B"]);
  });
  it("空入力は空配列", () => {
    expect(parseAttendeeNames("")).toEqual([]);
    expect(parseAttendeeNames("   \n  ")).toEqual([]);
  });
  it("同姓同名は別人として残す", () => {
    expect(parseAttendeeNames("田中\n田中")).toEqual(["田中", "田中"]);
  });
});

describe("buildRecordRows", () => {
  it("氏名が無ければ最低行数ぶんの空行を作る", () => {
    const rows = buildRecordRows([], 3);
    expect(rows).toEqual([
      { no: 1, name: "" },
      { no: 2, name: "" },
      { no: 3, name: "" },
    ]);
  });
  it("入力済み氏名を先頭に並べ不足分を空行で埋める", () => {
    const rows = buildRecordRows(["グエン", "チャン"], 4);
    expect(rows.map((r) => r.name)).toEqual(["グエン", "チャン", "", ""]);
    expect(rows.map((r) => r.no)).toEqual([1, 2, 3, 4]);
  });
  it("氏名数が最低行数を超える場合は全員分を返す", () => {
    const rows = buildRecordRows(["A", "B", "C"], 2);
    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.name)).toEqual(["A", "B", "C"]);
  });
  it("負の最低行数は0扱い（氏名のみ）", () => {
    expect(buildRecordRows(["A"], -5)).toEqual([{ no: 1, name: "A" }]);
  });
});

describe("formatUsedLanguages", () => {
  it("選択言語を日本語ラベルで並べる", () => {
    expect(formatUsedLanguages(["ja-easy", "vi"])).toBe(
      "やさしい日本語・ベトナム語",
    );
  });
  it("未選択は注記を返す", () => {
    expect(formatUsedLanguages([])).toBe("（未選択）");
  });
});
