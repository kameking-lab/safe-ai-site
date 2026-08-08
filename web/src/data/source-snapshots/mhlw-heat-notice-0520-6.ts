/**
 * 厚生労働省の公式掲載ページから取得した基発0520第6号の固定情報。
 *
 * PDFそのものは監査証跡へ保存し、テストでbytesのSHA-256と該当ページの
 * 抽出本文を独立再計算する。snapshot/hash整合は外部法務・医学レビューの
 * 完了を意味しない。
 */
export const MHLW_HEAT_NOTICE_0520_6_SNAPSHOT = {
  documentNumber: "基発0520第6号",
  title: "労働安全衛生規則の一部を改正する省令の施行等について",
  publisher: "厚生労働省",
  issuer: "厚生労働省労働基準局長",
  publishedAt: "2025-05-20",
  retrievedAt: "2026-07-26",
  landingUrl:
    "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000116133.html",
  url: "https://www.mhlw.go.jp/content/11303000/001490911.pdf",
  locator: "PDF 2ページ 第3 1(1)イ",
  pdfPages: 32,
  pdfBytes: 595_940,
  pdfSha256:
    "73f5bd365128cf6a033293b6d2e64bbbd469bf38bed1a3e0e73a2a9d3d688615",
  excerpt:
    "「暑熱な場所」とは、湿球黒球温度（WBGT）が28度以上又は気温が31度以上の場所をいい、必ずしも事業場内外の特定の作業場のみを指すものではなく、出張先で作業を行う場合、労働者が移動して複数の場所で作業を行う場合や、作業場所から作業場所への移動時等も含む趣旨であること。また、「暑熱な場所において連続して行われる作業等熱中症を生ずるおそれのある作業」とは、上記の場所において、継続して１時間以上又は１日当たり４時間を超えて行われることが見込まれる作業をいうこと。",
  excerptSha256:
    "9e159c96f2684bcbf9607675e6d3fe6b27b03d19b8e8535934b9c3ab5f024b1a",
  independentPrimarySourceReview: {
    reviewedAt: "2026-08-02",
    status: "matched",
    method: "独立一次資料照合",
    scope:
      "厚生労働省掲載ページ、公式PDF、文書番号、発出日、発出者、題名、全32頁、bytes、SHA-256、PDF 2ページの該当抜粋",
    humanLegalReviewStatus: "not-reviewed",
  },
  humanReviewStatus: "not-reviewed",
} as const;
