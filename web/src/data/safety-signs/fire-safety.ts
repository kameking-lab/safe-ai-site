import type { SafetySign } from "@/types/safety-sign";

/**
 * Fire-safety signs (防火標識) per JIS Z 9101 and Japanese fire law.
 *
 * Visual convention: red square with a white pictogram. Mark the
 * location of fire-fighting equipment, alarms and rescue resources.
 */
export const FIRE_SAFETY_SIGNS: SafetySign[] = [
  {
    id: "fire-extinguisher",
    name: "消火器",
    nameEn: "Fire extinguisher",
    category: "fire-safety",
    shape: "square",
    primaryColor: "red",
    contrastColor: "white",
    meaning: "消火器の設置位置を示す。",
    usageGuide: "消火器設置場所の真上、または視認しやすい壁面に掲示。",
    placement: {
      heightMm: { min: 1500, max: 2000 },
      locations: ["消火器設置位置上方", "通路角"],
      notes: "消火器標識は床上1.5m以下に下端があるとより視認性が高い。",
    },
    relatedLaws: [
      {
        statute: "消防法施行規則",
        article: "第9条",
        note: "消火器の標識による設置場所明示。",
      },
    ],
    industryUsage: [
      { industry: "service", requirement: "required", examples: ["店舗", "ホテル"] },
      { industry: "manufacturing", requirement: "required", examples: ["工場棟"] },
      { industry: "construction", requirement: "required", examples: ["仮設事務所", "資材置場"] },
    ],
    references: [{ standard: "JIS Z 9101", code: "F-1" }, { standard: "ISO 7010", code: "F001" }],
    pictogramId: "fire-extinguisher",
  },
  {
    id: "fire-hose",
    name: "消火栓・ホース格納箱",
    nameEn: "Fire hose / hydrant cabinet",
    category: "fire-safety",
    shape: "square",
    primaryColor: "red",
    contrastColor: "white",
    meaning: "屋内消火栓・ホース格納箱の位置を示す。",
    usageGuide: "屋内消火栓設備の格納箱付近、ホースリール格納庫に表示。",
    placement: {
      heightMm: { min: 1500, max: 2200 },
      locations: ["消火栓格納箱上部"],
    },
    relatedLaws: [
      {
        statute: "消防法施行規則",
        article: "第12条",
        note: "屋内消火栓設備の表示。",
      },
    ],
    industryUsage: [
      { industry: "manufacturing", requirement: "required", examples: ["工場棟"] },
      { industry: "service", requirement: "required", examples: ["商業施設", "ホテル"] },
      { industry: "warehouse", requirement: "required", examples: ["倉庫"] },
    ],
    references: [{ standard: "JIS Z 9101", code: "F-2" }, { standard: "ISO 7010", code: "F002" }],
    pictogramId: "fire-hose",
  },
  {
    id: "fire-alarm",
    name: "火災報知器",
    nameEn: "Fire alarm call point",
    category: "fire-safety",
    shape: "square",
    primaryColor: "red",
    contrastColor: "white",
    meaning: "手動火災報知器（押しボタン）の位置を示す。",
    usageGuide: "発信機（押しボタン式火災報知機）設置位置の上方に掲示。",
    placement: {
      heightMm: { min: 1500, max: 1900 },
      locations: ["発信機直上"],
    },
    relatedLaws: [
      {
        statute: "消防法施行規則",
        article: "第24条",
        note: "自動火災報知設備の発信機の表示。",
      },
    ],
    industryUsage: [
      { industry: "service", requirement: "required", examples: ["商業ビル"] },
      { industry: "manufacturing", requirement: "required", examples: ["工場棟"] },
      { industry: "healthcare", requirement: "required", examples: ["病院"] },
    ],
    references: [{ standard: "JIS Z 9101", code: "F-3" }, { standard: "ISO 7010", code: "F005" }],
    pictogramId: "fire-alarm",
  },
  {
    id: "fire-phone",
    name: "火災通報電話",
    nameEn: "Fire emergency telephone",
    category: "fire-safety",
    shape: "square",
    primaryColor: "red",
    contrastColor: "white",
    meaning: "消防機関への直接通報電話の位置を示す。",
    usageGuide: "消防機関へ通報する電話設備（消防機関へ通報する火災報知設備）に表示。",
    placement: {
      heightMm: { min: 1400, max: 1900 },
      locations: ["通報装置直上"],
    },
    relatedLaws: [
      {
        statute: "消防法施行規則",
        article: "第25条",
        note: "消防機関へ通報する火災報知設備の表示。",
      },
    ],
    industryUsage: [
      { industry: "healthcare", requirement: "required", examples: ["病院ナースステーション"] },
      { industry: "service", requirement: "required", examples: ["ホテル防災センター"] },
    ],
    references: [{ standard: "JIS Z 9101", code: "F-4" }, { standard: "ISO 7010", code: "F006" }],
    pictogramId: "fire-phone",
  },
  {
    id: "fire-ladder",
    name: "消防用はしご",
    nameEn: "Fire ladder",
    category: "fire-safety",
    shape: "square",
    primaryColor: "red",
    contrastColor: "white",
    meaning: "消防隊用のはしご・進入経路を示す。",
    usageGuide: "非常用進入口、屋外消防用はしご、消防隊専用エレベーターの位置に表示。",
    placement: {
      heightMm: { min: 1500, max: 2400 },
      locations: ["非常用進入口外壁", "屋外はしご"],
    },
    relatedLaws: [
      {
        statute: "建築基準法施行令",
        article: "第126条の6",
        note: "非常用進入口の表示。",
      },
    ],
    industryUsage: [
      { industry: "service", requirement: "required", examples: ["高層オフィスビル"] },
      { industry: "healthcare", requirement: "required", examples: ["高層病院"] },
    ],
    references: [{ standard: "JIS Z 9101", code: "F-5" }, { standard: "ISO 7010", code: "F003" }],
    pictogramId: "fire-ladder",
  },
  {
    id: "fire-hydrant",
    name: "屋外消火栓",
    nameEn: "Outdoor fire hydrant",
    category: "fire-safety",
    shape: "square",
    primaryColor: "red",
    contrastColor: "white",
    meaning: "屋外消火栓の位置を示す。",
    usageGuide: "屋外消火栓設備、敷地内消火栓、危険物施設の消火栓に表示。",
    placement: {
      heightMm: { min: 1500, max: 2400 },
      locations: ["屋外消火栓上方", "ポール標識"],
    },
    relatedLaws: [
      {
        statute: "消防法施行規則",
        article: "第22条",
        note: "屋外消火栓設備の表示。",
      },
    ],
    industryUsage: [
      { industry: "manufacturing", requirement: "required", examples: ["工場敷地内"] },
      { industry: "chemical", requirement: "required", examples: ["危険物施設"] },
      { industry: "warehouse", requirement: "required", examples: ["大型物流センター"] },
    ],
    references: [{ standard: "JIS Z 9101", code: "F-6" }, { standard: "ISO 7010", code: "F007" }],
    pictogramId: "fire-hydrant",
  },
  {
    id: "fire-blanket",
    name: "防火毛布",
    nameEn: "Fire blanket",
    category: "fire-safety",
    shape: "square",
    primaryColor: "red",
    contrastColor: "white",
    meaning: "防火毛布の設置場所を示す。",
    usageGuide: "業務用厨房、実験室、塗装ブース手前の防火毛布収納場所に掲示。",
    placement: {
      heightMm: { min: 1400, max: 1900 },
      locations: ["防火毛布収納場所"],
    },
    relatedLaws: [
      {
        statute: "消防法",
        article: "第8条",
        note: "防火管理上必要な消火用具の整備。",
      },
    ],
    industryUsage: [
      { industry: "service", requirement: "required", examples: ["業務用厨房"] },
      { industry: "manufacturing", requirement: "recommended", examples: ["実験室", "塗装ブース"] },
    ],
    references: [{ standard: "JIS Z 9101", code: "F-7" }, { standard: "ISO 7010", code: "F008" }],
    pictogramId: "fire-blanket",
  },
  {
    id: "fire-axe",
    name: "消防斧",
    nameEn: "Fire axe",
    category: "fire-safety",
    shape: "square",
    primaryColor: "red",
    contrastColor: "white",
    meaning: "消防用斧（破壊器具）の設置場所を示す。",
    usageGuide: "消防設備保管庫、防災センター、危険物施設の破壊器具保管場所に表示。",
    placement: {
      heightMm: { min: 1400, max: 1900 },
      locations: ["破壊器具保管庫"],
    },
    relatedLaws: [
      {
        statute: "消防法施行規則",
        note: "消防用設備の維持管理。",
      },
    ],
    industryUsage: [
      { industry: "manufacturing", requirement: "recommended", examples: ["危険物施設"] },
      { industry: "chemical", requirement: "recommended", examples: ["プラント防災センター"] },
    ],
    references: [{ standard: "JIS Z 9101", code: "F-8" }],
    pictogramId: "fire-axe",
  },
  {
    id: "fire-pump",
    name: "連結送水管",
    nameEn: "Fire pump connection",
    category: "fire-safety",
    shape: "square",
    primaryColor: "red",
    contrastColor: "white",
    meaning: "消防車から送水するための連結送水管の位置を示す。",
    usageGuide: "高層建築外壁、地下街、トンネル入口の送水口に表示。",
    placement: {
      heightMm: { min: 1200, max: 2200 },
      locations: ["送水口直上", "送水口扉"],
    },
    relatedLaws: [
      {
        statute: "消防法施行規則",
        article: "第31条",
        note: "連結送水管の表示。",
      },
    ],
    industryUsage: [
      { industry: "service", requirement: "required", examples: ["高層商業ビル"] },
      { industry: "construction", requirement: "required", examples: ["地下構造物"] },
    ],
    references: [{ standard: "JIS Z 9101", code: "F-9" }],
    pictogramId: "fire-pump",
  },
  {
    id: "fire-assembly",
    name: "消防隊集結場所",
    nameEn: "Fire brigade assembly",
    category: "fire-safety",
    shape: "square",
    primaryColor: "red",
    contrastColor: "white",
    meaning: "災害時に消防隊が集結する場所を示す。",
    usageGuide: "大規模事業所の防災計画における消防隊集結ポイントに表示。",
    placement: {
      heightMm: { min: 1500, max: 2500 },
      locations: ["敷地内集結地点", "防災センター付近"],
    },
    relatedLaws: [
      {
        statute: "消防法",
        article: "第8条",
        note: "防火管理計画の整備。",
      },
    ],
    industryUsage: [
      { industry: "manufacturing", requirement: "recommended", examples: ["大規模工場"] },
      { industry: "chemical", requirement: "required", examples: ["プラント敷地"] },
    ],
    references: [{ standard: "JIS Z 9101", code: "F-10" }],
    pictogramId: "fire-assembly",
  },
];
