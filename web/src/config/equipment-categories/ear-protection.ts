import type { EquipmentCategory } from "./types";

export const earProtectionCategory: EquipmentCategory = {
  id: "ear-protection",
  label: "防音保護具",
  icon: "🎧",
  description: "耳栓・イヤーマフ（騒音作業対応）",
  dbCategoryIds: ["hearing-protection"],
  refineQuestions: [
    {
      id: "type",
      label: "形状",
      options: [
        { value: "any", label: "問わない" },
        { value: "耳栓", label: "耳栓（使い捨て / シリコン）" },
        { value: "イヤーマフ", label: "イヤーマフ（標準）" },
        { value: "高遮音", label: "イヤーマフ（高遮音 SNR 35dB）" },
        { value: "ヘルメット取付", label: "ヘルメット取付型" },
      ],
    },
    {
      id: "communication",
      label: "通信機能",
      options: [
        { value: "any", label: "問わない" },
        { value: "無し", label: "通信機能なし" },
        { value: "有り", label: "通信機能付き（無線連携）" },
      ],
      optional: true,
    },
    {
      id: "useCase",
      label: "騒音レベル・用途",
      options: [
        { value: "any", label: "問わない" },
        { value: "低", label: "断続的（85〜90dB）" },
        { value: "中", label: "連続騒音（90〜100dB）" },
        { value: "高", label: "強騒音（100dB超・建設機械）" },
      ],
    },
  ],
};
