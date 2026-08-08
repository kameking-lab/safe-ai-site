import {
  requestedLegalPeriod,
  type LegalDatePrecision,
} from "@/lib/legal-answer-temporal";

export type LegalConversationTurn = {
  role: "user" | "assistant";
  content: string;
};

export type LegalVoltageClass = "低圧" | "高圧" | "特別高圧";

const ELECTRICAL_WORK_CHOICES = [
  "配線工事",
  "充電部・近接作業",
  "操作・点検",
] as const;

const SAFE_LEGAL_CONFIRMED_CHOICES = [
  ...ELECTRICAL_WORK_CHOICES,
  "第1種",
  "第2種",
  "第3種",
  "タンク等の内部",
  "それ以外の屋内",
  "臨時作業",
  "短時間作業",
  "吹付け作業",
  "吹付け以外",
] as const;

const SAFE_CONFIRMED_CHOICE_LIMIT = 5;

export type LegalConfirmedChoice =
  (typeof SAFE_LEGAL_CONFIRMED_CHOICES)[number];

type LegalConfirmedChoiceSlot =
  "electricalWork" | "solventClass" | "workPattern" | "location" | "workMethod";

function confirmedChoiceSlot(
  choice: LegalConfirmedChoice,
): LegalConfirmedChoiceSlot {
  if (
    ELECTRICAL_WORK_CHOICES.includes(
      choice as (typeof ELECTRICAL_WORK_CHOICES)[number],
    )
  ) {
    return "electricalWork";
  }
  if (choice === "第1種" || choice === "第2種" || choice === "第3種") {
    return "solventClass";
  }
  if (choice === "臨時作業" || choice === "短時間作業") {
    return "workPattern";
  }
  if (choice === "吹付け作業" || choice === "吹付け以外") {
    return "workMethod";
  }
  return "location";
}

function latestConfirmedChoices(
  choices: readonly LegalConfirmedChoice[],
): LegalConfirmedChoice[] {
  const latest = new Map<LegalConfirmedChoiceSlot, LegalConfirmedChoice>();
  for (const choice of choices) {
    if (!SAFE_LEGAL_CONFIRMED_CHOICES.includes(choice)) continue;
    latest.set(confirmedChoiceSlot(choice), choice);
  }
  return [...latest.values()].slice(-SAFE_CONFIRMED_CHOICE_LIMIT);
}

export type LegalConversationContext = {
  workType?: string;
  equipment?: string;
  height?: string;
  load?: string;
  voltageClass?: LegalVoltageClass;
  qualification?: string;
  role?: string;
  targetDate?: string;
  targetDateEnd?: string;
  targetDatePrecision?: LegalDatePrecision;
  confirmedChoices?: LegalConfirmedChoice[];
};

export type LegalClarification = {
  question: string;
  options: string[];
};

export const DEFAULT_LEGAL_CLARIFICATION: LegalClarification = {
  question: "判断に必要な作業条件を一つ教えてください。",
  options: [],
};
const SAFETY_MANAGER_WORK_TYPE = "労働安全衛生法 安全管理者の選任義務";

const TOPICS: Array<{
  pattern: RegExp;
  workType: string;
  equipment?: string;
}> = [
  {
    pattern: /(?:電気作業|電気工事|電気設備|配線工事|活線作業|充電部|電路)/,
    workType: "電気作業",
    equipment: "電気設備",
  },
  {
    pattern: /フォー?クリフト/i,
    workType: "フォークリフト運転",
    equipment: "フォークリフト",
  },
  { pattern: /玉掛(?:け)?/, workType: "玉掛け", equipment: "クレーン等" },
  {
    pattern: /移動式クレーン/,
    workType: "移動式クレーン運転",
    equipment: "移動式クレーン",
  },
  {
    pattern: /高所作業車/,
    workType: "高所作業車運転",
    equipment: "高所作業車",
  },
  { pattern: /(?:足場|あしば)/, workType: "足場作業", equipment: "足場" },
  {
    pattern: /(?:開口部|作業床)/,
    workType: "墜落防止",
    equipment: "作業床・開口部",
  },
  {
    pattern: /(?:フルハーネス|墜落制止用器具|安全帯)/,
    workType: "墜落制止用器具使用",
    equipment: "墜落制止用器具",
  },
  { pattern: /脚立/, workType: "脚立作業", equipment: "脚立" },
  { pattern: /(?:はしご|梯子)/, workType: "はしご作業", equipment: "はしご" },
  { pattern: /作業台/, workType: "作業台作業", equipment: "作業台" },
  {
    pattern:
      /(?:(?:第二種|第2種).*(?:酸欠|酸素欠乏)|(?:酸欠|酸素欠乏).*(?:第二種|第2種))/,
    workType: "第二種酸素欠乏危険作業",
    equipment: "酸欠危険場所",
  },
  {
    pattern:
      /(?:(?:第一種|第1種).*(?:酸欠|酸素欠乏)|(?:酸欠|酸素欠乏).*(?:第一種|第1種))/,
    workType: "第一種酸素欠乏危険作業",
    equipment: "酸欠危険場所",
  },
  {
    pattern: /(?:酸欠|酸素欠乏)/,
    workType: "酸素欠乏危険作業",
    equipment: "酸欠危険場所",
  },
  {
    pattern: /(?=.*(?:有機溶剤|有機則|シンナー))(?=.*屋内)/,
    workType: "屋内有機溶剤業務",
    equipment: "有機溶剤",
  },
  {
    pattern:
      /(?:(?:有機溶剤|有機則|シンナー).*(?:健診|健康診断)|(?:健診|健康診断).*(?:有機溶剤|有機則|シンナー))/,
    workType: "有機溶剤健康診断",
    equipment: "有機溶剤",
  },
  {
    pattern: /(?:有機溶剤|有機則|シンナー)/,
    workType: "有機溶剤業務",
    equipment: "有機溶剤",
  },
  {
    pattern: /(?:石綿|アスベスト)/,
    workType: "石綿作業",
    equipment: "石綿含有建材",
  },
  {
    pattern: /(?=.*(?:熱中症|暑熱|WBGT))(?=.*(?:報告|連絡))/i,
    workType: "暑熱作業の報告体制",
  },
  { pattern: /(?:熱中症|暑熱|WBGT)/i, workType: "暑熱作業" },
  {
    pattern:
      /(?=.*(?:労働者死傷病報告|死傷病報告|労災事故|労働災害|休業災害))(?=.*休業(?:4|四)日)/,
    workType: "休業4日以上の労働者死傷病報告",
  },
  {
    pattern:
      /(?=.*(?:労働者死傷病報告|死傷病報告|労災事故|労働災害|休業災害))(?=.*(?:休業(?:1|2|3|一|二|三)日|休業1日(?:から|～|〜|-)3日))/,
    workType: "休業4日未満の労働者死傷病報告",
  },
  {
    pattern:
      /(?:労働者死傷病報告|死傷病報告|(?:労災事故|労働災害|休業災害).*(?:報告|提出|届出))/,
    workType: "労働者死傷病報告",
  },
  {
    pattern: /(?:局所排気|局排)/,
    workType: "局所排気装置の使用",
    equipment: "局所排気装置",
  },
  { pattern: /(?:ボイラー|圧力容器)/, workType: "ボイラー・圧力容器取扱い" },
  {
    pattern: /(?:薬品|化学物質).*(?:危険性評価|リスクアセスメント|RA)/i,
    workType: "化学物質リスクアセスメント",
    equipment: "化学物質",
  },
  { pattern: /クレーン/, workType: "クレーン作業", equipment: "クレーン" },
  { pattern: /安全管理者/, workType: SAFETY_MANAGER_WORK_TYPE },
];

