import type { ExamQuestion } from "./types";

export const questions: ExamQuestion[] = [
  // ─── ガンマ線照射装置に関する知識 2023 ───────────────────────────────────
  {
    id: "gr-know-2023-001",
    year: 2023,
    certificationId: "gamma",
    subject: "gr-knowledge",
    subjectLabel: "ガンマ線照射装置に関する知識",
    questionNumber: 1,
    questionText:
      "ガンマ線透過写真撮影に用いられる放射性同位元素として、最も一般的に使用されるものはどれか。",
    choices: [
      { label: "ア", text: "コバルト60（Co-60）のみが使用される" },
      { label: "イ", text: "イリジウム192（Ir-192）が工業非破壊検査で最も広く使用される" },
      { label: "ウ", text: "ヨウ素131（I-131）が最も高いガンマ線エネルギーを持つ" },
      { label: "エ", text: "セシウム137（Cs-137）は半減期が短く頻繁に交換が必要" },
      { label: "オ", text: "テクネチウム99m（Tc-99m）が工業用撮影に最適である" },
    ],
    correctAnswer: "イ",
    explanation:
      "Ir-192（半減期74日、エネルギー0.31〜0.61MeV）は鋼鉄10〜80mm程度の非破壊検査に最適で、工業用ガンマ線透過撮影で最も広く使用される。",
  },
  {
    id: "gr-know-2023-002",
    year: 2023,
    certificationId: "gamma",
    subject: "gr-knowledge",
    subjectLabel: "ガンマ線照射装置に関する知識",
    questionNumber: 2,
    questionText:
      "コバルト60（Co-60）の主な特徴として正しいものはどれか。",
    choices: [
      { label: "ア", text: "半減期が約74日で短期間で放射能が減衰する" },
      { label: "イ", text: "放出するガンマ線エネルギーは約0.3MeVと低エネルギーである" },
      { label: "ウ", text: "半減期が約5.27年で、高エネルギーのガンマ線（1.17MeVと1.33MeV）を放出する" },
      { label: "エ", text: "主に薄い鋼板（10mm以下）の検査に使用される" },
      { label: "オ", text: "Co-60はβ線のみを放出し、ガンマ線は放出しない" },
    ],
    correctAnswer: "ウ",
    explanation:
      "Co-60の半減期は5.27年で、1.17MeVと1.33MeVの高エネルギーガンマ線を2本放出する。厚い鋼材（50mm以上）の検査に適している。",
  },
  {
    id: "gr-know-2023-003",
    year: 2023,
    certificationId: "gamma",
    subject: "gr-knowledge",
    subjectLabel: "ガンマ線照射装置に関する知識",
    questionNumber: 3,
    questionText:
      "ガンマ線照射装置の線源容器（ガンマカメラ）について正しいものはどれか。",
    choices: [
      { label: "ア", text: "線源容器は主にアルミニウムで製造され、軽量化を優先する" },
      { label: "イ", text: "線源容器は線源を収納した状態でも外部の線量率が法令基準を超えてはならない" },
      { label: "ウ", text: "線源容器の遮蔽材には主にプラスチックが使用される" },
      { label: "エ", text: "線源容器の強度基準は特に定められていない" },
      { label: "オ", text: "線源容器から線源を取り出す際は素手でも可能である" },
    ],
    correctAnswer: "イ",
    explanation:
      "線源容器は収納状態での表面の線量率が法令基準（2mSv/h以下等）を満たす必要がある。遮蔽材には鉛・劣化ウランが使用され、強度基準も厳格に規定される。",
    relatedLaw: "放射性同位元素等規制法",
  },
  {
    id: "gr-know-2023-004",
    year: 2023,
    certificationId: "gamma",
    subject: "gr-knowledge",
    subjectLabel: "ガンマ線照射装置に関する知識",
    questionNumber: 4,
    questionText:
      "ガンマ線透過写真撮影における幾何学的不鮮鋭度（Ug）を小さくする方法として正しいものはどれか。",
    choices: [
      { label: "ア", text: "線源の寸法（焦点サイズ）を大きくする" },
      { label: "イ", text: "線源から試験体までの距離（SSD）を短くする" },
      { label: "ウ", text: "試験体からフィルムまでの距離を大きくする" },
      { label: "エ", text: "線源の寸法（焦点サイズ）を小さくし、SSDを長くする" },
      { label: "オ", text: "試験体の厚さを増やす" },
    ],
    correctAnswer: "エ",
    explanation:
      "幾何学的不鮮鋭度Ug＝d×b/a（d：線源寸法、b：試験体〜フィルム距離、a：線源〜試験体距離）。線源寸法を小さく、SSDを長くするとUgは小さくなる。",
  },
  {
    id: "gr-know-2023-005",
    year: 2023,
    certificationId: "gamma",
    subject: "gr-knowledge",
    subjectLabel: "ガンマ線照射装置に関する知識",
    questionNumber: 5,
    questionText:
      "放射性同位元素の半減期に関する記述として正しいものはどれか。",
    choices: [
      { label: "ア", text: "半減期は温度・圧力などの環境条件によって変化する" },
      { label: "イ", text: "半減期は放射性核種ごとに固有の値で、環境条件によらず一定である" },
      { label: "ウ", text: "半減期が長いほど単位時間あたりの壊変数（放射能）は大きい" },
      { label: "エ", text: "半減期が経過するごとに放射能は1/3に減少する" },
      { label: "オ", text: "物理的半減期と生物学的半減期は同じ概念である" },
    ],
    correctAnswer: "イ",
    explanation:
      "半減期は核種固有の定数であり、温度・圧力・化学状態によらず一定。半減期が長いほど単位時間の壊変数は少なく（低放射能）、半減期ごとに放射能は1/2に減少する。",
  },
  {
    id: "gr-know-2023-006",
    year: 2023,
    certificationId: "gamma",
    subject: "gr-knowledge",
    subjectLabel: "ガンマ線照射装置に関する知識",
    questionNumber: 6,
    questionText:
      "ガンマ線透過写真撮影に使用するイメージングプレート（IP）またはフィルムに関して正しいものはどれか。",
    choices: [
      { label: "ア", text: "工業用フィルムは医療用フィルムより感度が高い" },
      { label: "イ", text: "増感紙は主に散乱線を増加させる目的で使用する" },
      { label: "ウ", text: "フィルムの粒状性が細かいほど感度が高い傾向がある" },
      { label: "エ", text: "工業用フィルムは医療用より粒子が細かく、高コントラストの画像が得られる" },
      { label: "オ", text: "フィルムの現像温度は最終的な画像品質に影響しない" },
    ],
    correctAnswer: "エ",
    explanation:
      "工業用フィルムは微粒子で高コントラスト・高解像度を優先した設計。医療用は被ばく低減のため高感度設計。工業用は感度が低い代わりに高い画質を得られる。",
  },
  {
    id: "gr-know-2023-007",
    year: 2023,
    certificationId: "gamma",
    subject: "gr-knowledge",
    subjectLabel: "ガンマ線照射装置に関する知識",
    questionNumber: 7,
    questionText:
      "セレン75（Se-75）を用いたガンマ線透過写真撮影の特徴として正しいものはどれか。",
    choices: [
      { label: "ア", text: "Se-75はCo-60より高エネルギーのガンマ線を放出する" },
      { label: "イ", text: "Se-75の半減期は約120日で、鉄オーステナイト系ステンレス鋼の薄板検査に適する" },
      { label: "ウ", text: "Se-75はIr-192に比べて厚肉鋼板（150mm超）の検査に適する" },
      { label: "エ", text: "Se-75の半減期は約5年である" },
      { label: "オ", text: "Se-75は放射能が低くガンマ線は放出しない" },
    ],
    correctAnswer: "イ",
    explanation:
      "Se-75の半減期は約120日、エネルギー0.07〜0.40MeV。薄板ステンレス鋼（5〜40mm程度）の検査に適し、Ir-192より低いエネルギーで高コントラストが得られる。",
  },
  {
    id: "gr-know-2023-008",
    year: 2023,
    certificationId: "gamma",
    subject: "gr-knowledge",
    subjectLabel: "ガンマ線照射装置に関する知識",
    questionNumber: 8,
    questionText:
      "ガンマ線照射装置の遠隔操作（リモートコントロール）式装置について正しいものはどれか。",
    choices: [
      { label: "ア", text: "線源を手で操作するため作業者の被ばくが増大する" },
      { label: "イ", text: "ドライブケーブルにより線源を遠隔操作し、作業者の被ばくを低減できる" },
      { label: "ウ", text: "遠隔操作式は固定式より構造が単純で故障が少ない" },
      { label: "エ", text: "遠隔操作式では線源の位置確認が不要である" },
      { label: "オ", text: "遠隔操作式装置は屋内専用で屋外では使用できない" },
    ],
    correctAnswer: "イ",
    explanation:
      "遠隔操作式（パノラマ式）ガンマカメラはドライブケーブルで線源をコリメータへ送り出す構造で、作業者が安全な距離から操作でき被ばくを大幅に低減できる。",
  },
  {
    id: "gr-know-2023-009",
    year: 2023,
    certificationId: "gamma",
    subject: "gr-knowledge",
    subjectLabel: "ガンマ線照射装置に関する知識",
    questionNumber: 9,
    questionText:
      "放射線源の強度を表す単位として、正しいものはどれか。",
    choices: [
      { label: "ア", text: "グレイ（Gy）" },
      { label: "イ", text: "シーベルト（Sv）" },
      { label: "ウ", text: "ベクレル（Bq）またはキュリー（Ci）" },
      { label: "エ", text: "ルーブ（R）" },
      { label: "オ", text: "ワット（W）" },
    ],
    correctAnswer: "ウ",
    explanation:
      "放射性同位元素の強度（放射能）の単位はベクレル（Bq）またはキュリー（Ci）。1Ci＝3.7×10¹⁰Bq。GyCはガンマ線照射装置の線源強度表示に用いる旧単位。",
  },
  {
    id: "gr-know-2023-010",
    year: 2023,
    certificationId: "gamma",
    subject: "gr-knowledge",
    subjectLabel: "ガンマ線照射装置に関する知識",
    questionNumber: 10,
    questionText:
      "ガンマ線照射装置の保管・保安について正しいものはどれか。",
    choices: [
      { label: "ア", text: "使用していない線源は一般倉庫に保管してよい" },
      { label: "イ", text: "線源の保管場所には施錠等のセキュリティ措置が不要である" },
      { label: "ウ", text: "線源の紛失・盗難は発生後1週間以内に報告すればよい" },
      { label: "エ", text: "線源は指定の保管場所に施錠管理し、使用量・在庫量を記録しなければならない" },
      { label: "オ", text: "保管中の線量測定は年1回で足りる" },
    ],
    correctAnswer: "エ",
    explanation:
      "放射性同位元素等規制法により、線源は指定保管場所に施錠管理し、帳簿に受払・在庫量を記録する義務がある。紛失・盗難は直ちに報告が必要。",
    relatedLaw: "放射性同位元素等規制法",
  },

  // ─── ガンマ線照射装置に関する知識 2024 ───────────────────────────────────
  {
    id: "gr-know-2024-001",
    year: 2024,
    certificationId: "gamma",
    subject: "gr-knowledge",
    subjectLabel: "ガンマ線照射装置に関する知識",
    questionNumber: 1,
    questionText:
      "Ir-192（イリジウム192）の半減期として正しいものはどれか。",
    choices: [
      { label: "ア", text: "約30年" },
      { label: "イ", text: "約5.27年" },
      { label: "ウ", text: "約74日（約2.5か月）" },
      { label: "エ", text: "約120日（約4か月）" },
      { label: "オ", text: "約8日" },
    ],
    correctAnswer: "ウ",
    explanation:
      "Ir-192の半減期は約73.8日（約74日）。Cs-137は約30年、Co-60は5.27年、Se-75は約120日、I-131は約8日。Ir-192は定期的な線源交換が必要。",
  },
  {
    id: "gr-know-2024-002",
    year: 2024,
    certificationId: "gamma",
    subject: "gr-knowledge",
    subjectLabel: "ガンマ線照射装置に関する知識",
    questionNumber: 2,
    questionText:
      "透過写真撮影における透過度計（IQI：Image Quality Indicator）の目的として正しいものはどれか。",
    choices: [
      { label: "ア", text: "フィルムの黒化度を均一にするための基準器具" },
      { label: "イ", text: "撮影時の線量率を測定するための器具" },
      { label: "ウ", text: "透過写真の感度（最小識別可能な欠陥の大きさ）を確認するための指標" },
      { label: "エ", text: "フィルムの現像時間を決定するための指標" },
      { label: "オ", text: "散乱線量を測定するための標準器具" },
    ],
    correctAnswer: "ウ",
    explanation:
      "透過度計（IQI）は透過写真の撮影感度（何mmの欠陥を検出できるか）を示す指標。ワイヤ型や穴型があり、JIS規格等で撮影方法ごとに必要感度が規定されている。",
  },
  {
    id: "gr-know-2024-003",
    year: 2024,
    certificationId: "gamma",
    subject: "gr-knowledge",
    subjectLabel: "ガンマ線照射装置に関する知識",
    questionNumber: 3,
    questionText:
      "イッテルビウム169（Yb-169）を用いた透過写真撮影の特徴として正しいものはどれか。",
    choices: [
      { label: "ア", text: "Yb-169は非常に高エネルギーのガンマ線（2MeV超）を放出する" },
      { label: "イ", text: "Yb-169は薄肉・低密度材料（アルミ・プラスチック等）の検査に適する" },
      { label: "ウ", text: "Yb-169の半減期は約30年と非常に長い" },
      { label: "エ", text: "Yb-169は厚肉鉄鋼（100mm超）の検査に最適である" },
      { label: "オ", text: "Yb-169は現在ほとんど使用されていない希少な線源である" },
    ],
    correctAnswer: "イ",
    explanation:
      "Yb-169の半減期は約32日で低エネルギーガンマ線（0.06〜0.31MeV）を放出。薄板・アルミ・プラスチック等の低密度・薄肉材料の検査に適する。",
  },
  {
    id: "gr-know-2024-004",
    year: 2024,
    certificationId: "gamma",
    subject: "gr-knowledge",
    subjectLabel: "ガンマ線照射装置に関する知識",
    questionNumber: 4,
    questionText:
      "ガンマ線透過写真撮影の主な用途として最も適切なものはどれか。",
    choices: [
      { label: "ア", text: "材料の化学成分を分析する" },
      { label: "イ", text: "溶接部や鋳造品の内部欠陥（気孔・割れ・スラグ巻き込み等）を検出する非破壊試験" },
      { label: "ウ", text: "材料の引張強度を測定する" },
      { label: "エ", text: "表面の腐食状態のみを検査する" },
      { label: "オ", text: "放射性廃棄物の濃度を測定する" },
    ],
    correctAnswer: "イ",
    explanation:
      "ガンマ線透過試験（RT）は溶接部・鋳造品の内部欠陥（気孔・割れ・スラグ・融合不良等）を非破壊で検出するために広く用いられる。JIS Z 3104等で規格化されている。",
  },
  {
    id: "gr-know-2024-005",
    year: 2024,
    certificationId: "gamma",
    subject: "gr-knowledge",
    subjectLabel: "ガンマ線照射装置に関する知識",
    questionNumber: 5,
    questionText:
      "ガンマ線照射装置を輸送する際の注意事項として正しいものはどれか。",
    choices: [
      { label: "ア", text: "輸送中は線源容器のロック機構を外した状態にする" },
      { label: "イ", text: "輸送中は線量率が法令基準以上であっても問題ない" },
      { label: "ウ", text: "輸送時は放射性物質の輸送規制（IAEA規格・法令）に従い、適切な容器・標識を使用する" },
      { label: "エ", text: "輸送は一般の宅配便を利用することができる" },
      { label: "オ", text: "輸送中の記録保存は不要である" },
    ],
    correctAnswer: "ウ",
    explanation:
      "放射性同位元素の輸送は放射性同位元素等規制法および国際規制（IAEA TS-R-1等）に従い、適切な輸送容器・表示・運搬書類の携行が義務付けられている。",
    relatedLaw: "放射性同位元素等規制法",
  },
  {
    id: "gr-know-2024-006",
    year: 2024,
    certificationId: "gamma",
    subject: "gr-knowledge",
    subjectLabel: "ガンマ線照射装置に関する知識",
    questionNumber: 6,
    questionText:
      "ガンマ線照射装置の定期的な点検項目として、適切でないものはどれか。",
    choices: [
      { label: "ア", text: "線源容器の外観（変形・腐食）の確認" },
      { label: "イ", text: "ロック機構の作動確認" },
      { label: "ウ", text: "ドライブケーブルの劣化・損傷確認" },
      { label: "エ", text: "線源強度（放射能）の計算による確認（半減期補正）" },
      { label: "オ", text: "装置の色（塗装）が所定のデザインであることの確認" },
    ],
    correctAnswer: "オ",
    explanation:
      "装置の色やデザインは安全性能と直接関係がなく、法定点検項目ではない。線源容器の外観・ロック機構・ケーブル・放射能の確認等が点検の中心事項。",
  },
  {
    id: "gr-know-2024-007",
    year: 2024,
    certificationId: "gamma",
    subject: "gr-knowledge",
    subjectLabel: "ガンマ線照射装置に関する知識",
    questionNumber: 7,
    questionText:
      "透過写真撮影の透過度（透過率）に影響する主な因子として、誤っているものはどれか。",
    choices: [
      { label: "ア", text: "試験体の材質と厚さ" },
      { label: "イ", text: "線源のガンマ線エネルギー" },
      { label: "ウ", text: "試験体の表面粗さ" },
      { label: "エ", text: "撮影ジオメトリ（線源から試験体・フィルムまでの距離）" },
      { label: "オ", text: "フィルムの種類と現像条件" },
    ],
    correctAnswer: "ウ",
    explanation:
      "透過率（内部欠陥検出能）は主にγ線エネルギー・試験体材質・厚さ・撮影ジオメトリ・フィルム種類・現像条件に依存する。表面粗さは内部透過率には影響しない。",
  },
  {
    id: "gr-know-2024-008",
    year: 2024,
    certificationId: "gamma",
    subject: "gr-knowledge",
    subjectLabel: "ガンマ線照射装置に関する知識",
    questionNumber: 8,
    questionText:
      "放射性同位元素の壊変（崩壊）定数λと半減期T₁/₂の関係として正しいものはどれか。",
    choices: [
      { label: "ア", text: "λ ＝ T₁/₂ × ln2" },
      { label: "イ", text: "λ ＝ ln2 / T₁/₂" },
      { label: "ウ", text: "λ ＝ T₁/₂²" },
      { label: "エ", text: "λ ＝ 1 / T₁/₂" },
      { label: "オ", text: "λ と T₁/₂ は独立した定数で相互に関係しない" },
    ],
    correctAnswer: "イ",
    explanation:
      "壊変定数λ＝ln2/T₁/₂＝0.693/T₁/₂。半減期が長いほどλは小さく（壊変しにくい）、半減期が短いほどλは大きい（壊変しやすい＝放射能が高い）。",
  },
  {
    id: "gr-know-2024-009",
    year: 2024,
    certificationId: "gamma",
    subject: "gr-knowledge",
    subjectLabel: "ガンマ線照射装置に関する知識",
    questionNumber: 9,
    questionText:
      "ガンマ線照射装置の作業主任者が作業開始前に確認すべき事項として、適切でないものはどれか。",
    choices: [
      { label: "ア", text: "線源容器のロック機構の確認" },
      { label: "イ", text: "サーベイメータの動作確認" },
      { label: "ウ", text: "作業場所の立入禁止区域の設定確認" },
      { label: "エ", text: "作業員の個人線量計の装着確認" },
      { label: "オ", text: "近隣の飲食店の営業状況確認" },
    ],
    correctAnswer: "オ",
    explanation:
      "近隣飲食店の営業状況はガンマ線透過写真撮影作業の放射線安全管理とは無関係。作業前点検は線源容器・測定器・立入禁止措置・個人線量計等の確認が主体。",
  },
  {
    id: "gr-know-2024-010",
    year: 2024,
    certificationId: "gamma",
    subject: "gr-knowledge",
    subjectLabel: "ガンマ線照射装置に関する知識",
    questionNumber: 10,
    questionText:
      "ガンマ線照射装置の線源交換（線源の更新）について正しいものはどれか。",
    choices: [
      { label: "ア", text: "放射能が初期値の1/4以下になれば作業主任者が単独で交換できる" },
      { label: "イ", text: "線源交換は放射性同位元素等規制法の規制を受け、事業所の認可を得た専門業者が行う" },
      { label: "ウ", text: "線源交換の記録は不要である" },
      { label: "エ", text: "旧線源は廃棄物として一般ゴミとして廃棄できる" },
      { label: "オ", text: "線源交換後の試験・確認は省略できる" },
    ],
    correctAnswer: "イ",
    explanation:
      "線源交換は放射性同位元素等規制法に基づき、認可された専門業者（使用者または販売業者等）が実施し、交換記録の保存と旧線源の適正廃棄が義務付けられている。",
    relatedLaw: "放射性同位元素等規制法",
  },

  // ─── 関係法令 2023 ────────────────────────────────────────────────────────
  {
    id: "gr-law-2023-001",
    year: 2023,
    certificationId: "gamma",
    subject: "gr-law",
    subjectLabel: "関係法令",
    questionNumber: 1,
    questionText:
      "ガンマ線透過写真撮影作業主任者の選任について、電離放射線障害防止規則の規定として正しいものはどれか。",
    choices: [
      { label: "ア", text: "ガンマ線透過写真撮影業務には作業主任者の選任義務はない" },
      { label: "イ", text: "ガンマ線透過写真撮影作業主任者免許を有する者を選任しなければならない" },
      { label: "ウ", text: "エックス線作業主任者がガンマ線の作業主任者を兼任できる" },
      { label: "エ", text: "医師であれば免許がなくても選任できる" },
      { label: "オ", text: "1つの事業場に1名以上さえ選任すれば複数の作業場を担当できる" },
    ],
    correctAnswer: "イ",
    explanation:
      "電離則第46条により、ガンマ線透過写真撮影業務にはガンマ線透過写真撮影作業主任者免許を有する者を選任しなければならない（エックス線免許では不可）。",
    relatedLaw: "電離放射線障害防止規則第46条",
  },
  {
    id: "gr-law-2023-002",
    year: 2023,
    certificationId: "gamma",
    subject: "gr-law",
    subjectLabel: "関係法令",
    questionNumber: 2,
    questionText:
      "ガンマ線透過写真撮影作業を屋外で行う際に設定すべき「撮影作業場」の境界における線量率の基準として正しいものはどれか。",
    choices: [
      { label: "ア", text: "境界の線量率が2mSv/hを超えないようにする" },
      { label: "イ", text: "境界の線量率が0.1mSv/hを超えないようにする" },
      { label: "ウ", text: "境界の線量率が20μSv/hを超えないようにする" },
      { label: "エ", text: "境界線量率の基準は特に定められていない" },
      { label: "オ", text: "境界の線量率が1mSv/hを超えないようにする" },
    ],
    correctAnswer: "イ",
    explanation:
      "電離則第15条の2により、ガンマ線照射装置を用いた屋外撮影の撮影作業場境界における線量率は0.1mSv/h（100μSv/h）を超えてはならない。",
    relatedLaw: "電離放射線障害防止規則第15条の2",
  },
  {
    id: "gr-law-2023-003",
    year: 2023,
    certificationId: "gamma",
    subject: "gr-law",
    subjectLabel: "関係法令",
    questionNumber: 3,
    questionText:
      "ガンマ線透過写真撮影作業主任者の職務として、電離放射線障害防止規則に規定されていないものはどれか。",
    choices: [
      { label: "ア", text: "撮影作業場の境界線量率の確認" },
      { label: "イ", text: "線源容器の点検" },
      { label: "ウ", text: "作業者への被ばく状況の監視" },
      { label: "エ", text: "撮影作業終了後の線源収納の確認" },
      { label: "オ", text: "撮影で得られた透過写真の合否判定（記録の承認）" },
    ],
    correctAnswer: "オ",
    explanation:
      "透過写真の合否判定は非破壊試験技術者（RT技術者）の業務であり、ガンマ線透過写真撮影作業主任者の法定職務には含まれない。",
    relatedLaw: "電離放射線障害防止規則第46条の2",
  },
  {
    id: "gr-law-2023-004",
    year: 2023,
    certificationId: "gamma",
    subject: "gr-law",
    subjectLabel: "関係法令",
    questionNumber: 4,
    questionText:
      "電離放射線障害防止規則において、外部放射線による実効線量が3月間につき1.3mSvを超えるおそれのある区域を何と定義するか。",
    choices: [
      { label: "ア", text: "放射線管理区域" },
      { label: "イ", text: "管理区域" },
      { label: "ウ", text: "制限区域" },
      { label: "エ", text: "監視区域" },
      { label: "オ", text: "立入禁止区域" },
    ],
    correctAnswer: "イ",
    explanation:
      "電離則第3条により、外部放射線による実効線量が3月間につき1.3mSvを超えるおそれのある区域は「管理区域」として設定し、標識の掲示等の措置を講ずる。",
    relatedLaw: "電離放射線障害防止規則第3条",
  },
  {
    id: "gr-law-2023-005",
    year: 2023,
    certificationId: "gamma",
    subject: "gr-law",
    subjectLabel: "関係法令",
    questionNumber: 5,
    questionText:
      "放射線業務従事者の外部被ばく線量の測定結果の記録保存期間として正しいものはどれか。",
    choices: [
      { label: "ア", text: "3年間" },
      { label: "イ", text: "5年間" },
      { label: "ウ", text: "10年間" },
      { label: "エ", text: "30年間" },
      { label: "オ", text: "永久保存" },
    ],
    correctAnswer: "エ",
    explanation:
      "電離則第57条により、放射線業務従事者の被ばく線量記録は30年間保存しなければならない（5年経過後は一定条件で保存継続）。",
    relatedLaw: "電離放射線障害防止規則第57条",
  },
  {
    id: "gr-law-2023-006",
    year: 2023,
    certificationId: "gamma",
    subject: "gr-law",
    subjectLabel: "関係法令",
    questionNumber: 6,
    questionText:
      "ガンマ線照射装置を使用する事業者が労働基準監督署長に届け出なければならない場合として正しいものはどれか。",
    choices: [
      { label: "ア", text: "ガンマ線照射装置の新規設置（使用開始）の場合" },
      { label: "イ", text: "ガンマ線照射装置を廃棄する場合のみ届け出が必要" },
      { label: "ウ", text: "ガンマ線照射装置の届出義務は放射性同位元素等規制法のみに規定される" },
      { label: "エ", text: "届出は不要で、記録のみ保存すればよい" },
      { label: "オ", text: "ガンマ線照射装置の設置・廃止の届出は不要である" },
    ],
    correctAnswer: "ア",
    explanation:
      "電離則第49条により、ガンマ線照射装置を新たに設置・移転する場合は30日前までに所轄労働基準監督署長への届出が義務付けられている。",
    relatedLaw: "電離放射線障害防止規則第49条",
  },
  {
    id: "gr-law-2023-007",
    year: 2023,
    certificationId: "gamma",
    subject: "gr-law",
    subjectLabel: "関係法令",
    questionNumber: 7,
    questionText:
      "放射線業務従事者に対する電離放射線作業特別教育の内容として、電離放射線障害防止規則が定めるものはどれか。",
    choices: [
      { label: "ア", text: "ガンマ線の生物学的影響と被ばく管理に関する知識" },
      { label: "イ", text: "溶接技術の習得" },
      { label: "ウ", text: "救急救命士の資格取得" },
      { label: "エ", text: "消防設備の操作方法" },
      { label: "オ", text: "高所作業の安全管理" },
    ],
    correctAnswer: "ア",
    explanation:
      "電離放射線作業特別教育には、電離放射線の生体への影響・被ばく管理・関係法令・使用する装置の取扱い等に関する学科及び実技が含まれる。",
    relatedLaw: "電離放射線障害防止規則、労働安全衛生規則第36条",
  },
  {
    id: "gr-law-2023-008",
    year: 2023,
    certificationId: "gamma",
    subject: "gr-law",
    subjectLabel: "関係法令",
    questionNumber: 8,
    questionText:
      "電離放射線障害防止規則において、ガンマ線照射装置を用いた撮影作業を行う際の立入禁止措置として正しいものはどれか。",
    choices: [
      { label: "ア", text: "作業中は関係者も含め何人も撮影作業場に立ち入ってはならない" },
      { label: "イ", text: "作業主任者の管理の下であれば立入禁止措置は不要である" },
      { label: "ウ", text: "撮影作業場の境界に柵・ロープ等で立入禁止区域を設け、関係者以外の立入りを禁止する" },
      { label: "エ", text: "立入禁止措置は夜間作業の場合のみ必要である" },
      { label: "オ", text: "撮影中は標識の掲示だけで足り、物理的な立入禁止措置は不要である" },
    ],
    correctAnswer: "ウ",
    explanation:
      "電離則第42条等により、撮影作業場の境界にロープ・柵等を設けて立入禁止区域を明示し、作業に関係しない者の立入りを禁止しなければならない。",
    relatedLaw: "電離放射線障害防止規則第42条",
  },
  {
    id: "gr-law-2023-009",
    year: 2023,
    certificationId: "gamma",
    subject: "gr-law",
    subjectLabel: "関係法令",
    questionNumber: 9,
    questionText:
      "放射線業務従事者の実効線量限度（通常作業）として正しいものはどれか。",
    choices: [
      { label: "ア", text: "1年間につき100mSv" },
      { label: "イ", text: "5年間につき100mSv、かつ1年間につき50mSv" },
      { label: "ウ", text: "1年間につき20mSv" },
      { label: "エ", text: "1年間につき1mSv" },
      { label: "オ", text: "3月間につき20mSv" },
    ],
    correctAnswer: "イ",
    explanation:
      "電離則第4条により、放射線業務従事者の実効線量限度は5年間につき100mSv（年平均20mSv）かつ1年間につき50mSv以下である。",
    relatedLaw: "電離放射線障害防止規則第4条",
  },
  {
    id: "gr-law-2023-010",
    year: 2023,
    certificationId: "gamma",
    subject: "gr-law",
    subjectLabel: "関係法令",
    questionNumber: 10,
    questionText:
      "電離放射線健康診断の実施頻度として電離放射線障害防止規則が定める正しいものはどれか。",
    choices: [
      { label: "ア", text: "1年以内ごとに1回" },
      { label: "イ", text: "6月以内ごとに1回" },
      { label: "ウ", text: "3月以内ごとに1回" },
      { label: "エ", text: "2年以内ごとに1回" },
      { label: "オ", text: "採用時のみ実施すれば足りる" },
    ],
    correctAnswer: "イ",
    explanation:
      "電離則第56条により、放射線業務従事者への電離放射線健康診断は6月以内ごとに1回実施しなければならない。記録は30年間保存が原則。",
    relatedLaw: "電離放射線障害防止規則第56条",
  },

  // ─── 関係法令 2024 ────────────────────────────────────────────────────────
  {
    id: "gr-law-2024-001",
    year: 2024,
    certificationId: "gamma",
    subject: "gr-law",
    subjectLabel: "関係法令",
    questionNumber: 1,
    questionText:
      "放射性同位元素等規制法における「放射線障害防止法」の目的として正しいものはどれか。",
    choices: [
      { label: "ア", text: "放射性同位元素の使用・販売・賃貸等を規制し、放射線障害を防止する" },
      { label: "イ", text: "労働者の作業環境における放射線被ばくのみを規制する" },
      { label: "ウ", text: "原子炉の安全規制のみを目的とする" },
      { label: "エ", text: "医療用放射線のみを規制する" },
      { label: "オ", text: "一般公衆の被ばくは規制せず、労働者の被ばくのみを対象とする" },
    ],
    correctAnswer: "ア",
    explanation:
      "放射性同位元素等規制法（旧放射線障害防止法）は放射性同位元素の製造・使用・販売・廃棄等を規制し、放射線障害を防止して公共の安全を確保することを目的とする。",
    relatedLaw: "放射性同位元素等規制法第1条",
  },
  {
    id: "gr-law-2024-002",
    year: 2024,
    certificationId: "gamma",
    subject: "gr-law",
    subjectLabel: "関係法令",
    questionNumber: 2,
    questionText:
      "妊娠中の女性の放射線業務従事者の腹部の等価線量限度として正しいものはどれか。",
    choices: [
      { label: "ア", text: "3月間につき5mSv" },
      { label: "イ", text: "妊娠判明から出産までの間に2mSv" },
      { label: "ウ", text: "妊娠判明から出産までの間に1mSv" },
      { label: "エ", text: "妊娠中は外部被ばくのみ規制され内部被ばく限度はない" },
      { label: "オ", text: "通常の女性と同じく3月間につき5mSv" },
    ],
    correctAnswer: "ウ",
    explanation:
      "電離則第6条により、妊娠中の女性の腹部への等価線量限度は妊娠が判明した時から出産まで1mSv（内部被ばく実効線量も同様）。通常の女性の3月5mSvとは異なる。",
    relatedLaw: "電離放射線障害防止規則第6条",
  },
  {
    id: "gr-law-2024-003",
    year: 2024,
    certificationId: "gamma",
    subject: "gr-law",
    subjectLabel: "関係法令",
    questionNumber: 3,
    questionText:
      "緊急作業に従事する場合の実効線量限度として正しいものはどれか。",
    choices: [
      { label: "ア", text: "通常の線量限度と同じ50mSv/年が適用される" },
      { label: "イ", text: "緊急時は線量限度の適用が免除される" },
      { label: "ウ", text: "100mSv（緊急作業全体で）" },
      { label: "エ", text: "250mSv（緊急作業全体で）" },
      { label: "オ", text: "1Sv（緊急作業全体で）" },
    ],
    correctAnswer: "ウ",
    explanation:
      "電離則第42条により、緊急作業に従事する放射線業務従事者の実効線量限度は100mSv（緊急作業全体）である。通常の1年50mSvより高い値が認められる。",
    relatedLaw: "電離放射線障害防止規則第42条",
  },
  {
    id: "gr-law-2024-004",
    year: 2024,
    certificationId: "gamma",
    subject: "gr-law",
    subjectLabel: "関係法令",
    questionNumber: 4,
    questionText:
      "ガンマ線照射装置の作業場の作業環境測定の実施頻度として正しいものはどれか。",
    choices: [
      { label: "ア", text: "3月以内ごとに1回" },
      { label: "イ", text: "6月以内ごとに1回" },
      { label: "ウ", text: "1年以内ごとに1回" },
      { label: "エ", text: "2年以内ごとに1回" },
      { label: "オ", text: "作業環境測定の実施義務はガンマ線照射装置には適用されない" },
    ],
    correctAnswer: "イ",
    explanation:
      "電離則第54条により、ガンマ線照射装置を使用する作業場の作業環境測定は6月以内ごとに1回実施しなければならない。",
    relatedLaw: "電離放射線障害防止規則第54条",
  },
  {
    id: "gr-law-2024-005",
    year: 2024,
    certificationId: "gamma",
    subject: "gr-law",
    subjectLabel: "関係法令",
    questionNumber: 5,
    questionText:
      "皮膚（手や足を除く）の等価線量限度として電離放射線障害防止規則が定める値はどれか。",
    choices: [
      { label: "ア", text: "1年間につき150mSv" },
      { label: "イ", text: "1年間につき250mSv" },
      { label: "ウ", text: "1年間につき500mSv" },
      { label: "エ", text: "1年間につき50mSv" },
      { label: "オ", text: "3月間につき150mSv" },
    ],
    correctAnswer: "ウ",
    explanation:
      "電離則第5条により、皮膚の等価線量限度は1年間につき500mSv。水晶体は5年間100mSv・年50mSv、実効線量は5年100mSv・年50mSvと異なる値。",
    relatedLaw: "電離放射線障害防止規則第5条",
  },
  {
    id: "gr-law-2024-006",
    year: 2024,
    certificationId: "gamma",
    subject: "gr-law",
    subjectLabel: "関係法令",
    questionNumber: 6,
    questionText:
      "放射線業務従事者の被ばく線量を事業者が測定する方法として正しいものはどれか。",
    choices: [
      { label: "ア", text: "サーベイメータによる作業場の線量率測定のみでよい" },
      { label: "イ", text: "個人線量計を用いた測定が義務付けられている" },
      { label: "ウ", text: "年1回のみ医療機関で血液検査を行えば足りる" },
      { label: "エ", text: "作業時間の記録のみで線量推定ができればよい" },
      { label: "オ", text: "被ばく線量の測定義務は放射線業務主任者のみに適用される" },
    ],
    correctAnswer: "イ",
    explanation:
      "電離則第8条により、放射線業務従事者の外部被ばく線量は個人線量計（放射線測定器）を用いて1月以内ごとに1回測定しなければならない。",
    relatedLaw: "電離放射線障害防止規則第8条",
  },
  {
    id: "gr-law-2024-007",
    year: 2024,
    certificationId: "gamma",
    subject: "gr-law",
    subjectLabel: "関係法令",
    questionNumber: 7,
    questionText:
      "電離放射線障害防止規則における「放射線業務」に含まれる業務として正しいものはどれか。",
    choices: [
      { label: "ア", text: "電気配線工事の作業" },
      { label: "イ", text: "ガンマ線照射装置を用いた透過写真撮影業務" },
      { label: "ウ", text: "一般の溶接作業（アーク溶接）" },
      { label: "エ", text: "コンクリート構造物の外観検査" },
      { label: "オ", text: "一般の電気機器の製造作業" },
    ],
    correctAnswer: "イ",
    explanation:
      "電離則第2条の「放射線業務」には、ガンマ線照射装置を用いた透過写真撮影業務が含まれる。一般の溶接・電気工事は放射線業務に該当しない。",
    relatedLaw: "電離放射線障害防止規則第2条",
  },
  {
    id: "gr-law-2024-008",
    year: 2024,
    certificationId: "gamma",
    subject: "gr-law",
    subjectLabel: "関係法令",
    questionNumber: 8,
    questionText:
      "電離放射線健康診断の検査項目として電離放射線障害防止規則が定めるものに含まれないものはどれか。",
    choices: [
      { label: "ア", text: "被ばく歴の有無の調査" },
      { label: "イ", text: "白血球数・白血球分類の検査" },
      { label: "ウ", text: "赤血球数および血色素量の検査" },
      { label: "エ", text: "白内障に関する眼の検査" },
      { label: "オ", text: "骨密度測定（DXA法）" },
    ],
    correctAnswer: "オ",
    explanation:
      "電離放射線健康診断の項目には被ばく歴調査・白血球・赤血球・血色素・眼の検査・皮膚の検査等が含まれるが、骨密度測定（DXA法）は規定されていない。",
    relatedLaw: "電離放射線障害防止規則第56条",
  },
  {
    id: "gr-law-2024-009",
    year: 2024,
    certificationId: "gamma",
    subject: "gr-law",
    subjectLabel: "関係法令",
    questionNumber: 9,
    questionText:
      "ガンマ線照射装置による撮影作業において、ガンマ線照射中に行うことが禁止されていることはどれか。",
    choices: [
      { label: "ア", text: "サーベイメータによる線量率確認" },
      { label: "イ", text: "立入禁止区域外からの監視" },
      { label: "ウ", text: "照射中の試験体への近接作業（立入禁止区域内への立入り）" },
      { label: "エ", text: "記録書類の確認" },
      { label: "オ", text: "作業終了後の手順確認" },
    ],
    correctAnswer: "ウ",
    explanation:
      "照射中に立入禁止区域内へ立ち入ることは、被ばくのおそれがあり絶対に禁止。線源収納を確認した後でなければ試験体に近づいてはならない。",
    relatedLaw: "電離放射線障害防止規則第42条",
  },
  {
    id: "gr-law-2024-010",
    year: 2024,
    certificationId: "gamma",
    subject: "gr-law",
    subjectLabel: "関係法令",
    questionNumber: 10,
    questionText:
      "放射線業務従事者が管理区域内で受けた外部被ばく線量の測定に使用する測定器として、電離放射線障害防止規則が認める測定器の要件として正しいものはどれか。",
    choices: [
      { label: "ア", text: "国家計量標準にトレーサブルな線量計であること" },
      { label: "イ", text: "製造から5年以内の線量計であること" },
      { label: "ウ", text: "厚生労働省が直接製造した線量計であること" },
      { label: "エ", text: "デジタル表示のみの電子式線量計であること" },
      { label: "オ", text: "フィルムバッジのみが認められている" },
    ],
    correctAnswer: "ア",
    explanation:
      "被ばく線量測定に用いる線量計は計量法に基づく国家計量標準にトレーサブルな校正が行われた測定器でなければならない。種類（TLD・フィルム・ガラス等）は問わない。",
    relatedLaw: "電離放射線障害防止規則第8条",
  },

  // ─── 放射線の測定に関する知識 2023 ──────────────────────────────────────
  {
    id: "gr-meas-2023-001",
    year: 2023,
    certificationId: "gamma",
    subject: "gr-measurement",
    subjectLabel: "放射線の測定に関する知識",
    questionNumber: 1,
    questionText:
      "ガンマ線の測定に適したサーベイメータとして最も一般的に使用されるものはどれか。",
    choices: [
      { label: "ア", text: "電離箱式またはNaI(Tl)シンチレーション式サーベイメータ" },
      { label: "イ", text: "α線用表面汚染測定器（ZnS蛍光体）" },
      { label: "ウ", text: "中性子線用BF₃計数管" },
      { label: "エ", text: "ガスフロー比例計数管" },
      { label: "オ", text: "液体シンチレーションカウンター" },
    ],
    correctAnswer: "ア",
    explanation:
      "ガンマ線の線量率測定には電離箱式サーベイメータ（エネルギー特性良好・精度高）またはNaI(Tl)シンチレーション式（高感度・携帯性良）が広く用いられる。",
  },
  {
    id: "gr-meas-2023-002",
    year: 2023,
    certificationId: "gamma",
    subject: "gr-measurement",
    subjectLabel: "放射線の測定に関する知識",
    questionNumber: 2,
    questionText:
      "サーベイメータによるガンマ線の測定において、指示値を安定させるために必要なことはどれか。",
    choices: [
      { label: "ア", text: "測定器を最大感度（最小レンジ）に固定して測定する" },
      { label: "イ", text: "測定器の時定数（応答時間）に対して十分な時間をかけて読み取る" },
      { label: "ウ", text: "測定器を直射日光に当てて温度を上げる" },
      { label: "エ", text: "測定器を激しく振動させてゼロ調整を行う" },
      { label: "オ", text: "測定直後に電源を切り、冷却後に読み取る" },
    ],
    correctAnswer: "イ",
    explanation:
      "サーベイメータの読み取りは時定数（応答時間）の3〜5倍程度の時間待機してから読み取る。急いで読むと正確な値が得られない。レンジは適切なものを選択する。",
  },
  {
    id: "gr-meas-2023-003",
    year: 2023,
    certificationId: "gamma",
    subject: "gr-measurement",
    subjectLabel: "放射線の測定に関する知識",
    questionNumber: 3,
    questionText:
      "個人線量計としてのTLD（熱蛍光線量計）の読み取り方法として正しいものはどれか。",
    choices: [
      { label: "ア", text: "素子をUV光で照射して蛍光量を測定する" },
      { label: "イ", text: "素子を高温（約200〜400℃）に加熱し放出される発光量を測定する" },
      { label: "ウ", text: "素子を現像液に浸して光学濃度を測定する" },
      { label: "エ", text: "素子に電圧を印加して放電量を測定する" },
      { label: "オ", text: "素子をX線で再照射して輝度変化を測定する" },
    ],
    correctAnswer: "イ",
    explanation:
      "TLD読み取りはTLD素子を200〜400℃程度に加熱し、放出される熱蛍光（発光量）を光電子増倍管で測定する。加熱により蓄積エネルギーが解放される。",
  },
  {
    id: "gr-meas-2023-004",
    year: 2023,
    certificationId: "gamma",
    subject: "gr-measurement",
    subjectLabel: "放射線の測定に関する知識",
    questionNumber: 4,
    questionText:
      "撮影作業場の境界線量率を測定する場合の正しい手順はどれか。",
    choices: [
      { label: "ア", text: "線源を取り出した後（収納状態）で測定し、照射中の線量率は計算のみで求める" },
      { label: "イ", text: "照射中（線源使用中）に境界の各地点でサーベイメータを用いて測定する" },
      { label: "ウ", text: "撮影終了後にフィルムバッジを境界に貼付して積算値で評価する" },
      { label: "エ", text: "サーベイメータの代わりにGM管式線量計のみを使用する" },
      { label: "オ", text: "境界線量率の測定は作業主任者以外は行えない" },
    ],
    correctAnswer: "イ",
    explanation:
      "境界線量率は実際の照射条件（線源使用中）でサーベイメータを用いて測定する。収納状態での測定では実際の照射時線量率を反映できない。",
  },
  {
    id: "gr-meas-2023-005",
    year: 2023,
    certificationId: "gamma",
    subject: "gr-measurement",
    subjectLabel: "放射線の測定に関する知識",
    questionNumber: 5,
    questionText:
      "等価線量の単位として正しいものはどれか。",
    choices: [
      { label: "ア", text: "グレイ（Gy）" },
      { label: "イ", text: "ベクレル（Bq）" },
      { label: "ウ", text: "シーベルト（Sv）" },
      { label: "エ", text: "レントゲン（R）" },
      { label: "オ", text: "ラド（rad）" },
    ],
    correctAnswer: "ウ",
    explanation:
      "等価線量・実効線量の単位はシーベルト（Sv）。吸収線量はグレイ（Gy）、放射能はベクレル（Bq）。レントゲンとラドは旧単位（照射線量と吸収線量の旧単位）。",
  },
  {
    id: "gr-meas-2023-006",
    year: 2023,
    certificationId: "gamma",
    subject: "gr-measurement",
    subjectLabel: "放射線の測定に関する知識",
    questionNumber: 6,
    questionText:
      "NaI(Tl)シンチレーション検出器の特徴として正しいものはどれか。",
    choices: [
      { label: "ア", text: "エネルギー分解能は高純度ゲルマニウム（HPGe）検出器より高い" },
      { label: "イ", text: "水分（高湿度）に対して安定で、屋外での使用に適している" },
      { label: "ウ", text: "NaI(Tl)結晶は潮解性があり、湿気に弱い" },
      { label: "エ", text: "常温使用が不可能で液体窒素冷却が必要である" },
      { label: "オ", text: "α線の計測に特化した検出器である" },
    ],
    correctAnswer: "ウ",
    explanation:
      "NaI(Tl)結晶は潮解性（水分を吸収して溶解する性質）があり、密封管理が必要。常温使用可能で高感度。エネルギー分解能はHPGe検出器より低い。",
  },
  {
    id: "gr-meas-2023-007",
    year: 2023,
    certificationId: "gamma",
    subject: "gr-measurement",
    subjectLabel: "放射線の測定に関する知識",
    questionNumber: 7,
    questionText:
      "ガンマ線の線量率が距離2mの地点で10μSv/hであった。距離4mの地点での線量率はどれか（逆二乗則を適用）。",
    choices: [
      { label: "ア", text: "5μSv/h" },
      { label: "イ", text: "2.5μSv/h" },
      { label: "ウ", text: "1μSv/h" },
      { label: "エ", text: "20μSv/h" },
      { label: "オ", text: "0.5μSv/h" },
    ],
    correctAnswer: "イ",
    explanation:
      "逆二乗則より、距離2倍→線量率は(2/4)²＝1/4。10μSv/h×1/4＝2.5μSv/h。距離が2mから4m（2倍）になるので線量率は1/4に減少する。",
  },
  {
    id: "gr-meas-2023-008",
    year: 2023,
    certificationId: "gamma",
    subject: "gr-measurement",
    subjectLabel: "放射線の測定に関する知識",
    questionNumber: 8,
    questionText:
      "バックグラウンド放射線の測定について正しいものはどれか。",
    choices: [
      { label: "ア", text: "バックグラウンドの測定は1回の読み取りで十分な精度が得られる" },
      { label: "イ", text: "バックグラウンド測定値は測定の不確かさを評価するために複数回測定する" },
      { label: "ウ", text: "バックグラウンドは季節によらず常に一定である" },
      { label: "エ", text: "バックグラウンド測定は作業終了後に行えばよい" },
      { label: "オ", text: "バックグラウンドの影響は低線量率域では無視できる" },
    ],
    correctAnswer: "イ",
    explanation:
      "バックグラウンドは統計的変動があるため、複数回（通常3〜5回以上）測定して平均値を求め、測定の不確かさを正しく評価することが重要。",
  },
  {
    id: "gr-meas-2023-009",
    year: 2023,
    certificationId: "gamma",
    subject: "gr-measurement",
    subjectLabel: "放射線の測定に関する知識",
    questionNumber: 9,
    questionText:
      "作業後に線源が正常に線源容器に収納されているかを確認する方法として最も適切なものはどれか。",
    choices: [
      { label: "ア", text: "コンテナの重量を測定して判断する" },
      { label: "イ", text: "サーベイメータで線源容器周辺の線量率を測定して確認する" },
      { label: "ウ", text: "翌日のフィルムバッジの積算値で確認する" },
      { label: "エ", text: "目視のみで確認する" },
      { label: "オ", text: "確認作業は週1回で足りる" },
    ],
    correctAnswer: "イ",
    explanation:
      "照射終了後は必ずサーベイメータで線源容器周辺の線量率を測定し、線源が正常に収納されていること（線量率が所定値以下であること）を確認しなければならない。",
  },
  {
    id: "gr-meas-2023-010",
    year: 2023,
    certificationId: "gamma",
    subject: "gr-measurement",
    subjectLabel: "放射線の測定に関する知識",
    questionNumber: 10,
    questionText:
      "ガンマ線の遮蔽に用いる材料として最も効果的なものはどれか。",
    choices: [
      { label: "ア", text: "木材" },
      { label: "イ", text: "アルミニウム" },
      { label: "ウ", text: "プラスチック（ポリエチレン）" },
      { label: "エ", text: "鉛またはコンクリート（厚肉）" },
      { label: "オ", text: "ガラス（普通ガラス）" },
    ],
    correctAnswer: "エ",
    explanation:
      "ガンマ線（光子線）の遮蔽には高密度・高原子番号の材料が有効。鉛は最も効率的な遮蔽材、コンクリートは構造体として広く用いられる。木材・プラスチックは不適。",
  },

  // ─── 放射線の測定に関する知識 2024 ──────────────────────────────────────
  {
    id: "gr-meas-2024-001",
    year: 2024,
    certificationId: "gamma",
    subject: "gr-measurement",
    subjectLabel: "放射線の測定に関する知識",
    questionNumber: 1,
    questionText:
      "Ir-192線源の放射能が当初の1/8になるまでに経過する時間（半減期74日として計算）として正しいものはどれか。",
    choices: [
      { label: "ア", text: "74日" },
      { label: "イ", text: "148日（2半減期）" },
      { label: "ウ", text: "222日（3半減期）" },
      { label: "エ", text: "296日（4半減期）" },
      { label: "オ", text: "370日（5半減期）" },
    ],
    correctAnswer: "ウ",
    explanation:
      "1/8＝(1/2)³なので3半減期が必要。74日×3＝222日。1半減期で1/2、2半減期で1/4、3半減期で1/8となる。",
  },
  {
    id: "gr-meas-2024-002",
    year: 2024,
    certificationId: "gamma",
    subject: "gr-measurement",
    subjectLabel: "放射線の測定に関する知識",
    questionNumber: 2,
    questionText:
      "電離放射線の測定値の不確かさに関する記述として正しいものはどれか。",
    choices: [
      { label: "ア", text: "測定回数を増やしても測定の不確かさは改善されない" },
      { label: "イ", text: "測定回数を増やすと統計的不確かさは減少する（√n で改善）" },
      { label: "ウ", text: "測定の不確かさはすべて系統誤差のみから生じる" },
      { label: "エ", text: "不確かさが大きいほど測定精度が高い" },
      { label: "オ", text: "不確かさはメーカーのカタログ値のみから決まる" },
    ],
    correctAnswer: "イ",
    explanation:
      "放射線測定の統計的不確かさ（ポアソン統計）はN回測定の場合√N/Nに比例し、測定回数を増やすと統計的不確かさは1/√n倍に減少する。",
  },
  {
    id: "gr-meas-2024-003",
    year: 2024,
    certificationId: "gamma",
    subject: "gr-measurement",
    subjectLabel: "放射線の測定に関する知識",
    questionNumber: 3,
    questionText:
      "ガンマ線の実効エネルギーに関する記述として正しいものはどれか。",
    choices: [
      { label: "ア", text: "Co-60のガンマ線はIr-192より低エネルギーである" },
      { label: "イ", text: "Co-60は約1.25MeV（平均）の高エネルギーガンマ線を放出し、Ir-192は平均約0.37MeVの低エネルギーを放出する" },
      { label: "ウ", text: "Se-75のガンマ線エネルギーはCo-60より高い" },
      { label: "エ", text: "すべての放射性同位元素は同じエネルギーのガンマ線を放出する" },
      { label: "オ", text: "Ir-192はCo-60より高いエネルギーのガンマ線を放出する" },
    ],
    correctAnswer: "イ",
    explanation:
      "Co-60は1.17MeVと1.33MeV（平均約1.25MeV）の高エネルギーガンマ線を放出。Ir-192は平均約0.37MeVの低〜中エネルギーを放出。Co-60のほうが高エネルギー。",
  },
  {
    id: "gr-meas-2024-004",
    year: 2024,
    certificationId: "gamma",
    subject: "gr-measurement",
    subjectLabel: "放射線の測定に関する知識",
    questionNumber: 4,
    questionText:
      "GM計数管式サーベイメータの特徴として正しいものはどれか。",
    choices: [
      { label: "ア", text: "高線量率域では不感時間（デッドタイム）の影響で計数損失が起きる" },
      { label: "イ", text: "GM計数管は放射線のエネルギーを精密に測定できる" },
      { label: "ウ", text: "GM計数管は電離箱式より広い線量率範囲で正確に測定できる" },
      { label: "エ", text: "GM計数管は中性子線の検出に最も適している" },
      { label: "オ", text: "GM計数管は電池不要で永続的に使用できる" },
    ],
    correctAnswer: "ア",
    explanation:
      "GM計数管は高線量率域（>10mR/h程度）でデッドタイムによる計数損失が生じ、指示値が実際より低くなる。低線量率の検出感度は高い。エネルギー識別は不可。",
  },
  {
    id: "gr-meas-2024-005",
    year: 2024,
    certificationId: "gamma",
    subject: "gr-measurement",
    subjectLabel: "放射線の測定に関する知識",
    questionNumber: 5,
    questionText:
      "放射線の測定において「バックグラウンドの差し引き」が必要な理由として正しいものはどれか。",
    choices: [
      { label: "ア", text: "自然放射線（宇宙線・大地・空気中ラドン等）が測定値に加算されるため" },
      { label: "イ", text: "測定器の自己発熱を補正するため" },
      { label: "ウ", text: "測定者の被ばくを計算するため" },
      { label: "エ", text: "湿度による測定誤差を補正するため" },
      { label: "オ", text: "バックグラウンドの差し引きは高線量率域のみ必要である" },
    ],
    correctAnswer: "ア",
    explanation:
      "バックグラウンドは宇宙線・大地放射線・空気中ラドン等の自然放射線から生じる。線源由来の正味の放射線量を求めるには測定値からバックグラウンドを差し引く必要がある。",
  },
  {
    id: "gr-meas-2024-006",
    year: 2024,
    certificationId: "gamma",
    subject: "gr-measurement",
    subjectLabel: "放射線の測定に関する知識",
    questionNumber: 6,
    questionText:
      "個人線量計の装着位置について、ガンマ線照射装置を用いた撮影作業において正しいものはどれか。",
    choices: [
      { label: "ア", text: "利き手の手首に装着する" },
      { label: "イ", text: "胸部または腹部（体幹前面）に装着し、実効線量を評価する" },
      { label: "ウ", text: "足首に装着して全身線量を評価する" },
      { label: "エ", text: "頭部（ヘルメット）に装着する" },
      { label: "オ", text: "装着位置は測定者の自由裁量による" },
    ],
    correctAnswer: "イ",
    explanation:
      "均一な放射線場での実効線量評価のため、線量計は胸部または腹部（体幹前面）に装着する。不均一な場では追加装着を行う場合がある。",
    relatedLaw: "電離放射線障害防止規則第8条",
  },
  {
    id: "gr-meas-2024-007",
    year: 2024,
    certificationId: "gamma",
    subject: "gr-measurement",
    subjectLabel: "放射線の測定に関する知識",
    questionNumber: 7,
    questionText:
      "撮影作業場の境界線量率が法令基準（0.1mSv/h）を超えた場合の対応として正しいものはどれか。",
    choices: [
      { label: "ア", text: "作業を継続し次回測定時まで様子を見る" },
      { label: "イ", text: "境界を法令基準値以内になるよう移動し、遮蔽を追加する等の措置を講じる" },
      { label: "ウ", text: "基準超過を記録するだけでよい" },
      { label: "エ", text: "作業員全員を管理区域外に退避させた後、そのまま照射を継続する" },
      { label: "オ", text: "基準を超えても直ちに問題はなく、1日の積算線量が限度以内なら許容される" },
    ],
    correctAnswer: "イ",
    explanation:
      "境界線量率が0.1mSv/hを超える場合は、遮蔽の追加・境界の外側への拡張・線源強度の再確認等の措置を講じて基準値以内にしなければならない。",
    relatedLaw: "電離放射線障害防止規則第15条の2",
  },
  {
    id: "gr-meas-2024-008",
    year: 2024,
    certificationId: "gamma",
    subject: "gr-measurement",
    subjectLabel: "放射線の測定に関する知識",
    questionNumber: 8,
    questionText:
      "電離箱式サーベイメータの校正周期として一般的に求められるものはどれか。",
    choices: [
      { label: "ア", text: "毎月1回の校正が必要" },
      { label: "イ", text: "購入時のみでよく、その後の定期校正は不要" },
      { label: "ウ", text: "1〜2年ごとに国家計量標準にトレーサブルな施設で校正する" },
      { label: "エ", text: "5年ごとの校正で足りる" },
      { label: "オ", text: "使用頻度に関係なく10年ごとで足りる" },
    ],
    correctAnswer: "ウ",
    explanation:
      "放射線測定器は通常1〜2年ごとに国家計量標準（JCSS）にトレーサブルな校正施設で定期校正を実施し、校正証明書の有効期間内に使用することが求められる。",
  },
  {
    id: "gr-meas-2024-009",
    year: 2024,
    certificationId: "gamma",
    subject: "gr-measurement",
    subjectLabel: "放射線の測定に関する知識",
    questionNumber: 9,
    questionText:
      "ガンマ線の測定においてエネルギー補償（エネルギー補正）が必要な理由として正しいものはどれか。",
    choices: [
      { label: "ア", text: "高温環境では測定器の感度が一定でないため" },
      { label: "イ", text: "測定器の応答特性（感度）がエネルギーによって異なるため、正確な線量評価に必要" },
      { label: "ウ", text: "エネルギー補償は低エネルギー放射線の場合のみ必要" },
      { label: "エ", text: "エネルギー補償は線量率が高い場合のみ必要" },
      { label: "オ", text: "すべての検出器はエネルギーによらず均一な感度を持つ" },
    ],
    correctAnswer: "イ",
    explanation:
      "検出器の感度（応答）はエネルギーによって異なる（エネルギー特性）。正確な線量評価には使用する放射線源のエネルギーに対応した感度特性を考慮する必要がある。",
  },
  {
    id: "gr-meas-2024-010",
    year: 2024,
    certificationId: "gamma",
    subject: "gr-measurement",
    subjectLabel: "放射線の測定に関する知識",
    questionNumber: 10,
    questionText:
      "ガンマ線照射後の作業場の汚染検査について正しいものはどれか。",
    choices: [
      { label: "ア", text: "ガンマ線照射は放射性物質による汚染を生じないため汚染検査は不要" },
      { label: "イ", text: "線源容器の漏えいがあれば表面汚染が生じる場合があるため、汚染検査は重要" },
      { label: "ウ", text: "ガンマ線は空気を放射化するため、大気サンプリングが必要" },
      { label: "エ", text: "汚染検査は年1回の定期検査のみ実施すればよい" },
      { label: "オ", text: "汚染検査はα線計測器でのみ実施できる" },
    ],
    correctAnswer: "イ",
    explanation:
      "通常のガンマ線照射では表面汚染は起きないが、線源容器の損傷・漏えいがあれば放射性物質による汚染が生じる。異常時には汚染検査（スミヤ法等）を行うことが重要。",
  },

  // ─── 放射線の生体影響 2023 ────────────────────────────────────────────────
  {
    id: "gr-bio-2023-001",
    year: 2023,
    certificationId: "gamma",
    subject: "gr-biology",
    subjectLabel: "放射線の生体に与える影響に関する知識",
    questionNumber: 1,
    questionText:
      "ガンマ線の放射線荷重係数（wR）として正しいものはどれか。",
    choices: [
      { label: "ア", text: "0.5" },
      { label: "イ", text: "1" },
      { label: "ウ", text: "5" },
      { label: "エ", text: "10" },
      { label: "オ", text: "20" },
    ],
    correctAnswer: "イ",
    explanation:
      "ガンマ線・X線の放射線荷重係数wR＝1。α線はwR＝20、中性子線はエネルギーによって1〜20。wR＝1なので等価線量（Sv）＝吸収線量（Gy）の数値と同じ。",
  },
  {
    id: "gr-bio-2023-002",
    year: 2023,
    certificationId: "gamma",
    subject: "gr-biology",
    subjectLabel: "放射線の生体に与える影響に関する知識",
    questionNumber: 2,
    questionText:
      "確定的影響の特徴として正しいものはどれか。",
    choices: [
      { label: "ア", text: "しきい線量は存在せず、どんな微量でも影響が出る" },
      { label: "イ", text: "発がんと遺伝的影響が代表的な確定的影響である" },
      { label: "ウ", text: "しきい線量を超えると線量が増すほど重篤度が増す" },
      { label: "エ", text: "確定的影響は確率的影響よりしきい線量が高い" },
      { label: "オ", text: "確定的影響は被ばく後10〜20年後にのみ発症する" },
    ],
    correctAnswer: "ウ",
    explanation:
      "確定的影響はしきい線量が存在し、それを超えると重篤度が線量に依存して増加する。代表例は脱毛・白内障・不妊・造血機能障害・皮膚炎等。",
  },
  {
    id: "gr-bio-2023-003",
    year: 2023,
    certificationId: "gamma",
    subject: "gr-biology",
    subjectLabel: "放射線の生体に与える影響に関する知識",
    questionNumber: 3,
    questionText:
      "放射線の直接作用と間接作用の説明として正しいものはどれか。",
    choices: [
      { label: "ア", text: "直接作用は放射線が水分子を電離してラジカルを生成する作用" },
      { label: "イ", text: "間接作用は放射線が直接DNAを損傷する作用" },
      { label: "ウ", text: "X線では直接作用が間接作用より支配的である" },
      { label: "エ", text: "直接作用は放射線が直接生体高分子（DNA等）を電離・損傷する作用" },
      { label: "オ", text: "間接作用は酸素が存在しない条件でより効率よく起きる" },
    ],
    correctAnswer: "エ",
    explanation:
      "直接作用：放射線が直接DNAなどの生体高分子を電離・損傷する。間接作用：放射線が水を電離してOHラジカルを生成し、これがDNAを損傷する。X線では間接作用が支配的。",
  },
  {
    id: "gr-bio-2023-004",
    year: 2023,
    certificationId: "gamma",
    subject: "gr-biology",
    subjectLabel: "放射線の生体に与える影響に関する知識",
    questionNumber: 4,
    questionText:
      "放射線感受性が最も高い（放射線によって障害を受けやすい）細胞はどれか。",
    choices: [
      { label: "ア", text: "成熟神経細胞（ニューロン）" },
      { label: "イ", text: "骨格筋細胞" },
      { label: "ウ", text: "造血幹細胞（骨髄細胞）" },
      { label: "エ", text: "脂肪細胞" },
      { label: "オ", text: "心筋細胞" },
    ],
    correctAnswer: "ウ",
    explanation:
      "造血幹細胞は分裂能が高く分化度が低いため放射線感受性が最も高い組織の一つ。成熟神経細胞・心筋細胞・脂肪細胞・骨格筋細胞は感受性が低い。",
  },
  {
    id: "gr-bio-2023-005",
    year: 2023,
    certificationId: "gamma",
    subject: "gr-biology",
    subjectLabel: "放射線の生体に与える影響に関する知識",
    questionNumber: 5,
    questionText:
      "全身に4〜5Gy程度の急性均一被ばくを受けた場合に期待される主な症状として正しいものはどれか。",
    choices: [
      { label: "ア", text: "症状は全く現れない" },
      { label: "イ", text: "中枢神経障害により即時死亡する" },
      { label: "ウ", text: "骨髄（造血系）障害が主体で、白血球・血小板の著しい減少が現れる" },
      { label: "エ", text: "皮膚の紅斑のみが現れ、内臓への影響はない" },
      { label: "オ", text: "消化管障害が主体で腸管粘膜の剥落が起きる" },
    ],
    correctAnswer: "ウ",
    explanation:
      "4〜5Gyの急性全身被ばくでは骨髄障害が主体。前駆症状（悪心・嘔吐）後に潜伏期を経て、2〜3週間後に白血球・血小板の著しい減少（造血機能障害）が現れる。",
  },
  {
    id: "gr-bio-2023-006",
    year: 2023,
    certificationId: "gamma",
    subject: "gr-biology",
    subjectLabel: "放射線の生体に与える影響に関する知識",
    questionNumber: 6,
    questionText:
      "遺伝的影響について正しいものはどれか。",
    choices: [
      { label: "ア", text: "遺伝的影響は確定的影響に分類される" },
      { label: "イ", text: "遺伝的影響は被ばくした本人にのみ現れる" },
      { label: "ウ", text: "遺伝的影響は生殖細胞が被ばくすることで次世代以降に影響が現れる確率的影響" },
      { label: "エ", text: "現時点で人間での遺伝的影響は広島・長崎の被爆者において確認されている" },
      { label: "オ", text: "遺伝的影響のしきい線量は確定的影響より高い" },
    ],
    correctAnswer: "ウ",
    explanation:
      "遺伝的影響は生殖腺（精子・卵子）が被ばくし、DNAに生じた突然変異が次世代に伝わる確率的影響。現在まで人間での統計的有意な証拠は確認されていない。",
  },
  {
    id: "gr-bio-2023-007",
    year: 2023,
    certificationId: "gamma",
    subject: "gr-biology",
    subjectLabel: "放射線の生体に与える影響に関する知識",
    questionNumber: 7,
    questionText:
      "放射線によるDNA損傷で最も修復されにくく重篤なものはどれか。",
    choices: [
      { label: "ア", text: "DNA一本鎖切断（SSB）" },
      { label: "イ", text: "塩基の化学修飾（酸化的損傷）" },
      { label: "ウ", text: "DNA二本鎖切断（DSB）" },
      { label: "エ", text: "DNA鎖間架橋" },
      { label: "オ", text: "ピリミジン二量体" },
    ],
    correctAnswer: "ウ",
    explanation:
      "DNA二本鎖切断（DSB）は最も重篤な損傷で、修復エラーが生じると染色体異常・細胞死・発がんの原因となる。SSBは対側鎖を鋳型に効率よく修復される。",
  },
  {
    id: "gr-bio-2023-008",
    year: 2023,
    certificationId: "gamma",
    subject: "gr-biology",
    subjectLabel: "放射線の生体に与える影響に関する知識",
    questionNumber: 8,
    questionText:
      "放射線による白内障（水晶体混濁）に関して正しいものはどれか。",
    choices: [
      { label: "ア", text: "白内障は確率的影響で、しきい値は存在しない" },
      { label: "イ", text: "水晶体は放射線感受性が低い組織である" },
      { label: "ウ", text: "放射線白内障のしきい線量は急性被ばくで約0.5Gy（等価線量0.5Sv）" },
      { label: "エ", text: "放射線白内障は被ばく直後に発症する" },
      { label: "オ", text: "γ線よりα線の方が白内障リスクが低い" },
    ],
    correctAnswer: "ウ",
    explanation:
      "放射線白内障は確定的影響でしきい値がある。ICRP 2021年勧告で急性被ばきのしきい線量は約0.5Gyと改定。潜伏期間（数年〜10年以上）を経て発症する。",
  },
  {
    id: "gr-bio-2023-009",
    year: 2023,
    certificationId: "gamma",
    subject: "gr-biology",
    subjectLabel: "放射線の生体に与える影響に関する知識",
    questionNumber: 9,
    questionText:
      "放射線の被ばく形態のうち「慢性被ばく」と「急性被ばく」の違いとして正しいものはどれか。",
    choices: [
      { label: "ア", text: "慢性被ばくは急性被ばくより同じ総線量でも生物効果が大きい" },
      { label: "イ", text: "慢性被ばくは急性被ばくより同じ総線量でも生物効果が小さい（修復が進む）" },
      { label: "ウ", text: "慢性被ばくでは確定的影響は起きない" },
      { label: "エ", text: "急性被ばくでは確率的影響は起きない" },
      { label: "オ", text: "慢性被ばくと急性被ばくでは同じ総線量で同じ生物効果が生じる" },
    ],
    correctAnswer: "イ",
    explanation:
      "慢性（低線量率）被ばくでは照射中にDNA修復が進むため、同じ総線量でも急性被ばくより確定的影響の重篤度が低くなる傾向がある（線量率効果）。",
  },
  {
    id: "gr-bio-2023-010",
    year: 2023,
    certificationId: "gamma",
    subject: "gr-biology",
    subjectLabel: "放射線の生体に与える影響に関する知識",
    questionNumber: 10,
    questionText:
      "ICRP（国際放射線防護委員会）が定める一般公衆の実効線量限度として正しいものはどれか。",
    choices: [
      { label: "ア", text: "1年間につき1mSv（医療被ばくを除く）" },
      { label: "イ", text: "1年間につき5mSv" },
      { label: "ウ", text: "1年間につき20mSv" },
      { label: "エ", text: "1年間につき50mSv" },
      { label: "オ", text: "5年間につき100mSv" },
    ],
    correctAnswer: "ア",
    explanation:
      "ICRPの一般公衆の実効線量限度は1mSv/年（医療被ばく・自然放射線を除く）。放射線業務従事者は5年100mSv・1年50mSvであり、一般公衆より高い限度が設定されている。",
  },

  // ─── 放射線の生体影響 2024 ────────────────────────────────────────────────
  {
    id: "gr-bio-2024-001",
    year: 2024,
    certificationId: "gamma",
    subject: "gr-biology",
    subjectLabel: "放射線の生体に与える影響に関する知識",
    questionNumber: 1,
    questionText:
      "放射線の種類と透過力・電離作用の関係として正しいものはどれか。",
    choices: [
      { label: "ア", text: "α線は透過力が最も高く、電離作用が最も弱い" },
      { label: "イ", text: "β線は透過力が最も低く、電離作用が最も強い" },
      { label: "ウ", text: "γ線は透過力が最も高く、電離作用が最も弱い（間接電離放射線）" },
      { label: "エ", text: "中性子線はγ線より透過力が低い" },
      { label: "オ", text: "α線はγ線より透過力が高い" },
    ],
    correctAnswer: "ウ",
    explanation:
      "γ線（電磁波）は透過力が最も高く、電離はコンプトン散乱・光電効果等の二次電子を介して起きる間接電離放射線。α線は透過力が最も低いが電離密度が最も高い。",
  },
  {
    id: "gr-bio-2024-002",
    year: 2024,
    certificationId: "gamma",
    subject: "gr-biology",
    subjectLabel: "放射線の生体に与える影響に関する知識",
    questionNumber: 2,
    questionText:
      "放射線誘発がんの主な種類と潜伏期間の組み合わせとして正しいものはどれか。",
    choices: [
      { label: "ア", text: "白血病：潜伏期間10〜30年（最も長い）、固形がん：2〜5年（最も短い）" },
      { label: "イ", text: "白血病：潜伏期間2〜5年（比較的短い）、固形がん：10〜30年以上（長い）" },
      { label: "ウ", text: "すべてのがんで潜伏期間は一定（5年）" },
      { label: "エ", text: "白血病も固形がんも潜伏期間は同じである" },
      { label: "オ", text: "被ばく後1年以内に急性がんとして発症する" },
    ],
    correctAnswer: "イ",
    explanation:
      "放射線誘発白血病の潜伏期間は2〜5年でピーク。固形がん（甲状腺がん・乳がん・肺がん等）は10年以上の長い潜伏期間を持つ。これは遅発性確率的影響の特徴。",
  },
  {
    id: "gr-bio-2024-003",
    year: 2024,
    certificationId: "gamma",
    subject: "gr-biology",
    subjectLabel: "放射線の生体に与える影響に関する知識",
    questionNumber: 3,
    questionText:
      "胎児期（妊娠9週以降〜出産まで）の放射線被ばくで最も問題となる影響はどれか。",
    choices: [
      { label: "ア", text: "形態的奇形（外表奇形）が最も発生しやすい" },
      { label: "イ", text: "胚死亡（着床失敗）が主な影響" },
      { label: "ウ", text: "精神遅滞・発育障害・小頭症が問題となる" },
      { label: "エ", text: "胎児期の被ばくは影響を受けない" },
      { label: "オ", text: "全身の臓器が同等に影響を受ける" },
    ],
    correctAnswer: "ウ",
    explanation:
      "胎児期（9週以降）では神経系の発育が進むため、被ばくにより精神遅滞・発育遅滞・小頭症が問題となる。形態的奇形は器官形成期（3〜8週）が感受性が高い。",
  },
  {
    id: "gr-bio-2024-004",
    year: 2024,
    certificationId: "gamma",
    subject: "gr-biology",
    subjectLabel: "放射線の生体に与える影響に関する知識",
    questionNumber: 4,
    questionText:
      "急性放射線症の病期の進行順序として正しいものはどれか。",
    choices: [
      { label: "ア", text: "前駆期→回復期→潜伏期→発症期" },
      { label: "イ", text: "前駆期→潜伏期→発症期（極期）→回復期（または死亡）" },
      { label: "ウ", text: "潜伏期→前駆期→発症期→回復期" },
      { label: "エ", text: "発症期→前駆期→潜伏期→回復期" },
      { label: "オ", text: "急性放射線症の病期は一定しておらず順序はない" },
    ],
    correctAnswer: "イ",
    explanation:
      "急性放射線症の経過：前駆期（悪心・嘔吐等）→潜伏期（一見回復に見える）→発症期（造血障害等が顕在化）→回復期または死亡。線量が高いほど潜伏期が短い。",
  },
  {
    id: "gr-bio-2024-005",
    year: 2024,
    certificationId: "gamma",
    subject: "gr-biology",
    subjectLabel: "放射線の生体に与える影響に関する知識",
    questionNumber: 5,
    questionText:
      "ICRP 2007年勧告における組織加重係数wTが0.12の臓器として正しいものはどれか。",
    choices: [
      { label: "ア", text: "甲状腺（wT＝0.04）" },
      { label: "イ", text: "皮膚（wT＝0.01）" },
      { label: "ウ", text: "骨髄（赤色骨髄）（wT＝0.12）" },
      { label: "エ", text: "肝臓（wT＝0.04）" },
      { label: "オ", text: "骨表面（wT＝0.01）" },
    ],
    correctAnswer: "ウ",
    explanation:
      "ICRP 2007年勧告でwT＝0.12の組織は、骨髄（赤色骨髄）・結腸・肺・胃の4臓器。甲状腺・肝臓は0.04、皮膚・骨表面は0.01、生殖腺は0.08。",
  },
  {
    id: "gr-bio-2024-006",
    year: 2024,
    certificationId: "gamma",
    subject: "gr-biology",
    subjectLabel: "放射線の生体に与える影響に関する知識",
    questionNumber: 6,
    questionText:
      "放射線の線量率効果について正しいものはどれか。",
    choices: [
      { label: "ア", text: "同じ総線量であれば線量率に関係なく生物効果は等しい" },
      { label: "イ", text: "高線量率（急性被ばく）のほうが低線量率（慢性被ばく）より確定的影響が小さい" },
      { label: "ウ", text: "低線量率被ばくでは照射中にDNA修復が進むため、同じ総線量の急性被ばくより確定的影響が小さい" },
      { label: "エ", text: "確率的影響には線量率効果がなく、総線量のみが影響する" },
      { label: "オ", text: "低線量率のほうが高線量率より生物効果が常に高い" },
    ],
    correctAnswer: "ウ",
    explanation:
      "線量率効果：低線量率被ばくでは照射中に細胞の放射線損傷修復が進み、同じ総線量の急性（高線量率）被ばくより確定的影響の重篤度が低くなる。",
  },
  {
    id: "gr-bio-2024-007",
    year: 2024,
    certificationId: "gamma",
    subject: "gr-biology",
    subjectLabel: "放射線の生体に与える影響に関する知識",
    questionNumber: 7,
    questionText:
      "放射線と発がんの関係について正しいものはどれか。",
    choices: [
      { label: "ア", text: "放射線被ばく後は必ずがんが発症する" },
      { label: "イ", text: "放射線はがんリスクを増加させるが、どのエネルギーでも効果は同じ" },
      { label: "ウ", text: "放射線誘発がんは確率的影響で、発生確率は線量に比例して増加するが発症は確実ではない" },
      { label: "エ", text: "放射線誘発がんのしきい線量は100mSvと明確に定まっている" },
      { label: "オ", text: "医療診断放射線（胸部X線など）ではがんリスクは全く増加しない" },
    ],
    correctAnswer: "ウ",
    explanation:
      "放射線誘発がんは確率的影響で、しきい値なく線量に比例して発生確率が増加するとされる（LNT仮説）。ただし低線量での実際のリスクは不確かさが大きい。",
  },
  {
    id: "gr-bio-2024-008",
    year: 2024,
    certificationId: "gamma",
    subject: "gr-biology",
    subjectLabel: "放射線の生体に与える影響に関する知識",
    questionNumber: 8,
    questionText:
      "不妊（精巣への放射線影響）について正しいものはどれか。",
    choices: [
      { label: "ア", text: "男性の永続的不妊のしきい線量は約0.15Gyである" },
      { label: "イ", text: "男性の一時的不妊のしきい線量は約0.15Gy、永続的不妊は約3.5Gy" },
      { label: "ウ", text: "精巣への被ばくによる不妊は確率的影響に分類される" },
      { label: "エ", text: "不妊のしきい線量は男女同じである" },
      { label: "オ", text: "一時的不妊は放射線量に関係なく全員に起きる" },
    ],
    correctAnswer: "イ",
    explanation:
      "ICRP 2007年勧告：男性精巣への急性被ばくで一時的不妊のしきい値は約0.15Gy、永続的不妊は約3.5Gy。女性卵巣では一時的不妊0.65〜1.5Gy、永続的不妊2.5〜6Gy。",
  },
  {
    id: "gr-bio-2024-009",
    year: 2024,
    certificationId: "gamma",
    subject: "gr-biology",
    subjectLabel: "放射線の生体に与える影響に関する知識",
    questionNumber: 9,
    questionText:
      "放射線被ばくの影響を軽減するための放射線防護の3原則として正しいものはどれか。",
    choices: [
      { label: "ア", text: "遮蔽・距離・換気" },
      { label: "イ", text: "遮蔽・時間・距離" },
      { label: "ウ", text: "保護具・遮蔽・教育" },
      { label: "エ", text: "換気・保護具・距離" },
      { label: "オ", text: "時間・換気・個人被ばく管理" },
    ],
    correctAnswer: "イ",
    explanation:
      "放射線防護の3原則は「遮蔽（遮蔽材の使用）・時間（被ばく時間の短縮）・距離（線源から遠ざかる）」。この3つを組み合わせてALARAの精神で被ばくを最小化する。",
  },
  {
    id: "gr-bio-2024-010",
    year: 2024,
    certificationId: "gamma",
    subject: "gr-biology",
    subjectLabel: "放射線の生体に与える影響に関する知識",
    questionNumber: 10,
    questionText:
      "放射線の確率的影響において採用されている「LNT（線形しきい値なし）モデル」の概念として正しいものはどれか。",
    choices: [
      { label: "ア", text: "LNTモデルは低線量でも高線量でも等しい生物効果を仮定する" },
      { label: "イ", text: "LNTモデルはしきい線量が存在し、それ以下での影響は起きないと仮定する" },
      { label: "ウ", text: "LNTモデルはどんな微量の線量でもがんリスクに比例した増加があると仮定し、放射線防護の基礎とされる" },
      { label: "エ", text: "LNTモデルは高線量率にのみ適用される" },
      { label: "オ", text: "LNTモデルは現在科学的に完全に証明されている" },
    ],
    correctAnswer: "ウ",
    explanation:
      "LNT（Linear No Threshold）モデルはしきい値なく線量に比例してがんリスクが増加すると仮定。科学的証明は不確かだが、放射線防護の保守的判断基準として国際的に採用されている。",
  },
];
