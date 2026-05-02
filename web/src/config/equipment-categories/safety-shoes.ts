import type { EquipmentCategory } from "./types";

export const safetyShoesCategory: EquipmentCategory = {
  id: "safety-shoes",
  label: "安全靴",
  icon: "👢",
  description: "JIS / JSAA 認定の安全靴・プロスニーカー",
  dbCategoryIds: ["foot-protection"],
  refineQuestions: [
    {
      id: "spec",
      label: "規格",
      options: [
        { value: "any", label: "問わない" },
        { value: "JIS S", label: "JIS S 種（重作業）" },
        { value: "JIS L", label: "JIS L 種（軽作業）" },
        { value: "JSAA A", label: "JSAA A種（プロスニーカー）" },
        { value: "JSAA B", label: "JSAA B種（軽作業向けスニーカー）" },
      ],
    },
    {
      id: "feature",
      label: "追加機能",
      options: [
        { value: "any", label: "問わない" },
        { value: "踏み抜き", label: "踏み抜き防止インソール" },
        { value: "耐滑", label: "耐滑性（F合格）" },
        { value: "静電気", label: "静電気帯電防止" },
        { value: "耐熱", label: "耐熱・耐切創" },
      ],
    },
    {
      id: "useCase",
      label: "現場種別",
      options: [
        { value: "any", label: "問わない" },
        { value: "建設", label: "建設・土木" },
        { value: "工場", label: "工場・倉庫" },
        { value: "電気", label: "電気・通信工事" },
      ],
    },
  ],
};