const QUALIFICATIONS: Array<{ pattern: RegExp; value: string }> = [
  { pattern: /技能講習/, value: "技能講習" },
  { pattern: /特別教育/, value: "特別教育" },
  { pattern: /作業主任者/, value: "作業主任者" },
  { pattern: /(?:免許|資格)/, value: "資格" },
];

const ROLES: Array<{ pattern: RegExp; value: string }> = [
  { pattern: /(?:運転者|オペレーター)/, value: "運転者" },
  { pattern: /作業指揮者/, value: "作業指揮者" },
  { pattern: /(?:作業主任者|主任者)/, value: "作業主任者" },
  { pattern: /(?:監視人|監視者)/, value: "監視人" },
  { pattern: /(?:事業者|会社側)/, value: "事業者" },
  { pattern: /(?:労働者|作業員|作業者)/, value: "作業者" },
];

const CONTEXT_DEPENDENT =
  /^(?:はい|いいえ|不明|分からない|わからない|それ|その場合|この場合|先ほど|さっき|前の質問|上記|(?:それの)?根拠|条件|詳しく|対象|理由|なぜ|いつ|例外|(?:約)?\d+(?:\.\d+)?(?:m|cm|mm|t|kg|メートル|センチ|ミリ|トン)(?:以上|以下|未満)?)(?:です|ですか|なら|の場合|について|を|は|で|$)/i;

const CONDITION_FOLLOWUP =
  /^(?=.*(?:低圧|高圧|特別高圧|配線|充電部|近接|操作|点検|第[123一二三]種|タンク|屋内|臨時|短時間|吹付け|建築物|工作物|船舶|作業床|最大荷重|つり上げ荷重|高さ|SDS|対象物|自主検査|建設業|常時\d+人|\d+(?:\.\d+)?(?:m|cm|mm|t|kg|メートル|センチ|ミリ|トン))).*(?:です|使います|再開します|についてです|聞いています|前です|入ります|の場合)[。.!！]?$|^(?:作業床あり|作業床なし|条件不明)$/i;

const QUALIFICATION_ONLY_FOLLOWUP =
  /^(?:作業主任者|主任者|資格|免許|技能講習|特別教育|教育)(?:について|は|です|ですか|が必要|いる|要る)?[。?？!！]?$/;

const UNIVERSAL_CONTEXT_FOLLOWUP =
  /^(?:(?:どの)?(?:通達|指針|ガイドライン|告示|判例)|(?:それの)?根拠|法律|条文|何条|何項|何号|公式原文|施行日|適用日|いつから|条件|例外)(?:は|について|です|ですか|なの)?$/;

const REPORT_RECIPIENT_FOLLOWUP =
  /^(?:(?:その)?(?:報告|連絡)(?:先)?(?:は|を)?(?:誰|どこ)(?:に|へ)?(?:報告|連絡)?(?:するの|する|しますか|します|すればいい|すべき|なの|ですか|か)?|(?:誰|どこ)(?:に|へ)(?:報告|連絡)(?:するの|する|しますか|します|すればいい|すべき|なの|ですか|か)?|(?:報告|連絡)先(?:は|が)?(?:誰|どこ)(?:ですか|なの|か)?)$/;

const ANAPHORIC_LEGAL_SUBJECT =
  "報告|連絡|点検|検査|記録|保存|資格|免許|技能講習|特別教育|教育|講習|講師|受講|更新|対象";
const ANAPHORIC_LEGAL_ACTION =
  "報告|連絡|点検|検査|記録|保存|残す|保管|受講|受け|教え|実施|行う|担当|更新|提出|届出|届け出|選任|有効|使用|対象";
const ANAPHORIC_SUBJECT_ONLY = new RegExp(
  `^(?:その|この)(?:${ANAPHORIC_LEGAL_SUBJECT})(?:先|期限|有効期間|結果)?(?:は|を|が)?$`,
);
const ANAPHORIC_WH_ONLY =
  /^(?:(?:誰|どこ)(?:が|を|に|へ)?|いつ(?:まで)?(?:に)?)$/;
const ANAPHORIC_WH_ACTION = new RegExp(
  `^(?:誰|どこ|いつ(?:まで)?|何年|何日|どのくらい)(?:が|を|に|へ)?(?:${ANAPHORIC_LEGAL_ACTION})(?:する|します|した|る|行う|使える|必要)?(?:の|なの|ですか|ますか|ればいい|べき|か)?$`,
);
const ANAPHORIC_SUBJECT_WH = new RegExp(
  `^(?:その|この)?(?:${ANAPHORIC_LEGAL_SUBJECT})(?:先|期限|有効期間|結果)?(?:は|を|が)?(?:誰|どこ|いつ|いつまで|何年|何日|どのくらい)(?:が|を|に|へ)?(?:${ANAPHORIC_LEGAL_ACTION})?(?:する|します|した|る|行う|使える|必要)?(?:の|なの|ですか|ますか|ればいい|べき|か)?$`,
);
const ANAPHORIC_SUBJECT_ACTION = new RegExp(
  `^(?:その|この)(?:${ANAPHORIC_LEGAL_SUBJECT})(?:先|期限|有効期間|結果)?(?:は|を|が)?(?:${ANAPHORIC_LEGAL_ACTION})(?:する|します|した|る|行う|使える|必要|が必要|しなければならない)?(?:の|なの|ですか|ますか|ればいい|べき|か)?$`,
);

const OPEN_CLARIFICATION_CONDITION_ANSWER = /(?:です|ます)[。.!！]?$/;

