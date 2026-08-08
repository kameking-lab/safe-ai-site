export type ChatbotSafetyKind =
  | "emergency"
  | "privacy"
  | "ambiguous"
  | "scope-hold"
  | "wrong-premise"
  | "source-gap";

export type ChatbotEmergencyCategory =
  | "unresponsive-or-breathing"
  | "severe-bleeding"
  | "seizure"
  | "chest-pain"
  | "collapse-or-immobile"
  | "other";

export type ChatbotSafetyDecision = {
  kind: ChatbotSafetyKind;
  response: string;
  /** Never retain the raw value when it may itself contain sensitive data. */
  safeUserText: string;
  /** Coarse, non-diagnostic branch used only to choose first-aid guidance. */
  emergencyCategory?: ChatbotEmergencyCategory;
};

export type ChatbotSensitiveDataKind =
  | "name"
  | "address"
  | "employee-id"
  | "phone"
  | "email"
  | "health";

export type ChatbotTextRecord = {
  role: "user" | "assistant";
  content: string;
};

export type ChatbotHistoryInspection = {
  safe: boolean;
  kinds: ChatbotSafetyKind[];
  blockedIndexes: number[];
};

const UNRESPONSIVE_OR_BREATHING_PATTERNS = [
  /意識(?:が|は)?(?:ない|無い|なし|ありません|もうろう|朦朧|反応なし)/,
  /意識不明|意識を失|意識消失/,
  /呼びかけても(?:反応|返事|返答|応答)(?:が|は)?(?:しない|ない|無い|なし|ありません)/,
  /(?:反応|返事|返答|応答)(?:が|は)?(?:しない|ない|無い|なし|ありません|鈍い|にぶい)/,
  /呼びかけ(?:に|ても).{0,8}(?:応じない|応じません)/,
  /ぐったり.{0,12}(?:応じない|応じません|反応(?:が|は)?ない|返事(?:が|は)?ない)/,
  /(?:呼吸|息)(?:が|は)?(?:ない|無い|なし|ありません|止ま|おかしい|正常でない|分からない|わからない|判らない)/,
  /(?:呼吸|息)(?:を)?して(?:い)?(?:ない|ません)|呼吸停止|無呼吸/,
  /(?:呼吸|息)(?:が|は)?(?:できない|できません|苦しい|苦しそう|しづらい|しにくい)/,
  /呼吸困難/,
  /窒息(?:した|しました|している|しています|してる|してます)/,
  /(?:脈|脈拍)(?:が|は)?(?:ない|ありません|触れない|分からない)/,
  /(?:唇|顔色)(?:が|は)?(?:紫|青紫|真っ青).{0,12}(?:呼吸|息)(?:が|は)?(?:浅い|弱い)/,
  /気を失(?:った|いました|っている|っています|ってる|ってます)/,
  /気絶(?:した|しました|している|しています|してる|してます)/,
  /倒れ(?:て|込んで).{0,16}(?:反応|返事|返答|応答)(?:が|は)?(?:しない|ない|無い|なし|ありません)/,
];

const SEVERE_BLEEDING_PATTERNS = [
  /大量(?:に)?血が出て(?:いる|います|る)?/,
  /大量出血|大出血|出血(?:が|は)?ひどい|血が止まらない/,
  /血が(?:噴き出|吹き出).{0,12}(?:止まらない|止まりません)/,
];

const SEIZURE_PATTERNS = [/けいれん|痙攣/];
const CHEST_PAIN_PATTERNS = [
  /胸(?:が|は)?痛い|胸痛/,
  /胸(?:が|は)?(?:苦しい|苦しそう)/,
  /胸.{0,16}(?:締め付け|締めつけ|圧迫).{0,16}(?:痛|苦し)/,
];
const COLLAPSE_OR_IMMOBILE_PATTERNS = [
  /(?:人|作業員|同僚|職員|従業員|誰か)?(?:が|は)?倒れ(?:た|ている|ています|てる|てます|ました)/,
  /動け(?:ない|ません)/,
  /倒れ(?:て|込んで).{0,10}(?:起きない|起きません|動かない|動きません)/,
  /心停止|心肺停止|胸骨圧迫|AED.*必要/,
  /救急車を呼んで.{0,24}(?:苦しんで|倒れて|動けない)/,
];

const EMERGENCY_PATTERNS = [
  ...UNRESPONSIVE_OR_BREATHING_PATTERNS,
  ...SEVERE_BLEEDING_PATTERNS,
  ...SEIZURE_PATTERNS,
  ...CHEST_PAIN_PATTERNS,
  ...COLLAPSE_OR_IMMOBILE_PATTERNS,
];

/**
 * Remove only an explicitly negated emergency statement. A second,
 * non-negated symptom in the same message remains available to the detector.
 */
function withoutExplicitlyNegatedEmergencyStatements(message: string): string {
  const symptom =
    "(?:意識(?:が|は)?(?:ない|無い|なし|もうろう|朦朧)|呼びかけても(?:反応|返事|返答|応答)(?:が|は)?(?:しない|ない|無い|なし)|呼びかけ(?:に|ても).{0,8}(?:応じない|応じません)|ぐったり.{0,12}(?:応じない|応じません|反応(?:が|は)?ない|返事(?:が|は)?ない)|(?:反応|返事|返答|応答)(?:が|は)?(?:しない|ない|無い|なし|鈍い|にぶい)|(?:呼吸|息)(?:が|は)?(?:ない|無い|なし|分からない|わからない|判らない|できない|できません|苦しい|苦しそう|しづらい|しにくい)|呼吸困難|窒息(?:した|しました|している|しています|してる|してます)|(?:脈|脈拍)(?:が|は)?(?:ない|ありません|触れない|分からない)|(?:呼吸|息)(?:を)?して(?:い)?(?:ない|ません)|気を失(?:った|いました|っている|っています|ってる|ってます)|気絶(?:した|しました|している|しています|してる|してます)|倒れ(?:て|込んで).{0,16}(?:反応|返事|返答|応答)(?:が|は)?(?:しない|ない|無い|なし|ありません)|大量(?:に)?血が出て(?:いる|います|る)?|大量出血|大出血|出血(?:が|は)?ひどい|血が止まらない|血が(?:噴き出|吹き出).{0,12}(?:止まらない|止まりません)|けいれん|痙攣|胸(?:が|は)?(?:痛い|苦しい|苦しそう)|胸痛|胸.{0,16}(?:締め付け|締めつけ|圧迫).{0,16}(?:痛|苦し)|(?:人|作業員|同僚|職員|従業員|誰か)?(?:が|は)?倒れ(?:た|ている|ています|てる|てます|ました)|倒れ(?:て|込んで).{0,10}(?:起きない|起きません|動かない|動きません)|動け(?:ない|ません)|心停止|心肺停止|(?:フォークリフト|車両|重機).*(?:ひかれ|轢かれ)(?:た|ました|ています|て)|(?:機械|回転体|ロール|ベルト|重機).*(?:巻き込まれ|挟まれ|はさまれ)(?:た|ました|ています|て)|(?:指|腕|手|足).*(?:切断された|切断されました|切断した)|(?:目|眼).*(?:異物|破片|釘|金属片).*(?:刺さった|刺さりました|刺さって))";
  const negation =
    "(?:(?:という|との)?(?:こと|わけ|事実|状態|報告)?(?:では|じゃ|は)(?:ない|ありません|なかった|ありませんでした)|(?:こと|わけ)(?:では|じゃ)(?:ない|ありません)|(?:人|者|作業員)?(?:は|が)(?:いない|いません|おりません))";
  return message.replace(new RegExp(`${symptom}.{0,8}${negation}`, "g"), "");
}

function isClearlyNonActiveEmergencyExample(message: string): boolean {
  return (
    /(?:訓練|教育|教材|資料|マニュアル|手順書|クイズ|例文|用語|意味|定義|仮定|想定|(?:場合|とき|時)の対応).*(?:作|教|説明|確認|検討|知り)/.test(
      message,
    ) &&
    !/(?:今|現在|目の前|現場で|発生中|助けて|至急|緊急|119|作業員が|同僚が|人が)/.test(
      message,
    )
  );
}

function emergencyCategoryFor(
  normalized: string,
): ChatbotEmergencyCategory {
  if (SEVERE_BLEEDING_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return "severe-bleeding";
  }
  if (
    UNRESPONSIVE_OR_BREATHING_PATTERNS.some((pattern) =>
      pattern.test(normalized),
    )
  ) {
    return "unresponsive-or-breathing";
  }
  if (SEIZURE_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return "seizure";
  }
  if (CHEST_PAIN_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return "chest-pain";
  }
  if (
    COLLAPSE_OR_IMMOBILE_PATTERNS.some((pattern) =>
      pattern.test(normalized),
    )
  ) {
    return "collapse-or-immobile";
  }
  return "other";
}

/**
 * 危険名だけの一般質問は遮断せず、「現在進行の事故・救助・重い症状」の組合せだけを
 * fail-closed にする。AIや検索の回答を待たせてはならない代表的な労災を対象にする。
 */
