export type LegalTopicDomain =
  | "electrical"
  | "forklift"
  | "lifting"
  | "fall"
  | "oxygen-deficiency"
  | "organic-solvent"
  | "asbestos"
  | "heat"
  | "chemical"
  | "general";

export type ElectricalWorkAction =
  | "visual-inspection"
  | "indicator-check"
  | "noise-odor-check"
  | "cleaning"
  | "breaker-operation"
  | "open-panel"
  | "tester-measurement"
  | "insulation-measurement"
  | "wiring-connection"
  | "wiring-removal"
  | "repair"
  | "live-work"
  | "live-proximity-work"
  | "de-energized-work"
  | "high-voltage-facility-inspection"
  | "start-of-work-inspection"
  | "unknown";

export type ElectricalEnergizedState =
  | "de-energized"
  | "energized"
  | "proximity"
  | "unknown";

export type ElectricalQualificationType =
  | "national-license"
  | "special-education"
  | "skills-training"
  | "work-supervisor"
  | "work-leader"
  | "chief-electrical-engineer"
  | "inspection-duty"
  | "work-procedure"
  | "qualification-general";

export type ElectricalRoleType =
  | "worker"
  | "work-supervisor"
  | "work-leader"
  | "chief-electrical-engineer"
  | "employer";

export type ElectricalMeaning = {
  topicDomain?: "electrical";
  workAction?: ElectricalWorkAction;
  equipment?: string;
  voltageClass?: "低圧" | "高圧" | "特別高圧";
  energizedState?: ElectricalEnergizedState;
  qualificationType?: ElectricalQualificationType;
  roleType?: ElectricalRoleType;
};

const ELECTRICAL_DOMAIN_PATTERN =
  /(?:電気|電源|電工|でんき|盤(?:内|面|を|で|あけ|開|見る|見て|点検|測|外|の外)|制御盤|分電盤|配電盤|受電盤|キュービクル|ブレ[ーイ]カー|遮断器|開閉器|テスター|絶縁抵抗|絶縁測定|配線|結線|電線同士|電圧が不明|コンセント|端子|表示灯|活線|充電部|充電電路|(?:低圧|高圧|特別高圧|特高)(?:で|の)?(?:充電中|停電済み|設備|盤)|(?:低圧|高圧|特別高圧|特高).{0,8}(?:特別)?教育|特高|高圧受電|高圧線|(?:高圧|特別高圧|特高)(?:の)?点検.{0,24}(?:電気)?主任技術者|(?:100|200|400|600)\s*[vVボルト])/;

export function normalizeElectricalWorkText(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/でんき/g, "電気")
    .replace(/てんけん/g, "点検")
    .replace(/とくべつきょういく/g, "特別教育")
    .replace(/低圧の?とくべつきょういく/g, "低圧の特別教育")
    .replace(/ブレイカー/g, "ブレーカー")
    .replace(/電工(?!ドラム)/g, "電気工事士")
    .replace(/(?:ばん|盤)あけて(?:はかる|測る)/g, "盤を開けて測定する")
    .replace(/盤あけ/g, "盤を開け")
    .replace(/テスター(?:を)?あてる/g, "テスターを当てる")
    .replace(/電気の電源をする/g, "電源を入切する")
    .replace(/電源(?:を)?入れるだけ/g, "ブレーカーを入れるだけ")
    .replace(/電源(?:を)?切るだけ/g, "ブレーカーを切るだけ")
    .replace(/点険/g, "点検")
    .replace(/特別教いく/g, "特別教育")
    .replace(/\s+/g, " ")
    .trim();
}

export function hasElectricalDomainSignal(value: string): boolean {
  return ELECTRICAL_DOMAIN_PATTERN.test(normalizeElectricalWorkText(value));
}

