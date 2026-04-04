export type MapAlertLevel = "none" | "advisory" | "warning";

export type JapanRegionId =
  | "hokkaido"
  | "tohoku"
  | "kanto"
  | "chubu"
  | "kinki"
  | "chugoku"
  | "shikoku"
  | "kyushu";

export const japanRegionMeta: { id: JapanRegionId; label: string }[] = [
  { id: "hokkaido", label: "北海道" },
  { id: "tohoku", label: "東北" },
  { id: "kanto", label: "関東" },
  { id: "chubu", label: "中部" },
  { id: "kinki", label: "近畿" },
  { id: "chugoku", label: "中国" },
  { id: "shikoku", label: "四国" },
  { id: "kyushu", label: "九州" },
];

/** 本日の注意報・警報イメージ（モック）。本番は気象庁データで上書き。 */
export const todayRegionAlerts: Record<JapanRegionId, MapAlertLevel> = {
  hokkaido: "advisory",
  tohoku: "none",
  kanto: "warning",
  chubu: "advisory",
  kinki: "none",
  chugoku: "advisory",
  shikoku: "none",
  kyushu: "warning",
};

/** 1週間予想の最大リスクイメージ（モック） */
export const weekMaxRegionAlerts: Record<JapanRegionId, MapAlertLevel> = {
  hokkaido: "none",
  tohoku: "advisory",
  kanto: "advisory",
  chubu: "warning",
  kinki: "advisory",
  chugoku: "none",
  shikoku: "advisory",
  kyushu: "advisory",
};