function isTopicAspectFollowup(
  value: string,
  previousContext: LegalConversationContext,
): boolean {
  if (isAnaphoricLegalFollowup(value)) return true;
  const workType = previousContext.workType ?? "";
  const equipment = previousContext.equipment ?? "";
  if (
    /^(?:特別教育|技能講習)$/.test(previousContext.qualification ?? "") &&
    /^(?:(?:(?:作業|業務|従事)(?:開始)?前に?|開始前に?|事前に?|先に|あらかじめ|いつ(?:まで)?(?:に)?|誰(?:が|に)?|どの人(?:が)?)(?:その)?(?:教育|講習)?(?:を)?(?:受け|受講)(?:る|ます|た|れば|る必要がある|が必要|しなければならない)?|(?:その)?(?:教育|講習|受講)(?:は|を)?(?:作業|業務|従事)(?:開始)?前(?:です|なの|か|ですか)?|(?:作業|業務|従事)(?:を)?始める前(?:です|なの|か|ですか)?)(?:の|なの|ですか|ますか|か)?$/.test(
      value,
    )
  ) {
    return true;
  }
  if (
    /暑熱/.test(workType) &&
    (/^(?:体調悪化時の)?(?:報告体制|悪化防止(?:手順)?|実施手順)(?:は|について|についてです|ですか)?$/.test(
      value,
    ) ||
      REPORT_RECIPIENT_FOLLOWUP.test(value))
  ) {
    return true;
  }
  if (
    /有機溶剤/.test(workType) &&
    /^(?:換気|測定|記録|保存|点検)(?:は|について|ですか)?$/.test(value)
  ) {
    return true;
  }
  if (
    /酸素欠乏/.test(workType) &&
    /^(?:換気|測定|記録|保存|監視|点検)(?:は|について|ですか)?$/.test(value)
  ) {
    return true;
  }
  if (
    /(?:足場|墜落防止)/.test(workType) &&
    /^(?:点検|養生)(?:は|について|ですか)?$/.test(value)
  ) {
    return true;
  }
  if (
    /足場/.test(workType) &&
    /^(?:強風|悪天候|大雨|大雪|地震)(?:の)?後(?:に)?(?:再開|点検)(?:します|する|は|について|ですか)?$/.test(
      value,
    )
  ) {
    return true;
  }
  if (
    /フォークリフト/.test(`${workType} ${equipment}`) &&
    /^(?:運転|操作|点検)(?:は|について|ですか)?$/.test(value)
  ) {
    return true;
  }
  if (
    /高所作業車/.test(`${workType} ${equipment}`) &&
    /^(?:(?:作業床|バスケット(?:内)?)(?:で|の)?(?:安全帯|フルハーネス|ハーネス|墜落制止用器具)?|(?:安全帯|フルハーネス|ハーネス|墜落制止用器具))(?:は|を|は必要|が必要|必要|はいる|いる|要る|使う|使用|着用|について|ですか)?$/.test(
      value,
    )
  ) {
    return true;
  }
  return (
    /電気/.test(workType) &&
    /^(?:運転|操作|点検|作業指揮者|指揮者)(?:は|について|ですか)?$/.test(value)
  );
}

function legalTopicFamily(workType: string | undefined): string | undefined {
  if (!workType) return undefined;
  if (/電気/.test(workType)) return "electric";
  if (/有機溶剤/.test(workType)) return "organic";
  if (/石綿/.test(workType)) return "asbestos";
  if (/墜落|足場|脚立|はしご|作業台/.test(workType)) return "fall";
  if (/クレーン|玉掛/.test(workType)) return "lifting";
  return workType;
}

function isCompatibleRoleOrTrainingFollowup(
  current: LegalConversationContext,
  previous: LegalConversationContext,
): boolean {
  if (current.workType || current.equipment) return true;
  const priorTopic = `${previous.workType ?? ""} ${previous.equipment ?? ""}`;

  if (current.role === "作業主任者") {
    return /電気|酸素欠乏|有機溶剤|石綿|足場|ボイラー|圧力容器|化学物質/.test(
      priorTopic,
    );
  }
  if (current.role === "監視人") return /酸素欠乏/.test(priorTopic);
  if (current.role === "作業指揮者") {
    return /電気|フォークリフト|車両系荷役運搬/.test(priorTopic);
  }
  return true;
}

export function normalizeLegalConversationText(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/あしば/g, "足場")
    .replace(/(?:手摺り?|てすり)/g, "手すり")
    .replace(/フォーク(?!リフト)/g, "フォークリフト")
    .replace(/フォ(?:ー)?クリ(?:フ)?[ト卜]/g, "フォークリフト")
    .replace(/しかく/g, "資格")
    .replace(/(?:^|[^ア])スベスト/g, (matched) =>
      matched.endsWith("スベスト")
        ? `${matched.slice(0, -4)}アスベスト`
        : matched,
    )
    .replace(/せきめん/g, "石綿")
    .replace(/(?:ふる|フル)\s*ハーネス/g, "フルハーネス")
    .replace(/玉かけ/g, "玉掛け")
    .replace(/有機ようざい/g, "有機溶剤")
    .replace(/ていき健診/g, "定期健診")
    .replace(/(?:こうしょ作業車|高作車)/g, "高所作業車")
    .replace(/高所作業者/g, "高所作業車")
    .replace(/特別教いく/g, "特別教育")
    .replace(/点険/g, "点検")
    .replace(/酸素(?:が)?(?:うすい|薄い)(?:所|ところ|場所)?/g, "酸素欠乏場所")
    .replace(/(?:見張る人|見張り役|見張り)/g, "監視人")
    .replace(/\s+/g, " ")
    .trim();
}

/** End an unknown-load quick reply with a concrete next action, not the same chips. */
export function buildUnknownLoadConditionHold(value: string): string | null {
  const text = normalizeLegalConversationText(value);
  if (!/(?:分からない|わからない|不明|確認できない)/.test(text)) {
    return null;
  }
  if (
    /フォークリフト/.test(text) &&
    /(?:資格|免許|技能講習|特別教育)/.test(text)
  ) {
    return [
      "結論",
      "最大荷重が分からないため、資格区分はまだ確定できません。",
      "",
      "次の行動",
      "車体銘板または仕様書の「最大荷重」を確認してください。",
      "",
      "次の質問",
      "確認できた最大荷重をトンで入力してください。",
    ].join("\n");
  }
  if (
    /(?:玉掛|移動式クレーン)/.test(text) &&
    /(?:資格|免許|技能講習|特別教育)/.test(text)
  ) {
    return [
      "結論",
      "つり上げ荷重が分からないため、資格区分はまだ確定できません。",
      "",
      "次の行動",
      "機械の銘板または仕様書の「つり上げ荷重」を確認してください。",
      "",
      "次の質問",
      "確認できたつり上げ荷重をトンで入力してください。",
    ].join("\n");
  }
  return null;
}

const normalize = normalizeLegalConversationText;

export function isAnaphoricLegalFollowup(value: string): boolean {
  const compact = normalize(value).replace(/[\s　、。,.!?！？]/g, "");
  return (
    ANAPHORIC_SUBJECT_ONLY.test(compact) ||
    ANAPHORIC_SUBJECT_ACTION.test(compact) ||
    ANAPHORIC_WH_ONLY.test(compact) ||
    ANAPHORIC_WH_ACTION.test(compact) ||
    ANAPHORIC_SUBJECT_WH.test(compact)
  );
}

function firstMatchValue(
  text: string,
  values: Array<{ pattern: RegExp; value: string }>,
): string | undefined {
  return values.find(({ pattern }) => pattern.test(text))?.value;
}

function normalizeNumber(value: string): string {
  const table: Record<string, string> = {
    〇: "0",
    一: "1",
    二: "2",
    三: "3",
    四: "4",
    五: "5",
    六: "6",
    七: "7",
    八: "8",
    九: "9",
    十: "10",
  };
  return table[value] ?? value;
}

function extractVoltageClass(
  text: string,
  hasElectricalTopic: boolean,
): LegalVoltageClass | undefined {
  if (
    !hasElectricalTopic &&
    !/^(?:低圧|高圧|特別高圧|特高)(?:です|の場合|について)?[。.!！]?$/.test(
      text,
    )
  ) {
    return undefined;
  }
  if (/(?:特別高圧|特高)/.test(text)) return "特別高圧";
  if (/高圧/.test(text)) return "高圧";
  if (/低圧/.test(text)) return "低圧";
  return undefined;
}

