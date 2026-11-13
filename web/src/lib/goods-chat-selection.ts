export const PPE_SELECTION_CHECKLIST = [
  "作業、危険源、ばく露経路、使用時間、頻度を特定する",
  "化学物質を扱う場合は、最新版SDSの第8項などで推奨保護具を確認する",
  "必要な国家検定、JIS等の規格、性能区分と使用期限を確認する",
  "顔面・身体へのフィット、他の保護具との干渉、サイズを実装着で確認する",
  "交換時期、点検、洗浄、保管、教育の手順を決める",
  "保護具だけに頼らず、代替、隔離、局所排気、作業方法の改善を先に検討する",
  "安全衛生担当者、保護具着用管理責任者、メーカー等へ適合性を確認する",
] as const;

const CATEGORY_RULES = [
  {
    id: "fall-protection",
    keywords: ["高所", "墜落", "足場", "屋根", "はしご", "梯子", "鉄骨"],
    reason: "作業高さ・落下距離・取付設備を確認してから墜落制止用器具を検討",
  },
  {
    id: "respiratory",
    keywords: ["粉じん", "粉塵", "有機溶剤", "塗装", "溶接", "ヒューム", "石綿", "アスベスト"],
    reason: "有害物質、濃度、酸素濃度とSDSに適合する呼吸用保護具を確認",
  },
  {
    id: "chemical-gloves",
    keywords: ["薬液", "酸", "アルカリ", "化学", "溶剤", "皮膚", "洗浄剤"],
    reason: "対象物質ごとの耐透過・劣化データと使用時間を確認",
  },
  {
    id: "eye-face-protection",
    keywords: ["飛来", "研削", "グラインダー", "切断", "薬液", "溶接", "飛沫"],
    reason: "飛来物・薬液・光線と他の保護具との干渉を確認",
  },
  {
    id: "hearing",
    keywords: ["騒音", "大きな音", "はつり", "ハツリ", "削岩"],
    reason: "騒音ばく露と必要遮音量、警報・会話の聞こえ方を確認",
  },
  {
    id: "gas-detectors",
    keywords: ["酸欠", "酸素", "ガス", "硫化水素", "一酸化炭素", "密閉", "マンホール"],
    reason: "測定対象、警報値、校正、センサー寿命と測定位置を確認",
  },
  {
    id: "machine-lockout",
    keywords: ["機械", "点検", "整備", "修理", "清掃", "巻き込まれ", "電源"],
    reason: "すべてのエネルギー源、施錠箇所、復旧手順を確認",
  },
  {
    id: "heat-cold",
    keywords: ["暑熱", "熱中症", "高温", "寒冷", "低温", "屋外"],
    reason: "作業変更・休憩・水分塩分・測定を主にし、用品は補助として確認",
  },
  {
    id: "signs-barriers",
    keywords: ["立入", "進入", "車両", "重機", "区画", "第三者", "通行"],
    reason: "対象者、禁止・指示内容、視認距離と設置場所を確認",
  },
] as const;

export function matchGoodsCategories(question: string) {
  return CATEGORY_RULES.filter((rule) =>
    rule.keywords.some((keyword) => question.includes(keyword)),
  )
    .slice(0, 4)
    .map(({ id, reason }) => ({ id, reason }));
}
