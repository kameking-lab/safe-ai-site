import type { EquipmentCategory } from "./types";

export const lifeSavingCategory: EquipmentCategory = {
  id: "life-saving",
  label: "救命胴衣",
  icon: "🛟",
  description: "ライフジャケット・救命浮環（水辺・船上作業）",
  dbCategoryIds: ["rescue"],
  refineQuestions: [
    {
      id: "type",
      label: "形式",
      options: [
        { value: "any", label: "問わない" },
        { value: "自動膨張", label: "自動膨張式（水感知）" },
        { value: "手動膨張", label: "手動膨張式" },
        { value: "固形", label: "固形式（標準）" },
        { value: "作業用", label: "作業用救命胴衣" },
      ],
    },
    {
      id: "useCase",
      label: "用途",
      options: [
        { value: "any", label: "問わない" },
        { value: "船上", label: "船上・漁業" },
        { value: "河川", label: "河川・湖沼の岸辺作業" },
        { value: "港湾", label: "港湾・桟橋" },
      ],
    },
    {
      id: "extra",
      label: "追加要件",
      options: [
        { value: "any", label: "問わない" },
        { value: "桜マーク", label: "桜マーク（国土交通省型式承認）" },
        { value: "高視認", label: "高視認カラー" },
      ],
      optional: true,
    },
  ],
};
