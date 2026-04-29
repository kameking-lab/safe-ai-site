// scripts/generate-equipment-db.mjs
// 保護具AIファインダー 商品DBの自動生成スクリプト（1,000商品 / テンプレートベース）
// 実行: node scripts/generate-equipment-db.mjs
//
// テンプレートベースで実在メーカー × 実在商品カテゴリ × 仕様バリエーションを掛け合わせ、
// 業種・危険源・季節・価格・規格情報・レコメンド理由を自動付与する。
// 個別商品のURL/ASIN/価格は実API連携なしのプレースホルダー（もしもアフィリエイト経由を想定）。

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUT = path.resolve(__dirname, "../web/src/data/safety-equipment-db.json");

// ─────────────────────────────────────────────────────────────
// 決定論シード（同じ入力 → 同じ出力）
// ─────────────────────────────────────────────────────────────
let _seed = 1234567;
function rand() {
  _seed = (_seed * 1664525 + 1013904223) >>> 0;
  return _seed / 0xffffffff;
}
function pick(arr) {
  return arr[Math.floor(rand() * arr.length)];
}
function pickN(arr, n) {
  const copy = [...arr];
  const out = [];
  while (out.length < Math.min(n, copy.length)) {
    const i = Math.floor(rand() * copy.length);
    out.push(copy.splice(i, 1)[0]);
  }
  return out;
}
function priceBetween(min, max) {
  const lo = Math.round((min + rand() * (max - min) * 0.4) / 100) * 100;
  const hi = Math.round((lo + (max - lo) * (0.5 + rand() * 0.5)) / 100) * 100;
  return [lo, Math.max(hi, lo + 500)];
}
function ratingBetween(min, max) {
  const v = min + rand() * (max - min);
  return Math.round(v * 10) / 10;
}

// ─────────────────────────────────────────────────────────────
// マスタ
// ─────────────────────────────────────────────────────────────
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
  drown: "水難・溺水",
  fire: "火災・火炎",
  static: "静電気",
  all: "総合",
};

const INDUSTRY_LABELS = {
  construction: "建設",
  manufacturing: "製造",
  healthcare: "医療福祉",
  transport: "運輸",
  forestry: "林業",
  chemical: "化学",
  fishery: "水産・漁業",
  electrical: "電気工事",
  agriculture: "農業",
};

const CATEGORIES = [
  { id: "fall-protection", name: "墜落制止用器具", icon: "🪢" },
  { id: "respiratory", name: "呼吸用保護具", icon: "😷" },
  { id: "head-protection", name: "保護帽・ヘルメット", icon: "⛑" },
  { id: "eye-protection", name: "眼の保護具", icon: "🥽" },
  { id: "hand-protection", name: "手の保護具", icon: "🧤" },
  { id: "foot-protection", name: "足の保護具・安全靴", icon: "👢" },
  { id: "hearing-protection", name: "聴覚保護具", icon: "🎧" },
  { id: "heat-stroke", name: "熱中症対策", icon: "🌡" },
  { id: "cold-protection", name: "防寒装備", icon: "❄️" },
  { id: "high-vis", name: "高視認性ウェア", icon: "🦺" },
  { id: "respiratory-fitting", name: "化学物質特殊規制対応", icon: "⚗️" },
  { id: "first-aid", name: "救急・応急用品", icon: "🩹" },
  { id: "protective-clothing", name: "保護衣・特殊作業服", icon: "🥼" },
  { id: "lifeline", name: "落下防止・親綱・命綱", icon: "⚓" },
  { id: "rescue", name: "救命胴衣・救助具", icon: "🛟" },
];

// 実在メーカー（エンドユーザーに馴染みのある日本製造販売メーカーのみ）
const MAKERS = {
  fall: ["タジマ", "サンコー（タイタン）", "ミドリ安全", "藤井電工", "TRUSCO中山", "谷沢製作所"],
  helmet: ["ミドリ安全", "谷沢製作所", "DICプラスチック", "TRUSCO中山", "進和化学工業", "加賀城安全"],
  shoe: ["シモン", "ミドリ安全", "アシックス", "ミズノ", "ディアドラ", "TRUSCO中山", "丸五", "弘進ゴム"],
  eye: ["山本光学", "ミドリ安全", "3M", "理研オプテック", "TRUSCO中山", "スワン"],
  resp: ["興研", "重松製作所", "3M", "山本光学", "TRUSCO中山", "ミドリ安全"],
  hearing: ["3M", "MOLDEX（モルデックス）", "ハワード・レイト", "ミドリ安全", "TRUSCO中山"],
  heat: ["バートル", "サンエス", "TS DESIGN", "桑和", "コーコス信岡", "TRUSCO中山", "ミドリ安全"],
  cold: ["バートル", "TS DESIGN", "桑和", "ミドリ安全", "コーコス信岡", "TRUSCO中山"],
  hivis: ["TS DESIGN", "ミドリ安全", "コーコス信岡", "桑和", "バートル", "TRUSCO中山"],
  hand: ["ショーワグローブ", "アンセル", "ミドリ安全", "TRUSCO中山", "東和コーポレーション", "アトム"],
  rescue: ["ブルーストーム", "高階救命器具", "藤倉航装", "TRUSCO中山", "ミドリ安全"],
  cloth: ["バートル", "TS DESIGN", "ミドリ安全", "サンエス", "山田辰", "桑和"],
  firstaid: ["白十字", "リバテープ製薬", "ニチバン", "TRUSCO中山", "ミドリ安全"],
  chem: ["興研", "重松製作所", "3M", "アンセル", "ショーワグローブ", "TRUSCO中山"],
};