/** Extract only allowlisted, non-identifying work conditions. */
export function extractLegalConversationContext(
  value: string,
): LegalConversationContext {
  const text = normalize(value);
  const inferredTopic = TOPICS.find(({ pattern }) => pattern.test(text));
  // 「作業床なし」「作業床を設けにくい」は、直前の墜落制止用器具の
  // 確認に対する条件であり、新しい「開口部・作業床」の相談ではない。
  const conditionOnlyWorkFloor =
    inferredTopic?.workType === "墜落防止" &&
    /作業床/.test(text) &&
    /(?:あり|なし|設け(?:る|られ|にく|ることが困難)|困難)/.test(text) &&
    !/(?:開口部|囲い|手すり|覆い|養生)/.test(text);
  const topic = conditionOnlyWorkFloor ? undefined : inferredTopic;
  const heightMatch = text.match(
    /(?:高さ(?:は|が|約)?\s*)?(\d+(?:\.\d+)?|[〇一二三四五六七八九十])\s*(m|cm|mm|メートル|センチ(?:メートル)?|ミリ(?:メートル)?)(以上|以下|未満)?/i,
  );
  const loadMatch = text.match(
    /(?:(最大荷重|つり上げ荷重|吊り上げ荷重|積載荷重)(?:は|が|約)?\s*)?(\d+(?:\.\d+)?|[〇一二三四五六七八九十])\s*(t|kg|トン|キログラム)(以上|以下|未満)?/i,
  );
  const targetPeriod = requestedLegalPeriod(text);

  const height = heightMatch
    ? `${normalizeNumber(heightMatch[1]!)}${heightMatch[2]}${heightMatch[3] ?? ""}`
    : undefined;
  const loadKind =
    loadMatch?.[1] ??
    (topic?.equipment === "フォークリフト" ? "最大荷重" : "つり上げ荷重");
  const load = loadMatch
    ? `${loadKind}${normalizeNumber(loadMatch[2]!)}${loadMatch[3]}${loadMatch[4] ?? ""}`
    : undefined;

  const qualification =
    firstMatchValue(text, QUALIFICATIONS) ??
    (/酸素欠乏危険作業/.test(topic?.workType ?? "") &&
    /(?:酸欠則|酸素欠乏症等防止規則)?第?12条/.test(text)
      ? "特別教育"
      : undefined) ??
    (topic?.equipment === "墜落制止用器具" && /教育/.test(text)
      ? "特別教育"
      : undefined);
  const confirmedChoices = SAFE_LEGAL_CONFIRMED_CHOICES.filter((choice) =>
    text.includes(choice),
  );
  if (/臨時/.test(text) && !confirmedChoices.includes("臨時作業")) {
    confirmedChoices.push("臨時作業");
  }
  if (/短時間/.test(text) && !confirmedChoices.includes("短時間作業")) {
    confirmedChoices.push("短時間作業");
  }
  const confirmsNonSpray =
    /(?:吹付け以外|吹き?付け(?:作業)?ではない|非吹付け)/.test(text);
  if (confirmsNonSpray) {
    if (!confirmedChoices.includes("吹付け以外")) {
      confirmedChoices.push("吹付け以外");
    }
  } else if (
    /(?:吹き?付け|スプレー)(?:作業)?/.test(text) &&
    !confirmedChoices.includes("吹付け作業")
  ) {
    confirmedChoices.push("吹付け作業");
  }

  const role = firstMatchValue(text, ROLES);
  const safeRole =
    role === "作業者" &&
    /労働者死傷病報告/.test(text) &&
    !/(?:作業員|作業者|労働者(?:本人|自身|が|は|を|に))/.test(text)
      ? undefined
      : role;

  return {
    workType: topic?.workType,
    equipment: topic?.equipment,
    height,
    load,
    voltageClass: extractVoltageClass(text, topic?.workType === "電気作業"),
    qualification,
    role: safeRole,
    targetDate: targetPeriod?.start,
    targetDateEnd: targetPeriod?.end,
    targetDatePrecision: targetPeriod?.precision,
    confirmedChoices:
      confirmedChoices.length > 0
        ? [...confirmedChoices].slice(-SAFE_CONFIRMED_CHOICE_LIMIT)
        : undefined,
  };
}

/** Rebuild externally supplied memory from allowlisted values only. */
export function sanitizeLegalConversationContext(
  context: LegalConversationContext | undefined,
): LegalConversationContext {
  if (!context) return {};

  const safeText = [
    context.workType,
    context.equipment,
    context.height,
    context.load,
    context.voltageClass,
    context.qualification,
    context.role,
  ]
    .filter(
      (value): value is string =>
        typeof value === "string" && value.length > 0 && value.length <= 80,
    )
    .join(" ");
  const sanitized = extractLegalConversationContext(safeText);
  const isoDate = /^\d{4}-\d{2}-\d{2}$/;
  if (
    typeof context.targetDate === "string" &&
    isoDate.test(context.targetDate)
  ) {
    sanitized.targetDate = context.targetDate;
  }
  if (
    typeof context.targetDateEnd === "string" &&
    isoDate.test(context.targetDateEnd)
  ) {
    sanitized.targetDateEnd = context.targetDateEnd;
  }
  if (
    context.targetDatePrecision === "day" ||
    context.targetDatePrecision === "month" ||
    context.targetDatePrecision === "year"
  ) {
    sanitized.targetDatePrecision = context.targetDatePrecision;
  }
  const confirmedChoices = latestConfirmedChoices(
    context.confirmedChoices ?? [],
  );
  if (confirmedChoices.length > 0) {
    sanitized.confirmedChoices = [...new Set(confirmedChoices)].slice(
      -SAFE_CONFIRMED_CHOICE_LIMIT,
    );
  }
  return sanitized;
}

export function mergeLegalConversationContext(
  ...contexts: LegalConversationContext[]
): LegalConversationContext {
  const merged: LegalConversationContext = {};
  const confirmedChoices: LegalConfirmedChoice[] = [];
  for (const context of contexts) {
    for (const [key, value] of Object.entries(context)) {
      if (key === "confirmedChoices") continue;
      if (value !== undefined) {
        (merged as Record<string, unknown>)[key] = value;
      }
    }
    for (const choice of context.confirmedChoices ?? []) {
      if (!SAFE_LEGAL_CONFIRMED_CHOICES.includes(choice)) continue;
      const slot = confirmedChoiceSlot(choice);
      const previousIndex = confirmedChoices.findIndex(
        (candidate) => confirmedChoiceSlot(candidate) === slot,
      );
      if (previousIndex >= 0) confirmedChoices.splice(previousIndex, 1);
      confirmedChoices.push(choice);
    }
  }
  if (confirmedChoices.length > 0) {
    merged.confirmedChoices = confirmedChoices.slice(
      -SAFE_CONFIRMED_CHOICE_LIMIT,
    );
  }
  return merged;
}

