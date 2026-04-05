import type { ExamQuestion } from "./types";

export const questions: ExamQuestion[] = [
  // ─── エックス線の管理に関する知識 2023 ───────────────────────────────────
  {
    id: "xr-know-2023-001",
    year: 2023,
    certificationId: "xray",
    subject: "xr-knowledge",
    subjectLabel: "エックス線の管理に関する知識",
    questionNumber: 1,
    questionText:
      "エックス線管において、陽極ターゲットに用いる材料として最も適切なものはどれか。",
    choices: [
      { label: "ア", text: "アルミニウム（融点が低く加工しやすい）" },
      { label: "イ", text: "タングステン（融点が高く原子番号が大きい）" },
      { label: "ウ", text: "銅（熱伝導率が高く安価である）" },
      { label: "エ", text: "鉛（X線を強く吸収するため効率よく発生させられる）" },
      { label: "オ", text: "ニッケル（耐食性に優れ変形しにくい）" },
    ],
    correctAnswer: "イ",
    explanation:
      "陽極ターゲットはタングステン（W、原子番号74）が使われる。融点3422℃と高く、原子番号が大きいためX線発生効率が高い。",
    relatedLaw: "電離放射線障害防止規則",
  },
  {
    id: "xr-know-2023-002",
    year: 2023,
    certificationId: "xray",
    subject: "xr-knowledge",
    subjectLabel: "エックス線の管理に関する知識",
    questionNumber: 2,
    questionText:
      "管電圧を一定に保ちながら管電流を2倍にしたとき、エックス線の発生量（線量率）はどうなるか。",
    choices: [
      { label: "ア", text: "変わらない" },
      { label: "イ", text: "約1.4倍になる" },
      { label: "ウ", text: "2倍になる" },
      { label: "エ", text: "4倍になる" },
      { label: "オ", text: "最高エネルギーが2倍になる" },
    ],
    correctAnswer: "ウ",
    explanation:
      "線量率は管電流に比例するため、管電流を2倍にすると線量率も2倍になる。最高エネルギーは管電圧で決まり、管電流を変えても変化しない。",
  },
  {
    id: "xr-know-2023-003",
    year: 2023,
    certificationId: "xray",
    subject: "xr-knowledge",
    subjectLabel: "エックス線の管理に関する知識",
    questionNumber: 3,
    questionText:
      "管理区域に関する次の記述のうち、正しいものはどれか。",
    choices: [
      { label: "ア", text: "管理区域は、外部放射線による実効線量が3月間につき0.3mSvを超えるおそれのある区域である。" },
      { label: "イ", text: "管理区域は、外部放射線による実効線量が3月間につき1.3mSvを超えるおそれのある区域である。" },
      { label: "ウ", text: "管理区域は、外部放射線による実効線量が1年間につき1mSvを超えるおそれのある区域である。" },
      { label: "エ", text: "管理区域は、外部放射線による実効線量が1年間につき5mSvを超えるおそれのある区域である。" },
      { label: "オ", text: "管理区域の設定基準は事業者が自由に決定できる。" },
    ],
    correctAnswer: "イ",
    explanation:
      "電離則第3条により、管理区域は外部放射線による実効線量が3月間につき1.3mSvを超えるおそれのある区域に設定する。",
    relatedLaw: "電離放射線障害防止規則第3条",
  },
  {
    id: "xr-know-2023-004",
    year: 2023,
    certificationId: "xray",
    subject: "xr-knowledge",
    subjectLabel: "エックス線の管理に関する知識",
    questionNumber: 4,
    questionText:
      "鉛のエックス線に対する半価層として、正しい傾向はどれか。",
    choices: [
      { label: "ア", text: "管電圧が高くなるほど半価層は薄くなる" },
      { label: "イ", text: "管電圧が高くなるほど半価層は厚くなる" },
      { label: "ウ", text: "半価層は管電圧に関係なく一定である" },
      { label: "エ", text: "管電流が高くなるほど半価層は厚くなる" },
      { label: "オ", text: "コンクリートの半価層は鉛より薄い" },
    ],
    correctAnswer: "イ",
    explanation:
      "X線のエネルギーは管電圧に比例して高くなる。エネルギーが高いほど透過力が増すため、半価層（線量を半減させる厚さ）は厚くなる。",
  },
  {
    id: "xr-know-2023-005",
    year: 2023,
    certificationId: "xray",
    subject: "xr-knowledge",
    subjectLabel: "エックス線の管理に関する知識",
    questionNumber: 5,
    questionText:
      "個人線量計の種類とその特徴の組み合わせとして、誤っているものはどれか。",
    choices: [
      { label: "ア", text: "フィルムバッジ — 感光フィルムを用い、被ばく後に現像して線量を評価する" },
      { label: "イ", text: "TLD（熱蛍光線量計）— 加熱すると蓄積したエネルギーを光として放出する素子を使用する" },
      { label: "ウ", text: "蛍光ガラス線量計（ガラスバッジ）— UV照射で蛍光を発し線量を評価する" },
      { label: "エ", text: "電子式個人線量計 — リアルタイムで線量を表示するが記録媒体として法的に使用できない" },
      { label: "オ", text: "ポケット線量計 — 電離箱式で即時に線量を読み取れるが積算精度が低い" },
    ],
    correctAnswer: "エ",
    explanation:
      "電子式個人線量計（EPD）はリアルタイム表示ができ、法令上の線量記録用途にも使用可能な機種がある。「法的に使用できない」は誤り。",
  },
  {
    id: "xr-know-2023-006",
    year: 2023,
    certificationId: "xray",
    subject: "xr-knowledge",
    subjectLabel: "エックス線の管理に関する知識",
    questionNumber: 6,
    questionText:
      "エックス線装置の漏えい線量測定について、電離放射線障害防止規則の規定として正しいものはどれか。",
    choices: [
      { label: "ア", text: "漏えい線量の測定は6月以内ごとに1回実施しなければならない" },
      { label: "イ", text: "漏えい線量の測定結果は1年間保存しなければならない" },
      { label: "ウ", text: "漏えい線量の測定は1年以内ごとに1回実施しなければならない" },
      { label: "エ", text: "漏えい線量の測定記録は5年間保存しなければならない" },
      { label: "オ", text: "漏えい線量の測定は使用開始時のみ実施すればよい" },
    ],
    correctAnswer: "ア",
    explanation:
      "電離則第54条により、エックス線装置の漏えい線量は6月以内ごとに1回測定し、その結果は5年間保存する義務がある。",
    relatedLaw: "電離放射線障害防止規則第54条",
  },
  {
    id: "xr-know-2023-007",
    year: 2023,
    certificationId: "xray",
    subject: "xr-knowledge",
    subjectLabel: "エックス線の管理に関する知識",
    questionNumber: 7,
    questionText:
      "特性X線（固有X線）の発生メカニズムとして正しいものはどれか。",
    choices: [
      { label: "ア", text: "電子がターゲット原子核近傍で急減速する際に放出される連続スペクトルの放射線" },
      { label: "イ", text: "内殻電子が軌道外に弾き出され、外殻電子が落ちる際に殻間エネルギー差に等しい光子を放出する" },
      { label: "ウ", text: "管電圧を一定値以上に上げると自然発生する現象で、管電圧に比例したエネルギーを持つ" },
      { label: "エ", text: "ターゲット材料に関係なく同一エネルギーで発生する連続スペクトルである" },
      { label: "オ", text: "陰極フィラメントの熱電子が直接光子に変換されたもの" },
    ],
    correctAnswer: "イ",
    explanation:
      "特性X線は、高速電子が内殻電子を弾き出し、外殻電子がその空位を埋める際にエネルギー差に相当する線エネルギーのX線が放出される。元素固有のスペクトルを示す。",
  },
  {
    id: "xr-know-2023-008",
    year: 2023,
    certificationId: "xray",
    subject: "xr-knowledge",
    subjectLabel: "エックス線の管理に関する知識",
    questionNumber: 8,
    questionText:
      "工業用エックス線装置の主な種類と用途の組み合わせとして、誤っているものはどれか。",
    choices: [
      { label: "ア", text: "定置式装置 — 工場の専用室に設置し大型構造物の非破壊検査に使用" },
      { label: "イ", text: "携帯式装置 — 現場での溶接部検査など可搬性が求められる場合に使用" },
      { label: "ウ", text: "移動式装置 — 車載型で現場移動が可能、橋梁や配管の検査に使用" },
      { label: "エ", text: "マイクロフォーカス装置 — 焦点を大きくして広範囲を均一照射する用途に適する" },
      { label: "オ", text: "フラッシュX線装置 — 高速現象の撮影に用いられる短パルスX線を発生させる装置" },
    ],
    correctAnswer: "エ",
    explanation:
      "マイクロフォーカス装置は焦点（フォーカス）を極めて小さくすることで高分解能の像を得る装置。「焦点を大きくする」は誤り。",
  },
  {
    id: "xr-know-2023-009",
    year: 2023,
    certificationId: "xray",
    subject: "xr-knowledge",
    subjectLabel: "エックス線の管理に関する知識",
    questionNumber: 9,
    questionText:
      "エックス線作業主任者が行うべき職務として、電離放射線障害防止規則に規定されていないものはどれか。",
    choices: [
      { label: "ア", text: "管理区域の設定と標識の設置" },
      { label: "イ", text: "放射線業務従事者の被ばく状況の監視" },
      { label: "ウ", text: "放射線障害を受けた者への応急処置" },
      { label: "エ", text: "エックス線装置の遮蔽物の設置と点検" },
      { label: "オ", text: "放射線業務従事者の採用面接の実施" },
    ],
    correctAnswer: "オ",
    explanation:
      "採用面接はエックス線作業主任者の職務ではなく人事部門の業務。主任者の職務は管理区域の管理、線量計の点検、被ばく状況の監視、遮蔽物の点検等である。",
    relatedLaw: "電離放射線障害防止規則第46条",
  },
  {
    id: "xr-know-2023-010",
    year: 2023,
    certificationId: "xray",
    subject: "xr-knowledge",
    subjectLabel: "エックス線の管理に関する知識",
    questionNumber: 10,
    questionText:
      "電離放射線健康診断に関する記述として、正しいものはどれか。",
    choices: [
      { label: "ア", text: "健康診断は放射線業務従事者に対して1年以内ごとに1回実施する" },
      { label: "イ", text: "健康診断の結果は当該業務従事者に通知する義務はない" },
      { label: "ウ", text: "健康診断の記録は5年間保存しなければならない" },
      { label: "エ", text: "健康診断は放射線業務従事者に対して6月以内ごとに1回実施する" },
      { label: "オ", text: "健康診断の項目には被ばく歴の調査は含まれない" },
    ],
    correctAnswer: "エ",
    explanation:
      "電離則第56条により、放射線業務従事者の電離放射線健康診断は6月以内ごとに1回実施する。記録は30年間保存が原則。",
    relatedLaw: "電離放射線障害防止規則第56条",
  },

  // ─── エックス線の管理に関する知識 2024 ───────────────────────────────────
  {
    id: "xr-know-2024-001",
    year: 2024,
    certificationId: "xray",
    subject: "xr-knowledge",
    subjectLabel: "エックス線の管理に関する知識",
    questionNumber: 1,
    questionText:
      "エックス線の物質に対する透過力に影響する要因として、正しいものはどれか。",
    choices: [
      { label: "ア", text: "管電流が高いほどエックス線の最高エネルギーが増し透過力が増す" },
      { label: "イ", text: "管電圧が高いほどエックス線の最高エネルギーが増し透過力が増す" },
      { label: "ウ", text: "エックス線管の材質は透過力に影響しない" },
      { label: "エ", text: "照射時間が長いほど個々の光子の透過力が高くなる" },
      { label: "オ", text: "フィルター（付加フィルタ）を付けると透過力が低下する" },
    ],
    correctAnswer: "イ",
    explanation:
      "X線光子の最大エネルギーは管電圧（kV）に比例し、エネルギーが高いほど透過力が増す。管電流は線量率（光子の数）に影響するが個々の光子エネルギーは変わらない。",
  },
  {
    id: "xr-know-2024-002",
    year: 2024,
    certificationId: "xray",
    subject: "xr-knowledge",
    subjectLabel: "エックス線の管理に関する知識",
    questionNumber: 2,
    questionText:
      "コンクリートの遮蔽体について、鉛との比較として正しいものはどれか。",
    choices: [
      { label: "ア", text: "コンクリートは鉛より密度が高いため、同じ厚さで高い遮蔽効果を持つ" },
      { label: "イ", text: "コンクリートの半価層は鉛の半価層より薄い" },
      { label: "ウ", text: "コンクリートは鉛よりも単位質量当たりの遮蔽効果が高い" },
      { label: "エ", text: "コンクリートの半価層は鉛の半価層より厚く、同等の遮蔽には厚い壁が必要である" },
      { label: "オ", text: "コンクリートはX線を全く遮蔽できない材料である" },
    ],
    correctAnswer: "エ",
    explanation:
      "鉛（密度11.3g/cm³）はコンクリート（密度約2.3g/cm³）より密度が高く原子番号も大きいため、半価層が薄い。同等の遮蔽にはコンクリートはより厚い厚さが必要。",
  },
  {
    id: "xr-know-2024-003",
    year: 2024,
    certificationId: "xray",
    subject: "xr-knowledge",
    subjectLabel: "エックス線の管理に関する知識",
    questionNumber: 3,
    questionText:
      "エックス線の散乱に関する現象のうち、低エネルギー領域（数十keV程度）で支配的な相互作用はどれか。",
    choices: [
      { label: "ア", text: "核反応" },
      { label: "イ", text: "コンプトン散乱" },
      { label: "ウ", text: "電子対生成" },
      { label: "エ", text: "光電効果" },
      { label: "オ", text: "制動放射" },
    ],
    correctAnswer: "エ",
    explanation:
      "光電効果は低エネルギー領域（数十keV以下）で支配的な相互作用で、光子が電子に全エネルギーを与えて吸収される。コンプトン散乱は中エネルギー、電子対生成は1.02MeV以上。",
  },
  {
    id: "xr-know-2024-004",
    year: 2024,
    certificationId: "xray",
    subject: "xr-knowledge",
    subjectLabel: "エックス線の管理に関する知識",
    questionNumber: 4,
    questionText:
      "放射線業務従事者の線量測定において、胸部（または腹部）に装着した線量計が示す値は何を表すか。",
    choices: [
      { label: "ア", text: "皮膚の等価線量" },
      { label: "イ", text: "水晶体の等価線量" },
      { label: "ウ", text: "実効線量の評価に用いる1cm線量当量" },
      { label: "エ", text: "吸収線量（グレイ）" },
      { label: "オ", text: "カーマ（空気カーマ）" },
    ],
    correctAnswer: "ウ",
    explanation:
      "胸部に装着した線量計が示す1cm線量当量（Hp(10)）は実効線量の評価に使用される。実効線量はこの値を用いて算定する。",
  },
  {
    id: "xr-know-2024-005",
    year: 2024,
    certificationId: "xray",
    subject: "xr-knowledge",
    subjectLabel: "エックス線の管理に関する知識",
    questionNumber: 5,
    questionText:
      "工業用エックス線非破壊検査における透過写真撮影（ラジオグラフィ）について、正しいものはどれか。",
    choices: [
      { label: "ア", text: "試験体が厚いほど低い管電圧で良好な画像が得られる" },
      { label: "イ", text: "焦点からフィルムまでの距離が長いほど幾何学的不鮮鋭度は小さくなる" },
      { label: "ウ", text: "散乱線は画像のコントラストを向上させる" },
      { label: "エ", text: "増感紙（スクリーン）はフィルムの感度を低下させるために使用する" },
      { label: "オ", text: "焦点寸法が小さいほど幾何学的不鮮鋭度は大きくなる" },
    ],
    correctAnswer: "イ",
    explanation:
      "幾何学的不鮮鋭度は焦点寸法に比例し、焦点からフィルムまでの距離に反比例する。距離が長いほど不鮮鋭度が小さくなり鮮明な画像が得られる。",
  },
  {
    id: "xr-know-2024-006",
    year: 2024,
    certificationId: "xray",
    subject: "xr-knowledge",
    subjectLabel: "エックス線の管理に関する知識",
    questionNumber: 6,
    questionText:
      "作業環境中のエックス線の線量を低減するための3原則として、正しいものはどれか。",
    choices: [
      { label: "ア", text: "距離・時間・フィルタ" },
      { label: "イ", text: "距離・時間・遮蔽" },
      { label: "ウ", text: "換気・時間・遮蔽" },
      { label: "エ", text: "保護具・距離・監視" },
      { label: "オ", text: "遮蔽・フィルタ・冷却" },
    ],
    correctAnswer: "イ",
    explanation:
      "放射線防護の3原則は「距離（線源から遠ざかる）・時間（被ばく時間を短縮する）・遮蔽（遮蔽材を用いる）」である。これはALARAの原則とともに基本となる。",
  },
  {
    id: "xr-know-2024-007",
    year: 2024,
    certificationId: "xray",
    subject: "xr-knowledge",
    subjectLabel: "エックス線の管理に関する知識",
    questionNumber: 7,
    questionText:
      "制動X線（白色X線、連続X線）に関する記述として、正しいものはどれか。",
    choices: [
      { label: "ア", text: "制動X線の最大エネルギーは管電流によって決まる" },
      { label: "イ", text: "制動X線はターゲット材料の原子番号に関係なく同じ強度で発生する" },
      { label: "ウ", text: "制動X線の最大エネルギー（keV）は印加管電圧（kV）の数値に等しい" },
      { label: "エ", text: "制動X線は特性X線と異なり線スペクトルを示す" },
      { label: "オ", text: "制動X線は高速電子が陽極ターゲット近傍の電子に衝突して発生する" },
    ],
    correctAnswer: "ウ",
    explanation:
      "制動X線（連続X線）の最大エネルギー（keV）は印加した管電圧（kV）の数値と等しい。例：100kV印加→最大100keVのX線が発生する。",
  },
  {
    id: "xr-know-2024-008",
    year: 2024,
    certificationId: "xray",
    subject: "xr-knowledge",
    subjectLabel: "エックス線の管理に関する知識",
    questionNumber: 8,
    questionText:
      "エックス線作業主任者の選任について、電離放射線障害防止規則の規定として正しいものはどれか。",
    choices: [
      { label: "ア", text: "エックス線装置を1台設置するごとに1名選任しなければならない" },
      { label: "イ", text: "エックス線作業主任者免許を有する者の中から選任しなければならない" },
      { label: "ウ", text: "エックス線作業主任者は医師でなければならない" },
      { label: "エ", text: "エックス線作業主任者は放射線取扱主任者と兼務できない" },
      { label: "オ", text: "エックス線装置を使用する事業場ではエックス線作業主任者の選任は任意である" },
    ],
    correctAnswer: "イ",
    explanation:
      "電離則第46条により、エックス線作業主任者はエックス線作業主任者免許（国家資格）を有する者の中から事業者が選任しなければならない。",
    relatedLaw: "電離放射線障害防止規則第46条",
  },
  {
    id: "xr-know-2024-009",
    year: 2024,
    certificationId: "xray",
    subject: "xr-knowledge",
    subjectLabel: "エックス線の管理に関する知識",
    questionNumber: 9,
    questionText:
      "エックス線の強度と距離の関係（逆二乗則）について正しい記述はどれか。",
    choices: [
      { label: "ア", text: "線源から2倍の距離に離れると、線量率は1/4になる" },
      { label: "イ", text: "線源から2倍の距離に離れると、線量率は1/2になる" },
      { label: "ウ", text: "逆二乗則は遮蔽材がある場合にのみ成立する" },
      { label: "エ", text: "逆二乗則は平行ビームには適用されない場合があるが、点線源では常に成立する" },
      { label: "オ", text: "線源から3倍の距離に離れると、線量率は1/6になる" },
    ],
    correctAnswer: "ア",
    explanation:
      "逆二乗則により、線量率は距離の二乗に反比例する。距離が2倍→1/2²＝1/4。距離が3倍→1/3²＝1/9になる。",
  },
  {
    id: "xr-know-2024-010",
    year: 2024,
    certificationId: "xray",
    subject: "xr-knowledge",
    subjectLabel: "エックス線の管理に関する知識",
    questionNumber: 10,
    questionText:
      "放射線障害防止に用いる個人被ばく線量計を身体に装着する位置として、最も適切なものはどれか（均一な放射線場において）。",
    choices: [
      { label: "ア", text: "利き腕の手首" },
      { label: "イ", text: "頭部（額）" },
      { label: "ウ", text: "胸部または腹部（体幹部前面）" },
      { label: "エ", text: "足首" },
      { label: "オ", text: "背中（肩甲骨付近）" },
    ],
    correctAnswer: "ウ",
    explanation:
      "均一な放射線場では、実効線量評価のため線量計は胸部または腹部の体幹部前面に装着する。不均一な場では最も被ばく線量が多い部位に追加装着する場合がある。",
    relatedLaw: "電離放射線障害防止規則第8条",
  },

  // ─── 関係法令 2023 ────────────────────────────────────────────────────────
  {
    id: "xr-law-2023-001",
    year: 2023,
    certificationId: "xray",
    subject: "xr-law",
    subjectLabel: "関係法令",
    questionNumber: 1,
    questionText:
      "放射線業務従事者の実効線量の限度として、電離放射線障害防止規則に規定されている値はどれか。",
    choices: [
      { label: "ア", text: "5年間につき50mSv、かつ1年間につき20mSv" },
      { label: "イ", text: "1年間につき50mSv" },
      { label: "ウ", text: "1年間につき20mSv" },
      { label: "エ", text: "5年間につき100mSv、かつ1年間につき50mSv" },
      { label: "オ", text: "3月間につき5mSv" },
    ],
    correctAnswer: "ア",
    explanation:
      "電離則第4条により、実効線量限度は5年間につき100mSv（5年平均20mSv/年）かつ1年間につき50mSvを超えてはならない。",
    relatedLaw: "電離放射線障害防止規則第4条",
  },
  {
    id: "xr-law-2023-002",
    year: 2023,
    certificationId: "xray",
    subject: "xr-law",
    subjectLabel: "関係法令",
    questionNumber: 2,
    questionText:
      "女性の放射線業務従事者（妊娠中のものを除く）の腹部の等価線量限度として、正しいものはどれか。",
    choices: [
      { label: "ア", text: "3月間につき5mSv" },
      { label: "イ", text: "1年間につき5mSv" },
      { label: "ウ", text: "1年間につき20mSv" },
      { label: "エ", text: "3月間につき2mSv" },
      { label: "オ", text: "1月間につき2mSv" },
    ],
    correctAnswer: "ア",
    explanation:
      "電離則第4条第3項により、女性の放射線業務従事者（妊娠中を除く）の腹部皮膚の等価線量限度は3月間につき5mSvである。",
    relatedLaw: "電離放射線障害防止規則第4条第3項",
  },
  {
    id: "xr-law-2023-003",
    year: 2023,
    certificationId: "xray",
    subject: "xr-law",
    subjectLabel: "関係法令",
    questionNumber: 3,
    questionText:
      "管理区域の標識として、電離放射線障害防止規則が定める事項として正しいものはどれか。",
    choices: [
      { label: "ア", text: "管理区域の境界には「立入禁止」と表示すれば足りる" },
      { label: "イ", text: "放射線標識（三角形の放射線マーク）と「放射線管理区域」の文字を表示しなければならない" },
      { label: "ウ", text: "標識の色は黄色と黒色の組み合わせに限られる" },
      { label: "エ", text: "標識は日本語以外でも表示可能で、英語表示のみでも認められる" },
      { label: "オ", text: "管理区域の標識は装置の近傍にのみ設置すればよい" },
    ],
    correctAnswer: "イ",
    explanation:
      "電離則第3条第3項により、管理区域の境界には放射線標識と「放射線管理区域」の文字を明示した標識を掲示しなければならない。",
    relatedLaw: "電離放射線障害防止規則第3条",
  },
  {
    id: "xr-law-2023-004",
    year: 2023,
    certificationId: "xray",
    subject: "xr-law",
    subjectLabel: "関係法令",
    questionNumber: 4,
    questionText:
      "放射線業務従事者が管理区域内で受けた外部被ばくの線量の測定について、正しいものはどれか。",
    choices: [
      { label: "ア", text: "測定は3月以内ごとに1回実施し、記録は5年間保存する" },
      { label: "イ", text: "測定は1月以内ごとに1回実施し、記録は30年間保存する" },
      { label: "ウ", text: "測定は1年以内ごとに1回実施し、記録は10年間保存する" },
      { label: "エ", text: "測定は6月以内ごとに1回実施し、記録は5年間保存する" },
      { label: "オ", text: "測定の記録は測定の都度、労働基準監督署へ報告しなければならない" },
    ],
    correctAnswer: "イ",
    explanation:
      "電離則第8条・第57条により、外部被ばく線量の測定は1月以内ごとに1回実施し、記録は30年間（当面5年保存後移管）保存しなければならない。",
    relatedLaw: "電離放射線障害防止規則第8条、第57条",
  },
  {
    id: "xr-law-2023-005",
    year: 2023,
    certificationId: "xray",
    subject: "xr-law",
    subjectLabel: "関係法令",
    questionNumber: 5,
    questionText:
      "電離放射線障害防止規則において、エックス線装置を使用する作業場の作業環境測定について、正しい記述はどれか。",
    choices: [
      { label: "ア", text: "作業環境測定は6月以内ごとに1回実施しなければならない" },
      { label: "イ", text: "作業環境測定は1年以内ごとに1回実施しなければならない" },
      { label: "ウ", text: "作業環境測定の実施義務は装置の出力が一定値以上の場合のみ発生する" },
      { label: "エ", text: "作業環境測定の記録は3年間保存しなければならない" },
      { label: "オ", text: "作業環境測定の結果に基づく評価は不要である" },
    ],
    correctAnswer: "ア",
    explanation:
      "電離則第54条により、エックス線装置を使用する作業場は6月以内ごとに1回作業環境測定を実施しなければならない。記録は5年間保存。",
    relatedLaw: "電離放射線障害防止規則第54条",
  },
  {
    id: "xr-law-2023-006",
    year: 2023,
    certificationId: "xray",
    subject: "xr-law",
    subjectLabel: "関係法令",
    questionNumber: 6,
    questionText:
      "放射線業務従事者に対して実施する特殊健康診断（電離放射線健康診断）の記録の保存期間として正しいものはどれか。",
    choices: [
      { label: "ア", text: "5年間" },
      { label: "イ", text: "10年間" },
      { label: "ウ", text: "30年間" },
      { label: "エ", text: "50年間" },
      { label: "オ", text: "永久保存" },
    ],
    correctAnswer: "ウ",
    explanation:
      "電離則第57条の2により、電離放射線健康診断の記録は30年間保存しなければならない（当面5年保存の後、譲渡等の措置がある）。",
    relatedLaw: "電離放射線障害防止規則第57条の2",
  },
  {
    id: "xr-law-2023-007",
    year: 2023,
    certificationId: "xray",
    subject: "xr-law",
    subjectLabel: "関係法令",
    questionNumber: 7,
    questionText:
      "緊急時における被ばく限度（緊急被ばく線量限度）として、電離放射線障害防止規則が定める実効線量の値はどれか。",
    choices: [
      { label: "ア", text: "100mSv" },
      { label: "イ", text: "250mSv" },
      { label: "ウ", text: "500mSv" },
      { label: "エ", text: "50mSv" },
      { label: "オ", text: "20mSv" },
    ],
    correctAnswer: "ア",
    explanation:
      "電離則第42条により、緊急作業に従事する場合の実効線量限度は100mSvと定められており、通常時の1年限度（50mSv）より緩和されている。",
    relatedLaw: "電離放射線障害防止規則第42条",
  },
  {
    id: "xr-law-2023-008",
    year: 2023,
    certificationId: "xray",
    subject: "xr-law",
    subjectLabel: "関係法令",
    questionNumber: 8,
    questionText:
      "エックス線装置の使用停止（廃止）の場合、事業者が行うべき手続きとして正しいものはどれか。",
    choices: [
      { label: "ア", text: "所轄の都道府県知事に届け出なければならない" },
      { label: "イ", text: "所轄の労働基準監督署長に報告しなければならない" },
      { label: "ウ", text: "厚生労働大臣に届け出なければならない" },
      { label: "エ", text: "届出は不要で、記録のみ保存すればよい" },
      { label: "オ", text: "所轄の保健所に届け出なければならない" },
    ],
    correctAnswer: "イ",
    explanation:
      "電離則第51条により、エックス線装置の使用を廃止したときは、遅滞なく所轄労働基準監督署長に報告しなければならない。",
    relatedLaw: "電離放射線障害防止規則第51条",
  },
  {
    id: "xr-law-2023-009",
    year: 2023,
    certificationId: "xray",
    subject: "xr-law",
    subjectLabel: "関係法令",
    questionNumber: 9,
    questionText:
      "管理区域内での立入り制限に関する記述として、正しいものはどれか。",
    choices: [
      { label: "ア", text: "管理区域には誰でも自由に立ち入ることができる" },
      { label: "イ", text: "妊娠中の女性の放射線業務従事者の管理区域への立入りは法令で禁止されている" },
      { label: "ウ", text: "放射線業務従事者以外の者を管理区域に立ち入らせてはならない" },
      { label: "エ", text: "放射線業務従事者以外の者でも、事業者の許可があれば立入りできる場合がある" },
      { label: "オ", text: "放射線業務従事者以外の者は使用者の立会いがあれば制限なく立入りできる" },
    ],
    correctAnswer: "エ",
    explanation:
      "放射線業務従事者以外でも業務上必要な場合など、事業者の管理の下で例外的に立入りが認められることがある。ただし被ばく管理が必要。",
    relatedLaw: "電離放射線障害防止規則第3条",
  },
  {
    id: "xr-law-2023-010",
    year: 2023,
    certificationId: "xray",
    subject: "xr-law",
    subjectLabel: "関係法令",
    questionNumber: 10,
    questionText:
      "水晶体の等価線量限度として、電離放射線障害防止規則に規定されている値はどれか（放射線業務従事者）。",
    choices: [
      { label: "ア", text: "1年間につき150mSv" },
      { label: "イ", text: "1年間につき50mSv" },
      { label: "ウ", text: "5年間につき100mSv、かつ1年間につき50mSv" },
      { label: "エ", text: "1年間につき100mSv" },
      { label: "オ", text: "3月間につき50mSv" },
    ],
    correctAnswer: "ウ",
    explanation:
      "2021年の改正により、水晶体の等価線量限度は5年間につき100mSvかつ1年間につき50mSvに引き下げられた（従来は150mSv/年）。",
    relatedLaw: "電離放射線障害防止規則第5条",
  },

  // ─── 関係法令 2024 ────────────────────────────────────────────────────────
  {
    id: "xr-law-2024-001",
    year: 2024,
    certificationId: "xray",
    subject: "xr-law",
    subjectLabel: "関係法令",
    questionNumber: 1,
    questionText:
      "電離放射線障害防止規則において、エックス線作業主任者が選任されていない場合に課せられる罰則として、関係する規定として正しいものはどれか。",
    choices: [
      { label: "ア", text: "選任義務違反は行政指導のみで刑事罰はない" },
      { label: "イ", text: "労働安全衛生法に基づく罰則（懲役または罰金）が適用される" },
      { label: "ウ", text: "電離放射線障害防止規則独自の罰金規定がある" },
      { label: "エ", text: "罰則はなく、是正勧告のみである" },
      { label: "オ", text: "事業停止命令のみで刑事責任は問われない" },
    ],
    correctAnswer: "イ",
    explanation:
      "作業主任者の不選任は労働安全衛生法第14条違反として、同法第119条により6月以下の懲役または50万円以下の罰金が適用される。",
    relatedLaw: "労働安全衛生法第14条・第119条",
  },
  {
    id: "xr-law-2024-002",
    year: 2024,
    certificationId: "xray",
    subject: "xr-law",
    subjectLabel: "関係法令",
    questionNumber: 2,
    questionText:
      "放射線障害を発生させたとき（または発生させるおそれがあるとき）の事業者の措置として、電離放射線障害防止規則が定める事項として正しいものはどれか。",
    choices: [
      { label: "ア", text: "速やかに作業を中止し、労働者を管理区域から退避させる" },
      { label: "イ", text: "放射線障害が発生した旨を直ちに行政機関に報告すれば、作業継続は可能である" },
      { label: "ウ", text: "事故後72時間以内に厚生労働大臣に報告すればよい" },
      { label: "エ", text: "放射線障害発生の場合でも、所轄署への報告義務はない" },
      { label: "オ", text: "医師による診断が終わるまで労働者を管理区域内に留める" },
    ],
    correctAnswer: "ア",
    explanation:
      "電離則第42条の2等により、放射線障害発生またはそのおそれがある場合は直ちに作業中止・退避措置をとり、関係機関への報告が必要。",
    relatedLaw: "電離放射線障害防止規則第42条の2",
  },
  {
    id: "xr-law-2024-003",
    year: 2024,
    certificationId: "xray",
    subject: "xr-law",
    subjectLabel: "関係法令",
    questionNumber: 3,
    questionText:
      "妊娠中の女性の放射線業務従事者の内部被ばくによる実効線量の限度として正しいものはどれか。",
    choices: [
      { label: "ア", text: "妊娠が判明した時から出産までの間に1mSv" },
      { label: "イ", text: "妊娠が判明した時から出産までの間に5mSv" },
      { label: "ウ", text: "妊娠が判明した時から出産までの間に20mSv" },
      { label: "エ", text: "妊娠中は一切の放射線業務は禁止されている" },
      { label: "オ", text: "妊娠中のみ外部被ばく限度が適用され内部被ばく限度はない" },
    ],
    correctAnswer: "ア",
    explanation:
      "電離則第6条により、妊娠中の女性の内部被ばくによる実効線量の限度は、妊娠が判明した時から出産までの間に1mSvとされている。",
    relatedLaw: "電離放射線障害防止規則第6条",
  },
  {
    id: "xr-law-2024-004",
    year: 2024,
    certificationId: "xray",
    subject: "xr-law",
    subjectLabel: "関係法令",
    questionNumber: 4,
    questionText:
      "エックス線装置を新たに設置（または移転）する際に必要な手続きとして正しいものはどれか。",
    choices: [
      { label: "ア", text: "所轄都道府県知事への事前許可申請が必要" },
      { label: "イ", text: "所轄労働基準監督署長へ設置30日前までに届け出が必要" },
      { label: "ウ", text: "厚生労働大臣への事前届出が必要" },
      { label: "エ", text: "届出は不要で、設置後に記録すれば足りる" },
      { label: "オ", text: "所轄消防署への届出が必要" },
    ],
    correctAnswer: "イ",
    explanation:
      "電離則第49条により、エックス線装置を設置・移転する場合は、設置30日前までに所轄労働基準監督署長に届け出なければならない。",
    relatedLaw: "電離放射線障害防止規則第49条",
  },
  {
    id: "xr-law-2024-005",
    year: 2024,
    certificationId: "xray",
    subject: "xr-law",
    subjectLabel: "関係法令",
    questionNumber: 5,
    questionText:
      "電離放射線健康診断の実施後に事業者が行うべき事項として、正しいものはどれか。",
    choices: [
      { label: "ア", text: "診断結果を当該労働者に通知する義務はない" },
      { label: "イ", text: "診断結果に基づき、医師の意見を聴かなければならない" },
      { label: "ウ", text: "診断結果を所轄労働基準監督署長に報告しなければならない" },
      { label: "エ", text: "異常所見がある場合のみ医師の意見を聴けばよい" },
      { label: "オ", text: "健康診断結果は5年間本人に開示できない" },
    ],
    correctAnswer: "イ",
    explanation:
      "労働安全衛生法第66条の4により、健康診断の結果に基づき医師の意見を聴き、必要があれば就業上の措置を講じなければならない。",
    relatedLaw: "労働安全衛生法第66条の4",
  },
  {
    id: "xr-law-2024-006",
    year: 2024,
    certificationId: "xray",
    subject: "xr-law",
    subjectLabel: "関係法令",
    questionNumber: 6,
    questionText:
      "皮膚の等価線量限度（放射線業務従事者）として正しいものはどれか。",
    choices: [
      { label: "ア", text: "1年間につき150mSv" },
      { label: "イ", text: "1年間につき250mSv" },
      { label: "ウ", text: "1年間につき500mSv" },
      { label: "エ", text: "3月間につき150mSv" },
      { label: "オ", text: "1年間につき50mSv" },
    ],
    correctAnswer: "ウ",
    explanation:
      "電離則第5条により、皮膚の等価線量限度は1年間につき500mSvである。眼の水晶体（50mSv/年）や実効線量（50mSv/年）とは異なる値である。",
    relatedLaw: "電離放射線障害防止規則第5条",
  },
  {
    id: "xr-law-2024-007",
    year: 2024,
    certificationId: "xray",
    subject: "xr-law",
    subjectLabel: "関係法令",
    questionNumber: 7,
    questionText:
      "電離放射線障害防止規則において、放射線業務従事者の被ばく記録を事業者が保存する期間として正しいものはどれか。",
    choices: [
      { label: "ア", text: "3年間" },
      { label: "イ", text: "5年間" },
      { label: "ウ", text: "10年間" },
      { label: "エ", text: "30年間" },
      { label: "オ", text: "永久保存" },
    ],
    correctAnswer: "エ",
    explanation:
      "電離則第57条により、被ばく線量の記録は30年間保存しなければならない（ただし、当面は5年間保存後、一定要件で保存を継続する）。",
    relatedLaw: "電離放射線障害防止規則第57条",
  },
  {
    id: "xr-law-2024-008",
    year: 2024,
    certificationId: "xray",
    subject: "xr-law",
    subjectLabel: "関係法令",
    questionNumber: 8,
    questionText:
      "エックス線作業主任者が管理区域内に掲示しなければならない事項に含まれないものはどれか。",
    choices: [
      { label: "ア", text: "放射線測定器の装着に関する注意事項" },
      { label: "イ", text: "事故が発生した場合の応急措置" },
      { label: "ウ", text: "従事者の給与・賃金表" },
      { label: "エ", text: "管理区域内で注意すべき事項" },
      { label: "オ", text: "放射線による障害の発生防止に必要な事項" },
    ],
    correctAnswer: "ウ",
    explanation:
      "管理区域内の掲示事項は放射線防護に関するものに限られる。給与・賃金表の掲示は放射線管理とは無関係であり、電離則には規定されていない。",
    relatedLaw: "電離放射線障害防止規則第47条",
  },
  {
    id: "xr-law-2024-009",
    year: 2024,
    certificationId: "xray",
    subject: "xr-law",
    subjectLabel: "関係法令",
    questionNumber: 9,
    questionText:
      "電離放射線障害防止規則における「放射線業務従事者」の定義として正しいものはどれか。",
    choices: [
      { label: "ア", text: "管理区域内で常時勤務するすべての労働者" },
      { label: "イ", text: "エックス線装置を操作するすべての者" },
      { label: "ウ", text: "管理区域内において放射線業務に従事する労働者" },
      { label: "エ", text: "放射線取扱主任者の資格を持つ者のみ" },
      { label: "オ", text: "年間被ばく線量が1mSvを超えた労働者" },
    ],
    correctAnswer: "ウ",
    explanation:
      "放射線業務従事者は「管理区域内において放射線業務に従事する労働者」と定義される（電離則第2条）。単に管理区域内にいるだけでは該当しない場合もある。",
    relatedLaw: "電離放射線障害防止規則第2条",
  },
  {
    id: "xr-law-2024-010",
    year: 2024,
    certificationId: "xray",
    subject: "xr-law",
    subjectLabel: "関係法令",
    questionNumber: 10,
    questionText:
      "電離放射線作業特別教育の対象となる業務として、正しいものはどれか。",
    choices: [
      { label: "ア", text: "管理区域の清掃業務のみに従事する場合は対象外" },
      { label: "イ", text: "エックス線装置を用いる放射線業務に従事する労働者は特別教育が必要" },
      { label: "ウ", text: "特別教育を修了すると免許と同等の資格が得られる" },
      { label: "エ", text: "特別教育は管理者のみが受ければよい" },
      { label: "オ", text: "特別教育に代えて、OJTによる実地指導のみで足りる" },
    ],
    correctAnswer: "イ",
    explanation:
      "労働安全衛生規則第36条により、エックス線装置を用いる業務に従事する労働者には電離放射線作業特別教育が義務付けられている。",
    relatedLaw: "労働安全衛生規則第36条",
  },

  // ─── エックス線の測定 2023 ────────────────────────────────────────────────
  {
    id: "xr-meas-2023-001",
    year: 2023,
    certificationId: "xray",
    subject: "xr-measurement",
    subjectLabel: "エックス線の測定に関する知識",
    questionNumber: 1,
    questionText:
      "電離箱式サーベイメータの特徴として、正しいものはどれか。",
    choices: [
      { label: "ア", text: "放射線のエネルギーに対する感度依存性が大きく補正が必要" },
      { label: "イ", text: "高線量率域では測定値の信頼性が高く、低線量率では感度が不十分な場合がある" },
      { label: "ウ", text: "GM計数管式に比べて低い線量率領域での感度が劣る" },
      { label: "エ", text: "気体を電離させる原理を利用しており、エネルギー特性が比較的良好である" },
      { label: "オ", text: "測定値をパルス数で表示し、積算線量の測定に適している" },
    ],
    correctAnswer: "エ",
    explanation:
      "電離箱式サーベイメータは気体（空気）の電離を利用し、エネルギー特性が良好で線量率測定に適する。GM管より感度はやや低いが測定精度が高い。",
  },
  {
    id: "xr-meas-2023-002",
    year: 2023,
    certificationId: "xray",
    subject: "xr-measurement",
    subjectLabel: "エックス線の測定に関する知識",
    questionNumber: 2,
    questionText:
      "GM（ガイガー＝ミュラー）計数管の特性として、正しいものはどれか。",
    choices: [
      { label: "ア", text: "放射線1個あたりのパルスが微小で積分回路が必要" },
      { label: "イ", text: "高線量率域では計数損失（不感時間の影響）が生じる" },
      { label: "ウ", text: "放射線のエネルギーを精度よく識別できる" },
      { label: "エ", text: "電離箱より高い印加電圧では比例計数管として機能する" },
      { label: "オ", text: "液体（液体シンチレータ）を検出媒体として使用する" },
    ],
    correctAnswer: "イ",
    explanation:
      "GM管は高線量率域になると不感時間（デッドタイム）内の放射線を計数できない計数損失が生じる。低線量率の検出感度は高い。",
  },
  {
    id: "xr-meas-2023-003",
    year: 2023,
    certificationId: "xray",
    subject: "xr-measurement",
    subjectLabel: "エックス線の測定に関する知識",
    questionNumber: 3,
    questionText:
      "実効線量（E）の定義として正しいものはどれか。",
    choices: [
      { label: "ア", text: "各組織・臓器の吸収線量の単純平均" },
      { label: "イ", text: "各組織・臓器の等価線量に組織加重係数を乗じて合計したもの" },
      { label: "ウ", text: "全身が均一照射された場合の等価線量" },
      { label: "エ", text: "放射線荷重係数を乗じた吸収線量の総和" },
      { label: "オ", text: "1cm線量当量に放射線荷重係数を乗じたもの" },
    ],
    correctAnswer: "イ",
    explanation:
      "実効線量E＝Σ（wT×HT）。各組織・臓器Tの等価線量HTに組織加重係数wTを乗じて全組織について合計する。単位はSv（シーベルト）。",
  },
  {
    id: "xr-meas-2023-004",
    year: 2023,
    certificationId: "xray",
    subject: "xr-measurement",
    subjectLabel: "エックス線の測定に関する知識",
    questionNumber: 4,
    questionText:
      "ポケット線量計（ポケット電離箱）について正しいものはどれか。",
    choices: [
      { label: "ア", text: "充電した後に使用し、放電量で被ばく線量を積算する" },
      { label: "イ", text: "熱蛍光体を用いて被ばく線量を記録する" },
      { label: "ウ", text: "フィルムの感光で被ばく線量を評価する" },
      { label: "エ", text: "アルミ袋に封入したガラス素子を使用する" },
      { label: "オ", text: "使用前に窒素ガスを封入して初期化する" },
    ],
    correctAnswer: "ア",
    explanation:
      "ポケット線量計（電離箱型）は使用前に充電し、X線等により気体が電離して電荷が失われるため、放電量を読み取り積算線量を知る仕組みである。",
  },
  {
    id: "xr-meas-2023-005",
    year: 2023,
    certificationId: "xray",
    subject: "xr-measurement",
    subjectLabel: "エックス線の測定に関する知識",
    questionNumber: 5,
    questionText:
      "吸収線量（D）の単位として正しいものはどれか。",
    choices: [
      { label: "ア", text: "シーベルト（Sv）" },
      { label: "イ", text: "ベクレル（Bq）" },
      { label: "ウ", text: "グレイ（Gy）" },
      { label: "エ", text: "クーロン毎キログラム（C/kg）" },
      { label: "オ", text: "レム（rem）" },
    ],
    correctAnswer: "ウ",
    explanation:
      "吸収線量の単位はグレイ（Gy）で、1Gy＝1J/kg。等価線量・実効線量の単位はシーベルト（Sv）、放射能の単位はベクレル（Bq）である。",
  },
  {
    id: "xr-meas-2023-006",
    year: 2023,
    certificationId: "xray",
    subject: "xr-measurement",
    subjectLabel: "エックス線の測定に関する知識",
    questionNumber: 6,
    questionText:
      "シンチレーション検出器の原理として正しいものはどれか。",
    choices: [
      { label: "ア", text: "放射線が通過した際の気体の電離を直接電流として検出する" },
      { label: "イ", text: "放射線が半導体を通過した際に生じる電子・正孔対を検出する" },
      { label: "ウ", text: "放射線が蛍光体に当たった際に発生する光を光電子増倍管で増幅・検出する" },
      { label: "エ", text: "放射線が熱蛍光体に蓄積したエネルギーを熱で解放して計測する" },
      { label: "オ", text: "放射線が感光フィルムに作用した銀の析出を光学的に読み取る" },
    ],
    correctAnswer: "ウ",
    explanation:
      "シンチレーション検出器は、放射線が蛍光体（NaI(Tl)等）に当たって発生した光を光電子増倍管（PMT）で増幅し電気パルスとして計測する。",
  },
  {
    id: "xr-meas-2023-007",
    year: 2023,
    certificationId: "xray",
    subject: "xr-measurement",
    subjectLabel: "エックス線の測定に関する知識",
    questionNumber: 7,
    questionText:
      "空気カーマ（K）とエックス線の吸収線量の関係として正しいものはどれか。",
    choices: [
      { label: "ア", text: "空気カーマ（Gy）を空気の質量吸収係数で割ると吸収線量が得られる" },
      { label: "イ", text: "空気中では、空気カーマと空気の吸収線量はほぼ等しい" },
      { label: "ウ", text: "空気カーマは被ばく線量の単位であり、等価線量と同義である" },
      { label: "エ", text: "空気カーマは線量当量と同じ概念で互換可能である" },
      { label: "オ", text: "空気カーマは放射能（Bq）から直接換算される" },
    ],
    correctAnswer: "イ",
    explanation:
      "空気中での電子平衡が成立している条件下では、空気カーマと空気の吸収線量はほぼ等しい値となる（二次電子の制動放射を無視した場合）。",
  },
  {
    id: "xr-meas-2023-008",
    year: 2023,
    certificationId: "xray",
    subject: "xr-measurement",
    subjectLabel: "エックス線の測定に関する知識",
    questionNumber: 8,
    questionText:
      "サーベイメータの使用前点検として適切でないものはどれか。",
    choices: [
      { label: "ア", text: "電池残量の確認" },
      { label: "イ", text: "バックグラウンドの確認" },
      { label: "ウ", text: "線源を使用した応答確認" },
      { label: "エ", text: "校正期限の確認" },
      { label: "オ", text: "測定器を分解して内部の電極を清掃する" },
    ],
    correctAnswer: "オ",
    explanation:
      "サーベイメータの分解・内部清掃はメーカーや専門業者が行うべき作業であり、使用者が勝手に分解すると測定精度に影響し校正が無効になる危険がある。",
  },
  {
    id: "xr-meas-2023-009",
    year: 2023,
    certificationId: "xray",
    subject: "xr-measurement",
    subjectLabel: "エックス線の測定に関する知識",
    questionNumber: 9,
    questionText:
      "等価線量（HT）の計算式として正しいものはどれか。",
    choices: [
      { label: "ア", text: "HT ＝ 吸収線量（DT）× 組織加重係数（wT）" },
      { label: "イ", text: "HT ＝ 吸収線量（DT）× 放射線荷重係数（wR）" },
      { label: "ウ", text: "HT ＝ 吸収線量（DT）÷ 放射線荷重係数（wR）" },
      { label: "エ", text: "HT ＝ 実効線量（E）× 組織加重係数（wT）" },
      { label: "オ", text: "HT ＝ 実効線量（E）÷ 組織加重係数（wT）" },
    ],
    correctAnswer: "イ",
    explanation:
      "等価線量HT＝DT×wR。組織Tにおける吸収線量DTに放射線荷重係数wRを乗じる。X線・γ線のwRは1なので等価線量＝吸収線量（Gy）の数値と等しくなる。",
  },
  {
    id: "xr-meas-2023-010",
    year: 2023,
    certificationId: "xray",
    subject: "xr-measurement",
    subjectLabel: "エックス線の測定に関する知識",
    questionNumber: 10,
    questionText:
      "蛍光ガラス線量計（ガラスバッジ）の特徴として正しいものはどれか。",
    choices: [
      { label: "ア", text: "読み取り操作により蓄積情報が消去されるため再読み取りはできない" },
      { label: "イ", text: "熱（加熱）により蛍光を発生させて線量を評価する" },
      { label: "ウ", text: "紫外線（UV）照射により橙色の蛍光を発し線量を評価する" },
      { label: "エ", text: "フィルムの黒化度で線量を評価する" },
      { label: "オ", text: "気体の電離を利用して積算線量を電気的に読み取る" },
    ],
    correctAnswer: "ウ",
    explanation:
      "蛍光ガラス線量計（ラジオフォトルミネセンス線量計）は紫外線照射により橙色蛍光を発し線量を評価する。再読み取り可能で長期保存に適している。",
  },

  // ─── エックス線の測定 2024 ────────────────────────────────────────────────
  {
    id: "xr-meas-2024-001",
    year: 2024,
    certificationId: "xray",
    subject: "xr-measurement",
    subjectLabel: "エックス線の測定に関する知識",
    questionNumber: 1,
    questionText:
      "1cm線量当量Hp(10)の測定に用いる個人線量計として、最も適切なものはどれか。",
    choices: [
      { label: "ア", text: "ポケット電離箱（充電式ポケット線量計）" },
      { label: "イ", text: "フィルムバッジ（安全フィルム）" },
      { label: "ウ", text: "TLDバッジ（熱蛍光線量計）" },
      { label: "エ", text: "ガラスバッジ（蛍光ガラス線量計）" },
      { label: "オ", text: "ア〜エのいずれも適切であり、種類は問わない" },
    ],
    correctAnswer: "オ",
    explanation:
      "1cm線量当量Hp(10)の測定には、TLDバッジ・ガラスバッジ・フィルムバッジ・OSL線量計などが使用でき、種類は問わない。測定の正確性と保存性で選択する。",
  },
  {
    id: "xr-meas-2024-002",
    year: 2024,
    certificationId: "xray",
    subject: "xr-measurement",
    subjectLabel: "エックス線の測定に関する知識",
    questionNumber: 2,
    questionText:
      "放射線荷重係数（wR）について、エックス線・ガンマ線の値として正しいものはどれか。",
    choices: [
      { label: "ア", text: "0.5" },
      { label: "イ", text: "1" },
      { label: "ウ", text: "2" },
      { label: "エ", text: "20" },
      { label: "オ", text: "エネルギーによって異なり1〜20の間の値をとる" },
    ],
    correctAnswer: "イ",
    explanation:
      "エックス線・ガンマ線の放射線荷重係数wR＝1。中性子線は1〜20（エネルギー依存）、アルファ線は20。wR＝1なのでX線の等価線量＝吸収線量（Gy）と等しい。",
  },
  {
    id: "xr-meas-2024-003",
    year: 2024,
    certificationId: "xray",
    subject: "xr-measurement",
    subjectLabel: "エックス線の測定に関する知識",
    questionNumber: 3,
    questionText:
      "サーベイメータによる線量率測定の際、指示値が安定しない原因として考えられないものはどれか。",
    choices: [
      { label: "ア", text: "バックグラウンド放射線の統計的変動" },
      { label: "イ", text: "電池の消耗による電圧低下" },
      { label: "ウ", text: "検出器への散乱放射線の影響" },
      { label: "エ", text: "測定器の色（外観）の違い" },
      { label: "オ", text: "測定位置の微妙なずれ" },
    ],
    correctAnswer: "エ",
    explanation:
      "測定器の外観の色は放射線の検出性能に影響しない。指示値の不安定原因としては電池消耗、散乱線の影響、統計的変動、測定位置の変化などがある。",
  },
  {
    id: "xr-meas-2024-004",
    year: 2024,
    certificationId: "xray",
    subject: "xr-measurement",
    subjectLabel: "エックス線の測定に関する知識",
    questionNumber: 4,
    questionText:
      "TLD（熱蛍光線量計）の素子として一般的に使用される物質はどれか。",
    choices: [
      { label: "ア", text: "ヨウ化ナトリウム（NaI）" },
      { label: "イ", text: "ゲルマニウム（Ge）" },
      { label: "ウ", text: "フッ化リチウム（LiF）またはフッ化カルシウム（CaF₂）" },
      { label: "エ", text: "銀活性リン酸塩ガラス" },
      { label: "オ", text: "テトラホウ酸リチウム（Li₂B₄O₇）以外は使用できない" },
    ],
    correctAnswer: "ウ",
    explanation:
      "TLDの代表的素子はフッ化リチウム（LiF:Mg,Ti）やフッ化カルシウム（CaF₂:Mn）。加熱すると蓄積エネルギーを光として放出（熱蛍光）する。",
  },
  {
    id: "xr-meas-2024-005",
    year: 2024,
    certificationId: "xray",
    subject: "xr-measurement",
    subjectLabel: "エックス線の測定に関する知識",
    questionNumber: 5,
    questionText:
      "線量（実効線量）を測定・評価する場合の「1cm線量当量」と「70μm線量当量」の使い分けとして正しいものはどれか。",
    choices: [
      { label: "ア", text: "1cm線量当量は実効線量、70μm線量当量は皮膚の等価線量の評価に用いる" },
      { label: "イ", text: "70μm線量当量は実効線量、1cm線量当量は皮膚の評価に用いる" },
      { label: "ウ", text: "両者はまったく同じ用途で使用される" },
      { label: "エ", text: "1cm線量当量は水晶体のみの評価、70μm線量当量は全身の評価に用いる" },
      { label: "オ", text: "どちらを使用するかは測定器の種類によって決まり、用途は関係ない" },
    ],
    correctAnswer: "ア",
    explanation:
      "1cm線量当量Hp(10)は体幹部実効線量の評価、70μm線量当量Hp(0.07)は皮膚等価線量の評価に用いる。水晶体は3mm線量当量Hp(3)を使用する。",
  },
  {
    id: "xr-meas-2024-006",
    year: 2024,
    certificationId: "xray",
    subject: "xr-measurement",
    subjectLabel: "エックス線の測定に関する知識",
    questionNumber: 6,
    questionText:
      "サーベイメータの校正について正しいものはどれか。",
    choices: [
      { label: "ア", text: "校正は購入時のみ行えばよく、定期校正は不要である" },
      { label: "イ", text: "校正は製造メーカーのみが実施でき、第三者機関による校正は認められない" },
      { label: "ウ", text: "校正は国家計量標準にトレーサブルな施設で定期的に実施する必要がある" },
      { label: "エ", text: "校正後は使用環境に関係なく永続的に有効である" },
      { label: "オ", text: "校正とは単に電池交換を行うことである" },
    ],
    correctAnswer: "ウ",
    explanation:
      "サーベイメータの校正は国家計量標準にトレーサブルな校正施設で定期的（通常1〜2年ごと）に実施する必要がある。これにより測定の信頼性を確保する。",
  },
  {
    id: "xr-meas-2024-007",
    year: 2024,
    certificationId: "xray",
    subject: "xr-measurement",
    subjectLabel: "エックス線の測定に関する知識",
    questionNumber: 7,
    questionText:
      "半導体検出器（Si検出器等）の特徴として正しいものはどれか。",
    choices: [
      { label: "ア", text: "エネルギー分解能はNaI(Tl)シンチレータより低い" },
      { label: "イ", text: "常温での使用は困難で液体窒素冷却が常に必要" },
      { label: "ウ", text: "気体検出器に比べて感度が低く実用性に欠ける" },
      { label: "エ", text: "エネルギー分解能が高く、X線・γ線のエネルギー分析に優れる" },
      { label: "オ", text: "半導体検出器はα線のみに感度があり、X線には応答しない" },
    ],
    correctAnswer: "エ",
    explanation:
      "半導体検出器はエネルギー分解能がシンチレータより優れており、X線・γ線のエネルギースペクトル分析に広く使用される。高純度Ge検出器は特にエネルギー分解能が高い。",
  },
  {
    id: "xr-meas-2024-008",
    year: 2024,
    certificationId: "xray",
    subject: "xr-measurement",
    subjectLabel: "エックス線の測定に関する知識",
    questionNumber: 8,
    questionText:
      "放射能の単位ベクレル（Bq）の定義として正しいものはどれか。",
    choices: [
      { label: "ア", text: "1秒間に1個の放射性壊変が起きる放射能の強さ" },
      { label: "イ", text: "1秒間に1Jのエネルギーを1kgの物質に付与する線量率" },
      { label: "ウ", text: "1グラムのラジウム226と等しい放射能" },
      { label: "エ", text: "1時間あたりに放出されるγ線の総エネルギー" },
      { label: "オ", text: "1秒間に検出器に入射する放射線の個数" },
    ],
    correctAnswer: "ア",
    explanation:
      "ベクレル（Bq）は放射能の単位で、1Bq＝1秒間に1個の放射性核壊変が起きる放射能。旧単位はキュリー（Ci）で1Ci＝3.7×10¹⁰Bq。",
  },
  {
    id: "xr-meas-2024-009",
    year: 2024,
    certificationId: "xray",
    subject: "xr-measurement",
    subjectLabel: "エックス線の測定に関する知識",
    questionNumber: 9,
    questionText:
      "フィルムバッジを用いた線量評価について、正しいものはどれか。",
    choices: [
      { label: "ア", text: "フィルムバッジは現像後に再利用できる" },
      { label: "イ", text: "フィルムの黒化度（光学濃度）から被ばく線量を評価する" },
      { label: "ウ", text: "フィルムバッジは高温・多湿環境でも性能が変わらない" },
      { label: "エ", text: "フィルムバッジはリアルタイムで線量を表示できる" },
      { label: "オ", text: "フィルムバッジのエネルギー特性はTLDより優れている" },
    ],
    correctAnswer: "イ",
    explanation:
      "フィルムバッジは現像後のフィルムの光学濃度（黒化度）を濃度計で測定し、被ばく線量を評価する。高温・多湿に弱く、再利用はできない。",
  },
  {
    id: "xr-meas-2024-010",
    year: 2024,
    certificationId: "xray",
    subject: "xr-measurement",
    subjectLabel: "エックス線の測定に関する知識",
    questionNumber: 10,
    questionText:
      "作業環境中のエックス線の線量率測定において、測定値に影響を与える要素として正しいものはどれか。",
    choices: [
      { label: "ア", text: "測定器の外観色は測定値に影響する" },
      { label: "イ", text: "測定器を持つ測定者の体格は測定値に影響しない" },
      { label: "ウ", text: "背面散乱やサイドスキャッタ（側方散乱）は測定値に影響する" },
      { label: "エ", text: "測定時の室温が20〜25℃の範囲であれば測定値に影響しない" },
      { label: "オ", text: "測定器のメーカーが異なっても、同一線量率ならば常に同じ値を示す" },
    ],
    correctAnswer: "ウ",
    explanation:
      "散乱線（背面散乱・側方散乱）は一次線量に上乗せされ、測定値に影響する。測定器の種類・エネルギー特性・室温・位置なども測定精度に影響する。",
  },

  // ─── 放射線の生体影響 2023 ────────────────────────────────────────────────
  {
    id: "xr-bio-2023-001",
    year: 2023,
    certificationId: "xray",
    subject: "xr-biology",
    subjectLabel: "放射線の生体に与える影響に関する知識",
    questionNumber: 1,
    questionText:
      "確定的影響（組織反応）の特徴として正しいものはどれか。",
    choices: [
      { label: "ア", text: "しきい線量（閾値）が存在し、それ以下では影響は発生しない" },
      { label: "イ", text: "発生確率は線量に比例し、しきい値は存在しない" },
      { label: "ウ", text: "がんの発生は確定的影響の代表例である" },
      { label: "エ", text: "遺伝的影響は確定的影響に分類される" },
      { label: "オ", text: "確定的影響の重篤度は線量に依存せず一定である" },
    ],
    correctAnswer: "ア",
    explanation:
      "確定的影響（組織反応）はしきい線量が存在し、それを超えると重篤度が線量に依存して大きくなる。脱毛・白内障・不妊・骨髄障害などが代表例。",
  },
  {
    id: "xr-bio-2023-002",
    year: 2023,
    certificationId: "xray",
    subject: "xr-biology",
    subjectLabel: "放射線の生体に与える影響に関する知識",
    questionNumber: 2,
    questionText:
      "確率的影響として正しいものはどれか。",
    choices: [
      { label: "ア", text: "脱毛（脱毛症）" },
      { label: "イ", text: "白内障" },
      { label: "ウ", text: "不妊（男性の一時的不妊）" },
      { label: "エ", text: "発がん（放射線誘発がん）" },
      { label: "オ", text: "急性放射線症（悪心・嘔吐）" },
    ],
    correctAnswer: "エ",
    explanation:
      "確率的影響はしきい値なく線量に比例して発生確率が増加する影響で、発がんと遺伝的影響が代表例。脱毛・白内障・不妊は確定的影響。",
  },
  {
    id: "xr-bio-2023-003",
    year: 2023,
    certificationId: "xray",
    subject: "xr-biology",
    subjectLabel: "放射線の生体に与える影響に関する知識",
    questionNumber: 3,
    questionText:
      "放射線に対する感受性が最も高い組織として正しいものはどれか。",
    choices: [
      { label: "ア", text: "骨（緻密骨）" },
      { label: "イ", text: "神経組織（脳・脊髄）" },
      { label: "ウ", text: "骨髄（造血組織）" },
      { label: "エ", text: "筋肉組織" },
      { label: "オ", text: "脂肪組織" },
    ],
    correctAnswer: "ウ",
    explanation:
      "ベルゴニー・トリボンドーの法則：細胞分裂が活発で、分化度が低い組織ほど放射線感受性が高い。骨髄（造血組織）・生殖腺・腸粘膜などが高感受性組織の代表。",
  },
  {
    id: "xr-bio-2023-004",
    year: 2023,
    certificationId: "xray",
    subject: "xr-biology",
    subjectLabel: "放射線の生体に与える影響に関する知識",
    questionNumber: 4,
    questionText:
      "全身に1Gy程度の放射線を急性被ばくした場合に現れる主な症状として正しいものはどれか。",
    choices: [
      { label: "ア", text: "即座に死亡する（致死線量）" },
      { label: "イ", text: "悪心・嘔吐などの前駆症状が現れ、造血機能障害が生じる" },
      { label: "ウ", text: "症状はほとんどなく、遅発性の白内障のみが問題となる" },
      { label: "エ", text: "皮膚の紅斑（放射線熱傷）が即座に発生する" },
      { label: "オ", text: "中枢神経障害により意識障害が起きる" },
    ],
    correctAnswer: "イ",
    explanation:
      "全身1Gy急性被ばくでは前駆症状（悪心・嘔吐）が現れ、数週間後に造血機能障害（白血球・血小板減少）が主症状となる急性放射線症が発症する。",
  },
  {
    id: "xr-bio-2023-005",
    year: 2023,
    certificationId: "xray",
    subject: "xr-biology",
    subjectLabel: "放射線の生体に与える影響に関する知識",
    questionNumber: 5,
    questionText:
      "組織加重係数が最も大きい（放射線感受性が最も高い）臓器として正しいものはどれか（ICRP 2007勧告基準）。",
    choices: [
      { label: "ア", text: "甲状腺（wT＝0.04）" },
      { label: "イ", text: "肝臓（wT＝0.04）" },
      { label: "ウ", text: "骨髄（wT＝0.12）" },
      { label: "エ", text: "皮膚（wT＝0.01）" },
      { label: "オ", text: "骨表面（wT＝0.01）" },
    ],
    correctAnswer: "ウ",
    explanation:
      "ICRP 2007勧告では骨髄・結腸・肺・胃の組織加重係数wTはそれぞれ0.12と最も高い。甲状腺・肝臓は0.04、皮膚・骨表面は0.01。",
  },
  {
    id: "xr-bio-2023-006",
    year: 2023,
    certificationId: "xray",
    subject: "xr-biology",
    subjectLabel: "放射線の生体に与える影響に関する知識",
    questionNumber: 6,
    questionText:
      "白内障（水晶体の混濁）が確定的影響として発症するしきい線量として、最も近い値はどれか（急性被ばくの場合）。",
    choices: [
      { label: "ア", text: "0.1Gy" },
      { label: "イ", text: "0.5Gy" },
      { label: "ウ", text: "5Gy" },
      { label: "エ", text: "10Gy" },
      { label: "オ", text: "しきい値はなく微量でも発症する" },
    ],
    correctAnswer: "イ",
    explanation:
      "水晶体混濁（白内障）のしきい線量はICRPの2021年勧告で急性被ばく0.5Gy、慢性被ばく0.5Gy/年と改定された（従来より引き下げ）。",
  },
  {
    id: "xr-bio-2023-007",
    year: 2023,
    certificationId: "xray",
    subject: "xr-biology",
    subjectLabel: "放射線の生体に与える影響に関する知識",
    questionNumber: 7,
    questionText:
      "放射線の間接作用（フリーラジカルを介した作用）に関する記述として正しいものはどれか。",
    choices: [
      { label: "ア", text: "間接作用は生体内の水分子の電離・励起によりラジカルが生じ、DNAなどの生体分子を傷つける" },
      { label: "イ", text: "間接作用は放射線が直接DNAの二本鎖を切断する作用である" },
      { label: "ウ", text: "間接作用は細胞外でのみ起きる現象である" },
      { label: "エ", text: "間接作用は酸素が存在しない嫌気状態でより顕著に起きる" },
      { label: "オ", text: "間接作用はα線でのみ見られ、X線では起きない" },
    ],
    correctAnswer: "ア",
    explanation:
      "間接作用は放射線が細胞内水分子を電離してOHラジカル等のフリーラジカルを生成し、これがDNAや細胞構成分子を損傷する作用。X線では直接作用より間接作用が支配的。",
  },
  {
    id: "xr-bio-2023-008",
    year: 2023,
    certificationId: "xray",
    subject: "xr-biology",
    subjectLabel: "放射線の生体に与える影響に関する知識",
    questionNumber: 8,
    questionText:
      "胎児への放射線影響として正しいものはどれか。",
    choices: [
      { label: "ア", text: "着床前期（受精〜2週）の被ばくは奇形の発生率が最も高い" },
      { label: "イ", text: "器官形成期（3〜8週）の被ばくは奇形が発生しやすい" },
      { label: "ウ", text: "胎児期（9週以降）は放射線の影響をまったく受けない" },
      { label: "エ", text: "妊娠全期間を通じて奇形発生の感受性は一定である" },
      { label: "オ", text: "胎児への放射線影響のしきい値は成人より高い" },
    ],
    correctAnswer: "イ",
    explanation:
      "器官形成期（3〜8週）は各臓器が形成される時期で形態的奇形が最も起きやすい。着床前期は「全か無か」の法則が働き、胎児期は発育障害・精神遅滞が問題。",
  },
  {
    id: "xr-bio-2023-009",
    year: 2023,
    certificationId: "xray",
    subject: "xr-biology",
    subjectLabel: "放射線の生体に与える影響に関する知識",
    questionNumber: 9,
    questionText:
      "酸素効果（OER：酸素増感比）に関する記述として正しいものはどれか。",
    choices: [
      { label: "ア", text: "酸素が存在すると放射線の生物効果は低下する" },
      { label: "イ", text: "酸素が存在すると間接作用によるDNA損傷が増強される" },
      { label: "ウ", text: "酸素効果はα線で最も顕著に現れる" },
      { label: "エ", text: "低酸素（嫌気）状態の細胞は有酸素状態より放射線感受性が高い" },
      { label: "オ", text: "酸素効果は直接作用のみで生じる現象である" },
    ],
    correctAnswer: "イ",
    explanation:
      "酸素はフリーラジカルとの反応でDNAの損傷を固定化し（間接作用を増強）、放射線の生物効果を高める。低酸素腫瘍細胞が放射線抵抗性を示す原因となる。",
  },
  {
    id: "xr-bio-2023-010",
    year: 2023,
    certificationId: "xray",
    subject: "xr-biology",
    subjectLabel: "放射線の生体に与える影響に関する知識",
    questionNumber: 10,
    questionText:
      "急性放射線症で造血系障害が主症状となる全身被ばく線量の目安として正しいものはどれか。",
    choices: [
      { label: "ア", text: "0.1Gy未満" },
      { label: "イ", text: "0.25〜1Gy程度" },
      { label: "ウ", text: "1〜6Gy程度" },
      { label: "エ", text: "6〜10Gy程度で消化管障害が主体となる" },
      { label: "オ", text: "10Gy以上では中枢神経障害が主体となる" },
    ],
    correctAnswer: "ウ",
    explanation:
      "全身急性被ばくで1〜6Gy程度では骨髄（造血系）障害が主症状。6〜10Gyでは消化管障害が加わり、10Gy以上では中枢神経障害が主体となる。",
  },

  // ─── 放射線の生体影響 2024 ────────────────────────────────────────────────
  {
    id: "xr-bio-2024-001",
    year: 2024,
    certificationId: "xray",
    subject: "xr-biology",
    subjectLabel: "放射線の生体に与える影響に関する知識",
    questionNumber: 1,
    questionText:
      "放射線の種類別の特徴として、正しいものはどれか。",
    choices: [
      { label: "ア", text: "α線は紙1枚で遮蔽できるが、内部被ばくでの生物効果は小さい" },
      { label: "イ", text: "β線は鉛や厚いコンクリートでしか遮蔽できない" },
      { label: "ウ", text: "γ線は質量を持つ粒子であり皮膚で遮蔽される" },
      { label: "エ", text: "中性子線は水素を多く含む物質（水・ポリエチレン）で効果的に遮蔽できる" },
      { label: "オ", text: "X線はα線より電離作用が強く生物効果が高い" },
    ],
    correctAnswer: "エ",
    explanation:
      "中性子線は水素原子核（陽子）との弾性散乱で効果的に減速・遮蔽できる。α線は数cmの空気や皮膚で止まるが内部被ばくの生物効果は大きい（wR＝20）。",
  },
  {
    id: "xr-bio-2024-002",
    year: 2024,
    certificationId: "xray",
    subject: "xr-biology",
    subjectLabel: "放射線の生体に与える影響に関する知識",
    questionNumber: 2,
    questionText:
      "LET（線エネルギー付与）と生物効果の関係として正しいものはどれか。",
    choices: [
      { label: "ア", text: "LETが高いほどRBE（相対的生物効果比）は常に低下する" },
      { label: "イ", text: "X線・γ線は高LET放射線に分類される" },
      { label: "ウ", text: "LETが高い放射線は単位経路長あたりのイオン化密度が大きく生物効果が高い" },
      { label: "エ", text: "α線はX線より低LETであるため生物効果が小さい" },
      { label: "オ", text: "LETと生物効果に相関関係はない" },
    ],
    correctAnswer: "ウ",
    explanation:
      "高LET放射線（α線・中性子線）は単位長さあたりのイオン化密度が高くDNA二重鎖切断を多く引き起こすため生物効果（RBE）が高い。X線・γ線は低LET。",
  },
  {
    id: "xr-bio-2024-003",
    year: 2024,
    certificationId: "xray",
    subject: "xr-biology",
    subjectLabel: "放射線の生体に与える影響に関する知識",
    questionNumber: 3,
    questionText:
      "DNAの放射線損傷として、修復されにくく致命的になりやすい損傷はどれか。",
    choices: [
      { label: "ア", text: "一本鎖切断（SSB）" },
      { label: "イ", text: "二本鎖切断（DSB）" },
      { label: "ウ", text: "塩基の酸化（8-OHdG形成）" },
      { label: "エ", text: "ピリミジン二量体の形成" },
      { label: "オ", text: "アルキル化による塩基修飾" },
    ],
    correctAnswer: "イ",
    explanation:
      "DNA二本鎖切断（DSB）は最も重篤な損傷で、誤修復が起きると染色体異常・突然変異・細胞死の原因となる。一本鎖切断（SSB）は対側鎖を鋳型に修復されやすい。",
  },
  {
    id: "xr-bio-2024-004",
    year: 2024,
    certificationId: "xray",
    subject: "xr-biology",
    subjectLabel: "放射線の生体に与える影響に関する知識",
    questionNumber: 4,
    questionText:
      "男性の生殖腺（精巣）への放射線照射で一時的不妊が起こる急性被ばく線量のしきい値として最も近いものはどれか。",
    choices: [
      { label: "ア", text: "0.05Gy" },
      { label: "イ", text: "0.15Gy" },
      { label: "ウ", text: "3.5Gy" },
      { label: "エ", text: "6Gy" },
      { label: "オ", text: "100Gy" },
    ],
    correctAnswer: "イ",
    explanation:
      "ICRP 2007勧告では、男性精巣への急性被ばくで一時的不妊のしきい値は約0.15Gy、永続的不妊は約3.5Gyとされている。",
  },
  {
    id: "xr-bio-2024-005",
    year: 2024,
    certificationId: "xray",
    subject: "xr-biology",
    subjectLabel: "放射線の生体に与える影響に関する知識",
    questionNumber: 5,
    questionText:
      "放射線誘発がんの潜伏期間の特徴として正しいものはどれか。",
    choices: [
      { label: "ア", text: "潜伏期間は放射線被ばく後2〜3年以内が最も多い" },
      { label: "イ", text: "白血病は固形がんと比較して潜伏期間が長い傾向がある" },
      { label: "ウ", text: "白血病は比較的潜伏期間が短く、2〜5年で発症のピークが現れる" },
      { label: "エ", text: "放射線誘発がんの潜伏期間は個人差がなく一定である" },
      { label: "オ", text: "潜伏期間は被ばく線量と無関係である" },
    ],
    correctAnswer: "ウ",
    explanation:
      "放射線誘発白血病は2〜5年後にピーク、固形がんは10〜20年以上の長い潜伏期間がある。これは確率的影響の遅発性障害の特徴を示している。",
  },
  {
    id: "xr-bio-2024-006",
    year: 2024,
    certificationId: "xray",
    subject: "xr-biology",
    subjectLabel: "放射線の生体に与える影響に関する知識",
    questionNumber: 6,
    questionText:
      "放射線の外部被ばくと内部被ばくの比較として正しいものはどれか。",
    choices: [
      { label: "ア", text: "α線は外部被ばくでも内部被ばくでも同程度の危険性がある" },
      { label: "イ", text: "内部被ばくの場合、排泄されるまで継続的に被ばくし続ける" },
      { label: "ウ", text: "γ線は外部被ばくのリスクが大きく、内部被ばくのリスクは無視できる" },
      { label: "エ", text: "外部被ばくと内部被ばくでは放射線荷重係数が異なる" },
      { label: "オ", text: "β線は内部被ばくの危険性がなく外部被ばくのみ問題となる" },
    ],
    correctAnswer: "イ",
    explanation:
      "内部被ばくでは体内に取り込まれた放射性核種が物理的半減期と生物学的半減期に従い排泄されるまで継続照射される。α線は外部被ばくのリスクは小さいが内部被ばくは危険。",
  },
  {
    id: "xr-bio-2024-007",
    year: 2024,
    certificationId: "xray",
    subject: "xr-biology",
    subjectLabel: "放射線の生体に与える影響に関する知識",
    questionNumber: 7,
    questionText:
      "放射線感受性に関するベルゴニー・トリボンドーの法則について正しいものはどれか。",
    choices: [
      { label: "ア", text: "分化度が高い細胞ほど放射線感受性が高い" },
      { label: "イ", text: "細胞分裂が活発で分化度が低い細胞ほど放射線感受性が高い" },
      { label: "ウ", text: "細胞の大きさが大きいほど放射線感受性が低い" },
      { label: "エ", text: "成熟した神経細胞は放射線感受性が最も高い" },
      { label: "オ", text: "この法則はすべての細胞に例外なく適用される" },
    ],
    correctAnswer: "イ",
    explanation:
      "ベルゴニー・トリボンドーの法則：細胞分裂が活発で核が大きく分化度が低い細胞ほど放射線感受性が高い。造血幹細胞・精原細胞・腸管粘膜上皮細胞が代表例。",
  },
  {
    id: "xr-bio-2024-008",
    year: 2024,
    certificationId: "xray",
    subject: "xr-biology",
    subjectLabel: "放射線の生体に与える影響に関する知識",
    questionNumber: 8,
    questionText:
      "放射線による染色体異常のうち、二動原体染色体（ダイセントリック）について正しいものはどれか。",
    choices: [
      { label: "ア", text: "一本鎖切断（SSB）のみで形成される" },
      { label: "イ", text: "2本の染色体の二本鎖切断による非相同末端結合で形成され、被ばく指標に使われる" },
      { label: "ウ", text: "ダイセントリックは自然発生率が高く被ばくの指標にはならない" },
      { label: "エ", text: "ダイセントリックは紫外線照射のみで形成される" },
      { label: "オ", text: "ダイセントリックの形成には染色体の三本鎖切断が必要" },
    ],
    correctAnswer: "イ",
    explanation:
      "ダイセントリック染色体は2本の染色体のDSBによる非相同末端結合で形成される。自然発生率が極めて低いため、放射線被ばくの生物学的線量評価指標として使用される。",
  },
  {
    id: "xr-bio-2024-009",
    year: 2024,
    certificationId: "xray",
    subject: "xr-biology",
    subjectLabel: "放射線の生体に与える影響に関する知識",
    questionNumber: 9,
    questionText:
      "放射線による皮膚障害（放射線皮膚炎）について正しいものはどれか。",
    choices: [
      { label: "ア", text: "急性紅斑のしきい線量は約0.1Gyである" },
      { label: "イ", text: "放射線皮膚炎はしきい値がなく確率的影響に分類される" },
      { label: "ウ", text: "急性紅斑は約3〜6Gy以上の急性被ばくで発症し、確定的影響である" },
      { label: "エ", text: "放射線による脱毛はγ線では起きず、α線のみで起きる" },
      { label: "オ", text: "放射線皮膚炎に対する有効な治療法は現在存在しない" },
    ],
    correctAnswer: "ウ",
    explanation:
      "急性放射線皮膚炎（紅斑）はしきい線量約3〜6Gy以上で発症する確定的影響。線量が高いほど重篤度が増す。脱毛は約3〜5Gyで一時的脱毛が起きる。",
  },
  {
    id: "xr-bio-2024-010",
    year: 2024,
    certificationId: "xray",
    subject: "xr-biology",
    subjectLabel: "放射線の生体に与える影響に関する知識",
    questionNumber: 10,
    questionText:
      "放射線防護において「ALARAの原則」の意味として正しいものはどれか。",
    choices: [
      { label: "ア", text: "法令上の線量限度以内であれば、被ばく低減の努力は不要である" },
      { label: "イ", text: "被ばく線量は合理的に達成できる限り低く保つべきであるという原則" },
      { label: "ウ", text: "すべての放射線業務を直ちに中止すべきという原則" },
      { label: "エ", text: "放射線利用の便益が被ばくリスクを常に上回らなければならないという原則" },
      { label: "オ", text: "ALARAは法的拘束力のない単なる理念であり実際には適用しなくてよい" },
    ],
    correctAnswer: "イ",
    explanation:
      "ALARA（As Low As Reasonably Achievable）は「合理的に達成できる限り低く」という放射線防護の基本原則。線量限度以内であっても不必要な被ばくは避ける努力を求める。",
  },
];