export function hasMultipleElectricalVoltageClasses(value: string): boolean {
  const text = normalizeElectricalWorkText(value);
  return /(?:高圧\s*(?:・|\/|／|または|と)\s*(?:特別高圧|特高)|(?:特別高圧|特高)\s*(?:・|\/|／|または|と)\s*高圧)/.test(
    text,
  );
}

function extractVoltageClass(
  text: string,
): ElectricalMeaning["voltageClass"] {
  // A compound branch such as 「高圧・特高」 identifies a range of possible
  // voltages, not a confirmed 特別高圧 condition. Keep the slot unresolved
  // until the user selects one voltage class.
  if (hasMultipleElectricalVoltageClasses(text)) return undefined;
  if (/(?:特別高圧|特高)/.test(text)) return "特別高圧";
  if (/高圧/.test(text)) return "高圧";
  if (/低圧|(?:^|[^0-9])(?:100|200|400|600)\s*[vVボルト]/.test(text)) {
    return "低圧";
  }
  return undefined;
}

function extractEnergizedState(
  text: string,
): ElectricalMeaning["energizedState"] {
  if (/(?:停電済み|停電して|停電後|無電圧|電源(?:を)?切(?:って|り)|遮断済み)/.test(text)) {
    return "de-energized";
  }
  if (/(?:近接|付近|近く|接近)/.test(text) && /(?:充電|活線|電路|高圧|特高)/.test(text)) {
    return "proximity";
  }
  if (
    /(?:充電中|充電(?:した|された)?まま|活線|通電中|通電(?:した)?まま|電圧がかか|電源が入|電源(?:を)?入れたまま)/.test(
      text,
    ) ||
    (/(?:充電部|充電部分)/.test(text) &&
      /(?:テスター|測定|当て)/.test(text))
  ) {
    return "energized";
  }
  return undefined;
}

function extractEquipment(text: string): string | undefined {
  if (/^(?:配線・充電部を扱う|盤内測定・配線)$/.test(text)) {
    return "電気設備";
  }
  if (/^(?:電線同士|機器端子|電圧が不明)$/.test(text)) {
    return "配線設備";
  }
  if (/^(?:100・200Vの閉鎖型|高圧盤|露出型の開閉器)$/.test(text)) {
    return "開閉器";
  }
  if (/高圧受電設備|キュービクル/.test(text)) return "高圧受電設備";
  if (/制御盤/.test(text)) return "制御盤";
  if (/分電盤/.test(text)) return "分電盤";
  if (/配電盤/.test(text)) return "配電盤";
  if (/(?:盤内|盤を|盤の|盤で|受電盤)/.test(text)) return "電気盤";
  if (/ブレーカー|遮断器|開閉器/.test(text)) return "開閉器";
  if (/充電部|充電電路/.test(text)) return "充電電路";
  if (/配線|結線|コンセント|端子/.test(text)) return "配線設備";
  if (/電気|電源|電工|低圧|高圧|特高/.test(text)) return "電気設備";
  return undefined;
}

function extractQualificationType(
  text: string,
): ElectricalMeaning["qualificationType"] {
  if (/電気主任技術者|主任技術者/.test(text)) return "chief-electrical-engineer";
  if (/作業主任者/.test(text)) return "work-supervisor";
  if (/作業指揮者|作業の指揮者/.test(text)) return "work-leader";
  if (/電気工事士|免状|国家資格/.test(text)) return "national-license";
  if (/特別教育|低圧教育|高圧教育/.test(text)) return "special-education";
  if (/技能講習/.test(text)) return "skills-training";
  if (/点検義務/.test(text)) return "inspection-duty";
  if (/作業手順|手順/.test(text)) return "work-procedure";
  if (/資格|免許|教育/.test(text)) return "qualification-general";
  return undefined;
}

function extractRoleType(text: string): ElectricalMeaning["roleType"] {
  if (/電気主任技術者|主任技術者/.test(text)) return "chief-electrical-engineer";
  if (/作業主任者/.test(text)) return "work-supervisor";
  if (/作業指揮者|作業の指揮者/.test(text)) return "work-leader";
  if (/事業者|会社側/.test(text)) return "employer";
  if (/作業者|作業員|労働者/.test(text)) return "worker";
  return undefined;
}

