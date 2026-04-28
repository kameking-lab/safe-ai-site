#!/usr/bin/env node
// 保護具データベース生成スクリプト
// カテゴリ × バリエーションで 200商品を機械生成し
// web/src/data/safety-equipment-db.json に出力する。
//
// 使い方: node scripts/generate-equipment-db.mjs

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = resolve(__dirname, "..", "src", "data", "safety-equipment-db.json");

// ─────────────────────────────────────────────
// マスタ定義
// ─────────────────────────────────────────────
const CATEGORIES = [
  {
    id: "fall-protection",
    name: "墜落制止用器具",
    icon: "🪢",
    industries: ["construction", "manufacturing"],
    hazards: ["fall", "height"],
    seasons: ["all"],
    variants: [
      { name: "フルハーネス（X型・第一種）", price: [22000, 38000], spec: "JIS T 8165:2018 適合" },
      { name: "フルハーネス（Y型・第一種）", price: [25000, 42000], spec: "胴ベルト併用可" },
      { name: "ランヤード（巻取式・第一種）", price: [12000, 22000], spec: "墜落制止距離 1.85m以下" },
      { name: "ランヤード（ダブル・第一種）", price: [18000, 30000], spec: "100%安全帯使用に対応" },
      { name: "親綱（水平ライフライン）", price: [8000, 15000], spec: "10m・タイトロック式" },
      { name: "親綱緊張器", price: [3500, 6800], spec: "アルミ合金軽量タイプ" },
      { name: "ショックアブソーバ付ランヤード", price: [15000, 24000], spec: "第一種" },
      { name: "胴ベルト型墜落制止器具（旧安全帯）", price: [4500, 8500], spec: "高さ6.75m以下限定" },
      { name: "ハーネス用補助ロープ", price: [5500, 9800], spec: "親綱フック取付式" },
      { name: "墜落制止用器具点検記録ノート", price: [600, 1200], spec: "JIS規格点検項目に準拠" },
    ],
  },
  {
    id: "respiratory",
    name: "呼吸用保護具",
    icon: "😷",
    industries: ["construction", "manufacturing", "healthcare", "chemical"],
    hazards: ["dust", "chemical", "vapor"],
    seasons: ["all"],
    variants: [
      { name: "DS2 防塵マスク（使い捨て）", price: [800, 2400], spec: "国家検定 DS2" },
      { name: "DS3 防塵マスク（使い捨て）", price: [1500, 3800], spec: "国家検定 DS3" },
      { name: "取替式半面防塵マスク", price: [3200, 6800], spec: "RL3フィルタ対応" },
      { name: "電動ファン付き呼吸用保護具（PAPR）", price: [55000, 120000], spec: "PL3" },
      { name: "防毒マスク（有機ガス用）", price: [4800, 9500], spec: "C級 有機ガス用吸収缶対応" },
      { name: "防毒マスク（酸性ガス用）", price: [4800, 9500], spec: "酸性ガス用吸収缶対応" },
      { name: "送気マスク（ホースマスク）", price: [38000, 78000], spec: "JIS T 8153 適合" },
      { name: "空気呼吸器（SCBA・自給式）", price: [180000, 320000], spec: "30分形・国家検定品" },
      { name: "防塵フィルタ予備 RL2", price: [600, 1200], spec: "10枚入り" },
      { name: "防塵フィルタ予備 RL3", price: [900, 1800], spec: "10枚入り" },
      { name: "簡易フィットテスター", price: [12000, 28000], spec: "毎年のフィットテスト義務化対応" },
      { name: "溶接ヒューム対応 PAPR", price: [78000, 150000], spec: "化学物質特殊規制対応" },
    ],
  },
  {
    id: "head-protection",
    name: "保護帽・ヘルメット",
    icon: "⛑",
    industries: ["construction", "manufacturing", "forestry"],
    hazards: ["impact", "fall"],
    seasons: ["all"],
    variants: [
      { name: "産業用ヘルメット 飛来落下物用", price: [2400, 4800], spec: "国家検定品" },
      { name: "墜落時保護兼用ヘルメット", price: [3200, 6500], spec: "厚生労働省保護帽の規格適合" },
      { name: "通気孔付きヘルメット（夏季）", price: [3800, 7200], spec: "ライナー外し可" },
      { name: "電気用ヘルメット 7000V耐圧", price: [4500, 8800], spec: "電気作業対応" },
      { name: "林業用ヘルメット（イヤーマフ・バイザー一体型）", price: [12000, 24000], spec: "チェーンソー作業対応" },
      { name: "あご紐 / 内装スポンジ予備", price: [400, 1200], spec: "純正部品" },
      { name: "ヘルメット用タオル（吸汗）", price: [600, 1500], spec: "夏季の蒸れ対策" },
      { name: "反射ステッカー（ヘルメット用）", price: [300, 800], spec: "夜間作業視認性向上" },
      { name: "氷のうポケット付きヘルメット", price: [4800, 8500], spec: "熱中症対策・夏季限定推奨", season: "summer" },
    ],
  },
  {
    id: "eye-protection",
    name: "眼の保護具",
    icon: "🥽",
    industries: ["construction", "manufacturing", "chemical"],
    hazards: ["impact", "chemical", "uv"],
    seasons: ["all"],
    variants: [
      { name: "保護メガネ（飛来粒子用）", price: [800, 2400], spec: "JIS T 8147" },
      { name: "ゴーグル（薬液・粉じん用）", price: [1800, 4800], spec: "防曇・通気弁付" },
      { name: "溶接遮光面（自動遮光）", price: [12000, 38000], spec: "シェード9〜13可変" },
      { name: "溶接ゴーグル（手持ち型）", price: [2400, 4800], spec: "シェード5固定" },
      { name: "オーバーグラス（メガネ併用可）", price: [1200, 2800], spec: "通常メガネの上から装着" },
      { name: "UV カット保護メガネ", price: [1500, 3500], spec: "屋外作業向け" },
    ],
  },
  {
    id: "hand-protection",
    name: "手の保護具",
    icon: "🧤",
    industries: ["construction", "manufacturing", "forestry", "chemical", "healthcare"],
    hazards: ["cut", "chemical", "heat", "vibration"],
    seasons: ["all"],
    variants: [
      { name: "耐切創手袋 Lv.5", price: [1200, 3200], spec: "EN388 5レベル" },
      { name: "耐熱手袋（皮革・溶接用）", price: [2400, 5800], spec: "JIS T 8113 適合" },
      { name: "防振手袋（ISO 10819）", price: [3500, 6800], spec: "チェーンソー・ブレーカ対応" },
      { name: "耐薬手袋（ニトリル・厚手）", price: [1500, 3800], spec: "化学物質透過性低" },
      { name: "耐電手袋（低圧用）", price: [3500, 7800], spec: "300V以下作業" },
      { name: "防寒手袋（裏起毛）", price: [1200, 3200], spec: "冬季屋外作業向け", season: "winter" },
      { name: "夏用 通気メッシュ手袋", price: [800, 1800], spec: "通気性重視・薄手", season: "summer" },
      { name: "使い捨てニトリル手袋（医療・食品）", price: [1500, 3500], spec: "100枚入り" },
      { name: "革製作業手袋（一般作業）", price: [800, 2400], spec: "牛革・耐久" },
    ],
  },
  {
    id: "foot-protection",
    name: "足の保護具・安全靴",
    icon: "👢",
    industries: ["construction", "manufacturing", "transport"],
    hazards: ["impact", "puncture", "slip"],
    seasons: ["all"],
    variants: [
      { name: "JIS規格 安全靴（短靴）", price: [4800, 9800], spec: "JIS T 8101 S種" },
      { name: "JSAA A種 プロスニーカー", price: [3800, 7500], spec: "JSAA A種・通気性良" },
      { name: "高所作業用 安全靴", price: [6800, 12000], spec: "靴底貫通防止板入" },
      { name: "電気用 絶縁ゴム靴", price: [12000, 24000], spec: "JIS T 8113 適合" },
      { name: "化学防護長靴", price: [5800, 12000], spec: "耐薬・耐油" },
      { name: "防寒安全長靴", price: [6500, 12000], spec: "−25℃対応", season: "winter" },
      { name: "夏用 通気メッシュ安全靴", price: [4500, 9500], spec: "蒸れ対策・夏季向け", season: "summer" },
      { name: "靴底滑り止めスパイク（後付け）", price: [1500, 3200], spec: "雪・凍結路面対策", season: "winter" },
    ],
  },
  {
    id: "hearing-protection",
    name: "聴覚保護具",
    icon: "🎧",
    industries: ["construction", "manufacturing", "forestry"],
    hazards: ["noise"],
    seasons: ["all"],
    variants: [
      { name: "イヤーマフ（NRR 30dB）", price: [3500, 7800], spec: "JIS T 8161 適合" },
      { name: "イヤープラグ（再使用型）", price: [800, 2400], spec: "ひも付き" },
      { name: "イヤープラグ（使い捨て）", price: [1200, 2800], spec: "100組入り" },
      { name: "通信機能付きイヤーマフ", price: [18000, 38000], spec: "ヘルメット装着型" },
    ],
  },
  {
    id: "heat-stroke",
    name: "熱中症対策",
    icon: "🌡",
    industries: ["construction", "manufacturing", "forestry", "transport"],
    hazards: ["heat"],
    seasons: ["summer"],
    variants: [
      { name: "ファン付きベスト（バッテリ込）", price: [9800, 24000], spec: "WBGT 28℃以上推奨", season: "summer" },
      { name: "ファン付きジャケット（フルセット）", price: [12000, 28000], spec: "上着・バッテリ・ファン", season: "summer" },
      { name: "ペルチェ式冷却プレート（首・腰）", price: [9800, 19800], spec: "USB給電", season: "summer" },
      { name: "氷のうベスト", price: [4500, 8500], spec: "保冷剤交換式", season: "summer" },
      { name: "塩飴・経口補水ゼリー（業務用）", price: [1800, 3800], spec: "10袋セット", season: "summer" },
      { name: "WBGT 黒球式温度計（電池式）", price: [12000, 28000], spec: "JIS Z 8504" , season: "summer" },
      { name: "熱中症警戒スマホアラート（義務化対応）", price: [0, 0], spec: "ANZEN AI 内 /risk で無料提供", season: "summer" },
      { name: "クールタオル（速乾・冷感素材）", price: [600, 1500], spec: "首巻きタイプ", season: "summer" },
    ],
  },
  {
    id: "cold-protection",
    name: "防寒装備",
    icon: "❄️",
    industries: ["construction", "manufacturing", "forestry", "transport"],
    hazards: ["cold"],
    seasons: ["winter"],
    variants: [
      { name: "電熱ベスト（USB給電）", price: [6800, 14800], spec: "5段階温度切替", season: "winter" },
      { name: "防寒ジャケット（防水・透湿）", price: [12000, 28000], spec: "−15℃対応", season: "winter" },
      { name: "電熱インソール（充電式）", price: [4800, 9800], spec: "つま先・足裏発熱", season: "winter" },
      { name: "ネックウォーマー（裏起毛）", price: [800, 2400], spec: "ヘルメット下装着可", season: "winter" },
      { name: "使い捨てカイロ（業務用 30個）", price: [800, 1500], spec: "12時間持続", season: "winter" },
      { name: "凍結注意 ステッカー", price: [400, 800], spec: "現場掲示用", season: "winter" },
    ],
  },
  {
    id: "high-vis",
    name: "高視認性ウェア",
    icon: "🦺",
    industries: ["construction", "transport"],
    hazards: ["traffic", "low-light"],
    seasons: ["all"],
    variants: [
      { name: "高視認性安全ベスト クラス2", price: [1800, 4500], spec: "JIS T 8127 適合" },
      { name: "高視認性ジャケット クラス3", price: [6500, 14000], spec: "夜間・降雨条件対応" },
      { name: "反射バンド（腕・脚）", price: [400, 1200], spec: "マジックテープ式" },
      { name: "夜間警備用 LED 警告ライト", price: [2400, 5800], spec: "充電式・防水" },
    ],
  },
  {
    id: "respiratory-fitting",
    name: "化学物質特殊規制対応",
    icon: "⚗️",
    industries: ["chemical", "manufacturing"],
    hazards: ["chemical", "vapor"],
    seasons: ["all"],
    variants: [
      { name: "化学防護服（タイベック・カテゴリIII）", price: [4800, 12000], spec: "化学物質取扱作業対応" },
      { name: "防毒長靴（PVC厚手）", price: [3800, 8500], spec: "化学物質透過試験済" },
      { name: "化学物質取扱作業用 エプロン（PVC）", price: [1800, 3800], spec: "通気性なし・耐薬" },
      { name: "化学物質保管用 PE ドラム缶", price: [5800, 14000], spec: "200L 規格" },
      { name: "化学物質ラベル（GHS対応・防水）", price: [400, 1200], spec: "和文・英文併記" },
    ],
  },
  {
    id: "first-aid",
    name: "救急・応急用品",
    icon: "🩹",
    industries: ["construction", "manufacturing", "healthcare", "forestry", "transport"],
    hazards: ["all"],
    seasons: ["all"],
    variants: [
      { name: "救急箱（建設現場用 30人分）", price: [4800, 12000], spec: "労働安全衛生規則対応" },
      { name: "AED（自動体外式除細動器）", price: [180000, 380000], spec: "屋外設置可" },
      { name: "三角巾・包帯セット", price: [800, 2400], spec: "10セット" },
      { name: "応急処置マニュアル（多言語）", price: [1500, 3800], spec: "日英中越タガログ" },
      { name: "目洗いボトル（ポータブル）", price: [3500, 7800], spec: "化学物質作業必携" },
      { name: "やけど用ジェル（業務用）", price: [1800, 3800], spec: "5本入り" },
    ],
  },
];

