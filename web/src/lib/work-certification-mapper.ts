/**
 * 業務別資格マッパー
 * 作業内容（業務タイプ）から必要な資格・講習・免許を自動判定する。
 * Legal basis: 安衛法第59条第3項（特別教育）、第61条（就業制限）、第60条（職長教育）
 */

import type { WorkCategory } from "@/types/education-cert";

/** 業務シナリオ（フォームで選択する作業内容） */
export interface WorkScenario {
  id: string;
  label: string;
  description: string;
  category: WorkCategory;
  /** このシナリオが該当する際に必須となる資格IDのリスト（優先度順） */
  requiredCertIds: string[];
  /** 法的根拠の簡易説明 */
  legalNote: string;
}

/** 業務タグ（複数選択可能な作業キーワード）*/
export interface WorkTag {
  id: string;
  label: string;
  /** このタグが示す業務に関連する資格ID */
  certIds: string[];
}

/**
 * 業務シナリオ一覧（25件）
 * 実務で「この作業をするには何が必要か」を一発で引けるよう設計。
 */
export const WORK_SCENARIOS: WorkScenario[] = [
  // ===== 高所・墜落防止 =====
  {
    id: "ws-kosho-harness",
    label: "高さ2m以上の高所作業（作業床なし）",
    description: "足場がなく、フルハーネス型墜落制止用器具を使用して行う高所作業",
    category: "construction",
    requiredCertIds: ["se-36-41-harness"],
    legalNote: "安衛則第36条第41号 — フルハーネス型特別教育（2019年2月〜必須）",
  },
  {
    id: "ws-ashiba-kumitate",
    label: "高さ5m以上の足場の組立て・解体",
    description: "枠組み足場・単管足場等の組立て・解体・変更作業（つり足場・張出し足場を除く）",
    category: "construction",
    requiredCertIds: ["se-36-39-ashiba", "st-ashiba-chief"],
    legalNote: "安衛則第36条第39号（特別教育）＋安衛令第6条第15号（作業主任者選任）",
  },
  {
    id: "ws-rope-kosho",
    label: "ロープ高所作業（外壁・吊り下げ式）",
    description: "身体保持器具付きロープにより支持された状態でのブランコ・外壁清掃等の高所作業",
    category: "construction",
    requiredCertIds: ["se-36-40-rooftop", "se-36-41-harness"],
    legalNote: "安衛則第36条第40号（ロープ高所作業）＋第41号（フルハーネス）",
  },
  {
    id: "ws-gondola",
    label: "ゴンドラ操作（外壁・窓清掃等）",
    description: "ゴンドラを使用したビルメンテナンス・外壁塗装・窓清掃等の業務",
    category: "general",
    requiredCertIds: ["se-36-20-gondola", "se-36-41-harness"],
    legalNote: "安衛則第36条第20号（ゴンドラ特別教育）＋第41号（フルハーネス）",
  },
  {
    id: "ws-koshosha",
    label: "高所作業車の運転",
    description: "バケット車・スカイマスター等の高所作業車による作業",
    category: "construction",
    requiredCertIds: ["se-36-10-5-koshosagyosha", "st-high-lift"],
    legalNote: "作業床高さ10m未満は特別教育（安衛則第36条第10号の5）、10m以上は技能講習（安衛令第20条第15号）",
  },
  // ===== クレーン・玉掛け =====
  {
    id: "ws-crane-small",
    label: "クレーン・天井クレーン運転（5t未満）",
    description: "つり上げ荷重5t未満のクレーン（移動式除く）の運転業務",
    category: "manufacturing",
    requiredCertIds: ["se-36-15-crane-under5t"],
    legalNote: "安衛則第36条第15号 — 5t以上は免許（床上操作式クレーンは技能講習）が必要",
  },
  {
    id: "ws-crane-large",
    label: "クレーン・天井クレーン運転（5t以上）",
    description: "つり上げ荷重5t以上のクレーン（移動式除く）の運転業務",
    category: "manufacturing",
    requiredCertIds: ["st-crane-5t", "lic-crane-derrick"],
    legalNote: "安衛令第20条第7号 — 技能講習修了またはクレーン・デリック運転士免許",
  },
  {
    id: "ws-mobile-crane",
    label: "移動式クレーン（ラフター・ユニック）の運転",
    description: "トラッククレーン・ラフタークレーン等の移動式クレーンの運転業務",
    category: "construction",
    requiredCertIds: ["se-36-16-mobile-crane", "st-mobile-crane", "lic-mobile-crane"],
    legalNote: "1t未満は特別教育、1-5tは技能講習、5t以上は移動式クレーン運転士免許",
  },
  {
    id: "ws-tamakake",
    label: "玉掛け業務（クレーンへの荷かけ）",
    description: "クレーン・移動式クレーン・デリックへの荷の掛け外し（玉掛け）業務",
    category: "construction",
    requiredCertIds: ["se-36-19-tamakake", "st-tamakake"],
    legalNote: "1t未満は特別教育（安衛則第36条第19号）、1t以上は技能講習（安衛令第20条第16号）",
  },
  // ===== フォークリフト・建設機械 =====
  {
    id: "ws-forklift",
    label: "フォークリフトの運転",
    description: "倉庫・工場でのフォークリフトによる荷役・運搬業務",
    category: "logistics",
    requiredCertIds: ["se-36-5-forklift", "st-forklift"],
    legalNote: "最大荷重1t未満は特別教育（安衛則第36条第5号）、1t以上は技能講習（安衛令第20条第11号）",
  },
  {
    id: "ws-shovel-large",
    label: "バックホー・ブルドーザー等の運転（3t以上）",
    description: "機体重量3t以上の車両系建設機械（整地・運搬・積込み・掘削用）の運転",
    category: "construction",
    requiredCertIds: ["st-shovel"],
    legalNote: "安衛令第20条第12号 — 車両系建設機械（整地等）運転技能講習修了",
  },
  {
    id: "ws-shovel-small",
    label: "小型建設機械の運転（3t未満）",
    description: "機体重量3t未満のミニユンボ・コンパクトショベル等の運転",
    category: "construction",
    requiredCertIds: ["se-36-9-seichi"],
    legalNote: "安衛則第36条第9号 — 小型車両系建設機械（整地等）特別教育",
  },
  // ===== 掘削・土木 =====
  {
    id: "ws-digging-deep",
    label: "掘削面高さ2m以上の地山掘削作業",
    description: "基礎工事・上下水道工事等での深い掘削作業（作業主任者の選任が必要）",
    category: "construction",
    requiredCertIds: ["st-excavation-chief"],
    legalNote: "安衛令第6条第9号（地山の掘削）・第10号（土止め支保工） — 作業主任者（技能講習）の選任必須。地山掘削・土止め支保工に法定の特別教育はない",
  },
  {
    id: "ws-tunnel",
    label: "トンネル・ずい道の掘削・覆工作業",
    description: "山岳トンネル・都市型シールドトンネルの掘削・覆工作業",
    category: "construction",
    requiredCertIds: ["se-36-30-tunnel", "st-tunnel-chief", "st-tunnel-lining-chief"],
    legalNote: "安衛則第36条第30号（特別教育）＋安衛令第6条第10号の2・10号の3（作業主任者2種）",
  },
  {
    id: "ws-asbestos-removal",
    label: "石綿（アスベスト）含有建材の解体・除去",
    description: "建築物・設備の改修・解体工事における石綿含有材の除去作業",
    category: "construction",
    requiredCertIds: ["se-36-37-asbestos", "st-asbestos-chief"],
    legalNote: "安衛則第36条第37号（特別教育）＋安衛令第6条第23号（石綿作業主任者）",
  },
  // ===== 電気 =====
  {
    id: "ws-teiatsu",
    label: "低圧電気設備の敷設・修理（充電状態）",
    description: "対地電圧50V超の充電電路の敷設・修理や、充電部分が露出した開閉器の操作",
    category: "electrical",
    requiredCertIds: ["se-36-4-teiatsu"],
    legalNote: "安衛則第36条第4号 — 低圧電気取扱い特別教育（学科7h＋実技7h。開閉器操作のみは実技1h）",
  },
  {
    id: "ws-koatsu",
    label: "高圧・特別高圧電気設備の敷設・修理",
    description: "高圧（直流750V超・交流600V超）または特別高圧の充電電路の敷設・修理等",
    category: "electrical",
    requiredCertIds: ["se-36-4-koatsu"],
    legalNote: "安衛則第36条第4号 — 高圧・特別高圧電気取扱い特別教育（学科11h＋実技15h）",
  },
  // ===== 溶接・ガス =====
  {
    id: "ws-arc-welding",
    label: "アーク溶接・溶断作業",
    description: "電気を使ったアーク溶接機による金属の溶接・溶断・加熱作業",
    category: "manufacturing",
    requiredCertIds: ["se-36-3-arch"],
    legalNote: "安衛則第36条第3号 — アーク溶接等特別教育（21h以上）",
  },
  {
    id: "ws-gas-welding",
    label: "ガス溶接・ガス切断作業",
    description: "アセチレン・LPGと酸素を使ったガス溶接・ガス切断・加熱作業",
    category: "manufacturing",
    requiredCertIds: ["st-gas-chief", "lic-gas-welding-chief"],
    legalNote: "安衛令第20条第10号 — ガス溶接技能講習修了。集合装置使用は作業主任者（免許）も必要",
  },
  // ===== 有害物・化学 =====
  {
    id: "ws-organic-solvent",
    label: "有機溶剤を使用する作業（屋内・タンク内等）",
    description: "塗装・接着・クリーニング等での有機溶剤を使用する業務",
    category: "manufacturing",
    requiredCertIds: ["st-yuki-chief"],
    legalNote: "安衛令第6条第22号（有機溶剤作業主任者）— 有機溶剤業務に法定の特別教育はない（通達に基づく労働衛生教育が推奨）",
  },
  {
    id: "ws-sanketo",
    label: "酸素欠乏危険場所での作業（マンホール・ピット等）",
    description: "マンホール・タンク・地下ピット・坑内等での酸素欠乏危険場所の作業",
    category: "construction",
    requiredCertIds: ["se-36-26-shokucho-sanso", "st-sankesu-chief"],
    legalNote: "安衛則第36条第26号（特別教育）＋安衛令第6条第21号（酸欠作業主任者）",
  },
  {
    id: "ws-tokuka",
    label: "特定化学物質（ベンゼン・クロム等）の製造・取扱い",
    description: "安衛令別表第3第1類・第2類に掲げる特定化学物質を扱う作業",
    category: "chemical",
    requiredCertIds: ["st-tokuka-chief"],
    legalNote: "安衛令第6条第18号（特化物作業主任者）— 特定化学物質の取扱い業務一般に法定の特別教育はない",
  },
  // ===== 林業 =====
  {
    id: "ws-chainsaw",
    label: "チェーンソーを使用した伐木・かかり木処理",
    description: "チェーンソーによる立木の伐木・枝払い・かかり木処理作業",
    category: "forestry",
    requiredCertIds: ["se-36-8-chainsaw"],
    legalNote: "安衛則第36条第8号 — 伐木等（チェーンソー使用）特別教育（18h以上）",
  },
  // ===== 放射線 =====
  {
    id: "ws-xray",
    label: "エックス線・ガンマ線による非破壊検査",
    description: "溶接部・構造物のX線撮影・RI（放射性同位元素）によるガンマ線透過写真撮影",
    category: "manufacturing",
    requiredCertIds: ["se-36-28-xray-gamma", "lic-xray-chief", "lic-gamma-chief"],
    legalNote: "安衛則第36条第28号（特別教育）＋作業主任者免許（X線・ガンマ線それぞれ）",
  },
  // ===== 潜水 =====
  {
    id: "ws-diving",
    label: "水中潜水作業（土木・点検・救助等）",
    description: "橋梁基礎・ダム・港湾等での水中潜水・水中溶接・水中調査作業",
    category: "construction",
    requiredCertIds: ["lic-diver", "se-36-23-sensui-soki"],
    legalNote: "潜水業務は潜水士免許（安衛令第20条第9号）。送気調節バルブの操作員は特別教育（安衛則第36条第23号）",
  },
];

