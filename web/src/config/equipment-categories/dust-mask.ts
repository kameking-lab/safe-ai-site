import type { EquipmentCategory } from "./types";

export const dustMaskCategory: EquipmentCategory = {
  id: "dust-mask",
  label: "防塵マスク",
  icon: "😷",
  description: "粉じん・じん肺対策（DS2/DS3/RL2/RL3/PAPR）",
  dbCategoryIds: ["respiratory"],
  subCategoryIncludes: ["防じん", "PAPR"],
  refineQuestions: [
    {
      id: "grade",
      label: "国家検定区分",
      options: [
        { value: "any", label: "問わない" },
        { value: "DS2", label: "DS2（一般作業・使い捨て）" },
        { value: "DS3", label: "DS3（高粉じん作業）" },
        { value: "RL2", label: "RL2（取替式・標準）" },
        { value: "RL3", label: "RL3（取替式・高粉じん）" },
        { value: "PAPR", label: "PAPR（電動ファン付き）" },
      ],
    },
    {
      id: "dustType",
      label: "粉じんの種類",
      options: [
        { value: "any", label: "問わない" },
        { value: "金属", label: "金属粉じん（溶接・研磨）" },
        { value: "アスベスト", label: "アスベスト・有害粉じん" },
        { value: "木材", label: "木材・建材粉じん" },
        { value: "鉱物", label: "鉱物・砕石粉じん" },
      ],
    },
    {
      id: "useCase",
      label: "使用頻度",
      options: [
        { value: "any", label: "問わない" },
        { value: "spot", label: "短時間・スポット作業" },
        { value: "regular", label: "毎日・連続使用" },
      ],
    },
  ],
};
