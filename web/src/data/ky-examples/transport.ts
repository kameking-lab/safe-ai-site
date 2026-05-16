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
  label: "国土交通省・全日本トラック協会等の公開資料",
};

export const TRANSPORT_EXAMPLES: KyExample[] = [
  // ── 高所作業 (fall-work) × 3 ──────────────────────────────
  {
    id: "tr-fall-001",
    industry: "transport",
    workType: "fall-work",
    title: "大型トラック荷台上での積荷整理",
    hazards: [
      "荷台端部からの足踏み外し",
      "シート掛けで体勢を崩す",
      "あおりに足を載せ滑る",
    ],
    risks: [
      "荷台（高さ約1.5m）からの墜落・骨折",
      "頭部外傷",
    ],
    countermeasures: [
      "荷台昇降は専用ステップを使用しあおり踏み禁止",
      "シート掛けは地上から伸縮棒で行うかフォール装置付きを使用",
      "可能な場合は安全囲い付き荷役プラットフォームを使用",
      "ヘルメット着用を全社徹底",
    ],
    keywords: ["トラック荷台", "あおり", "シート", "墜落"],
    source: MHLW,
  },
  {
    id: "tr-fall-002",
    industry: "transport",
    workType: "fall-work",
    title: "倉庫高所棚への手動ピッキング",
    hazards: [
      "脚立天板での無理な姿勢",
      "棚と脚立の隙間に足を踏み外し",
      "ピッキングカートとの接触で脚立転倒",
    ],
    risks: [
      "脚立からの墜落",
      "落下物の頭部直撃",
    ],
    countermeasures: [
      "脚立は天板から2段下までを作業限度",
      "高所棚はピッキングリフトまたは安全囲い付き作業台に置換",
      "脚立使用中は周囲を区画して通行制限",
      "ヘルメット・つま先保護安全靴を着用",
    ],
    keywords: ["倉庫", "ピッキング", "脚立", "高所棚"],
    source: JISHA,
  },
  {
    id: "tr-fall-003",
    industry: "transport",
    workType: "fall-work",
    title: "コンテナ船・ヤードでのコンテナ上作業",
    hazards: [
      "コンテナ天面の濡れ・凍結",
      "親綱未設置区間",
      "強風による煽り",
    ],
    risks: [
      "高さ2.5m超からの墜落",
      "重大災害",
    ],
    countermeasures: [
      "コンテナ天面作業は親綱＋フルハーネスを必須化",
      "凍結・降雨時は作業を中止または除去後実施",
      "可能な限りリーチスタッカーやスプレッダで地上作業化",
      "風速10m/s超は中止基準を明文化",
    ],
    keywords: ["コンテナ", "ヤード", "親綱", "凍結"],
    source: GENERAL,
  },

  // ── 重量物運搬 (heavy-load) × 3 ────────────────────────────
  {
    id: "tr-heavy-001",
    industry: "transport",
    workType: "heavy-load",
    title: "宅配荷物の手降ろし（住宅街配送）",
    hazards: [
      "中腰での繰返し動作",
      "段差・玄関階段の昇降",
      "雨天時の床滑り",
    ],
    risks: [
      "腰痛・椎間板障害",
      "転倒骨折",
    ],
    countermeasures: [
      "台車の活用と20kg超単独運搬の禁止",
      "腰痛予防体操を始業前に実施",
      "雨天時は滑りにくい靴底の安全靴を着用",
      "腰部サポーター・腰痛保護ベルトの支給",
    ],
    keywords: ["宅配", "腰痛", "台車", "段差"],
    source: MHLW,
  },
  {
    id: "tr-heavy-002",
    industry: "transport",
    workType: "heavy-load",
    title: "引越作業での家具・家電運搬",
    hazards: [
      "2人組の声掛け不一致",
      "階段での手指挟まれ",
      "重心移動で腰部を捻る",
    ],
    risks: [
      "落下・挟まれ",
      "腰痛・骨折",
    ],
    countermeasures: [
      "持ち上げ・降ろしの声掛けを統一",
      "階段運搬は専用ストラップ・台車を使用",
      "持ち手位置のマーキングで手指を保護",
      "新人は単独運搬を制限",
    ],
    keywords: ["引越", "家具", "階段", "腰痛"],
    source: JISHA,
  },
  {
    id: "tr-heavy-003",
    industry: "transport",
    workType: "heavy-load",
    title: "鋼材ロールの台車搬送（倉庫内）",
    hazards: [
      "台車の急停止で荷崩れ",
      "通路勾配での暴走",
      "床面段差で台車横転",
    ],
    risks: [
      "下肢の挟まれ・骨折",
      "鋼材落下",
    ],
    countermeasures: [
      "台車は適正定格内で積載し荷崩れ防止ベルトを使用",
      "勾配通路には速度抑制バンプまたは禁止表示",
      "通路段差は事前に解消しスロープ化",
      "台車押し作業は1人当たり荷重制限を設定",
    ],
    keywords: ["鋼材", "台車", "倉庫", "勾配"],
    source: GENERAL,
  },

  // ── 機械操作 (machine) × 3 ─────────────────────────────────
  {
    id: "tr-machine-001",
    industry: "transport",
    workType: "machine",
    title: "貨物自動車テールゲートリフター操作",
    hazards: [
      "プラットフォーム下に足を入れる",
      "上昇途中の障害物接触",
      "ロックピン外れ",
    ],
    risks: [
      "下肢の挟まれ・切断",
      "荷の落下",
    ],
    countermeasures: [
      "テールゲート下に立ち入らない区画表示",
      "操作は安全特別教育修了者が実施",
      "毎日始業点検（ロック・油圧漏れ）を記録",
      "停止後の落下防止ピンを確実に挿入",
    ],
    keywords: ["テールゲート", "リフター", "ロックピン", "挟まれ"],
    source: MHLW,
  },
  {
    id: "tr-machine-002",
    industry: "transport",
    workType: "machine",
    title: "倉庫自動ソーター・コンベヤの保全",
    hazards: [
      "ソーター可動部への巻き込まれ",
      "電源未遮断状態での点検",
      "他作業者の起動",
    ],
    risks: [
      "腕・手の巻き込まれ",
      "重大災害",
    ],
    countermeasures: [
      "保全前にLOTO（施錠・表示）を実施",
      "可動部にはガード・センサ式停止装置",
      "始動前指差呼称で人員位置を確認",
      "保全作業手順書を整備し新人教育を必須化",
    ],
    keywords: ["ソーター", "コンベヤ", "LOTO", "巻き込まれ"],
    source: JISHA,
  },
  {
    id: "tr-machine-003",
    industry: "transport",
    workType: "machine",
    title: "AGV（無人搬送車）混在エリアでの人作業",
    hazards: [
      "AGV走行ルートへの侵入",
      "AGVセンサ死角",
      "誘導磁気テープ上の障害物",
    ],
    risks: [
      "AGVとの接触・轢過",
      "棚への激突",
    ],
    countermeasures: [
      "AGVゾーンは床面色分けと立入禁止帯を表示",
      "人作業時はAGVを徐行モードまたは停止に切替",
      "走行ルート上の整理整頓を1日3回点検",
      "新人にはAGV安全教育を必須化",
    ],
    keywords: ["AGV", "無人搬送車", "ゾーン", "走行ルート"],
    source: GENERAL,
  },

  // ── 電気作業 (electrical) × 3 ──────────────────────────────
  {
    id: "tr-elec-001",
    industry: "transport",
    workType: "electrical",
    title: "冷凍車冷凍機の電気点検",
    hazards: [
      "活線部への接触",
      "湿潤環境（庫内結露）",
      "予期せぬ再起動",
    ],
    risks: [
      "感電",
      "短絡火災",
    ],
    countermeasures: [
      "主電源を遮断しLOTOを実施",
      "検電後に作業着手",
      "湿潤区画は絶縁靴・絶縁手袋を着用",
      "電気取扱業務特別教育修了者が実施",
    ],
    keywords: ["冷凍車", "感電", "湿潤", "LOTO"],
    source: GENERAL,
  },
  {
    id: "tr-elec-002",
    industry: "transport",
    workType: "electrical",
    title: "EV配送車の充電設備設置・点検",
    hazards: [
      "高電圧バッテリーへの接触",
      "充電ケーブル断線",
      "充電中の発熱・発火",
    ],
    risks: [
      "感電死",
      "EV火災",
    ],
    countermeasures: [
      "EV高電圧取扱の特別教育修了者のみ実施",
      "ケーブル損傷は使用前点検で発見し交換",
      "充電中は温度監視と煙感知を併用",
      "消火器（リチウム電池火災対応）を近接配置",
    ],
    keywords: ["EV", "充電", "バッテリー", "感電"],
    source: GENERAL,
  },
  {
    id: "tr-elec-003",
    industry: "transport",
    workType: "electrical",
    title: "倉庫照明設備の保守作業",
    hazards: [
      "高所での活線作業",
      "脚立転倒",
      "照明器具の落下",
    ],
    risks: [
      "感電・墜落",
      "落下物による被災",
    ],
    countermeasures: [
      "停電作業を原則化",
      "高所作業車または安全囲い付き作業台を使用",
      "照明器具の保持金具を二重化",
      "立入禁止区域を地上に表示",
    ],
    keywords: ["照明", "倉庫", "高所", "感電"],
    source: GENERAL,
  },

  // ── 化学物質取扱 (chemical) × 3 ────────────────────────────
  {
    id: "tr-chem-001",
    industry: "transport",
    workType: "chemical",
    title: "危険物（ガソリン・軽油）のタンクローリー荷役",
    hazards: [
      "静電気火花による引火",
      "気化ガスの吸入",
      "ホース外れによる漏えい",
    ],
    risks: [
      "火災・爆発",
      "中毒",
    ],
    countermeasures: [
      "アース接続を最初に実施し最後に外す",
      "防爆区分対応の電気設備と工具を使用",
      "ホース接続部はカップリングロック確認",
      "危険物取扱者の立会いと火気使用禁止表示",
    ],
    keywords: ["危険物", "タンクローリー", "静電気", "防爆"],
    source: MHLW,
  },
  {
    id: "tr-chem-002",
    industry: "transport",
    workType: "chemical",
    title: "毒劇物積載車両の運行と荷扱い",
    hazards: [
      "事故時の漏えい",
      "誤積み・誤配",
      "保護具未着用での接触",
    ],
    risks: [
      "中毒・環境汚染",
      "誤使用による事故",
    ],
    countermeasures: [
      "毒劇物表示と運行経路の事前計画",
      "保護具（耐薬品手袋・防毒マスク）を車載",
      "荷主・受取人とのダブルチェック手順",
      "事故時の連絡先・応急処置をSDSと共に携行",
    ],
    keywords: ["毒劇物", "運行", "SDS", "応急処置"],
    source: GENERAL,
  },
  {
    id: "tr-chem-003",
    industry: "transport",
    workType: "chemical",
    title: "倉庫内のドライアイス・液化ガス取扱",
    hazards: [
      "酸欠（CO2による空気置換）",
      "凍傷",
      "圧力上昇による容器破裂",
    ],
    risks: [
      "酸欠死",
      "凍傷・破裂事故",
    ],
    countermeasures: [
      "酸素濃度計を携行し閉所での換気を確保",
      "耐寒手袋・保護メガネを着用",
      "容器は通気のある場所に保管し密閉禁止",
      "取扱手順を朝礼で確認",
    ],
    keywords: ["ドライアイス", "液化ガス", "酸欠", "凍傷"],
    source: JISHA,
  },

  // ── フォークリフト (forklift) × 3 ──────────────────────────
  {
    id: "tr-fork-001",
    industry: "transport",
    workType: "forklift",
    title: "倉庫内パレット出庫作業",
    hazards: [
      "歩行者導線との交差",
      "曲がり角の見通し不良",
      "急発進・急ブレーキ",
    ],
    risks: [
      "歩行者との接触",
      "荷崩れ",
    ],
    countermeasures: [
      "歩車分離レーンを明示し交差点に一時停止表示",
      "曲がり角にはミラーと回転灯",
      "場内制限速度8km/h以下",
      "始業前点検を実施し記録",
    ],
    keywords: ["倉庫", "歩行者", "出庫", "歩車分離"],
    source: MHLW,
  },
  {
    id: "tr-fork-002",
    industry: "transport",
    workType: "forklift",
    title: "屋外ヤード雨天時のパレット移動",
    hazards: [
      "路面スリップ",
      "ブレーキ距離増加",
      "視界不良",
    ],
    risks: [
      "フォーク横転",
      "歩行者衝突",
    ],
    countermeasures: [
      "雨天時は速度を半減",
      "視界確保のためマスト下げて低速走行",
      "前照灯・回転灯を常時点灯",
      "排水勾配の悪い場所には水たまり表示",
    ],
    keywords: ["雨天", "屋外", "スリップ", "視界"],
    source: GENERAL,
  },
  {
    id: "tr-fork-003",
    industry: "transport",
    workType: "forklift",
    title: "トラック荷台へのパレット積込み",
    hazards: [
      "車両逸走",
      "ドックレベラー誤操作",
      "荷の偏荷重",
    ],
    risks: [
      "フォーク転落",
      "車両との挟まれ",
    ],
    countermeasures: [
      "輪止め必須・駐車ブレーキ確認",
      "ドックレベラーのロック状態を毎回確認",
      "荷の偏荷重は事前に修正",
      "誘導者の合図を統一",
    ],
    keywords: ["積込み", "ドックレベラー", "輪止め", "偏荷重"],
    source: JISHA,
  },

  // ── 掘削 (excavation) × 3 ──────────────────────────────────
  {
    id: "tr-exc-001",
    industry: "transport",
    workType: "excavation",
    title: "営業所敷地内の地下油タンク交換",
    hazards: [
      "残留油による引火",
      "土砂崩壊",
      "酸欠",
    ],
    risks: [
      "火災・爆発",
      "崩壊埋没",
      "酸欠事故",
    ],
    countermeasures: [
      "事前にタンク内残油除去と不活性ガス置換",
      "土止め支保工を設置",
      "可燃ガス・酸素濃度を常時測定",
      "火気使用禁止区域を表示",
    ],
    keywords: ["地下タンク", "油", "防爆", "酸欠"],
    source: GENERAL,
  },
  {
    id: "tr-exc-002",
    industry: "transport",
    workType: "excavation",
    title: "倉庫床面下の配管メンテナンス用ピット掘削",
    hazards: [
      "周辺床の沈下",
      "重機振動による棚への影響",
      "粉じん発生",
    ],
    risks: [
      "棚倒壊",
      "粉じん吸入",
    ],
    countermeasures: [
      "倉庫稼働を停止または隔離区画化",
      "重機振動の影響範囲を事前評価",
      "粉じん抑制のため湿潤散水",
      "棚は仮固定または一時撤去",
    ],
    keywords: ["倉庫", "ピット", "沈下", "粉じん"],
    source: GENERAL,
  },
  {
    id: "tr-exc-003",
    industry: "transport",
    workType: "excavation",
    title: "車両用ピットでの整備作業",
    hazards: [
      "ピットへの転落",
      "排ガスの滞留",
      "工具・部品の落下",
    ],
    risks: [
      "転落骨折",
      "一酸化炭素中毒",
    ],
    countermeasures: [
      "ピット周囲に手すり・蓋を設置",
      "ピット内換気装置を稼働",
      "工具落下防止用トレイを使用",
      "出入口位置を表示し階段は両側手すり",
    ],
    keywords: ["整備ピット", "排ガス", "転落", "換気"],
    source: GENERAL,
  },

  // ── 溶接 (welding) × 3 ─────────────────────────────────────
  {
    id: "tr-weld-001",
    industry: "transport",
    workType: "welding",
    title: "トラック荷台・あおりの補修溶接",
    hazards: [
      "スパッタによる火災",
      "燃料タンク近接",
      "ヒューム吸入",
    ],
    risks: [
      "車両火災",
      "じん肺",
    ],
    countermeasures: [
      "燃料系統を遮断・排出してから着手",
      "周囲5m以内の可燃物撤去と消火器配置",
      "電動ファン付き呼吸用保護具を着用",
      "車検対応の整備工場で実施",
    ],
    keywords: ["トラック", "あおり", "溶接", "火災"],
    source: GENERAL,
  },
  {
    id: "tr-weld-002",
    industry: "transport",
    workType: "welding",
    title: "コンテナ補修溶接（屋内整備工場）",
    hazards: [
      "コンテナ内の閉所作業",
      "残留物の引火",
      "酸欠",
    ],
    risks: [
      "火災・爆発",
      "酸欠事故",
    ],
    countermeasures: [
      "コンテナ内の残留物確認と換気",
      "可燃物・残留液の事前除去",
      "酸素濃度を測定し送気マスクを使用",
      "監視人を外部に配置",
    ],
    keywords: ["コンテナ", "閉所", "酸欠", "換気"],
    source: MHLW,
  },
  {
    id: "tr-weld-003",
    industry: "transport",
    workType: "welding",
    title: "フォークリフト爪の溶接補強",
    hazards: [
      "高温部の残熱",
      "アーク光",
      "周辺燃料系への引火",
    ],
    risks: [
      "火傷",
      "フォーク強度低下による業務災害",
    ],
    countermeasures: [
      "メーカー承認の溶接手順以外は禁止",
      "周辺バッテリー・燃料系を取り外し",
      "溶接後は強度試験を実施",
      "遮光面・防護衣を着用",
    ],
    keywords: ["フォーク", "爪", "溶接補強", "強度"],
    source: GENERAL,
  },

  // ── 玉掛け (rigging) × 3 ───────────────────────────────────
  {
    id: "tr-rig-001",
    industry: "transport",
    workType: "rigging",
    title: "コンテナのクレーン積卸し",
    hazards: [
      "スプレッダのロックピン未挿入",
      "強風による振れ",
      "下方作業員の立入",
    ],
    risks: [
      "コンテナ落下",
      "重大災害",
    ],
    countermeasures: [
      "ツイストロックの結合確認を作業者が目視",
      "風速15m/s超は作業中止",
      "吊り荷下立入禁止区域を明示",
      "合図者と運転者は無線で連絡",
    ],
    keywords: ["コンテナ", "スプレッダ", "ツイストロック", "強風"],
    source: GENERAL,
  },
  {
    id: "tr-rig-002",
    industry: "transport",
    workType: "rigging",
    title: "トラック荷台への鋼材吊り込み",
    hazards: [
      "玉掛け位置のずれによる片吊り",
      "荷の振れ",
      "荷台上作業者との接触",
    ],
    risks: [
      "落下・激突",
      "荷台上作業者の被災",
    ],
    countermeasures: [
      "重心マーキングと正規玉掛け位置を統一",
      "介錯ロープで振れを制御",
      "荷台上作業者は退避し下ろし完了を確認",
      "合図者を1名固定",
    ],
    keywords: ["トラック", "鋼材", "片吊り", "介錯"],
    source: JISHA,
  },
  {
    id: "tr-rig-003",
    industry: "transport",
    workType: "rigging",
    title: "コイル・ロール状貨物の玉掛け",
    hazards: [
      "丸物のすべり",
      "玉掛けワイヤーの摩耗",
      "重心ずれ",
    ],
    risks: [
      "落下・転がり事故",
      "周辺設備損傷",
    ],
    countermeasures: [
      "コイル専用クランプ（Cフック等）を使用",
      "丸物には滑り止めスリングを併用",
      "重心マーキングを荷主側に依頼",
      "玉掛け技能講習修了者のみ実施",
    ],
    keywords: ["コイル", "丸物", "Cフック", "玉掛け"],
    source: GENERAL,
  },

  // ── その他 (other) × 3 ────────────────────────────────────
  {
    id: "tr-other-001",
    industry: "transport",
    workType: "other",
    title: "長距離運転の過労・居眠り対策",
    hazards: [
      "連続運転時間超過",
      "夜間運転時の眠気",
      "睡眠時無呼吸症候群（SAS）",
    ],
    risks: [
      "居眠り運転事故",
      "重大交通災害",
    ],
    countermeasures: [
      "4時間ごとに30分以上の休憩を取得",
      "出発前にアルコール検知と健康確認",
      "SAS検診を全運転者に実施",
      "デジタコ・ドラレコで運行状況を可視化",
    ],
    keywords: ["長距離", "過労", "居眠り", "SAS"],
    source: GENERAL,
  },
  {
    id: "tr-other-002",
    industry: "transport",
    workType: "other",
    title: "配送先での犬等動物・カスハラ対応",
    hazards: [
      "放し飼い犬による咬傷",
      "顧客からの暴言・暴力",
      "単独訪問でのリスク",
    ],
    risks: [
      "咬傷・狂犬病リスク",
      "メンタル不調",
    ],
    countermeasures: [
      "事前情報共有（過去トラブル先のフラグ化）",
      "犬がいる場合は門外で待機しインターホン対応",
      "暴言録音可能なボディカメラを携行",
      "カスハラ対応マニュアルと相談窓口を整備",
    ],
    keywords: ["カスハラ", "犬", "咬傷", "単独訪問"],
    source: GENERAL,
  },
  {
    id: "tr-other-003",
    industry: "transport",
    workType: "other",
    title: "夏季配送車内の熱中症対策",
    hazards: [
      "車内高温（40℃超）",
      "冷房効率低下",
      "水分補給不足",
    ],
    risks: [
      "熱射病",
      "意識障害による事故",
    ],
    countermeasures: [
      "経口補水液・塩飴を車両備品とする",
      "車内温度計でモニタリング",
      "WBGT基準で休憩頻度を増加",
      "ファン付き作業着・クールベストを支給",
    ],
    keywords: ["熱中症", "車内", "WBGT", "配送"],
    source: MHLW,
  },
];