// ─────────────────────────────────────────────────────────────
// テンプレート定義
// ─────────────────────────────────────────────────────────────

// 安全帯・フルハーネス（落下防止のlifelineは別カテゴリで30件追加）
const FALL_TEMPLATES = [
  { sub: "フルハーネス（X型）", spec: "JIS T 8165:2018 第一種", priceMin: 22000, priceMax: 48000, regulations: ["労働安全衛生法 第61条（就業制限）", "安衛則 第518条", "厚労省告示「墜落制止用器具の規格」"], reason: "JIS T 8165:2018 第一種に適合。高さ6.75m超の作業で原則必須。" },
  { sub: "フルハーネス（Y型）", spec: "JIS T 8165:2018 第一種", priceMin: 25000, priceMax: 52000, regulations: ["安衛則 第518条", "墜落制止用器具の規格"], reason: "胴ベルト併用で長時間作業の腰痛軽減。" },
  { sub: "フルハーネス（H型・第二種）", spec: "JIS T 8165:2018 第二種", priceMin: 28000, priceMax: 58000, regulations: ["墜落制止用器具の規格"], reason: "鉄骨建方など墜落距離が長い作業向け。" },
  { sub: "ランヤード（巻取式・シングル）", spec: "墜落制止距離 1.85m以下", priceMin: 12000, priceMax: 26000, regulations: ["墜落制止用器具の規格"], reason: "巻取式でロープのたわみ・引きずりを防止。" },
  { sub: "ランヤード（ダブル・第一種）", spec: "100%安全帯使用に対応", priceMin: 18000, priceMax: 34000, regulations: ["墜落制止用器具の規格", "安衛則 第518条"], reason: "100%墜落制止状態を維持できるダブルフック構成。" },
  { sub: "ショックアブソーバ付ランヤード", spec: "第一種ショックアブソーバ", priceMin: 15000, priceMax: 28000, regulations: ["墜落制止用器具の規格"], reason: "墜落時の衝撃荷重を6kN以下に低減。" },
  { sub: "胴ベルト型墜落制止器具", spec: "高さ6.75m以下限定", priceMin: 4500, priceMax: 9800, regulations: ["墜落制止用器具の規格", "安衛則 第518条"], reason: "6.75m以下の作業で軽量・低コスト。" },
];

// ヘルメット
const HELMET_TEMPLATES = [
  { sub: "ABS素材ヘルメット（飛来・墜落兼用）", spec: "労検 飛来・落下物用＋墜落時保護用", priceMin: 1800, priceMax: 4200, regulations: ["保護帽の規格（厚労省告示）", "労働安全衛生規則 第539条"], reason: "国家検定 飛来・落下物用＋墜落時保護用合格品。" },
  { sub: "ABSヘルメット（通気孔付き）", spec: "通気孔付き・労検飛来落下", priceMin: 2200, priceMax: 4800, regulations: ["保護帽の規格"], reason: "通気孔で夏場の熱こもりを軽減。" },
  { sub: "PC（ポリカ）ヘルメット", spec: "労検 電気用1000V以下対応", priceMin: 2800, priceMax: 5800, regulations: ["保護帽の規格", "電気事業法施行規則"], reason: "1000V以下の低圧電気作業に対応。" },
  { sub: "ABSヘルメット（顎ひも一体型）", spec: "ライナー＋顎ひも", priceMin: 2400, priceMax: 5200, regulations: ["保護帽の規格"], reason: "顎ひも一体型で抜け防止。" },
  { sub: "FRPヘルメット（耐電圧）", spec: "耐熱・耐電圧7000V以下", priceMin: 3800, priceMax: 7800, regulations: ["保護帽の規格", "電気事業法"], reason: "7000V以下の高圧電気作業に対応。" },
  { sub: "MPヘルメット", spec: "労検 飛来落下＋電気用", priceMin: 2600, priceMax: 5600, regulations: ["保護帽の規格"], reason: "屋内・屋外兼用の汎用型。" },
  { sub: "ヘルメット用インナーキャップ（吸汗速乾）", spec: "夏用ライナー", priceMin: 600, priceMax: 1800, regulations: ["保護帽の規格（参考）"], reason: "汗取りで衛生を保ち、ヘルメット内側を清潔に。" },
];