/** 業務タグ（フリーワード検索補助） */
export const WORK_TAGS: WorkTag[] = [
  { id: "tag-harness", label: "フルハーネス", certIds: ["se-36-41-harness"] },
  { id: "tag-ashiba", label: "足場", certIds: ["se-36-39-ashiba", "st-ashiba-chief"] },
  { id: "tag-crane", label: "クレーン", certIds: ["se-36-15-crane-under5t", "st-crane-5t", "lic-crane-derrick"] },
  { id: "tag-mobile-crane", label: "移動式クレーン", certIds: ["se-36-16-mobile-crane", "st-mobile-crane", "lic-mobile-crane"] },
  { id: "tag-tamakake", label: "玉掛け", certIds: ["se-36-19-tamakake", "st-tamakake"] },
  { id: "tag-forklift", label: "フォークリフト", certIds: ["se-36-5-forklift", "st-forklift"] },
  { id: "tag-backhoe", label: "バックホー", certIds: ["se-36-9-seichi", "st-shovel"] },
  { id: "tag-asbestos", label: "石綿・アスベスト", certIds: ["se-36-37-asbestos", "st-asbestos-chief"] },
  { id: "tag-sanso", label: "酸素欠乏", certIds: ["se-36-26-shokucho-sanso", "st-sankesu-chief"] },
  { id: "tag-yuki", label: "有機溶剤", certIds: ["st-yuki-chief"] },
  { id: "tag-arc", label: "アーク溶接", certIds: ["se-36-3-arch"] },
  { id: "tag-gas-welding", label: "ガス溶接", certIds: ["st-gas-chief", "lic-gas-welding-chief"] },
  { id: "tag-teiatsu", label: "低圧電気", certIds: ["se-36-4-teiatsu"] },
  { id: "tag-koatsu", label: "高圧電気", certIds: ["se-36-4-koatsu"] },
  { id: "tag-chainsaw", label: "チェーンソー", certIds: ["se-36-8-chainsaw"] },
  { id: "tag-koshosha", label: "高所作業車", certIds: ["se-36-10-5-koshosagyosha", "st-high-lift"] },
  { id: "tag-gondola", label: "ゴンドラ", certIds: ["se-36-20-gondola"] },
  { id: "tag-diving", label: "潜水", certIds: ["lic-diver", "se-36-23-sensui-soki"] },
  { id: "tag-xray", label: "X線・非破壊検査", certIds: ["se-36-28-xray-gamma", "lic-xray-chief"] },
  { id: "tag-tokuka", label: "特定化学物質", certIds: ["st-tokuka-chief"] },
  { id: "tag-dust", label: "粉じん", certIds: ["se-36-29-dust"] },
  { id: "tag-tunnel", label: "トンネル", certIds: ["se-36-30-tunnel", "st-tunnel-chief", "st-tunnel-lining-chief"] },
  { id: "tag-moku", label: "木造建築", certIds: ["st-moku-chief"] },
  { id: "tag-boiler", label: "ボイラー", certIds: ["st-boiler-chief", "lic-boiler-2", "lic-boiler-1"] },
  { id: "tag-pressure", label: "圧力容器", certIds: ["st-chemical-plant-chief", "st-pressure-vessel-chief"] },
];

/** シナリオIDから関連資格IDを取得 */
export function getCertIdsForScenarios(scenarioIds: string[]): string[] {
  const ids = new Set<string>();
  for (const sid of scenarioIds) {
    const scenario = WORK_SCENARIOS.find((s) => s.id === sid);
    if (scenario) {
      for (const cid of scenario.requiredCertIds) ids.add(cid);
    }
  }
  return Array.from(ids);
}

/** タグIDから関連資格IDを取得 */
export function getCertIdsForTags(tagIds: string[]): string[] {
  const ids = new Set<string>();
  for (const tid of tagIds) {
    const tag = WORK_TAGS.find((t) => t.id === tid);
    if (tag) {
      for (const cid of tag.certIds) ids.add(cid);
    }
  }
  return Array.from(ids);
}

/** カテゴリ別にシナリオをグループ化 */
export function getScenariosGroupedByCategory(): Record<WorkCategory, WorkScenario[]> {
  const result: Partial<Record<WorkCategory, WorkScenario[]>> = {};
  for (const s of WORK_SCENARIOS) {
    if (!result[s.category]) result[s.category] = [];
    result[s.category]!.push(s);
  }
  return result as Record<WorkCategory, WorkScenario[]>;
}
