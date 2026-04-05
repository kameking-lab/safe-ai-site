import type { ExamQuestion } from "./types";

export const questions: ExamQuestion[] = [
  // ─── デザイン・サンプリング 2023 ─────────────────────────────────────────
  {
    id: "em2-des-2023-001",
    year: 2023,
    certificationId: "env-measure-2nd",
    subject: "em2-design",
    subjectLabel: "デザイン・サンプリング",
    questionNumber: 1,
    questionText:
      "第二種作業環境測定士が行うことができる業務として正しいものはどれか。",
    choices: [
      { label: "ア", text: "有機溶剤のサンプリングと分析（GC分析を含む）の両方ができる" },
      { label: "イ", text: "デザイン・サンプリング（採取・測定）業務のみを行うことができ、分析は行えない" },
      { label: "ウ", text: "第一種作業環境測定士と全く同じ業務ができる" },
      { label: "エ", text: "分析のみを行い、サンプリングは行えない" },
      { label: "オ", text: "第二種測定士は測定機関のみで業務ができる" },
    ],
    correctAnswer: "イ",
    explanation:
      "第二種作業環境測定士はデザイン・サンプリング（試料採取・測定）業務を行える。分析業務（機器分析等）を行うには第一種作業環境測定士の資格が必要。",
    relatedLaw: "作業環境測定法",
  },
  {
    id: "em2-des-2023-002",
    year: 2023,
    certificationId: "env-measure-2nd",
    subject: "em2-design",
    subjectLabel: "デザイン・サンプリング",
    questionNumber: 2,
    questionText:
      "A測定の採取位置（高さ）として作業環境測定基準が定めるものはどれか。",
    choices: [
      { label: "ア", text: "床上30cm以上100cm以下" },
      { label: "イ", text: "床上50cm以上150cm以下" },
      { label: "ウ", text: "床上100cm以上200cm以下" },
      { label: "エ", text: "天井から50cm以内" },
      { label: "オ", text: "高さの規定はなく測定士が適宜決定する" },
    ],
    correctAnswer: "イ",
    explanation:
      "作業環境測定基準第3条により、A測定の採取位置は床上50cm以上150cm以下（作業者の呼吸域の高さ）と定められている。",
    relatedLaw: "作業環境測定基準第3条",
  },
  {
    id: "em2-des-2023-003",
    year: 2023,
    certificationId: "env-measure-2nd",
    subject: "em2-design",
    subjectLabel: "デザイン・サンプリング",
    questionNumber: 3,
    questionText:
      "A測定の測定点数の最少基準として、作業環境測定基準が定めるものはどれか。",
    choices: [
      { label: "ア", text: "2点以上" },
      { label: "イ", text: "3点以上" },
      { label: "ウ", text: "5点以上" },
      { label: "エ", text: "10点以上" },
      { label: "オ", text: "規定はなく測定士の判断による" },
    ],
    correctAnswer: "ウ",
    explanation:
      "作業環境測定基準第3条により、A測定は単位作業場所につき5点以上の測定点を設けなければならない。測定点は無作為（ランダム）に設定する。",
    relatedLaw: "作業環境測定基準第3条",
  },
  {
    id: "em2-des-2023-004",
    year: 2023,
    certificationId: "env-measure-2nd",
    subject: "em2-design",
    subjectLabel: "デザイン・サンプリング",
    questionNumber: 4,
    questionText:
      "B測定を行う主な目的として正しいものはどれか。",
    choices: [
      { label: "ア", text: "単位作業場所の平均的な濃度を把握するため" },
      { label: "イ", text: "有害物質の発生源に最も近い場所で作業者が受けうる最高濃度を把握するため" },
      { label: "ウ", text: "測定の再現性を確認するための繰り返し測定のため" },
      { label: "エ", text: "測定機器の精度確認のための標準測定のため" },
      { label: "オ", text: "B測定は法令上義務付けられた測定であり、全作業場に必須" },
    ],
    correctAnswer: "イ",
    explanation:
      "B測定は発生源に近く最も高い濃度にさらされると考えられる作業位置で行い、最高濃度を把握するための測定。A測定と組み合わせて管理区分を評価する。",
    relatedLaw: "作業環境測定基準",
  },
  {
    id: "em2-des-2023-005",
    year: 2023,
    certificationId: "env-measure-2nd",
    subject: "em2-design",
    subjectLabel: "デザイン・サンプリング",
    questionNumber: 5,
    questionText:
      "有機溶剤のサンプリングに最も一般的に使用される捕集管として正しいものはどれか。",
    choices: [
      { label: "ア", text: "シリカゲルチューブ（塩基性有機物に使用）" },
      { label: "イ", text: "活性炭チューブ（有機溶剤に使用）" },
      { label: "ウ", text: "インピンジャー（液体捕集、主に無機ガスに使用）" },
      { label: "エ", text: "メンブランフィルター（粒子状物質に使用）" },
      { label: "オ", text: "XAD-2樹脂チューブ（農薬・揮発性農薬に使用）" },
    ],
    correctAnswer: "イ",
    explanation:
      "活性炭チューブは有機溶剤（ベンゼン・トルエン・キシレン等）の蒸気捕集に最も広く使用される固体捕集剤。後段の脱着・GC分析で定量する。",
    relatedLaw: "作業環境測定基準",
  },
  {
    id: "em2-des-2023-006",
    year: 2023,
    certificationId: "env-measure-2nd",
    subject: "em2-design",
    subjectLabel: "デザイン・サンプリング",
    questionNumber: 6,
    questionText:
      "作業環境測定のサンプリング中に行うべき確認事項として正しいものはどれか。",
    choices: [
      { label: "ア", text: "採取終了後にのみ流量を確認する" },
      { label: "イ", text: "採取開始前と採取終了時に流量計で流量を確認し記録する" },
      { label: "ウ", text: "流量の確認は月1回のみ実施すれば足りる" },
      { label: "エ", text: "流量の確認は分析機関が行うものであり、サンプリング者は不要" },
      { label: "オ", text: "流量確認は測定士の判断に委ねられる任意事項である" },
    ],
    correctAnswer: "イ",
    explanation:
      "正確な採取量（空気量＝流量×時間）を求めるため、採取開始前と採取終了時に流量を確認・記録することが必要。流量の誤差は最終的な濃度計算に直接影響する。",
  },
  {
    id: "em2-des-2023-007",
    year: 2023,
    certificationId: "env-measure-2nd",
    subject: "em2-design",
    subjectLabel: "デザイン・サンプリング",
    questionNumber: 7,
    questionText:
      "粉じんの測定に使用するエアサンプラーの流量として、一般的に使用されるものはどれか。",
    choices: [
      { label: "ア", text: "0.1L/min以下（マイクロサンプラー）" },
      { label: "イ", text: "1〜2L/min（個人サンプラー向け低流量）" },
      { label: "ウ", text: "20L/min以上（高容量サンプラー）" },
      { label: "エ", text: "100L/min以上（超大容量サンプラー）" },
      { label: "オ", text: "流量は測定物質に関係なく一定（10L/min）と規定されている" },
    ],
    correctAnswer: "イ",
    explanation:
      "粉じんの個人サンプリング（ローボリュームエアサンプラー）は一般に1〜2L/minの流量で行われる。定置式（ミドルボリューム）は20L/min程度が使用される。",
  },
  {
    id: "em2-des-2023-008",
    year: 2023,
    certificationId: "env-measure-2nd",
    subject: "em2-design",
    subjectLabel: "デザイン・サンプリング",
    questionNumber: 8,
    questionText:
      "作業環境測定における「管理濃度」について正しいものはどれか。",
    choices: [
      { label: "ア", text: "管理濃度はすべての有害物質で同じ値（100ppm）が設定されている" },
      { label: "イ", text: "管理濃度は作業環境評価基準で物質ごとに設定された行政的な評価基準値" },
      { label: "ウ", text: "管理濃度は測定値がこれを超えると作業者が直ちに健康障害を受ける濃度" },
      { label: "エ", text: "管理濃度は海外（米国ACGIH）のTLVと完全に同一の値である" },
      { label: "オ", text: "管理濃度を超えた測定値は法令上の罰則対象となる" },
    ],
    correctAnswer: "イ",
    explanation:
      "管理濃度は作業環境評価基準第2条に定められた物質ごとの行政的な評価基準値。TLVとは概念・値が異なる場合もある。管理区分の決定（第1〜第3）に使用する指標値。",
    relatedLaw: "作業環境評価基準第2条",
  },
  {
    id: "em2-des-2023-009",
    year: 2023,
    certificationId: "env-measure-2nd",
    subject: "em2-design",
    subjectLabel: "デザイン・サンプリング",
    questionNumber: 9,
    questionText:
      "作業環境測定を実施した結果を評価（管理区分の判定）するために使用する統計的手法の基礎として正しいものはどれか。",
    choices: [
      { label: "ア", text: "測定値の算術平均と管理濃度を単純比較する" },
      { label: "イ", text: "測定値の最大値と管理濃度のみを比較する" },
      { label: "ウ", text: "測定値が対数正規分布に従うと仮定し、幾何平均・幾何標準偏差から第1評価値・第2評価値を求めて管理濃度と比較する" },
      { label: "エ", text: "5点の測定値のうち最低値と最高値を除いた3点の平均を使用する" },
      { label: "オ", text: "評価は定性的な観察によるもので、統計的処理は不要" },
    ],
    correctAnswer: "ウ",
    explanation:
      "作業環境評価基準では測定値が対数正規分布に従うと仮定。幾何平均（X̄G）と幾何標準偏差（SG）から第1評価値（EA₁：第95百分位値）・第2評価値（EA₂）を算出して管理区分を決定する。",
    relatedLaw: "作業環境評価基準",
  },
  {
    id: "em2-des-2023-010",
    year: 2023,
    certificationId: "env-measure-2nd",
    subject: "em2-design",
    subjectLabel: "デザイン・サンプリング",
    questionNumber: 10,
    questionText:
      "特定化学物質（第1種物質・第2種物質）の作業環境測定の実施頻度として正しいものはどれか。",
    choices: [
      { label: "ア", text: "3月以内ごとに1回" },
      { label: "イ", text: "6月以内ごとに1回" },
      { label: "ウ", text: "1年以内ごとに1回" },
      { label: "エ", text: "2年以内ごとに1回" },
      { label: "オ", text: "測定頻度は作業量によって異なる" },
    ],
    correctAnswer: "イ",
    explanation:
      "特定化学物質障害予防規則第36条により、特定化学物質（第1種・第2種物質）を取り扱う屋内作業場の作業環境測定は6月以内ごとに1回実施しなければならない。",
    relatedLaw: "特定化学物質障害予防規則第36条",
  },

  // ─── デザイン・サンプリング 2024 ─────────────────────────────────────────
  {
    id: "em2-des-2024-001",
    year: 2024,
    certificationId: "env-measure-2nd",
    subject: "em2-design",
    subjectLabel: "デザイン・サンプリング",
    questionNumber: 1,
    questionText:
      "単位作業場所の設定について正しいものはどれか。",
    choices: [
      { label: "ア", text: "単位作業場所は建屋（建物）全体を1つの単位として設定しなければならない" },
      { label: "イ", text: "単位作業場所は有害物質の種類・濃度が比較的均一で作業の種類が同じ区域を設定する" },
      { label: "ウ", text: "単位作業場所は法令で面積が50m²以内と規定されている" },
      { label: "エ", text: "1つの事業場には必ず1つの単位作業場所しか設定できない" },
      { label: "オ", text: "単位作業場所は行政機関が設定するもので測定士は関与しない" },
    ],
    correctAnswer: "イ",
    explanation:
      "単位作業場所は同種の有害業務を行い、空気中有害物質の濃度がほぼ均一と見なせる区域として設定する。1事業場に複数設定することができる。",
    relatedLaw: "作業環境測定基準第2条",
  },
  {
    id: "em2-des-2024-002",
    year: 2024,
    certificationId: "env-measure-2nd",
    subject: "em2-design",
    subjectLabel: "デザイン・サンプリング",
    questionNumber: 2,
    questionText:
      "作業環境測定のA測定のサンプリング時間として正しいものはどれか。",
    choices: [
      { label: "ア", text: "最低1分以上" },
      { label: "イ", text: "最低5分以上" },
      { label: "ウ", text: "最低10分以上" },
      { label: "エ", text: "最低30分以上" },
      { label: "オ", text: "最低1時間以上" },
    ],
    correctAnswer: "ウ",
    explanation:
      "作業環境測定基準第3条により、A測定の採取時間は最低10分間以上。分割採取（複数回の採取を合算）も認められるが、総採取時間は10分以上必要。",
    relatedLaw: "作業環境測定基準第3条",
  },
  {
    id: "em2-des-2024-003",
    year: 2024,
    certificationId: "env-measure-2nd",
    subject: "em2-design",
    subjectLabel: "デザイン・サンプリング",
    questionNumber: 3,
    questionText:
      "作業環境評価基準において、第2評価値（EA₂）の説明として正しいものはどれか。",
    choices: [
      { label: "ア", text: "第2評価値はすべての測定値の算術平均値である" },
      { label: "イ", text: "第2評価値は測定値の中央値（メジアン）である" },
      { label: "ウ", text: "第2評価値は幾何平均値（測定値の対数の算術平均の指数関数値）であり、単位作業場所の代表的な濃度水準を示す" },
      { label: "エ", text: "第2評価値は最大測定値と最小測定値の平均である" },
      { label: "オ", text: "第2評価値はB測定値を使った評価専用の指標である" },
    ],
    correctAnswer: "ウ",
    explanation:
      "第2評価値（EA₂）は測定値の幾何平均値であり、単位作業場所の平均的な濃度水準を示す。EA₂が管理濃度を超えると第3管理区分（最悪）となる。",
    relatedLaw: "作業環境評価基準第3条",
  },
  {
    id: "em2-des-2024-004",
    year: 2024,
    certificationId: "env-measure-2nd",
    subject: "em2-design",
    subjectLabel: "デザイン・サンプリング",
    questionNumber: 4,
    questionText:
      "金属粉じん（鉛等）のサンプリングに使用するフィルターの種類として最も適切なものはどれか。",
    choices: [
      { label: "ア", text: "活性炭フィルター" },
      { label: "イ", text: "MCE（混合セルロースエステル）フィルターまたはPTFEフィルター" },
      { label: "ウ", text: "シリカゲルフィルター" },
      { label: "エ", text: "グラスウールフィルター（粗目）" },
      { label: "オ", text: "フィルターは不要で液体捕集する" },
    ],
    correctAnswer: "イ",
    explanation:
      "金属粉じん（鉛・マンガン・クロム等）の捕集にはMCEフィルター（0.8μm等）またはPTFEフィルターを使用し、酸分解後に原子吸光法・ICP法で定量する。",
    relatedLaw: "作業環境測定基準",
  },
  {
    id: "em2-des-2024-005",
    year: 2024,
    certificationId: "env-measure-2nd",
    subject: "em2-design",
    subjectLabel: "デザイン・サンプリング",
    questionNumber: 5,
    questionText:
      "作業環境測定結果の管理区分と必要な対応の組み合わせとして正しいものはどれか。",
    choices: [
      { label: "ア", text: "第1管理区分：直ちに改善措置が必要" },
      { label: "イ", text: "第2管理区分：現状の環境は良好で措置は不要" },
      { label: "ウ", text: "第3管理区分：直ちに施設・設備の改善等の措置が必要" },
      { label: "エ", text: "第3管理区分：1年以内に改善すればよい" },
      { label: "オ", text: "第2管理区分：作業を直ちに停止しなければならない" },
    ],
    correctAnswer: "ウ",
    explanation:
      "第1管理区分：良好（維持・向上）、第2管理区分：改善努力が必要（保護具の使用等）、第3管理区分：直ちに施設・設備の改善等の措置が必要（最悪の評価）。",
    relatedLaw: "作業環境評価基準第4条",
  },
  {
    id: "em2-des-2024-006",
    year: 2024,
    certificationId: "env-measure-2nd",
    subject: "em2-design",
    subjectLabel: "デザイン・サンプリング",
    questionNumber: 6,
    questionText:
      "作業環境測定のサンプリング記録に含めるべき情報として最も適切でないものはどれか。",
    choices: [
      { label: "ア", text: "採取日時・場所・測定点番号" },
      { label: "イ", text: "採取流量・採取時間（空気採取量）" },
      { label: "ウ", text: "作業内容・有害物質の種類" },
      { label: "エ", text: "測定士の氏名・資格番号" },
      { label: "オ", text: "サンプリング機器の製造年月（購入年月）" },
    ],
    correctAnswer: "オ",
    explanation:
      "機器の購入年月は測定記録の必須事項ではない。記録に必要な項目は測定日時・場所・測定点・採取流量・採取時間・作業内容・有害物質・測定者情報等。",
  },
  {
    id: "em2-des-2024-007",
    year: 2024,
    certificationId: "env-measure-2nd",
    subject: "em2-design",
    subjectLabel: "デザイン・サンプリング",
    questionNumber: 7,
    questionText:
      "粉じん測定における「全粉じん」と「呼吸性粉じん」の違いとして正しいものはどれか。",
    choices: [
      { label: "ア", text: "全粉じんは粒径が10μm以下のすべての粒子を指し、呼吸性粉じんは粒径が100μm超の粒子を指す" },
      { label: "イ", text: "呼吸性粉じんは肺胞まで到達する可能性のある微細粒子（概ね4μm以下）で、全粉じんは空気中に存在するすべての粒子を捕集したもの" },
      { label: "ウ", text: "全粉じんは有機粉じん、呼吸性粉じんは無機粉じんを指す" },
      { label: "エ", text: "全粉じんと呼吸性粉じんは同義で区別しない" },
      { label: "オ", text: "呼吸性粉じんは粒径が50μm以上の粒子のみを対象とする" },
    ],
    correctAnswer: "イ",
    explanation:
      "呼吸性粉じん（respirable dust）は気道を通過して肺胞に到達できる微細粒子（空気力学的径≦4μm程度）。じん肺のリスク評価にはこの区分が重要。全粉じんはすべての粒子を捕集。",
  },
  {
    id: "em2-des-2024-008",
    year: 2024,
    certificationId: "env-measure-2nd",
    subject: "em2-design",
    subjectLabel: "デザイン・サンプリング",
    questionNumber: 8,
    questionText:
      "有機溶剤業務の作業環境測定の記録保存期間として正しいものはどれか。",
    choices: [
      { label: "ア", text: "1年間" },
      { label: "イ", text: "3年間" },
      { label: "ウ", text: "5年間" },
      { label: "エ", text: "30年間" },
      { label: "オ", text: "永久保存" },
    ],
    correctAnswer: "イ",
    explanation:
      "有機溶剤中毒予防規則第28条により、有機溶剤業務の作業環境測定結果の記録は3年間保存しなければならない（特別管理物質に該当する場合は30年間）。",
    relatedLaw: "有機溶剤中毒予防規則第28条",
  },
  {
    id: "em2-des-2024-009",
    year: 2024,
    certificationId: "env-measure-2nd",
    subject: "em2-design",
    subjectLabel: "デザイン・サンプリング",
    questionNumber: 9,
    questionText:
      "個人サンプリングを定置式（エリア）サンプリングより優先して用いる場面として最も適切なものはどれか。",
    choices: [
      { label: "ア", text: "作業者が広い範囲を移動しながら作業する場合、個人の呼吸域での実際の暴露量を把握したい場合" },
      { label: "イ", text: "作業者が固定の場所で常時作業する場合" },
      { label: "ウ", text: "大型の固定発生源がある場合" },
      { label: "エ", text: "測定コストを最小限にしたい場合" },
      { label: "オ", text: "定置式サンプリングが個人サンプリングより常に優先される" },
    ],
    correctAnswer: "ア",
    explanation:
      "個人サンプリングは作業者が移動して作業する場合や実際の個人暴露量を正確に把握したい場合に有効。定置式では作業者が移動する場合の実際の暴露を反映できない。",
  },
  {
    id: "em2-des-2024-010",
    year: 2024,
    certificationId: "env-measure-2nd",
    subject: "em2-design",
    subjectLabel: "デザイン・サンプリング",
    questionNumber: 10,
    questionText:
      "作業環境測定の対象となる業務のうち、有機溶剤中毒予防規則が適用される業務として正しいものはどれか。",
    choices: [
      { label: "ア", text: "屋外の広大な作業場での有機溶剤取扱い業務（屋外は対象外）" },
      { label: "イ", text: "屋内の有機溶剤取扱い業務（密閉容器内の作業を含む）" },
      { label: "ウ", text: "有機溶剤を月に1回だけ少量使用する場合は対象外" },
      { label: "エ", text: "有機溶剤取扱い業務はすべて屋外・屋内を問わず測定対象" },
      { label: "オ", text: "労働者数が50人以上の事業場のみが対象" },
    ],
    correctAnswer: "イ",
    explanation:
      "有機溶剤中毒予防規則は主に屋内作業場・タンク内・船倉内等での有機溶剤業務に適用される。屋外の広大な作業場は適用除外となる場合がある。",
    relatedLaw: "有機溶剤中毒予防規則",
  },

  // ─── 関係法令 2023 ────────────────────────────────────────────────────────
  {
    id: "em2-law-2023-001",
    year: 2023,
    certificationId: "env-measure-2nd",
    subject: "em2-law",
    subjectLabel: "関係法令",
    questionNumber: 1,
    questionText:
      "第二種作業環境測定士の免許を付与する機関として正しいものはどれか。",
    choices: [
      { label: "ア", text: "都道府県知事" },
      { label: "イ", text: "厚生労働大臣" },
      { label: "ウ", text: "労働基準監督署長" },
      { label: "エ", text: "日本作業環境測定協会理事長" },
      { label: "オ", text: "都道府県労働局長" },
    ],
    correctAnswer: "イ",
    explanation:
      "作業環境測定法第5条により、第一種・第二種作業環境測定士の免許はいずれも厚生労働大臣が付与する。試験実施は指定試験機関（日本作業環境測定協会）。",
    relatedLaw: "作業環境測定法第5条",
  },
  {
    id: "em2-law-2023-002",
    year: 2023,
    certificationId: "env-measure-2nd",
    subject: "em2-law",
    subjectLabel: "関係法令",
    questionNumber: 2,
    questionText:
      "作業環境測定の実施が義務付けられている業務を規定する法令として正しいものはどれか。",
    choices: [
      { label: "ア", text: "労働基準法" },
      { label: "イ", text: "労働安全衛生法（施行令第21条）" },
      { label: "ウ", text: "労働者災害補償保険法" },
      { label: "エ", text: "職業安定法" },
      { label: "オ", text: "作業環境測定法のみが根拠法令となる" },
    ],
    correctAnswer: "イ",
    explanation:
      "作業環境測定の義務業務は労働安全衛生法施行令第21条で指定されており（有機溶剤・特定化学物質・鉛・放射線・粉じん等の有害業務）、各物質別規則でも規定される。",
    relatedLaw: "労働安全衛生法施行令第21条",
  },
  {
    id: "em2-law-2023-003",
    year: 2023,
    certificationId: "env-measure-2nd",
    subject: "em2-law",
    subjectLabel: "関係法令",
    questionNumber: 3,
    questionText:
      "作業環境測定結果が第3管理区分と評価された事業者が講じなければならない措置として正しいものはどれか。",
    choices: [
      { label: "ア", text: "次回の測定結果を待って判断すれば足りる" },
      { label: "イ", text: "直ちに施設・設備の改善等の措置を講じ、改善されるまで呼吸用保護具を使用させる" },
      { label: "ウ", text: "労働者への通知のみで足りる" },
      { label: "エ", text: "行政機関への報告のみ義務付けられる" },
      { label: "オ", text: "第3管理区分でも健康診断の実施は不要" },
    ],
    correctAnswer: "イ",
    explanation:
      "作業環境評価基準第4条・労安法第65条の2により、第3管理区分では直ちに施設・設備の改善、改善されるまでの呼吸用保護具の使用、作業環境管理専門家への相談等が必要。",
    relatedLaw: "作業環境評価基準第4条",
  },
  {
    id: "em2-law-2023-004",
    year: 2023,
    certificationId: "env-measure-2nd",
    subject: "em2-law",
    subjectLabel: "関係法令",
    questionNumber: 4,
    questionText:
      "粉じん障害防止規則が対象とする業務として正しいものはどれか。",
    choices: [
      { label: "ア", text: "室内でのパソコン使用業務" },
      { label: "イ", text: "食品の調理業務" },
      { label: "ウ", text: "岩石・鉱物等の粉じんが発散する場所でのさく岩・切断・研磨作業等" },
      { label: "エ", text: "一般の清掃業務" },
      { label: "オ", text: "屋外での農業従事業務全般" },
    ],
    correctAnswer: "ウ",
    explanation:
      "粉じん障害防止規則は遊離けい酸その他の粉じんが発散する場所（岩石・鉱物の切断・穿孔・研磨等）での業務を対象とし、じん肺防止のための措置を規定している。",
    relatedLaw: "粉じん障害防止規則",
  },
  {
    id: "em2-law-2023-005",
    year: 2023,
    certificationId: "env-measure-2nd",
    subject: "em2-law",
    subjectLabel: "関係法令",
    questionNumber: 5,
    questionText:
      "有機溶剤中毒予防規則による有機溶剤業務の作業環境測定の実施頻度として正しいものはどれか。",
    choices: [
      { label: "ア", text: "3月以内ごとに1回" },
      { label: "イ", text: "6月以内ごとに1回" },
      { label: "ウ", text: "1年以内ごとに1回" },
      { label: "エ", text: "2年以内ごとに1回" },
      { label: "オ", text: "測定頻度は規定がなく事業者が決定する" },
    ],
    correctAnswer: "イ",
    explanation:
      "有機溶剤中毒予防規則第28条により、有機溶剤業務を行う屋内作業場の作業環境測定は6月以内ごとに1回定期に実施しなければならない。",
    relatedLaw: "有機溶剤中毒予防規則第28条",
  },
  {
    id: "em2-law-2023-006",
    year: 2023,
    certificationId: "env-measure-2nd",
    subject: "em2-law",
    subjectLabel: "関係法令",
    questionNumber: 6,
    questionText:
      "鉛中毒予防規則による鉛業務の健康診断の実施頻度として正しいものはどれか。",
    choices: [
      { label: "ア", text: "毎月1回" },
      { label: "イ", text: "3月以内ごとに1回" },
      { label: "ウ", text: "6月以内ごとに1回" },
      { label: "エ", text: "1年以内ごとに1回" },
      { label: "オ", text: "健康診断の実施義務はない" },
    ],
    correctAnswer: "ウ",
    explanation:
      "鉛中毒予防規則第53条により、鉛業務に従事する労働者の健康診断は6月以内ごとに1回実施しなければならない。血中鉛濃度・デルタアミノレブリン酸尿中濃度等を検査する。",
    relatedLaw: "鉛中毒予防規則第53条",
  },
  {
    id: "em2-law-2023-007",
    year: 2023,
    certificationId: "env-measure-2nd",
    subject: "em2-law",
    subjectLabel: "関係法令",
    questionNumber: 7,
    questionText:
      "作業環境測定士の免許の欠格事由として作業環境測定法が定めるものはどれか。",
    choices: [
      { label: "ア", text: "50歳以上の者" },
      { label: "イ", text: "この法律に違反して罰金以上の刑に処せられ、その執行の日から2年を経過しない者" },
      { label: "ウ", text: "身体的障害のある者" },
      { label: "エ", text: "外国籍を有する者" },
      { label: "オ", text: "高校卒業以下の学歴の者" },
    ],
    correctAnswer: "イ",
    explanation:
      "作業環境測定法第7条により、法令違反で罰金以上の刑に処せられ執行後2年を経過しない者等は免許の欠格事由に該当し免許を受けることができない。",
    relatedLaw: "作業環境測定法第7条",
  },
  {
    id: "em2-law-2023-008",
    year: 2023,
    certificationId: "env-measure-2nd",
    subject: "em2-law",
    subjectLabel: "関係法令",
    questionNumber: 8,
    questionText:
      "特定化学物質障害予防規則において、特別管理物質の作業環境測定記録の保存期間として正しいものはどれか。",
    choices: [
      { label: "ア", text: "3年間" },
      { label: "イ", text: "5年間" },
      { label: "ウ", text: "10年間" },
      { label: "エ", text: "30年間" },
      { label: "オ", text: "永久保存" },
    ],
    correctAnswer: "エ",
    explanation:
      "特別管理物質（ベンゼン・コークス炉上の発散物・砒素等）の作業環境測定記録は30年間保存しなければならない（特化則第40条）。将来の健康被害補償に備えた長期保存義務。",
    relatedLaw: "特定化学物質障害予防規則第40条",
  },
  {
    id: "em2-law-2023-009",
    year: 2023,
    certificationId: "env-measure-2nd",
    subject: "em2-law",
    subjectLabel: "関係法令",
    questionNumber: 9,
    questionText:
      "作業環境測定結果の労働者への周知義務について正しいものはどれか。",
    choices: [
      { label: "ア", text: "測定結果は行政機関への報告のみ義務付けられ、労働者への周知義務はない" },
      { label: "イ", text: "測定結果は労働者が見やすい場所への掲示等の方法で周知しなければならない" },
      { label: "ウ", text: "周知は作業主任者へのみ行えば足りる" },
      { label: "エ", text: "第3管理区分の場合のみ周知義務がある" },
      { label: "オ", text: "周知は任意であり義務ではない" },
    ],
    correctAnswer: "イ",
    explanation:
      "労働安全衛生法第65条の5（2022年改正）により、作業環境測定結果等は労働者が見やすい場所に掲示する等の方法で周知しなければならない。",
    relatedLaw: "労働安全衛生法第65条の5",
  },
  {
    id: "em2-law-2023-010",
    year: 2023,
    certificationId: "env-measure-2nd",
    subject: "em2-law",
    subjectLabel: "関係法令",
    questionNumber: 10,
    questionText:
      "作業環境測定法第3条が定める作業環境測定士の責務として正しいものはどれか。",
    choices: [
      { label: "ア", text: "測定結果を公開する義務" },
      { label: "イ", text: "毎年30時間以上の研修を受ける義務" },
      { label: "ウ", text: "職務を誠実に行い、作業環境の改善に貢献するよう努める義務" },
      { label: "エ", text: "測定機関に所属する義務" },
      { label: "オ", text: "測定料金を無償とする義務" },
    ],
    correctAnswer: "ウ",
    explanation:
      "作業環境測定法第3条により、作業環境測定士はその職務を誠実に行うとともに、作業環境の改善に貢献するよう努めなければならない誠実義務が定められている。",
    relatedLaw: "作業環境測定法第3条",
  },

  // ─── 関係法令 2024 ────────────────────────────────────────────────────────
  {
    id: "em2-law-2024-001",
    year: 2024,
    certificationId: "env-measure-2nd",
    subject: "em2-law",
    subjectLabel: "関係法令",
    questionNumber: 1,
    questionText:
      "作業環境測定機関（登録測定機関）の登録権者として正しいものはどれか。",
    choices: [
      { label: "ア", text: "都道府県知事" },
      { label: "イ", text: "労働基準監督署長" },
      { label: "ウ", text: "厚生労働大臣" },
      { label: "エ", text: "日本作業環境測定協会" },
      { label: "オ", text: "都道府県労働局長" },
    ],
    correctAnswer: "ウ",
    explanation:
      "作業環境測定法第33条により、作業環境測定機関（登録測定機関）の登録は厚生労働大臣が行う。登録を受けた機関のみが事業者から委託を受けて測定を実施できる。",
    relatedLaw: "作業環境測定法第33条",
  },
  {
    id: "em2-law-2024-002",
    year: 2024,
    certificationId: "env-measure-2nd",
    subject: "em2-law",
    subjectLabel: "関係法令",
    questionNumber: 2,
    questionText:
      "作業環境測定士が免許を取消された場合の対応として正しいものはどれか。",
    choices: [
      { label: "ア", text: "取消後直ちに再申請できる" },
      { label: "イ", text: "取消後2年間は再申請できない" },
      { label: "ウ", text: "取消後は永久に再申請できない" },
      { label: "エ", text: "取消後に免許証を返納し、再申請要件を満たせば再取得が可能" },
      { label: "オ", text: "取消後は業務停止のみで免許証の返納は不要" },
    ],
    correctAnswer: "エ",
    explanation:
      "作業環境測定法第11条・12条により、免許が取消された場合は免許証を返納しなければならない。欠格事由が解消した後は、一定期間後に再申請が可能な場合がある。",
    relatedLaw: "作業環境測定法第11条・第12条",
  },
  {
    id: "em2-law-2024-003",
    year: 2024,
    certificationId: "env-measure-2nd",
    subject: "em2-law",
    subjectLabel: "関係法令",
    questionNumber: 3,
    questionText:
      "特定化学物質（第2種物質）を取り扱う屋内作業場の作業環境測定頻度として正しいものはどれか。",
    choices: [
      { label: "ア", text: "3月以内ごとに1回" },
      { label: "イ", text: "6月以内ごとに1回" },
      { label: "ウ", text: "1年以内ごとに1回" },
      { label: "エ", text: "2年以内ごとに1回" },
      { label: "オ", text: "測定義務なし" },
    ],
    correctAnswer: "イ",
    explanation:
      "特定化学物質障害予防規則第36条により、特定化学物質（第1種・第2種物質）を取り扱う屋内作業場の作業環境測定は6月以内ごとに1回実施しなければならない。",
    relatedLaw: "特定化学物質障害予防規則第36条",
  },
  {
    id: "em2-law-2024-004",
    year: 2024,
    certificationId: "env-measure-2nd",
    subject: "em2-law",
    subjectLabel: "関係法令",
    questionNumber: 4,
    questionText:
      "労働安全衛生法第65条が定める作業環境測定の実施義務の主体として正しいものはどれか。",
    choices: [
      { label: "ア", text: "作業環境測定士" },
      { label: "イ", text: "作業環境測定機関" },
      { label: "ウ", text: "事業者" },
      { label: "エ", text: "産業医" },
      { label: "オ", text: "労働基準監督官" },
    ],
    correctAnswer: "ウ",
    explanation:
      "労働安全衛生法第65条は事業者に対して有害業務の作業環境測定の実施を義務付けている。事業者は自ら行うか、作業環境測定機関に委託することができる。",
    relatedLaw: "労働安全衛生法第65条",
  },
  {
    id: "em2-law-2024-005",
    year: 2024,
    certificationId: "env-measure-2nd",
    subject: "em2-law",
    subjectLabel: "関係法令",
    questionNumber: 5,
    questionText:
      "有機溶剤中毒予防規則において、第1種・第2種有機溶剤の作業場に設置が義務付けられている設備として正しいものはどれか。",
    choices: [
      { label: "ア", text: "防爆型換気扇（排気のみ）" },
      { label: "イ", text: "局所排気装置・プッシュプル型換気装置または全体換気装置（物質・作業形態による）" },
      { label: "ウ", text: "空気清浄機（一般の家庭用）" },
      { label: "エ", text: "換気設備の設置義務はなく、呼吸用保護具のみで対応できる" },
      { label: "オ", text: "スプリンクラーの設置が義務付けられている" },
    ],
    correctAnswer: "イ",
    explanation:
      "有機溶剤中毒予防規則では取扱い作業の種類・溶剤の種別によって局所排気装置・プッシュプル型換気装置・全体換気装置の設置が義務付けられている。",
    relatedLaw: "有機溶剤中毒予防規則第5条",
  },
  {
    id: "em2-law-2024-006",
    year: 2024,
    certificationId: "env-measure-2nd",
    subject: "em2-law",
    subjectLabel: "関係法令",
    questionNumber: 6,
    questionText:
      "じん肺法における「じん肺健康診断」の対象者として正しいものはどれか。",
    choices: [
      { label: "ア", text: "すべての製造業労働者" },
      { label: "イ", text: "常時粉じん作業に従事する労働者またはかつて従事したことがある労働者" },
      { label: "ウ", text: "60歳以上の全労働者" },
      { label: "エ", text: "じん肺健康診断は法的に規定されていない" },
      { label: "オ", text: "粉じん作業に従事する管理職のみ" },
    ],
    correctAnswer: "イ",
    explanation:
      "じん肺法第7条により、常時粉じん作業に従事する労働者およびかつて常時粉じん作業に従事した労働者（管理区分に応じて）にじん肺健康診断を実施しなければならない。",
    relatedLaw: "じん肺法第7条",
  },
  {
    id: "em2-law-2024-007",
    year: 2024,
    certificationId: "env-measure-2nd",
    subject: "em2-law",
    subjectLabel: "関係法令",
    questionNumber: 7,
    questionText:
      "作業環境測定において、事業者が測定を第三者（登録測定機関）に委託した場合の責任の所在として正しいものはどれか。",
    choices: [
      { label: "ア", text: "委託した場合は事業者の責任が完全に免除される" },
      { label: "イ", text: "委託した場合でも、測定実施に関する最終的な法的責任は事業者に残る" },
      { label: "ウ", text: "委託した場合は登録測定機関のみが責任を負う" },
      { label: "エ", text: "委託した場合は行政機関が責任を負う" },
      { label: "オ", text: "委託の可否は法令で禁止されており、必ず自社で実施しなければならない" },
    ],
    correctAnswer: "イ",
    explanation:
      "作業環境測定を登録測定機関に委託した場合でも、事業者は労働安全衛生法上の測定実施義務の主体であり、測定の適正実施に関する責任は事業者に帰属する。",
    relatedLaw: "労働安全衛生法第65条",
  },
  {
    id: "em2-law-2024-008",
    year: 2024,
    certificationId: "env-measure-2nd",
    subject: "em2-law",
    subjectLabel: "関係法令",
    questionNumber: 8,
    questionText:
      "労働安全衛生法第65条の2に基づく作業環境測定結果の評価後に事業者が講ずべき措置として正しいものはどれか。",
    choices: [
      { label: "ア", text: "評価結果が第1管理区分の場合も直ちに改善措置が必要" },
      { label: "イ", text: "評価結果に基づき、必要に応じて施設・設備の改善、作業方法の改善、保護具の使用等の措置を講じる" },
      { label: "ウ", text: "評価結果が第3管理区分でも措置は任意である" },
      { label: "エ", text: "評価結果の記録は不要で、行動のみ記録する" },
      { label: "オ", text: "評価はすべて外部コンサルタントに委ねなければならない" },
    ],
    correctAnswer: "イ",
    explanation:
      "労安法第65条の2により、評価結果（管理区分）に応じた適切な措置が必要。第1は維持・向上、第2は自主的改善、第3は直ちに改善措置と呼吸用保護具の使用が義務。",
    relatedLaw: "労働安全衛生法第65条の2",
  },
  {
    id: "em2-law-2024-009",
    year: 2024,
    certificationId: "env-measure-2nd",
    subject: "em2-law",
    subjectLabel: "関係法令",
    questionNumber: 9,
    questionText:
      "じん肺法に基づくじん肺管理区分の決定機関として正しいものはどれか。",
    choices: [
      { label: "ア", text: "事業者" },
      { label: "イ", text: "産業医" },
      { label: "ウ", text: "都道府県労働局長" },
      { label: "エ", text: "厚生労働大臣" },
      { label: "オ", text: "労働基準監督署長" },
    ],
    correctAnswer: "ウ",
    explanation:
      "じん肺法第12条により、じん肺管理区分は都道府県労働局長が決定する。事業者は健康診断結果をじん肺健康診断結果証明書として提出し、局長が管理区分（管理1〜4）を決定。",
    relatedLaw: "じん肺法第12条",
  },
  {
    id: "em2-law-2024-010",
    year: 2024,
    certificationId: "env-measure-2nd",
    subject: "em2-law",
    subjectLabel: "関係法令",
    questionNumber: 10,
    questionText:
      "作業環境測定法において、事業者が作業環境測定を行わなかった場合に適用される罰則として最も近いものはどれか。",
    choices: [
      { label: "ア", text: "罰則はなく行政指導のみ" },
      { label: "イ", text: "労働安全衛生法に基づく懲役または罰金刑が適用される" },
      { label: "ウ", text: "作業環境測定法独自の無期懲役が適用される" },
      { label: "エ", text: "測定義務違反は民事責任のみ問われる" },
      { label: "オ", text: "事業停止命令のみが適用される" },
    ],
    correctAnswer: "イ",
    explanation:
      "作業環境測定の不実施は労働安全衛生法第65条違反として、同法第119条等により6月以下の懲役または50万円以下の罰金が適用される場合がある。",
    relatedLaw: "労働安全衛生法第119条",
  },
];
