import type {
  SafetyChoiceExplanation,
  SafetyQuestion,
} from "./types";

const OSH_ACT_URL = "https://laws.e-gov.go.jp/law/347AC0000000057";
const OSH_ORDER_URL = "https://laws.e-gov.go.jp/law/347CO0000000318";
const OSH_RULE_URL = "https://laws.e-gov.go.jp/law/347M50002000032";

function explanation(
  choiceId: string,
  verdict: SafetyChoiceExplanation["verdict"],
  shortReason: string,
  detailedReason: string,
  sourceFactIds: readonly string[],
  officialLinks: readonly string[],
): SafetyChoiceExplanation {
  return {
    choiceId,
    verdict,
    shortReason,
    detailedReason,
    sourceFactIds,
    officialLinks,
    verified: true,
  };
}

type QuestionInput = Omit<
  SafetyQuestion,
  | "sourceMode"
  | "sourceQuestionId"
  | "sourceYear"
  | "sourceQuestionNumber"
  | "currentLawAsOf"
  | "currentLawChanged"
  | "rightsStatus"
  | "reviewStatus"
  | "generatedAt"
  | "verifiedAt"
  | "interactionType"
  | "shuffleMode"
  | "orderSensitive"
  | "answerAuthority"
>;

function originalQuestion(input: QuestionInput): SafetyQuestion {
  return {
    ...input,
    sourceMode: "original_source_grounded",
    sourceQuestionId: null,
    sourceYear: null,
    sourceQuestionNumber: null,
    currentLawAsOf: "2026-08-09",
    currentLawChanged: false,
    rightsStatus: "user_authored",
    reviewStatus: "independently_reviewed",
    generatedAt: "2026-08-09T09:00:00+09:00",
    verifiedAt: "2026-08-09T10:22:00+09:00",
    interactionType: "single_choice",
    shuffleMode: "fixed",
    orderSensitive: true,
    answerAuthority: "official_primary_source_fact",
  };
}

