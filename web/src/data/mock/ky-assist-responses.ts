export type KyAssistField = "hazard" | "reduction" | "rereduction";

type KyAssistInput = {
  field: KyAssistField;
  targetLabel: string;
  workContext: string;
  hazardSoFar?: string;
  reductionSoFar?: string;
  likelihood?: number;
  severity?: number;
  reLikelihood?: number;
  reSeverity?: number;
  seed?: number;
};

function hashSeed(s: string, n: number) {
  let h = n;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

const HAZARDS = [
  "墜落・転落（手すり未設置・開口部・足場端部）",
  "飛来・落下（吊り荷・工具・資材の落下）",
  "挟まれ・巻き込まれ（回転体・コンベヤ・クレーン旋回部）",
  "感電（活線近接・誤復電・検電省略）",
  "倒壊・崩落（仮設・地山・解体順序）",
  "火災・爆燃（火気・溶接・粉じん）",
  "車両接触（重機バック・誘導死角）",
  "酸欠・硫化水素等（タンク・マンホール・地下）",
];

const REDUCTIONS = [
  "墜落制止用器具の常時接続と親綱・ランヤードの点検を実施する。",
  "吊り荷下立入禁止・合図者配置と介入距離の確保を徹底する。",
  "ロックアウト・タグアウトと検電記録を必須化し復電は責任者確認後のみ。",
  "作業前に仮設・地山の異常有無を写真付きで共有し異常時は作業停止する。",
  "火気作業許可・消火器配置・不燃シート敷設と監視者を常時配置する。",
  "誘導者と機械の可視合図を統一し死角区域に立入禁止ラインを引く。",
  "換気・測定・入退場管理を標準手順化し単独作業を禁止する。",
];

const REREDUCTIONS = [
  "対策後も評価が高い場合は工程分割・人員追加・監督者立会いで再検討する。",
  "朝礼で当該リスクを指差呼称し、当日の気象・体調変化で再評価する。",
  "中間点検で手すり・ランヤード接続の抜取り確認を実施する。",
];

export function buildKyAssistText(input: KyAssistInput): string {
  const ctx = (input.workContext || "（作業内容未入力）").slice(0, 400);
  const seed = hashSeed(ctx + input.targetLabel, input.seed ?? 0);
  const pick = (arr: string[]) => arr[seed % arr.length]!;

  if (input.field === "hazard") {
    const base = pick(HAZARDS);
    return `【${input.targetLabel}】${base}\n作業文脈: ${ctx}\n※現場の実状に合わせて加筆・削除してください。`;
  }
  if (input.field === "reduction") {
    const hz = (input.hazardSoFar || "（危険未入力）").slice(0, 200);
    const ev = (input.likelihood ?? 1) * (input.severity ?? 1);
    return `評価値${ev}を踏まえた低減案（案）:\n${pick(REDUCTIONS)}\n対象リスク要約: ${hz}\n※実施責任者・期限を追記してください。`;
  }
  return `再評価後の追加・見直し（案）:\n${pick(REREDUCTIONS)}\n既存対策: ${(input.reductionSoFar || "").slice(0, 160)}\n再評価: L${input.reLikelihood ?? 1}×S${input.reSeverity ?? 1}`;
}
