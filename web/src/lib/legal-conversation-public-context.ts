import {
  extractLegalConversationContext,
  sanitizeLegalConversationContext as sanitizeLegalConversationAnalysisContext,
  type LegalConversationContext as LegalConversationAnalysisContext,
  type LegalVoltageClass,
} from "@/lib/legal-conversation-context";
import type {
  ElectricalEnergizedState,
  ElectricalQualificationType,
  ElectricalRoleType,
  ElectricalWorkAction,
  LegalTopicDomain,
} from "@/lib/electrical-work-model";

/**
 * The complete and only context shape allowed to cross a browser/API boundary.
 * Free-form conversation text and identifying fields must never be added here.
 */
export type PublicLegalConversationContext = {
  topicDomain?: LegalTopicDomain;
  workAction?: ElectricalWorkAction;
  equipment?: string;
  voltageClass?: LegalVoltageClass;
  energizedState?: ElectricalEnergizedState;
  roleType?: PublicLegalRoleType;
  qualificationType?: ElectricalQualificationType;
  workDate?: string;
  confirmedChoices?: string[];
};

export type PublicLegalRoleType =
  | ElectricalRoleType
  | "operator"
  | "monitor";

export const PUBLIC_LEGAL_CONVERSATION_CONTEXT_KEYS = [
  "topicDomain",
  "workAction",
  "equipment",
  "voltageClass",
  "energizedState",
  "roleType",
  "qualificationType",
  "workDate",
  "confirmedChoices",
] as const satisfies readonly (keyof PublicLegalConversationContext)[];

const SAFE_LITERAL_CHOICES = new Set([
  "見るだけ",
  "盤を開けて測定",
  "配線・充電部を扱う",
  "盤内測定・配線",
  "配線工事",
  "充電部・近接作業",
  "操作・点検",
  "充電部分は露出していない",
  "充電部分が露出している",
  "配線非接触",
  "第1種",
  "第2種",
  "第3種",
  "タンク等の内部",
  "それ以外の屋内",
  "臨時作業",
  "短時間作業",
  "吹付け作業",
  "吹付け以外",
  "作業床あり",
  "作業床なし",
  "条件不明",
  "作業者の特別教育",
  "足場の作業主任者",
  "作業者の教育",
  "有機溶剤作業主任者",
  "換気・保護措置",
  "石綿作業主任者",
  "事前調査者",
  "建築物",
  "工作物",
  "船舶",
  "RA対象物を製造",
  "RA対象物を取り扱う",
  "譲渡・提供のみ",
  "クレーン",
  "移動式クレーン",
  "デリック",
  "床上操作式",
  "研削といし",
  "有機溶剤・シンナー",
  "その他の化学物質",
  "内容物不明",
  "テスター測定だけ",
  "配線接続・取り外し",
  "両方",
  "停電して配線接続・取り外し",
  "充電部に触れる",
  "充電部の近くで作業",
  "電線同士",
  "機器端子",
  "電圧が不明",
  "100・200Vの閉鎖型",
  "高圧盤",
  "露出型の開閉器",
  "停電して扱う",
  "高圧・特高の活線・近接",
  "どちらでもない",
  "盤外から見る",
  "充電中の盤内を測る",
  "充電中",
  "停電済み",
  "高圧設備",
  "低圧で停電済み",
  "100・200Vの低圧",
  "100・200Vを停電して作業",
  "高圧設備を停電して作業",
  "充電中に扱う",
]);

const SAFE_MEASURED_CHOICE =
  /^(?:高さ\d+(?:\.\d+)?(?:m|cm|mm|メートル|センチ(?:メートル)?|ミリ(?:メートル)?)(?:以上|以下|未満)?|(?:最大荷重|つり上げ荷重)\d+(?:\.\d+)?(?:t|kg|トン|キログラム)(?:以上|以下|未満)?)$/i;

