export type ElectricWorkAction =
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

export type ElectricHoldoutConcept =
  | "answer-first"
  | "visual-may-not-require-uniform-license"
  | "action-determines-requirement"
  | "electrician-separate-from-special-education"
  | "chief-engineer-is-facility-governance"
  | "low-voltage-special-education-scope"
  | "high-voltage-special-education-scope"
  | "voltage-and-energized-state-matter"
  | "measurement-near-live-parts"
  | "wiring-may-be-electrical-work"
  | "breaker-operation-conditions"
  | "start-check-is-not-a-qualification"
  | "no-universal-electrical-work-supervisor"
  | "work-leader-is-distinct"
  | "de-energized-procedure-matters"
  | "official-source-gap-is-explicit";

export type ElectricChatbotHoldoutCase = {
  id: string;
  category:
    | "broad"
    | "action"
    | "scheme"
    | "follow-up"
    | "speech-typo"
    | "source-gap";
  turns: readonly string[];
  expectedAction?: ElectricWorkAction;
  expectedVoltage?: "unknown" | "low" | "high" | "extra-high";
  expectedEnergizedState?: "unknown" | "de-energized" | "energized" | "proximity";
  requiredConcepts: readonly ElectricHoldoutConcept[];
  requiredAuthorities: readonly string[];
  forbiddenDomains?: readonly string[];
};

const ELECTRIC_FORBIDDEN_DOMAINS = [
  "酸欠",
  "有機溶剤",
  "石綿",
  "玉掛け",
] as const;

/**
 * 2026-08-09の実装修正前に固定した、電気分野の会話holdout。
 *
 * - 回答文の完全一致では評価しない。
 * - requiredConcepts、構造化意味モデル、公式法源、禁止ドメインで評価する。
 * - follow-upは turns を同一タブの構造化contextへ順番に結合して評価する。
 * - この配列は評価結果に合わせて変更しない。
 */