const ACTIVE_WORKPLACE_EMERGENCY_PATTERNS = [
  /感電(?:した|して(?:いる|います|動けない|動けません)|事故が発生|で(?:倒れ|動け|離れられ))/,
  /(?:高所|足場|屋根|開口部|はしご|梯子).*(?:墜落|転落)(?:した|して|しました|し、)/,
  /(?:墜落|転落)(?:した|して|しました|し、).*(?:骨折|折れ|動け|激痛|出血|負傷)/,
  /(?:薬品|化学物質|酸|アルカリ|溶剤).*(?:目|眼|皮膚|顔|口).*(?:入り(?:激痛|痛)|入って(?:痛|います)|入りました|かかって(?:痛|います)|かかりました|浴びました|付着して|激痛|痛み)/,
  /(?:目|眼|皮膚|顔|口).*(?:薬品|化学物質|酸|アルカリ|溶剤).*(?:入り(?:激痛|痛)|入って(?:痛|います)|入りました|かかって(?:痛|います)|かかりました|浴びました|付着して|激痛|痛み)/,
  /(?:火災|火事|爆発)(?:が|は)?(?:発生(?:した|して|しています|中)|起き(?:た|て)|起こ(?:った|って)|して(?:いる|います)|しました)|(?:燃えて|炎が).*(?:逃げ|退避|助け)/,
  /(?:逃げ遅れ|取り残され).*(?:火災|火事|爆発)|(?:火災|火事|爆発).*(?:逃げ遅れ|取り残され)/,
  /(?:酸欠|硫化水素|一酸化炭素).*(?:倒れ|動け|苦し|意識|閉じ込め|吸い込)/,
  /(?:閉じ込め|生き埋め|下敷き)(?:にな|です|で|られ|ています)/,
  /(?:溺れ|水没)(?:て|ています|ました|た)|(?:水中|水槽|海|川).*(?:救助|浮かん|沈ん)/,
  /熱中症.*(?:意識|けいれん|痙攣|動け|反応|吐|高体温|ふらつ)|(?:意識|けいれん|痙攣|動け|反応).*(?:熱中症|暑熱)/,
  /(?:フォークリフト|車両|重機).*(?:ひかれ|轢かれ)(?:た|ました|ています|て)/,
  /(?:機械|回転体|ロール|ベルト|重機).*(?:腕|手|指|足|体)?.*(?:巻き込まれ|挟まれ|はさまれ)(?:た|ました|ています|て)/,
  /(?:クレーン|吊り荷|つり荷|荷).*(?:落ち|落下).*(?:頭|体|作業員).*(?:当たり|当たりました|直撃)/,
  /(?:指|腕|手|足).*(?:切断された|切断されました|切断した|切断して.*出血しています)/,
  /(?:目|眼).*(?:異物|破片|釘|金属片).*(?:刺さった|刺さりました|刺さって|入って.*激痛)/,
  /(?:有毒ガス|硫化水素|一酸化炭素).*(?:吸って|吸い込んで).*(?:苦しんで|動けない|倒れ)/,
];

const WORKPLACE_HAZARD_PATTERN =
  /感電|電線|充電部|墜落|転落|足場|高所|薬品|化学物質|酸|アルカリ|溶剤|火災|火事|爆発|硫化水素|一酸化炭素|有毒ガス|酸欠|酸素欠乏|閉じ込め|生き埋め|下敷き|溺水|水没|熱中症|暑熱/;

const ACTIVE_INCIDENT_PATTERN =
  /(?:発生しています|発生中|倒れ(?:た|て|ました)|動け(?:ない|ません)|離れられ(?:ない|ません)|落ちて|頭を打|骨折|折れ(?:た|ました)|激痛|逃げ遅れ|取り残され|閉じ込められ|溺れ(?:て|ています)|助けて|どうすれば|作業員がいます)/;

const STANDALONE_ACTIVE_FIRE_PATTERN =
  /(?:火災|火事|爆発)(?:です|だ|になった|となった)/;

const GENERIC_ACTIVE_WORKPLACE_INCIDENT_PATTERN =
  /(?=.*(?:今|現在|たった今|目の前|現場で|発生中))(?=.*(?:事故|災害|負傷|けが|怪我))(?=.*(?:起き|発生|どうすれば|助け|至急|緊急))/;

const LABELED_VALUE_PATTERNS: Array<[ChatbotSensitiveDataKind, RegExp]> = [
  ["name", /(?:氏名|本名|フルネーム|名前)[は:：=]?[一-龠々〆ヶぁ-んァ-ヶー・]{2,24}/],
  ["address", /(?:住所|居住地|所在地)[は:：=]?(?!未記入|なし)[^、。]{4,80}/],
  ["employee-id", /(?:社員|職員|従業員|作業員)(?:番号|ID|コード)[は:：=]?[A-Z0-9-]{3,24}/i],
  ["phone", /(?:電話|携帯|連絡先)(?:番号)?[は:：=]?[+()0-9ー―‐−-]{8,24}/],
  ["email", /(?:メール|Eメール)(?:アドレス)?[は:：=]?[^、。\s]{3,80}/i],
  ["health", /(?:病歴|既往歴|診断名|健診結果|健康診断結果|服薬|投薬|障害名)[は:：=]?(?!なし|特になし|未記入)[^、。]{2,80}/],
  [
    "name",
    /(?:担当者|責任者|作業員名?|作業者名?|講師|被災者|負傷者|死亡者|班長|現場代理人|連絡担当|作業主任者|作業指揮者|安全衛生責任者|監督者?|管理者|主任(?!者)|職長|所長)[は:：=]?(?!(?:未定|不明|匿名|なし|未記入|何人|何名|何条|何号|何を|どこ|いつ|必要|選任|教育|研修|講習|技能|特別|資格|職務|責務|制度|会議|作業|対象|業務|作業者[A-ZＡ-Ｚ]|作業員[A-ZＡ-Ｚ]))[一-龠々〆ヶ]{2,12}(?:です|さん|氏|様|君)?/,
  ],
  [
    "name",
    /(?:担当|担当者|責任者|作業員名|作業者名|講師|被災者|負傷者|死亡者)[は:：=]?(?:佐藤|鈴木|高橋|田中|伊藤|渡辺|山本|中村|小林|加藤|吉田|山田|佐々木|山口|松本|井上|木村|林|斎藤|清水)[一-龠々〆ヶぁ-んァ-ヶー・]{0,8}/,
  ],
];

const HEALTH_VALUE_PATTERNS = [
  /高血圧|糖尿病|脂質異常症|心筋梗塞|脳梗塞|狭心症|喘息|てんかん|うつ病|適応障害|統合失調症|双極性障害|がん|癌/,
  /(?:HbA1c|血糖値?|血圧|LDL|γ-GTP)[は:：=]?\d+(?:[./]\d+)?/i,
  /(?:妊娠|術後)\d+(?:週|か月|ヶ月)/,
];

function normalizedForms(message: string) {
  const spaced = message.normalize("NFKC").replace(/[\u200B-\u200D\uFEFF]/g, "");
  const compact = spaced.replace(/\s+/g, "");
  const joined = compact.replace(/[・･,，、:：;；()（）\[\]【】]/g, "");
  return { spaced, compact, joined };
}

/**
 * 高確信度の実値を検出する。日本語の任意の氏名を完全には判定できないため、
 * この検査を通った場合もUIの送信前確認を別の安全境界として維持する。
 */