// 安全靴
const SHOE_TEMPLATES = [
  { sub: "JIS S 種（重作業）安全靴", spec: "JIS T 8101 S種", priceMin: 6800, priceMax: 16800, regulations: ["JIS T 8101", "安衛則 第558条"], reason: "S種：重作業向け、先芯耐衝撃100J。" },
  { sub: "JIS L 種（軽作業）安全靴", spec: "JIS T 8101 L種", priceMin: 4800, priceMax: 12000, regulations: ["JIS T 8101", "安衛則 第558条"], reason: "L種：軽作業向け、軽量で疲れにくい。" },
  { sub: "JSAA A種 プロスニーカー", spec: "JSAA A種認定", priceMin: 5800, priceMax: 14800, regulations: ["JSAA A種", "安衛則 第558条"], reason: "JSAA A種 普通作業用認定。スニーカー型で軽量。" },
  { sub: "JSAA B種 プロスニーカー", spec: "JSAA B種認定", priceMin: 4200, priceMax: 9800, regulations: ["JSAA B種"], reason: "JSAA B種 軽作業用。コスト重視の現場に。" },
  { sub: "踏み抜き防止インソール内蔵 安全靴", spec: "JIS S種＋踏み抜き防止", priceMin: 8800, priceMax: 18800, regulations: ["JIS T 8101", "安衛則 第558条"], reason: "釘・鉄筋による踏み抜きを防止。建設・解体現場推奨。" },
  { sub: "耐滑性安全靴（F合格）", spec: "JIS T 8101 耐滑性能F合格", priceMin: 7800, priceMax: 16800, regulations: ["JIS T 8101"], reason: "耐滑床面（油・水）対応。厨房・食品工場推奨。" },
  { sub: "静電気帯電防止安全靴", spec: "JIS T 8103 静電靴", priceMin: 8800, priceMax: 17800, regulations: ["JIS T 8103", "労働安全衛生規則 静電気帯電防止"], reason: "静電気放電による粉じん爆発・火災を防止。" },
  { sub: "耐熱・耐切創安全靴", spec: "EN ISO 20345 HRO", priceMin: 12800, priceMax: 24800, regulations: ["JIS T 8101", "EN ISO 20345"], reason: "高温路面・切創リスク作業に対応。" },
  { sub: "長靴型安全長靴", spec: "JIS T 8101 防水ロング", priceMin: 5800, priceMax: 12800, regulations: ["JIS T 8101"], reason: "雨天・水場・コンクリート打設現場に最適。" },
  { sub: "半長靴型安全靴", spec: "JIS T 8101 ミドルカット", priceMin: 6800, priceMax: 14800, regulations: ["JIS T 8101"], reason: "足首までガード、土砂・粉じんの侵入を防止。" },
];

// 眼の保護具
const EYE_TEMPLATES = [
  { sub: "保護メガネ（密閉ゴグル）", spec: "JIS T 8147 G型", priceMin: 1200, priceMax: 3800, regulations: ["JIS T 8147", "安衛則 第312条"], reason: "粉じん・飛沫の眼侵入を防ぐ密閉構造。" },
  { sub: "保護メガネ（一眼式・曇り止め）", spec: "JIS T 8147 一眼式", priceMin: 800, priceMax: 2800, regulations: ["JIS T 8147"], reason: "曇り止めコート付きで視界クリア。" },
  { sub: "二眼式保護メガネ（軽量）", spec: "JIS T 8147 二眼式", priceMin: 1000, priceMax: 3200, regulations: ["JIS T 8147"], reason: "メガネ型で着脱が容易。" },
  { sub: "化学防護ゴグル", spec: "JIS T 8147 化学薬品対応", priceMin: 2200, priceMax: 5800, regulations: ["JIS T 8147", "安衛則 第594条"], reason: "酸・アルカリ等の薬液飛沫から眼を保護。" },
  { sub: "遮光保護メガネ（溶接用）", spec: "JIS T 8141 遮光度#5〜#13", priceMin: 1800, priceMax: 5200, regulations: ["JIS T 8141", "労安則 第312条"], reason: "アーク・ガス溶接の有害光線から眼を保護。" },
  { sub: "顔面保護シールド", spec: "JIS T 8147 フルフェイス", priceMin: 2800, priceMax: 7800, regulations: ["JIS T 8147"], reason: "顔全体を粉じん・飛沫から保護。" },
  { sub: "UV/IRカット保護メガネ", spec: "UV400/IRカット", priceMin: 1400, priceMax: 4200, regulations: ["JIS T 8147"], reason: "屋外作業の紫外線・赤外線を遮断。" },
];

// 呼吸用保護具
const RESP_TEMPLATES = [
  { sub: "防じんマスク（DS2 使い捨て）", spec: "国家検定 DS2", priceMin: 800, priceMax: 2800, regulations: ["防じんマスクの規格", "粉じん障害防止規則 第27条"], reason: "国家検定 DS2 取得。粉じん作業の基本装備。" },
  { sub: "防じんマスク（DS3 使い捨て）", spec: "国家検定 DS3", priceMin: 1400, priceMax: 4200, regulations: ["防じんマスクの規格", "粉じん則"], reason: "国家検定 DS3。アスベスト除去作業等の高捕集率対応。" },
  { sub: "取替式防じんマスク（RL2）", spec: "国家検定 RL2", priceMin: 4800, priceMax: 12800, regulations: ["防じんマスクの規格", "粉じん則 第27条"], reason: "フィルター交換可、長時間粉じん作業に経済的。" },
  { sub: "取替式防じんマスク（RL3）", spec: "国家検定 RL3", priceMin: 5800, priceMax: 14800, regulations: ["防じんマスクの規格"], reason: "高捕集率（99.9%）。石綿等特定粉じん作業対応。" },
  { sub: "電動ファン付き呼吸用保護具（PAPR）", spec: "国家検定 P-PAPR", priceMin: 38000, priceMax: 98000, regulations: ["電動ファン付き呼吸用保護具の規格", "石綿則 第14条"], reason: "送風で呼吸抵抗ゼロ。長時間アスベスト・石綿作業向け。" },
  { sub: "防毒マスク（直結式・有機ガス用）", spec: "国家検定 有機ガス用", priceMin: 4200, priceMax: 12800, regulations: ["防毒マスクの規格", "有機溶剤中毒予防規則"], reason: "有機溶剤蒸気から呼吸器を保護。" },
  { sub: "防毒マスク（隔離式）", spec: "国家検定 隔離式", priceMin: 8800, priceMax: 22800, regulations: ["防毒マスクの規格"], reason: "高濃度ガス環境向け、大容量吸収缶。" },
  { sub: "送気マスク（一定流量式）", spec: "JIS T 8153 送気式", priceMin: 28000, priceMax: 78000, regulations: ["JIS T 8153", "酸欠則 第5条"], reason: "酸素欠乏危険場所での作業に必須。" },
  { sub: "空気呼吸器（自蔵式SCBA）", spec: "JIS T 8155 SCBA", priceMin: 180000, priceMax: 380000, regulations: ["JIS T 8155", "酸欠則"], reason: "緊急救助・濃霧煙環境で30分自蔵呼吸。" },
];

