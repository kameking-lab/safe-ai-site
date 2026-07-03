import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CircularsFilterableList } from "./CircularsFilterableList";
import type { MhlwNotice } from "@/data/mhlw-notices";

function makeNotice(overrides: Partial<MhlwNotice>): MhlwNotice {
  return {
    id: "mhlw-notice-test",
    title: "テスト通達",
    issuedDate: "2026-01-01",
    issuedDateRaw: "令和8年1月1日",
    noticeNumber: "基発0101第1号",
    issuer: "厚生労働省労働基準局長",
    bindingLevel: "reference",
    sourceUrl: "https://example.jaish.gr.jp/test",
    detailUrl: "https://example.jaish.gr.jp/test",
    pdfUrl: null,
    category: "その他",
    docType: "通達",
    ...overrides,
  };
}

// 発出日降順（呼び出し元 page.tsx と同じ整列規約）。
const NOTICES: MhlwNotice[] = [
  makeNotice({ id: "n-1", title: "最新の通達", issuedDate: "2026-06-15", issuedDateRaw: "令和8年6月15日" }),
  makeNotice({ id: "n-2", title: "中間の通達", issuedDate: "2026-03-18", issuedDateRaw: "令和8年3月18日" }),
  makeNotice({ id: "n-3", title: "古い通達", issuedDate: "2020-01-01", issuedDateRaw: "令和2年1月1日" }),
];

describe("/circulars CircularsFilterableList データ鮮度表示", () => {
  it("先頭要素（最新発出）の日付を結論カードの説明文に表示する", () => {
    render(<CircularsFilterableList all={NOTICES} />);
    expect(screen.getByText(/収録最新発出: 令和8年6月15日/)).toBeDefined();
  });

  it("issuedDateRaw が無い場合は issuedDate(ISO) にフォールバックする", () => {
    const withoutRaw = [makeNotice({ id: "n-1", issuedDate: "2026-06-15", issuedDateRaw: null }), ...NOTICES.slice(1)];
    render(<CircularsFilterableList all={withoutRaw} />);
    expect(screen.getByText(/収録最新発出: 2026-06-15/)).toBeDefined();
  });

  it("issuedDate が全件 null でもクラッシュせず日付欄なしで描画する", () => {
    const noDates = NOTICES.map((n) => makeNotice({ ...n, issuedDate: null, issuedDateRaw: null }));
    render(<CircularsFilterableList all={noDates} />);
    expect(screen.queryByText(/収録最新発出/)).toBeNull();
    expect(screen.getByText(/全3件から全件表示中/)).toBeDefined();
  });
});