export function detectChatbotSensitiveData(message: string): ChatbotSensitiveDataKind[] {
  const { spaced, compact, joined } = normalizedForms(message);
  const kinds = new Set<ChatbotSensitiveDataKind>();

  for (const [kind, pattern] of LABELED_VALUE_PATTERNS) {
    if (pattern.test(compact)) kinds.add(kind);
  }

  // 空白や全角記号で崩された値も、NFKC後の結合表現で検査する。
  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(joined)) kinds.add("email");
  const digits = joined.replace(/[ー―‐−-]/g, "");
  if (/(?:^|\D)(?:\+81\d{9,10}|0\d{9,10})(?:\D|$)/.test(digits)) kinds.add("phone");
  if (/(?:^|[^A-Z0-9])[A-Z]{1,4}[-ー―‐−]?\d{4,10}(?:[^A-Z0-9]|$)/i.test(compact)) {
    kinds.add("employee-id");
  }
  if (/〒?\d{3}[-ー―‐−]?\d{4}/.test(compact)) kinds.add("address");
  if (/(?:東京都|北海道|(?:京都|大阪)府|.{2,3}県).{1,30}(?:市|区|町|村).{0,30}(?:\d+丁目|\d+番地|\d+-\d+)/.test(compact)) {
    kinds.add("address");
  }
  if (
    /(?:^|[\s、。])(?:[一-龠々〆ヶ]{2,12}(?:市|区|町|村))[一-龠々〆ヶぁ-んァ-ヶー]{1,30}\d{1,4}(?:-\d{1,4}){1,3}(?:号)?/.test(
      spaced,
    )
  ) {
    kinds.add("address");
  }
  // 姓名の間に明示的な空白・中黒がある日本語名だけを高確信度で扱う。
  if (/(?:^|[\s、。])(?:[一-龠々〆ヶ]{1,5})[\s　・･]+(?:[一-龠々〆ヶぁ-んァ-ヶー]{1,8})(?:$|[\s、。])/.test(spaced)) {
    kinds.add("name");
  }
  // よくある姓＋漢字名が助詞や敬称を伴う場合も、作業記録に含まれる実名として遮断する。
  // 単なる一般名詞の誤検知を抑えるため、姓を限定し文脈境界を必須にする。
  if (
    /(?:^|[\s、。])(?:佐藤|鈴木|高橋|田中|伊藤|渡辺|山本|中村|小林|加藤|吉田|山田|佐々木|山口|松本|井上|木村|林|斎藤|清水)[一-龠々〆ヶ]{0,4}(?:さん|氏|様|君)?(?:が|は|の|を|さん|氏|様|君)(?:$|[\s、。]|[一-龠々〆ヶぁ-んァ-ヶー])/.test(
      spaced,
    )
  ) {
    kinds.add("name");
  }
  // 「山田太郎です」のような自己紹介も、ラベルがなくても外部送信前に遮断する。
  // 一文字姓の「林」は「林業です」との誤検知を避け、姓名が3文字以上の時だけ扱う。
  if (
    /(?:^|[\s、。])(?:(?:佐藤|鈴木|高橋|田中|伊藤|渡辺|山本|中村|小林|加藤|吉田|山田|佐々木|山口|松本|井上|木村|斎藤|清水)[一-龠々〆ヶ]{1,4}|林[一-龠々〆ヶ]{2,4})(?:です|と申します|といいます)(?:$|[\s、。！？!?])/.test(
      spaced,
    )
  ) {
    kinds.add("name");
  }
  const selfIntroduction = spaced.match(
    /(?:^|[\s、。])(?:私は|わたしは|僕は|自分は)?([一-龠々〆ヶぁ-んァ-ヶー]{2,12})(と申します|といいます)(?:$|[\s、。！？!?])/,
  );
  if (selfIntroduction) kinds.add("name");

  // 姓辞書に依存せず、「姓名です。質問…」という自己紹介形を遮断する。
  // 作業条件の短い回答は業務語のallowlistで除外し、会話を止めない。
  const unlabeledIntroduction = spaced.match(
    /(?:^|[\s、。])([一-龠々〆ヶ]{2,8})です(?:[。！？!?]+|[、,，]\s*|\s+)(?=[^\s、。！？!?,，]{2})/,
  );
  const nonNameWorkValue =
    /安全|衛生|作業|業務|工事|現場|足場|脚立|作業台|設備|機械|器具|資格|教育|法令|法律|規則|規定|条文|建設|製造|運送|林業|鉱業|清掃|屋内|屋外|晴天|雨天|曇天|建築物|工作物|船舶|解体|改修|封じ込め|技能講習|特別教育|作業主任者|作業指揮者|管理者|事業者|事業主|労働者|作業者|担当者|責任者|監視人|調査者|運転者|合図者|誘導者|請負人|発注者|注文者|使用者|派遣先|派遣元|元方事業者|関係請負人|会社|企業|業者|被災者|負傷者|死亡者|雇用主|元請人|下請人|一人親方|監督者|現場代理人|職長|所長|班長|主任|社員|職員|従業員|同僚|本人|産業医|医師|保健師|厚生労働省|労働局|労働基準監督署|行政|所管省庁|第一種|第二種|第三種|有機溶剤|酸欠|圧力容器|放射線|一般区域|製品名|通達|発出日|文書番号|墜落防止|委員会|粉じん|鉛|騒音|速度|設定|検査|点検|用途|荷重|未定|匿名|不明|未記入|なし/;
  const roleLabeledName = compact.match(
    /(?:作業員|作業者|職長|担当者?|運転者|責任者|監督者?|班長|所長)(?:の|は|が|[:：])([一-龠々〆ヶ]{2,8})(?:が|は|を|へ|です|さん|氏|様|君|[、。！？!?]|[（(](?:作業員|作業者|職長|担当者?|運転者|責任者|監督者?|班長|所長)[）)])/,
  );
  const parenthesizedRoleName = compact.match(
    /(?:^|[、。！？!?])([一-龠々〆ヶ]{2,8})[（(](?:作業員|作業者|職長|担当者?|運転者|責任者|監督者?|班長|所長)[）)](?:が|は|を|へ|です)/,
  );
  for (const match of [roleLabeledName, parenthesizedRoleName]) {
    if (match?.[1] && !nonNameWorkValue.test(match[1])) kinds.add("name");
  }
  if (
    unlabeledIntroduction?.[1] &&
    !nonNameWorkValue.test(unlabeledIntroduction[1])
  ) {
    kinds.add("name");
  }
  if (
    /(?:^|[\s、。])[一-龠々〆ヶ]{3,10}(?:さん|氏|様|君)(?:が|は)(?:作業|担当|従事|負傷|被災|入場|運転|操作)/.test(
      spaced,
    )
  ) {
    kinds.add("name");
  }
  const unlabeledPersonAction = spaced.match(
    /(?:^|[\s、。])([一-龠々〆ヶ]{3,8})(?:が|は)(?:作業|担当|従事|負傷|被災|入場|運転|操作)/,
  );
  if (
    unlabeledPersonAction?.[1] &&
    !nonNameWorkValue.test(unlabeledPersonAction[1])
  ) {
    kinds.add("name");
  }
  const contextualUnlabeledName = spaced.match(
    /(?:^|[\s、。])([一-龠々〆ヶ]{3,8})(?:が|は|に|を|へ|と|、)(?=.{0,24}(?:作業|担当|従事|入場|運転|操作|支給|案内|資格|免許|技能講習|特別教育|フォークリフト|クレーン|足場|脚立|高所作業車|フルハーネス))/,
  );
  if (
    contextualUnlabeledName?.[1] &&
    !nonNameWorkValue.test(contextualUnlabeledName[1])
  ) {
    kinds.add("name");
  }
  const contextualKatakanaName = spaced.match(
    /(?:^|[\s、。])((?:サトウ|スズキ|タカハシ|タナカ|イトウ|ワタナベ|ヤマモト|ナカムラ|コバヤシ|カトウ|ヨシダ|ヤマダ|ササキ|ヤマグチ|マツモト|イノウエ|キムラ|サイトウ|シミズ)[ァ-ヶー]{2,10})(?:が|は|の|を|へ|と|、)(?=.{0,24}(?:作業|担当|従事|入場|運転|操作|資格|免許|技能講習|特別教育))/,
  );
  if (contextualKatakanaName?.[1]) kinds.add("name");
  const possessiveUnlabeledName = spaced.match(
    /(?:^|[\s、。])([一-龠々〆ヶ]{2,7}(?:郎|朗|子|美|恵|香|奈|菜|人|斗|也|介|助|二|一|太|樹|司|志|雄|男|夫|彦|健|誠|学|豊|実|明|修|進|隆|浩|徹|剛|亮|翔|陸|海))の(?=.{0,16}(?:作業|担当|運転|操作|資格|免許|教育))/,
  );
  if (
    possessiveUnlabeledName?.[1] &&
    !nonNameWorkValue.test(possessiveUnlabeledName[1])
  ) {
    kinds.add("name");
  }
  if (HEALTH_VALUE_PATTERNS.some((pattern) => pattern.test(compact))) kinds.add("health");
  // 日本語では主語を省くため、本人の状態だと明示する短い健康自己申告も遮断する。
  // 「妊娠中の作業者」のような一般的な法令質問は対象にしない。
  if (
    /(?:^|[\s、。！？!?])(?:妊娠中(?:です|である)|持病(?:が)?(?:あります|ある|です)|治療中(?:です|である)|通院中(?:です|である)|服薬中(?:です|である)|(?:病気|障害)と診断され(?:ました|ています|た|ている))(?=$|[\s、。！？!?])/.test(
      spaced,
    )
  ) {
    kinds.add("health");
  }
  if (
    /(?:作業員[A-ZＡ-Ｚ0-9０-９]?|同僚|本人|労働者|従業員)(?:が|は)(?:妊娠中|持病(?:が)?ある|治療中|通院中|服薬中|(?:病気|障害)と診断され)/i.test(
      compact,
    )
  ) {
    kinds.add("health");
  }
  if (
    /(?:^|[\s、。！？!?])(?:(?:私|本人|同僚|作業員[A-ZＡ-Ｚ0-9０-９]?|労働者|従業員)(?:は|が))?(?:妊娠(?:しています|してます|中です)|(?:持病|腰痛|アレルギー)(?:が)?(?:あります|ある状態です|持ちです)|(?:治療|通院|服薬)(?:中です|しています|してます)|(?:睡眠薬|処方薬|薬)(?:を)?(?:飲んでいます|飲んでます|服用しています|服用してます))(?=$|[\s、。！？!?])/.test(
      spaced,
    )
  ) {
    kinds.add("health");
  }
  if (
    /(?:私は|わたしは|僕は|自分は|本人は|私が).{0,12}(?:妊娠|持病|病気|治療中|通院中|服薬中|障害|診断)(?:して|中|です|がある|があります)/.test(
      compact,
    )
  ) {
    kinds.add("health");
  }
  if (
    /(?:私|わたし|僕|自分|本人).{0,16}(?:腰|胸|頭|腹|膝|肩)(?:が|は)?.{0,8}(?:痛|しびれ|症状).{0,20}(?:薬|処方薬).{0,10}(?:飲みました|飲んだ|飲んで|服用)/.test(
      compact,
    )
  ) {
    kinds.add("health");
  }

  return [...kinds];
}
const PRIVACY_INTENT_PATTERNS = [
  /入力して(?:も)?(?:いい|良い|よい)|送って(?:も)?(?:いい|良い|よい)|書いて(?:も)?(?:いい|良い|よい)/,
  /個人情報|要配慮個人情報|健康情報/,
];