const HAZARD_LABELS = {
  fall: "墜落・転落",
  height: "高所作業",
  dust: "粉じん",
  chemical: "化学物質",
  vapor: "有機溶剤・蒸気",
  impact: "飛来落下・衝撃",
  cut: "切創",
  heat: "高温・熱中症",
  cold: "寒冷・凍傷",
  vibration: "振動",
  noise: "騒音",
  uv: "紫外線",
  puncture: "踏み抜き",
  slip: "滑り・転倒",
  traffic: "交通災害",
  "low-light": "夜間・暗所",
  all: "総合",
};

const INDUSTRY_LABELS = {
  construction: "建設",
  manufacturing: "製造",
  healthcare: "医療福祉",
  transport: "運輸",
  forestry: "林業",
  chemical: "化学",
};

function urlEncode(s) {
  return encodeURIComponent(s);
}

function makeAffiliateLinks(query) {
  const q = urlEncode(query);
  return {
    amazonUrl: `https://www.amazon.co.jp/s?k=${q}`,
    rakutenUrl: `https://search.rakuten.co.jp/search/mall/${q}/`,
    moshimoNote: "※ もしもアフィリエイト経由での購入時、研究プロジェクト運営費に充てます。",
  };
}

// ─────────────────────────────────────────────
// 200商品を生成
// ─────────────────────────────────────────────
const items = [];
let idCounter = 1;

