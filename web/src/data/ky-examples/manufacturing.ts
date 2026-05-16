import type { KyExample } from "@/types/ky-example";

const MHLW: KyExample["source"] = {
  category: "mhlw",
  label: "厚生労働省「職場のあんぜんサイト 労働災害事例」",
};
const JISHA: KyExample["source"] = {
  category: "jisha",
  label: "中災防「ゼロ災運動 KY実施例」",
};
const GENERAL: KyExample["source"] = {
  category: "general",
  label: "一般公開の安全衛生教育資料",
};

export const MANUFACTURING_EXAMPLES: KyExample[] = [
  // ── 高所作業 (fall-work) × 3 ──────────────────────────────
  {
    id: "mf-fall-001",
    industry: "manufacturing",
    workType: "fall-work",
    title: "工場内クレーン桁上での点検作業",
    hazards: [
      "桁上歩行時の足の踏み外し",
      "親綱未設置区間での無胴綱状態",
      "クレーン誤動作による挟まれ",
    ],
    risks: [
      "5m超からの墜落",
      "クレーンとの挟まれ",
    ],
    countermeasures: [
      "桁上全長に親綱を先行設置",
      "クレーン主電源をロックアウト/タグアウト",
      "フルハーネス2丁掛けで常時接続",
      "桁上作業中は他クレーンも停止",
    ],
    keywords: ["クレーン桁", "親綱", "LOTO", "ハーネス"],
    source: JISHA,
  },
  {
    id: "mf-fall-002",
    industry: "manufacturing",
    workType: "fall-work",
    title: "プラント配管の脚立上補修作業",
    hazards: [
      "脚立天板への登り",
      "脚立直近に他作業員が通行",
      "配管からの蒸気漏れ",
    ],
    risks: [
      "脚立転倒による墜落",
      "蒸気火傷",
    ],
    countermeasures: [
      "脚立は天板から2段下までを作業限度とする",
      "脚立周囲を区画しコーンで通行を遮断",
      "配管の供給停止と冷却を確認後に着手",
      "可能な限り可搬式作業台に変更",
    ],
    keywords: ["脚立", "配管", "プラント", "蒸気"],
    source: MHLW,
  },
  {
    id: "mf-fall-003",
    industry: "manufacturing",
    workType: "fall-work",
    title: "工場棟屋根上の太陽光パネル点検",
    hazards: [
      "勾配屋根での踏み外し",
      "採光材の踏み抜き",
      "太陽光パネルの活線部",
    ],
    risks: [
      "屋根からの墜落",
      "感電",
    ],
    countermeasures: [
      "親綱＋フルハーネスを必須化",
      "歩行ルートに歩み板を敷設し採光材を回避",
      "DC電源の遮断とパネル裏配線の絶縁確認",
      "雨天時・強風時は中止",
    ],
    keywords: ["屋根", "太陽光", "感電", "歩み板"],
    source: GENERAL,
  },

  // ── 重量物運搬 (heavy-load) × 3 ────────────────────────────
  {
    id: "mf-heavy-001",
    industry: "manufacturing",
    workType: "heavy-load",
    title: "金型の手作業搬送（プレス機間）",
    hazards: [
      "重量物の腰部負荷",
      "金型角部での挟まれ",
      "床面の油分による滑り",
    ],
    risks: [
      "腰痛・ヘルニア",
      "手指の挟まれ・打撲",
    ],
    countermeasures: [
      "20kg超は台車またはホイストを必須使用",
      "床面の油分は吸着材で除去後に運搬",
      "革手袋・安全靴を着用",
      "腰痛予防体操を朝礼で実施",
    ],
    keywords: ["金型", "プレス", "腰痛", "ホイスト"],
    source: MHLW,
  },
  {
    id: "mf-heavy-002",
    industry: "manufacturing",
    workType: "heavy-load",
    title: "ドラム缶（200L）の運搬とラッキング",
    hazards: [
      "ドラム缶転倒",
      "中身が漏出し滑りの原因に",
      "ラック上から落下",
    ],
    risks: [
      "下肢の挟まれ・骨折",
      "化学物質曝露",
    ],
    countermeasures: [
      "ドラム缶専用台車またはフォークアタッチメントを使用",
      "立て置き保管時は転倒防止金具で固定",
      "漏えい時の吸着材・中和剤を即時使用可能位置に常備",
      "ラックは耐荷重表示と段積み制限を遵守",
    ],
    keywords: ["ドラム缶", "転倒", "ラック", "化学物質"],
    source: JISHA,
  },
  {
    id: "mf-heavy-003",
    industry: "manufacturing",
    workType: "heavy-load",
    title: "鋼材コイルの天井クレーン運搬",
    hazards: [
      "コイルの不安定な吊り姿勢",
      "吊り具の重心ずれ",
      "オペレーター死角",
    ],
    risks: [
      "コイル落下による下方被災",
      "クレーン衝突",
    ],
    countermeasures: [
      "コイル専用吊り具（Cフック）を使用",
      "重心位置をマーキングし玉掛け位置を統一",
      "合図者を1名固定し無線で連絡",
      "走行ルート下の立入禁止",
    ],
    keywords: ["コイル", "天井クレーン", "Cフック", "重心"],
    source: GENERAL,
  },

  // ── 機械操作 (machine) × 3 ─────────────────────────────────
  {
    id: "mf-machine-001",
    industry: "manufacturing",
    workType: "machine",
    title: "動力プレスでの板金打抜き作業",
    hazards: [
      "手指の金型内挿入",
      "安全装置の機能不全",
      "材料送り時の挟まれ",
    ],
    risks: [
      "手指の切断・潰挫",
      "上肢の重大障害",
    ],
    countermeasures: [
      "両手操作式または光線式安全装置の作動を毎日点検",
      "安全装置のバイパス・カバー取外しを厳禁",
      "送り治具・ピックアップツールで手投入を排除",
      "プレス機械作業主任者を選任",
    ],
    keywords: ["プレス", "両手操作", "光線式", "金型"],
    source: MHLW,
  },
  {
    id: "mf-machine-002",
    industry: "manufacturing",
    workType: "machine",
    title: "産業用ロボットの教示・保全作業",
    hazards: [
      "ロボット動作範囲内への侵入",
      "教示中の予期せぬ動作",
      "周辺設備との干渉",
    ],
    risks: [
      "ロボットとの挟まれ・激突",
      "重大災害",
    ],
    countermeasures: [
      "ロボット可動範囲を柵で囲い扉インタロックを設置",
      "教示作業は低速モード（250mm/s以下）で実施",
      "教示者は教示等業務の特別教育修了者",
      "イネーブルスイッチで常時保持操作",
    ],
    keywords: ["ロボット", "教示", "インタロック", "可動範囲"],
    source: MHLW,
  },
  {
    id: "mf-machine-003",
    industry: "manufacturing",
    workType: "machine",
    title: "コンベヤ整備・清掃作業",
    hazards: [
      "回転ローラへの巻き込まれ",
      "電源未遮断状態での清掃",
      "詰まり除去時の予期せぬ起動",
    ],
    risks: [
      "腕・手指の巻き込まれ",
      "重大災害",
    ],
    countermeasures: [
      "整備・清掃前にLOTO（施錠・表示）を実施",
      "回転部にはカバー・安全柵を設置",
      "詰まり除去は停止→主電源遮断→施錠の手順で実施",
      "始動前指差呼称で周囲を確認",
    ],
    keywords: ["コンベヤ", "巻き込まれ", "LOTO", "ローラ"],
    source: JISHA,
  },

  // ── 電気作業 (electrical) × 3 ──────────────────────────────
  {
    id: "mf-elec-001",
    industry: "manufacturing",
    workType: "electrical",
    title: "高圧受変電設備の年次点検",
    hazards: [
      "高圧充電部への接触",
      "残留電荷による感電",
      "事故電流によるアークフラッシュ",
    ],
    risks: [
      "感電死",
      "重度熱傷",
    ],
    countermeasures: [
      "停電→検電→短絡接地の手順を厳守",
      "電気主任技術者の指揮下で実施",
      "高圧用絶縁保護具（手袋・長靴・ヘルメット）を着用",
      "アークフラッシュ対応保護衣の支給",
    ],
    keywords: ["高圧", "受変電", "短絡接地", "アークフラッシュ"],
    source: MHLW,
  },
  {
    id: "mf-elec-002",
    industry: "manufacturing",
    workType: "electrical",
    title: "制御盤内配線変更作業",
    hazards: [
      "活線部分への工具接触",
      "配線図と実態の差異",
      "他系統からの誘導電圧",
    ],
    risks: [
      "感電・短絡",
      "誤配線による誤動作",
    ],
    countermeasures: [
      "盤主電源を遮断しLOTO実施",
      "現物確認と図面更新の徹底",
      "絶縁工具を使用",
      "作業後は通電前に絶縁抵抗測定",
    ],
    keywords: ["制御盤", "配線", "絶縁抵抗", "LOTO"],
    source: JISHA,
  },
  {
    id: "mf-elec-003",
    industry: "manufacturing",
    workType: "electrical",
    title: "工場内設備のアース接続点検",
    hazards: [
      "アース外れによる漏電",
      "接地抵抗の経年劣化",
      "湿潤環境での感電リスク",
    ],
    risks: [
      "感電",
      "漏電火災",
    ],
    countermeasures: [
      "年次で接地抵抗測定を実施し記録",
      "設備移設後は必ずアース再接続を確認",
      "湿潤区画にはD種接地と漏電遮断器を併設",
      "点検チェックリストで月次目視確認",
    ],
    keywords: ["アース", "接地抵抗", "漏電", "湿潤"],
    source: GENERAL,
  },

  // ── 化学物質取扱 (chemical) × 3 ────────────────────────────
  {
    id: "mf-chem-001",
    industry: "manufacturing",
    workType: "chemical",
    title: "塗装ブースでの有機溶剤吹付け作業",
    hazards: [
      "有機溶剤蒸気の吸入",
      "ミスト・粉じんの曝露",
      "静電気による引火",
    ],
    risks: [
      "有機溶剤中毒",
      "塗装ミストによる呼吸器障害",
      "火災・爆発",
    ],
    countermeasures: [
      "塗装ブースの局所排気装置を定期点検",
      "有機ガス用防毒マスクと送気マスクを使い分け",
      "防爆構造の電気設備と静電気対策（接地）",
      "作業環境測定を法定頻度で実施",
    ],
    keywords: ["塗装", "有機溶剤", "防爆", "局所排気"],
    source: MHLW,
  },
  {
    id: "mf-chem-002",
    industry: "manufacturing",
    workType: "chemical",
    title: "酸・アルカリ薬液の希釈・分注作業",
    hazards: [
      "薬液の飛散・吸入",
      "酸とアルカリの誤混合",
      "容器転倒",
    ],
    risks: [
      "化学熱傷・失明",
      "有害ガス発生（塩素・アンモニア等）",
    ],
    countermeasures: [
      "保護メガネ・耐薬品手袋・前掛けを着用",
      "酸とアルカリは別保管・別作業エリア",
      "希釈は『水に薬を加える』手順を厳守",
      "緊急シャワー・洗眼器を作業場近接に配置",
    ],
    keywords: ["酸", "アルカリ", "希釈", "洗眼"],
    source: JISHA,
  },
  {
    id: "mf-chem-003",
    industry: "manufacturing",
    workType: "chemical",
    title: "リスクアセスメント対象物の小分け作業",
    hazards: [
      "SDS未確認での取扱い",
      "保管区分の誤り",
      "皮膚接触",
    ],
    risks: [
      "発がん・皮膚障害",
      "保管中の事故",
    ],
    countermeasures: [
      "化学物質管理者を選任しSDSを朝礼で共有",
      "小分け容器にもラベル表示を実施",
      "保護具一覧をSDSに基づき選定",
      "曝露限界値以下となるリスクアセスメントを実施",
    ],
    keywords: ["化学物質", "SDS", "リスクアセスメント", "ラベル"],
    source: MHLW,
  },

  // ── フォークリフト (forklift) × 3 ──────────────────────────
  {
    id: "mf-fork-001",
    industry: "manufacturing",
    workType: "forklift",
    title: "工場通路での製品パレット搬送",
    hazards: [
      "歩行者導線との交差",
      "急なバック走行",
      "曲がり角での見通し不良",
    ],
    risks: [
      "歩行者との衝突・轢過",
      "他設備との接触",
    ],
    countermeasures: [
      "歩車分離レーンを白線で明示",
      "曲がり角にミラー・回転灯感知センサ設置",
      "場内制限速度8km/h以下",
      "バック警報音を必須化",
    ],
    keywords: ["フォーク", "歩行者", "通路", "ミラー"],
    source: MHLW,
  },
  {
    id: "mf-fork-002",
    industry: "manufacturing",
    workType: "forklift",
    title: "トラック荷台からの製品積み下ろし",
    hazards: [
      "ドックレベラー段差での転落",
      "車両逸走",
      "荷物の重心ずれ",
    ],
    risks: [
      "フォーク転落",
      "車両との挟まれ",
    ],
    countermeasures: [
      "車両側に輪止めを設置し駐車ブレーキ確認",
      "ドックレベラーのロック状態を毎回確認",
      "荷の重心は中央寄せに積み直し",
      "誘導者を配置し合図を統一",
    ],
    keywords: ["積み下ろし", "ドックレベラー", "輪止め", "誘導"],
    source: JISHA,
  },
  {
    id: "mf-fork-003",
    industry: "manufacturing",
    workType: "forklift",
    title: "高所棚への製品ラッキング作業",
    hazards: [
      "高揚高での視界喪失",
      "棚への接触で棚崩壊",
      "荷の落下",
    ],
    risks: [
      "棚倒壊による下方被災",
      "荷崩れ",
    ],
    countermeasures: [
      "棚位置を低速で接近し最終位置はインチング操作",
      "棚耐荷重を表示し過積禁止",
      "落下防止用バー付きラックを採用",
      "ヘルメット・安全靴を着用",
    ],
    keywords: ["高所棚", "ラッキング", "視界", "棚"],
    source: GENERAL,
  },

  // ── 掘削 (excavation) × 3 ──────────────────────────────────
  {
    id: "mf-exc-001",
    industry: "manufacturing",
    workType: "excavation",
    title: "工場敷地内の配管埋設用トレンチ掘削",
    hazards: [
      "既設配管・電線の損傷",
      "土砂崩壊",
      "降雨での冠水",
    ],
    risks: [
      "停電・断水・操業停止",
      "作業員の埋没",
    ],
    countermeasures: [
      "工場図面と探査機で埋設物を事前確認",
      "深さ1.5m超は土止め支保工を設置",
      "排水ポンプを準備し降雨時の対応手順を明文化",
      "工場関係者立会のもと実施",
    ],
    keywords: ["トレンチ", "埋設配管", "土止め", "排水"],
    source: GENERAL,
  },
  {
    id: "mf-exc-002",
    industry: "manufacturing",
    workType: "excavation",
    title: "貯水タンク基礎の掘削作業",
    hazards: [
      "湧水による足元の不安定化",
      "重機による埋設物損傷",
      "周辺コンクリート構造物の沈下",
    ],
    risks: [
      "崩壊埋没",
      "周辺施設の損傷",
    ],
    countermeasures: [
      "事前ボーリングで地下水位確認",
      "湧水排出ポンプを2系統準備",
      "周辺構造物の沈下計測を継続実施",
      "地山掘削作業主任者を選任",
    ],
    keywords: ["タンク基礎", "湧水", "沈下", "ポンプ"],
    source: GENERAL,
  },
  {
    id: "mf-exc-003",
    industry: "manufacturing",
    workType: "excavation",
    title: "工場内マンホール・ピット内作業",
    hazards: [
      "酸欠空気の滞留",
      "硫化水素発生",
      "墜落",
    ],
    risks: [
      "酸欠・中毒",
      "墜落事故",
    ],
    countermeasures: [
      "酸素・硫化水素濃度を入坑前後・作業中も連続測定",
      "送風機による換気を継続",
      "酸欠等危険作業主任者を選任し監視人を地上配置",
      "墜落制止用器具と救助用昇降器具を準備",
    ],
    keywords: ["マンホール", "酸欠", "硫化水素", "ピット"],
    source: MHLW,
  },

  // ── 溶接 (welding) × 3 ─────────────────────────────────────
  {
    id: "mf-weld-001",
    industry: "manufacturing",
    workType: "welding",
    title: "鉄骨製品のCO2半自動溶接",
    hazards: [
      "ヒューム吸入",
      "アーク光眼障害",
      "スパッタによる火災",
    ],
    risks: [
      "じん肺・肺がん",
      "電気性眼炎",
      "周辺火災",
    ],
    countermeasures: [
      "溶接ヒューム測定とフィルタ付き局所排気装置",
      "電動ファン付き呼吸用保護具を着用",
      "周囲5m以内の可燃物撤去と消火器配置",
      "遮光カーテンで他作業者の眼を保護",
    ],
    keywords: ["CO2溶接", "ヒューム", "アーク光", "遮光"],
    source: MHLW,
  },
  {
    id: "mf-weld-002",
    industry: "manufacturing",
    workType: "welding",
    title: "貯槽内部での補修溶接（タンク内作業）",
    hazards: [
      "残留可燃ガスの引火",
      "酸欠空気",
      "感電",
    ],
    risks: [
      "爆発・火災",
      "酸欠死",
    ],
    countermeasures: [
      "事前にガス置換（不活性ガス）と濃度測定",
      "酸素濃度18%以上・可燃ガス爆発下限25%以下を確認",
      "電撃防止装置付き溶接機を使用",
      "外部監視人と救助用具を常備",
    ],
    keywords: ["タンク内", "ガス置換", "酸欠", "電撃防止"],
    source: MHLW,
  },
  {
    id: "mf-weld-003",
    industry: "manufacturing",
    workType: "welding",
    title: "ステンレス配管のTIG溶接",
    hazards: [
      "クロムを含むヒューム発生",
      "オゾン発生",
      "アーク光",
    ],
    risks: [
      "クロム障害・がん",
      "気管支炎",
    ],
    countermeasures: [
      "局所排気フードを溶接位置に追従配置",
      "送気マスクまたは電動ファン付き呼吸用保護具",
      "作業環境測定（特定化学物質）を実施",
      "皮膚保護のため長袖革エプロン着用",
    ],
    keywords: ["TIG", "ステンレス", "クロム", "オゾン"],
    source: JISHA,
  },

  // ── 玉掛け (rigging) × 3 ───────────────────────────────────
  {
    id: "mf-rig-001",
    industry: "manufacturing",
    workType: "rigging",
    title: "鋳物製品の天井クレーン搬出",
    hazards: [
      "鋳物の鋭利エッジでのワイヤー損傷",
      "重心ずれ",
      "高温部の残熱",
    ],
    risks: [
      "ワイヤー破断による落下",
      "火傷",
    ],
    countermeasures: [
      "鋭利エッジに当て物を挟みワイヤー保護",
      "重心マーキングと専用治具を使用",
      "鋳物表面温度を非接触温度計で測定し基準以下で運搬",
      "玉掛け技能講習修了者のみ",
    ],
    keywords: ["鋳物", "天井クレーン", "重心", "残熱"],
    source: JISHA,
  },
  {
    id: "mf-rig-002",
    industry: "manufacturing",
    workType: "rigging",
    title: "長尺鋼材のジブクレーン運搬",
    hazards: [
      "長尺物の振れ",
      "ねじれ回転",
      "周辺設備への干渉",
    ],
    risks: [
      "落下・激突",
      "設備損傷",
    ],
    countermeasures: [
      "介錯ロープ2本（両端）で姿勢制御",
      "周辺設備との離隔3m以上を確保",
      "クレーン走行ルートを事前確認",
      "合図者と運転者は無線で連絡",
    ],
    keywords: ["長尺", "ジブクレーン", "介錯", "干渉"],
    source: GENERAL,
  },
  {
    id: "mf-rig-003",
    industry: "manufacturing",
    workType: "rigging",
    title: "金型のホイスト玉掛け（プレス交換）",
    hazards: [
      "金型重量が定格超過",
      "つり点の摩耗",
      "高さ調整時の挟まれ",
    ],
    risks: [
      "落下事故",
      "挟まれ災害",
    ],
    countermeasures: [
      "金型重量表示と定格荷重照合",
      "つり点（アイボルト等）の摩耗・ねじ確認",
      "金型移動中は手指を絶対に隙間に入れない",
      "高さ調整は治具で実施し手作業を排除",
    ],
    keywords: ["金型", "ホイスト", "アイボルト", "定格荷重"],
    source: MHLW,
  },

  // ── その他 (other) × 3 ────────────────────────────────────
  {
    id: "mf-other-001",
    industry: "manufacturing",
    workType: "other",
    title: "粉体ライン清掃時の粉じん爆発リスク",
    hazards: [
      "可燃性粉じんの堆積",
      "静電気スパーク",
      "圧縮空気での吹き飛ばし作業",
    ],
    risks: [
      "粉じん爆発による重度災害",
      "二次火災",
    ],
    countermeasures: [
      "清掃は吸引（防爆掃除機）に限定し圧縮空気を禁止",
      "ライン全体の接地と除電装置を運用",
      "粉じん堆積限界を表示し定期清掃を計画",
      "防爆区分に応じた電気設備を使用",
    ],
    keywords: ["粉じん爆発", "防爆", "静電気", "清掃"],
    source: MHLW,
  },
  {
    id: "mf-other-002",
    industry: "manufacturing",
    workType: "other",
    title: "夜勤交代時の引継ぎ作業",
    hazards: [
      "設備状態の伝達漏れ",
      "異常品の存在を知らずに再開",
      "疲労による判断力低下",
    ],
    risks: [
      "誤操作による設備事故",
      "品質不良流出",
    ],
    countermeasures: [
      "引継ぎチェックリストを用いた口頭・書面の二重確認",
      "異常品は赤テープで隔離し共有",
      "夜勤者の仮眠室と休憩計画を整備",
      "重要操作はダブルチェック",
    ],
    keywords: ["夜勤", "引継ぎ", "チェックリスト", "疲労"],
    source: GENERAL,
  },
  {
    id: "mf-other-003",
    industry: "manufacturing",
    workType: "other",
    title: "工場内の騒音区域での作業",
    hazards: [
      "85dB超の連続騒音",
      "耳栓不着用",
      "警報音聞き逃し",
    ],
    risks: [
      "騒音性難聴",
      "緊急警報の見落とし",
    ],
    countermeasures: [
      "騒音測定で区域指定し耳栓または耳覆い着用",
      "聴力検査を定期実施",
      "警報は光警報と併設し視覚で識別可能に",
      "休憩室は静音区画とする",
    ],
    keywords: ["騒音", "難聴", "耳栓", "警報"],
    source: MHLW,
  },
];