function extractWorkAction(text: string): ElectricalWorkAction | undefined {
  // Quick replies may deliberately group multiple mutually exclusive legal
  // branches.  A grouped label is a request to explain those branches, not
  // evidence that the user will perform live work, measurement, or wiring.
  if (/^(?:配線・充電部を扱う|盤内測定・配線)$/.test(text)) {
    return "unknown";
  }
  // 「充電部に触れる」は、生成chip上は充電状態・接触方法をまだ
  // 確定していない条件。未提示の「充電したまま端子を締める」へ
  // live-workとして膨張させず、次の1問で停電可否と電圧を確認する。
  if (/^充電部に触れる(?:だけ)?$/.test(text)) return "unknown";
  // These generated replies add voltage/energized-state conditions to the
  // preceding action. They must not replace a tester/wiring/breaker action
  // with a generic "停電作業" or "活線作業" action.
  if (
    /^(?:充電中|停電済み|高圧設備|低圧で停電済み|100・200Vの低圧|100・200Vを停電して作業|高圧設備を停電して作業|充電中に扱う|停電して扱う|高圧・特高の活線・近接)$/.test(
      text,
    )
  ) {
    return undefined;
  }
  if (/^盤外から見る$/.test(text)) return "visual-inspection";
  if (/^充電中の盤内を測る$/.test(text)) return "tester-measurement";
  if (/^(?:電線同士|機器端子|電圧が不明)$/.test(text)) {
    return "wiring-connection";
  }
  if (/^(?:100・200Vの閉鎖型|高圧盤|露出型の開閉器)$/.test(text)) {
    return "breaker-operation";
  }
  if (/絶縁(?:抵抗)?(?:を)?(?:測定|測る|はかる)|メガー/.test(text)) {
    return "insulation-measurement";
  }
  // 経産省の電気工事士Q&A Q10は、屋内配線へ測定器を取り付ける
  // 行為そのものを扱う一次資料。資料名だけの質問でも、資格一般論へ
  // 戻さず測定行為として解釈する。
  if (
    /(?:経産省|経済産業省).*(?:電気工事士|電工).*Q&A\s*Q?10/i.test(text)
  ) {
    return "tester-measurement";
  }
  if (/テスター|測定器|電圧(?:を)?(?:測定|測る|はかる)|盤を開けて測定/.test(text)) {
    return "tester-measurement";
  }
  // 活線・近接という危険状態は、同じ文に配線や端子操作があっても
  // 単なる接続作業へ弱めず、先に危険側の行為として確定する。
  if (/(?:近接|付近|近く|接近)/.test(text) && /(?:充電|活線|電路|高圧|特高)/.test(text)) {
    return "live-proximity-work";
  }
  if (/(?:活線|充電部).*(?:触|扱|締め|作業)|(?:触|扱).*(?:活線|充電部)/.test(text)) {
    return "live-work";
  }
  if (/(?:100|200|400|600)\s*[vVボルト]?.*(?:触る|さわる|扱う)/i.test(text)) {
    return "live-work";
  }
  if (/(?:配線|結線)工事/.test(text)) {
    return "wiring-connection";
  }
  if (/配線|結線|端子|電線/.test(text) && /(?:つな|接続|結線|締め|取り付け|取付)/.test(text)) {
    return "wiring-connection";
  }
  if (/配線|結線|端子|電線/.test(text) && /(?:外す|取り外|切り離)/.test(text)) {
    return "wiring-removal";
  }
  if (/(?:修理|交換|改修)/.test(text) && /(?:電気|盤|配線|コンセント|開閉器)/.test(text)) {
    return "repair";
  }
  if (
    (/高圧受電設備|キュービクル/.test(text) &&
      /(?:点検|確認|清掃)/.test(text)) ||
    (/(?:高圧|特別高圧|特高)(?:の)?点検/.test(text) &&
      /(?:電気)?主任技術者/.test(text))
  ) {
    return "high-voltage-facility-inspection";
  }
  if (/ブレーカー|遮断器|開閉器|電源/.test(text) && /(?:入切|入り?切り?|入れる|切る|操作|ON|OFF)/i.test(text)) {
    return "breaker-operation";
  }
  if (/(?:盤|扉|カバー).*(?:開け|開く|外す)/.test(text)) return "open-panel";
  if (/(?:作業開始前|始業前|開始前)(?:に|の)?.*(?:点検|目視|確認)/.test(text)) {
    return "start-of-work-inspection";
  }
  if (/表示(?:灯|値|画面)|ランプ/.test(text) && /(?:見|確認|点検)/.test(text)) {
    return "indicator-check";
  }
  if (/(?:異音|異臭|におい|臭い)/.test(text) && /(?:確認|聞|嗅|点検)/.test(text)) {
    return "noise-odor-check";
  }
  if (/清掃|掃除/.test(text)) return "cleaning";
  if (/盤内.*(?:点検|確認)/.test(text)) return "open-panel";
  if (/(?:見るだけ|目視|外観)/.test(text)) return "visual-inspection";
  if (/(?:停電作業|停電して).*(?:作業|点検|確認)/.test(text)) {
    return "de-energized-work";
  }
  if (/点検|検査|確認/.test(text)) return "unknown";
  return undefined;
}

