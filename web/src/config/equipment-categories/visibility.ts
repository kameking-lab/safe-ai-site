import type { EquipmentCategory } from "./types";

export const visibilityCategory: EquipmentCategory = {
  id: "visibility",
  label: "視認性ベスト",
  icon: "🦺",
  description: "高視認性安全服（クラス2/3・LED内蔵・反射）",
  dbCategoryIds: ["high-vis"],
  refineQuestions: [
    {
      id: "class",
      label: "JIS T 8127 クラス",
      options: [
        { value: "any", label: "問わない" },
        { value: "クラス2", label: "クラス2（夜間・薄暮）" },
        { value: "クラス3", label: "クラス3（高速道路・最大可視性）" },
      ],
    },
    {
      id: "type",
      label: "タイプ",
      options: [
        { value: "any", label: "問わない" },
        { value: "ベスト", label: "ベスト" },
        { value: "ジャンパー", label: "ジャンパー" },
        { value: "レインウェア", label: "レインウェア" },
        { value: "LED", label: "LEDライト付き" },
      ],
    },
    {
      id: "useCase",
      label: "現場",
      options: [
        { value: "any", label: "問わない" },
        { value: "道路", label: "道路工事・交通誘導" },
        { value: "倉庫", label: "倉庫・構内運搬" },
        { value: "夜間", label: "夜間作業" },
      ],
    },
  ],
};