// 化学物質特殊規制対応
const CHEM_TEMPLATES = [
  { sub: "防毒マスク用吸収缶（有機ガス）", spec: "国家検定 有機ガス用", priceMin: 2800, priceMax: 6800, regulations: ["有機則", "防毒マスクの規格"], reason: "トルエン・キシレン等有機溶剤蒸気を吸着。" },
  { sub: "防毒マスク用吸収缶（ハロゲンガス）", spec: "国家検定 ハロゲンガス用", priceMin: 3200, priceMax: 7800, regulations: ["特化則 第38条"], reason: "塩素・臭素等のハロゲンガス対応。" },
  { sub: "防毒マスク用吸収缶（硫化水素）", spec: "国家検定 硫化水素用", priceMin: 3400, priceMax: 7800, regulations: ["特化則"], reason: "硫化水素(H2S)の高濃度環境に対応。" },
  { sub: "防毒マスク用吸収缶（アンモニア）", spec: "国家検定 アンモニア用", priceMin: 3000, priceMax: 7200, regulations: ["特化則"], reason: "冷凍倉庫・畜産・化学プラントのアンモニアガス対応。" },
  { sub: "化学防護服 タイプ4（液体噴霧）", spec: "JIS T 8115 タイプ4", priceMin: 2800, priceMax: 8800, regulations: ["JIS T 8115", "特化則 第27条"], reason: "薬液飛沫・噴霧から全身を保護。" },
  { sub: "化学防護服 タイプ5（固体粒子）", spec: "JIS T 8115 タイプ5", priceMin: 1800, priceMax: 5800, regulations: ["JIS T 8115"], reason: "粉体・固体粒子の侵入を防止。" },
  { sub: "化学防護服 タイプ6（軽度飛沫）", spec: "JIS T 8115 タイプ6", priceMin: 1400, priceMax: 4800, regulations: ["JIS T 8115"], reason: "軽度の薬液飛沫対応。コスト重視向け。" },
  { sub: "耐薬品手袋（ニトリル・厚手）", spec: "JIS T 8116 透過防止", priceMin: 1200, priceMax: 3800, regulations: ["JIS T 8116", "有機則"], reason: "ニトリル素材で耐油・耐薬品性に優れる。" },
  { sub: "耐薬品手袋（PVA）", spec: "JIS T 8116 PVA", priceMin: 2800, priceMax: 6800, regulations: ["JIS T 8116", "特化則"], reason: "芳香族系・塩素系溶剤に強いPVA素材。" },
  { sub: "耐薬品手袋（ブチルゴム）", spec: "JIS T 8116 ブチル", priceMin: 3200, priceMax: 8800, regulations: ["JIS T 8116"], reason: "ケトン・酸・アルカリ等の幅広い薬品に対応。" },
  { sub: "化学防護長靴", spec: "JIS T 8117 耐薬品", priceMin: 8800, priceMax: 18800, regulations: ["JIS T 8117", "特化則"], reason: "下半身を薬液から完全防護。" },
  { sub: "防爆型呼吸用保護具", spec: "JIS T 8157 防爆対応", priceMin: 48000, priceMax: 128000, regulations: ["特化則", "労働安全衛生規則"], reason: "爆発雰囲気環境（ATEX相当）で使用可。" },
];

// 防音保護具
const HEARING_TEMPLATES = [
  { sub: "耳栓（使い捨て発泡）", spec: "JIS T 8161 SNR 32dB", priceMin: 200, priceMax: 800, regulations: ["JIS T 8161", "騒音障害防止のためのガイドライン"], reason: "85dB超の騒音作業で簡易導入。" },
  { sub: "耳栓（再利用可シリコン）", spec: "JIS T 8161 SNR 26dB", priceMin: 600, priceMax: 1800, regulations: ["JIS T 8161"], reason: "繰り返し使用でコスト最適。" },
  { sub: "イヤーマフ（標準）", spec: "JIS T 8161 SNR 28dB", priceMin: 2200, priceMax: 5800, regulations: ["JIS T 8161", "騒音障害防止のためのガイドライン"], reason: "着脱が容易で短時間騒音作業向け。" },
  { sub: "イヤーマフ（高遮音SNR 35dB）", spec: "JIS T 8161 SNR 35dB", priceMin: 4800, priceMax: 12800, regulations: ["JIS T 8161"], reason: "100dB超の高騒音環境（金属プレス・解体）対応。" },
  { sub: "ヘルメット取付型イヤーマフ", spec: "JIS T 8161 ヘルメットマウント", priceMin: 5800, priceMax: 14800, regulations: ["JIS T 8161"], reason: "ヘルメット併用で着脱不要。建設現場向け。" },
  { sub: "通信機能付きイヤーマフ", spec: "Bluetooth/特定小電力対応", priceMin: 28000, priceMax: 68000, regulations: ["JIS T 8161"], reason: "騒音遮断と無線連絡を両立。" },
];