const QUALIFICATION_DECISION_PATTERNS = [
  /資格(?:が|は)?(?:必要|要る|いる|不要|要否)/,
  /免許(?:が|は)?(?:必要|要る|いる|不要|要否)/,
  /(?:特別教育|技能講習)(?:が|は|を)?(?:必要|要る|いる|不要|要否|要する|要しない|受講すべき|受けるべき)/,
  /(?:特別教育|技能講習).*(?:受ける|受講する).*(?:必要|要否|べき)/,
  /(?:必要|要否|受講すべき|受けるべき).*(?:特別教育|技能講習)/,
  /(?:特別教育|技能講習).*(?:どちら|どっち)/,
];
const QUALIFICATION_CONTEXT = [/作業内容|職種|高さ|足場|作業床|機械|設備|電圧|材料|対象物|役割|運転|操作|玉掛/];
const QUALIFICATION_OVERVIEW_PATTERN =
  /フルハーネス.*いつ.*(?:特別教育|教育)|高所作業車に特別教育(?:は|が)?必要/;
const LEGAL_REFERENCE_OR_DEFINITION_PATTERN =
  /(?:根拠(?:条文|規定)?|何条|どの条文|条文は|規定され|列挙され|定義|とは|制度(?:概要)?|法的根拠)/;
const SLING_TRAINING_OVERVIEW_PATTERN =
  /玉掛け?.*(?:特別教育.*技能講習|技能講習.*特別教育)/;
const SLING_LOAD_CONTEXT =
  /(?:つり上げ荷重|吊り上げ荷重|最大荷重).*(?:\d+(?:\.\d+)?|一)\s*(?:トン|t)|(?:\d+(?:\.\d+)?|一)\s*(?:トン|t).*(?:玉掛|つり上げ荷重|吊り上げ荷重|最大荷重)|玉掛.*(?:何|なん)\s*(?:トン|t)から/i;
const INDIVIDUAL_TRAINING_DECISION_PATTERN =
  /(?:必要|要否|どちら|どっち|受講すべき|受けるべき|自分|この作業|担当者|作業員)/;
const SAFETY_MANAGER_SCOPE_PATTERN =
  /安全管理者.*(?:50人|五十人|何人|人数|選任義務|選任が必要)/;
const SAFETY_MANAGER_INDUSTRY_CONTEXT =
  /林業|鉱業|建設業|運送業|清掃業|製造業|加工業|電気業|ガス業|熱供給業|水道業|通信業|卸売業|小売業|旅館業|ゴルフ場|自動車整備業|機械修理業/;
const LEGAL_SOURCE_GAP_PATTERN =
  /(?:未確認|昨日|今日|最新|新しい|出た).*(?:通達|通知)|(?:通達|通知).*未確認|(?:どの|何の|根拠となる|に関する)通達|(?:どの|何の|根拠となる|に関する)?(?:指針|ガイドライン)|メンタルヘルスケアの基本方針|騒音作業従事者.*聴力検査|振動工具.*健康管理|粉じん作業.*局所排気装置.*性能要件/;
const UNIVERSAL_LEGAL_MATERIAL_FOLLOWUP_PATTERN =
  /^(?:どの通達|通達|指針|ガイドライン)(?:は|を)?(?:どれ|何)?(?:ですか)?[?？]?$/;
const ANSWER_FIRST_MATERIAL_TOPIC_PATTERN =
  /(?:電気作業|電気工事|充電電路|フォー?クリフト|足場|手すり|酸欠|酸素欠乏|有機溶剤|シンナー|玉掛)/;
const LEGAL_MATERIAL_PRESENTATION_SUFFIX_PATTERN =
  /(?:どの通達|通達(?:は|を)?(?:どれ|何)?|指針(?:は|を)?(?:どれ|何)?|ガイドライン(?:は|を)?(?:どれ|何)?)(?:ですか)?[?？]?$/;
const UNVERIFIED_OR_FRESH_MATERIAL_PATTERN =
  /(?:未確認|昨日|今日|最新|新しい|新着|出た|発出された)/;
const SPECIFIC_MATERIAL_IDENTITY_PATTERN =
  /(?:厚生労働省|厚労省|労働局|基発|安衛発|第\d+号|令和|平成|昭和|\d{4}年|[「」『』]|に関する(?:通達|指針|ガイドライン))/;

function isAnswerFirstMaterialPresentation(normalized: string): boolean {
  if (UNIVERSAL_LEGAL_MATERIAL_FOLLOWUP_PATTERN.test(normalized)) return true;
  return Boolean(
    ANSWER_FIRST_MATERIAL_TOPIC_PATTERN.test(normalized) &&
      LEGAL_MATERIAL_PRESENTATION_SUFFIX_PATTERN.test(normalized) &&
      !UNVERIFIED_OR_FRESH_MATERIAL_PATTERN.test(normalized) &&
      !SPECIFIC_MATERIAL_IDENTITY_PATTERN.test(normalized),
  );
}
const DANGEROUS_WORK_EDUCATION_PATTERN =
  /(?:危険(?:又は|または|・)?有害(?:な)?業務|危険有害業務|危険又は有害な業務|危険または有害な業務).*(?:教育|講習)|(?:教育|講習).*(?:危険(?:又は|または|・)?有害(?:な)?業務|危険有害業務|危険又は有害な業務|危険または有害な業務)/;
const FALL_ARREST_USE_PATTERN =
  /(?:墜落制止用器具|要求性能墜落制止用器具|安全帯).*(?:使用|着用|装着|使う|使わなければ|用いる|用い).*(?:義務|必要|要否|根拠|条文|何条|いけない)|(?:義務|必要|要否|根拠|条文|何条).*(?:墜落制止用器具|要求性能墜落制止用器具|安全帯).*(?:使用|着用|装着|使う|使わなければ|用いる|用い)/;
const FALL_ARREST_WORK_CONTEXT =
  /(?:高さ|作業床|床の端|開口部|足場|屋根|ロープ高所|囲い|手すり|親綱|作業床を設けることが困難)/;
const CRANE_OPERATION_QUALIFICATION_PATTERN =
  /(?:(?:移動式)?クレーン|デリック).*(?:運転|操作|オペレータ).*(?:資格|免許|技能講習|特別教育)|(?:資格|免許|技能講習|特別教育).*(?:(?:移動式)?クレーン|デリック).*(?:運転|操作|オペレータ)|(?:(?:移動式)?クレーン|デリック).*オペレータ.*(?:資格|免許)/;
const CRANE_LOAD_CONTEXT =
  /(?:つり上げ荷重|吊り上げ荷重|定格荷重|最大荷重)(?:が|は|:|：)?(?:0(?:\.\d+)?|[1-9]\d*(?:\.\d+)?)(?:トン|t)|(?:0(?:\.\d+)?|[1-9]\d*(?:\.\d+)?)(?:トン|t)(?:未満|以上|以下)?.*(?:つり上げ荷重|吊り上げ荷重|定格荷重|最大荷重)/i;
const LOCAL_EXHAUST_PERFORMANCE_PATTERN =
  /(?:局所排気装置|局排).*(?:性能要件|性能基準|性能|制御風速|排風量|能力)|(?:性能要件|性能基準|制御風速|排風量).*(?:局所排気装置|局排)/;
const LOCAL_EXHAUST_REGULATION_CONTEXT =
  /有機溶剤|特定化学物質|特化物|鉛|粉じん|石綿|溶接ヒューム|金属アーク|四アルキル鉛|物質名|CAS(?:番号)?/i;
const IONIZING_DOSE_LIMIT_PATTERN =
  /(?:電離放射線|放射線業務|被ばく|被曝).*(?:線量限度|被ばく限度|被曝限度|許容線量|何mSv)|(?:線量限度|被ばく限度|被曝限度|許容線量|何mSv).*(?:電離放射線|放射線業務|被ばく|被曝)/i;
const IONIZING_DOSE_SUBJECT_CONTEXT =
  /放射線業務従事者|管理区域|緊急作業|女性|妊娠|妊婦|眼の水晶体|水晶体|皮膚/;
const IONIZING_DOSE_TYPE_CONTEXT =
  /実効線量|等価線量|5年間|五年間|1年間|一年間|3か月|三か月|mSv/i;
