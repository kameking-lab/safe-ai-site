import type { VisualKyCategory } from "./schema";

export type VisualKyCategoryDefinition = {
  id: VisualKyCategory;
  label: string;
  shortLabel: string;
  color: string;
  paleColor: string;
  icon:
    | "shield-alert"
    | "construction"
    | "package-open"
    | "zap"
    | "flame"
    | "flask-conical"
    | "thermometer-sun"
    | "footprints"
    | "move-up"
    | "panels-top-left"
    | "triangle-alert"
    | "user-round"
    | "badge-help"
    | "moon-star"
    | "traffic-cone";
  description: string;
};

export const VISUAL_KY_CATEGORY_DEFINITIONS: readonly VisualKyCategoryDefinition[] =
  [
    {
      id: "fall",
      label: "墜落・転落",
      shortLabel: "墜落",
      color: "#BE123C",
      paleColor: "#FFE4E6",
      icon: "shield-alert",
      description: "開口部、端部、取付点、落下経路から危険を考えます。",
    },
    {
      id: "heavy-equipment",
      label: "重機・車両",
      shortLabel: "重機",
      color: "#C2410C",
      paleColor: "#FFEDD5",
      icon: "construction",
      description: "死角、旋回範囲、合図者、歩車分離を確認します。",
    },
    {
      id: "load-handling",
      label: "荷役・挟まれ",
      shortLabel: "荷役",
      color: "#B45309",
      paleColor: "#FEF3C7",
      icon: "package-open",
      description: "荷の重心、車輪、手足、倒壊・挟圧線を確認します。",
    },
    {
      id: "electrical",
      label: "電気",
      shortLabel: "電気",
      color: "#1D4ED8",
      paleColor: "#DBEAFE",
      icon: "zap",
      description: "電源、損傷、湿潤、遮断、接地を確認します。",
    },
    {
      id: "fire-explosion",
      label: "火災・爆発",
      shortLabel: "火気",
      color: "#DC2626",
      paleColor: "#FEE2E2",
      icon: "flame",
      description: "着火源、可燃物、火気監視、初期消火を確認します。",
    },
    {
      id: "chemical",
      label: "化学物質",
      shortLabel: "化学",
      color: "#0F766E",
      paleColor: "#CCFBF1",
      icon: "flask-conical",
      description: "容器、飛散、換気、混在、SDSから考えます。",
    },
    {
      id: "heat",
      label: "熱中症",
      shortLabel: "熱中症",
      color: "#EA580C",
      paleColor: "#FFEDD5",
      icon: "thermometer-sun",
      description: "暑熱、初期症状、相互確認、休憩・冷却を確認します。",
    },
    {
      id: "trip",
      label: "転倒",
      shortLabel: "転倒",
      color: "#7C3AED",
      paleColor: "#EDE9FE",
      icon: "footprints",
      description: "段差、濡れ、障害物、足元の視界を確認します。",
    },
    {
      id: "high-work-platform",
      label: "高所作業車",
      shortLabel: "高所作業車",
      color: "#DB2777",
      paleColor: "#FCE7F3",
      icon: "move-up",
      description: "上方障害、挟圧、足元、監視体制を確認します。",
    },
    {
      id: "scaffold",
      label: "足場",
      shortLabel: "足場",
      color: "#9F1239",
      paleColor: "#FFF1F2",
      icon: "panels-top-left",
      description: "手すり、床材、端部、落下物を確認します。",
    },
    {
      id: "stepladder",
      label: "脚立",
      shortLabel: "脚立",
      color: "#9333EA",
      paleColor: "#F3E8FF",
      icon: "triangle-alert",
      description: "天板付近、横荷重、開き止め、設置面を確認します。",
    },
    {
      id: "lone-work",
      label: "一人作業",
      shortLabel: "一人作業",
      color: "#334155",
      paleColor: "#E2E8F0",
      icon: "user-round",
      description: "連絡、救援、遮断、退路を確認します。",
    },
    {
      id: "newcomer",
      label: "新規入場者",
      shortLabel: "新規入場",
      color: "#0891B2",
      paleColor: "#CFFAFE",
      icon: "badge-help",
      description: "誘導、立入範囲、理解確認、同行を確認します。",
    },
    {
      id: "night",
      label: "夜間",
      shortLabel: "夜間",
      color: "#4338CA",
      paleColor: "#E0E7FF",
      icon: "moon-star",
      description: "照度、眩惑、影、反射、見張りを確認します。",
    },
    {
      id: "traffic",
      label: "交通",
      shortLabel: "交通",
      color: "#0369A1",
      paleColor: "#E0F2FE",
      icon: "traffic-cone",
      description: "後退、歩車分離、悪天候、誘導を確認します。",
    },
  ] as const;

export function getVisualKyCategory(
  id: VisualKyCategory,
): VisualKyCategoryDefinition {
  const category = VISUAL_KY_CATEGORY_DEFINITIONS.find(
    (candidate) => candidate.id === id,
  );
  if (!category) {
    throw new Error(`Unknown visual KY category: ${id}`);
  }
  return category;
}