// 暑熱対策
const HEAT_TEMPLATES = [
  { sub: "ファン付き作業服（4Vリチウム）", spec: "4V出力・ベスト型", priceMin: 8800, priceMax: 18800, regulations: ["熱中症予防（厚労省ガイドライン）"], reason: "ファン送風で衣服内温度を下げ、体感を冷却。" },
  { sub: "ファン付き作業服（12V/14Vハイパワー）", spec: "12V〜14V強力ファン", priceMin: 18800, priceMax: 38800, regulations: ["熱中症予防ガイドライン"], reason: "ハイパワー風量で炎天下の長時間作業に対応。" },
  { sub: "空調服フルセット（ベスト＋バッテリー）", spec: "リチウムバッテリー＋ファン", priceMin: 22800, priceMax: 48800, regulations: ["熱中症予防ガイドライン"], reason: "オールインワン、当日から使用可能。" },
  { sub: "冷却ベスト（保冷剤交換式）", spec: "保冷剤4個タイプ", priceMin: 4800, priceMax: 12800, regulations: ["熱中症予防ガイドライン"], reason: "電源不要、4時間冷却持続。" },
  { sub: "冷却ベスト（PCM相変化材）", spec: "PCM 28℃融点", priceMin: 18800, priceMax: 38800, regulations: ["熱中症予防ガイドライン"], reason: "氷点下保冷剤と異なり結露せず長時間冷却。" },
  { sub: "空調帽子（ファン付きヘルメットライナー）", spec: "USB/2200mAh", priceMin: 3800, priceMax: 9800, regulations: ["熱中症予防ガイドライン"], reason: "ヘルメット内に風を送り頭部を冷却。" },
  { sub: "ネッククーラー（冷却プレート）", spec: "ペルチェ素子搭載", priceMin: 6800, priceMax: 18800, regulations: ["熱中症予防ガイドライン"], reason: "首動脈を冷却し効率的に体温低下。" },
  { sub: "WBGT計（ハンディ熱中症計）", spec: "JIS B 7922", priceMin: 8800, priceMax: 28800, regulations: ["JIS B 7922", "熱中症予防ガイドライン"], reason: "WBGT値を測定し熱中症リスクを管理。" },
  { sub: "経口補水液（パウダー/個包装）", spec: "Na/Kバランス補給", priceMin: 800, priceMax: 4800, regulations: ["熱中症予防ガイドライン"], reason: "発汗時のNa・K補給で熱痙攣を予防。" },
  { sub: "塩飴・塩タブレット", spec: "1日10粒推奨", priceMin: 400, priceMax: 1800, regulations: ["熱中症予防ガイドライン"], reason: "現場での簡易塩分補給に。" },
  { sub: "遮熱タオル（速乾冷感）", spec: "気化冷却・UVカット", priceMin: 800, priceMax: 2800, regulations: ["熱中症予防ガイドライン（参考）"], reason: "首・額に巻いて放熱促進。" },
];

// 防寒装備
const COLD_TEMPLATES = [
  { sub: "防寒ジャンパー（中綿）", spec: "撥水・中綿200g", priceMin: 6800, priceMax: 16800, regulations: ["寒冷ばく露防止（参考）"], reason: "撥水加工で雪・雨に強い。" },
  { sub: "ヒーター内蔵ベスト", spec: "USB/3段階温度", priceMin: 8800, priceMax: 22800, regulations: ["寒冷ばく露防止"], reason: "電熱ヒーターで-5℃環境でも作業継続。" },
  { sub: "防寒ロングコート", spec: "膝下丈・防風", priceMin: 12800, priceMax: 28800, regulations: ["寒冷ばく露防止"], reason: "下半身まで保温。屋外監視業務に。" },
  { sub: "防寒手袋（防水・グリップ）", spec: "撥水・滑り止め", priceMin: 1800, priceMax: 5800, regulations: ["寒冷ばく露防止"], reason: "濡れに強く工具グリップ性も両立。" },
  { sub: "防寒長靴（裏ボア）", spec: "JIS S種＋裏ボア", priceMin: 6800, priceMax: 14800, regulations: ["JIS T 8101"], reason: "安全靴機能と保温を両立。" },
  { sub: "ネックウォーマー（防風）", spec: "起毛・防風素材", priceMin: 1200, priceMax: 3800, regulations: ["寒冷ばく露防止"], reason: "首から熱が逃げるのを防止。" },
];

// 高視認性ウェア
const HIVIS_TEMPLATES = [
  { sub: "高視認性ベスト（クラス2）", spec: "JIS T 8127 クラス2", priceMin: 1800, priceMax: 4800, regulations: ["JIS T 8127", "労安規則 道路工事"], reason: "夜間・薄暮の道路工事・交通誘導に必須。" },
  { sub: "高視認性ベスト（クラス3）", spec: "JIS T 8127 クラス3", priceMin: 2800, priceMax: 6800, regulations: ["JIS T 8127"], reason: "高速道路工事等の最高クラス視認性。" },
  { sub: "高視認性ジャンパー", spec: "JIS T 8127 + 防水", priceMin: 6800, priceMax: 14800, regulations: ["JIS T 8127"], reason: "雨天・夜間の長時間作業向け。" },
  { sub: "高視認性レインウェア", spec: "JIS T 8127 レイン", priceMin: 8800, priceMax: 18800, regulations: ["JIS T 8127"], reason: "豪雨時の交通誘導・道路工事に。" },
  { sub: "LEDライト付きベスト", spec: "USB充電式LED", priceMin: 4800, priceMax: 12800, regulations: ["JIS T 8127"], reason: "夜間視認性をさらに強化。" },
];

