/**
 * Primary-source locator for the 2025 heat-illness amendment.
 *
 * Keep statutory duties separate from preventive recommendations.  The
 * latter remain important workplace controls, but are not additional
 * paragraphs of Article 612-2.
 *
 * URL retrieval is not a substitute for external legal review. Keep the
 * verification fields fail-closed until that review is recorded.
 */
export const HEAT_ILLNESS_2025_LEGAL_SOURCE = {
  title: "労働安全衛生規則の一部を改正する省令",
  ordinanceNumber: "令和7年厚生労働省令第57号",
  officialNoticeNumber: "厚生労働省令第57号",
  promulgatedAt: "2025-04-15",
  effectiveFrom: "2025-06-01",
  article: "労働安全衛生規則第612条の2",
  implementationNotice: "基発0520第6号",
  targetGuidance:
    "WBGT28度以上又は気温31度以上の環境で、連続1時間以上又は1日4時間を超える作業が見込まれる場合が目安です。個別現場の実態も確認してください。",
  duties: [
    {
      id: "reporting-system",
      paragraph: "第1項",
      title: "異常を報告できる体制の整備と周知",
      summary:
        "本人が自覚症状を感じた場合、又は周囲が熱中症の疑いを発見した場合に、あらかじめ定めた担当者へ直ちに報告できる体制を整備し、作業者へ周知します。",
    },
    {
      id: "response-procedure",
      paragraph: "第2項",
      title: "症状悪化を防ぐ手順の作成と周知",
      summary:
        "作業離脱、身体冷却、必要に応じた医師の診察・処置その他の悪化防止措置について、作業場ごとの手順を定め、作業者へ周知します。",
    },
  ],
  sources: [
    {
      label: "厚生労働省 改正省令・施行通達",
      url: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000116133.html",
    },
    {
      label: "厚生労働省 基発0520第6号",
      url: "https://www.mhlw.go.jp/content/11303000/001490911.pdf",
    },
    {
      label: "e-Gov 労働安全衛生規則",
      url: "https://laws.e-gov.go.jp/law/347M50002000032",
    },
  ],
  sourceStatus: "url-confirmed-content-review-pending",
  retrievedAt: "2026-07-23",
  verifiedAt: null,
  reviewStatus: "external-legal-review-pending",
} as const;

/** Important controls that must not be presented as extra statutory clauses. */
export const HEAT_ILLNESS_PREVENTION_RECOMMENDATIONS = [
  "現場のWBGTを把握し、作業強度・服装・直射日光等を含めてリスクを評価する",
  "暑熱順化、休憩場所、水分・塩分、通風・冷却設備を現場条件に応じて計画する",
  "作業前と作業中に体調を確認し、単独作業を避ける等の相互確認を行う",
  "教育・訓練と記録を行い、事業場の手順を継続的に見直す",
] as const;