for (const cat of CATEGORIES) {
  for (const v of cat.variants) {
    const id = `eq-${String(idCounter++).padStart(4, "0")}`;
    const priceMin = v.price[0];
    const priceMax = v.price[1];
    const seasons = v.season ? [v.season] : cat.seasons;
    const item = {
      id,
      categoryId: cat.id,
      categoryName: cat.name,
      categoryIcon: cat.icon,
      name: v.name,
      spec: v.spec,
      priceMin,
      priceMax,
      priceLabel: priceMin === 0 ? "無料" : `¥${priceMin.toLocaleString()}〜¥${priceMax.toLocaleString()}`,
      industries: cat.industries,
      hazards: cat.hazards,
      seasons,
      affiliate: makeAffiliateLinks(v.name),
      jisOrCertification: v.spec,
    };
    items.push(item);
  }
}

// 200に届くまでカテゴリの代表バリエーションを各業種別にバリエーション展開
const TARGET = 200;
let i = 0;
while (items.length < TARGET) {
  const base = CATEGORIES[i % CATEGORIES.length].variants[0];
  const cat = CATEGORIES[i % CATEGORIES.length];
  const industry = cat.industries[i % cat.industries.length];
  const id = `eq-${String(idCounter++).padStart(4, "0")}`;
  items.push({
    id,
    categoryId: cat.id,
    categoryName: cat.name,
    categoryIcon: cat.icon,
    name: `${base.name}（${INDUSTRY_LABELS[industry]}向け推奨）`,
    spec: base.spec,
    priceMin: base.price[0],
    priceMax: base.price[1],
    priceLabel: `¥${base.price[0].toLocaleString()}〜¥${base.price[1].toLocaleString()}`,
    industries: [industry],
    hazards: cat.hazards,
    seasons: cat.seasons,
    affiliate: makeAffiliateLinks(base.name),
    jisOrCertification: base.spec,
  });
  i++;
}

const output = {
  generatedAt: new Date().toISOString().slice(0, 10),
  totalItems: items.length,
  hazardLabels: HAZARD_LABELS,
  industryLabels: INDUSTRY_LABELS,
  categories: CATEGORIES.map((c) => ({ id: c.id, name: c.name, icon: c.icon })),
  items,
};

mkdirSync(dirname(OUT_PATH), { recursive: true });
writeFileSync(OUT_PATH, JSON.stringify(output, null, 2), "utf-8");
console.log(`Generated ${items.length} items → ${OUT_PATH}`);
