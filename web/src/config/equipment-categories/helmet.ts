import type { EquipmentCategory } from "./types";

export const helmetCategory: EquipmentCategory = {
  id: "helmet",
  label: "ヘルメット",
  icon: "⛑",
  description: "保護帽（飛来落下物・墜落・電気用）",
  dbCategoryIds: ["head-protection"],
  refineQuestions: [
    {
      id: "material",
      label: "素材",
      options: [
        { value: "any", label: "問わない" },
        { value: "ABS", label: "ABS（軽量・標準）" },
        { value: "PC", label: "PC（ポリカ・透明素材）" },
        { value: "FRP", label: "FRP（耐電圧）" },
        { value: "MP", label: "MP（耐熱・耐衝撃）" },
      ],
    },
    {
      id: "purpose",
      label: "主用途",
      options: [
        { value: "any", label: "問わない" },
        { value: "兼用", label: "飛来・墜落兼用" },
        { value: "通気", label: "通気孔付き（夏季対応）" },
        { value: "電気", label: "電気作業（耐電圧）" },
      ],
    },
    {
      id: "extra",
      label: "追加機能",
      options: [
        { value: "any", label: "問わない" },
        { value: "顎ひも一体", label: "顎ひも一体型" },
        { value: "インナー", label: "インナーキャップ込み" },
      ],
      optional: true,
    },
  ],
};
