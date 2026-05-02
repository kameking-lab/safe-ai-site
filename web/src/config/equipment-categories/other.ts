import type { EquipmentCategory } from "./types";

export const otherCategory: EquipmentCategory = {
  id: "other",
  label: "その他",
  icon: "🧰",
  description: "熱中症対策・防寒・救急用品・親綱など",
  dbCategoryIds: ["heat-stroke", "cold-protection", "first-aid", "lifeline"],
  refineQuestions: [
    {
      id: "purpose",
      label: "目的・用途",
      options: [
        { value: "any", label: "問わない" },
        { value: "熱中症", label: "熱中症対策（空調服・冷却ベスト）" },
        { value: "防寒", label: "防寒装備（冬季屋外）" },
        { value: "救急", label: "救急・応急用品（AED含む）" },
        { value: "親綱", label: "親綱・命綱（水平/垂直）" },
      ],
    },
    {
      id: "useCase",
      label: "使用場面",
      options: [
        { value: "any", label: "問わない" },
        { value: "屋外", label: "屋外現場" },
        { value: "屋内", label: "屋内・倉庫" },
        { value: "事務所", label: "事務所配備" },
      ],
    },
    {
      id: "budget",
      label: "予算",
      options: [
        { value: "any", label: "問わない" },
        { value: "low", label: "1万円以下" },
        { value: "mid", label: "1〜5万円" },
        { value: "high", label: "5万円以上" },
      ],
      optional: true,
    },
  ],
};