function contextValues(context: LegalConversationContext): string[] {
  const targetDate = context.targetDate
    ? context.targetDatePrecision === "year"
      ? `${context.targetDate.slice(0, 4)}年 対象期間(年):${context.targetDate}〜${context.targetDateEnd ?? `${context.targetDate.slice(0, 4)}-12-31`}`
      : context.targetDatePrecision === "month"
        ? `${context.targetDate.slice(0, 4)}年${Number(context.targetDate.slice(5, 7))}月 対象期間(月):${context.targetDate}〜${context.targetDateEnd ?? context.targetDate}`
        : context.targetDate
    : undefined;
  return [
    context.workType,
    context.equipment,
    context.height,
    context.load,
    context.voltageClass,
    context.qualification,
    context.role,
    context.confirmedChoices?.length
      ? `確認済み選択肢:${context.confirmedChoices.join("・")}`
      : undefined,
    targetDate,
  ].filter((value): value is string => Boolean(value));
}

/** Treat only populated allowlisted values as usable conversation memory. */
export function hasLegalConversationContext(
  context: LegalConversationContext | undefined,
): boolean {
  return contextValues(sanitizeLegalConversationContext(context)).length > 0;
}

const SAFE_CLARIFICATION_INTENTS = [
  "手すり",
  "何センチ",
  "幅",
  "高さ",
  "フォークリフト",
  "玉掛け",
  "クレーン",
  "運転",
  "操作",
  "作業指揮者",
  "指揮者",
  "フルハーネス",
  "高所作業車",
  "脚立",
  "安全管理者",
  "委員会",
  "局所排気装置",
  "局所排気",
  "放射線",
  "線量限度",
  "特殊健診",
  "特殊健康診断",
  "石綿",
  "届出",
  "有機溶剤",
  "シンナー",
  "熱中症",
  "労働者死傷病報告",
  "死傷病報告",
  "労災",
  "労働災害",
  "休業災害",
  "報告",
  "提出",
  "健診",
  "健康診断",
  "屋内",
  "酸欠",
  "人員",
  "圧力容器",
  "検査",
  "点検",
  "換気",
  "測定",
  "記録",
  "保存",
  "頻度",
  "足場",
  "墜落防止",
  "薬品",
  "規制",
  "通達",
  "指針",
  "ガイドライン",
  "告示",
  "判例",
  "根拠",
  "法律",
  "条文",
  "何条",
  "何項",
  "何号",
  "公式原文",
  "施行日",
  "適用日",
  "いつから",
  "条件",
  "例外",
  "作業床",
  "デシベル",
  "粉じん",
  "鉛",
  "資格",
  "免許",
  "技能講習",
  "特別教育",
  "教育",
  "点検",
  "囲い",
  "養生",
  "事前調査",
] as const;

