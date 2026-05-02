import type { EquipmentCategory } from "./types";

export const gasMaskCategory: EquipmentCategory = {
  id: "gas-mask",
  label: "防毒マスク",
  icon: "🛡",
  description: "有機ガス・ハロゲン・硫化水素・アンモニアなど化学物質対応",
  dbCategoryIds: ["respiratory", "respiratory-fitting"],
  subCategoryIncludes: ["防毒", "吸収缶", "送気"],
  refineQuestions: [
    {
      id: "gasType",
      label: "対象ガス・物質",
      options: [
        { value: "any", label: "問わない" },
        { value: "有機ガス", label: "有機ガス（溶剤・塗装・印刷）" },
        { value: "ハロゲン", label: "ハロゲンガス" },
        { value: "硫化水素", label: "硫化水素（下水・タンク）" },
        { value: "アンモニア", label: "アンモニア（冷凍・畜産）" },
      ],
    },
    {
      id: "type",
      label: "マスク形式",
      options: [
        { value: "any", label: "問わない" },
        { value: "直結式", label: "直結式（小型）" },
        { value: "隔離式", label: "隔離式（高濃度対応）" },
        { value: "送気", label: "送気マスク（酸欠対応）" },
      ],
    },
    {
      id: "useCase",
      label: "作業内容",
      options: [
        { value: "any", label: "問わない" },
        { value: "短時間", label: "短時間・点検作業" },
        { value: "長時間", label: "長時間・連続作業" },
        { value: "緊急", label: "緊急対応・救助" },
      ],
    },
  ],
};