const PRESSURE_VESSEL_INSPECTION_PATTERN =
  /圧力容器.*(?:定期検査|性能検査|自主検査|検査)|(?:定期検査|性能検査|自主検査).*(?:圧力容器)/;
const PRESSURE_VESSEL_CLASS_CONTEXT =
  /第一種|第1種|第二種|第2種|小型圧力容器|簡易圧力容器/;
const FORKLIFT_VEHICLE_INSPECTION_SCOPE_PATTERN =
  /(?:フォー?クリフト|フォーク(?:リフト)?).{0,24}車検|車検.{0,24}(?:フォー?クリフト|フォーク(?:リフト)?)/;
const ANNUAL_INSPECTION_SCOPE_PATTERN =
  /(?:(?:年次|年1回|一年(?:以内|ごと)?|1年(?:以内|ごと)?).{0,16}(?:点検|検査|自主検査)|(?:点検|検査|自主検査).{0,16}(?:年次|年1回|一年(?:以内|ごと)?|1年(?:以内|ごと)?))/;
const INSPECTION_TARGET_CONTEXT =
  /フォー?クリフト|クレーン|デリック|エレベーター|建設用リフト|高所作業車|車両系(?:荷役運搬|建設)機械|ボイラー|圧力容器|ゴンドラ|足場|局所排気装置|プレス機械|研削盤|遠心機械|乾燥設備/;
const MAJOR_INCIDENT_REPORT_PATTERN =
  /重大(?:事故|災害).*(?:報告先|届出先|提出先|通報先|連絡先|どこ.*(?:報告|届出|届け)|(?:報告|届出|届け)(?:義務|が必要|る先)|(?:誰|どこ)に.*(?:報告|届出|届け))/;
const OSH_PENALTY_SCOPE_PATTERN =
  /(?:労働安全衛生法|安衛法).*(?:違反).*(?:罰則|罰金|懲役|刑)|(?:罰則|罰金|懲役|刑).*(?:労働安全衛生法|安衛法).*(?:違反)/;
const SPECIFIC_ARTICLE_CONTEXT = /第\d+条(?:の\d+)?/;
const APPROVED_CORPUS_GAP_PATTERNS = [
  /(?:重量物(?:取扱|取り扱い|取扱い|運搬)|重い(?:荷物|物)).*(?:腰痛(?:予防|防止|対策))|(?:腰痛(?:予防|防止|対策)).*(?:重量物(?:取扱|取り扱い|取扱い|運搬)|重い(?:荷物|物))/,
  /(?:高気圧作業|高圧室内作業|圧気工法|潜水業務).*(?:作業主任者|資格|選任|教育|規則|義務|根拠)/,
  /最低賃金.*(?:決定|決ま|定め|改定|審議|地域別|特定最低|根拠|法律|制度|金額|いくら)/,
  /(?:労働契約|雇用契約).*(?:成立|合意|原則|締結)/,
  /(?:解雇権|解雇).*(?:濫用|乱用|無効|合理的|相当性)/,
  /(?:有期労働契約|有期契約|契約社員|5年ルール|五年ルール).*(?:無期転換|無期契約|無期労働契約|転換申込)|(?:無期転換|無期労働契約への転換).*(?:有期労働契約|有期契約|契約社員|5年|五年)/,
];
const EXPLICIT_OUT_OF_SCOPE_LAW_PATTERN =
  /(?:民法|刑法|会社法|商法|民事訴訟法|刑事訴訟法|行政手続法|行政不服審査法|国家賠償法|労働基準法|労働契約法|最低賃金法|雇用保険法|健康保険法|厚生年金保険法|個人情報の保護に関する法律|個人情報保護法|建築基準法|建設業法|消防法|道路交通法|道交法|高圧ガス保安法|毒物及び劇物取締法|毒劇法)/;

export const CHATBOT_EMERGENCY_RESPONSE =
  "緊急対応を優先し、このチャットの回答を待たないでください。まず周囲の危険を確認し、自分や救助者が危険区域へ入らないでください。周囲へ助けを求め、直ちに119番へ通報して救急隊・通信指令員の指示を最優先にしてください。肩をやさしくたたきながら呼びかけて反応を確認し、反応がなければ呼吸を10秒以内で確認してください。普段どおりの呼吸がない、または判断できない場合はAEDを手配し、直ちに胸骨圧迫を開始してください。電源・機械の停止や退避は、二次災害なく安全にできる場合だけ行ってください。";

export const CHATBOT_SEVERE_BLEEDING_RESPONSE =
  "緊急対応を優先し、このチャットの回答を待たないでください。まず周囲の危険を確認し、自分や救助者が危険区域へ入らないでください。周囲へ助けを求め、直ちに119番へ通報して救急隊・通信指令員の指示を最優先にしてください。反応と呼吸を確認し、普段どおりの呼吸がない、または判断できない場合はAEDを手配して胸骨圧迫を開始してください。大量出血がある場合は、清潔なガーゼや布を傷口に当て、その上から手で強く連続して直接圧迫してください。片手で止まらなければ、両手で体重を乗せて圧迫してください。血液へ直接触れないよう、可能なら手袋やビニール袋を使って感染を防いでください。";

export const CHATBOT_PRIVACY_RESPONSE =
  "氏名、社員番号、連絡先、住所、病歴、診断名、健診結果などをこのチャットへ入力しないでください。必要な相談は『作業者A』『持病あり』のように、個人を特定できない最小限の情報へ置き換えてください。すでに入力した場合は、新しい相談を開始し、所属先の個人情報管理手順に従ってください。";

export const CHATBOT_AMBIGUOUS_RESPONSE =
  "資格要否は作業条件で変わります。作業内容・担当する役割、作業床の高さ、使用する機械や設備、電圧、材料・対象物、運転や操作の有無を、個人情報を含めずに教えてください。条件が不明なまま『資格不要』とは判断できません。";

export const CHATBOT_SAFETY_MANAGER_SCOPE_RESPONSE =
  "安全管理者は「常時50人以上」だけで一律に選任義務を判断できません。法定の業種に該当するかを確認する必要があります。業種、事業場単位の常時使用労働者数、専任要件を確認してください。根拠候補は労働安全衛生法第11条、同法施行令第3条、労働安全衛生規則第4条です。衛生管理者の人数等を定める安衛則第7条とは区別し、e-Gov原文と厚生労働省の安全衛生Q&Aで最終確認してください。条件が不足しているため、ここでは選任要否を確定しません。";

export const CHATBOT_ROSAI_80_PERCENT_RESPONSE =
  "前提の用語を分けて確認する必要があります。労働者災害補償保険法第14条の休業補償給付本体は、休業第4日目以降について給付基礎日額の60%を規定しています。一般に合計80%と説明される場合の残る20%は、別制度の休業特別支給金です。「休業補償給付そのものが80%」とは扱わず、厚生労働省の給付一覧とe-Gov原文で個別の支給要件を確認してください。誤った前提のまま回答を確定しません。";

export const CHATBOT_FALL_ARREST_REPLACEMENT_RESPONSE =
  "労働安全衛生規則第521条は、要求性能墜落制止用器具を安全に取り付けるための設備等と、その異常の有無の随時点検を定めますが、器具の一律の取替え時期までは同条本文から確定できません。点検義務と取替え基準を分け、器具の取扱説明書、製造者の基準、現場の管理手順、関係する公式指針を確認してください。条文だけで取替え時期を推測しません。";

export const CHATBOT_MACHINE_NOTICE_RESPONSE =
  "「機械等の製造時の届出」という前提では制度を特定できません。特定機械等の製造は労働安全衛生法第37条の製造許可、同法第88条は機械等の設置・移転・主要構造部分の変更等に関する計画の届出を扱うため、許可と届出を分ける必要があります。機械の種類、製造・設置・移転・変更のどの段階かを示してください。条件不足のまま第88条を製造時届出の根拠とは確定しません。";

export const CHATBOT_NOISE_85DB_RESPONSE =
  "85dBという数値基準を労働安全衛生規則第588条本文の措置義務として扱うことはできません。同条は「著しい騒音を発する屋内作業場」を列挙する規定で、85dBの数値は同条本文にありません。法令本文と騒音障害防止のための指針を分け、対象作業、測定値・測定方法、屋内外、ばく露時間を確認してください。承認済み指針本文を取得できていないため、ここでは措置義務を確定しません。";

export const CHATBOT_SPECIFIED_CHEMICAL_PERMISSION_RESPONSE =
  "「第一類物質を取り扱う作業はすべて許可制」という前提では確定できません。特定化学物質障害予防規則第48条は、労働安全衛生法第56条第1項と労働安全衛生法施行令第17条に関係する第一類物質の「製造許可」を扱う規定で、一般の取扱作業を一律に許可制とする条文ではありません。物質、製造か取扱いか、設備・作業条件を分け、e-Gov原文と所轄窓口で確認してください。";

export const CHATBOT_ASBESTOS_REPORT_ADDRESSEE_RESPONSE =
  "石綿の事前調査と結果報告は別の規定です。石綿障害予防規則第3条は事前調査、一定規模以上の工事等の結果報告は同規則第4条の2で、報告先は所轄労働基準監督署長です。「都道府県労働局長への報告」とした前提のまま結論を出しません。工事種別、床面積・請負金額等の条件を確認し、e-Gov原文と石綿事前調査結果報告システムの公式案内で最終確認してください。";