const PUBLIC_CHOICE_LIMIT = 5;
const PUBLIC_ROLE_TYPES = new Set<PublicLegalRoleType>([
  "worker",
  "work-supervisor",
  "work-leader",
  "chief-electrical-engineer",
  "employer",
  "operator",
  "monitor",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isIsoCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function normalizedQualificationType(
  analysis: LegalConversationAnalysisContext,
): ElectricalQualificationType | undefined {
  if (analysis.qualification === "特別教育") return "special-education";
  if (analysis.qualification === "技能講習") return "skills-training";
  if (analysis.qualification === "作業主任者") return "work-supervisor";
  if (analysis.qualification === "免許") return "national-license";
  if (analysis.qualification === "資格") return "qualification-general";
  return analysis.qualificationType;
}

function normalizedRoleType(
  analysis: LegalConversationAnalysisContext,
): PublicLegalRoleType | undefined {
  if (analysis.roleType) return analysis.roleType;
  if (analysis.role === "作業主任者") return "work-supervisor";
  if (analysis.role === "作業指揮者") return "work-leader";
  if (analysis.role === "事業者") return "employer";
  if (analysis.role === "運転者") return "operator";
  if (analysis.role === "監視人") return "monitor";
  if (analysis.role === "作業者") return "worker";
  return undefined;
}

function publicEquipment(
  analysis: LegalConversationAnalysisContext,
): string | undefined {
  // For non-electrical topics the old workType is an allowlisted taxonomy
  // value and carries the important subtype (for example 玉掛け versus
  // 移動式クレーン). It is safe to retain as the structured equipment label.
  if (analysis.topicDomain && analysis.topicDomain !== "electrical") {
    return analysis.workType ?? analysis.equipment;
  }
  return analysis.equipment ?? analysis.workType;
}

function safeConfirmedChoices(
  value: unknown,
  analysis: LegalConversationAnalysisContext,
): string[] | undefined {
  const record = isRecord(value) ? value : {};
  const candidates = [
    ...(analysis.confirmedChoices ?? []),
    ...(Array.isArray(record.confirmedChoices)
      ? record.confirmedChoices.filter(
          (choice): choice is string => typeof choice === "string",
        )
      : []),
    ...(analysis.height ? [`高さ${analysis.height}`] : []),
    ...(analysis.load ? [analysis.load] : []),
  ];
  const safe = candidates
    .map((choice) => choice.normalize("NFKC").trim())
    .filter(
      (choice, index, values) =>
        (SAFE_LITERAL_CHOICES.has(choice) || SAFE_MEASURED_CHOICE.test(choice)) &&
        values.indexOf(choice) === index,
    )
    .slice(-PUBLIC_CHOICE_LIMIT);
  return safe.length > 0 ? safe : undefined;
}

function legacyQualification(
  value: ElectricalQualificationType | undefined,
): string | undefined {
  if (value === "special-education") return "特別教育";
  if (value === "skills-training") return "技能講習";
  if (value === "work-supervisor") return "作業主任者";
  if (value === "national-license") return "免許";
  if (value === "qualification-general") return "資格";
  return undefined;
}

function legacyRole(value: PublicLegalRoleType | undefined): string | undefined {
  if (value === "work-supervisor") return "作業主任者";
  if (value === "work-leader") return "作業指揮者";
  if (value === "employer") return "事業者";
  if (value === "operator") return "運転者";
  if (value === "monitor") return "監視人";
  if (value === "worker") return "作業者";
  return undefined;
}

/**
 * Project legacy or server-local analysis into the nine-key public contract.
 * The legacy sanitizer first reconstructs values from its closed taxonomy, so
 * an arbitrary incoming workType/equipment string cannot be reflected.
 */
export function sanitizePublicLegalConversationContext(
  value: unknown,
): PublicLegalConversationContext {
  if (!isRecord(value)) return {};
  const analysis = sanitizeLegalConversationAnalysisContext(
    value as LegalConversationAnalysisContext,
  );
  const directRoleType =
    typeof value.roleType === "string" &&
    PUBLIC_ROLE_TYPES.has(value.roleType as PublicLegalRoleType)
      ? (value.roleType as PublicLegalRoleType)
      : undefined;
  const workDateCandidate = analysis.workDate ?? analysis.targetDate;
  const confirmedChoices = safeConfirmedChoices(value, analysis);
  const result: PublicLegalConversationContext = {
    ...(analysis.topicDomain ? { topicDomain: analysis.topicDomain } : {}),
    ...(analysis.workAction ? { workAction: analysis.workAction } : {}),
    ...(publicEquipment(analysis)
      ? { equipment: publicEquipment(analysis) }
      : {}),
    ...(analysis.voltageClass
      ? { voltageClass: analysis.voltageClass }
      : {}),
    ...(analysis.energizedState
      ? { energizedState: analysis.energizedState }
      : {}),
    ...(directRoleType ?? normalizedRoleType(analysis)
      ? { roleType: directRoleType ?? normalizedRoleType(analysis) }
      : {}),
    ...(normalizedQualificationType(analysis)
      ? { qualificationType: normalizedQualificationType(analysis) }
      : {}),
    ...(isIsoCalendarDate(workDateCandidate)
      ? { workDate: workDateCandidate }
      : {}),
    ...(confirmedChoices ? { confirmedChoices } : {}),
  };
  return result;
}

/**
 * Rehydrate a public context for one server turn. Rich fields remain local and
 * are projected away again before the response leaves the server.
 */
export function rehydratePublicLegalConversationContext(
  value: unknown,
): LegalConversationAnalysisContext {
  const publicContext = sanitizePublicLegalConversationContext(value);
  const measuredChoices = publicContext.confirmedChoices ?? [];
  const height = measuredChoices
    .find((choice) => choice.startsWith("高さ"))
    ?.replace(/^高さ/, "");
  const load = measuredChoices.find((choice) =>
    /^(?:最大荷重|つり上げ荷重)/.test(choice),
  );
  const topicText = [
    publicContext.equipment,
    ...(publicContext.confirmedChoices ?? []),
  ]
    .filter(Boolean)
    .join(" ");
  const inferred = topicText
    ? extractLegalConversationContext(topicText)
    : ({} satisfies LegalConversationAnalysisContext);
  const {
    confirmedChoices: _publicChoices,
    roleType: _publicRoleType,
    equipment: _publicEquipment,
    ...publicFields
  } = publicContext;

  return sanitizeLegalConversationAnalysisContext({
    ...inferred,
    ...publicFields,
    ...(inferred.equipment ?? _publicEquipment
      ? { equipment: inferred.equipment ?? _publicEquipment }
      : {}),
    ...(publicContext.confirmedChoices
      ? {
          confirmedChoices:
            publicContext.confirmedChoices as LegalConversationAnalysisContext["confirmedChoices"],
        }
      : {}),
    ...(legacyQualification(publicContext.qualificationType)
      ? {
          qualification: legacyQualification(
            publicContext.qualificationType,
          ),
        }
      : {}),
    ...(legacyRole(publicContext.roleType)
      ? { role: legacyRole(publicContext.roleType) }
      : {}),
    ...(height ? { height } : {}),
    ...(load ? { load } : {}),
    ...(publicContext.workDate
      ? { targetDate: publicContext.workDate, workDate: publicContext.workDate }
      : {}),
  });
}

export function hasPublicLegalConversationContext(value: unknown): boolean {
  return Object.keys(sanitizePublicLegalConversationContext(value)).length > 0;
}
