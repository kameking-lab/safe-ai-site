import type { EquipmentCategory } from "./types";

export const glovesCategory: EquipmentCategory = {
  id: "gloves",
  label: "手袋",
  icon: "🧤",
  description: "耐切創・耐熱・防振・絶縁・耐薬品ほか",
  dbCategoryIds: ["hand-protection", "respiratory-fitting"],
  subCategoryIncludes: ["手袋"],
  refineQuestions: [
    {
      id: "purpose",
      label: "主目的",
      options: [
        { value: "any", label: "問わない" },
        { value: "切創", label: "耐切創（HPPE / ステンレス繊維）" },
        { value: "耐熱", label: "耐熱（200℃級 / 500℃級）" },
        { value: "防振", label: "防振（ISO 10819）" },
        { value: "絶縁", label: "電気絶縁（低圧 / 高圧）" },
        { value: "薬品", label: "耐薬品（ニトリル）" },
        { value: "汎用", label: "汎用（革手袋）" },
      ],
    },
    {
      id: "level",
      label: "性能レベル",
      options: [
        { value: "any", label: "問わない" },
        { value: "標準", label: "標準（日常作業）" },
        { value: "高性能", label: "高性能（重作業・特殊作業）" },
      ],
    },
    {
      id: "useCase",
      label: "業種",
      options: [
        { value: "any", label: "問わない" },
        { value: "建設", label: "建設・土木" },
        { value: "製造", label: "製造・組立" },
        { value: "電気", label: "電気工事" },
        { value: "化学", label: "化学・薬品取扱" },
      ],
    },
  ],
};
