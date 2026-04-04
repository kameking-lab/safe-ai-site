import type { AccidentCase, AccidentType, AccidentWorkCategory } from "@/lib/types/domain";

const TYPES: AccidentType[] = [
  "墜落",
  "転倒",
  "挟まれ",
  "飛来落下",
  "感電",
  "車両",
  "崩壊",
  "火災",
  "中毒",
  "溺水",
];

const CATEGORIES: AccidentWorkCategory[] = [
  "高所",
  "電気",
  "足場",
  "重機",
  "一般",
  "解体",
  "製造",
  "建設",
  "倉庫",
];

const SEVERITIES = ["軽傷", "中等傷", "重傷", "死亡"] as const;

/** 50種以上のシナリオで多様性を確保（厚労省公表事例パターンをベースに生成） */
const SCENARIOS: { verb: string; noun: string; industry?: string }[] = [
  // 高所・足場
  { verb: "足場移動中に", noun: "手すり欠損区間からの転落", industry: "建設" },
  { verb: "仮設足場の点検省略により", noun: "床材の抜け落ちで墜落", industry: "建設" },
  { verb: "屋根工事中に", noun: "スレート踏み抜きによる墜落", industry: "建設" },
  { verb: "高所作業台からの", noun: "バランス喪失による転落", industry: "建設" },
  { verb: "梯子使用時の", noun: "片手作業中の滑落", industry: "設備" },
  { verb: "移動式足場の固定忘れにより", noun: "傾倒して作業員が墜落", industry: "建設" },
  { verb: "高所作業車バケットからの", noun: "工具落下", industry: "電気" },
  { verb: "鉄骨建方作業中に", noun: "安全帯未着用で転落", industry: "建設" },
  // クレーン・揚重
  { verb: "クレーン吊り荷の", noun: "振れによる作業員への激突", industry: "建設" },
  { verb: "玉掛けワイヤ損傷による", noun: "吊り荷の落下", industry: "製造" },
  { verb: "タワークレーン旋回時の", noun: "死角への接触事故", industry: "建設" },
  { verb: "ホイストクレーン操作ミスによる", noun: "荷物の急落下", industry: "製造" },
  { verb: "玉掛け者の合図誤認による", noun: "揚重物の旋回接触", industry: "建設" },
  // 重機
  { verb: "バックホウ旋回時の", noun: "誘導死角からの巻き込まれ", industry: "土木" },
  { verb: "フォークリフト妻バック時の", noun: "歩行者通路への侵入", industry: "倉庫" },
  { verb: "ブルドーザー法面作業中の", noun: "転落による運転員の死傷", industry: "土木" },
  { verb: "タイヤローラー後退時の", noun: "作業員接触事故", industry: "土木" },
  { verb: "高所作業車旋回時の", noun: "電線への接触感電", industry: "電気" },
  // ロックアウト・機械
  { verb: "ロックアウト未実施での", noun: "設備再起動による挟まれ", industry: "製造" },
  { verb: "プレス機の安全カバー取り外しによる", noun: "金型閉鎖時の手指挟まれ", industry: "製造" },
  { verb: "コンベアのジャム除去中に", noun: "再起動で腕を巻き込まれ", industry: "製造" },
  { verb: "研削砥石の亀裂見落としによる", noun: "砥石破裂・飛来", industry: "製造" },
  { verb: "旋盤作業中の", noun: "切り屑巻き込みによる手指切断", industry: "製造" },
  // 電気
  { verb: "活線確認省略による", noun: "分電盤作業中の感電", industry: "電気" },
  { verb: "停電未確認での", noun: "高圧線接触死亡事故", industry: "電気" },
  { verb: "仮設配線の絶縁不良による", noun: "接地不良で感電", industry: "建設" },
  { verb: "水濡れ状態での", noun: "電動工具使用中の感電", industry: "建設" },
  // 資材・飛来落下
  { verb: "強風時の資材", noun: "固定不足による飛来落下", industry: "建設" },
  { verb: "型枠解体順序誤りによる", noun: "壁体倒壊", industry: "建設" },
  { verb: "パレット積み荷崩れによる", noun: "倉庫内での資材落下", industry: "倉庫" },
  { verb: "高所ビルの外壁修繕中の", noun: "コンクリート片落下", industry: "建設" },
  // 酸欠・有害ガス
  { verb: "酸欠空間での", noun: "換気不足による意識障害", industry: "化学" },
  { verb: "マンホール内作業中の", noun: "硫化水素中毒による死亡", industry: "土木" },
  { verb: "タンク内洗浄中の", noun: "溶剤蒸気吸引による急性中毒", industry: "製造" },
  { verb: "地下ピット作業での", noun: "酸欠による複数名倒れ", industry: "設備" },
  // 熱中症・気候
  { verb: "猛暑日の屋外鉄骨作業中の", noun: "熱中症による意識消失", industry: "建設" },
  { verb: "高温環境の炉前作業での", noun: "熱疲労による転倒", industry: "製造" },
  { verb: "真夏のルーフィング作業中に", noun: "高体温で倒れ落下", industry: "建設" },
  // 火災・爆発
  { verb: "溶接火花による", noun: "近傍可燃物への引火", industry: "製造" },
  { verb: "送風停止後の", noun: "ダクト内粉じん爆燃", industry: "製造" },
  { verb: "ガスボンベ転倒による", noun: "漏洩引火爆発", industry: "建設" },
  { verb: "廃液処理容器への", noun: "禁水物質混入で爆発", industry: "化学" },
  // 交通・車両
  { verb: "夜間誘導不足による", noun: "大型車との接触", industry: "道路" },
  { verb: "工事区間への", noun: "一般車誤進入による作業員接触", industry: "道路" },
  { verb: "フォークリフト急旋回時の", noun: "積荷落下で歩行者直撃", industry: "倉庫" },
  // 転倒・腰痛
  { verb: "濡れた通路での", noun: "スリップ転倒による骨折", industry: "製造" },
  { verb: "段差未標識による", noun: "つまずき転倒で頭部打撲", industry: "建設" },
  { verb: "重量物の不適切な持ち上げによる", noun: "腰部ぎっくり腰の重傷", industry: "倉庫" },
  // 林業・農業
  { verb: "チェーンソー使用時の", noun: "跳ね返りによる下肢切創", industry: "林業" },
  { verb: "伐倒木の受け口見誤りによる", noun: "意図しない方向への倒木接触", industry: "林業" },
  { verb: "農業用トラクター横転による", noun: "運転者の挟まれ・死亡", industry: "農業" },
  // 医療・介護
  { verb: "患者移送補助中の", noun: "腰部の過負荷による捻挫重傷", industry: "医療" },
  { verb: "針刺し事故による", noun: "血液感染リスクの発生", industry: "医療" },
  // 解体
  { verb: "アスベスト含有建材除去時の", noun: "飛散防護不足で曝露", industry: "解体" },
  { verb: "解体重機オペレーターの", noun: "倒壊方向誤認で近隣接触", industry: "解体" },
];

