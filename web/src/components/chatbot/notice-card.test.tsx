import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChatbotNoticeCard } from "./notice-card";
import { ChatbotLeafletCard } from "./leaflet-card";
import type { MhlwNotice } from "@/data/mhlw-notices";
import type { MhlwLeaflet } from "@/data/mhlw-leaflets";

const SAMPLE_NOTICE: MhlwNotice = {
  id: "mhlw-notice-test-0001",
  title: "テスト通達(熱中症ガイドライン)",
  issuedDate: "2026-03-18",
  issuedDateRaw: "令和8年3月18日",
  noticeNumber: "基発0318第1号",
  issuer: "厚生労働省労働基準局長",
  bindingLevel: "indirect",
  sourceUrl: "https://www.jaish.gr.jp/test",
  detailUrl: "https://www.jaish.gr.jp/test/detail",
  pdfUrl: null,
  category: "heat-stroke",
  docType: "通達",
  era: "令和8年",
};

const SAMPLE_LEAFLET: MhlwLeaflet = {
  id: "mhlw-leaflet-test-0001",
  title: "転倒防止対策リーフレット",
  publisher: "厚生労働省",
  publishedDate: "2026-04-01",
  publishedDateRaw: "令和8年4月1日",
  target: "general",
  category: "general",
  categoryLabel: "安全衛生関係",
  subCategory: null,
  languages: ["ja"],
  sourceUrl: "https://www.mhlw.go.jp/test",
  pdfUrl: "https://www.mhlw.go.jp/test.pdf",
  detailUrl: null,
  pageCount: 4,
};

describe("ChatbotNoticeCard", () => {
  it("空配列なら何も描画しない", () => {
    const { container } = render(<ChatbotNoticeCard notices={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("通達のタイトル・noticeNumber・bindingLevel・URL を表示", () => {
    render(<ChatbotNoticeCard notices={[SAMPLE_NOTICE]} />);
    expect(screen.getByText("テスト通達(熱中症ガイドライン)")).toBeDefined();
    expect(screen.getByText("基発0318第1号")).toBeDefined();
    expect(screen.getByText(/通達（行政解釈/)).toBeDefined();
    const link = screen.getByText("原文を開く").closest("a");
    expect(link?.getAttribute("href")).toBe(SAMPLE_NOTICE.detailUrl);
  });

  it("initialVisible 超過で「もっと見る」ボタン", () => {
    const many = Array.from({ length: 5 }, (_, i) => ({ ...SAMPLE_NOTICE, id: `test-${i}` }));
    render(<ChatbotNoticeCard notices={many} initialVisible={2} />);
    expect(screen.getByText("もっと見る (+3)")).toBeDefined();
  });

  it("もっと見るをクリックで全件表示", () => {
    const many = Array.from({ length: 4 }, (_, i) => ({
      ...SAMPLE_NOTICE,
      id: `test-${i}`,
      title: `テスト通達 ${i}`,
    }));
    render(<ChatbotNoticeCard notices={many} initialVisible={2} />);
    const btn = screen.getByText("もっと見る (+2)");
    fireEvent.click(btn);
    expect(screen.getByText("テスト通達 3")).toBeDefined();
  });

  it("拘束力 binding は赤系バッジ、reference はグレー系", () => {
    const bindingNotice: MhlwNotice = { ...SAMPLE_NOTICE, bindingLevel: "binding" };
    const { rerender } = render(<ChatbotNoticeCard notices={[bindingNotice]} />);
    expect(screen.getByText(/告示（拘束力あり/)).toBeDefined();
    const refNotice: MhlwNotice = { ...SAMPLE_NOTICE, bindingLevel: "reference" };
    rerender(<ChatbotNoticeCard notices={[refNotice]} />);
    expect(screen.getByText(/指針（参考/)).toBeDefined();
  });
});

describe("ChatbotLeafletCard", () => {
  it("空配列なら何も描画しない", () => {
    const { container } = render(<ChatbotLeafletCard leaflets={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("リーフレットのタイトル・カテゴリ・URL を表示", () => {
    render(<ChatbotLeafletCard leaflets={[SAMPLE_LEAFLET]} />);
    expect(screen.getByText("転倒防止対策リーフレット")).toBeDefined();
    expect(screen.getByText("安全衛生関係")).toBeDefined();
    const link = screen.getByText("原文を開く").closest("a");
    expect(link?.getAttribute("href")).toBe(SAMPLE_LEAFLET.pdfUrl);
  });
});
