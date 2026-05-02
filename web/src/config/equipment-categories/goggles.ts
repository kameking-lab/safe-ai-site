import type { EquipmentCategory } from "./types";

export const gogglesCategory: EquipmentCategory = {
  id: "goggles",
  label: "保護メガネ",
  icon: "🥽",
  description: "保護メガネ・ゴーグル・フェイスシールド",
  dbCategoryIds: ["eye-protection"],
  refineQuestions: [
    {
      id: "type",
      label: "形状",
      options: [
        { value: "any", label: "問わない" },
        { value: "一眼", label: "一眼式（軽量）" },
        { value: "二眼", label: "二眼式" },
        { value: "ゴグル", label: "密閉ゴグル（粉じん・薬品）" },
        { value: "シールド", label: "顔面シールド" },
      ],
    },
    {
      id: "purpose",
      label: "主用途",
      options: [
        { value: "any", label: "問わない" },
        { value: "粉じん", label: "粉じん・切粉" },
        { value: "化学", label: "化学物質・薬品" },
        { value: "溶接", label: "溶接（遮光）" },
        { value: "UVIR", label: "UV/IR カット" },
      ],
    },
    {
      id: "feature",
      label: "追加機能",
      options: [
        { value: "any", label: "問わない" },
        { value: "曇り止め", label: "曇り止め" },
        { value: "メガネ併用", label: "矯正メガネ併用" },
      ],
      optional: true,
    },
  ],
};
