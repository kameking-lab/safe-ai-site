export const SAFETY_SIGN_MARKET_CATEGORIES = [
  {
    id: "protective-equipment",
    label: "保護具・着用指示",
    shortLabel: "保護具",
    description: "ヘルメット、保護眼鏡、手袋など、作業区域で必要な保護具を伝える看板です。",
  },
  {
    id: "entry-prohibition",
    label: "立入・禁止・操作禁止",
    shortLabel: "立入・禁止",
    description: "立入、火気、操作など、してはいけない行動と境界を伝える看板です。",
  },
  {
    id: "hazard-warning",
    label: "危険警告",
    shortLabel: "重機・吊り荷",
    description: "墜落、重機、吊り荷、感電など、現場の主な危険を知らせる看板です。",
  },
  {
    id: "work-status",
    label: "作業・点検・状態表示",
    shortLabel: "作業・状態",
    description: "作業中、点検中、修理中、資材置場などの現場状態を伝える看板です。",
  },
  {
    id: "traffic-guidance",
    label: "車両・通行・誘導",
    shortLabel: "車両・通行",
    description: "構内車両、歩行者通路、出入口、交通誘導を分かりやすく示す看板です。",
  },
  {
    id: "editable-numeric",
    label: "荷重・速度・数値表示",
    shortLabel: "荷重・数値編集",
    description: "荷重、速度、定員、連絡先などを利用者が後から入力できる看板です。",
  },
  {
    id: "heat-emergency",
    label: "熱中症・天候・救急・避難",
    shortLabel: "熱中症・緊急",
    description: "暑熱、強風、雷、大雨、救急、避難に関する行動を伝える看板です。",
  },
] as const;

export type SafetySignMarketCategory =
  (typeof SAFETY_SIGN_MARKET_CATEGORIES)[number]["id"];

export const SAFETY_SIGN_FORMATS = [
  "平板標識",
  "タンカン標識",
  "マグネット標識",
  "マンガ標識",
  "横幕",
  "垂れ幕",
  "立看板",
  "サインスタンド",
  "サインキューブ",
  "コーン取付表示",
  "バリケード表示",
  "数値・荷重表示",
  "数値表示板",
  "多言語表示",
  "報告書・施工計画用図版",
] as const;

export type SafetySignFormat = (typeof SAFETY_SIGN_FORMATS)[number];
