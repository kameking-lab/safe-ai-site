import { KY_INDUSTRY_PRESETS, type KyIndustryPreset } from "@/data/mock/ky-industry-presets";

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
  /** 業種プリセットID（指定時はそのプリセットの危険源・対策を優先利用） */
  industryId?: string;
};

/**
 * 作業文脈・業種IDから最適な業種プリセットを推定する。
 * industryId が一致 > キーワードマッチ > デフォルト の順で選定。
 */
const INDUSTRY_KEYWORDS: Record<string, string[]> = {
  construction: ["建設", "鉄骨", "型枠", "足場", "解体", "コンクリート", "高所", "土工"],
  manufacturing: ["製造", "プレス", "工場", "組立", "溶接", "機械整備", "ライン"],
  medical: ["医療", "看護", "病院", "注射", "採血", "院内"],
  "care-facility": ["特養", "デイ", "グループホーム", "介護施設", "夜勤", "認知症"],
  homecare: ["訪問介護", "訪問看護", "ヘルパー", "在宅"],
  transport: ["運輸", "トラック", "物流", "倉庫", "荷役", "長距離"],
  forestry: ["林業", "伐採", "チェーンソー", "下刈り"],
  food: ["食品", "厨房", "スライサー", "冷凍庫", "フライヤー"],
  retail: ["小売", "店舗", "品出し", "レジ"],
  ladder: ["脚立", "はしご", "天井", "電球交換"],
  cleaning: ["清掃", "ビル", "ガラス", "薬品", "汚物"],
};

function pickPreset(input: { industryId?: string; workContext: string }): KyIndustryPreset | undefined {
  if (input.industryId) {
    const byId = KY_INDUSTRY_PRESETS.find((p) => p.id === input.industryId);
    if (byId) return byId;
  }
  const ctx = input.workContext || "";
  for (const [id, keywords] of Object.entries(INDUSTRY_KEYWORDS)) {
    if (keywords.some((k) => ctx.includes(k))) {
      const found = KY_INDUSTRY_PRESETS.find((p) => p.id === id);
      if (found) return found;
    }
  }
  return undefined;
}

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
  const pick = <T,>(arr: T[]): T => arr[seed % arr.length]!;
  const preset = pickPreset(input);

  if (input.field === "hazard") {
    // 業種プリセットがマッチした場合は、そのプリセットの危険源を優先利用（精度向上）
    if (preset && preset.risks.length > 0) {
      const risk = pick(preset.risks);
      return `【${input.targetLabel}】${risk.hazard}\n（業種プリセット「${preset.label}」より自動生成）\n作業文脈: ${ctx}\n※現場の実状に合わせて加筆・削除してください。`;
    }
    const base = pick(HAZARDS);
    return `【${input.targetLabel}】${base}\n作業文脈: ${ctx}\n※現場の実状に合わせて加筆・削除してください。`;
  }
  if (input.field === "reduction") {
    const hz = (input.hazardSoFar || "（危険未入力）").slice(0, 200);
    const ev = (input.likelihood ?? 1) * (input.severity ?? 1);
    // 業種プリセットの危険源と入力された危険のキーワード一致で対策を選ぶ（精度向上）
    if (preset) {
      const matched = preset.risks.find((r) =>
        r.hazard.split(/[、・,（）()\s]/).some((kw) => kw.length >= 2 && hz.includes(kw))
      );
      if (matched) {
        return `評価値${ev}を踏まえた低減案（業種プリセット「${preset.label}」より）:\n${matched.reduction}\n対象リスク要約: ${hz}\n※実施責任者・期限を追記してください。`;
      }
    }
    return `評価値${ev}を踏まえた低減案（案）:\n${pick(REDUCTIONS)}\n対象リスク要約: ${hz}\n※実施責任者・期限を追記してください。`;
  }
  return `再評価後の追加・見直し（案）:\n${pick(REREDUCTIONS)}\n既存対策: ${(input.reductionSoFar || "").slice(0, 160)}\n再評価: L${input.reLikelihood ?? 1}×S${input.reSeverity ?? 1}`;
}

// ────────────────────────────────────────────────────────────
// リスクアセスメント表の自動生成（複数行を一括生成）
// ────────────────────────────────────────────────────────────

export type GeneratedRiskRow = {
  hazard: string;
  reduction: string;
  likelihood: number;
  severity: number;
  evaluation: number;
};

/** 業種プリセットまたはキーワードマッチから3〜5行のリスクアセスメント表を生成 */
export function buildRiskAssessmentTable(input: { workContext: string; industryId?: string }): {
  rows: GeneratedRiskRow[];
  presetLabel?: string;
} {
  const preset = pickPreset(input);
  if (!preset) {
    return {
      rows: HAZARDS.slice(0, 3).map((h, i) => ({
        hazard: h,
        reduction: REDUCTIONS[i % REDUCTIONS.length]!,
        likelihood: 2,
        severity: 2,
        evaluation: 4,
      })),
    };
  }
  const rows: GeneratedRiskRow[] = preset.risks.map((r) => {
    // ハザードの種類（高所・はさまれ・熱・薬品）から重大性をヒューリスティックに推定
    const severity = /墜落|転落|爆発|火災|感電|溶融|窒息/.test(r.hazard) ? 3 : 2;
    const likelihood = /密閉|閉鎖|常時|頻繁/.test(r.hazard) ? 3 : 2;
    return {
      hazard: r.hazard,
      reduction: r.reduction,
      likelihood,
      severity,
      evaluation: likelihood * severity,
    };
  });
  return { rows: rows.slice(0, 5), presetLabel: preset.label };
}
