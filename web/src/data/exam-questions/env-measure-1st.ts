import type { ExamQuestion } from "./types";

export const questions: ExamQuestion[] = [
  // ─── デザイン・サンプリング 2023 ─────────────────────────────────────────
  {
    id: "em1-des-2023-001",
    year: 2023,
    certificationId: "env-measure-1st",
    subject: "em1-design",
    subjectLabel: "デザイン・サンプリング",
    questionNumber: 1,
    questionText:
      "作業環境測定のA測定に関する記述として、正しいものはどれか。",
    choices: [
      { label: "ア", text: "A測定は単位作業場所の中で最も有害物質濃度が高いと考えられる場所で行う測定である" },
      { label: "イ", text: "A測定は作業者が実際に作業を行っている位置での個人サンプリングである" },
      { label: "ウ", text: "A測定は単位作業場所内に無作為に測定点を設け、床上50〜150cmの高さで行う測定である" },
      { label: "エ", text: "A測定は有害物質の発生源直近での測定であり、最高濃度を把握するために行う" },
      { label: "オ", text: "A測定の測定点数は2点以上あれば足りる" },
    ],
    correctAnswer: "ウ",
    explanation:
      "A測定は単位作業場所内に等間隔の点を無作為に設定し、床上50〜150cmの高さで行う。単位作業場所の平均的な濃度水準を把握するための測定。",
    relatedLaw: "作業環境測定基準",
  },
  {
    id: "em1-des-2023-002",
    year: 2023,
    certificationId: "env-measure-1st",
    subject: "em1-design",
    subjectLabel: "デザイン・サンプリング",
    questionNumber: 2,
    questionText:
      "B測定に関する記述として正しいものはどれか。",
    choices: [
      { label: "ア", text: "B測定は単位作業場所内の平均濃度を把握するための測定である" },
      { label: "イ", text: "B測定は有害物質の発生源に近い場所で、作業者がさらされる最高濃度を把握するための測定である" },
      { label: "ウ", text: "B測定は個人サンプリングとして作業者の胸ポケットに装着して行う" },
      { label: "エ", text: "B測定はすべての作業場で実施義務がある" },
      { label: "オ", text: "B測定の測定点は5点以上必要である" },
    ],
    correctAnswer: "イ",
    explanation:
      "B測定は発生源に近い箇所で作業者が受ける最高濃度を把握する目的で実施する。A測定と組み合わせて作業環境の総合的評価を行う。",
    relatedLaw: "作業環境測定基準",
  },
  {
    id: "em1-des-2023-003",
    year: 2023,
    certificationId: "env-measure-1st",
    subject: "em1-design",
    subjectLabel: "デザイン・サンプリング",
    questionNumber: 3,
    questionText:
      "単位作業場所の設定について正しいものはどれか。",
    choices: [
      { label: "ア", text: "単位作業場所はすべての事業場で1つだけ設定する" },
      { label: "イ", text: "単位作業場所は作業の種類・有害物質の種類が同じで、有害物質の濃度がほぼ均一な作業区域をいう" },
      { label: "ウ", text: "単位作業場所は法令で面積が規定されており、100m²以下でなければならない" },
      { label: "エ", text: "単位作業場所は必ず屋内に設定しなければならない" },
      { label: "オ", text: "単位作業場所の設定は測定士の裁量によらず行政機関が決定する" },
    ],
    correctAnswer: "イ",
    explanation:
      "単位作業場所は、作業の種類・有害物質の種類が同じで濃度が比較的均一な範囲の作業区域をいう。その中でA測定点を5点以上設定して測定を行う。",
    relatedLaw: "作業環境測定基準第2条",
  },
  {
    id: "em1-des-2023-004",
    year: 2023,
    certificationId: "env-measure-1st",
    subject: "em1-design",
    subjectLabel: "デザイン・サンプリング",
    questionNumber: 4,
    questionText:
      "A測定の測定点数について、作業環境測定基準が定める最少点数として正しいものはどれか。",
    choices: [
      { label: "ア", text: "2点以上" },
      { label: "イ", text: "3点以上" },
      { label: "ウ", text: "5点以上" },
      { label: "エ", text: "10点以上" },
      { label: "オ", text: "測定点数の規定はなく測定士が判断する" },
    ],
    correctAnswer: "ウ",
    explanation:
      "作業環境測定基準により、A測定の測定点は単位作業場所につき5点以上設けなければならない。測定点は無作為に選定する（等間隔グリッド法等）。",
    relatedLaw: "作業環境測定基準第3条",
  },
  {
    id: "em1-des-2023-005",
    year: 2023,
    certificationId: "env-measure-1st",
    subject: "em1-design",
    subjectLabel: "デザイン・サンプリング",
    questionNumber: 5,
    questionText:
      "有機溶剤（トルエン等）のサンプリングに用いる個人サンプラーとして、最も一般的なものはどれか。",
    choices: [
      { label: "ア", text: "インピンジャー（液体捕集）" },
      { label: "イ", text: "活性炭チューブを用いた固体捕集方式" },
      { label: "ウ", text: "ミゼットインピンジャー（吸収液あり）" },
      { label: "エ", text: "メンブランフィルター（PTFE）捕集" },
      { label: "オ", text: "シリカゲルチューブのみが有機溶剤に使用できる" },
    ],
    correctAnswer: "イ",
    explanation:
      "有機溶剤（ベンゼン・トルエン・キシレン等）は活性炭チューブを用いた固体捕集が標準法。活性炭に吸着させ、二硫化炭素等で脱着後にGCで分析する。",
    relatedLaw: "作業環境測定基準",
  },
  {
    id: "em1-des-2023-006",
    year: 2023,
    certificationId: "env-measure-1st",
    subject: "em1-design",
    subjectLabel: "デザイン・サンプリング",
    questionNumber: 6,
    questionText:
      "粉じんの測定に用いるサンプリング機器として正しいものはどれか。",
    choices: [
      { label: "ア", text: "活性炭チューブ" },
      { label: "イ", text: "バブラー（液体捕集瓶）" },
      { label: "ウ", text: "ローボリュームエアサンプラーとフィルター（捕集ろ紙）" },
      { label: "エ", text: "光電光度計のみで測定できる（捕集不要）" },
      { label: "オ", text: "インピンジャーと吸収液による液体捕集" },
    ],
    correctAnswer: "ウ",
    explanation:
      "粉じん測定には、ローボリューム（個人サンプラー）またはミドルボリュームエアサンプラーにガラスせんい製ろ紙等のフィルターを用いてサンプリングし、重量法で定量する。",
    relatedLaw: "作業環境測定基準",
  },
  {
    id: "em1-des-2023-007",
    year: 2023,
    certificationId: "env-measure-1st",
    subject: "em1-design",
    subjectLabel: "デザイン・サンプリング",
    questionNumber: 7,
    questionText:
      "金属（鉛・マンガン等）のサンプリング方法として最も適切なものはどれか。",
    choices: [
      { label: "ア", text: "活性炭チューブによる固体捕集" },
      { label: "イ", text: "シリカゲルチューブによる固体捕集" },
      { label: "ウ", text: "メンブランフィルター（MCEフィルター等）による捕集後、酸分解して分析" },
      { label: "エ", text: "液体窒素トラップによる冷却捕集" },
      { label: "オ", text: "検知管のみで定量分析が可能" },
    ],
    correctAnswer: "ウ",
    explanation:
      "金属類（鉛・マンガン・クロム等）はメンブランフィルター（MCEまたはPTFEフィルター）で空気中粒子を捕集し、酸分解後に原子吸光法またはICP発光分光法で定量する。",
    relatedLaw: "作業環境測定基準",
  },
  {
    id: "em1-des-2023-008",
    year: 2023,
    certificationId: "env-measure-1st",
    subject: "em1-design",
    subjectLabel: "デザイン・サンプリング",
    questionNumber: 8,
    questionText:
      "作業環境測定のサンプリング時間について正しいものはどれか。",
    choices: [
      { label: "ア", text: "A測定のサンプリング時間は最低10分以上必要である" },
      { label: "イ", text: "A測定のサンプリング時間は最低10分以上で、連続サンプリングが原則である" },
      { label: "ウ", text: "サンプリング時間は測定点ごとに異なっても構わない" },
      { label: "エ", text: "全サンプリングは1時間以上連続して行わなければならない" },
      { label: "オ", text: "サンプリング時間の規定は物質ごとに異なり一律ではない" },
    ],
    correctAnswer: "イ",
    explanation:
      "作業環境測定基準により、A測定の採取時間は最低10分間以上。同一測定点での繰り返しサンプリングを合算する分割採取も認められるが、連続サンプリングが原則。",
    relatedLaw: "作業環境測定基準第3条",
  },
  {
    id: "em1-des-2023-009",
    year: 2023,
    certificationId: "env-measure-1st",
    subject: "em1-design",
    subjectLabel: "デザイン・サンプリング",
    questionNumber: 9,
    questionText:
      "作業環境測定を実施する際のサンプリング位置（高さ）として、作業環境測定基準が定めるものはどれか。",
    choices: [
      { label: "ア", text: "床面から30cm以上、100cm以下" },
      { label: "イ", text: "床面から50cm以上、150cm以下" },
      { label: "ウ", text: "床面から100cm以上、200cm以下" },
      { label: "エ", text: "天井から50cm以内" },
      { label: "オ", text: "測定士が適切と判断した高さでよく規定はない" },
    ],
    correctAnswer: "イ",
    explanation:
      "作業環境測定基準第3条により、A測定の採取高さは床上50cm以上150cm以下（作業者の呼吸域を想定した高さ）と定められている。",
    relatedLaw: "作業環境測定基準第3条",
  },
  {
    id: "em1-des-2023-010",
    year: 2023,
    certificationId: "env-measure-1st",
    subject: "em1-design",
    subjectLabel: "デザイン・サンプリング",
    questionNumber: 10,
    questionText:
      "特定化学物質（第1種・第2種）の測定頻度として、作業環境測定法が定める原則はどれか。",
    choices: [
      { label: "ア", text: "毎月1回定期に測定する" },
      { label: "イ", text: "6月以内ごとに1回定期に測定する" },
      { label: "ウ", text: "1年以内ごとに1回定期に測定する" },
      { label: "エ", text: "3年以内ごとに1回定期に測定する" },
      { label: "オ", text: "測定頻度の定めはなく、事業者が任意に決定する" },
    ],
    correctAnswer: "イ",
    explanation:
      "労働安全衛生法施行令・特化則により、特定化学物質（第1種・第2種）を取り扱う作業場の作業環境測定は6月以内ごとに1回実施しなければならない。",
    relatedLaw: "特定化学物質障害予防規則第36条",
  },

  // ─── デザイン・サンプリング 2024 ─────────────────────────────────────────
  {
    id: "em1-des-2024-001",
    year: 2024,
    certificationId: "env-measure-1st",
    subject: "em1-design",
    subjectLabel: "デザイン・サンプリング",
    questionNumber: 1,
    questionText:
      "作業環境評価基準における第1評価値（EA₁）の意味として正しいものはどれか。",
    choices: [
      { label: "ア", text: "単位作業場所内で測定された最高濃度の値" },
      { label: "イ", text: "単位作業場所の気中有害物質濃度の算術平均値" },
      { label: "ウ", text: "単位作業場所の気中有害物質濃度の幾何平均値と幾何標準偏差から推定される、第95百分位値（上側5%の値）" },
      { label: "エ", text: "単位作業場所の全測定値の中央値" },
      { label: "オ", text: "B測定値の最大値のみを用いた評価値" },
    ],
    correctAnswer: "ウ",
    explanation:
      "第1評価値（EA₁）は測定値の対数正規分布を仮定し、幾何平均と幾何標準偏差から計算される第95百分位値。管理濃度と比較して管理区分（第1〜第3管理区分）を決定する。",
    relatedLaw: "作業環境評価基準",
  },
  {
    id: "em1-des-2024-002",
    year: 2024,
    certificationId: "env-measure-1st",
    subject: "em1-design",
    subjectLabel: "デザイン・サンプリング",
    questionNumber: 2,
    questionText:
      "作業環境評価の第1管理区分の意味として正しいものはどれか。",
    choices: [
      { label: "ア", text: "全測定値が管理濃度を超え、直ちに改善が必要な状態" },
      { label: "イ", text: "第1評価値（EA₁）が管理濃度以下であり、気中有害物質の濃度が管理濃度を超える労働者はほとんどいない状態" },
      { label: "ウ", text: "第2評価値が管理濃度を超えている状態" },
      { label: "エ", text: "測定値の平均が管理濃度の1/2以下の状態" },
      { label: "オ", text: "第1管理区分は改善が必要な最悪の状態を示す" },
    ],
    correctAnswer: "イ",
    explanation:
      "第1管理区分は最も良い状態。EA₁≦管理濃度を満たし、作業環境の維持・向上に努める。第2は要改善努力、第3管理区分は直ちに改善が必要な状態。",
    relatedLaw: "作業環境評価基準第3条",
  },
  {
    id: "em1-des-2024-003",
    year: 2024,
    certificationId: "env-measure-1st",
    subject: "em1-design",
    subjectLabel: "デザイン・サンプリング",
    questionNumber: 3,
    questionText:
      "個人サンプリング法と定置式サンプリング（エリアサンプリング）の違いについて正しいものはどれか。",
    choices: [
      { label: "ア", text: "個人サンプリングは固定点での測定、定置式は個人に装着する" },
      { label: "イ", text: "個人サンプリングは作業者の呼吸域での実際の暴露濃度を測定でき、定置式は作業場の代表点での濃度を測定する" },
      { label: "ウ", text: "定置式サンプリングのほうが常に精度が高い" },
      { label: "エ", text: "個人サンプリングは法令上認められていない方法である" },
      { label: "オ", text: "両者の測定値は常に同じ結果を示す" },
    ],
    correctAnswer: "イ",
    explanation:
      "個人サンプリングは作業者の胸部付近（呼吸域）にサンプラーを装着し、実際の作業中の暴露濃度を直接測定できる。定置式は作業場所の固定点での空間濃度を測定する。",
  },
  {
    id: "em1-des-2024-004",
    year: 2024,
    certificationId: "env-measure-1st",
    subject: "em1-design",
    subjectLabel: "デザイン・サンプリング",
    questionNumber: 4,
    questionText:
      "検知管法による作業環境測定の特徴として正しいものはどれか。",
    choices: [
      { label: "ア", text: "検知管法はすべての有害物質の定量分析に最も精度の高い方法である" },
      { label: "イ", text: "検知管法は簡便で現場での即時確認には有用だが、精度が低く作業環境評価の本測定には原則使用できない" },
      { label: "ウ", text: "検知管法は法令上の作業環境測定の正式な方法として認められている" },
      { label: "エ", text: "検知管法は低濃度域での精度が特に高い" },
      { label: "オ", text: "検知管は温度・湿度の影響を全く受けない" },
    ],
    correctAnswer: "イ",
    explanation:
      "検知管法は簡便で即時判定に有用だが、精度が低い（誤差大）ため法定の本測定（作業環境評価基準による評価）には原則使用できない。スクリーニングや予備調査に用いる。",
  },
  {
    id: "em1-des-2024-005",
    year: 2024,
    certificationId: "env-measure-1st",
    subject: "em1-design",
    subjectLabel: "デザイン・サンプリング",
    questionNumber: 5,
    questionText:
      "有機溶剤の蒸気を活性炭チューブに捕集する際の注意事項として正しいものはどれか。",
    choices: [
      { label: "ア", text: "高湿度環境では吸着効率が低下することがある" },
      { label: "イ", text: "活性炭チューブは温度に関係なく一定の吸着性能を示す" },
      { label: "ウ", text: "吸引流量の変化は採取量に影響しない" },
      { label: "エ", text: "チューブ前後段の重量差で有機溶剤量を求める（重量法）" },
      { label: "オ", text: "活性炭チューブは開封後6ヶ月間使用可能である" },
    ],
    correctAnswer: "ア",
    explanation:
      "活性炭は疎水性が高く有機溶剤の吸着に優れるが、高湿度環境では水蒸気が競合し吸着効率が低下することがある。採取後は密封して速やかに分析機関に送付する。",
  },
  {
    id: "em1-des-2024-006",
    year: 2024,
    certificationId: "env-measure-1st",
    subject: "em1-design",
    subjectLabel: "デザイン・サンプリング",
    questionNumber: 6,
    questionText:
      "呼吸性粉じん（吸入性粉じん）の測定に使用するサイクロンプレセパレータの目的として正しいものはどれか。",
    choices: [
      { label: "ア", text: "すべての粒子径の粉じんを均等に捕集するために使用する" },
      { label: "イ", text: "呼吸器系に到達する可能性のある微細粒子（呼吸性粉じん）を選択的に捕集するために使用する" },
      { label: "ウ", text: "大型粒子のみを捕集するためのフィルター代替品" },
      { label: "エ", text: "ガス状物質の除去に使用する前処理装置" },
      { label: "オ", text: "吸引流量を一定に保つための流量安定装置" },
    ],
    correctAnswer: "イ",
    explanation:
      "サイクロンプレセパレータは空気力学径が4μm以下の呼吸性粉じん（肺胞沈着粉じん）を選択的に捕集するための粒径分離装置。肺胞域に到達する粉じんの評価に用いる。",
  },
  {
    id: "em1-des-2024-007",
    year: 2024,
    certificationId: "env-measure-1st",
    subject: "em1-design",
    subjectLabel: "デザイン・サンプリング",
    questionNumber: 7,
    questionText:
      "作業環境測定記録の保存期間として、原則として定められているものはどれか。",
    choices: [
      { label: "ア", text: "1年間" },
      { label: "イ", text: "3年間" },
      { label: "ウ", text: "5年間" },
      { label: "エ", text: "30年間（特別管理物質等）" },
      { label: "オ", text: "3年間が原則だが、特別管理物質は30年間" },
    ],
    correctAnswer: "オ",
    explanation:
      "作業環境測定記録の保存期間は原則3年間。ただし、特別管理物質（ベンゼン・コークス炉上の発散物等）は30年間保存しなければならない。",
    relatedLaw: "特定化学物質障害予防規則・有機溶剤中毒予防規則",
  },
  {
    id: "em1-des-2024-008",
    year: 2024,
    certificationId: "env-measure-1st",
    subject: "em1-design",
    subjectLabel: "デザイン・サンプリング",
    questionNumber: 8,
    questionText:
      "デザインサーベイ（予備調査）の目的として正しいものはどれか。",
    choices: [
      { label: "ア", text: "法定の本測定の代替として実施する" },
      { label: "イ", text: "単位作業場所の設定・測定方法の選定・測定点の決定等のための事前情報収集" },
      { label: "ウ", text: "作業環境評価基準による評価を行うための唯一の方法" },
      { label: "エ", text: "行政機関への報告のために行う義務的調査" },
      { label: "オ", text: "デザインサーベイは法令上義務付けられた正式な測定方法" },
    ],
    correctAnswer: "イ",
    explanation:
      "デザインサーベイ（予備調査）は本測定前に作業内容・有害物質の種類・換気状況等を調査し、単位作業場所の設定・測定点の決め方・採取方法を計画するために行う。",
  },
  {
    id: "em1-des-2024-009",
    year: 2024,
    certificationId: "env-measure-1st",
    subject: "em1-design",
    subjectLabel: "デザイン・サンプリング",
    questionNumber: 9,
    questionText:
      "作業環境測定を実施しなければならない有害業務として正しいものはどれか。",
    choices: [
      { label: "ア", text: "一般事務作業（デスクワーク）" },
      { label: "イ", text: "屋外での単純作業" },
      { label: "ウ", text: "有機溶剤業務（屋内・タンク内等）・特定化学物質業務等の法令で指定された業務" },
      { label: "エ", text: "食品製造業務全般" },
      { label: "オ", text: "すべての製造業の業務に測定義務がある" },
    ],
    correctAnswer: "ウ",
    explanation:
      "作業環境測定の義務がある業務は労働安全衛生法施行令第21条で指定されており、有機溶剤・特定化学物質・鉛・粉じん・放射線等の有害業務が対象。",
    relatedLaw: "労働安全衛生法施行令第21条",
  },
  {
    id: "em1-des-2024-010",
    year: 2024,
    certificationId: "env-measure-1st",
    subject: "em1-design",
    subjectLabel: "デザイン・サンプリング",
    questionNumber: 10,
    questionText:
      "管理濃度の定義として正しいものはどれか。",
    choices: [
      { label: "ア", text: "労働者が生涯にわたって暴露しても健康影響が生じない濃度" },
      { label: "イ", text: "作業環境の気中有害物質の濃度の水準を評価するための指標であり、健康障害防止の観点から設定された行政的な基準値" },
      { label: "ウ", text: "TLV-TWA（米国産業衛生専門家会議）が定める暴露限界値と同じもの" },
      { label: "エ", text: "管理濃度はすべての有害物質について同じ値が設定されている" },
      { label: "オ", text: "管理濃度を超えていても直ちに法令違反にはならない" },
    ],
    correctAnswer: "イ",
    explanation:
      "管理濃度は作業環境評価基準で定められた、作業環境管理の良否を評価するための行政的な基準値。健康障害防止の観点から物質ごとに設定されており、TLVとは概念が異なる。",
    relatedLaw: "作業環境評価基準第2条",
  },

  // ─── 分析概論 2023 ────────────────────────────────────────────────────────
  {
    id: "em1-ana-2023-001",
    year: 2023,
    certificationId: "env-measure-1st",
    subject: "em1-analysis",
    subjectLabel: "分析概論",
    questionNumber: 1,
    questionText:
      "ガスクロマトグラフ（GC）の分離原理として正しいものはどれか。",
    choices: [
      { label: "ア", text: "物質の分子量の違いによって分離する" },
      { label: "イ", text: "物質の電荷の違いによって電場で分離する" },
      { label: "ウ", text: "キャリアガスで試料を移動相として運び、固定相との相互作用の差（沸点・極性等）によって分離する" },
      { label: "エ", text: "光の屈折率の違いによって分離する" },
      { label: "オ", text: "物質の磁気的性質の違いによって分離する" },
    ],
    correctAnswer: "ウ",
    explanation:
      "GCはキャリアガス（移動相）で試料を運び、カラム内固定相との相互作用の差（主に揮発性・沸点・極性）によって成分を分離する。有機溶剤分析の主流の分析法。",
  },
  {
    id: "em1-ana-2023-002",
    year: 2023,
    certificationId: "env-measure-1st",
    subject: "em1-analysis",
    subjectLabel: "分析概論",
    questionNumber: 2,
    questionText:
      "ガスクロマトグラフの検出器のうち、有機溶剤（炭化水素系）の検出に最も感度が高いものはどれか。",
    choices: [
      { label: "ア", text: "熱伝導度検出器（TCD）" },
      { label: "イ", text: "炎光光度検出器（FPD）" },
      { label: "ウ", text: "水素炎イオン化検出器（FID）" },
      { label: "エ", text: "電子捕獲型検出器（ECD）" },
      { label: "オ", text: "窒素リン検出器（NPD）" },
    ],
    correctAnswer: "ウ",
    explanation:
      "水素炎イオン化検出器（FID）は炭化水素に対して高感度・広い直線範囲を持ち、有機溶剤分析に最も広く使用される。ECDはハロゲン化合物、NPDは窒素・リン化合物に感度が高い。",
  },
  {
    id: "em1-ana-2023-003",
    year: 2023,
    certificationId: "env-measure-1st",
    subject: "em1-analysis",
    subjectLabel: "分析概論",
    questionNumber: 3,
    questionText:
      "原子吸光分析法の原理として正しいものはどれか。",
    choices: [
      { label: "ア", text: "試料を高温で励起させ、放出する特有の発光波長を測定する" },
      { label: "イ", text: "基底状態にある原子が特定の波長の光を吸収する性質を利用し、その吸光度から元素濃度を測定する" },
      { label: "ウ", text: "プラズマに励起した原子が放出する光のスペクトルを測定する" },
      { label: "エ", text: "試料をX線照射して発生する特性X線のエネルギーを測定する" },
      { label: "オ", text: "荷電粒子の質量と電荷の比（m/z）を測定する" },
    ],
    correctAnswer: "イ",
    explanation:
      "原子吸光法（AAS）は基底状態の原子が特定波長の光（空洞陰極ランプ等）を吸収する特性を利用。吸光度とランベルト・ベールの法則により元素濃度を定量する。",
  },
  {
    id: "em1-ana-2023-004",
    year: 2023,
    certificationId: "env-measure-1st",
    subject: "em1-analysis",
    subjectLabel: "分析概論",
    questionNumber: 4,
    questionText:
      "ICP（誘導結合プラズマ）発光分光分析法（ICP-OES）の特徴として正しいものはどれか。",
    choices: [
      { label: "ア", text: "一度に1元素しか測定できない" },
      { label: "イ", text: "多元素を同時または連続して測定できる高感度な分析法である" },
      { label: "ウ", text: "原子吸光法より感度が大幅に低い" },
      { label: "エ", text: "有機化合物の分析のみに使用される" },
      { label: "オ", text: "ICP-OESはガス状試料のみに対応している" },
    ],
    correctAnswer: "イ",
    explanation:
      "ICP-OESはアルゴンプラズマ（約6000〜8000K）で試料を完全原子化・励起し、放出する発光スペクトルを測定。多元素同時分析が可能で高感度・ワイドダイナミックレンジが特徴。",
  },
  {
    id: "em1-ana-2023-005",
    year: 2023,
    certificationId: "env-measure-1st",
    subject: "em1-analysis",
    subjectLabel: "分析概論",
    questionNumber: 5,
    questionText:
      "ランベルト・ベールの法則に関する記述として正しいものはどれか。",
    choices: [
      { label: "ア", text: "吸光度は試料濃度の二乗に比例する" },
      { label: "イ", text: "吸光度は試料濃度と光路長の積に比例する（A＝ε×l×c）" },
      { label: "ウ", text: "透過率は試料濃度に正比例する" },
      { label: "エ", text: "吸光度は光源の強度に依存する" },
      { label: "オ", text: "吸光度と透過率は同じ値を示す" },
    ],
    correctAnswer: "イ",
    explanation:
      "ランベルト・ベールの法則：吸光度A＝ε×l×c（εはモル吸光係数、lは光路長（cm）、cは濃度（mol/L））。吸光度は濃度と光路長の積に比例し、分光光度法の基礎となる。",
  },
  {
    id: "em1-ana-2023-006",
    year: 2023,
    certificationId: "env-measure-1st",
    subject: "em1-analysis",
    subjectLabel: "分析概論",
    questionNumber: 6,
    questionText:
      "粉じんの重量分析（重量法）において重要な手順として正しいものはどれか。",
    choices: [
      { label: "ア", text: "フィルターの秤量は粉じん採取前のみ行えば足りる" },
      { label: "イ", text: "フィルターは採取前後ともに一定条件（温度・湿度）でデシケータ保管後に秤量し、重量差から粉じん量を求める" },
      { label: "ウ", text: "粉じん量はフィルター採取後に直ちに秤量して求める" },
      { label: "エ", text: "重量分析では採取空気量の測定は不要である" },
      { label: "オ", text: "粉じんの重量分析では採取後のフィルターを水洗いしてから秤量する" },
    ],
    correctAnswer: "イ",
    explanation:
      "重量法では採取前後のフィルターを一定温度・湿度（例：20℃・50%RH）でデシケータで調湿後に精密天秤で秤量し、前後の重量差から粉じん捕集量を求める。",
  },
  {
    id: "em1-ana-2023-007",
    year: 2023,
    certificationId: "env-measure-1st",
    subject: "em1-analysis",
    subjectLabel: "分析概論",
    questionNumber: 7,
    questionText:
      "検量線（校正曲線）の作成において正しいものはどれか。",
    choices: [
      { label: "ア", text: "検量線は1点の標準液のみで作成できる" },
      { label: "イ", text: "検量線は複数濃度の標準液を用いて測定し、濃度と応答値の関係を直線（または曲線）で表したもの" },
      { label: "ウ", text: "検量線の直線性は試料濃度に関係なく維持される" },
      { label: "エ", text: "検量線は一度作成すれば機器を変えても使用できる" },
      { label: "オ", text: "検量線の原点は必ず0を通らなければならない" },
    ],
    correctAnswer: "イ",
    explanation:
      "検量線は複数濃度の標準溶液を調製し、分析機器で測定した応答値（吸光度・ピーク面積等）と既知濃度の関係を求めたもの。未知試料の濃度はここから内挿して求める。",
  },
  {
    id: "em1-ana-2023-008",
    year: 2023,
    certificationId: "env-measure-1st",
    subject: "em1-analysis",
    subjectLabel: "分析概論",
    questionNumber: 8,
    questionText:
      "分析における「精度」と「確度」の違いとして正しいものはどれか。",
    choices: [
      { label: "ア", text: "精度は測定値の真値への近さ、確度は測定のばらつきの小ささを表す" },
      { label: "イ", text: "確度（真度）は測定値が真値にどれだけ近いかを示し、精度はばらつきの小ささ（再現性）を示す" },
      { label: "ウ", text: "精度と確度は同義語で区別しない" },
      { label: "エ", text: "精度は機器の性能のみで決まり、確度は操作手順で決まる" },
      { label: "オ", text: "確度と精度の両方が高ければ分析値は必ず正しい" },
    ],
    correctAnswer: "イ",
    explanation:
      "確度（真度）は測定値が真値に近い程度（系統誤差の小ささ）を示す。精度（精密度）はくり返し測定したときのばらつきの小ささ（偶然誤差の小ささ）を示す。両方が必要。",
  },
  {
    id: "em1-ana-2023-009",
    year: 2023,
    certificationId: "env-measure-1st",
    subject: "em1-analysis",
    subjectLabel: "分析概論",
    questionNumber: 9,
    questionText:
      "高速液体クロマトグラフ（HPLC）の用途として最も適切なものはどれか。",
    choices: [
      { label: "ア", text: "気化・揮発性の高い有機溶剤の直接分析のみに使用される" },
      { label: "イ", text: "揮発性が低い・熱に不安定な化合物（アクリルアミド・多環芳香族炭化水素等）の分析に適する" },
      { label: "ウ", text: "HPLCは無機元素の分析に専用の装置である" },
      { label: "エ", text: "HPLCはGCと全く同じ原理で動作する" },
      { label: "オ", text: "HPLCはすべての物質の分析でGCより感度が高い" },
    ],
    correctAnswer: "イ",
    explanation:
      "HPLCは液体移動相と固定相の相互作用で分離する手法。揮発性が低い・熱に不安定な物質（農薬・アクリルアミド・PAH・染料等）の分析に適し、作業環境測定でも活用される。",
  },
  {
    id: "em1-ana-2023-010",
    year: 2023,
    certificationId: "env-measure-1st",
    subject: "em1-analysis",
    subjectLabel: "分析概論",
    questionNumber: 10,
    questionText:
      "測定の不確かさ（uncertainty）に関する記述として正しいものはどれか。",
    choices: [
      { label: "ア", text: "測定の不確かさはゼロにすることが技術的に可能である" },
      { label: "イ", text: "測定の不確かさはすべての誤差要因（サンプリング・分析等）を考慮して評価すべきである" },
      { label: "ウ", text: "測定の不確かさは機器の校正のみで完全に排除できる" },
      { label: "エ", text: "測定値が管理濃度以下であれば不確かさの評価は不要である" },
      { label: "オ", text: "不確かさはサンプリング段階では発生しない" },
    ],
    correctAnswer: "イ",
    explanation:
      "測定の不確かさはサンプリング・試料前処理・分析・標準液調製等すべての段階で発生し、合成標準不確かさとして評価する。不確かさがゼロになることはない。",
  },

  // ─── 分析概論 2024 ────────────────────────────────────────────────────────
  {
    id: "em1-ana-2024-001",
    year: 2024,
    certificationId: "env-measure-1st",
    subject: "em1-analysis",
    subjectLabel: "分析概論",
    questionNumber: 1,
    questionText:
      "ガスクロマトグラフィーにおけるカラム（分離管）の種類について正しいものはどれか。",
    choices: [
      { label: "ア", text: "充填カラムはキャピラリーカラムより分解能が高い" },
      { label: "イ", text: "キャピラリーカラムは充填カラムより高分解能で多成分の分離に優れる" },
      { label: "ウ", text: "キャピラリーカラムはカラム温度の影響を受けない" },
      { label: "エ", text: "充填カラムはキャピラリーカラムより試料容量が小さい" },
      { label: "オ", text: "すべてのGC分析でキャピラリーカラムは使用できない" },
    ],
    correctAnswer: "イ",
    explanation:
      "キャピラリーカラム（毛細管カラム）は充填カラムより理論段数が大幅に高く、複数成分の高分解能分離が可能。現在の作業環境測定分析では主流の分析法。",
  },
  {
    id: "em1-ana-2024-002",
    year: 2024,
    certificationId: "env-measure-1st",
    subject: "em1-analysis",
    subjectLabel: "分析概論",
    questionNumber: 2,
    questionText:
      "ICP-MS（誘導結合プラズマ質量分析）の特徴として正しいものはどれか。",
    choices: [
      { label: "ア", text: "ICP-MSはICP-OESより検出限界が高く感度が低い" },
      { label: "イ", text: "ICP-MSは質量数を利用した同位体分析が可能で、ppbまたはppt（ng/L）レベルの超低濃度分析ができる" },
      { label: "ウ", text: "ICP-MSは有機物の分析専用である" },
      { label: "エ", text: "ICP-MSは単一元素しか測定できない" },
      { label: "オ", text: "ICP-MSは大気圧で動作するため特別な装置は不要" },
    ],
    correctAnswer: "イ",
    explanation:
      "ICP-MSはプラズマでイオン化した元素を質量分析計で検出。検出感度がICP-OESより100〜1000倍高く、多元素同時分析・同位体比測定が可能。作業環境の超微量元素分析に有用。",
  },
  {
    id: "em1-ana-2024-003",
    year: 2024,
    certificationId: "env-measure-1st",
    subject: "em1-analysis",
    subjectLabel: "分析概論",
    questionNumber: 3,
    questionText:
      "吸光光度法による分析で使用するセルの材質として、紫外（UV）域（200〜400nm）の測定に適したものはどれか。",
    choices: [
      { label: "ア", text: "ソーダガラスセル" },
      { label: "イ", text: "石英（シリカ）セル" },
      { label: "ウ", text: "プラスチック（ポリスチレン）セル" },
      { label: "エ", text: "硼珪酸ガラスセル" },
      { label: "オ", text: "セルの材質はUV域では関係ない" },
    ],
    correctAnswer: "イ",
    explanation:
      "石英（溶融シリカ）セルはUV域（200nm以上）で透過性が高い。ソーダガラスやプラスチックセルは可視域（400nm以上）のみ使用可能で、UV域では光を吸収してしまう。",
  },
  {
    id: "em1-ana-2024-004",
    year: 2024,
    certificationId: "env-measure-1st",
    subject: "em1-analysis",
    subjectLabel: "分析概論",
    questionNumber: 4,
    questionText:
      "ガスクロマトグラフの保持時間（リテンションタイム）について正しいものはどれか。",
    choices: [
      { label: "ア", text: "保持時間は定性分析（物質の同定）の指標として使用できる" },
      { label: "イ", text: "保持時間はピークの高さを示し定量に使用する" },
      { label: "ウ", text: "保持時間はカラム温度に関係なく一定である" },
      { label: "エ", text: "保持時間が同じ物質は必ず同一化合物である" },
      { label: "オ", text: "保持時間は検出器の種類によって決まる" },
    ],
    correctAnswer: "ア",
    explanation:
      "GCの保持時間は化合物ごとにカラム・カラム温度・キャリアガス流量等の一定条件下で固有の値をとるため、定性分析（化合物の同定）に利用できる。定量にはピーク面積（または高さ）を使う。",
  },
  {
    id: "em1-ana-2024-005",
    year: 2024,
    certificationId: "env-measure-1st",
    subject: "em1-analysis",
    subjectLabel: "分析概論",
    questionNumber: 5,
    questionText:
      "分析における「空試験（ブランク）」の目的として正しいものはどれか。",
    choices: [
      { label: "ア", text: "試料中の全有機物を定量するための参照として使用する" },
      { label: "イ", text: "試薬・容器・操作過程に由来するバックグラウンドを把握し、測定値から差し引くために実施する" },
      { label: "ウ", text: "ブランク試験は検量線の最高濃度点として使用する" },
      { label: "エ", text: "ブランク試験は分析操作の最後に行う" },
      { label: "オ", text: "ブランク値がゼロでないと分析は実施できない" },
    ],
    correctAnswer: "イ",
    explanation:
      "空試験（ブランク）は試料を含まないが同じ操作を施した溶液の測定値。試薬・容器・操作由来の汚染（バックグラウンド）を把握し、試料の測定値から差し引いて正確な分析値を得る。",
  },
  {
    id: "em1-ana-2024-006",
    year: 2024,
    certificationId: "env-measure-1st",
    subject: "em1-analysis",
    subjectLabel: "分析概論",
    questionNumber: 6,
    questionText:
      "原子吸光分析における「バックグラウンド補正」が必要な理由として正しいものはどれか。",
    choices: [
      { label: "ア", text: "試料マトリックスによる非特異的な光吸収や散乱を補正するため" },
      { label: "イ", text: "測定元素の検出感度を高めるため" },
      { label: "ウ", text: "測定波長の選択を自動化するため" },
      { label: "エ", text: "空洞陰極ランプの光量補正のみを目的とする" },
      { label: "オ", text: "バックグラウンド補正は高濃度試料にのみ適用する" },
    ],
    correctAnswer: "ア",
    explanation:
      "AASでは試料マトリックス（共存物質）による非特異的な光吸収や光散乱がバックグラウンドとして測定値に影響するため、重水素ランプ法やゼーマン効果等でバックグラウンド補正を行う。",
  },
  {
    id: "em1-ana-2024-007",
    year: 2024,
    certificationId: "env-measure-1st",
    subject: "em1-analysis",
    subjectLabel: "分析概論",
    questionNumber: 7,
    questionText:
      "ガスクロマトグラフィーにおける内部標準法の利点として正しいものはどれか。",
    choices: [
      { label: "ア", text: "標準液の調製が不要になる" },
      { label: "イ", text: "注入量のばらつきや回収率の変動を補正でき、精度の高い定量が可能" },
      { label: "ウ", text: "内部標準物質は目的物質と同じ化合物を使用する" },
      { label: "エ", text: "内部標準法は検量線を必要としない分析法である" },
      { label: "オ", text: "内部標準法は外部標準法より常に精度が低い" },
    ],
    correctAnswer: "イ",
    explanation:
      "内部標準法は試料に一定量の内部標準物質を添加し、目的成分と内部標準のピーク比から定量する。注入量誤差・前処理の回収率変動を補正でき高精度の定量が可能。",
  },
  {
    id: "em1-ana-2024-008",
    year: 2024,
    certificationId: "env-measure-1st",
    subject: "em1-analysis",
    subjectLabel: "分析概論",
    questionNumber: 8,
    questionText:
      "石英繊維ろ紙に捕集した粉じんの蛍光X線分析法の特徴として正しいものはどれか。",
    choices: [
      { label: "ア", text: "試料を溶解しないと測定できない湿式分析法である" },
      { label: "イ", text: "X線照射で元素固有の特性X線を発生させ、試料を溶解せずに多元素の定量が可能" },
      { label: "ウ", text: "有機物の分析にのみ使用される" },
      { label: "エ", text: "蛍光X線分析では炭素（C）・酸素（O）等の軽元素の分析が特に得意" },
      { label: "オ", text: "蛍光X線分析は検出限界がAASより大幅に低い" },
    ],
    correctAnswer: "イ",
    explanation:
      "蛍光X線分析（XRF）は試料にX線を照射し発生する特性X線を検出。非破壊・多元素同時分析が可能で、フィルター上粉じんの金属元素分析に適する。軽元素（C・O・N）の感度は低い。",
  },
  {
    id: "em1-ana-2024-009",
    year: 2024,
    certificationId: "env-measure-1st",
    subject: "em1-analysis",
    subjectLabel: "分析概論",
    questionNumber: 9,
    questionText:
      "ガスクロマトグラフ分析で使用するキャリアガスとして最も一般的に用いられるものはどれか。",
    choices: [
      { label: "ア", text: "酸素（O₂）" },
      { label: "イ", text: "窒素（N₂）またはヘリウム（He）" },
      { label: "ウ", text: "水蒸気（H₂O）" },
      { label: "エ", text: "二酸化炭素（CO₂）" },
      { label: "オ", text: "アルゴン（Ar）のみが使用可能" },
    ],
    correctAnswer: "イ",
    explanation:
      "GCのキャリアガスは不活性で純度の高いヘリウム（He）または窒素（N₂）が最もよく使用される。FID検出器では窒素またはヘリウムを使用し、水素と空気はフレーム形成用に別途供給する。",
  },
  {
    id: "em1-ana-2024-010",
    year: 2024,
    certificationId: "env-measure-1st",
    subject: "em1-analysis",
    subjectLabel: "分析概論",
    questionNumber: 10,
    questionText:
      "分光光度計（紫外可視吸光光度計）の構成要素とその機能の組み合わせとして正しいものはどれか。",
    choices: [
      { label: "ア", text: "光源（重水素ランプ・タングステンランプ）→分光器→試料セル→検出器の順で光路が構成される" },
      { label: "イ", text: "検出器→試料セル→分光器→光源の順で光路が構成される" },
      { label: "ウ", text: "試料セルは光源の前に配置される" },
      { label: "エ", text: "分光器は試料セルの後に配置され透過光を波長分離する" },
      { label: "オ", text: "光源は試料セルの後に配置される" },
    ],
    correctAnswer: "ア",
    explanation:
      "分光光度計の光路は光源→分光器（モノクロメータ）→試料セル→検出器の順。光源から出た光を分光器で単色光に分離し、試料セルを通過した後の透過光強度を検出器で測定する。",
  },

  // ─── 関係法令 2023 ────────────────────────────────────────────────────────
  {
    id: "em1-law-2023-001",
    year: 2023,
    certificationId: "env-measure-1st",
    subject: "em1-law",
    subjectLabel: "関係法令",
    questionNumber: 1,
    questionText:
      "第一種作業環境測定士の免許を付与する機関として正しいものはどれか。",
    choices: [
      { label: "ア", text: "都道府県知事" },
      { label: "イ", text: "厚生労働大臣" },
      { label: "ウ", text: "労働基準監督署長" },
      { label: "エ", text: "日本作業環境測定協会" },
      { label: "オ", text: "都道府県労働局長" },
    ],
    correctAnswer: "イ",
    explanation:
      "作業環境測定法第5条により、第一種・第二種作業環境測定士の免許は厚生労働大臣が付与する。試験は指定試験機関（日本作業環境測定協会）が実施する。",
    relatedLaw: "作業環境測定法第5条",
  },
  {
    id: "em1-law-2023-002",
    year: 2023,
    certificationId: "env-measure-1st",
    subject: "em1-law",
    subjectLabel: "関係法令",
    questionNumber: 2,
    questionText:
      "作業環境測定法において、第一種作業環境測定士が測定を行うことができる業務として正しいものはどれか。",
    choices: [
      { label: "ア", text: "第一種作業環境測定士は一般粉じん測定のみを行える" },
      { label: "イ", text: "第一種作業環境測定士は放射性物質を除くすべての有害物質の作業環境測定ができる" },
      { label: "ウ", text: "第一種作業環境測定士は登録した業種・物質の測定を行うことができる" },
      { label: "エ", text: "第一種作業環境測定士は第二種測定士が行える業務には従事できない" },
      { label: "オ", text: "第一種作業環境測定士は測定だけでなく分析も行う資格を持つ" },
    ],
    correctAnswer: "ウ",
    explanation:
      "第一種作業環境測定士は免許取得後、特定の業種・物質区分を登録することで、その範囲の作業環境測定（サンプリング・分析）を行うことができる。",
    relatedLaw: "作業環境測定法第5条",
  },
  {
    id: "em1-law-2023-003",
    year: 2023,
    certificationId: "env-measure-1st",
    subject: "em1-law",
    subjectLabel: "関係法令",
    questionNumber: 3,
    questionText:
      "作業環境測定機関（登録測定機関）に関する記述として正しいものはどれか。",
    choices: [
      { label: "ア", text: "作業環境測定機関の登録は都道府県知事が行う" },
      { label: "イ", text: "作業環境測定機関は厚生労働大臣の登録を受けた機関で、事業者から委託を受けて測定を行える" },
      { label: "ウ", text: "作業環境測定機関は営利目的で運営することが禁止されている" },
      { label: "エ", text: "作業環境測定機関への委託は任意であり、事業者が自ら測定する義務がある" },
      { label: "オ", text: "登録測定機関の有効期間は2年で更新が必要" },
    ],
    correctAnswer: "イ",
    explanation:
      "作業環境測定法第33条により、作業環境測定機関（登録測定機関）は厚生労働大臣の登録を受け、事業者から委託を受けて作業環境測定を実施できる。",
    relatedLaw: "作業環境測定法第33条",
  },
  {
    id: "em1-law-2023-004",
    year: 2023,
    certificationId: "env-measure-1st",
    subject: "em1-law",
    subjectLabel: "関係法令",
    questionNumber: 4,
    questionText:
      "有機溶剤中毒予防規則による作業環境測定の記録保存期間として正しいものはどれか。",
    choices: [
      { label: "ア", text: "1年間" },
      { label: "イ", text: "3年間" },
      { label: "ウ", text: "5年間" },
      { label: "エ", text: "10年間" },
      { label: "オ", text: "永久保存" },
    ],
    correctAnswer: "イ",
    explanation:
      "有機溶剤中毒予防規則第28条により、有機溶剤業務の作業環境測定記録は3年間保存しなければならない（ただし特別管理物質は30年間）。",
    relatedLaw: "有機溶剤中毒予防規則第28条",
  },
  {
    id: "em1-law-2023-005",
    year: 2023,
    certificationId: "env-measure-1st",
    subject: "em1-law",
    subjectLabel: "関係法令",
    questionNumber: 5,
    questionText:
      "労働安全衛生法施行令第21条により作業環境測定が義務付けられている業務として正しいものはどれか。",
    choices: [
      { label: "ア", text: "事務用パソコンを使用する業務" },
      { label: "イ", text: "指定有機溶剤を使用する業務（有機溶剤中毒予防規則対象）" },
      { label: "ウ", text: "飲食物の製造業務全般" },
      { label: "エ", text: "屋外での土木工事業務全般" },
      { label: "オ", text: "一般事務作業全般" },
    ],
    correctAnswer: "イ",
    explanation:
      "労安法施行令第21条は有機溶剤業務・特定化学物質業務・鉛業務・酸素欠乏危険場所・放射線業務等の有害業務について作業環境測定を義務付けている。",
    relatedLaw: "労働安全衛生法施行令第21条",
  },
  {
    id: "em1-law-2023-006",
    year: 2023,
    certificationId: "env-measure-1st",
    subject: "em1-law",
    subjectLabel: "関係法令",
    questionNumber: 6,
    questionText:
      "作業環境管理専門家の職務として、作業環境測定法が定めるものはどれか。",
    choices: [
      { label: "ア", text: "作業環境の測定のみを行う" },
      { label: "イ", text: "第3管理区分と評価された事業場での作業環境改善の技術的指導" },
      { label: "ウ", text: "労働者の健康診断の実施" },
      { label: "エ", text: "安全衛生委員会の議長を務める" },
      { label: "オ", text: "作業環境管理専門家は存在せず、作業主任者と同じ役割である" },
    ],
    correctAnswer: "イ",
    explanation:
      "労働安全衛生法第65条の2の2により、第3管理区分と評価された場合は作業環境管理専門家から技術的指導を受け、改善措置を講じなければならない（2022年改正）。",
    relatedLaw: "労働安全衛生法第65条の2の2",
  },
  {
    id: "em1-law-2023-007",
    year: 2023,
    certificationId: "env-measure-1st",
    subject: "em1-law",
    subjectLabel: "関係法令",
    questionNumber: 7,
    questionText:
      "作業環境測定結果の評価（管理区分の決定）を行うことが事業者に義務付けられている根拠法令はどれか。",
    choices: [
      { label: "ア", text: "労働基準法" },
      { label: "イ", text: "労働安全衛生法第65条の2" },
      { label: "ウ", text: "作業環境測定法第3条" },
      { label: "エ", text: "じん肺法第1条" },
      { label: "オ", text: "職業能力開発促進法" },
    ],
    correctAnswer: "イ",
    explanation:
      "労働安全衛生法第65条の2により、作業環境測定を実施した事業者は結果に基づき適切な措置を講ずるとともに、厚生労働省令が定める評価を行わなければならない。",
    relatedLaw: "労働安全衛生法第65条の2",
  },
  {
    id: "em1-law-2023-008",
    year: 2023,
    certificationId: "env-measure-1st",
    subject: "em1-law",
    subjectLabel: "関係法令",
    questionNumber: 8,
    questionText:
      "第一種作業環境測定士試験に合格した後、免許を取得するために必要な手続きとして正しいものはどれか。",
    choices: [
      { label: "ア", text: "試験合格のみで自動的に免許が発行される" },
      { label: "イ", text: "合格後に一定の実務経験を積んだ後、厚生労働大臣に免許申請を行う" },
      { label: "ウ", text: "合格後に都道府県知事に免許申請を行う" },
      { label: "エ", text: "合格後に所属機関の推薦書を添えて労働局に申請する" },
      { label: "オ", text: "合格後2年以内に免許申請を行わないと失効する" },
    ],
    correctAnswer: "イ",
    explanation:
      "第一種作業環境測定士は試験合格後、一定の実務経験（第一種指定作業場での測定業務等）を経て、厚生労働大臣に免許の申請を行い交付を受ける必要がある。",
    relatedLaw: "作業環境測定法第5条",
  },
  {
    id: "em1-law-2023-009",
    year: 2023,
    certificationId: "env-measure-1st",
    subject: "em1-law",
    subjectLabel: "関係法令",
    questionNumber: 9,
    questionText:
      "特別管理物質（ベンゼン・石綿等）の作業環境測定記録の保存期間として正しいものはどれか。",
    choices: [
      { label: "ア", text: "3年間" },
      { label: "イ", text: "5年間" },
      { label: "ウ", text: "10年間" },
      { label: "エ", text: "30年間" },
      { label: "オ", text: "永久保存" },
    ],
    correctAnswer: "エ",
    explanation:
      "特別管理物質（特化則第40条）・石綿（石綿則）等の作業環境測定記録は30年間保存しなければならない（将来の健康被害補償に備えた長期保存）。",
    relatedLaw: "特定化学物質障害予防規則第40条",
  },
  {
    id: "em1-law-2023-010",
    year: 2023,
    certificationId: "env-measure-1st",
    subject: "em1-law",
    subjectLabel: "関係法令",
    questionNumber: 10,
    questionText:
      "粉じん障害防止規則による作業環境測定（遊離けい酸含有粉じん等）の実施頻度として正しいものはどれか。",
    choices: [
      { label: "ア", text: "毎月1回" },
      { label: "イ", text: "3月以内ごとに1回" },
      { label: "ウ", text: "6月以内ごとに1回" },
      { label: "エ", text: "1年以内ごとに1回" },
      { label: "オ", text: "5年以内ごとに1回" },
    ],
    correctAnswer: "ウ",
    explanation:
      "粉じん障害防止規則第26条により、特定粉じん作業場（屋内の坑内作業場等）の粉じん濃度測定は6月以内ごとに1回実施しなければならない。",
    relatedLaw: "粉じん障害防止規則第26条",
  },

  // ─── 関係法令 2024 ────────────────────────────────────────────────────────
  {
    id: "em1-law-2024-001",
    year: 2024,
    certificationId: "env-measure-1st",
    subject: "em1-law",
    subjectLabel: "関係法令",
    questionNumber: 1,
    questionText:
      "作業環境測定法における「第一種指定作業場」の定義として正しいものはどれか。",
    choices: [
      { label: "ア", text: "すべての製造業の作業場を指す" },
      { label: "イ", text: "第一種作業環境測定士（分析業務を含む）が測定を行う必要がある、高度な分析が必要な有害物質の作業場" },
      { label: "ウ", text: "屋外の作業場全般を指す" },
      { label: "エ", text: "労働者数が50人以上の事業場の作業場を指す" },
      { label: "オ", text: "作業主任者が選任されている作業場のみを指す" },
    ],
    correctAnswer: "イ",
    explanation:
      "第一種指定作業場は作業環境測定法施行令で指定された作業場で、第一種作業環境測定士（またはその管理下のデザイン・サンプリング）によるデザイン・サンプリングと分析が必要。",
    relatedLaw: "作業環境測定法施行令",
  },
  {
    id: "em1-law-2024-002",
    year: 2024,
    certificationId: "env-measure-1st",
    subject: "em1-law",
    subjectLabel: "関係法令",
    questionNumber: 2,
    questionText:
      "作業環境測定結果が第3管理区分と評価された場合に事業者が講ずべき措置として正しいものはどれか。",
    choices: [
      { label: "ア", text: "特に措置は不要で次回測定を待てばよい" },
      { label: "イ", text: "直ちに作業環境改善を図るための措置を講じなければならない" },
      { label: "ウ", text: "従業員への通知のみ行えば足りる" },
      { label: "エ", text: "作業を一時停止し、再測定のみを行えばよい" },
      { label: "オ", text: "1年間継続して第3管理区分の場合のみ措置が必要" },
    ],
    correctAnswer: "イ",
    explanation:
      "労安法第65条の2・作業環境評価基準第4条により、第3管理区分（最悪の評価）では直ちに施設・設備の改善、呼吸用保護具の使用等の措置を講じなければならない。",
    relatedLaw: "労働安全衛生法第65条の2",
  },
  {
    id: "em1-law-2024-003",
    year: 2024,
    certificationId: "env-measure-1st",
    subject: "em1-law",
    subjectLabel: "関係法令",
    questionNumber: 3,
    questionText:
      "鉛中毒予防規則による鉛業務の作業環境測定の実施頻度として正しいものはどれか。",
    choices: [
      { label: "ア", text: "3月以内ごとに1回" },
      { label: "イ", text: "6月以内ごとに1回" },
      { label: "ウ", text: "1年以内ごとに1回" },
      { label: "エ", text: "測定頻度は規定されていない" },
      { label: "オ", text: "2年以内ごとに1回" },
    ],
    correctAnswer: "イ",
    explanation:
      "鉛中毒予防規則第52条により、鉛業務を行う屋内作業場の作業環境測定は6月以内ごとに1回実施しなければならない。",
    relatedLaw: "鉛中毒予防規則第52条",
  },
  {
    id: "em1-law-2024-004",
    year: 2024,
    certificationId: "env-measure-1st",
    subject: "em1-law",
    subjectLabel: "関係法令",
    questionNumber: 4,
    questionText:
      "作業環境測定士の免許の取消事由として、作業環境測定法が定めるものとして正しいものはどれか。",
    choices: [
      { label: "ア", text: "5年以上測定業務に従事しなかった場合" },
      { label: "イ", text: "免許取得後に転職した場合" },
      { label: "ウ", text: "この法律またはこれに基づく命令に違反した場合" },
      { label: "エ", text: "測定結果が第3管理区分となった場合" },
      { label: "オ", text: "測定機関を退職した場合" },
    ],
    correctAnswer: "ウ",
    explanation:
      "作業環境測定法第11条により、作業環境測定士が法令違反・不正行為等を行った場合、厚生労働大臣は免許の取消しまたは業務停止を命ずることができる。",
    relatedLaw: "作業環境測定法第11条",
  },
  {
    id: "em1-law-2024-005",
    year: 2024,
    certificationId: "env-measure-1st",
    subject: "em1-law",
    subjectLabel: "関係法令",
    questionNumber: 5,
    questionText:
      "石綿障害予防規則による石綿含有建材の除去作業場の作業環境測定の実施要件として正しいものはどれか。",
    choices: [
      { label: "ア", text: "石綿除去作業は作業環境測定の対象外である" },
      { label: "イ", text: "石綿除去作業は作業環境測定の実施義務があり、記録は40年間保存する" },
      { label: "ウ", text: "石綿除去作業の記録は3年間保存すればよい" },
      { label: "エ", text: "石綿の測定義務は有機溶剤と同じく6月以内ごとに1回" },
      { label: "オ", text: "石綿作業は特別管理物質に分類されないため通常の保存期間が適用される" },
    ],
    correctAnswer: "イ",
    explanation:
      "石綿障害予防規則第36条により、石綿等を取り扱う作業場の作業環境測定記録は特別管理物質として40年間（一定の措置後）保存しなければならない。",
    relatedLaw: "石綿障害予防規則第36条",
  },
  {
    id: "em1-law-2024-006",
    year: 2024,
    certificationId: "env-measure-1st",
    subject: "em1-law",
    subjectLabel: "関係法令",
    questionNumber: 6,
    questionText:
      "有機溶剤業務の作業環境測定の実施頻度として正しいものはどれか（有機溶剤中毒予防規則）。",
    choices: [
      { label: "ア", text: "3月以内ごとに1回" },
      { label: "イ", text: "6月以内ごとに1回" },
      { label: "ウ", text: "1年以内ごとに1回" },
      { label: "エ", text: "2年以内ごとに1回" },
      { label: "オ", text: "測定頻度は規定されていない" },
    ],
    correctAnswer: "イ",
    explanation:
      "有機溶剤中毒予防規則第28条により、有機溶剤業務を行う屋内作業場の作業環境測定は6月以内ごとに1回実施しなければならない。",
    relatedLaw: "有機溶剤中毒予防規則第28条",
  },
  {
    id: "em1-law-2024-007",
    year: 2024,
    certificationId: "env-measure-1st",
    subject: "em1-law",
    subjectLabel: "関係法令",
    questionNumber: 7,
    questionText:
      "作業環境測定の結果を労働者に周知する義務について正しいものはどれか。",
    choices: [
      { label: "ア", text: "測定結果の労働者への周知義務はない" },
      { label: "イ", text: "測定結果は行政機関への報告のみ義務付けられている" },
      { label: "ウ", text: "作業環境測定の結果等について、労働者が見やすい場所に掲示する等の方法で周知しなければならない" },
      { label: "エ", text: "第1管理区分の場合のみ周知義務がある" },
      { label: "オ", text: "周知は作業主任者だけに対して行えば足りる" },
    ],
    correctAnswer: "ウ",
    explanation:
      "労働安全衛生法第65条の5により、作業環境測定の結果等は労働者が見やすい場所への掲示等の方法で周知しなければならない（2022年改正で義務化強化）。",
    relatedLaw: "労働安全衛生法第65条の5",
  },
  {
    id: "em1-law-2024-008",
    year: 2024,
    certificationId: "env-measure-1st",
    subject: "em1-law",
    subjectLabel: "関係法令",
    questionNumber: 8,
    questionText:
      "作業環境測定士の登録に関して正しいものはどれか（第一種作業環境測定士の場合）。",
    choices: [
      { label: "ア", text: "免許取得後に都道府県に登録する" },
      { label: "イ", text: "免許取得後に登録する必要はなく、そのまま業務に従事できる" },
      { label: "ウ", text: "免許取得後に厚生労働省が整備する名簿に登録される" },
      { label: "エ", text: "免許取得後に日本作業環境測定協会への会員登録が必要" },
      { label: "オ", text: "登録は5年ごとに更新しなければならない" },
    ],
    correctAnswer: "ウ",
    explanation:
      "作業環境測定法第8条により、作業環境測定士は免許取得後に作業環境測定士名簿に登録される。登録内容の変更は届出が必要であり、登録には有効期限はない。",
    relatedLaw: "作業環境測定法第8条",
  },
  {
    id: "em1-law-2024-009",
    year: 2024,
    certificationId: "env-measure-1st",
    subject: "em1-law",
    subjectLabel: "関係法令",
    questionNumber: 9,
    questionText:
      "特定化学物質（第2種物質）の作業環境測定記録の保存期間として正しいものはどれか。",
    choices: [
      { label: "ア", text: "1年間" },
      { label: "イ", text: "3年間" },
      { label: "ウ", text: "5年間" },
      { label: "エ", text: "30年間" },
      { label: "オ", text: "永久保存" },
    ],
    correctAnswer: "イ",
    explanation:
      "特定化学物質の作業環境測定記録は原則3年間保存（特化則第36条）。ただし特別管理物質（ベンゼン等）は30年間保存が必要。第2種物質は通常3年間。",
    relatedLaw: "特定化学物質障害予防規則第36条",
  },
  {
    id: "em1-law-2024-010",
    year: 2024,
    certificationId: "env-measure-1st",
    subject: "em1-law",
    subjectLabel: "関係法令",
    questionNumber: 10,
    questionText:
      "作業環境測定法第3条が定める作業環境測定士の誠実義務の内容として正しいものはどれか。",
    choices: [
      { label: "ア", text: "測定結果を公表する義務" },
      { label: "イ", text: "作業環境測定士はその職務を誠実に行うとともに、作業環境改善に努めなければならない" },
      { label: "ウ", text: "測定料金を適正に設定する義務" },
      { label: "エ", text: "毎年研修を受ける義務" },
      { label: "オ", text: "測定機関に所属する義務" },
    ],
    correctAnswer: "イ",
    explanation:
      "作業環境測定法第3条により、作業環境測定士はその職務を誠実に行うとともに、作業環境の改善に貢献するよう努めなければならないと定められている。",
    relatedLaw: "作業環境測定法第3条",
  },
];