// 手袋
const HAND_TEMPLATES = [
  { sub: "耐切創手袋（HPPE・レベル5）", spec: "JIS T 8052 レベル5", priceMin: 1200, priceMax: 3800, regulations: ["JIS T 8052"], reason: "ガラス・金属加工の切創防止。レベル5最高クラス。" },
  { sub: "耐切創手袋（ステンレス繊維）", spec: "JIS T 8052 レベルF", priceMin: 2800, priceMax: 8800, regulations: ["JIS T 8052"], reason: "食肉解体・刃物作業の最高耐切創。" },
  { sub: "耐熱手袋（200℃級）", spec: "JIS T 8113 レベル3", priceMin: 1800, priceMax: 5800, regulations: ["JIS T 8113"], reason: "鋳造・溶接・調理の高温対応。" },
  { sub: "耐熱手袋（500℃級・アルミナイズ）", spec: "JIS T 8113 レベル4", priceMin: 6800, priceMax: 18800, regulations: ["JIS T 8113"], reason: "製鉄・ガラス工場の超高温作業向け。" },
  { sub: "防振手袋（ISO 10819）", spec: "ISO 10819 振動低減", priceMin: 2800, priceMax: 8800, regulations: ["ISO 10819", "振動障害予防"], reason: "チェーンソー・削岩機の振動障害を予防。" },
  { sub: "電気絶縁ゴム手袋（低圧）", spec: "JIS T 8112 1000V以下", priceMin: 4800, priceMax: 12800, regulations: ["JIS T 8112", "電気事業法"], reason: "1000V以下の低圧電気作業。" },
  { sub: "電気絶縁ゴム手袋（高圧）", spec: "JIS T 8112 7000V以下", priceMin: 12800, priceMax: 38800, regulations: ["JIS T 8112"], reason: "7000V以下の高圧電気作業。" },
  { sub: "革手袋（汎用）", spec: "牛革・補強", priceMin: 800, priceMax: 2800, regulations: ["JIS T 8113（参考）"], reason: "建設・運搬の擦り傷防止。" },
];

// 保護衣
const CLOTH_TEMPLATES = [
  { sub: "防炎服（アラミド繊維）", spec: "JIS T 8118 アーク防護", priceMin: 28000, priceMax: 78000, regulations: ["JIS T 8118"], reason: "電気アーク・炎ばく露作業向け。" },
  { sub: "帯電防止作業服", spec: "JIS T 8118 静電防止", priceMin: 6800, priceMax: 14800, regulations: ["JIS T 8118"], reason: "粉じん爆発リスクのある現場で必須。" },
  { sub: "防炎ジャケット（短時間用）", spec: "JIS L 1091 防炎認定", priceMin: 12800, priceMax: 28800, regulations: ["JIS L 1091"], reason: "溶接火花・炎の短時間ばく露対応。" },
  { sub: "防炎手袋（溶接用）", spec: "JIS T 8113 + 防炎", priceMin: 2200, priceMax: 6800, regulations: ["JIS T 8113"], reason: "溶接スパッタから手を保護。" },
  { sub: "高視認＋防炎ジャケット", spec: "JIS T 8127 + JIS L 1091", priceMin: 22000, priceMax: 48000, regulations: ["JIS T 8127", "JIS L 1091"], reason: "夜間溶接・道路炎天下作業の二重防護。" },
];

// 落下防止（lifeline）
const LIFELINE_TEMPLATES = [
  { sub: "親綱（水平ロープ・10m）", spec: "JIS T 8165相当", priceMin: 8800, priceMax: 18800, regulations: ["安衛則 第518条", "墜落制止用器具の規格"], reason: "鉄骨建方・橋梁の水平ライフラインに必須。" },
  { sub: "親綱（水平ロープ・20m）", spec: "20mタイトロック式", priceMin: 12800, priceMax: 28800, regulations: ["安衛則 第518条"], reason: "中規模屋根工事に対応する20m長尺。" },
  { sub: "親綱緊張器（アルミ合金）", spec: "ラチェット式", priceMin: 3800, priceMax: 9800, regulations: ["安衛則 第518条"], reason: "親綱を確実に張力維持。" },
  { sub: "命綱（垂直）", spec: "12mm 垂直ロープ", priceMin: 6800, priceMax: 18800, regulations: ["安衛則 第518条"], reason: "梯子昇降・タンク内作業の墜落制止。" },
  { sub: "ロリップ（垂直親綱用墜落制止器）", spec: "JIS T 8165 ガイド型", priceMin: 18800, priceMax: 38800, regulations: ["JIS T 8165"], reason: "垂直方向の墜落制止に。建設・林業・通信塔。" },
  { sub: "リトラクタブル型ランヤード（ロープ巻取式）", spec: "1.5m〜2.5m自動巻取", priceMin: 22000, priceMax: 48000, regulations: ["JIS T 8165"], reason: "ランヤードのたるみによる引っかかりを防止。" },
];