const CAUSES_POOL = [
  "リスクアセスメント未実施または形骸化",
  "作業手順書の未整備・未周知",
  "監督者による立会い・確認不足",
  "保護具の未着用・不適切な使用",
  "安全教育の不足または内容の陳腐化",
  "KY活動の形式化・危険の見落とし",
  "機械・設備の定期点検未実施",
  "過去の類似事故の水平展開不足",
  "作業変更時の安全確認省略",
  "コミュニケーション不足による誤認",
  "長時間労働による注意力低下",
  "新規入場者への安全教育不足",
  "下請け間の連絡調整の不備",
  "異常気象時の作業計画見直し未実施",
  "設備の経年劣化見落とし",
  "夜間・悪天候下での作業強行",
  "繁忙期の手順省略慣行",
  "一人作業での緊急時対応困難",
  "近隣住民・通行人への安全配慮不足",
  "作業環境（照度・騒音・温度）の管理不足",
];

const PREVENTION_POOL = [
  "作業前KYで危険箇所と対策を全員で確認する",
  "保護具（安全帯・ヘルメット・保護眼鏡）の着用をチェックリスト化する",
  "異常時の停止・報告ラインを明文化し全員に周知する",
  "ロックアウト・タグアウト手順を作業標準書に明記する",
  "新規入場者教育に類似事故事例を含める",
  "作業変更時は必ず上長への報告と再KYを実施する",
  "定期点検記録を現場掲示し近接者が確認できるようにする",
  "重大災害事例の水平展開を月1回以上の朝礼で実施する",
  "高所作業は必ず2名以上で実施し1名が監視役となる",
  "誘導員を配置し重機と歩行者を完全分離する",
  "強風・大雨・凍結時の作業中断基準をあらかじめ設定する",
  "吊り荷の経路・退避範囲を作業前に全員へ明示する",
  "酸欠危険場所は入場前に酸素濃度測定と強制換気を義務付ける",
  "熱中症予防でWBGT値を測定し25℃超で休憩頻度を増やす",
  "化学物質取り扱い時はSDSを必ず確認し適切なPPEを選定する",
  "足場・仮設構造物の組立後に第三者点検を実施する",
  "作業許可証（PTW）制度を導入し危険作業を管理する",
  "ヒヤリハット報告を奨励し月次で分析・改善につなげる",
];

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/** サイト内検索・フィルタ用の大量事例（公的DBの代替としてブラウザ内生成。後からCSV/Excel取込に差し替え可） */
export function buildGeneratedAccidentCases(count: number, seed = 20260405): AccidentCase[] {
  const rng = mulberry32(seed);
  const pick = <T,>(arr: T[]) => arr[Math.floor(rng() * arr.length)]!;
  const pickN = <T,>(arr: T[], n: number): T[] => {
    const shuffled = [...arr].sort(() => rng() - 0.5);
    return shuffled.slice(0, n);
  };
  const out: AccidentCase[] = [];

  for (let i = 0; i < count; i += 1) {
    // 厚労省統計の10年分をカバー（2015–2026）
    const y = 2015 + Math.floor(rng() * 12);
    const m = 1 + Math.floor(rng() * 12);
    const d = 1 + Math.floor(rng() * 28);
    const type = pick(TYPES);
    const workCategory = pick(CATEGORIES);
    const sev = pick([...SEVERITIES]);
    const sc = pick(SCENARIOS);
    const id = `ac-gen-${i}`;
    const industryTag = sc.industry ? `【${sc.industry}】` : "";
    const title = `${industryTag}${workCategory}作業における${type}災害（事例${i + 1}）`;
    const summary = `${y}年${m}月、${sc.verb}${sc.noun}が発生。${type}に分類される事例です。${
      sev === "死亡" ? "被災者は搬送後に死亡が確認された。" : sev === "重傷" ? "被災者は重傷を負い長期入院となった。" : ""
    }作業前KYおよびリスクアセスメントの不徹底が主要因として特定されている。`;
    const mainCauses = pickN(CAUSES_POOL, 3);
    const preventionPoints = pickN(PREVENTION_POOL, 3);
    out.push({
      id,
      title,
      occurredOn: `${y}-${pad2(m)}-${pad2(d)}`,
      type,
      workCategory,
      severity: sev,
      summary,
      mainCauses,
      preventionPoints,
    });
  }

  return out;
}
