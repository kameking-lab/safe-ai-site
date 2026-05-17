import type { KyExample } from "@/types/ky-example";

const MHLW: KyExample["source"] = {
  category: "mhlw",
  label: "厚生労働省「医療・介護現場の安全衛生」",
};
const JISHA: KyExample["source"] = {
  category: "jisha",
  label: "中災防「ゼロ災運動 KY実施例（医療・福祉）」",
};
const GENERAL: KyExample["source"] = {
  category: "general",
  label: "一般公開の医療・介護安全衛生資料",
};

export const MEDICAL_WELFARE_EXAMPLES: KyExample[] = [
  // ── 高所作業 (fall-work) × 3 ──────────────────────────────
  {
    id: "mw-fall-001",
    industry: "medical-welfare",
    workType: "fall-work",
    title: "病棟内点滴ポール・高所棚整理（脚立使用）",
    hazards: [
      "脚立天板への登り",
      "病棟通路で患者と接触",
      "脚立直近を歩行者が通過",
    ],
    risks: [
      "脚立転倒で職員が墜落",
      "患者の二次被災",
    ],
    countermeasures: [
      "天板2段下まで作業に限定",
      "脚立使用中は周囲を区画し患者通行を一時制限",
      "可能な範囲で踏み台・可搬作業台に置換",
      "1人作業を避けスポッターを配置",
    ],
    keywords: ["病棟", "脚立", "点滴ポール", "患者"],
    source: GENERAL,
  },
  {
    id: "mw-fall-002",
    industry: "medical-welfare",
    workType: "fall-work",
    title: "施設屋上設備（給湯・換気）の保守巡回",
    hazards: [
      "屋上端部での墜落",
      "勾配屋根の踏み外し",
      "強風で姿勢を崩す",
    ],
    risks: [
      "屋上からの墜落事故",
      "重大災害",
    ],
    countermeasures: [
      "屋上端部に手すりまたは親綱を設置",
      "雨天・強風時の中止基準を運用",
      "フルハーネス着用と監視人配置",
      "屋上巡回ルートを表示",
    ],
    keywords: ["屋上", "保守", "親綱", "屋根"],
    source: GENERAL,
  },
  {
    id: "mw-fall-003",
    industry: "medical-welfare",
    workType: "fall-work",
    title: "天井裏設備（医療ガス配管等）の点検",
    hazards: [
      "天井点検口からの墜落",
      "脚立転倒",
      "酸欠空間（密閉天井裏）",
    ],
    risks: [
      "墜落骨折",
      "酸欠事故",
    ],
    countermeasures: [
      "脚立は2人作業でスポッター配置",
      "天井点検口に転落防止カバーを併用",
      "酸欠が想定される空間は事前に換気・酸素濃度測定",
      "ヘルメット着用",
    ],
    keywords: ["天井裏", "点検口", "脚立", "医療ガス"],
    source: GENERAL,
  },

  // ── 重量物運搬 (heavy-load) × 3 ────────────────────────────
  {
    id: "mw-heavy-001",
    industry: "medical-welfare",
    workType: "heavy-load",
    title: "ベッドから車椅子への移乗介助",
    hazards: [
      "中腰姿勢の繰返し",
      "患者の急な体動",
      "床面のぬれ・滑り",
    ],
    risks: [
      "介護者の腰痛・椎間板障害",
      "患者の転倒・骨折",
    ],
    countermeasures: [
      "ノーリフトポリシーを徹底しスライディングボード使用",
      "リフト・天井走行リフトの導入",
      "2人介助を原則化",
      "腰痛予防体操とサポーター支給",
    ],
    keywords: ["移乗", "ノーリフト", "腰痛", "スライディングボード"],
    source: MHLW,
  },
  {
    id: "mw-heavy-002",
    industry: "medical-welfare",
    workType: "heavy-load",
    title: "入浴介助（リフト浴・チェア浴）",
    hazards: [
      "浴室床滑り",
      "湯温管理不足での熱傷",
      "リフト機器の操作ミス",
    ],
    risks: [
      "職員・利用者の転倒",
      "熱傷",
    ],
    countermeasures: [
      "浴室には滑り止めマットを敷設",
      "湯温は40℃以下を介助者の手で確認",
      "リフト機器の点検と操作教育を徹底",
      "複数名での介助体制を確保",
    ],
    keywords: ["入浴介助", "リフト浴", "熱傷", "ノーリフト"],
    source: JISHA,
  },
  {
    id: "mw-heavy-003",
    industry: "medical-welfare",
    workType: "heavy-load",
    title: "ストレッチャー搬送（救急部・手術部）",
    hazards: [
      "段差・エレベーター乗降での衝撃",
      "急ブレーキで患者転落",
      "ストレッチャー操作の握り損ね",
    ],
    risks: [
      "患者の二次外傷",
      "介護者の腰痛",
    ],
    countermeasures: [
      "ストレッチャーは2人搬送を原則化",
      "段差では速度を落とし患者を保持",
      "ベルト・サイドレールで患者固定",
      "搬送ルートを事前確認し整理整頓",
    ],
    keywords: ["ストレッチャー", "搬送", "段差", "ベルト"],
    source: GENERAL,
  },

  // ── 機械操作 (machine) × 3 ─────────────────────────────────
  {
    id: "mw-machine-001",
    industry: "medical-welfare",
    workType: "machine",
    title: "電動ベッド・電動車椅子の保守整備",
    hazards: [
      "可動部への挟まれ",
      "誤起動",
      "感電",
    ],
    risks: [
      "手指の挟まれ・骨折",
      "感電",
    ],
    countermeasures: [
      "整備前に電源を遮断・施錠",
      "可動部にはガード・センサ式停止",
      "メーカー指定手順書を遵守",
      "始動前指差呼称",
    ],
    keywords: ["電動ベッド", "車椅子", "保守", "施錠"],
    source: GENERAL,
  },
  {
    id: "mw-machine-002",
    industry: "medical-welfare",
    workType: "machine",
    title: "厨房での食材スライサー・ミキサー操作",
    hazards: [
      "回転刃への接触",
      "押し込み時の手指挟まれ",
      "ガード取外し作業",
    ],
    risks: [
      "手指の切断・切創",
      "重度負傷",
    ],
    countermeasures: [
      "刃物機器は専用押し棒を必須使用",
      "ガード取外しは電源遮断・抜栓後",
      "新人は作業手順書教育を完了後に操作",
      "切れ味の悪い刃は早期交換",
    ],
    keywords: ["厨房", "スライサー", "回転刃", "押し棒"],
    source: MHLW,
  },
  {
    id: "mw-machine-003",
    industry: "medical-welfare",
    workType: "machine",
    title: "MRI・CT等の医療機器周辺作業",
    hazards: [
      "強磁場による金属物の吸着",
      "電磁波曝露",
      "造影剤の漏えい",
    ],
    risks: [
      "金属物吸着による傷害",
      "造影剤接触",
    ],
    countermeasures: [
      "MRI室内に持ち込む物品の磁性チェックを徹底",
      "造影剤取扱は保護具と緊急対応手順を整備",
      "操作者は専門教育修了者",
      "ペースメーカー装着者の入室禁止表示",
    ],
    keywords: ["MRI", "CT", "強磁場", "造影剤"],
    source: GENERAL,
  },

  // ── 電気作業 (electrical) × 3 ──────────────────────────────
  {
    id: "mw-elec-001",
    industry: "medical-welfare",
    workType: "electrical",
    title: "医療機器（人工呼吸器・除細動器等）の電源工事",
    hazards: [
      "活線作業による感電",
      "予期せぬ停電による医療事故",
      "アース不良",
    ],
    risks: [
      "感電",
      "患者の生命リスク",
    ],
    countermeasures: [
      "工事前に診療部門と停止計画を協議",
      "UPS・予備電源の動作確認",
      "電気主任技術者の立会い",
      "アース・絶縁抵抗測定を実施",
    ],
    keywords: ["医療機器", "停電", "UPS", "電気主任"],
    source: GENERAL,
  },
  {
    id: "mw-elec-002",
    industry: "medical-welfare",
    workType: "electrical",
    title: "病室コンセント増設・配線工事",
    hazards: [
      "活線接続による感電",
      "夜間照明不足",
      "患者・家族との接触",
    ],
    risks: [
      "感電",
      "工事中の患者事故",
    ],
    countermeasures: [
      "停電作業を原則化し患者影響を最小化",
      "工事区画を仕切りで明示し立入制限",
      "工事時間帯を昼間に限定",
      "工事後は絶縁抵抗測定で確認",
    ],
    keywords: ["病室", "コンセント", "配線", "立入制限"],
    source: GENERAL,
  },
  {
    id: "mw-elec-003",
    industry: "medical-welfare",
    workType: "electrical",
    title: "ナースコール・通信配線の保守",
    hazards: [
      "天井裏での高所作業",
      "弱電配線と動力配線の混触",
      "病室稼働中の作業",
    ],
    risks: [
      "墜落",
      "通信不通による医療事故",
    ],
    countermeasures: [
      "高所作業は脚立2段下まで・スポッター配置",
      "弱電と動力の混触防止のため配線セパレータを使用",
      "保守は計画停止枠で実施",
      "予備通信手段を作業中に確保",
    ],
    keywords: ["ナースコール", "通信", "天井裏", "計画停止"],
    source: GENERAL,
  },

  // ── 化学物質取扱 (chemical) × 3 ────────────────────────────
  {
    id: "mw-chem-001",
    industry: "medical-welfare",
    workType: "chemical",
    title: "院内消毒（次亜塩素酸ナトリウム等）作業",
    hazards: [
      "塩素ガス発生（酸性洗剤との混合）",
      "皮膚・粘膜への接触",
      "換気不足",
    ],
    risks: [
      "急性中毒",
      "化学熱傷",
    ],
    countermeasures: [
      "酸性洗剤との混用厳禁を表示",
      "保護メガネ・耐薬品手袋・マスクを着用",
      "換気を確保し閉所では局所排気",
      "SDSを共有しこぼれ時の処理手順を明文化",
    ],
    keywords: ["次亜塩素酸", "塩素ガス", "消毒", "SDS"],
    source: MHLW,
  },
  {
    id: "mw-chem-002",
    industry: "medical-welfare",
    workType: "chemical",
    title: "ホルマリン・グルタラール等の検体・器具消毒",
    hazards: [
      "蒸気吸入",
      "皮膚接触",
      "発がん性物質曝露",
    ],
    risks: [
      "呼吸器・皮膚障害",
      "長期曝露による発がん",
    ],
    countermeasures: [
      "局所排気装置付きキャビネット内で取扱",
      "防毒マスク・耐薬品手袋・保護衣を着用",
      "作業環境測定（特定化学物質）を実施",
      "代替消毒法（蒸気滅菌等）への置換を検討",
    ],
    keywords: ["ホルマリン", "グルタラール", "発がん性", "局所排気"],
    source: MHLW,
  },
  {
    id: "mw-chem-003",
    industry: "medical-welfare",
    workType: "chemical",
    title: "抗がん剤調製・投与時の曝露防止",
    hazards: [
      "薬剤エアロゾルの吸入",
      "皮膚・粘膜接触",
      "こぼれ時の二次曝露",
    ],
    risks: [
      "発がん・催奇形性リスク",
      "急性反応",
    ],
    countermeasures: [
      "バイオロジカルセーフティキャビネット内で調製",
      "閉鎖式調製器具（CSTD）を使用",
      "PPE（マスク・手袋・ガウン）の二重着用",
      "こぼれキットを常備しスピル手順を訓練",
    ],
    keywords: ["抗がん剤", "CSTD", "BSC", "PPE"],
    source: MHLW,
  },

  // ── フォークリフト (forklift) × 3 ──────────────────────────
  {
    id: "mw-fork-001",
    industry: "medical-welfare",
    workType: "forklift",
    title: "病院倉庫での医療物品搬送",
    hazards: [
      "歩行者との接触",
      "曲がり角の見通し不良",
      "段差での荷崩れ",
    ],
    risks: [
      "職員との衝突",
      "物品落下",
    ],
    countermeasures: [
      "歩車分離レーンを明示",
      "曲がり角にミラー設置",
      "速度8km/h以下に制限",
      "始業前点検記録",
    ],
    keywords: ["病院倉庫", "歩行者", "ミラー", "歩車分離"],
    source: GENERAL,
  },
  {
    id: "mw-fork-002",
    industry: "medical-welfare",
    workType: "forklift",
    title: "施設受入れトラックからの物資積み下ろし",
    hazards: [
      "車両逸走",
      "ドックレベラー誤操作",
      "荷の偏り",
    ],
    risks: [
      "フォーク転落",
      "車両との挟まれ",
    ],
    countermeasures: [
      "輪止め・駐車ブレーキ確認",
      "ドックレベラーのロック確認",
      "荷の偏荷重を事前修正",
      "誘導者の合図統一",
    ],
    keywords: ["受入", "ドックレベラー", "輪止め", "誘導"],
    source: JISHA,
  },
  {
    id: "mw-fork-003",
    industry: "medical-welfare",
    workType: "forklift",
    title: "院内リネン回収・清掃用カート移動",
    hazards: [
      "カート操作中の段差転倒",
      "見通し不良時の患者接触",
      "感染リネンからの曝露",
    ],
    risks: [
      "職員・患者の接触事故",
      "感染リスク",
    ],
    countermeasures: [
      "カート操作は低速・両手保持",
      "感染リネンは密閉袋＋専用カート",
      "PPE着用と手指衛生を徹底",
      "見通し悪い角は一時停止",
    ],
    keywords: ["リネン", "カート", "感染", "PPE"],
    source: GENERAL,
  },

  // ── 掘削 (excavation) × 3 ──────────────────────────────────
  {
    id: "mw-exc-001",
    industry: "medical-welfare",
    workType: "excavation",
    title: "施設敷地内の排水管・浄化槽周辺掘削",
    hazards: [
      "硫化水素・酸欠空気",
      "土砂崩壊",
      "感染性廃液の接触",
    ],
    risks: [
      "酸欠・中毒",
      "感染リスク",
    ],
    countermeasures: [
      "事前ガス測定（H2S・O2）",
      "土止め支保工を設置",
      "保護衣・保護メガネ着用",
      "酸欠等危険作業主任者を選任",
    ],
    keywords: ["浄化槽", "硫化水素", "酸欠", "土止め"],
    source: MHLW,
  },
  {
    id: "mw-exc-002",
    industry: "medical-welfare",
    workType: "excavation",
    title: "施設駐車場の配管埋設工事",
    hazards: [
      "車両通行と作業の交差",
      "既設埋設物（電気・通信）損傷",
      "通行者の転落",
    ],
    risks: [
      "通行者・車両の事故",
      "停電・通信不通",
    ],
    countermeasures: [
      "工事区画をバリケードで囲い迂回路を表示",
      "事前に図面・探査機で埋設物確認",
      "立入禁止区域に警備員配置",
      "夜間は警告灯で視認性確保",
    ],
    keywords: ["駐車場", "埋設管", "警備", "迂回"],
    source: GENERAL,
  },
  {
    id: "mw-exc-003",
    industry: "medical-welfare",
    workType: "excavation",
    title: "増築工事における基礎掘削（医療施設稼働中）",
    hazards: [
      "振動・騒音による患者影響",
      "粉じんの建物内侵入",
      "クレーン旋回半径内立入",
    ],
    risks: [
      "患者の体調影響",
      "重機接触事故",
    ],
    countermeasures: [
      "稼働時間帯と作業時間を調整",
      "粉じん抑制のため湿潤散水・防じんシート",
      "重機旋回半径内立入禁止表示",
      "施設管理者と作業計画を共有",
    ],
    keywords: ["増築", "粉じん", "振動", "病院"],
    source: GENERAL,
  },

  // ── 溶接 (welding) × 3 ─────────────────────────────────────
  {
    id: "mw-weld-001",
    industry: "medical-welfare",
    workType: "welding",
    title: "施設配管・厨房ダクトの補修溶接",
    hazards: [
      "スパッタによる火災",
      "酸素濃度低下（厨房・ダクト内）",
      "アーク光眼障害",
    ],
    risks: [
      "施設火災",
      "酸欠",
    ],
    countermeasures: [
      "周囲5m以内可燃物撤去・消火器配置",
      "ダクト内は換気と酸素測定を継続",
      "電動ファン付き呼吸用保護具",
      "火気使用許可と監視人配置",
    ],
    keywords: ["厨房ダクト", "配管", "スパッタ", "酸欠"],
    source: MHLW,
  },
  {
    id: "mw-weld-002",
    industry: "medical-welfare",
    workType: "welding",
    title: "施設外構フェンス・手すりの補修溶接",
    hazards: [
      "通行者への火花飛散",
      "通学路近接",
      "騒音・臭気",
    ],
    risks: [
      "通行者の火傷",
      "苦情・トラブル",
    ],
    countermeasures: [
      "溶接遮へい囲いを設置し通行帯を分離",
      "実施時間帯を通学・通勤時間を避けて設定",
      "周辺住民に事前周知",
      "消火器・水バケツを常備",
    ],
    keywords: ["外構", "フェンス", "通行者", "遮へい"],
    source: GENERAL,
  },
  {
    id: "mw-weld-003",
    industry: "medical-welfare",
    workType: "welding",
    title: "厨房給湯設備の補修ガス溶断",
    hazards: [
      "ガスボンベの転倒",
      "可燃残留物への引火",
      "閉所での酸欠",
    ],
    risks: [
      "ボンベ爆発・火災",
      "酸欠",
    ],
    countermeasures: [
      "ガスボンベは専用台車固定・直射日光回避",
      "可燃物・残留油を事前除去",
      "酸素濃度を測定し送風機で換気",
      "作業前に火気使用許可を取得",
    ],
    keywords: ["厨房", "給湯", "ガス溶断", "ボンベ"],
    source: MHLW,
  },

  // ── 玉掛け (rigging) × 3 ───────────────────────────────────
  {
    id: "mw-rig-001",
    industry: "medical-welfare",
    workType: "rigging",
    title: "大型医療機器（MRI・CT）の搬入・据付",
    hazards: [
      "重量物の重心ずれ",
      "搬入経路の梁・天井との干渉",
      "床耐荷重不足",
    ],
    risks: [
      "落下・転倒事故",
      "建物損傷",
    ],
    countermeasures: [
      "メーカー指定の搬入手順書を遵守",
      "搬入経路の事前測定と養生",
      "床耐荷重を構造設計と照合",
      "玉掛け技能講習修了者と専門業者の協働",
    ],
    keywords: ["MRI", "CT", "搬入", "重心"],
    source: GENERAL,
  },
  {
    id: "mw-rig-002",
    industry: "medical-welfare",
    workType: "rigging",
    title: "屋上設備（空調室外機等）のクレーン揚重",
    hazards: [
      "強風による振れ",
      "下方歩行者の立入",
      "屋上設置時の墜落",
    ],
    risks: [
      "落下・墜落",
      "歩行者被災",
    ],
    countermeasures: [
      "風速10m/s超で作業中止",
      "下方立入禁止区域を警備員配置で確保",
      "屋上作業者は親綱＋フルハーネス",
      "合図者を1名固定し無線連絡",
    ],
    keywords: ["屋上", "室外機", "クレーン", "親綱"],
    source: GENERAL,
  },
  {
    id: "mw-rig-003",
    industry: "medical-welfare",
    workType: "rigging",
    title: "施設物資のホイスト玉掛け（倉庫から各階搬送）",
    hazards: [
      "つり点摩耗",
      "荷の偏荷重",
      "操作中の挟まれ",
    ],
    risks: [
      "落下事故",
      "挟まれ災害",
    ],
    countermeasures: [
      "つり点（アイボルト等）を定期点検",
      "荷の重心マーキングと吊り具選定",
      "操作中は隙間に手を入れない",
      "玉掛け技能講習修了者のみ実施",
    ],
    keywords: ["ホイスト", "アイボルト", "玉掛け", "重心"],
    source: GENERAL,
  },

  // ── その他 (other) × 3 ────────────────────────────────────
  {
    id: "mw-other-001",
    industry: "medical-welfare",
    workType: "other",
    title: "針刺し・切創事故の防止（採血・注射）",
    hazards: [
      "使用済み針のリキャップ",
      "鋭利物廃棄ボックス満杯",
      "急患対応時の慌て",
    ],
    risks: [
      "B型/C型肝炎・HIV感染",
      "切創",
    ],
    countermeasures: [
      "リキャップ禁止を徹底し安全機構付き針を採用",
      "鋭利物廃棄ボックスの満杯前交換ルール",
      "針刺し事故発生時の即時報告・曝露後予防（PEP）プロトコル",
      "新人OJTで器具操作訓練",
    ],
    keywords: ["針刺し", "リキャップ", "PEP", "鋭利物"],
    source: MHLW,
  },
  {
    id: "mw-other-002",
    industry: "medical-welfare",
    workType: "other",
    title: "夜勤帯の単独業務・暴力対応",
    hazards: [
      "認知症患者の予期せぬ行動",
      "家族・利用者からの暴力",
      "単独勤務での助けを呼びにくい状況",
    ],
    risks: [
      "職員の負傷・精神的被害",
      "業務継続困難",
    ],
    countermeasures: [
      "ナースコール・緊急通報ボタンの携帯",
      "夜勤2名以上の体制を可能な限り確保",
      "暴力対応マニュアルと録音可能機器の運用",
      "発生時は管理者へ即時報告し休養支援",
    ],
    keywords: ["夜勤", "暴力", "認知症", "単独"],
    source: GENERAL,
  },
  {
    id: "mw-other-003",
    industry: "medical-welfare",
    workType: "other",
    title: "感染症（結核・新興感染症）対応",
    hazards: [
      "空気感染患者との接触",
      "PPE着脱手順の誤り",
      "N95マスクの密着不良",
    ],
    risks: [
      "院内感染",
      "職員発症",
    ],
    countermeasures: [
      "N95マスクのフィットテスト年1回実施",
      "PPE着脱手順の訓練と監督者ダブルチェック",
      "陰圧個室の運用と換気回数管理",
      "発症時の濃厚接触者調査体制",
    ],
    keywords: ["結核", "N95", "PPE", "感染"],
    source: MHLW,
  },
];