// 救命胴衣・救助具
const RESCUE_TEMPLATES = [
  { sub: "ライフジャケット（自動膨張式）", spec: "桜マーク 国土交通省型式承認", priceMin: 12800, priceMax: 28800, regulations: ["船舶安全法施行規則", "国土交通省告示"], reason: "桜マーク取得。落水時に自動膨張で浮力確保。" },
  { sub: "ライフジャケット（手動膨張式）", spec: "桜マーク承認", priceMin: 9800, priceMax: 22800, regulations: ["船舶安全法施行規則"], reason: "桜マーク取得品。手動レバーで確実に膨張。" },
  { sub: "ライフジャケット（固形式）", spec: "桜マーク承認", priceMin: 6800, priceMax: 14800, regulations: ["船舶安全法施行規則"], reason: "発泡材内蔵で常時浮力。電源不要。" },
  { sub: "作業用救命胴衣（漁業・水産用）", spec: "TYPE A 桜マーク", priceMin: 8800, priceMax: 18800, regulations: ["船舶安全法"], reason: "近海漁業・水産加工の落水対策に必須。" },
  { sub: "救命浮環（リング式）", spec: "JIS S 7115 LBR", priceMin: 4800, priceMax: 12800, regulations: ["JIS S 7115"], reason: "船上・係留所からの緊急救助に。" },
];

// 救急用品
const FIRSTAID_TEMPLATES = [
  { sub: "救急箱（事業所用 標準セット）", spec: "JIS S 7501 / 30種以上", priceMin: 4800, priceMax: 12800, regulations: ["JIS S 7501", "労働安全衛生規則 第633条"], reason: "労安規則第633条の救急用具備付け要件に対応。" },
  { sub: "AED（自動体外式除細動器）", spec: "厚労省承認医療機器", priceMin: 198000, priceMax: 380000, regulations: ["医薬品医療機器等法"], reason: "心室細動の救命率を5倍以上向上。" },
  { sub: "止血帯（CAT）", spec: "TCCC推奨", priceMin: 2800, priceMax: 6800, regulations: ["救急法（参考）"], reason: "重度出血時に1分以内で止血。" },
  { sub: "三角巾（綿100%）", spec: "JIS規格相当", priceMin: 200, priceMax: 800, regulations: ["JIS S 7501"], reason: "骨折固定・包帯代用に万能。" },
  { sub: "アイウォッシュボトル（500ml）", spec: "ANSI Z358.1相当", priceMin: 2200, priceMax: 5800, regulations: ["有機則 第61条", "特化則"], reason: "薬品・粉じんの眼侵入時に即時洗浄。" },
  { sub: "携帯型酸素吸入器", spec: "100% O2 5L", priceMin: 6800, priceMax: 18800, regulations: ["医薬品医療機器等法"], reason: "酸欠・煙ばく露時の応急処置に。" },
  { sub: "熱中症応急パック", spec: "冷却剤＋経口補水液", priceMin: 1800, priceMax: 4800, regulations: ["熱中症予防ガイドライン"], reason: "重症熱中症の体温低下処置に。" },
];

// ─────────────────────────────────────────────────────────────
// カテゴリ別生成プラン（合計1,000）
// ─────────────────────────────────────────────────────────────
const PLAN = [
  {
    catId: "fall-protection",
    targetCount: 50,
    templates: FALL_TEMPLATES,
    makers: MAKERS.fall,
    industries: ["construction", "manufacturing"],
    hazards: ["fall", "height"],
    seasons: ["all"],
  },
  {
    catId: "head-protection",
    targetCount: 80,
    templates: HELMET_TEMPLATES,
    makers: MAKERS.helmet,
    industries: ["construction", "manufacturing", "electrical", "transport"],
    hazards: ["impact", "fall"],
    seasons: ["all"],
  },
  {
    catId: "foot-protection",
    targetCount: 150,
    templates: SHOE_TEMPLATES,
    makers: MAKERS.shoe,
    industries: ["construction", "manufacturing", "transport", "chemical", "healthcare"],
    hazards: ["impact", "puncture", "slip", "static"],
    seasons: ["all"],
  },
  {
    catId: "eye-protection",
    targetCount: 70,
    templates: EYE_TEMPLATES,
    makers: MAKERS.eye,
    industries: ["construction", "manufacturing", "chemical"],
    hazards: ["impact", "chemical", "uv", "dust"],
    seasons: ["all"],
  },
  {
    catId: "respiratory",
    targetCount: 80,
    templates: RESP_TEMPLATES,
    makers: MAKERS.resp,
    industries: ["construction", "manufacturing", "chemical", "healthcare"],
    hazards: ["dust", "vapor", "chemical"],
    seasons: ["all"],
  },
  {
    catId: "respiratory-fitting",
    targetCount: 150,
    templates: CHEM_TEMPLATES,
    makers: MAKERS.chem,
    industries: ["chemical", "manufacturing", "healthcare"],
    hazards: ["chemical", "vapor"],
    seasons: ["all"],
  },
  {
    catId: "hearing-protection",
    targetCount: 50,
    templates: HEARING_TEMPLATES,
    makers: MAKERS.hearing,
    industries: ["construction", "manufacturing", "transport"],
    hazards: ["noise"],
    seasons: ["all"],
  },
  {
    catId: "heat-stroke",
    targetCount: 150,
    templates: HEAT_TEMPLATES,
    makers: MAKERS.heat,
    industries: ["construction", "manufacturing", "agriculture", "transport", "forestry"],
    hazards: ["heat", "uv"],
    seasons: ["summer", "all"],
  },
  {
    catId: "cold-protection",
    targetCount: 30,
    templates: COLD_TEMPLATES,
    makers: MAKERS.cold,
    industries: ["construction", "transport", "fishery", "agriculture"],
    hazards: ["cold"],
    seasons: ["winter"],
  },
  {
    catId: "high-vis",
    targetCount: 30,
    templates: HIVIS_TEMPLATES,
    makers: MAKERS.hivis,
    industries: ["construction", "transport"],
    hazards: ["traffic", "low-light"],
    seasons: ["all"],
  },
  {
    catId: "hand-protection",
    targetCount: 80,
    templates: HAND_TEMPLATES,
    makers: MAKERS.hand,
    industries: ["construction", "manufacturing", "chemical", "forestry", "electrical"],
    hazards: ["cut", "heat", "vibration", "chemical"],
    seasons: ["all"],
  },
  {
    catId: "protective-clothing",
    targetCount: 60,
    templates: CLOTH_TEMPLATES,
    makers: MAKERS.cloth,
    industries: ["manufacturing", "electrical", "chemical", "construction"],
    hazards: ["fire", "static", "heat"],
    seasons: ["all"],
  },
  {
    catId: "lifeline",
    targetCount: 30,
    templates: LIFELINE_TEMPLATES,
    makers: MAKERS.fall,
    industries: ["construction", "manufacturing"],
    hazards: ["fall", "height"],
    seasons: ["all"],
  },
  {
    catId: "rescue",
    targetCount: 20,
    templates: RESCUE_TEMPLATES,
    makers: MAKERS.rescue,
    industries: ["fishery", "transport", "construction"],
    hazards: ["drown"],
    seasons: ["all"],
  },
  {
    catId: "first-aid",
    targetCount: 20,
    templates: FIRSTAID_TEMPLATES,
    makers: MAKERS.firstaid,
    industries: ["construction", "manufacturing", "healthcare", "transport"],
    hazards: ["all"],
    seasons: ["all"],
  },
];