export const ELECTRIC_CHATBOT_HOLDOUT_2026_08_09 = [
  {
    id: "EL-001",
    category: "broad",
    turns: ["電気作業の資格は？"],
    expectedAction: "unknown",
    requiredConcepts: ["answer-first", "electrician-separate-from-special-education", "action-determines-requirement"],
    requiredAuthorities: ["電気工事士法第2条", "電気工事士法第3条", "安衛則第36条"],
  },
  {
    id: "EL-002",
    category: "broad",
    turns: ["電気点検に資格いる？"],
    expectedAction: "unknown",
    requiredConcepts: ["answer-first", "visual-may-not-require-uniform-license", "action-determines-requirement", "electrician-separate-from-special-education"],
    requiredAuthorities: ["電気工事士法第2条", "電気工事士法第3条", "安衛則第36条"],
  },
  {
    id: "EL-003",
    category: "broad",
    turns: ["電気の点検する時に必要な資格ある？"],
    expectedAction: "unknown",
    requiredConcepts: ["answer-first", "visual-may-not-require-uniform-license", "action-determines-requirement", "chief-engineer-is-facility-governance"],
    requiredAuthorities: ["電気工事士法第2条", "電気工事士法第3条", "安衛則第36条"],
  },
  {
    id: "EL-004",
    category: "broad",
    turns: ["電気を触るのに教育いる？"],
    expectedAction: "unknown",
    requiredConcepts: ["answer-first", "low-voltage-special-education-scope", "high-voltage-special-education-scope", "electrician-separate-from-special-education"],
    requiredAuthorities: ["安衛法第59条", "安衛則第36条", "電気工事士法第3条"],
  },
  {
    id: "EL-005",
    category: "broad",
    turns: ["電源を入れるだけ"],
    expectedAction: "breaker-operation",
    requiredConcepts: ["answer-first", "breaker-operation-conditions", "voltage-and-energized-state-matter"],
    requiredAuthorities: ["安衛則第36条"],
  },
  {
    id: "EL-006",
    category: "broad",
    turns: ["盤を見るだけ"],
    expectedAction: "visual-inspection",
    requiredConcepts: ["answer-first", "visual-may-not-require-uniform-license", "action-determines-requirement"],
    requiredAuthorities: ["安衛則第36条"],
  },
  {
    id: "EL-007",
    category: "broad",
    turns: ["電気の特別教育を教えて"],
    expectedAction: "unknown",
    requiredConcepts: ["answer-first", "low-voltage-special-education-scope", "high-voltage-special-education-scope", "electrician-separate-from-special-education"],
    requiredAuthorities: ["安衛法第59条", "安衛則第36条"],
  },
  {
    id: "EL-008",
    category: "broad",
    turns: ["電気作業の特別教育について教えて"],
    expectedAction: "unknown",
    requiredConcepts: ["answer-first", "low-voltage-special-education-scope", "high-voltage-special-education-scope", "electrician-separate-from-special-education"],
    requiredAuthorities: ["安衛法第59条", "安衛則第36条"],
  },
  {
    id: "EL-009",
    category: "broad",
    turns: ["電気設備の確認は誰でもできる？"],
    expectedAction: "unknown",
    requiredConcepts: ["answer-first", "visual-may-not-require-uniform-license", "action-determines-requirement"],
    requiredAuthorities: ["安衛則第36条", "電気工事士法第2条"],
  },
  {
    id: "EL-010",
    category: "broad",
    turns: ["分電盤を点検したい"],
    expectedAction: "unknown",
    requiredConcepts: ["answer-first", "action-determines-requirement", "voltage-and-energized-state-matter"],
    requiredAuthorities: ["安衛則第36条", "安衛則第346条", "安衛則第347条"],
  },
  {
    id: "EL-011",
    category: "broad",
    turns: ["制御盤の点検資格は？"],
    expectedAction: "unknown",
    requiredConcepts: ["answer-first", "visual-may-not-require-uniform-license", "action-determines-requirement", "electrician-separate-from-special-education"],
    requiredAuthorities: ["安衛則第36条", "電気工事士法第2条", "電気工事士法第3条"],
  },
  {
    id: "EL-012",
    category: "broad",
    turns: ["高圧受電設備の点検はどんな資格がいる？"],
    expectedAction: "high-voltage-facility-inspection",
    expectedVoltage: "high",
    requiredConcepts: ["answer-first", "high-voltage-special-education-scope", "chief-engineer-is-facility-governance", "voltage-and-energized-state-matter"],
    requiredAuthorities: ["安衛則第36条", "安衛則第341条", "安衛則第342条"],
  },
  {
    id: "EL-013",
    category: "action",
    turns: ["盤を開けてテスターを当てる"],
    expectedAction: "tester-measurement",
    expectedEnergizedState: "unknown",
    requiredConcepts: ["answer-first", "measurement-near-live-parts", "voltage-and-energized-state-matter"],
    requiredAuthorities: ["安衛則第36条", "安衛則第341条", "安衛則第346条"],
  },
  {
    id: "EL-014",
    category: "action",
    turns: ["配線をつなぐ"],
    expectedAction: "wiring-connection",
    requiredConcepts: ["answer-first", "wiring-may-be-electrical-work", "electrician-separate-from-special-education", "de-energized-procedure-matters"],
    requiredAuthorities: ["電気工事士法第2条", "電気工事士法第3条", "安衛則第36条", "安衛則第339条"],
  },
  {
    id: "EL-015",
    category: "action",
    turns: ["ブレーカーを操作する"],
    expectedAction: "breaker-operation",
    requiredConcepts: ["answer-first", "breaker-operation-conditions", "voltage-and-energized-state-matter"],
    requiredAuthorities: ["安衛則第36条"],
  },
  {
    id: "EL-016",
    category: "action",
    turns: ["100Vの充電部付近で作業する"],
    expectedAction: "live-proximity-work",
    expectedVoltage: "low",
    expectedEnergizedState: "proximity",
    requiredConcepts: ["answer-first", "low-voltage-special-education-scope", "voltage-and-energized-state-matter"],
    requiredAuthorities: ["安衛則第36条", "安衛則第347条"],
  },
  {
    id: "EL-017",
    category: "action",
    turns: ["高圧受電設備を点検する"],
    expectedAction: "high-voltage-facility-inspection",
    expectedVoltage: "high",
    requiredConcepts: ["answer-first", "high-voltage-special-education-scope", "chief-engineer-is-facility-governance"],
    requiredAuthorities: ["安衛則第36条", "安衛則第341条", "安衛則第342条"],
  },
  {
    id: "EL-018",
    category: "action",
    turns: ["停電して配線を外す"],
    expectedAction: "wiring-removal",
    expectedEnergizedState: "de-energized",
    requiredConcepts: ["answer-first", "wiring-may-be-electrical-work", "electrician-separate-from-special-education", "de-energized-procedure-matters"],
    requiredAuthorities: ["電気工事士法第2条", "電気工事士法第3条", "安衛則第339条"],
  },
  {
    id: "EL-019",
    category: "action",
    turns: ["表示灯を見る"],
    expectedAction: "indicator-check",
    requiredConcepts: ["answer-first", "visual-may-not-require-uniform-license"],
    requiredAuthorities: ["安衛則第36条"],
  },
  {
    id: "EL-020",
    category: "action",
    turns: ["異音と異臭を確認するだけ"],
    expectedAction: "noise-odor-check",
    requiredConcepts: ["answer-first", "visual-may-not-require-uniform-license"],
    requiredAuthorities: ["安衛則第36条"],
  },
  {
    id: "EL-021",
    category: "action",
    turns: ["盤の外側を清掃する"],
    expectedAction: "cleaning",
    requiredConcepts: ["answer-first", "visual-may-not-require-uniform-license", "action-determines-requirement"],
    requiredAuthorities: ["安衛則第36条"],
  },
  {
    id: "EL-022",
    category: "action",
    turns: ["盤を開けるだけ"],
    expectedAction: "open-panel",
    requiredConcepts: ["answer-first", "voltage-and-energized-state-matter", "action-determines-requirement"],
    requiredAuthorities: ["安衛則第36条", "安衛則第346条"],
  },
  {
    id: "EL-023",
    category: "action",
    turns: ["絶縁抵抗を測る"],
    expectedAction: "insulation-measurement",
    requiredConcepts: ["answer-first", "measurement-near-live-parts", "de-energized-procedure-matters"],
    requiredAuthorities: ["安衛則第339条", "安衛則第346条"],
  },
  {
    id: "EL-024",
    category: "action",
    turns: ["コンセントを交換する"],
    expectedAction: "repair",
    requiredConcepts: ["answer-first", "wiring-may-be-electrical-work", "electrician-separate-from-special-education"],
    requiredAuthorities: ["電気工事士法第2条", "電気工事士法第3条"],
  },
  {
    id: "EL-025",
    category: "action",
    turns: ["活線のまま端子を締める"],
    expectedAction: "live-work",
    expectedEnergizedState: "energized",
    requiredConcepts: ["answer-first", "low-voltage-special-education-scope", "voltage-and-energized-state-matter"],
    requiredAuthorities: ["安衛則第341条", "安衛則第346条"],
  },
  {
    id: "EL-026",
    category: "action",
    turns: ["高圧線の近くで点検する"],
    expectedAction: "live-proximity-work",
    expectedVoltage: "high",
    expectedEnergizedState: "proximity",
    requiredConcepts: ["answer-first", "high-voltage-special-education-scope", "voltage-and-energized-state-matter"],
    requiredAuthorities: ["安衛則第36条", "安衛則第342条"],
  },
  {
    id: "EL-027",
    category: "action",
    turns: ["特高設備を清掃する"],
    expectedAction: "cleaning",
    expectedVoltage: "extra-high",
    requiredConcepts: ["answer-first", "high-voltage-special-education-scope", "voltage-and-energized-state-matter"],
    requiredAuthorities: ["安衛則第36条", "安衛則第344条", "安衛則第345条"],
  },
  {
    id: "EL-028",
    category: "action",
    turns: ["作業開始前に電気設備を目視する"],
    expectedAction: "start-of-work-inspection",
    requiredConcepts: ["answer-first", "start-check-is-not-a-qualification", "visual-may-not-require-uniform-license"],
    requiredAuthorities: ["安衛則第36条"],
  },
  {
    id: "EL-029",
    category: "scheme",
    turns: ["電気工事士と特別教育の違い"],
    requiredConcepts: ["answer-first", "electrician-separate-from-special-education", "wiring-may-be-electrical-work"],
    requiredAuthorities: ["電気工事士法第2条", "電気工事士法第3条", "安衛法第59条", "安衛則第36条"],
  },
  {
    id: "EL-030",
    category: "scheme",
    turns: ["電気主任技術者がいれば作業できる？"],
    requiredConcepts: ["answer-first", "chief-engineer-is-facility-governance", "electrician-separate-from-special-education"],
    requiredAuthorities: ["電気工事士法第3条", "電気事業法第43条"],
  },
  {
    id: "EL-031",
    category: "scheme",
    turns: ["作業主任者は必要？"],
    requiredConcepts: ["answer-first", "no-universal-electrical-work-supervisor", "work-leader-is-distinct"],
    requiredAuthorities: ["安衛法第14条", "安衛令第6条", "安衛則第350条"],
  },
  {
    id: "EL-032",
    category: "scheme",
    turns: ["電気作業で作業指揮者は必要？"],
    requiredConcepts: ["answer-first", "work-leader-is-distinct", "no-universal-electrical-work-supervisor"],
    requiredAuthorities: ["安衛則第350条"],
  },
  {
    id: "EL-033",
    category: "scheme",
    turns: ["低圧と高圧の教育の違い"],
    expectedAction: "unknown",
    requiredConcepts: ["answer-first", "low-voltage-special-education-scope", "high-voltage-special-education-scope"],
    requiredAuthorities: ["安衛則第36条"],
  },
  {
    id: "EL-034",
    category: "scheme",
    turns: ["電気主任技術者と電気工事士の違い"],
    requiredConcepts: ["answer-first", "chief-engineer-is-facility-governance", "wiring-may-be-electrical-work"],
    requiredAuthorities: ["電気事業法第43条", "電気工事士法第2条", "電気工事士法第3条"],
  },
  {
    id: "EL-035",
    category: "scheme",
    turns: ["特別教育を受ければ配線工事できる？"],
    expectedAction: "wiring-connection",
    requiredConcepts: ["answer-first", "electrician-separate-from-special-education", "wiring-may-be-electrical-work"],
    requiredAuthorities: ["電気工事士法第2条", "電気工事士法第3条", "安衛則第36条"],
  },
  {
    id: "EL-036",
    category: "scheme",
    turns: ["電工免状があれば低圧教育はいらない？"],
    expectedVoltage: "low",
    requiredConcepts: ["answer-first", "electrician-separate-from-special-education", "low-voltage-special-education-scope"],
    requiredAuthorities: ["安衛則第36条", "安衛則第37条", "電気工事士法第3条"],
  },
  {
    id: "EL-037",
    category: "scheme",
    turns: ["電気作業に技能講習はある？"],
    requiredConcepts: ["answer-first", "electrician-separate-from-special-education", "action-determines-requirement"],
    requiredAuthorities: ["安衛法第59条", "安衛則第36条", "電気工事士法第3条"],
  },
  {
    id: "EL-038",
    category: "scheme",
    turns: ["始業前点検という資格がある？"],
    expectedAction: "start-of-work-inspection",
    requiredConcepts: ["answer-first", "start-check-is-not-a-qualification", "action-determines-requirement"],
    requiredAuthorities: ["安衛則第36条"],
  },
  {
    id: "EL-039",
    category: "scheme",
    turns: ["電気の点検に作業主任者を選ぶ？"],
    requiredConcepts: ["answer-first", "no-universal-electrical-work-supervisor", "work-leader-is-distinct"],
    requiredAuthorities: ["安衛法第14条", "安衛令第6条", "安衛則第350条"],
  },
  {
    id: "EL-040",
    category: "scheme",
    turns: ["高圧の点検は主任技術者の立会いだけでいい？"],
    expectedAction: "high-voltage-facility-inspection",
    expectedVoltage: "high",
    requiredConcepts: ["answer-first", "chief-engineer-is-facility-governance", "high-voltage-special-education-scope"],
    requiredAuthorities: ["電気事業法第43条", "安衛則第36条", "安衛則第341条"],
  },
  {
    id: "EL-041",
    category: "follow-up",
    turns: ["電気の点検に資格いる？", "見るだけ"],
    expectedAction: "visual-inspection",
    requiredConcepts: ["answer-first", "visual-may-not-require-uniform-license"],
    requiredAuthorities: ["安衛則第36条"],
  },
  {
    id: "EL-042",
    category: "follow-up",
    turns: ["電気の点検に資格いる？", "作業開始前点検"],
    expectedAction: "start-of-work-inspection",
    requiredConcepts: ["answer-first", "start-check-is-not-a-qualification", "action-determines-requirement"],
    requiredAuthorities: ["安衛則第36条"],
  },
  {
    id: "EL-043",
    category: "follow-up",
    turns: ["電気点検に資格ある？", "盤を開ける"],
    expectedAction: "open-panel",
    requiredConcepts: ["answer-first", "voltage-and-energized-state-matter"],
    requiredAuthorities: ["安衛則第36条", "安衛則第346条"],
  },
  {
    id: "EL-044",
    category: "follow-up",
    turns: ["電気作業の資格は？", "低圧"],
    expectedVoltage: "low",
    requiredConcepts: ["answer-first", "low-voltage-special-education-scope", "electrician-separate-from-special-education"],
    requiredAuthorities: ["安衛則第36条", "電気工事士法第3条"],
  },
  {
    id: "EL-045",
    category: "follow-up",
    turns: ["電気の特別教育は？", "高圧"],
    expectedVoltage: "high",
    requiredConcepts: ["answer-first", "high-voltage-special-education-scope"],
    requiredAuthorities: ["安衛則第36条"],
  },
  {
    id: "EL-046",
    category: "follow-up",
    turns: ["盤を開けて測定する", "充電中"],
    expectedAction: "tester-measurement",
    expectedEnergizedState: "energized",
    requiredConcepts: ["answer-first", "measurement-near-live-parts", "voltage-and-energized-state-matter"],
    requiredAuthorities: ["安衛則第341条", "安衛則第346条"],
  },
  {
    id: "EL-047",
    category: "follow-up",
    turns: ["電気の点検に資格いる？", "配線は触らない"],
    expectedAction: "visual-inspection",
    requiredConcepts: ["answer-first", "visual-may-not-require-uniform-license", "action-determines-requirement"],
    requiredAuthorities: ["安衛則第36条"],
  },
  {
    id: "EL-048",
    category: "follow-up",
    turns: ["電気の点検する時に必要な資格ある？", "作業開始前点検", "盤を開けてテスターを当てる"],
    expectedAction: "tester-measurement",
    requiredConcepts: ["answer-first", "measurement-near-live-parts", "voltage-and-energized-state-matter"],
    requiredAuthorities: ["安衛則第36条", "安衛則第341条", "安衛則第346条"],
  },
  {
    id: "EL-049",
    category: "follow-up",
    turns: ["電気作業の特別教育について教えて", "ブレーカーを入切するだけ"],
    expectedAction: "breaker-operation",
    requiredConcepts: ["answer-first", "breaker-operation-conditions", "low-voltage-special-education-scope"],
    requiredAuthorities: ["安衛則第36条"],
  },
  {
    id: "EL-050",
    category: "follow-up",
    turns: ["配線をつなぐ", "停電済み"],
    expectedAction: "wiring-connection",
    expectedEnergizedState: "de-energized",
    requiredConcepts: ["answer-first", "wiring-may-be-electrical-work", "de-energized-procedure-matters"],
    requiredAuthorities: ["電気工事士法第3条", "安衛則第339条"],
  },
  {
    id: "EL-051",
    category: "follow-up",
    turns: ["電気点検の資格は？", "作業主任者は必要？"],
    requiredConcepts: ["answer-first", "no-universal-electrical-work-supervisor", "work-leader-is-distinct"],
    requiredAuthorities: ["安衛法第14条", "安衛令第6条", "安衛則第350条"],
  },
  {
    id: "EL-052",
    category: "follow-up",
    turns: ["高圧受電設備を点検する", "主任技術者がいればいい？"],
    expectedAction: "high-voltage-facility-inspection",
    expectedVoltage: "high",
    requiredConcepts: ["answer-first", "chief-engineer-is-facility-governance", "high-voltage-special-education-scope"],
    requiredAuthorities: ["電気事業法第43条", "安衛則第36条"],
  },
  {
    id: "EL-053",
    category: "follow-up",
    turns: ["盤を開けてテスターを当てる", "100V"],
    expectedAction: "tester-measurement",
    expectedVoltage: "low",
    requiredConcepts: ["answer-first", "measurement-near-live-parts", "low-voltage-special-education-scope"],
    requiredAuthorities: ["安衛則第36条", "安衛則第346条"],
  },
  {
    id: "EL-054",
    category: "follow-up",
    turns: ["電源を入れるだけ", "充電部分は露出していない"],
    expectedAction: "breaker-operation",
    requiredConcepts: ["answer-first", "breaker-operation-conditions"],
    requiredAuthorities: ["安衛則第36条"],
  },
  {
    id: "EL-055",
    category: "follow-up",
    turns: ["電気の点検に資格いる？", "1.5トン"],
    expectedAction: "unknown",
    requiredConcepts: ["answer-first", "action-determines-requirement"],
    requiredAuthorities: ["安衛則第36条"],
  },
  {
    id: "EL-056",
    category: "speech-typo",
    turns: ["電気の電源をする"],
    expectedAction: "breaker-operation",
    requiredConcepts: ["answer-first", "breaker-operation-conditions"],
    requiredAuthorities: ["安衛則第36条"],
  },
  {
    id: "EL-057",
    category: "speech-typo",
    turns: ["電気点検資格ある"],
    expectedAction: "unknown",
    requiredConcepts: ["answer-first", "visual-may-not-require-uniform-license", "action-determines-requirement"],
    requiredAuthorities: ["安衛則第36条", "電気工事士法第3条"],
  },
  {
    id: "EL-058",
    category: "speech-typo",
    turns: ["盤あけてはかる"],
    expectedAction: "tester-measurement",
    requiredConcepts: ["answer-first", "measurement-near-live-parts", "voltage-and-energized-state-matter"],
    requiredAuthorities: ["安衛則第36条", "安衛則第346条"],
  },
  {
    id: "EL-059",
    category: "speech-typo",
    turns: ["低圧のとくべつきょういく"],
    expectedVoltage: "low",
    requiredConcepts: ["answer-first", "low-voltage-special-education-scope"],
    requiredAuthorities: ["安衛法第59条", "安衛則第36条"],
  },
  {
    id: "EL-060",
    category: "speech-typo",
    turns: ["電工いる？"],
    requiredConcepts: ["answer-first", "wiring-may-be-electrical-work", "electrician-separate-from-special-education"],
    requiredAuthorities: ["電気工事士法第2条", "電気工事士法第3条", "安衛則第36条"],
  },
  {
    id: "EL-061",
    category: "speech-typo",
    turns: ["100Vさわる"],
    expectedAction: "live-work",
    expectedVoltage: "low",
    requiredConcepts: ["answer-first", "low-voltage-special-education-scope", "voltage-and-energized-state-matter"],
    requiredAuthorities: ["安衛則第36条", "安衛則第346条"],
  },
  {
    id: "EL-062",
    category: "speech-typo",
    turns: ["特高"],
    expectedVoltage: "extra-high",
    requiredConcepts: ["answer-first", "high-voltage-special-education-scope"],
    requiredAuthorities: ["安衛則第36条"],
  },
  {
    id: "EL-063",
    category: "speech-typo",
    turns: ["低圧教育"],
    expectedVoltage: "low",
    requiredConcepts: ["answer-first", "low-voltage-special-education-scope"],
    requiredAuthorities: ["安衛則第36条"],
  },
  {
    id: "EL-064",
    category: "speech-typo",
    turns: ["でんきてんけんしかく"],
    expectedAction: "unknown",
    requiredConcepts: ["answer-first", "visual-may-not-require-uniform-license", "action-determines-requirement"],
    requiredAuthorities: ["安衛則第36条", "電気工事士法第3条"],
  },
  {
    id: "EL-065",
    category: "speech-typo",
    turns: ["ブレイカー入れる"],
    expectedAction: "breaker-operation",
    requiredConcepts: ["answer-first", "breaker-operation-conditions"],
    requiredAuthorities: ["安衛則第36条"],
  },
  {
    id: "EL-066",
    category: "speech-typo",
    turns: ["テスターあてる"],
    expectedAction: "tester-measurement",
    requiredConcepts: ["answer-first", "measurement-near-live-parts"],
    requiredAuthorities: ["安衛則第341条", "安衛則第346条"],
  },
  {
    id: "EL-067",
    category: "speech-typo",
    turns: ["結線する"],
    expectedAction: "wiring-connection",
    requiredConcepts: ["answer-first", "wiring-may-be-electrical-work", "electrician-separate-from-special-education"],
    requiredAuthorities: ["電気工事士法第2条", "電気工事士法第3条"],
  },
  {
    id: "EL-068",
    category: "speech-typo",
    turns: ["ばんあけて測る"],
    expectedAction: "tester-measurement",
    requiredConcepts: ["answer-first", "measurement-near-live-parts"],
    requiredAuthorities: ["安衛則第36条", "安衛則第346条"],
  },
  {
    id: "EL-069",
    category: "source-gap",
    turns: ["メーカー独自の盤で点検資格は何？"],
    expectedAction: "unknown",
    requiredConcepts: ["answer-first", "action-determines-requirement", "official-source-gap-is-explicit"],
    requiredAuthorities: ["安衛則第36条", "電気工事士法第2条"],
  },
  {
    id: "EL-070",
    category: "source-gap",
    turns: ["海外規格の設備を日本で点検する資格は？"],
    expectedAction: "unknown",
    requiredConcepts: ["answer-first", "action-determines-requirement", "official-source-gap-is-explicit"],
    requiredAuthorities: ["安衛則第36条", "電気工事士法第2条"],
  },
  {
    id: "EL-071",
    category: "source-gap",
    turns: ["電圧も充電状態も分からないけど盤内を点検する"],
    expectedAction: "open-panel",
    expectedVoltage: "unknown",
    expectedEnergizedState: "unknown",
    requiredConcepts: ["answer-first", "voltage-and-energized-state-matter", "action-determines-requirement"],
    requiredAuthorities: ["安衛則第36条", "安衛則第346条"],
  },
  {
    id: "EL-072",
    category: "source-gap",
    turns: ["点検で何をするかまだ決まっていない"],
    expectedAction: "unknown",
    requiredConcepts: ["answer-first", "action-determines-requirement", "official-source-gap-is-explicit"],
    requiredAuthorities: ["安衛則第36条", "電気工事士法第2条"],
  },
].map((testCase) => ({
  ...testCase,
  forbiddenDomains: ELECTRIC_FORBIDDEN_DOMAINS,
})) as readonly ElectricChatbotHoldoutCase[];

