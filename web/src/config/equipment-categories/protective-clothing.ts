import type { EquipmentCategory } from "./types";

export const protectiveClothingCategory: EquipmentCategory = {
  id: "protective-clothing",
  label: "保護衣",
  icon: "🥼",
  description: "化学防護服・防炎服・帯電防止服など特殊作業服",
  dbCategoryIds: ["protective-clothing", "respiratory-fitting"],
  subCategoryIncludes: ["化学防護服", "防炎", "帯電", "保護衣"],
  refineQuestions: [
    {
      id: "purpose",
      label: "主用途",
      options: [
        { value: "any", label: "問わない" },
        { value: "化学", label: "化学防護（タイプ4/5/6）" },
        { value: "防炎", label: "防炎（アラミド）" },
        { value: "帯電防止", label: "帯電防止" },
        { value: "高視認", label: "高視認＋防炎" },
      ],
    },
    {
      id: "level",
      label: "性能レベル",
      options: [
        { value: "any", label: "問わない" },
        { value: "軽度", label: "軽度（タイプ6・短時間）" },
        { value: "中度", label: "中度（タイプ4/5・粒子飛沫）" },
        { value: "高度", label: "高度（液体噴霧 / 高熱対応）" },
      ],
    },
    {
      id: "useCase",
      label: "業種",
      options: [
        { value: "any", label: "問わない" },
        { value: "化学", label: "化学・製薬" },
        { value: "鉄鋼", label: "鉄鋼・溶接" },
        { value: "電子", label: "電子・精密（帯電防止）" },
        { value: "保守", label: "屋外・保守作業" },
      ],
    },
  ],
};