export function extractElectricalMeaning(value: string): ElectricalMeaning {
  const text = normalizeElectricalWorkText(value);
  const topicDomain = hasElectricalDomainSignal(text) ? "electrical" : undefined;
  const workAction = extractWorkAction(text);
  const voltageClass =
    topicDomain ||
    /^(?:低圧|高圧|特別高圧|特高)(?:です|の場合|について)?[。.!！]?$/.test(text)
      ? extractVoltageClass(text)
      : undefined;
  const energizedState = extractEnergizedState(text);
  const qualificationType = extractQualificationType(text);
  const roleType = extractRoleType(text);

  // A short follow-up such as 「見るだけ」「作業開始前点検」「低圧」 does
  // not repeat the word 電気.  Return its allowlisted condition without
  // assigning a new domain; the conversation resolver may attach it only
  // when the preceding safe context is electrical.
  return {
    topicDomain,
    workAction,
    equipment: topicDomain ? extractEquipment(text) : undefined,
    voltageClass,
    energizedState,
    qualificationType,
    roleType,
  };
}

export function electricalWorkActionQueryTerm(
  action: ElectricalWorkAction | undefined,
): string | undefined {
  const terms: Partial<Record<ElectricalWorkAction, string>> = {
    "visual-inspection": "目視・表示・異音異臭の外観確認",
    "indicator-check": "表示確認",
    "noise-odor-check": "異音・異臭確認",
    cleaning: "電気設備の清掃",
    "breaker-operation": "開閉器の操作",
    "open-panel": "盤を開ける点検",
    "tester-measurement": "盤内でテスター測定",
    "insulation-measurement": "絶縁抵抗測定",
    "wiring-connection": "配線接続・電気工事",
    "wiring-removal": "配線取り外し・電気工事",
    repair: "電気設備の修理",
    "live-work": "充電電路の取扱い・活線作業",
    "live-proximity-work": "充電電路への近接作業",
    "de-energized-work": "停電作業",
    "high-voltage-facility-inspection": "高圧受電設備の点検",
    "start-of-work-inspection": "電気設備の作業開始前点検",
  };
  return action ? terms[action] : undefined;
}

export function electricalEnergizedStateQueryTerm(
  state: ElectricalEnergizedState | undefined,
): string | undefined {
  if (state === "de-energized") return "停電済み";
  if (state === "energized") return "充電中";
  if (state === "proximity") return "充電部に近接";
  return undefined;
}