export const CHATBOT_FULL_HARNESS_SCOPE_RESPONSE =
  "高さ2m以上で作業床がないという情報だけでは、フルハーネス型を用いる作業の特別教育要否を確定できません。作業床を設けることが困難か、実際に要求性能墜落制止用器具を用いて行う作業か、ロープ高所作業に当たらないかを確認してください。安衛則第36条の対象条件を満たすかを確認するまで結論を保留します。";

export const CHATBOT_EDUCATION_RECORD_SCOPE_RESPONSE =
  "教育記録の保存は教育の種類で根拠が異なります。安衛則第38条は特別教育の受講者・科目等の記録を作成し3年間保存する規定で、安衛法第59条だけから全ての安全衛生教育に共通する保存期間を確定することはできません。雇入れ時教育、作業内容変更時教育、特別教育、職長教育のどれかを示してください。";

export const CHATBOT_SLING_LOAD_SCOPE_RESPONSE =
  "玉掛けは、つり上げ荷重と担当する作業で技能講習・特別教育の区分が変わります。つり上げ荷重1トン以上の玉掛け業務はクレーン則第221条、1トン未満は同第222条の確認が必要です。対象クレーン等のつり上げ荷重、玉掛けを行うか合図だけかを確認するまで、技能講習が必要とは確定しません。";

export const CHATBOT_ORGANIC_SOLVENT_SCOPE_RESPONSE =
  "有機溶剤業務で局所排気装置が常に唯一の措置とは限りません。有機溶剤の区分、屋内作業場等への該当、作業方法を確認し、有機則第5条が定める密閉設備・局所排気装置・プッシュプル型換気装置等の選択肢と個別の例外を確認する必要があります。条件不足のまま局所排気装置の一律義務とは確定しません。";

export const CHATBOT_LEAD_PROCESS_SCOPE_RESPONSE =
  "鉛業務は工程ごとに適用される措置が異なります。鉛則第5条は同規則第1条第5号イに掲げる鉛製錬等の設備に関する規定で、全ての鉛業務へ一律に拡張できません。対象物、鉛業務の区分、工程、設備、発散源を示してください。該当条文を特定できるまで結論を保留します。";

export const CHATBOT_ROSAI_CLAIM_PROCEDURE_RESPONSE =
  "労災保険法第13条は療養補償給付の内容を定める条文で、具体的な請求手続そのものを確定する条文ではありません。指定医療機関で療養の給付を受ける場合と、費用を立て替えて請求する場合で手続・様式が分かれます。承認済みコーパスに必要な施行規則・現行様式を収録していないため回答を保留し、厚生労働省・労働局の公式資料にある請求手続で確認してください。";

export const CHATBOT_CRANE_FIVE_TON_RESPONSE =
  "「つり上げ荷重5トンが製造許可の閾値」という前提は正確ではありません。クレーンの製造許可対象は、安衛令第12条の機械区分（原則としてつり上げ荷重3トン以上、スタツカー式は1トン以上）を確認し、クレーン則第3条の許可手続へつなげます。5トン以上は対象に含まれ得ますが、5トンを境界値として回答しません。クレーンの方式とつり上げ荷重を確認してください。";

export const CHATBOT_ACCIDENT_REPORT_SCOPE_RESPONSE =
  "「重大事故」だけでは報告様式と条文を特定できません。安衛則第96条は火災・爆発・倒壊・特定機械等の事故など列挙された事故の報告、同第97条は労働者の死亡・休業等に関する死傷病報告を扱い、両方が必要となる場合もあります。事故種別、死亡・休業の有無、機械・設備、被災者の有無を匿名化して確認してください。条件不足のまま第96条だけとは確定しません。";

export const CHATBOT_PNEUMOCONIOSIS_EXAM_SCOPE_RESPONSE =
  "じん肺健康診断は実施時点で根拠が分かれます。じん肺法第3条は健康診断の項目、第7条は就業時、第8条は定期の健康診断を扱います。新たな雇入れ・配置替え、在職中の定期、過去の粉じん作業従事など、どの時点・対象者かを確認してください。条件不足のまま一つの条文へ確定しません。";

export const CHATBOT_FALL_LOCATION_SCOPE_RESPONSE =
  "高さ2m以上という条件だけでは適用条文を一つに確定できません。一般の高所作業で作業床の設置が問題となる場合は安衛則第518条、作業床の端・開口部の囲い等が問題となる場合は同第519条など、場所と設備条件で分かれます。作業床の有無・設置困難性、端部か開口部か、囲い・手すりの状態を確認してください。";

export const CHATBOT_BOILER_INSTALL_SCOPE_RESPONSE =
  "ボイラーの設置に関する手続は、ボイラー区分と移動式かどうかで分かれます。非小型ボイラーの設置届、移動式ボイラー、小型ボイラーでは確認すべき規定・様式が同じではありません。ボイラーの種類、伝熱面積、移動式か、設置・変更のどの手続かを示してください。条件不足のままボイラー則第10条だけを対象範囲とは確定しません。";

export const CHATBOT_JOINT_COMMITTEE_PREMISE_RESPONSE =
  "「安全衛生委員会」に一律の単独設置義務があるという前提では判断できません。労働安全衛生法は、安全委員会（第17条）と衛生委員会（第18条）の設置要件を分け、両方を設けるべき場合に、それぞれに代えて安全衛生委員会を設置できる制度を第19条に定めています。業種、事業場単位の常時使用労働者数、対象業務を確認し、安全委員会・衛生委員会それぞれの要否から確認してください。";

export const CHATBOT_SCAFFOLD_MIDRAIL_PREMISE_RESPONSE =
  "「中さん等が2015年改正で初めて追加された」という前提は正確ではありません。厚生労働省の改正案内では、平成21年6月1日施行の足場規制ですでに、わく組足場以外について高さ85cm以上の手すり等に加えて中さん等を設ける措置が示されています。2015年改正の内容と混同せず、対象時点の安衛則第563条と厚生労働省の各改正資料を分けて確認してください。誤った改正年を前提に条文内容を確定しません。";

export const CHATBOT_HAZARDOUS_EDUCATION_SCOPE_RESPONSE =
  "「危険・有害業務」という総称だけでは、教育義務の種類と根拠を確定できません。雇入れ時・作業内容変更時の教育、法定の危険又は有害な業務に対する特別教育、危険有害業務従事者への安全衛生教育では、対象と法的位置付けが異なります。具体的な作業、使用設備・物質、担当役割、教育の時点を示してください。条件を確認するまで一律の義務とは回答しません。";

export const CHATBOT_FALL_ARREST_USE_SCOPE_RESPONSE =
  "墜落制止用器具の使用要否は、器具名だけでは確定できません。作業高さ、作業床の有無と設置困難性、床の端・開口部・足場・屋根等の場所、囲い・手すり等の設備、取付設備を確認してください。安衛則の場所別措置と、器具の選定・使用に関する公式資料を分けて確認し、条件不足のまま一つの条文を使用義務の根拠とは確定しません。";

export const CHATBOT_CRANE_QUALIFICATION_SCOPE_RESPONSE =
  "クレーン等の運転資格は、クレーン・移動式クレーン・デリックの別と、つり上げ荷重、担当する操作で免許・技能講習・特別教育の区分が変わります。機械の種類、つり上げ荷重、運転する設備と担当範囲を示してください。条件が揃うまで資格区分と根拠条文を確定しません。玉掛け資格とは分けて確認してください。";

export const CHATBOT_LOCAL_EXHAUST_PERFORMANCE_SCOPE_RESPONSE =
  "局所排気装置の性能要件は一律ではありません。対象物質と適用規則、有機溶剤・特定化学物質・鉛・粉じん等の作業区分、フード形式、発散源と作業方法を示してください。制御風速、排風量、構造、点検など異なる要件を混同せず、該当規則を特定できるまで数値や条文を確定しません。";

export const CHATBOT_IONIZING_DOSE_SCOPE_RESPONSE =
  "電離放射線の線量限度は一つの数値ではありません。対象者（放射線業務従事者、女性、妊娠中、緊急作業等）、実効線量か眼の水晶体・皮膚等の等価線量か、評価期間を示してください。対象と線量区分を確認するまで数値や根拠条文を確定しません。";

export const CHATBOT_PRESSURE_VESSEL_INSPECTION_SCOPE_RESPONSE =
  "圧力容器の「定期検査」だけでは制度を特定できません。第一種圧力容器、第二種圧力容器、小型圧力容器等の区分と、性能検査・定期自主検査など求める検査の種類を示してください。容器区分、内容物、最高使用圧力、内容積等を確認するまで、頻度や根拠条文を確定しません。";

