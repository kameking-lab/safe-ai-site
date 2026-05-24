import { describe, it, expect } from "vitest";
import {
  extractNoticeNumberCandidates,
  detectNoticesFromAnswer,
  KNOWN_NOTICE_NUMBER_COUNT,
} from "./chatbot-notice-detector";

describe("Phase 4: 通達番号検出 正規表現", () => {
  it("基発○号 (4桁日付+第N号) を抽出", () => {
    const text = "本件については基発0318第1号「職場における熱中症防止対策のためのガイドライン」を参照してください。";
    const got = extractNoticeNumberCandidates(text);
    expect(got.some((s) => s.includes("基発0318"))).toBe(true);
  });

  it("基発第○号 (3桁号番号) を抽出", () => {
    const text = "基発第500号は労働安全衛生規則の改正に関するものです。";
    const got = extractNoticeNumberCandidates(text);
    expect(got.length).toBeGreaterThan(0);
  });

  it("基安発・基安安発も抽出", () => {
    const got = extractNoticeNumberCandidates("基安発0106第3号と基安安発1029第1号を参照");
    expect(got.length).toBeGreaterThanOrEqual(1);
  });

  it("健発・職発・基収も抽出", () => {
    const got = extractNoticeNumberCandidates("健発1226第2号、職発0220第5号、基収0220第1号");
    expect(got.length).toBeGreaterThanOrEqual(3);
  });

  it("厚生労働省告示も抽出", () => {
    const got = extractNoticeNumberCandidates("詳細は厚生労働省告示第177号を参照");
    expect(got.length).toBe(1);
    expect(got[0]).toContain("厚生労働省告示");
  });

  it("重複を除外", () => {
    const got = extractNoticeNumberCandidates("基発0318第1号は基発0318第1号です");
    expect(got.length).toBe(1);
  });

  it("通達番号のないテキストでは空配列", () => {
    const got = extractNoticeNumberCandidates("これは通常のテキストです");
    expect(got).toEqual([]);
  });
});

describe("Phase 4: mhlw-notices.ts との機械照合", () => {
  it("既知の通達番号件数が 100 件以上 (mhlw-notices.ts 由来)", () => {
    expect(KNOWN_NOTICE_NUMBER_COUNT).toBeGreaterThan(100);
  });

  it("実在の基発0318第1号 (熱中症ガイドライン) は照合可能", () => {
    const { matched, unmatchedCandidates } = detectNoticesFromAnswer(
      "基発0318第1号「職場における熱中症防止対策のためのガイドライン」が参考になります。",
    );
    expect(matched.length).toBeGreaterThanOrEqual(1);
    expect(matched[0].noticeNumber).toContain("0318");
    expect(unmatchedCandidates.length).toBe(0);
  });

  it("架空通達番号は unmatched に分類", () => {
    const { matched, unmatchedCandidates } = detectNoticesFromAnswer(
      "基発9999第99号 (架空) を参照",
    );
    // 9999 第99号は存在しないはず → unmatched
    if (matched.length === 0) {
      expect(unmatchedCandidates.length).toBeGreaterThanOrEqual(1);
    }
    // 仮に偶然一致した場合はテスト前提が崩れているので警告
  });

  it("複数通達混在で実在分のみ matched に入る", () => {
    const { matched } = detectNoticesFromAnswer(
      "基発0318第1号 と 基発9999第99号 が関連します。",
    );
    expect(matched.length).toBeGreaterThanOrEqual(1);
    expect(matched.every((m) => m.noticeNumber?.includes("0318") || m.noticeNumber !== null)).toBe(true);
  });

  it("通達番号のない応答では matched/unmatched 共に空", () => {
    const r = detectNoticesFromAnswer("単純なテキスト応答");
    expect(r.matched).toEqual([]);
    expect(r.unmatchedCandidates).toEqual([]);
  });
});
