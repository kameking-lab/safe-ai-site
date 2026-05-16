/**
 * 免許データベース（安衛法第61条・安衛令第20条の就業制限業務）
 * 国家試験合格または都道府県労働局長交付が必要な免許。
 * Legal basis: 労働安全衛生法第61条・安衛令第20条
 * Reference: 厚生労働省 https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/roudoukijun/anzen/anzeneisei04.html
 */

import type { EducationCert } from "@/types/education-cert";

export const LICENSES: EducationCert[] = [
  // === クレーン系免許 ===
  {
    id: "lic-crane-derrick",
    name: "クレーン・デリック運転士免許",
    certType: "license",
    targetWork: "つり上げ荷重5トン以上のクレーン（移動式クレーンおよびデリックを除く）の運転業務",
    relatedLaw: "安衛法第61条・安衛令第20条第7号・クレーン則第224条",
    duration: "国家試験（学科＋実技）合格 — 受験資格に実務経験または訓練修了が必要",
    workCategories: ["construction", "manufacturing", "logistics", "shipbuilding"],
    keywords: ["クレーン運転士", "クレーン免許", "天井クレーン", "橋形クレーン", "デリック", "限定なし"],
    relatedCertIds: ["st-crane-5t", "se-36-5-jukiso"],
    notes: "クレーン限定免許・床上運転式クレーン限定免許あり。移動式クレーンは別免許",
  },
  {
    id: "lic-mobile-crane",
    name: "移動式クレーン運転士免許",
    certType: "license",
    targetWork: "つり上げ荷重5トン以上の移動式クレーン（トラッククレーン・ラフタークレーン等）の運転業務",
    relatedLaw: "安衛法第61条・安衛令第20条第7号・クレーン則第229条",
    duration: "国家試験（学科＋実技）合格",
    workCategories: ["construction", "manufacturing", "logistics"],
    keywords: ["移動式クレーン運転士", "ラフター", "トラッククレーン", "オールテレーン", "免許"],
    relatedCertIds: ["st-mobile-crane", "se-36-6-ido-crane"],
    notes: "5t未満は小型移動式クレーン運転技能講習修了で可",
  },
  {
    id: "lic-yangu",
    name: "揚貨装置運転士免許",
    certType: "license",
    targetWork: "つり上げ荷重0.5トン以上の揚貨装置（船のデリックやクレーン）の運転業務",
    relatedLaw: "安衛法第61条・安衛令第20条第8号・クレーン則第235条",
    duration: "国家試験（学科＋実技）合格",
    workCategories: ["shipbuilding", "logistics"],
    keywords: ["揚貨装置", "デリック", "船舶荷役", "船のクレーン", "港湾", "免許"],
    notes: "港湾荷役・船舶荷役での揚貨装置に特有の免許",
  },
  // === ボイラー技士免許 ===
  {
    id: "lic-boiler-2",
    name: "二級ボイラー技士免許",
    certType: "license",
    targetWork: "小規模ボイラー以外のボイラー（伝熱面積25m²未満等）の取扱い業務",
    relatedLaw: "安衛法第61条・安衛令第20条第3号・ボイラー則第24条",
    duration: "国家試験（学科）合格 — 実技講習修了または実務経験が必要",
    workCategories: ["manufacturing", "general"],
    keywords: ["ボイラー技士", "二級ボイラー", "ボイラー", "蒸気", "免許"],
    relatedCertIds: ["st-boiler-chief"],
    notes: "伝熱面積500m²以上は特級ボイラー技士が必要",
  },
  {
    id: "lic-boiler-1",
    name: "一級ボイラー技士免許",
    certType: "license",
    targetWork: "伝熱面積500m²未満のボイラーの取扱い業務（特級は500m²以上）",
    relatedLaw: "安衛法第61条・安衛令第20条第3号・ボイラー則第24条",
    duration: "国家試験（学科）合格 — 二級ボイラー技士免許保有が受験資格の一つ",
    workCategories: ["manufacturing", "general"],
    keywords: ["ボイラー技士", "一級ボイラー", "大型ボイラー", "蒸気", "免許"],
    relatedCertIds: ["lic-boiler-2"],
  },
  // === 潜水士免許 ===
  {
    id: "lic-diver",
    name: "潜水士免許",
    certType: "license",
    targetWork: "水面下での潜水業務（土木・建設・調査・救助等）",
    relatedLaw: "安衛法第61条・安衛令第20条第9号・高圧則第52条",
    duration: "国家試験（学科）合格 — 実務経験または訓練修了が必要",
    workCategories: ["construction", "general"],
    keywords: ["潜水士", "潜水", "水中作業", "水中溶接", "海中", "免許"],
    relatedCertIds: ["se-36-25-shokucho2"],
    notes: "水深10m以上の潜水業務は免許が必須。送気式（ヘルメット潜水）も含む",
  },
  // === ガス溶接・放射線系免許 ===
  {
    id: "lic-gas-welding-chief",
    name: "ガス溶接作業主任者免許",
    certType: "license",
    targetWork: "アセチレン溶接装置・ガス集合溶接装置を用いた金属の溶接・溶断・加熱作業の主任者",
    relatedLaw: "安衛法第14条・安衛令第6条第3号・安衛則第314条",
    duration: "国家試験（学科）合格",
    workCategories: ["manufacturing", "construction", "shipbuilding"],
    keywords: ["ガス溶接", "ガス集合溶接", "アセチレン", "溶断", "作業主任者", "免許"],
    relatedCertIds: ["st-gas-chief"],
    notes: "ガス溶接技能講習修了とは別。装置を使った作業の主任者選任に免許が必要",
  },
  {
    id: "lic-xray-chief",
    name: "エックス線作業主任者免許",
    certType: "license",
    targetWork: "エックス線装置（医療用除く）を使用する放射線業務の作業主任者",
    relatedLaw: "安衛法第14条・安衛令第6条第27号・電離則第46条",
    duration: "国家試験（学科）合格",
    workCategories: ["manufacturing", "construction"],
    keywords: ["エックス線", "X線", "非破壊検査", "放射線作業主任者", "免許"],
    relatedCertIds: ["se-36-23-radiation", "st-radiation-chief"],
  },
  {
    id: "lic-gamma-chief",
    name: "ガンマ線透過写真撮影作業主任者免許",
    certType: "license",
    targetWork: "放射性同位元素（コバルト60等）を用いたガンマ線透過写真撮影作業の作業主任者",
    relatedLaw: "安衛法第14条・安衛令第6条第27号の2・電離則第52条の2",
    duration: "国家試験（学科）合格",
    workCategories: ["manufacturing", "construction"],
    keywords: ["ガンマ線", "RI", "放射性同位元素", "非破壊検査", "透過写真", "免許"],
    relatedCertIds: ["se-36-23-radiation"],
  },
  // === 発破技士免許 ===
  {
    id: "lic-hakka",
    name: "発破技士免許",
    certType: "license",
    targetWork: "火薬類を用いた発破（爆破）の業務",
    relatedLaw: "安衛法第61条・安衛令第20条第5号・安衛則第321条",
    duration: "国家試験（学科＋実技）合格",
    workCategories: ["mining", "construction"],
    keywords: ["発破", "爆薬", "火薬", "ダイナマイト", "爆破", "発破技士", "免許"],
    relatedCertIds: ["st-hakkaku-chief"],
    notes: "火薬類の取扱いには火薬類取締法に基づく火薬類取扱保安責任者免状（経産省）も必要な場合あり",
  },
];