export const CHATBOT_FORKLIFT_VEHICLE_INSPECTION_SCOPE_RESPONSE = [
  "結論",
  "「フォークリフトの車検」は、道路運送車両法側の車検を意味する可能性と、労働安全衛生規則上の年次・月次の定期自主検査を意味する可能性があります。制度と期限を混同しないため、どれを指すか分からない段階では期限を断定せず、資格・教育の条文を代わりの根拠として表示しません。",
  "",
  "条件",
  "・公道走行に関する車検か、構内作業用フォークリフトの自主検査か",
  "・自主検査なら年次か月次か",
  "",
  "次の質問",
  "確認したいのは、公道走行の車検・年次自主検査・月次自主検査のどれですか？",
].join("\n");

export const CHATBOT_ANNUAL_INSPECTION_SCOPE_RESPONSE = [
  "結論",
  "年次点検の義務は、設備・機械の種類によって根拠、点検項目、周期が変わります。対象設備が示されていないため、現時点では義務の有無や条文を一つに特定できず、別設備の条文を代わりの根拠として表示しません。",
  "",
  "条件",
  "・設備・機械の種類",
  "・法定検査、定期自主検査、保守点検のどれを確認したいか",
  "",
  "次の質問",
  "対象設備・機械の名称は何ですか？",
].join("\n");

export const CHATBOT_OSH_PENALTY_SCOPE_RESPONSE =
  "労働安全衛生法違反の罰則は一律ではありません。問題となる義務・禁止行為と条文、行為者、事業者・法人の別、違反内容を示してください。罰則規定と両罰規定を含む適用関係をe-Gov原文で確認する必要があり、違反条文を特定しないまま刑や罰金を確定しません。";

export const CHATBOT_SOURCE_GAP_RESPONSE =
  "結論\n確認できる公式資料の本文が不足しているため、回答を保留します。\n\n次の質問\n文書名・文書番号・発出日のどれかを教えてください。";

export const CHATBOT_APPROVED_CORPUS_GAP_RESPONSE =
  "結論\n確認できる公式本文が不足しているため、別の法令で代用せず回答を保留します。e-Gov法令検索または所管省庁の公式資料を確認してください。\n\n次の質問\n法令名・文書名・対象日のどれかを教えてください。";

