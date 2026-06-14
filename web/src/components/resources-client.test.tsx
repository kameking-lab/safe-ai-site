import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { ResourcesClient } from "./resources-client";
import type { MhlwNotice } from "@/data/mhlw-notices";
import type { MhlwLeaflet } from "@/data/mhlw-leaflets";

// 厚労省一次資料DB(/resources)のフィルタ・検索・各エントリ操作の最小フィクスチャ
const notices: MhlwNotice[] = [
  {
    id: "n1",
    title: "熱中症防止対策ガイドラインの策定について",
    issuedDate: "2026-03-18",
    issuedDateRaw: "令和8年3月18日",
    noticeNumber: "基発0318第1号",
    issuer: "厚生労働省労働基準局長",
    bindingLevel: "indirect",
    sourceUrl: "https://example.com/notice/source",
    detailUrl: "https://example.com/notice/detail",
    pdfUrl: null,
    category: "heat-stroke",
    docType: "通達",
    lawRef: "安衛法第22条",
  },
];

const leaflets: MhlwLeaflet[] = [
  {
    id: "l1",
    title: "転倒防止対策について",
    publisher: "厚生労働省",
    publishedDate: null,
    publishedDateRaw: "令和7年",
    target: "employer",
    category: "fall",
    categoryLabel: "転倒",
    subCategory: null,
    languages: ["ja"],
    sourceUrl: "https://example.com/leaflet/source",
    pdfUrl: "https://example.com/leaflet/file.pdf",
    detailUrl: null,
    pageCount: 2,
  },
];

describe("/resources 厚労省一次資料DB 柱0 44pxタップ標的", () => {
  it("キーワード検索の入力が 44px タップ標的を満たす", () => {
    render(<ResourcesClient notices={notices} leaflets={leaflets} />);
    const input = screen.getByPlaceholderText(/熱中症/);
    expect(input.className).toContain("min-h-[44px]");
  });

  it("カテゴリ・法的拘束力・年度のフィルタselectが 44px タップ標的を満たす", () => {
    render(<ResourcesClient notices={notices} leaflets={leaflets} />);
    const selects = screen.getAllByRole("combobox");
    expect(selects.length).toBeGreaterThanOrEqual(3);
    for (const select of selects) {
      expect(select.className).toContain("min-h-[44px]");
    }
  });

  it("条件クリアボタンが 44px タップ標的を満たす", () => {
    render(<ResourcesClient notices={notices} leaflets={leaflets} />);
    const reset = screen.getByRole("button", { name: /条件クリア/ });
    expect(reset.className).toContain("min-h-[44px]");
  });

  it("通達エントリの原文リンク・目次に戻るリンクが 44px タップ標的を満たす", () => {
    render(<ResourcesClient notices={notices} leaflets={leaflets} />);
    const original = screen.getByRole("link", { name: /原文（安全衛生情報センター）/ });
    expect(original.className).toContain("min-h-[44px]");
    const back = screen.getByRole("link", { name: /目次に戻る/ });
    expect(back.className).toContain("min-h-[44px]");
  });

  it("リーフレットエントリのPDFリンク・一覧リンクが 44px タップ標的を満たす", async () => {
    render(<ResourcesClient notices={notices} leaflets={leaflets} />);
    // リーフレットタブへ切替
    screen.getByRole("tab", { name: /リーフレット/ }).click();
    const pdf = await screen.findByRole("link", { name: /PDFを開く（厚労省）/ });
    expect(pdf.className).toContain("min-h-[44px]");
    const list = screen.getByRole("link", { name: /^一覧$/ });
    expect(list.className).toContain("min-h-[44px]");
  });
});