export function safeClarificationIntent(value: string): string {
  const normalized = normalize(value);
  const intent = SAFE_CLARIFICATION_INTENTS.filter((term) =>
    normalized.includes(term),
  ).join(" ");
  const compact = normalized.replace(/[\s　、。,.!?！？]/g, "");
  const reportRecipientIntent = REPORT_RECIPIENT_FOLLOWUP.test(compact)
    ? "報告先"
    : "";
  const abstractInjuryReportDuration =
    /(?:労働者死傷病報告|死傷病報告|労災(?:事故)?|労働災害|休業災害)/.test(
      normalized,
    )
      ? normalized.match(
          /休業(?:日数)?(?:が|は)?([1-9１-９一二三四五六七八九十]+)日/,
        )?.[1]
      : undefined;
  const safeIntent = [
    intent,
    reportRecipientIntent,
    abstractInjuryReportDuration ? `休業${abstractInjuryReportDuration}日` : "",
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (
    /(?:石綿|アスベスト).*事前調査|事前調査.*(?:石綿|アスベスト)/.test(
      normalized,
    ) &&
    /(?:誰|資格|できる|行える)/.test(normalized)
  ) {
    return `${safeIntent} 調査者`.trim();
  }
  return safeIntent;
}

function normalizeClarificationChoice(value: string): string {
  return normalize(value).replace(
    /(?:です|です。|について|の場合|を選びます)$/,
    "",
  );
}

/**
 * Accept an option followed only by a small, non-identifying work descriptor.
 * This keeps replies such as 「足場の作業床です」 attached to the preceding
 * equipment question without treating arbitrary sentences containing an
 * option word as confirmation.
 */
function matchesClarificationChoice(option: string, message: string): boolean {
  const normalizedOption = normalizeClarificationChoice(option);
  const normalizedMessage = normalizeClarificationChoice(message);
  if (normalizedMessage === normalizedOption) return true;
  if (!normalizedMessage.startsWith(normalizedOption)) return false;
  const suffix = normalizedMessage.slice(normalizedOption.length);
  return /^(?:の(?:作業床|設備|場所|作業|業務))?(?:です|についてです)?$/.test(
    suffix,
  );
}

export function resolveLegalConversationQuery(input: {
  message: string;
  history?: LegalConversationTurn[];
  context?: LegalConversationContext;
}): {
  query: string;
  context: LegalConversationContext;
  usedHistory: boolean;
  answeredClarification?: LegalClarification;
} {
  const message = normalize(input.message);
  const history = (input.history ?? [])
    .slice(-10)
    .filter((turn) => turn.role === "user" && turn.content.length <= 4_000);
  const previousContext = mergeLegalConversationContext(
    ...history.map((turn) => extractLegalConversationContext(turn.content)),
    sanitizeLegalConversationContext(input.context),
  );
  const currentContext = extractLegalConversationContext(message);
  const latestUserQuestion = history.at(-1)?.content;
  const priorClarification = latestUserQuestion
    ? buildLegalClarification(latestUserQuestion)
    : null;
  const matchingClarificationChoices =
    priorClarification?.options.filter((option) =>
      matchesClarificationChoice(option, message),
    ) ?? [];
  const isClarificationChoice = matchingClarificationChoices.length === 1;
  const confirmedChoice = isClarificationChoice
    ? SAFE_LEGAL_CONFIRMED_CHOICES.find(
        (option) =>
          normalizeClarificationChoice(option) ===
          normalizeClarificationChoice(message),
      )
    : undefined;
  if (confirmedChoice) {
    currentContext.confirmedChoices = [confirmedChoice];
  }
  const priorSafeIntent = latestUserQuestion
    ? safeClarificationIntent(latestUserQuestion)
    : "";
  const clarificationIntent = isClarificationChoice ? priorSafeIntent : "";
  if (
    previousContext.equipment === "フォークリフト" &&
    currentContext.load?.startsWith("つり上げ荷重")
  ) {
    currentContext.load = currentContext.load.replace(
      /^つり上げ荷重/,
      "最大荷重",
    );
  }
  const compact = message.replace(/[\s　、。,.!?！？]/g, "");
  const currentHasTopic = Boolean(
    currentContext.workType || currentContext.equipment,
  );
  const hasPriorContext =
    history.length > 0 || contextValues(previousContext).length > 0;
  const answersOpenReportRecipientClarification = Boolean(
    currentHasTopic &&
    !previousContext.workType &&
    !previousContext.equipment &&
    latestUserQuestion &&
    REPORT_RECIPIENT_FOLLOWUP.test(
      normalize(latestUserQuestion).replace(/[\s　、。,.!?！？]/g, ""),
    ) &&
    OPEN_CLARIFICATION_CONDITION_ANSWER.test(message),
  );
  const answersOpenRoleOrTrainingClarification = Boolean(
    answersOpenReportRecipientClarification ||
    (currentHasTopic &&
      !previousContext.workType &&
      !previousContext.equipment &&
      (previousContext.role || previousContext.qualification) &&
      OPEN_CLARIFICATION_CONDITION_ANSWER.test(message) &&
      (!latestUserQuestion || priorClarification?.options.length === 0)),
  );
  const previousTopicFamily = legalTopicFamily(previousContext.workType);
  const currentTopicFamily = legalTopicFamily(currentContext.workType);
  const changesEquipment =
    currentContext.equipment !== previousContext.equipment;
  const changesWorkType = currentContext.workType !== previousContext.workType;
  const currentIsPriorTopicAspect =
    hasPriorContext &&
    compact.length <= 32 &&
    isTopicAspectFollowup(compact, previousContext);
  const explicitlyChangesTopic = Boolean(
    currentHasTopic &&
    !isClarificationChoice &&
    !currentIsPriorTopicAspect &&
    !answersOpenRoleOrTrainingClarification &&
    (changesEquipment ||
      (changesWorkType && !CONDITION_FOLLOWUP.test(message))),
  );
  const topicCompatible =
    !explicitlyChangesTopic &&
    (!previousTopicFamily ||
      !currentTopicFamily ||
      previousTopicFamily === currentTopicFamily);
  const incompatibleRoleOrTrainingFollowup =
    hasPriorContext &&
    !currentHasTopic &&
    !isCompatibleRoleOrTrainingFollowup(currentContext, previousContext);
  const hasExtractedCondition = Boolean(
    currentContext.height ||
    currentContext.load ||
    currentContext.voltageClass ||
    currentContext.role ||
    currentContext.targetDate ||
    currentContext.confirmedChoices?.length ||
    (!currentHasTopic && currentContext.qualification),
  );
  const conditionFollowup =
    hasPriorContext &&
    topicCompatible &&
    (answersOpenRoleOrTrainingClarification ||
      hasExtractedCondition ||
      CONDITION_FOLLOWUP.test(message));
  const universalContextFollowup =
    hasPriorContext &&
    !currentHasTopic &&
    compact.length <= 32 &&
    UNIVERSAL_CONTEXT_FOLLOWUP.test(compact);
  const topicAspectFollowup =
    hasPriorContext && compact.length <= 32 && currentIsPriorTopicAspect;
  const preservesPriorTraining = Boolean(
    topicAspectFollowup &&
    /^(?:特別教育|技能講習|資格)$/.test(previousContext.qualification ?? "") &&
    /(?:受け|受講|教育|講習|有効|更新|いつ|期限|時期|誰|どの人)/.test(compact),
  );
  const safeAspectFollowup = universalContextFollowup || topicAspectFollowup;
  const selectsEquipment = Boolean(
    isClarificationChoice && priorClarification?.question.includes("設備"),
  );
  const shouldUseHistory =
    hasPriorContext &&
    !incompatibleRoleOrTrainingFollowup &&
    (!currentHasTopic ||
      conditionFollowup ||
      isClarificationChoice ||
      topicAspectFollowup) &&
    (isClarificationChoice ||
      conditionFollowup ||
      safeAspectFollowup ||
      CONTEXT_DEPENDENT.test(compact) ||
      QUALIFICATION_ONLY_FOLLOWUP.test(message));
  // A standalone new topic starts a new safe context.  Only explicit
  // follow-up language, an answered chip, or an allowlisted condition may
  // inherit prior conditions; short length alone is never sufficient.
  const context: LegalConversationContext = shouldUseHistory
    ? {
        ...mergeLegalConversationContext(previousContext, currentContext),
        workType: selectsEquipment
          ? (currentContext.workType ?? previousContext.workType)
          : (previousContext.workType ?? currentContext.workType),
        equipment: selectsEquipment
          ? (currentContext.equipment ?? previousContext.equipment)
          : (previousContext.equipment ?? currentContext.equipment),
      }
    : currentContext;
  if (topicAspectFollowup) {
    if (!currentContext.role) delete context.role;
    if (!currentContext.qualification && !preservesPriorTraining) {
      delete context.qualification;
    }
  }

  if (
    !shouldUseHistory ||
    (contextValues(previousContext).length === 0 &&
      !clarificationIntent &&
      !priorSafeIntent)
  ) {
    return {
      query: message,
      context,
      usedHistory: false,
      ...(isClarificationChoice && priorClarification
        ? { answeredClarification: priorClarification }
        : {}),
    };
  }

  const queryParts = [
    ...contextValues(context),
    shouldUseHistory ? priorSafeIntent : clarificationIntent,
    message,
  ]
    .filter(Boolean)
    .filter(
      (value, index, values) =>
        values.findIndex(
          (candidate) => normalize(candidate) === normalize(value),
        ) === index,
    );
  return {
    query: queryParts.join(" ").replace(/\s+/g, " ").trim(),
    context,
    usedHistory: true,
    ...(isClarificationChoice && priorClarification
      ? { answeredClarification: priorClarification }
      : {}),
  };
}

export function buildLegalClarification(
  message: string,
): LegalClarification | null {
  const text = normalize(message);
  const context = extractLegalConversationContext(text);
  const asksQualification = /(?:資格|免許|技能講習|特別教育|教育)/.test(text);

  if (
    /(?:法|令|規則|則)\s*第?[0-9一二三四五六七八九十百千]+条(?:の[0-9一二三四五六七八九十百千]+)?/.test(
      text,
    )
  ) {
    return null;
  }

  if (/手すり/.test(text) && !/(?:足場|作業床|開口部|高所作業車)/.test(text)) {
    return {
      question:
        "適用する手すり基準を絞るため、高さを確認したい設備はどれですか？",
      options: ["足場", "作業床", "高所作業車"],
    };
  }
  if (
    context.workType === "電気作業" &&
    (asksQualification || /作業主任者/.test(text)) &&
    !/(?:配線工事|配線.*(?:工事|敷設|修理)|(?:活線|充電部).*(?:作業|近接|接近|取扱い?)|充電電路.*(?:敷設|修理|点検|操作)|(?:電気設備|開閉器|遮断器).*(?:操作|点検)|操作・点検)/.test(
      text,
    )
  ) {
    return {
      question:
        "必要な資格・教育や作業主任者の要否を絞るため、実際の作業はどれに近いですか？",
      options: [...ELECTRICAL_WORK_CHOICES],
    };
  }
  if (
    context.equipment === "フォークリフト" &&
    asksQualification &&
    !context.load &&
    !/(?:何|なん)\s*(?:トン|t)から/i.test(text)
  ) {
    return {
      question:
        "必要な資格区分を確定するため、銘板・仕様書にあるフォークリフトの最大荷重はどれですか？",
      options: ["1トン未満", "1トン以上", "分からない"],
    };
  }
  if (
    /玉掛/.test(text) &&
    asksQualification &&
    !context.load &&
    !/(?:何|なん)\s*(?:トン|t)から/i.test(text)
  ) {
    return {
      question:
        "必要な資格区分を確定するため、使用するクレーン等のつり上げ荷重はどれですか？",
      options: ["1トン未満", "1トン以上", "分からない"],
    };
  }
  if (
    context.equipment === "移動式クレーン" &&
    asksQualification &&
    !context.load
  ) {
    return {
      question: "移動式クレーンのつり上げ荷重はどれですか？",
      options: ["1トン未満", "1〜5トン未満", "5トン以上"],
    };
  }
  if (
    /クレーン/.test(text) &&
    (asksQualification || /運転/.test(text)) &&
    !/玉掛/.test(text) &&
    !/(?:移動式|天井|橋形|デリック|スタッカー)/.test(text)
  ) {
    return {
      question: "資格を確認したい機械はどれですか？",
      options: ["クレーン", "移動式クレーン", "デリック"],
    };
  }
  if (
    context.equipment === "高所作業車" &&
    asksQualification &&
    !context.height &&
    !/高所作業車に特別教育(?:は|が)?必要/.test(text)
  ) {
    return {
      question:
        "運転に必要な資格区分を確定するため、銘板・仕様書にある高所作業車の作業床の最高高さはどれですか？",
      options: ["2m未満", "2m以上10m未満", "10m以上"],
    };
  }
  if (
    context.equipment === "墜落制止用器具" &&
    !/(?:作業床(?:あり|なし)|作業床を設け(?:られる|られない|にくい)|作業床.*困難)/.test(
      text,
    ) &&
    !/(?:いつ.*(?:特別教育|教育)|(?:特別教育|教育).*(?:いつ|対象|条件|いる|必要|要否))/.test(
      text,
    )
  ) {
    return {
      question: "作業床を設けられますか？",
      options: ["作業床あり", "作業床なし", "条件不明"],
    };
  }
  if (
    /酸欠/.test(text) &&
    /(?:監視人|監視者)/.test(text) &&
    !/(?:タンク|ピット|マンホール|坑内|その他)/.test(text)
  ) {
    return {
      question: "酸欠のおそれがあるのは、どの作業場所ですか？",
      options: ["タンク・ピット内", "マンホール・坑内", "その他"],
    };
  }
  if (/(?:^|\s)作業台$/.test(text)) {
    return {
      question: "作業台の種類はどれですか？",
      options: ["可搬式作業台", "ローリングタワー", "種類不明"],
    };
  }
  if (
    /脚立/.test(text) &&
    /(?:高さ|どこまで|何\s*(?:m|メートル)|作業して(?:も)?いい)/i.test(text) &&
    !context.height &&
    !/(?:天板|またが|昇降|開き止め|分からない|わからない|不明)/.test(text)
  ) {
    return {
      question: "作業時の足元の高さはどれですか？",
      options: ["2m未満", "2m以上", "分からない"],
    };
  }
  if (
    /(?:脚立|はしご|梯子)/.test(text) &&
    !/(?:天板|またが|昇降|開き止め)/.test(text)
  ) {
    const mentions = text.match(/脚立|はしご|梯子/g)?.length ?? 0;
    if (mentions <= 1) {
      return {
        question: "使う設備はどれですか？",
        options: ["脚立", "はしご", "作業台"],
      };
    }
    if (/(?:^|\s)(?:はしご|梯子)$/.test(text)) {
      return {
        question: "はしごを何に使いますか？",
        options: ["昇降用", "作業場所", "条件不明"],
      };
    }
    return {
      question: "脚立をどの使い方で確認しますか？",
      options: ["天板に立つ", "段に立つ", "昇降だけ"],
    };
  }
  if (
    /安全管理者/.test(text) &&
    !/(?:建設|製造|運送|林業|鉱業|清掃|業種)/.test(text)
  ) {
    return {
      question: "事業場の主な業種はどれですか？",
      options: ["建設業", "製造業", "その他"],
    };
  }
  if (
    /(?:安全衛生委員会|安全委員会|衛生委員会|委員会)/.test(text) &&
    !/(?:安全委員会|衛生委員会).*(?:どちら|両方)/.test(text)
  ) {
    return {
      question: "どの委員会の要件を確認しますか？",
      options: ["安全委員会", "衛生委員会", "両方"],
    };
  }
  if (
    /(?:局所排気|局排)/.test(text) &&
    !/(?:有機溶剤|特定化学物質|鉛|粉じん|物質名)/.test(text)
  ) {
    return {
      question: "どの物質・作業に使う局所排気装置ですか？",
      options: ["有機溶剤", "特定化学物質", "粉じん"],
    };
  }
  if (
    /(?:放射線|電離放射線|線量限度)/.test(text) &&
    !/(?:作業者|女性|妊娠|水晶体|皮膚|実効線量)/.test(text)
  ) {
    return {
      question: "線量を確認したい対象はどれですか？",
      options: ["放射線業務従事者", "妊娠中", "一般区域"],
    };
  }
  if (/特殊健診/.test(text)) {
    return {
      question: "どの業務の特殊健康診断を確認しますか？",
      options: ["有機溶剤", "特定化学物質", "石綿"],
    };
  }
  if (
    /(?:健康診断|健診)/.test(text) &&
    !/(?:一般|会社|定期|雇入れ|毎年|年1回|1年|一年|有機溶剤|シンナー|特定化学物質|石綿|じん肺|鉛|電離放射線)/.test(
      text,
    )
  ) {
    return {
      question: "どの業務の健康診断を確認しますか？",
      options: ["一般健康診断", "有害業務の健診", "じん肺健診"],
    };
  }
  if (
    /(?:石綿|アスベスト)/.test(text) &&
    /(?:届出|報告)/.test(text) &&
    !/(?:解体|改修|封じ込め)/.test(text)
  ) {
    return {
      question: "石綿に関するどの作業を確認しますか？",
      options: ["解体", "改修", "封じ込め"],
    };
  }
  if (
    /(?:石綿|アスベスト)/.test(text) &&
    /(?:資格|誰|できる|行える)/.test(text) &&
    !/(?:解体|改修|工作物|建築物|船舶)/.test(text)
  ) {
    return {
      question: "石綿を確認する対象はどれですか？",
      options: ["建築物", "工作物", "船舶"],
    };
  }
  if (
    /(?:有機溶剤|有機則)/.test(text) &&
    !/(?:第一種|第二種|第三種|第[123一二三]種)/.test(text) &&
    !/(?:健康診断|健診|何条|条文|根拠)/.test(text)
  ) {
    return {
      question:
        "設備要件を絞るため、SDS上の区分は第1種・第2種・第3種のどれですか？",
      options: ["第1種", "第2種", "第3種"],
    };
  }
  if (
    /(?:有機溶剤|有機則)/.test(text) &&
    /(?:第三種|第[3三]種|臨時|短時間)/.test(text) &&
    !/(?:不明|分からない|わからない)/.test(text) &&
    !/(?:タンク等?の?内部|タンク内|タンク等?の?外|タンク外|内部以外|それ以外の屋内)/.test(
      text,
    )
  ) {
    return {
      question:
        "設備の適用条件を絞るため、作業場所はタンク等の内部ですか、それ以外の屋内ですか？",
      options: ["タンク等の内部", "それ以外の屋内", "不明"],
    };
  }
  if (
    /(?:有機溶剤|有機則)/.test(text) &&
    /(?:第三種|第[3三]種)/.test(text) &&
    /(?:タンク等?の?内部|タンク内)/.test(text) &&
    !/短時間/.test(text) &&
    !/(?:吹付け以外|吹き?付け(?:作業)?ではない|非吹付け|吹き?付け(?:作業)?|スプレー(?:作業)?|不明|分からない|わからない)/.test(
      text,
    )
  ) {
    return {
      question: "必要な換気設備を絞るため、実際に行うのは吹付け作業ですか？",
      options: ["吹付け作業", "吹付け以外", "不明"],
    };
  }
  if (/(?:酸欠|酸素欠乏)/.test(text) && /(?:人員|人数|配置)/.test(text)) {
    return {
      question: "確認したい役割はどれですか？",
      options: ["作業主任者", "監視人", "作業者"],
    };
  }
  if (
    /(?:圧力容器|ボイラー)/.test(text) &&
    !/(?:第一種|第二種|小型|移動式)/.test(text)
  ) {
    return {
      question: "設備の区分はどれですか？",
      options: ["第一種", "第二種", "小型"],
    };
  }
  if (
    /(?:点検|検査)/.test(text) &&
    !/足場/.test(text) &&
    !/(?:健康|健診|ストレス|心の|日常|定期自主|月例|月次|毎月|月1回|1月(?:に)?1回|一月(?:に)?一回|年次|性能検査|使用前|始業前|作業開始前)/.test(
      text,
    )
  ) {
    if (/クレーン/.test(text)) {
      return {
        question: "どの頻度のクレーン点検を確認しますか？",
        options: ["作業開始前", "月例", "年次"],
      };
    }
    return {
      question: "どの点検・検査を確認しますか？",
      options: ["作業開始前点検", "定期自主検査", "性能検査"],
    };
  }
  if (
    /足場/.test(text) &&
    /(?:点検|検査)/.test(text) &&
    /(?:いつ|時期|タイミング|頻度)/.test(text) &&
    !/(?:組立|変更|悪天候|地震|使用前|作業開始前)/.test(text)
  ) {
    return {
      question: "どのタイミングの足場点検を確認しますか？",
      options: ["組立後", "悪天候後", "使用前"],
    };
  }
  if (
    /(?:墜落|転落)/.test(text) &&
    !/(?:足場|作業床|開口部|屋根|高所作業車|脚立|はしご)/.test(text) &&
    !/(?:フルハーネス|墜落制止用器具|特別教育)/.test(text)
  ) {
    return {
      question: "墜落のおそれがある場所はどこですか？",
      options: ["作業床の端", "開口部", "足場"],
    };
  }
  if (
    /(?:化学物質|薬品|物質)/.test(text) &&
    !/(?:CAS|SDS|製品名|成分名|有機溶剤|石綿|鉛)/i.test(text) &&
    !/(?:リスクアセスメント|危険性評価|健康診断|健診|化学物質(?:管理|かんり)者|薬品管理.*担当|選任|何条|条文|根拠)/i.test(
      text,
    )
  ) {
    return {
      question: "物質を特定できる情報はどれですか？",
      options: ["製品名", "SDS名", "CAS番号"],
    };
  }
  if (
    /(?:通達|通知|告示|ガイドライン)/.test(text) &&
    !/(?:文書番号|発出日|文書名|令和|平成|昭和|20\d{2}年)/.test(text)
  ) {
    return {
      question: "確認したい文書の手掛かりはどれですか？",
      options: ["通達名", "発出日", "文書番号"],
    };
  }
  if (
    /(?:改正|施行|適用時点|対象日|今の法律|現行)/.test(text) &&
    !/(?:20\d{2}|令和|平成|昭和|今日|\d{4}[-/.年]\d{1,2})/.test(text)
  ) {
    return {
      question: "どの時点の法令を確認しますか？",
      options: ["今日", "過去の日付", "将来の日付"],
    };
  }
  if (
    /(?:騒音|デシベル|dB)/i.test(text) &&
    !/(?:作業環境測定|個人ばく露|騒音計|等価騒音)/.test(text)
  ) {
    return {
      question: "どの騒音測定を確認しますか？",
      options: ["等価騒音", "個人ばく露", "作業環境測定"],
    };
  }
  if (
    /粉じん/.test(text) &&
    !/(?:鉱物|研磨|切断|溶接|特定粉じん|じん肺|作業環境測定)/.test(text)
  ) {
    return {
      question: "粉じんが出る作業はどれですか？",
      options: ["特定粉じん", "研磨", "屋外作業"],
    };
  }
  if (
    /鉛/.test(text) &&
    !/(?:製錬|溶融|粉砕|研磨|はんだ|塗装|蓄電池)/.test(text)
  ) {
    return {
      question: "鉛を扱う作業はどれですか？",
      options: ["溶融", "塗料除去", "はんだ付け"],
    };
  }
  if (/作業主任者/.test(text) && !context.workType) {
    return {
      question:
        "作業主任者の要否を確認するため、実際の作業名や扱う物質・設備を教えてください。",
      options: [],
    };
  }
  if (/(?:監視人|監視者)/.test(text) && !context.workType) {
    return {
      question:
        "監視人の要否を確認するため、実際の作業名と作業場所を教えてください。",
      options: [],
    };
  }
  if (/作業指揮者/.test(text) && !context.workType) {
    return {
      question:
        "作業指揮者の要否を確認するため、実際の作業名と使用する設備を教えてください。",
      options: [],
    };
  }
  if (/技能講習/.test(text) && !context.workType && !context.equipment) {
    return {
      question:
        "必要な講習を確認するため、実際の作業名と使用する設備を教えてください。",
      options: [],
    };
  }
  if (/特別教育/.test(text) && !context.workType && !context.equipment) {
    return {
      question: "特別教育を確認したい作業はどれですか？",
      options: ["高所作業車", "低圧電気", "研削といし"],
    };
  }
  if (
    /(?:特別教育|資格|免許)/.test(text) &&
    !context.workType &&
    !context.equipment
  ) {
    return {
      question: "資格・教育を確認したい作業はどれですか？",
      options: ["運転", "玉掛け", "作業主任者"],
    };
  }
  if (
    (/(?:最大荷重|つり上げ荷重|吊り上げ荷重|荷重)/.test(text) ||
      /(?:\d+(?:\.\d+)?|一|二|三|五)\s*(?:トン|t).*(?:講習|資格|教育)/i.test(
        text,
      )) &&
    !context.equipment
  ) {
    return {
      question: "荷重を確認する設備はどれですか？",
      options: ["フォークリフト", "玉掛け", "クレーン"],
    };
  }
  if (
    /作業床/.test(text) &&
    !/(?:足場|開口部|高所作業車|作業構台|フルハーネス|墜落制止用器具)/.test(
      text,
    )
  ) {
    return {
      question: "どの作業床を確認しますか？",
      options: ["高所作業", "足場", "開口部"],
    };
  }
  return null;
}

/** Do not ask the exact same clarification again after a quick reply. */
export function nextLegalClarification(
  query: string,
  answered?: LegalClarification,
): LegalClarification | null {
  const candidate = buildLegalClarification(query);
  if (!candidate || !answered) return candidate;
  const sameQuestion =
    normalize(candidate.question) === normalize(answered.question);
  const candidateOptions = candidate.options.map(normalizeClarificationChoice);
  const answeredOptions = answered.options.map(normalizeClarificationChoice);
  const sameOptions =
    candidateOptions.length === answeredOptions.length &&
    candidateOptions.every(
      (option, index) => option === answeredOptions[index],
    );
  return sameQuestion && sameOptions ? null : candidate;
}
