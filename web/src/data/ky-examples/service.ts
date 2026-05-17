import type { KyExample } from "@/types/ky-example";

const MHLW: KyExample["source"] = {
  category: "mhlw",
  label: "厚生労働省「第三次産業の労働災害防止」",
};
const JISHA: KyExample["source"] = {
  category: "jisha",
  label: "中災防「ゼロ災運動 KY実施例（小売・サービス）」",
};
const GENERAL: KyExample["source"] = {
  category: "general",
  label: "一般公開の安全衛生教育資料",
};

export const SERVICE_EXAMPLES: KyExample[] = [
  // ── 高所作業 (fall-work) × 3 ──────────────────────────────
  {
    id: "sv-fall-001",
    industry: "service",
    workType: "fall-work",
    title: "店舗内品出し（高所棚・脚立使用）",
    hazards: [
      "脚立天板に乗る",
      "通路でのお客様接触",
      "床面の水濡れによる脚立不安定",
    ],
    risks: [
      "脚立転倒・墜落",
      "お客様の二次被災",
    ],
    countermeasures: [
      "脚立は天板2段下まで",
      "周囲を区画し通路を制限",
      "床面の水濡れは即時除去",
      "可能なら踏み台や安全囲い付き作業台に置換",
    ],
    keywords: ["店舗", "品出し", "脚立", "お客様"],
    source: MHLW,
  },
  {
    id: "sv-fall-002",
    industry: "service",
    workType: "fall-work",
    title: "外壁ガラス・看板清掃（ロープ高所作業）",
    hazards: [
      "メインロープ・ライフラインの劣化",
      "中継器具の取付不良",
      "強風での煽り",
    ],
    risks: [
      "墜落事故",
      "重大災害",
    ],
    countermeasures: [
      "メインロープとライフラインを独立して2本設置",
      "ロープ高所作業特別教育修了者のみ",
      "作業前にロープ・器具点検チェックリスト",
      "風速10m/s超で中止",
    ],
    keywords: ["ロープ高所", "ビル清掃", "ライフライン", "風速"],
    source: MHLW,
  },
  {
    id: "sv-fall-003",
    industry: "service",
    workType: "fall-work",
    title: "ホテル・宴会場の高所装飾設置",
    hazards: [
      "脚立・足場の不安定",
      "重量装飾の落下",
      "天井設備との干渉",
    ],
    risks: [
      "墜落事故",
      "装飾落下",
    ],
    countermeasures: [
      "可搬式作業台または足場を使用",
      "装飾の取付金具を耐荷重表示と照合",
      "天井設備（スプリンクラー等）への干渉確認",
      "2人作業＋スポッター配置",
    ],
    keywords: ["ホテル", "装飾", "作業台", "天井"],
    source: GENERAL,
  },

  // ── 重量物運搬 (heavy-load) × 3 ────────────────────────────
  {
    id: "sv-heavy-001",
    industry: "service",
    workType: "heavy-load",
    title: "スーパー・コンビニのバックヤード入荷作業",
    hazards: [
      "ケースの繰返し持ち上げ",
      "段差・スロープでの台車操作",
      "通路の整理不良",
    ],
    risks: [
      "腰痛",
      "つまずき転倒",
    ],
    countermeasures: [
      "20kg超は台車運搬を必須化",
      "腰痛予防体操を始業前に実施",
      "バックヤード通路の整理整頓",
      "腰部保護ベルトの支給",
    ],
    keywords: ["スーパー", "バックヤード", "腰痛", "台車"],
    source: MHLW,
  },
  {
    id: "sv-heavy-002",
    industry: "service",
    workType: "heavy-load",
    title: "ホテル・旅館での宴会備品・布団搬送",
    hazards: [
      "中腰での繰返し動作",
      "エレベーター乗降時の段差",
      "階段運搬での躓き",
    ],
    risks: [
      "腰痛・転倒骨折",
      "備品落下",
    ],
    countermeasures: [
      "専用台車・布団リフトを使用",
      "階段運搬時は2人体制",
      "腰痛予防教育とサポーター支給",
      "通路・エレベーター段差を解消",
    ],
    keywords: ["ホテル", "布団", "宴会", "腰痛"],
    source: GENERAL,
  },
  {
    id: "sv-heavy-003",
    industry: "service",
    workType: "heavy-load",
    title: "クリーニング店での洗濯物搬送・仕分け",
    hazards: [
      "大量洗濯物の集中持ち上げ",
      "湿潤衣類の重量増加",
      "繰返し作業による疲労",
    ],
    risks: [
      "腰痛・肩腱板障害",
      "つまずき転倒",
    ],
    countermeasures: [
      "20kg超は台車・コンベヤを使用",
      "腰痛予防体操を始業前に実施",
      "作業ローテーションで負荷分散",
      "整理整頓された動線確保",
    ],
    keywords: ["クリーニング", "洗濯物", "腰痛", "ローテーション"],
    source: JISHA,
  },

  // ── 機械操作 (machine) × 3 ─────────────────────────────────
  {
    id: "sv-machine-001",
    industry: "service",
    workType: "machine",
    title: "飲食店厨房での調理機械操作",
    hazards: [
      "ミキサー・スライサーの回転部接触",
      "押し込み時の手指挟まれ",
      "ガード取外し作業",
    ],
    risks: [
      "手指切断・切創",
      "重度負傷",
    ],
    countermeasures: [
      "押し棒の必須使用",
      "ガード取外しは電源遮断後",
      "新人は手順書教育完了後に操作",
      "切れ味の悪い刃の早期交換",
    ],
    keywords: ["飲食", "厨房", "スライサー", "押し棒"],
    source: MHLW,
  },
  {
    id: "sv-machine-002",
    industry: "service",
    workType: "machine",
    title: "コインランドリー・大型洗濯機の保守",
    hazards: [
      "回転ドラムへの接触",
      "電源未遮断状態の整備",
      "高温・蒸気曝露",
    ],
    risks: [
      "巻き込まれ災害",
      "熱傷",
    ],
    countermeasures: [
      "整備前に主電源を遮断・施錠",
      "ドラム停止後の余熱冷却を確認",
      "メーカー指定手順書を遵守",
      "始動前指差呼称",
    ],
    keywords: ["洗濯機", "保守", "LOTO", "ドラム"],
    source: GENERAL,
  },
  {
    id: "sv-machine-003",
    industry: "service",
    workType: "machine",
    title: "美容室・理容室でのバリカン・カッター操作",
    hazards: [
      "刃の摩耗による不具合",
      "湿潤環境での感電",
      "繰返し作業の手首障害",
    ],
    risks: [
      "切創",
      "感電",
      "腱鞘炎",
    ],
    countermeasures: [
      "刃物点検と定期交換",
      "湿潤エリアでは絶縁・防滴機器を使用",
      "ストレッチと作業ローテーション",
      "整理整頓された動線",
    ],
    keywords: ["美容室", "バリカン", "腱鞘炎", "絶縁"],
    source: GENERAL,
  },

  // ── 電気作業 (electrical) × 3 ──────────────────────────────
  {
    id: "sv-elec-001",
    industry: "service",
    workType: "electrical",
    title: "店舗内照明・看板の電気保守",
    hazards: [
      "活線作業による感電",
      "脚立転倒",
      "夜間営業中の作業",
    ],
    risks: [
      "感電",
      "墜落",
    ],
    countermeasures: [
      "停電作業を原則化",
      "脚立は2段下まで・スポッター配置",
      "営業時間外の作業計画",
      "電気取扱業務特別教育修了者が実施",
    ],
    keywords: ["店舗", "照明", "看板", "感電"],
    source: GENERAL,
  },
  {
    id: "sv-elec-002",
    industry: "service",
    workType: "electrical",
    title: "ホテル・旅館客室の配線変更",
    hazards: [
      "活線接続",
      "他客室への影響",
      "アース不良",
    ],
    risks: [
      "感電",
      "宿泊客への影響",
    ],
    countermeasures: [
      "計画停止枠で実施",
      "対象区画のみブレーカー遮断",
      "アース・絶縁抵抗測定で確認",
      "客室占有状況を事前確認",
    ],
    keywords: ["ホテル", "客室", "配線", "アース"],
    source: GENERAL,
  },
  {
    id: "sv-elec-003",
    industry: "service",
    workType: "electrical",
    title: "屋外イベント設営での電源工事",
    hazards: [
      "雨天時の感電",
      "通路上のケーブル",
      "発電機からの一酸化炭素",
    ],
    risks: [
      "感電",
      "つまずき転倒",
      "一酸化炭素中毒",
    ],
    countermeasures: [
      "屋外接続部に防雨カバー",
      "通路横断部はケーブルプロテクター",
      "発電機は風通しの良い屋外に設置",
      "漏電遮断器を全系統に設置",
    ],
    keywords: ["屋外イベント", "発電機", "雨天", "CO"],
    source: GENERAL,
  },

  // ── 化学物質取扱 (chemical) × 3 ────────────────────────────
  {
    id: "sv-chem-001",
    industry: "service",
    workType: "chemical",
    title: "クリーニング店でのドライ溶剤取扱",
    hazards: [
      "有機溶剤蒸気の吸入",
      "皮膚接触",
      "火気近接での引火",
    ],
    risks: [
      "有機溶剤中毒",
      "火災",
    ],
    countermeasures: [
      "局所排気装置の作動を毎日確認",
      "防毒マスク・耐薬品手袋を着用",
      "火気使用禁止区域を表示",
      "SDSを掲示し定期教育",
    ],
    keywords: ["クリーニング", "ドライ溶剤", "防毒マスク", "SDS"],
    source: MHLW,
  },
  {
    id: "sv-chem-002",
    industry: "service",
    workType: "chemical",
    title: "ビル清掃での酸性・アルカリ性洗剤の取扱",
    hazards: [
      "誤混合による塩素ガス発生",
      "皮膚接触",
      "閉所での換気不足",
    ],
    risks: [
      "急性中毒",
      "化学熱傷",
    ],
    countermeasures: [
      "酸性とアルカリ性洗剤の混用厳禁を表示",
      "保護メガネ・耐薬品手袋・マスクを着用",
      "閉所では送風機による換気",
      "SDSの教育とこぼれ時手順を訓練",
    ],
    keywords: ["ビル清掃", "塩素ガス", "酸性", "アルカリ"],
    source: MHLW,
  },
  {
    id: "sv-chem-003",
    industry: "service",
    workType: "chemical",
    title: "美容室での薬剤（カラー剤・パーマ液）取扱",
    hazards: [
      "皮膚アレルギー",
      "アンモニア蒸気",
      "目への飛散",
    ],
    risks: [
      "接触性皮膚炎",
      "呼吸器障害",
    ],
    countermeasures: [
      "施術者用手袋・保護メガネを着用",
      "換気を確保し局所排気を併用",
      "SDS・成分表を共有し過敏症の事前確認",
      "アレルギー反応時の応急手順を整備",
    ],
    keywords: ["美容室", "カラー剤", "パーマ", "皮膚炎"],
    source: GENERAL,
  },

  // ── フォークリフト (forklift) × 3 ──────────────────────────
  {
    id: "sv-fork-001",
    industry: "service",
    workType: "forklift",
    title: "ホームセンター・大型店舗バックヤード荷役",
    hazards: [
      "来店客との接触",
      "曲がり角の見通し不良",
      "段差での荷崩れ",
    ],
    risks: [
      "来店客との衝突",
      "荷崩れ",
    ],
    countermeasures: [
      "営業時間内のフォーク使用エリアを区画化",
      "ミラー・回転灯を曲がり角に設置",
      "速度8km/h以下に制限",
      "誘導者の合図統一",
    ],
    keywords: ["ホームセンター", "来店客", "区画", "ミラー"],
    source: GENERAL,
  },
  {
    id: "sv-fork-002",
    industry: "service",
    workType: "forklift",
    title: "屋外駐車場・搬入口でのトラック荷役",
    hazards: [
      "車両逸走",
      "ドックレベラー誤操作",
      "歩行客の侵入",
    ],
    risks: [
      "フォーク転落",
      "歩行客との接触",
    ],
    countermeasures: [
      "輪止め・駐車ブレーキ確認",
      "ドックレベラーのロック確認",
      "搬入口は立入禁止表示と警備員配置",
      "誘導者の合図統一",
    ],
    keywords: ["搬入口", "ドックレベラー", "輪止め", "警備"],
    source: JISHA,
  },
  {
    id: "sv-fork-003",
    industry: "service",
    workType: "forklift",
    title: "イベント会場での資材搬入フォーク作業",
    hazards: [
      "来場者との接触",
      "仮設構造物への接触",
      "急な進路変更",
    ],
    risks: [
      "来場者との衝突",
      "構造物損傷",
    ],
    countermeasures: [
      "搬入時間帯を非開場時間に限定",
      "進路を事前計画し警備員配置",
      "速度8km/h以下・徐行モード",
      "始業前点検と運転者の資格確認",
    ],
    keywords: ["イベント", "搬入", "警備", "徐行"],
    source: GENERAL,
  },

  // ── 掘削 (excavation) × 3 ──────────────────────────────────
  {
    id: "sv-exc-001",
    industry: "service",
    workType: "excavation",
    title: "店舗外構の植栽・配管埋設工事",
    hazards: [
      "既設埋設物損傷",
      "通行客の侵入",
      "土砂崩壊",
    ],
    risks: [
      "停電・断水",
      "通行客の被災",
    ],
    countermeasures: [
      "事前に図面・探査機で埋設物確認",
      "工事区画をバリケードで囲い迂回路表示",
      "深さ1.5m超は土止め支保工",
      "警備員配置と案内表示",
    ],
    keywords: ["店舗", "外構", "埋設管", "警備"],
    source: GENERAL,
  },
  {
    id: "sv-exc-002",
    industry: "service",
    workType: "excavation",
    title: "ホテル・旅館の浴場配管メンテナンス用掘削",
    hazards: [
      "硫化水素・酸欠",
      "高温配管接触",
      "土砂崩壊",
    ],
    risks: [
      "酸欠・中毒",
      "熱傷",
    ],
    countermeasures: [
      "事前ガス測定と換気",
      "高温配管は冷却後に作業",
      "土止め支保工を設置",
      "酸欠等危険作業主任者を選任",
    ],
    keywords: ["浴場", "配管", "硫化水素", "高温"],
    source: MHLW,
  },
  {
    id: "sv-exc-003",
    industry: "service",
    workType: "excavation",
    title: "屋外イベントでの仮設構造物基礎掘削",
    hazards: [
      "来場者の立入",
      "夜間の視認低下",
      "既設埋設物損傷",
    ],
    risks: [
      "来場者の転落",
      "停電・通信不通",
    ],
    countermeasures: [
      "工事区画を全周バリケード＋警告灯",
      "事前に埋設物確認",
      "夜間は警備員と照明配置",
      "完了後は速やかに養生・埋戻し",
    ],
    keywords: ["イベント", "仮設", "夜間", "警備"],
    source: GENERAL,
  },

  // ── 溶接 (welding) × 3 ─────────────────────────────────────
  {
    id: "sv-weld-001",
    industry: "service",
    workType: "welding",
    title: "店舗看板・什器の補修溶接",
    hazards: [
      "スパッタによる火災",
      "通行客への火花飛散",
      "ヒューム吸入",
    ],
    risks: [
      "店舗火災",
      "通行客火傷",
    ],
    countermeasures: [
      "溶接遮へい囲いで通行帯を分離",
      "周囲5m以内可燃物撤去・消火器配置",
      "電動ファン付き呼吸用保護具",
      "営業時間外の作業計画",
    ],
    keywords: ["看板", "什器", "通行客", "遮へい"],
    source: GENERAL,
  },
  {
    id: "sv-weld-002",
    industry: "service",
    workType: "welding",
    title: "厨房ダクト・排気フードの補修溶接",
    hazards: [
      "ダクト内残留油の引火",
      "酸欠（閉所）",
      "アーク光",
    ],
    risks: [
      "厨房火災",
      "酸欠",
    ],
    countermeasures: [
      "事前にダクト内清掃・油除去",
      "酸素濃度を測定し送風機で換気",
      "周囲可燃物撤去・消火器配置",
      "火気使用許可と監視人配置",
    ],
    keywords: ["厨房ダクト", "残留油", "酸欠", "換気"],
    source: MHLW,
  },
  {
    id: "sv-weld-003",
    industry: "service",
    workType: "welding",
    title: "イベント仮設ステージの溶接組立",
    hazards: [
      "スパッタによる火災",
      "高所での溶接作業",
      "来場者への火花",
    ],
    risks: [
      "火災",
      "墜落",
      "来場者被災",
    ],
    countermeasures: [
      "溶接遮へい囲いで分離",
      "高所作業は親綱＋フルハーネス",
      "営業前時間帯に限定",
      "消火器・水バケツを常備",
    ],
    keywords: ["仮設ステージ", "イベント", "高所溶接", "遮へい"],
    source: GENERAL,
  },

  // ── 玉掛け (rigging) × 3 ───────────────────────────────────
  {
    id: "sv-rig-001",
    industry: "service",
    workType: "rigging",
    title: "屋外大型看板の設置・撤去",
    hazards: [
      "強風による振れ",
      "下方歩行者の立入",
      "玉掛け位置のずれ",
    ],
    risks: [
      "落下事故",
      "歩行者被災",
    ],
    countermeasures: [
      "風速10m/s超で作業中止",
      "下方立入禁止区域を警備員で確保",
      "重心マーキングと正規玉掛け位置",
      "合図者を1名固定",
    ],
    keywords: ["大型看板", "風速", "警備", "重心"],
    source: GENERAL,
  },
  {
    id: "sv-rig-002",
    industry: "service",
    workType: "rigging",
    title: "イベント機材（照明トラス等）の吊り込み",
    hazards: [
      "つり点の摩耗",
      "観客席への落下",
      "重心ずれ",
    ],
    risks: [
      "落下事故",
      "観客被災",
    ],
    countermeasures: [
      "つり点（シャックル等）を作業前点検",
      "観客入場前に作業完了",
      "重心マーキング・専用治具を使用",
      "玉掛け技能講習修了者のみ実施",
    ],
    keywords: ["照明", "トラス", "観客", "シャックル"],
    source: GENERAL,
  },
  {
    id: "sv-rig-003",
    industry: "service",
    workType: "rigging",
    title: "ホテル屋外プール・設備のクレーン搬入",
    hazards: [
      "強風による振れ",
      "宿泊客の立入",
      "建物との干渉",
    ],
    risks: [
      "落下・転倒",
      "宿泊客被災",
    ],
    countermeasures: [
      "風速10m/s超で中止",
      "立入禁止区域を警備員配置で明示",
      "建物との離隔3m以上を確保",
      "合図者と運転者は無線連絡",
    ],
    keywords: ["ホテル", "プール", "宿泊客", "警備"],
    source: GENERAL,
  },

  // ── その他 (other) × 3 ────────────────────────────────────
  {
    id: "sv-other-001",
    industry: "service",
    workType: "other",
    title: "接客業のカスタマーハラスメント対応",
    hazards: [
      "顧客からの暴言・暴力",
      "長時間対応によるメンタル疲弊",
      "単独対応",
    ],
    risks: [
      "従業員のメンタル不調",
      "離職",
    ],
    countermeasures: [
      "カスハラ対応マニュアル・録音録画機器を整備",
      "複数名対応の体制と上司エスカレーション",
      "発生後のケア（産業医・カウンセラー）",
      "悪質事例は警察相談",
    ],
    keywords: ["カスハラ", "接客", "メンタル", "上司"],
    source: MHLW,
  },
  {
    id: "sv-other-002",
    industry: "service",
    workType: "other",
    title: "深夜営業店舗での強盗・防犯対策",
    hazards: [
      "深夜単独勤務",
      "現金取扱",
      "外部からの侵入",
    ],
    risks: [
      "強盗被害",
      "身体的危害",
    ],
    countermeasures: [
      "夜間は最低2名体制",
      "防犯カメラ・非常通報装置の設置",
      "現金少額化（売上即時入金）",
      "施錠・巡回手順の徹底",
    ],
    keywords: ["深夜", "強盗", "防犯", "現金"],
    source: GENERAL,
  },
  {
    id: "sv-other-003",
    industry: "service",
    workType: "other",
    title: "ビル清掃の長時間立ち・反復作業",
    hazards: [
      "立ち姿勢の長時間継続",
      "床清掃時の中腰反復",
      "化学薬品との接触",
    ],
    risks: [
      "下肢静脈瘤",
      "腰痛",
      "皮膚障害",
    ],
    countermeasures: [
      "立ち作業マットを使用し疲労軽減",
      "ストレッチと作業ローテーション",
      "保護手袋・耐薬品エプロン着用",
      "産業医面談で健康状態を把握",
    ],
    keywords: ["ビル清掃", "立ち作業", "腰痛", "ローテーション"],
    source: GENERAL,
  },
];
