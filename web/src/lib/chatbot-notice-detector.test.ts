import { describe, it, expect } from "vitest";
import {
  detectAndMatchNotices,
  extractNoticeRefs,
  normalizeNoticeNumber,
} from "./chatbot-notice-detector";

describe("extractNoticeRefs - 抽出パターン", () => {
  it("基発0220第1号 形式を抽出する", () => {
    const out = extractNoticeRefs("根拠は基発0220第1号によります。");
    expect(out.length).toBeGreaterThanOrEqual(1);
    expect(out[0].normalized).toBe("基発0220第1号");
  });

  it("基発 0220 第 1 号（空白あり）形式も同じ正規形に畳む", () => {
    const out = extractNoticeRefs("基発 0220 第 1 号 を参照");
    expect(out.length).toBeGreaterThanOrEqual(1);
    expect(out[0].normalized).toBe("基発0220第1号");
  });

  it("基安労発0306第1号 形式を抽出する", () => {
    const out = extractNoticeRefs("基安労発0306第1号 により…");
    expect(out.length).toBeGreaterThanOrEqual(1);
    expect(out[0].normalized).toBe("基安労発0306第1号");
  });

  it("雇均発0331第5号 形式を抽出する", () => {
    const out = extractNoticeRefs("雇均発0331第5号 メンタル指針…");
    expect(out.length).toBeGreaterThanOrEqual(1);
  });

  it("古い形式（基発第220号）を抽出する", () => {
    const out = extractNoticeRefs("基発第220号 によれば…");
    expect(out.length).toBeGreaterThanOrEqual(1);
  });

  it("事務連絡 を抽出する", () => {
    const out = extractNoticeRefs("厚労省の事務連絡 によれば…");
    expect(out.length).toBeGreaterThanOrEqual(1);
  });

  it("複数の通達番号を順番に抽出する", () => {
    const out = extractNoticeRefs(
      "基発0726第2号と基安発0314第2号によれば…"
    );
    expect(out.length).toBe(2);
  });

  it("空文字には何も返さない", () => {
    expect(extractNoticeRefs("")).toEqual([]);
  });

  it("通達らしき文字列がない場合は空配列", () => {
    expect(extractNoticeRefs("足場の手すりは高さ85cm以上です。")).toEqual([]);
  });
});

describe("normalizeNoticeNumber", () => {
  it("全角英数字を半角化する", () => {
    expect(normalizeNoticeNumber("基発０２２０第１号")).toBe("基発0220第1号");
  });

  it("空白を除去する", () => {
    expect(normalizeNoticeNumber("基発 0220 第 1 号")).toBe("基発0220第1号");
  });

  it("漢数字を算用数字に変換する", () => {
    expect(normalizeNoticeNumber("基発第二百二十号")).toBe("基発第220号");
  });

  it("null/undefined は空文字を返す", () => {
    expect(normalizeNoticeNumber(null)).toBe("");
    expect(normalizeNoticeNumber(undefined)).toBe("");
  });
});

describe("detectAndMatchNotices - mhlw-notices.ts との照合", () => {
  it("実在する通達番号は matched に入る", () => {
    // 基発0318第1号 は mhlw-notice-0001（熱中症ガイドライン）として実在
    const r = detectAndMatchNotices(
      "「職場における熱中症防止対策のためのガイドライン」(基発0318第1号)を参照"
    );
    expect(r.matched.length).toBeGreaterThanOrEqual(1);
    expect(r.matched[0].notice.id).toBe("mhlw-notice-0001");
  });

  it("架空の通達番号は unmatched に入る（採用しない）", () => {
    const r = detectAndMatchNotices("根拠は基発9999第999号によります。");
    expect(r.matched).toEqual([]);
    expect(r.unmatched.length).toBeGreaterThanOrEqual(1);
  });

  it("実在 + 架空 混在は適切に分離される", () => {
    const r = detectAndMatchNotices(
      "基発0318第1号（実在）と基発9999第999号（架空）"
    );
    expect(r.matched.length).toBeGreaterThanOrEqual(1);
    expect(r.unmatched.length).toBeGreaterThanOrEqual(1);
  });

  it("引用ゼロの応答は全て空配列", () => {
    const r = detectAndMatchNotices("条文番号も通達番号もない一般論。");
    expect(r.extracted).toEqual([]);
    expect(r.matched).toEqual([]);
    expect(r.unmatched).toEqual([]);
  });

  it("空白入り通達番号も照合できる（基発 0726 第 2 号 = mhlw-notice-0130）", () => {
    const r = detectAndMatchNotices(
      "熱中症基本対策要綱は基発 0726 第 2 号 を参照。"
    );
    expect(r.matched.length).toBeGreaterThanOrEqual(1);
    expect(r.matched[0].notice.id).toBe("mhlw-notice-0130");
  });
});

describe("detectAndMatchNotices - 重複・分離", () => {
  it("同じ通達番号が複数回出ても重複排除する", () => {
    const r = detectAndMatchNotices(
      "基発0318第1号によれば…再度基発0318第1号"
    );
    expect(r.extracted.length).toBe(1);
    expect(r.matched.length).toBe(1);
  });
});