// バリエーション語彙
const COLOR_VARIANTS = ["ホワイト", "ブラック", "ネイビー", "イエロー", "オレンジ", "レッド", "グレー"];
const SIZE_VARIANTS = ["S", "M", "L", "LL", "3L", "4L"];
const FEATURE_VARIANTS = ["軽量モデル", "通気性アップ", "撥水加工", "リフレクター付き", "標準モデル", "プロ仕様", "ロングセラー", "新型2026", "コンフォートモデル", "コストパフォーマンスモデル"];

// もしもアフィリエイト プレースホルダー
function moshimoUrls(name) {
  const enc = encodeURIComponent(name);
  return {
    amazonUrl: `https://www.amazon.co.jp/s?k=${enc}`,
    rakutenUrl: `https://search.rakuten.co.jp/search/mall/${enc}/`,
    moshimoNote: "※ もしもアフィリエイト経由での購入時、研究プロジェクト運営費に充てます。",
  };
}

// ─────────────────────────────────────────────────────────────
// 生成
// ─────────────────────────────────────────────────────────────
function generateCategory(plan, startIdx) {
  const cat = CATEGORIES.find((c) => c.id === plan.catId);
  if (!cat) throw new Error(`Unknown category: ${plan.catId}`);
  const items = [];
  for (let i = 0; i < plan.targetCount; i++) {
    const tpl = plan.templates[i % plan.templates.length];
    const maker = pick(plan.makers);
    const variant = pick(FEATURE_VARIANTS);
    const sizeOrColor = rand() < 0.5 ? pick(SIZE_VARIANTS) : pick(COLOR_VARIANTS);
    const seriesNo = String(100 + Math.floor(rand() * 900));
    const name = `${maker} ${tpl.sub}（${variant}・${sizeOrColor}） ${seriesNo}`;
    const [priceMin, priceMax] = priceBetween(tpl.priceMin, tpl.priceMax);
    const rating = ratingBetween(4.0, 4.9);
    const reviewCount = 5 + Math.floor(rand() * 480);
    const id = `eq-${String(startIdx + i + 1).padStart(4, "0")}`;
    items.push({
      id,
      categoryId: cat.id,
      categoryName: cat.name,
      categoryIcon: cat.icon,
      name,
      maker,
      subCategory: tpl.sub,
      spec: tpl.spec,
      priceMin,
      priceMax,
      priceLabel: `¥${priceMin.toLocaleString()}〜¥${priceMax.toLocaleString()}`,
      industries: pickN(plan.industries, Math.max(1, Math.ceil(plan.industries.length * (0.5 + rand() * 0.5)))),
      hazards: pickN(plan.hazards, Math.max(1, Math.min(plan.hazards.length, 1 + Math.floor(rand() * 2)))),
      seasons: plan.seasons,
      rating,
      reviewCount,
      recommendReason: tpl.reason,
      regulations: tpl.regulations,
      affiliate: moshimoUrls(`${maker} ${tpl.sub}`),
      jisOrCertification: tpl.spec,
    });
  }
  return items;
}

function main() {
  const allItems = [];
  let idx = 0;
  for (const plan of PLAN) {
    const items = generateCategory(plan, idx);
    allItems.push(...items);
    idx += items.length;
  }
  // 件数チェック
  const targetTotal = PLAN.reduce((s, p) => s + p.targetCount, 0);
  if (allItems.length !== targetTotal) {
    throw new Error(`generation count mismatch: got ${allItems.length}, want ${targetTotal}`);
  }
  const out = {
    generatedAt: new Date().toISOString().slice(0, 10),
    totalItems: allItems.length,
    hazardLabels: HAZARD_LABELS,
    industryLabels: INDUSTRY_LABELS,
    categories: CATEGORIES,
    items: allItems,
  };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log(`✓ generated ${allItems.length} items → ${path.relative(process.cwd(), OUT)}`);
  // カテゴリ別件数を表示
  const cnt = {};
  allItems.forEach((it) => (cnt[it.categoryId] = (cnt[it.categoryId] || 0) + 1));
  Object.entries(cnt).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
}

main();