export function evaluateChatbotSafety(message: string): ChatbotSafetyDecision | null {
  const forms = normalizedForms(message);
  const emergencyNormalized = withoutExplicitlyNegatedEmergencyStatements(
    forms.joined,
  );
  if (
    !isClearlyNonActiveEmergencyExample(emergencyNormalized) &&
    (EMERGENCY_PATTERNS.some((pattern) => pattern.test(emergencyNormalized)) ||
    ACTIVE_WORKPLACE_EMERGENCY_PATTERNS.some((pattern) =>
      pattern.test(emergencyNormalized),
    ) ||
    (WORKPLACE_HAZARD_PATTERN.test(emergencyNormalized) &&
      ACTIVE_INCIDENT_PATTERN.test(emergencyNormalized)) ||
    STANDALONE_ACTIVE_FIRE_PATTERN.test(emergencyNormalized) ||
    GENERIC_ACTIVE_WORKPLACE_INCIDENT_PATTERN.test(emergencyNormalized))
  ) {
    const emergencyCategory = emergencyCategoryFor(emergencyNormalized);
    return {
      kind: "emergency",
      response:
        emergencyCategory === "severe-bleeding"
          ? CHATBOT_SEVERE_BLEEDING_RESPONSE
          : CHATBOT_EMERGENCY_RESPONSE,
      safeUserText: "[緊急事象の相談を検知]",
      emergencyCategory,
    };
  }

  const normalized = forms.compact;
  const sensitiveKinds = detectChatbotSensitiveData(message);
  const asksAboutPrivacy = PRIVACY_INTENT_PATTERNS.some((pattern) => pattern.test(normalized));
  // Health data and direct identifiers are each sensitive on their own. Do
  // not require them to appear together before stopping persistence/network.
  if (sensitiveKinds.length > 0 || asksAboutPrivacy) {
    return { kind: "privacy", response: CHATBOT_PRIVACY_RESPONSE, safeUserText: "[個人情報・健康情報を含む可能性がある入力を遮断]" };
  }

  const assertsJointCommitteeMandate =
    /安全衛生委員会/.test(normalized) &&
    /(?:設置義務|設置が義務|設置しなければ|設ける義務|設けなければ|置く義務|置かなければ|必ず.*設置|設置.*必須|必置|何人以上.*設置)/.test(
      normalized,
    );
  if (assertsJointCommitteeMandate) {
    return {
      kind: "wrong-premise",
      response: CHATBOT_JOINT_COMMITTEE_PREMISE_RESPONSE,
      safeUserText: message,
    };
  }

  const assertsMidrailWasAddedIn2015 =
    /(?:2015年|平成27年)/.test(normalized) &&
    /(?:中さん|中桟|中棧)/.test(normalized) &&
    /(?:追加|新設|初めて|義務化|導入)/.test(normalized) &&
    /(?:足場|手すり|第?563条)/.test(normalized);
  if (assertsMidrailWasAddedIn2015) {
    return {
      kind: "wrong-premise",
      response: CHATBOT_SCAFFOLD_MIDRAIL_PREMISE_RESPONSE,
      safeUserText: message,
    };
  }

  if (DANGEROUS_WORK_EDUCATION_PATTERN.test(normalized)) {
    return {
      kind: "ambiguous",
      response: CHATBOT_HAZARDOUS_EDUCATION_SCOPE_RESPONSE,
      safeUserText: message,
    };
  }
  if (
    FALL_ARREST_USE_PATTERN.test(normalized) &&
    !FALL_ARREST_WORK_CONTEXT.test(normalized)
  ) {
    return {
      kind: "ambiguous",
      response: CHATBOT_FALL_ARREST_USE_SCOPE_RESPONSE,
      safeUserText: message,
    };
  }
  if (
    CRANE_OPERATION_QUALIFICATION_PATTERN.test(normalized) &&
    !CRANE_LOAD_CONTEXT.test(normalized)
  ) {
    return {
      kind: "ambiguous",
      response: CHATBOT_CRANE_QUALIFICATION_SCOPE_RESPONSE,
      safeUserText: message,
    };
  }
  if (
    LOCAL_EXHAUST_PERFORMANCE_PATTERN.test(normalized) &&
    !LOCAL_EXHAUST_REGULATION_CONTEXT.test(normalized)
  ) {
    return {
      kind: "ambiguous",
      response: CHATBOT_LOCAL_EXHAUST_PERFORMANCE_SCOPE_RESPONSE,
      safeUserText: message,
    };
  }
  if (
    IONIZING_DOSE_LIMIT_PATTERN.test(normalized) &&
    (!IONIZING_DOSE_SUBJECT_CONTEXT.test(normalized) ||
      !IONIZING_DOSE_TYPE_CONTEXT.test(normalized))
  ) {
    return {
      kind: "ambiguous",
      response: CHATBOT_IONIZING_DOSE_SCOPE_RESPONSE,
      safeUserText: message,
    };
  }
  if (
    PRESSURE_VESSEL_INSPECTION_PATTERN.test(normalized) &&
    !PRESSURE_VESSEL_CLASS_CONTEXT.test(normalized)
  ) {
    return {
      kind: "ambiguous",
      response: CHATBOT_PRESSURE_VESSEL_INSPECTION_SCOPE_RESPONSE,
      safeUserText: message,
    };
  }
  if (FORKLIFT_VEHICLE_INSPECTION_SCOPE_PATTERN.test(normalized)) {
    return {
      kind: "scope-hold",
      response: CHATBOT_FORKLIFT_VEHICLE_INSPECTION_SCOPE_RESPONSE,
      safeUserText: message,
    };
  }
  if (
    ANNUAL_INSPECTION_SCOPE_PATTERN.test(normalized) &&
    !INSPECTION_TARGET_CONTEXT.test(normalized)
  ) {
    return {
      kind: "scope-hold",
      response: CHATBOT_ANNUAL_INSPECTION_SCOPE_RESPONSE,
      safeUserText: message,
    };
  }
  if (MAJOR_INCIDENT_REPORT_PATTERN.test(normalized)) {
    return {
      kind: "ambiguous",
      response: CHATBOT_ACCIDENT_REPORT_SCOPE_RESPONSE,
      safeUserText: message,
    };
  }
  if (
    OSH_PENALTY_SCOPE_PATTERN.test(normalized) &&
    !SPECIFIC_ARTICLE_CONTEXT.test(normalized)
  ) {
    return {
      kind: "ambiguous",
      response: CHATBOT_OSH_PENALTY_SCOPE_RESPONSE,
      safeUserText: message,
    };
  }

  if (
    QUALIFICATION_DECISION_PATTERNS.some((pattern) =>
      pattern.test(normalized),
    ) &&
    !QUALIFICATION_CONTEXT.some((pattern) => pattern.test(normalized)) &&
    !LEGAL_REFERENCE_OR_DEFINITION_PATTERN.test(normalized) &&
    !QUALIFICATION_OVERVIEW_PATTERN.test(normalized)
  ) {
    return { kind: "ambiguous", response: CHATBOT_AMBIGUOUS_RESPONSE, safeUserText: message };
  }
  if (
    SAFETY_MANAGER_SCOPE_PATTERN.test(normalized) &&
    !SAFETY_MANAGER_INDUSTRY_CONTEXT.test(normalized)
  ) {
    return {
      kind: "ambiguous",
      response: CHATBOT_SAFETY_MANAGER_SCOPE_RESPONSE,
      safeUserText: message,
    };
  }
  if (
    /高さ2m以上.*作業床(?:が|の)?ない.*フルハーネス.*特別教育|フルハーネス.*特別教育.*高さ2m以上.*作業床(?:が|の)?ない/.test(
      normalized,
    ) &&
    !/作業床を設けることが困難/.test(normalized)
  ) {
    return {
      kind: "ambiguous",
      response: CHATBOT_FULL_HARNESS_SCOPE_RESPONSE,
      safeUserText: message,
    };
  }
  if (
    /安全衛生教育.*記録.*保存|教育記録.*保存.*安全衛生/.test(
      normalized,
    ) &&
    !/特別教育/.test(normalized)
  ) {
    return {
      kind: "ambiguous",
      response: CHATBOT_EDUCATION_RECORD_SCOPE_RESPONSE,
      safeUserText: message,
    };
  }
  if (
    /玉掛け?.*(?:資格|技能講習|特別教育)/.test(normalized) &&
    !SLING_LOAD_CONTEXT.test(normalized) &&
    !(
      LEGAL_REFERENCE_OR_DEFINITION_PATTERN.test(normalized) &&
      !INDIVIDUAL_TRAINING_DECISION_PATTERN.test(normalized)
    ) &&
    !(
      SLING_TRAINING_OVERVIEW_PATTERN.test(normalized) &&
      !INDIVIDUAL_TRAINING_DECISION_PATTERN.test(normalized)
    )
  ) {
    return {
      kind: "ambiguous",
      response: CHATBOT_SLING_LOAD_SCOPE_RESPONSE,
      safeUserText: message,
    };
  }
  if (
    /有機溶剤業務.*局所排気装置.*(?:設置義務|義務)/.test(normalized) &&
    !/(?:第一種|第二種|第三種|屋内|タンク|ピット|坑内)/.test(normalized)
  ) {
    return {
      kind: "ambiguous",
      response: CHATBOT_ORGANIC_SOLVENT_SCOPE_RESPONSE,
      safeUserText: message,
    };
  }
  if (
    /鉛業務.*(?:ばく露|曝露)防止措置/.test(normalized) &&
    !/(?:製錬|溶融|粉砕|研磨|はんだ|塗装|蓄電池)/.test(normalized)
  ) {
    return {
      kind: "ambiguous",
      response: CHATBOT_LEAD_PROCESS_SCOPE_RESPONSE,
      safeUserText: message,
    };
  }
  if (/重大事故.*(?:労基署|労働基準監督署).*報告/.test(normalized)) {
    return {
      kind: "ambiguous",
      response: CHATBOT_ACCIDENT_REPORT_SCOPE_RESPONSE,
      safeUserText: message,
    };
  }
  if (
    /(?:じん肺|粉じん作業).*(?:健康診断|健診).*(?:対象|条文|根拠)/.test(normalized) &&
    !/(?:雇い入れ|雇入れ|配置替え|定期|過去に従事|離職)/.test(normalized)
  ) {
    return {
      kind: "ambiguous",
      response: CHATBOT_PNEUMOCONIOSIS_EXAM_SCOPE_RESPONSE,
      safeUserText: message,
    };
  }
  if (
    /高さ(?:が)?2m以上.*墜落.*(?:措置義務|防止)|墜落.*高さ(?:が)?2m以上.*(?:措置義務|防止)/.test(
      normalized,
    ) &&
    !/(?:開口部|作業床|床の端|屋根|足場)/.test(normalized)
  ) {
    return {
      kind: "ambiguous",
      response: CHATBOT_FALL_LOCATION_SCOPE_RESPONSE,
      safeUserText: message,
    };
  }
  if (
    /ボイラー.*設置届.*(?:対象|根拠)|ボイラー.*設置届出.*(?:対象|根拠)/.test(
      normalized,
    ) &&
    !/(?:小型|移動式|伝熱面積)/.test(normalized)
  ) {
    return {
      kind: "ambiguous",
      response: CHATBOT_BOILER_INSTALL_SCOPE_RESPONSE,
      safeUserText: message,
    };
  }
  if (/休業(?:補償)?給付.*(?:80%|80％|八十パーセント)/.test(normalized)) {
    return {
      kind: "wrong-premise",
      response: CHATBOT_ROSAI_80_PERCENT_RESPONSE,
      safeUserText: message,
    };
  }
  if (
    /(?:つり上げ荷重|吊り上げ荷重)5トン以上.*クレーン.*製造許可|クレーン.*製造許可.*(?:つり上げ荷重|吊り上げ荷重)5トン以上/.test(
      normalized,
    )
  ) {
    return {
      kind: "wrong-premise",
      response: CHATBOT_CRANE_FIVE_TON_RESPONSE,
      safeUserText: message,
    };
  }
  if (
    /(?:墜落制止用器具|要求性能墜落制止用器具|安全帯).*(?:取替|交換).*(?:基準|時期|条文)/.test(
      normalized,
    )
  ) {
    return {
      kind: "wrong-premise",
      response: CHATBOT_FALL_ARREST_REPLACEMENT_RESPONSE,
      safeUserText: message,
    };
  }
  if (
    /機械等.*製造時.*届出|製造時.*機械等.*届出/.test(normalized)
  ) {
    return {
      kind: "wrong-premise",
      response: CHATBOT_MACHINE_NOTICE_RESPONSE,
      safeUserText: message,
    };
  }
  if (
    /(?:85dB|85デシベル).*(?:措置義務|条文)|(?:措置義務|条文).*(?:85dB|85デシベル)/i.test(
      normalized,
    )
  ) {
    return {
      kind: "wrong-premise",
      response: CHATBOT_NOISE_85DB_RESPONSE,
      safeUserText: message,
    };
  }
  if (
    /特定化学物質.*(?:第1類|第一類).*(?:取扱|取り扱).*(?:許可制|許可).*(?:条文|根拠)?/.test(
      normalized,
    )
  ) {
    return {
      kind: "wrong-premise",
      response: CHATBOT_SPECIFIED_CHEMICAL_PERMISSION_RESPONSE,
      safeUserText: message,
    };
  }
  if (
    /石綿.*事前調査.*都道府県労働局長.*報告|石綿.*都道府県労働局長.*事前調査.*報告/.test(
      normalized,
    )
  ) {
    return {
      kind: "wrong-premise",
      response: CHATBOT_ASBESTOS_REPORT_ADDRESSEE_RESPONSE,
      safeUserText: message,
    };
  }
  if (
    /業務上.*負傷.*療養補償給付.*請求|療養補償給付.*請求.*条文/.test(
      normalized,
    )
  ) {
    return {
      kind: "source-gap",
      response: CHATBOT_ROSAI_CLAIM_PROCEDURE_RESPONSE,
      safeUserText: message,
    };
  }
  if (
    LEGAL_SOURCE_GAP_PATTERN.test(normalized) &&
    !isAnswerFirstMaterialPresentation(normalized)
  ) {
    return {
      kind: "source-gap",
      response: CHATBOT_SOURCE_GAP_RESPONSE,
      safeUserText: message,
    };
  }
  if (EXPLICIT_OUT_OF_SCOPE_LAW_PATTERN.test(normalized)) {
    return {
      kind: "source-gap",
      response: CHATBOT_APPROVED_CORPUS_GAP_RESPONSE,
      safeUserText: message,
    };
  }
  if (
    APPROVED_CORPUS_GAP_PATTERNS.some((pattern) => pattern.test(normalized))
  ) {
    return {
      kind: "source-gap",
      response: CHATBOT_APPROVED_CORPUS_GAP_RESPONSE,
      safeUserText: message,
    };
  }
  return null;
}

export function inspectChatbotHistory(history: ChatbotTextRecord[]): ChatbotHistoryInspection {
  const blockedIndexes: number[] = [];
  const kinds = new Set<ChatbotSafetyKind>();
  history.forEach((turn, index) => {
    const decision = evaluateChatbotSafety(turn.content);
    if (
      decision &&
      (decision.kind === "emergency" || decision.kind === "privacy")
    ) {
      blockedIndexes.push(index);
      kinds.add(decision.kind);
    }
  });
  return { safe: blockedIndexes.length === 0, kinds: [...kinds], blockedIndexes };
}

/** 旧版・インポート由来の危険なターンを、生値をログへ出さず破棄する。 */
export function migrateChatbotHistory<T extends ChatbotTextRecord>(history: T[]): {
  messages: T[];
  removedCount: number;
  kinds: ChatbotSafetyKind[];
} {
  const inspection = inspectChatbotHistory(history);
  if (inspection.safe) return { messages: history, removedCount: 0, kinds: [] };
  const blocked = new Set(inspection.blockedIndexes);
  return {
    messages: history.filter((_, index) => !blocked.has(index)),
    removedCount: blocked.size,
    kinds: inspection.kinds,
  };
}
