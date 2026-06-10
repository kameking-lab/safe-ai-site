import { describe, expect, it } from "vitest";
import {
  buildTranscribeFields,
  riskRowsToTsv,
  kyRecordToCsv,
  kyCsvFileName,
} from "@/lib/ky/transcribe-export";
import { normalizeKyInstructionRecord } from "@/lib/services/operations-service";

const rec = normalizeKyInstructionRecord({
  siteName: "○○ビル新築",
  projectName: "3工区",
  foremanName: "山田",
  coop1Name: "△△建設",
  workDateYear: "2026",
  workDateMonth: "6",
  workDateDay: "10",
  weather: "晴れ",
  temperature: "28",
  workRows: [{ workDetail: "鉄骨建方" }, { workDetail: "玉掛け・荷揚げ" }],
  riskRows: [
    { targetLabel: "①", hazard: "墜落", reduction: "親綱使用", likelihood: 3, severity: 3 },
    { targetLabel: "②", hazard: "吊り荷の落下", reduction: "立入禁止措置", likelihood: 2, severity: 3 },
  ],
  teamGoal: "親綱に掛けてから移動しよう",
  priorityItems: "フック二丁掛け",
  pointingCall: "親綱ヨシ",
  participants: [{ name: "佐藤", qualNo: "玉掛け技能" }, { name: "鈴木" }],
});

function field(key: string, r = rec) {
  const f = buildTranscribeFields(r).find((x) => x.key === key);
  if (!f) throw new Error(`field not found: ${key}`);
  return f;
}

describe("buildTranscribeFields", () => {
  it("印刷シートと同じ表記のラベルを全項目分返す", () => {
    const labels = buildTranscribeFields(rec).map((f) => f.label);
    expect(labels).toEqual([
      "作業日",
      "現場名",
      "工事名・工区",
      "職長（リーダー）",
      "元請会社",
      "天気・気温",
      "本日の作業内容",
      "危険のポイント（1R）",
      "対策（3R）",
      "チーム行動目標",
      "重点実施項目",
      "指差呼称（ヨシ！）",
      "参加者",
    ]);
  });

  it("作業日は和暦なし年月日、天気は気温つき", () => {
    expect(field("workDate").value).toBe("2026年6月10日");
    expect(field("weather").value).toBe("晴れ 28℃");
  });

  it("作業内容は複数行を改行で結合", () => {
    expect(field("workDetail").value).toBe("鉄骨建方\n玉掛け・荷揚げ");
  });

  it("危険・対策が2件以上なら番号つき行で対応関係を保つ", () => {
    expect(field("hazards").value).toBe("① 墜落\n② 吊り荷の落下");
    expect(field("reductions").value).toBe("① 親綱使用\n② 立入禁止措置");
  });

  it("危険が1件だけなら番号を付けずそのまま", () => {
    const one = normalizeKyInstructionRecord({
      riskRows: [{ hazard: "感電", reduction: "検電実施", likelihood: 1, severity: 3 }],
    });
    expect(field("hazards", one).value).toBe("感電");
    expect(field("reductions", one).value).toBe("検電実施");
  });

  it("参加者は資格番号つきで「、」結合、未記入の名前は除外", () => {
    expect(field("participants").value).toBe("佐藤（玉掛け技能）、鈴木");
  });

  it("空レコードでも全項目が value=\"\" で返る（UIが未記入と示せる）", () => {
    const empty = normalizeKyInstructionRecord({});
    const fields = buildTranscribeFields(empty);
    expect(fields).toHaveLength(13);
    for (const f of fields.filter((x) => x.key !== "workDate")) {
      expect(f.value).toBe("");
    }
  });
});

describe("riskRowsToTsv", () => {
  it("見出しなし・タブ区切り・評価値つきの行を返す", () => {
    const lines = riskRowsToTsv(rec).split("\r\n");
    expect(lines).toHaveLength(2);
    // 評価値は「9（大）」まで縮める＝元請様式に貼った後で説明括弧を削る手間を出さない
    expect(lines[0]).toBe("①\t墜落\t3\t3\t9（大）\t親綱使用");
    expect(lines[1]).toBe("②\t吊り荷の落下\t2\t3\t6（大）\t立入禁止措置");
  });

  it("セル内のタブ・改行は表を壊さないよう畳む", () => {
    const tricky = normalizeKyInstructionRecord({
      riskRows: [{ hazard: "開口部\nからの墜落", reduction: "手すり\t設置", likelihood: 2, severity: 2 }],
    });
    expect(riskRowsToTsv(tricky)).toBe("1\t開口部 / からの墜落\t2\t2\t4（中）\t手すり 設置");
  });

  it("未記入の危険行は出力しない", () => {
    const sparse = normalizeKyInstructionRecord({
      riskRows: [
        { hazard: "", reduction: "", likelihood: 1, severity: 1 },
        { hazard: "転倒", reduction: "整理整頓", likelihood: 1, severity: 1 },
      ],
    });
    expect(riskRowsToTsv(sparse).split("\r\n")).toHaveLength(1);
  });
});

describe("kyRecordToCsv", () => {
  it("前半は項目,値の縦持ち・後半は危険と対策の表", () => {
    const csv = kyRecordToCsv(rec);
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe("項目,値");
    expect(lines).toContain("現場名,○○ビル新築");
    expect(lines).toContain("No,危険のポイント（1R）,可能性,重大性,評価値,対策（3R）");
    expect(lines).toContain("①,墜落,3,3,9（大）,親綱使用");
  });

  it("カンマ・引用符・改行を含む値はエスケープする", () => {
    const tricky = normalizeKyInstructionRecord({
      siteName: '現場"A",東棟',
      workRows: [{ workDetail: "解体\n搬出" }],
    });
    const csv = kyRecordToCsv(tricky);
    expect(csv).toContain('"現場""A"",東棟"');
    expect(csv).toContain('"解体\n搬出"');
  });

  it("項目別コピー専用の危険・対策フィールドは縦持ち部に重複させない", () => {
    const csv = kyRecordToCsv(rec);
    const head = csv.split("\r\n\r\n")[0] ?? csv;
    expect(head).not.toContain("危険のポイント（1R）,");
  });
});

describe("kyCsvFileName", () => {
  it("作業日からゼロ埋めの日付ファイル名を作る", () => {
    expect(kyCsvFileName(rec)).toBe("ky-2026-06-10.csv");
  });

  it("作業日が欠けていれば汎用名", () => {
    // normalize は未指定の年月日に今日を補完するため、欠損は明示的な空文字で表す
    expect(kyCsvFileName(normalizeKyInstructionRecord({ workDateMonth: "" }))).toBe("ky-record.csv");
  });
});