export const SAFETY_QUESTIONS = [
  originalQuestion({
    questionId: "h1-appointment-threshold-001",
    qualificationId: "eisei-kanrisha-1shu",
    subjectId: "health-officer-related-laws",
    questionText:
      "常時73人の労働者を使用する事業場について、衛生管理者の選任に関する対応として適切なものはどれですか。",
    choices: [
      { choiceId: "appoint", text: "事業者が衛生管理者を選任する" },
      { choiceId: "committee-only", text: "衛生委員会だけを設け、衛生管理者は選任しない" },
      { choiceId: "wait-100", text: "常時100人になるまで選任しない" },
      { choiceId: "worker-choice", text: "選任するかどうかを労働者の多数決だけで決める" },
    ],
    officialCorrectChoiceIds: ["appoint"],
    answerEvidenceIds: [
      "osh-order-4-health-manager-threshold",
      "osh-act-12-employer-appoints-health-manager",
    ],
    explanationByChoice: [
      explanation(
        "appoint",
        "correct",
        "常時50人以上の事業場は衛生管理者の選任対象です。73人はこの基準を満たします。",
        "施行令第4条の規模に該当するため、法第12条第1項により事業者が衛生管理者を選任します。",
        ["osh-order-4-health-manager-threshold", "osh-act-12-employer-appoints-health-manager"],
        [OSH_ORDER_URL, OSH_ACT_URL],
      ),
      explanation(
        "committee-only",
        "incorrect",
        "衛生委員会を設けても、衛生管理者の選任義務の代わりにはなりません。",
        "73人の事業場は施行令第4条の規模に該当し、法第12条第1項に基づく事業者の選任が必要です。委員会だけではその選任になりません。",
        ["osh-order-4-health-manager-threshold", "osh-act-12-employer-appoints-health-manager"],
        [OSH_ORDER_URL, OSH_ACT_URL],
      ),
      explanation(
        "wait-100",
        "incorrect",
        "基準は100人ではなく、常時50人以上です。",
        "73人の時点で施行令第4条の基準に達しているため、100人まで待つ扱いはできません。",
        ["osh-order-4-health-manager-threshold"],
        [OSH_ORDER_URL],
      ),
      explanation(
        "worker-choice",
        "incorrect",
        "選任義務を負うのは事業者で、多数決だけで免除されません。",
        "法第12条により、衛生管理者を選任する義務を負うのは事業者です。",
        ["osh-act-12-employer-appoints-health-manager"],
        [OSH_ACT_URL],
      ),
    ],
    officialSourceLinks: [OSH_ORDER_URL, OSH_ACT_URL],
    lawSources: [
      {
        sourceId: "egov-osh-order",
        locator: "第4条",
        sourceFactIds: ["osh-order-4-health-manager-threshold"],
      },
      {
        sourceId: "egov-osh-act",
        locator: "第12条第1項",
        sourceFactIds: ["osh-act-12-employer-appoints-health-manager"],
      },
    ],
    lawAsOf: "2026-04-01",
  }),
  originalQuestion({
    questionId: "h1-listed-industry-license-002",
    qualificationId: "eisei-kanrisha-1shu",
    subjectId: "health-officer-related-laws",
    questionText:
      "製造業の事業場で衛生管理者を選任します。免許区分として選任対象に含まれるものはどれですか。",
    choices: [
      { choiceId: "first", text: "第一種衛生管理者免許" },
      { choiceId: "second-only", text: "第二種衛生管理者免許だけ" },
      { choiceId: "foreman", text: "免許等を持たない職長経験者" },
      { choiceId: "committee", text: "衛生委員会の委員であれば資格を問わない" },
    ],
    officialCorrectChoiceIds: ["first"],
    answerEvidenceIds: ["osh-rule-7-listed-industries-first-class"],
    explanationByChoice: [
      explanation(
        "first",
        "correct",
        "製造業は列挙業種で、第一種衛生管理者免許は選任対象に含まれます。",
        "労働安全衛生規則第7条第1項第3号イは、製造業について第一種衛生管理者免許など所定の資格を挙げています。",
        ["osh-rule-7-listed-industries-first-class"],
        [OSH_RULE_URL],
      ),
      explanation(
        "second-only",
        "incorrect",
        "製造業では第二種免許だけを根拠に選任する扱いではありません。",
        "製造業は規則第7条第1項第3号イの列挙業種であり、第二種免許だけを根拠に選任できる区分ではありません。",
        ["osh-rule-7-listed-industries-first-class"],
        [OSH_RULE_URL],
      ),
      explanation(
        "foreman",
        "incorrect",
        "職長経験だけでは、同条が定める選任資格を満たしたことになりません。",
        "列挙業種では第一種免許、衛生工学免許または規則が別に認める資格者から選任します。",
        ["osh-rule-7-listed-industries-first-class"],
        [OSH_RULE_URL],
      ),
      explanation(
        "committee",
        "incorrect",
        "委員であることと、衛生管理者の選任資格は別です。",
        "衛生管理者の選任資格は労働安全衛生規則第7条で限定され、委員就任だけでは置き換えられません。",
        ["osh-rule-7-listed-industries-first-class"],
        [OSH_RULE_URL],
      ),
    ],
    officialSourceLinks: [OSH_RULE_URL],
    lawSources: [
      {
        sourceId: "egov-osh-regulations",
        locator: "第7条第1項第3号イ",
        sourceFactIds: ["osh-rule-7-listed-industries-first-class"],
      },
    ],
    lawAsOf: "2026-08-01",
  }),
  originalQuestion({
    questionId: "h1-weekly-patrol-003",
    qualificationId: "eisei-kanrisha-1shu",
    subjectId: "health-officer-occupational-hygiene",
    questionText:
      "衛生管理者が行う作業場等の定期巡視について、法令上の頻度として適切なものはどれですか。",
    choices: [
      { choiceId: "weekly", text: "少なくとも毎週1回" },
      { choiceId: "monthly", text: "少なくとも毎月1回" },
      { choiceId: "quarterly", text: "少なくとも3か月に1回" },
      { choiceId: "yearly", text: "少なくとも毎年1回" },
    ],
    officialCorrectChoiceIds: ["weekly"],
    answerEvidenceIds: ["osh-rule-11-health-manager-weekly-patrol"],
    explanationByChoice: [
      explanation(
        "weekly",
        "correct",
        "衛生管理者は少なくとも毎週1回、作業場等を巡視します。",
        "巡視で有害のおそれを見つけた場合は、直ちに健康障害防止に必要な措置を講じます。",
        ["osh-rule-11-health-manager-weekly-patrol"],
        [OSH_RULE_URL],
      ),
      explanation(
        "monthly",
        "incorrect",
        "月1回では、法令の『少なくとも毎週1回』を満たしません。",
        "労働安全衛生規則第11条第1項は月単位ではなく週単位で最低頻度を定めています。",
        ["osh-rule-11-health-manager-weekly-patrol"],
        [OSH_RULE_URL],
      ),
      explanation(
        "quarterly",
        "incorrect",
        "3か月に1回では頻度が不足します。",
        "必要な最低頻度は少なくとも毎週1回です。",
        ["osh-rule-11-health-manager-weekly-patrol"],
        [OSH_RULE_URL],
      ),
      explanation(
        "yearly",
        "incorrect",
        "年1回では頻度が大きく不足します。",
        "労働安全衛生規則第11条第1項の最低頻度は毎週1回です。",
        ["osh-rule-11-health-manager-weekly-patrol"],
        [OSH_RULE_URL],
      ),
    ],
    officialSourceLinks: [OSH_RULE_URL],
    lawSources: [
      {
        sourceId: "egov-osh-regulations",
        locator: "第11条第1項",
        sourceFactIds: ["osh-rule-11-health-manager-weekly-patrol"],
      },
    ],
    lawAsOf: "2026-08-01",
  }),
  originalQuestion({
    questionId: "h1-health-committee-members-004",
    qualificationId: "eisei-kanrisha-1shu",
    subjectId: "health-officer-related-laws",
    questionText:
      "衛生委員会の法定構成員に関する説明として適切なものはどれですか。",
    choices: [
      { choiceId: "manager-doctor", text: "衛生管理者と産業医から事業者が指名する者を含む" },
      { choiceId: "union-only", text: "労働組合の役員だけで構成する" },
      { choiceId: "customers", text: "主要顧客の代表を必ず含める" },
      { choiceId: "consultant-required", text: "外部の労働衛生コンサルタントだけで構成する" },
    ],
    officialCorrectChoiceIds: ["manager-doctor"],
    answerEvidenceIds: ["osh-act-18-health-committee-members"],
    explanationByChoice: [
      explanation(
        "manager-doctor",
        "correct",
        "法は、衛生管理者と産業医のうちから事業者が指名する者を構成員に含めています。",
        "そのほか、事業実施を統括管理する者等と、衛生経験を持つ労働者から指名する者などで構成します。",
        ["osh-act-18-health-committee-members"],
        [OSH_ACT_URL],
      ),
      explanation(
        "union-only",
        "incorrect",
        "衛生委員会は労働組合役員だけで構成する制度ではありません。",
        "法第18条第2項は衛生管理者、産業医、衛生経験者等の構成を定めています。",
        ["osh-act-18-health-committee-members"],
        [OSH_ACT_URL],
      ),
      explanation(
        "customers",
        "incorrect",
        "主要顧客の代表は法定構成員として定められていません。",
        "法定構成は事業場の安全衛生管理に関係する者を中心に定められています。",
        ["osh-act-18-health-committee-members"],
        [OSH_ACT_URL],
      ),
      explanation(
        "consultant-required",
        "incorrect",
        "外部コンサルタントだけで構成する制度ではありません。",
        "法第18条第2項は、衛生管理者、産業医、衛生経験者などの構成員を定めています。",
        ["osh-act-18-health-committee-members"],
        [OSH_ACT_URL],
      ),
    ],
    officialSourceLinks: [OSH_ACT_URL],
    lawSources: [
      {
        sourceId: "egov-osh-act",
        locator: "第18条第2項",
        sourceFactIds: ["osh-act-18-health-committee-members"],
      },
    ],
    lawAsOf: "2026-04-01",
  }),
  originalQuestion({
    questionId: "h2-second-class-scope-001",
    qualificationId: "eisei-kanrisha-2shu",
    subjectId: "health-officer-related-laws",
    questionText:
      "労働安全衛生規則第7条第1項第3号イの列挙業種に該当しない事業場で、衛生管理者の選任資格について適切な説明はどれですか。",
    choices: [
      { choiceId: "second-allowed", text: "第二種衛生管理者免許を持つ者も選任対象になり得る" },
      { choiceId: "second-never", text: "第二種衛生管理者免許はどの業種でも選任に使えない" },
      { choiceId: "no-qualification", text: "人数基準を満たせば資格は一切不要になる" },
      { choiceId: "vote", text: "労働者投票で選ばれれば資格は不要になる" },
    ],
    officialCorrectChoiceIds: ["second-allowed"],
    answerEvidenceIds: ["osh-rule-7-other-industries-second-class"],
    explanationByChoice: [
      explanation(
        "second-allowed",
        "correct",
        "列挙業種以外では、第二種衛生管理者免許を持つ者も選任対象に含まれます。",
        "労働安全衛生規則第7条第1項第3号ロが、第一種・第二種・衛生工学の各免許などを挙げています。",
        ["osh-rule-7-other-industries-second-class"],
        [OSH_RULE_URL],
      ),
      explanation(
        "second-never",
        "incorrect",
        "第二種免許は列挙業種以外で選任資格として認められています。",
        "『どの業種でも使えない』という説明は同号ロと反します。",
        ["osh-rule-7-other-industries-second-class"],
        [OSH_RULE_URL],
      ),
      explanation(
        "no-qualification",
        "incorrect",
        "人数基準を満たしても、選任資格の条件はなくなりません。",
        "規則第7条は業種に応じて選任対象となる免許・資格を明示しています。",
        ["osh-rule-7-other-industries-second-class"],
        [OSH_RULE_URL],
      ),
      explanation(
        "vote",
        "incorrect",
        "投票は法定の免許・資格条件を置き換えません。",
        "衛生管理者は規則第7条が定める資格者から選任します。",
        ["osh-rule-7-other-industries-second-class"],
        [OSH_RULE_URL],
      ),
    ],
    officialSourceLinks: [OSH_RULE_URL],
    lawSources: [
      {
        sourceId: "egov-osh-regulations",
        locator: "第7条第1項第3号ロ",
        sourceFactIds: ["osh-rule-7-other-industries-second-class"],
      },
    ],
    lawAsOf: "2026-08-01",
  }),
  originalQuestion({
    questionId: "h2-manager-minimum-275-002",
    qualificationId: "eisei-kanrisha-2shu",
    subjectId: "health-officer-related-laws",
    questionText:
      "常時275人の労働者を使用する事業場で、規則の人数表が求める衛生管理者の最低人数はどれですか。",
    choices: [
      { choiceId: "one", text: "1人以上" },
      { choiceId: "two", text: "2人以上" },
      { choiceId: "three", text: "3人以上" },
      { choiceId: "six", text: "6人以上" },
    ],
    officialCorrectChoiceIds: ["two"],
    answerEvidenceIds: ["osh-rule-7-health-manager-count-201-500"],
    explanationByChoice: [
      explanation(
        "one",
        "incorrect",
        "275人の事業場について、最低必要数を1人とする説明は誤りです。",
        "275人は『200人を超え500人以下』の区分に入り、規則の表は2人以上を求めます。",
        ["osh-rule-7-health-manager-count-201-500"],
        [OSH_RULE_URL],
      ),
      explanation(
        "two",
        "correct",
        "275人は200人を超え500人以下の区分なので、最低人数は2人です。",
        "労働安全衛生規則第7条第1項第4号の表は、この区分について2人以上の選任を求めています。",
        ["osh-rule-7-health-manager-count-201-500"],
        [OSH_RULE_URL],
      ),
      explanation(
        "three",
        "incorrect",
        "3人を選任することは禁止されませんが、規則が求める最低人数は3人ではありません。",
        "275人の区分で表が求めるのは2人以上であり、『3人以上が最低基準』という説明は不正確です。",
        ["osh-rule-7-health-manager-count-201-500"],
        [OSH_RULE_URL],
      ),
      explanation(
        "six",
        "incorrect",
        "6人を選任することは禁止されませんが、275人の最低基準を6人以上とする表ではありません。",
        "275人は200人超500人以下の区分で、表が求める最低人数は2人です。",
        ["osh-rule-7-health-manager-count-201-500"],
        [OSH_RULE_URL],
      ),
    ],
    officialSourceLinks: [OSH_RULE_URL],
    lawSources: [
      {
        sourceId: "egov-osh-regulations",
        locator: "第7条第1項第4号の表",
        sourceFactIds: ["osh-rule-7-health-manager-count-201-500"],
      },
    ],
    lawAsOf: "2026-08-01",
  }),
  originalQuestion({
    questionId: "h2-under-threshold-003",
    qualificationId: "eisei-kanrisha-2shu",
    subjectId: "health-officer-related-laws",
    questionText:
      "常時49人の労働者を使用する事業場について、衛生管理者の人数基準だけに着目した説明として適切なものはどれですか。",
    choices: [
      { choiceId: "below", text: "施行令第4条の50人基準には達していない" },
      { choiceId: "one", text: "必ず衛生管理者を1人選任する規模である" },
      { choiceId: "two", text: "必ず衛生管理者を2人選任する規模である" },
      { choiceId: "committee-replaces", text: "衛生委員会を設ければ人数基準はなくなる" },
    ],
    officialCorrectChoiceIds: ["below"],
    answerEvidenceIds: ["osh-order-4-health-manager-threshold"],
    explanationByChoice: [
      explanation(
        "below",
        "correct",
        "49人は、施行令第4条の『常時50人以上』には達していません。",
        "これは衛生管理者の人数基準だけの判断です。他の安全衛生上の義務がなくなる意味ではありません。",
        ["osh-order-4-health-manager-threshold"],
        [OSH_ORDER_URL],
      ),
      explanation(
        "one",
        "incorrect",
        "法定選任規模は常時50人以上で、49人は人数基準未満です。",
        "49人は施行令第4条の選任対象規模に達していないため、規模だけから1人の選任が必須とはいえません。",
        ["osh-order-4-health-manager-threshold"],
        [OSH_ORDER_URL],
      ),
      explanation(
        "two",
        "incorrect",
        "49人は選任基準未満で、2人区分ではありません。",
        "49人は施行令第4条の選任対象規模に達していないため、規模だけから2人の選任が必須とはいえません。",
        ["osh-order-4-health-manager-threshold"],
        [OSH_ORDER_URL],
      ),
      explanation(
        "committee-replaces",
        "incorrect",
        "委員会の設置は衛生管理者の人数基準を置き換えません。",
        "衛生管理者を選任する事業者の義務と対象規模は、法第12条第1項と施行令第4条で定められ、委員会の設置で人数基準が消える規定ではありません。",
        ["osh-order-4-health-manager-threshold", "osh-act-12-employer-appoints-health-manager"],
        [OSH_ORDER_URL, OSH_ACT_URL],
      ),
    ],
    officialSourceLinks: [OSH_ORDER_URL, OSH_ACT_URL],
    lawSources: [
      {
        sourceId: "egov-osh-order",
        locator: "第4条",
        sourceFactIds: ["osh-order-4-health-manager-threshold"],
      },
      {
        sourceId: "egov-osh-act",
        locator: "第12条第1項",
        sourceFactIds: ["osh-act-12-employer-appoints-health-manager"],
      },
    ],
    lawAsOf: "2026-04-01",
  }),
  originalQuestion({
    questionId: "h2-committee-cycle-record-004",
    qualificationId: "eisei-kanrisha-2shu",
    subjectId: "health-officer-occupational-hygiene",
    questionText:
      "衛生委員会の開催頻度と重要な議事等の記録保存期間の組合せとして適切なものはどれですか。",
    choices: [
      { choiceId: "monthly-three", text: "毎月1回以上・3年間保存" },
      { choiceId: "quarter-one", text: "3か月に1回・1年間保存" },
      { choiceId: "year-five", text: "毎年1回・5年間保存" },
      { choiceId: "optional", text: "開催も保存も任意" },
    ],
    officialCorrectChoiceIds: ["monthly-three"],
    answerEvidenceIds: [
      "osh-rule-23-committee-monthly",
      "osh-rule-23-committee-record-three-years",
    ],
    explanationByChoice: [
      explanation(
        "monthly-three",
        "correct",
        "委員会は毎月1回以上開催し、所定の記録を3年間保存します。",
        "開催頻度は規則第23条第1項、意見・措置・重要議事の記録保存は同条第4項に定められています。",
        ["osh-rule-23-committee-monthly", "osh-rule-23-committee-record-three-years"],
        [OSH_RULE_URL],
      ),
      explanation(
        "quarter-one",
        "incorrect",
        "開催は毎月1回以上、記録は3年間保存です。",
        "3か月に1回・1年間では、頻度と保存期間の両方が不足します。",
        ["osh-rule-23-committee-monthly", "osh-rule-23-committee-record-three-years"],
        [OSH_RULE_URL],
      ),
      explanation(
        "year-five",
        "incorrect",
        "開催頻度は年1回ではなく毎月1回以上です。保存期間も法定値は3年間です。",
        "長く保存すること自体と、設問が問う法定の組合せは分けて判断します。",
        ["osh-rule-23-committee-monthly", "osh-rule-23-committee-record-three-years"],
        [OSH_RULE_URL],
      ),
      explanation(
        "optional",
        "incorrect",
        "対象となる委員会の開催と記録は任意ではありません。",
        "規則第23条が開催頻度と、議事の記録・保存を定めています。",
        ["osh-rule-23-committee-monthly", "osh-rule-23-committee-record-three-years"],
        [OSH_RULE_URL],
      ),
    ],
    officialSourceLinks: [OSH_RULE_URL],
    lawSources: [
      {
        sourceId: "egov-osh-regulations",
        locator: "第23条第1項・第4項",
        sourceFactIds: [
          "osh-rule-23-committee-monthly",
          "osh-rule-23-committee-record-three-years",
        ],
      },
    ],
    lawAsOf: "2026-08-01",
  }),
  originalQuestion({
    questionId: "osc-risk-assessment-001",
    qualificationId: "rodo-anzen-consultant",
    subjectId: "industrial-safety-general",
    questionText:
      "労働安全衛生法第28条の2の対象となる事業者の取組として、条文に沿うものはどれですか。",
    choices: [
      { choiceId: "assess-measures", text: "所定の危険性・有害性等を調査し、法令上の措置に加えて、結果に基づく必要な措置を講ずるよう努める" },
      { choiceId: "after-only", text: "災害発生後だけ調査すればよい" },
      { choiceId: "ppe-only", text: "結果にかかわらず保護具だけを対策とする" },
      { choiceId: "consultant-only", text: "外部コンサルタントだけが調査を実施できる" },
    ],
    officialCorrectChoiceIds: ["assess-measures"],
    answerEvidenceIds: ["osh-act-28-2-risk-assessment"],
    explanationByChoice: [
      explanation(
        "assess-measures",
        "correct",
        "所定の危険性・有害性等を調査し、結果に基づく必要な措置を講ずるよう努めます。",
        "法令上の措置に加え、調査結果に基づいて労働者の危険・健康障害を防ぐため必要な措置を講ずる努力義務です。",
        ["osh-act-28-2-risk-assessment"],
        [OSH_ACT_URL],
      ),
      explanation(
        "after-only",
        "incorrect",
        "災害後だけに限定する制度ではなく、危険性・有害性等を調査して予防措置へつなげます。",
        "第28条の2は事故後調査だけを定めた条文ではありません。",
        ["osh-act-28-2-risk-assessment"],
        [OSH_ACT_URL],
      ),
      explanation(
        "ppe-only",
        "incorrect",
        "条文は結果に基づく必要な措置を求めており、保護具だけに固定していません。",
        "調査結果と法令上の措置を踏まえて、必要な危険・健康障害防止措置を講ずるよう努めます。",
        ["osh-act-28-2-risk-assessment"],
        [OSH_ACT_URL],
      ),
      explanation(
        "consultant-only",
        "incorrect",
        "条文上の主体は対象となる事業者で、外部コンサルタントだけに限定されません。",
        "専門家の支援を受けることと、事業者が負う調査・措置の枠組みは別です。",
        ["osh-act-28-2-risk-assessment"],
        [OSH_ACT_URL],
      ),
    ],
    officialSourceLinks: [OSH_ACT_URL],
    lawSources: [
      {
        sourceId: "egov-osh-act",
        locator: "第28条の2第1項",
        sourceFactIds: ["osh-act-28-2-risk-assessment"],
      },
    ],
    lawAsOf: "2026-04-01",
  }),
  originalQuestion({
    questionId: "osc-safety-manager-action-002",
    qualificationId: "rodo-anzen-consultant",
    subjectId: "industrial-safety-general",
    questionText:
      "安全管理者が作業場等の巡視で、設備や作業方法に危険のおそれを認めたときの対応として適切なものはどれですか。",
    choices: [
      { choiceId: "immediate", text: "直ちに危険防止に必要な措置を講じる" },
      { choiceId: "annual", text: "年次報告まで措置を保留する" },
      { choiceId: "ignore", text: "災害が起きるまでは何もしない" },
      { choiceId: "worker-only", text: "労働者個人の注意だけに任せる" },
    ],
    officialCorrectChoiceIds: ["immediate"],
    answerEvidenceIds: ["osh-rule-6-safety-manager-patrol-action"],
    explanationByChoice: [
      explanation(
        "immediate",
        "correct",
        "危険のおそれを認めたときは、直ちに必要な防止措置を講じます。",
        "労働安全衛生規則第6条第1項は、巡視と危険発見時の即時措置を一続きの職務として定めています。",
        ["osh-rule-6-safety-manager-patrol-action"],
        [OSH_RULE_URL],
      ),
      explanation(
        "annual",
        "incorrect",
        "危険のおそれがある場合に年次報告まで保留することはできません。",
        "規則は『直ちに』必要な措置を講ずると定めています。",
        ["osh-rule-6-safety-manager-patrol-action"],
        [OSH_RULE_URL],
      ),
      explanation(
        "ignore",
        "incorrect",
        "災害発生を待つのではなく、危険のおそれの段階で対応します。",
        "巡視は予防のための職務で、危険を認めた時点で措置が必要です。",
        ["osh-rule-6-safety-manager-patrol-action"],
        [OSH_RULE_URL],
      ),
      explanation(
        "worker-only",
        "incorrect",
        "労働者個人の注意だけに任せず、安全管理者が必要な措置を講じます。",
        "規則第6条第1項は、安全管理者が巡視で危険のおそれを認めたときに直ちに必要な措置を講ずると定めています。",
        ["osh-rule-6-safety-manager-patrol-action"],
        [OSH_RULE_URL],
      ),
    ],
    officialSourceLinks: [OSH_RULE_URL],
    lawSources: [
      {
        sourceId: "egov-osh-regulations",
        locator: "第6条第1項",
        sourceFactIds: ["osh-rule-6-safety-manager-patrol-action"],
      },
    ],
    lawAsOf: "2026-08-01",
  }),
  originalQuestion({
    questionId: "osc-role-003",
    qualificationId: "rodo-anzen-consultant",
    subjectId: "industrial-safety-laws",
    questionText:
      "労働安全コンサルタントの業務について、労働安全衛生法第81条に沿う説明はどれですか。",
    choices: [
      { choiceId: "diagnose-guide", text: "事業場の安全を診断し、それに基づく指導を行う" },
      { choiceId: "license-issue", text: "衛生管理者免許を発行する" },
      { choiceId: "criminal", text: "労働災害の刑事捜査だけを行う" },
      { choiceId: "insurance", text: "労災保険給付の決定だけを行う" },
    ],
    officialCorrectChoiceIds: ["diagnose-guide"],
    answerEvidenceIds: ["osh-act-81-safety-consultant-role"],
    explanationByChoice: [
      explanation(
        "diagnose-guide",
        "correct",
        "安全水準向上のため、事業場の安全を診断し、それに基づく指導を行います。",
        "法第81条第1項が労働安全コンサルタントの業務をこのように定義しています。",
        ["osh-act-81-safety-consultant-role"],
        [OSH_ACT_URL],
      ),
      explanation(
        "license-issue",
        "incorrect",
        "免許発行はコンサルタント業務の定義ではありません。",
        "第81条が定める中心業務は事業場の安全診断と、それに基づく指導です。",
        ["osh-act-81-safety-consultant-role"],
        [OSH_ACT_URL],
      ),
      explanation(
        "criminal",
        "incorrect",
        "刑事捜査だけを行う資格ではありません。",
        "法定業務は安全水準向上のための診断と指導です。",
        ["osh-act-81-safety-consultant-role"],
        [OSH_ACT_URL],
      ),
      explanation(
        "insurance",
        "incorrect",
        "労災保険給付の決定は第81条のコンサルタント業務ではありません。",
        "安全コンサルタントは事業場の安全診断と指導を業とします。",
        ["osh-act-81-safety-consultant-role"],
        [OSH_ACT_URL],
      ),
    ],
    officialSourceLinks: [OSH_ACT_URL],
    lawSources: [
      {
        sourceId: "egov-osh-act",
        locator: "第81条第1項",
        sourceFactIds: ["osh-act-81-safety-consultant-role"],
      },
    ],
    lawAsOf: "2026-04-01",
  }),
  originalQuestion({
    questionId: "osc-confidentiality-004",
    qualificationId: "rodo-anzen-consultant",
    subjectId: "industrial-safety-laws",
    questionText:
      "コンサルタントが業務で知った秘密の取扱いについて、法令に沿うものはどれですか。",
    choices: [
      { choiceId: "continues", text: "秘密を漏えい・盗用してはならず、コンサルタントでなくなった後も義務が続く" },
      { choiceId: "ends", text: "コンサルタントでなくなれば自由に公表できる" },
      { choiceId: "social", text: "業務に関して知り得た秘密でも、匿名ならSNSへ投稿できる" },
      { choiceId: "sell", text: "業務に関して知り得た秘密を含む診断資料を第三者へ販売できる" },
    ],
    officialCorrectChoiceIds: ["continues"],
    answerEvidenceIds: ["osh-act-86-consultant-confidentiality"],
    explanationByChoice: [
      explanation(
        "continues",
        "correct",
        "秘密の漏えい・盗用は禁止され、その義務はコンサルタントでなくなった後も続きます。",
        "労働安全衛生法第86条第2項は、コンサルタントでなくなった後も同じ義務が続くことを明記しています。",
        ["osh-act-86-consultant-confidentiality"],
        [OSH_ACT_URL],
      ),
      explanation(
        "ends",
        "incorrect",
        "コンサルタントでなくなっても守秘義務は終わりません。",
        "第86条第2項後段が、コンサルタントでなくなった後も同様と定めています。",
        ["osh-act-86-consultant-confidentiality"],
        [OSH_ACT_URL],
      ),
      explanation(
        "social",
        "incorrect",
        "匿名化を口実に、業務で知った秘密を漏らすことはできません。",
        "秘密の漏えい・盗用を禁止する法定義務が優先します。",
        ["osh-act-86-consultant-confidentiality"],
        [OSH_ACT_URL],
      ),
      explanation(
        "sell",
        "incorrect",
        "業務上の秘密を第三者へ販売・盗用することは認められません。",
        "第86条第2項は漏えいだけでなく盗用も禁止しています。",
        ["osh-act-86-consultant-confidentiality"],
        [OSH_ACT_URL],
      ),
    ],
    officialSourceLinks: [OSH_ACT_URL],
    lawSources: [
      {
        sourceId: "egov-osh-act",
        locator: "第86条第2項",
        sourceFactIds: ["osh-act-86-consultant-confidentiality"],
      },
    ],
    lawAsOf: "2026-04-01",
  }),
  originalQuestion({
    questionId: "ohc-role-001",
    qualificationId: "rodo-eisei-consultant",
    subjectId: "occupational-health-general",
    questionText:
      "労働衛生コンサルタントの法定業務として適切なものはどれですか。",
    choices: [
      { choiceId: "diagnose-guide", text: "事業場の衛生を診断し、それに基づく指導を行う" },
      { choiceId: "medical-license", text: "医師免許を交付する" },
      { choiceId: "benefits", text: "健康保険給付だけを決定する" },
      { choiceId: "inspection-only", text: "労働基準監督官の立入検査だけを代行する" },
    ],
    officialCorrectChoiceIds: ["diagnose-guide"],
    answerEvidenceIds: ["osh-act-81-health-consultant-role"],
    explanationByChoice: [
      explanation(
        "diagnose-guide",
        "correct",
        "衛生水準向上のため、事業場の衛生を診断し、それに基づく指導を行います。",
        "労働安全衛生法第81条第2項が労働衛生コンサルタントの業務を定義しています。",
        ["osh-act-81-health-consultant-role"],
        [OSH_ACT_URL],
      ),
      explanation(
        "medical-license",
        "incorrect",
        "医師免許の交付は労働衛生コンサルタントの業務ではありません。",
        "第81条の業務は事業場の衛生診断と、それに基づく指導です。",
        ["osh-act-81-health-consultant-role"],
        [OSH_ACT_URL],
      ),
      explanation(
        "benefits",
        "incorrect",
        "健康保険給付の決定は第81条の業務定義ではありません。",
        "労働衛生コンサルタントは衛生水準向上のための診断・指導を業とします。",
        ["osh-act-81-health-consultant-role"],
        [OSH_ACT_URL],
      ),
      explanation(
        "inspection-only",
        "incorrect",
        "労働基準監督官の権限を代行する資格ではありません。",
        "法定業務は事業場の衛生についての診断と指導です。",
        ["osh-act-81-health-consultant-role"],
        [OSH_ACT_URL],
      ),
    ],
    officialSourceLinks: [OSH_ACT_URL],
    lawSources: [
      {
        sourceId: "egov-osh-act",
        locator: "第81条第2項",
        sourceFactIds: ["osh-act-81-health-consultant-role"],
      },
    ],
    lawAsOf: "2026-04-01",
  }),
  originalQuestion({
    questionId: "ohc-committee-topics-002",
    qualificationId: "rodo-eisei-consultant",
    subjectId: "occupational-health-general",
    questionText:
      "衛生委員会が調査審議する事項として、労働安全衛生法第18条に沿うものはどれですか。",
    choices: [
      { choiceId: "health", text: "健康障害防止と健康保持増進の基本対策" },
      { choiceId: "sales", text: "商品の販売価格だけ" },
      { choiceId: "dividend", text: "株主配当の決定だけ" },
      { choiceId: "advertising", text: "広告表現の選定だけ" },
    ],
    officialCorrectChoiceIds: ["health"],
    answerEvidenceIds: ["osh-act-18-health-committee-topics"],
    explanationByChoice: [
      explanation(
        "health",
        "correct",
        "健康障害防止と健康保持増進の基本対策は、衛生委員会の調査審議事項です。",
        "衛生に係る労働災害の原因・再発防止や、健康に関する重要事項も対象に含まれます。",
        ["osh-act-18-health-committee-topics"],
        [OSH_ACT_URL],
      ),
      explanation(
        "sales",
        "incorrect",
        "販売価格だけを決めることは、法第18条の衛生委員会の調査審議事項ではありません。",
        "委員会は労働者の健康障害防止と健康保持増進などを扱います。",
        ["osh-act-18-health-committee-topics"],
        [OSH_ACT_URL],
      ),
      explanation(
        "dividend",
        "incorrect",
        "株主配当だけの決定は衛生委員会の法定事項ではありません。",
        "法第18条は事業場の衛生と労働者の健康に関する事項を列挙しています。",
        ["osh-act-18-health-committee-topics"],
        [OSH_ACT_URL],
      ),
      explanation(
        "advertising",
        "incorrect",
        "広告表現だけの選定は衛生委員会の調査審議事項ではありません。",
        "対象は健康障害防止、健康保持増進、衛生面の災害原因・再発防止などです。",
        ["osh-act-18-health-committee-topics"],
        [OSH_ACT_URL],
      ),
    ],
    officialSourceLinks: [OSH_ACT_URL],
    lawSources: [
      {
        sourceId: "egov-osh-act",
        locator: "第18条第1項",
        sourceFactIds: ["osh-act-18-health-committee-topics"],
      },
    ],
    lawAsOf: "2026-04-01",
  }),
  originalQuestion({
    questionId: "ohc-exam-format-003",
    qualificationId: "rodo-eisei-consultant",
    subjectId: "occupational-health-laws",
    questionText:
      "労働衛生コンサルタント試験の試験方法について、法令に沿うものはどれですか。",
    choices: [
      { choiceId: "written-oral", text: "区分ごとに筆記試験と口述試験で行う" },
      { choiceId: "oral-only", text: "口述試験だけで行う" },
      { choiceId: "written-only", text: "筆記試験だけで行い、口述試験はない" },
      { choiceId: "training-only", text: "講習の受講だけで試験は行わない" },
    ],
    officialCorrectChoiceIds: ["written-oral"],
    answerEvidenceIds: ["osh-act-83-health-consultant-exams"],
    explanationByChoice: [
      explanation(
        "written-oral",
        "correct",
        "労働衛生コンサルタント試験にも、区分ごとの筆記試験と口述試験の規定が準用されます。",
        "法第83条が、法第82条第2項から第4項までを衛生コンサルタント試験へ準用しています。",
        ["osh-act-83-health-consultant-exams"],
        [OSH_ACT_URL],
      ),
      explanation(
        "oral-only",
        "incorrect",
        "口述試験だけではなく、筆記試験もあります。",
        "法第83条により、筆記試験と口述試験の両方を定める規定が準用されます。",
        ["osh-act-83-health-consultant-exams"],
        [OSH_ACT_URL],
      ),
      explanation(
        "written-only",
        "incorrect",
        "筆記試験だけではなく、口述試験も法定されています。",
        "区分ごとに筆記試験と口述試験で行う枠組みです。",
        ["osh-act-83-health-consultant-exams"],
        [OSH_ACT_URL],
      ),
      explanation(
        "training-only",
        "incorrect",
        "講習受講だけで試験を行わない制度ではありません。",
        "労働衛生コンサルタント試験は、筆記試験と口述試験で行います。",
        ["osh-act-83-health-consultant-exams"],
        [OSH_ACT_URL],
      ),
    ],
    officialSourceLinks: [OSH_ACT_URL],
    lawSources: [
      {
        sourceId: "egov-osh-act",
        locator: "第83条・第82条第2項",
        sourceFactIds: ["osh-act-83-health-consultant-exams"],
      },
    ],
    lawAsOf: "2026-04-01",
  }),
  originalQuestion({
    questionId: "ohc-registration-004",
    qualificationId: "rodo-eisei-consultant",
    subjectId: "occupational-health-laws",
    questionText:
      "労働衛生コンサルタント試験に合格した後、労働衛生コンサルタントとなるための手続として適切なものはどれですか。",
    choices: [
      { choiceId: "register", text: "所定の労働衛生コンサルタント名簿へ登録を受ける" },
      { choiceId: "automatic", text: "合格した瞬間に手続なく自動登録される" },
      { choiceId: "company", text: "勤務先の社内名簿へ載せるだけでよい" },
      { choiceId: "vote", text: "同僚の投票だけで登録に代えられる" },
    ],
    officialCorrectChoiceIds: ["register"],
    answerEvidenceIds: ["osh-act-84-consultant-registration"],
    explanationByChoice: [
      explanation(
        "register",
        "correct",
        "合格後、所定の名簿へ登録を受けてコンサルタントとなることができます。",
        "労働安全衛生法第84条第1項は、試験合格と名簿登録を分けて定めています。",
        ["osh-act-84-consultant-registration"],
        [OSH_ACT_URL],
      ),
      explanation(
        "automatic",
        "incorrect",
        "試験合格だけで手続なく自動登録される制度ではありません。",
        "合格者は法定の名簿へ登録を受けてコンサルタントとなります。",
        ["osh-act-84-consultant-registration"],
        [OSH_ACT_URL],
      ),
      explanation(
        "company",
        "incorrect",
        "勤務先の社内名簿は、法定のコンサルタント名簿への登録に代わりません。",
        "法第84条が定める所定の登録を受ける必要があります。",
        ["osh-act-84-consultant-registration"],
        [OSH_ACT_URL],
      ),
      explanation(
        "vote",
        "incorrect",
        "同僚の投票は法定登録の代替手続ではありません。",
        "試験合格後に所定の名簿へ登録を受ける制度です。",
        ["osh-act-84-consultant-registration"],
        [OSH_ACT_URL],
      ),
    ],
    officialSourceLinks: [OSH_ACT_URL],
    lawSources: [
      {
        sourceId: "egov-osh-act",
        locator: "第84条第1項",
        sourceFactIds: ["osh-act-84-consultant-registration"],
      },
    ],
    lawAsOf: "2026-04-01",
  }),
] as const satisfies readonly SafetyQuestion[];

export function findSafetyQuestion(questionId: string): SafetyQuestion | undefined {
  return SAFETY_QUESTIONS.find((question) => question.questionId === questionId);
}
