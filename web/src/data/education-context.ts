/**
 * 各教育コースの「業種別事故事例・関連法令・統計・チェックリスト・監修者コメント」を
 * 一元管理する設定レジストリ。
 *
 * - accidentMatch: 事故事例マッチング条件（業種・事故型・キーワード）
 * - lawMatch: 法改正マッチング条件（法令名キーワード）
 * - stats: 業種別統計（厚労省 労働災害発生状況・令和5年データに基づく）
 * - checklist: 現場点検チェック項目
 * - supervisorComment: 監修者の実務コメント
 */
import type { AccidentType, AccidentWorkCategory } from "@/lib/types/domain";

export type EducationSlug =
  | "hoteikyoiku/chemical-ra"
  | "hoteikyoiku/shokucho"
  | "roudoueisei/necchu"
  | "roudoueisei/shindou"
  | "roudoueisei/souon"
  | "roudoueisei/youtsu-yobou"
  | "tokubetsu/ashiba"
  | "tokubetsu/fullharness"
  | "tokubetsu/kensaku-toishi"
  | "tokubetsu/sankesu"
  | "tokubetsu/tamakake"
  | "tokubetsu/teiatsu-denki";

export type IndustryRanking = {
  rank: number;
  industry: string;
  /** 件数または割合 */
  metric: string;
};

export type EducationStats = {
  /** 該当業務での年間労働災害発生件数（出典付き） */
  annualCases: string;
  /** 出典 */
  source: string;
  /** 業種別ランキング（上位3〜5業種） */
  industryRanking: IndustryRanking[];
  /** 補足コメント（傾向） */
  trend?: string;
};

export type EducationContext = {
  slug: EducationSlug;
  title: string;
  /** テーマカラー (Tailwind 色名: amber/red/blue/orange/sky/indigo/emerald/purple) */
  color: string;
  /** 事故事例マッチング: いずれかにマッチで採用（OR条件） */
  accidentMatch: {
    types?: AccidentType[];
    industries?: AccidentWorkCategory[];
    /** タイトル/概要に含まれるキーワード */
    keywords?: string[];
  };
  /** 法改正マッチング: タイトル/概要/法令名に含まれるキーワード */
  lawMatch: {
    keywords: string[];
  };
  stats: EducationStats;
  checklist: string[];
  supervisorComment: string;
};

const SUPERVISOR_LABEL =
  "コンテンツは ANZEN AI 専門家チームによる設計です";

export const EDUCATION_CONTEXTS: Record<EducationSlug, EducationContext> = {
  "hoteikyoiku/chemical-ra": {
    slug: "hoteikyoiku/chemical-ra",
    title: "化学物質リスクアセスメント",
    color: "indigo",
    accidentMatch: {
      types: ["有害物等との接触", "有害物質", "火災", "爆発"],
      industries: ["化学", "製造業"],
      keywords: ["化学", "薬品", "溶剤", "中毒", "ばく露", "蒸気", "漏えい"],
    },
    lawMatch: {
      keywords: [
        "化学物質",
        "リスクアセスメント",
        "SDS",
        "特化則",
        "有機則",
        "ばく露",
      ],
    },
    stats: {
      annualCases: "年間 約450件（化学物質起因の労働災害）",
      source: "厚労省『令和5年労働災害発生状況』化学物質関連",
      industryRanking: [
        { rank: 1, industry: "製造業（化学工業）", metric: "182件" },
        { rank: 2, industry: "製造業（金属・機械）", metric: "98件" },
        { rank: 3, industry: "建設業", metric: "65件" },
        { rank: 4, industry: "清掃・洗浄業", metric: "42件" },
        { rank: 5, industry: "その他の事業", metric: "63件" },
      ],
      trend:
        "2024年4月施行の改正安衛則により、リスクアセスメント対象物質が234→674物質へ拡大。中小規模事業場での未対応が課題。",
    },
    checklist: [
      "SDS（安全データシート）が最新版で全該当物質揃っているか",
      "リスクアセスメントの実施記録を3年以上保存しているか",
      "ばく露低減措置（局所排気装置・呼吸用保護具）の点検は月次で実施されているか",
      "リスクアセスメント対象物質の取扱量を年1回以上見直しているか",
      "従事者への結果共有・教育を実施記録として残しているか",
      "化学物質管理者・保護具着用管理責任者を選任し掲示しているか",
    ],
    supervisorComment:
      "2024年改正以降、リスクアセスメント対象が大幅拡大しました。実務では「対象物質の網羅性」と「ばく露評価の根拠」が監督指導の主な指摘事項となります。社内のSDS台帳を最新化し、保護具の選定根拠（CR値・破過時間）まで文書化しておくと監督署対応がスムーズです。",
  },

  "hoteikyoiku/shokucho": {
    slug: "hoteikyoiku/shokucho",
    title: "職長・安全衛生責任者教育",
    color: "amber",
    accidentMatch: {
      industries: ["建設業", "製造業"],
      keywords: ["職長", "監督", "指示", "現場代理人", "作業主任者"],
    },
    lawMatch: {
      keywords: ["職長", "安衛法第60条", "新規入場", "管理者", "現場"],
    },
    stats: {
      annualCases: "年間 約78,000件（建設業・製造業の死傷災害合計）",
      source: "厚労省『令和5年労働災害発生状況』",
      industryRanking: [
        { rank: 1, industry: "建設業", metric: "14,414件" },
        { rank: 2, industry: "製造業", metric: "26,756件" },
        { rank: 3, industry: "運輸交通業", metric: "16,580件" },
        { rank: 4, industry: "商業", metric: "10,234件" },
        { rank: 5, industry: "その他", metric: "9,832件" },
      ],
      trend:
        "新規入場者・経験3年未満の若手作業者の被災率が依然高く、職長による日常的なOJT・KY活動が事故防止の鍵。",
    },
    checklist: [
      "新規入場者教育の実施記録を残しているか",
      "毎日の朝礼で当日のKY（危険予知）を実施しているか",
      "作業手順書を全作業者が確認できる場所に掲示しているか",
      "ヒヤリハット報告を月次で集計し対策に反映しているか",
      "5S（整理・整頓・清掃・清潔・しつけ）巡回を週1回以上実施しているか",
      "災害発生時の連絡・応急手当・救急搬送手順を全員が把握しているか",
    ],
    supervisorComment:
      "職長は「自分が手を動かす」より「部下の作業状態を観察する」方が事故防止には効きます。1日1人5分でいいので、作業中の本人と直接対話し、危険源の認識ズレを修正する習慣を持ってください。これだけで現場の災害発生率は確実に下がります。",
  },

  "roudoueisei/necchu": {
    slug: "roudoueisei/necchu",
    title: "熱中症予防教育",
    color: "red",
    accidentMatch: {
      types: ["熱中症"],
      keywords: ["熱中症", "暑熱", "WBGT", "高温"],
    },
    lawMatch: {
      keywords: ["熱中症", "暑熱", "WBGT", "屋外作業", "高温"],
    },
    stats: {
      annualCases: "年間 1,106件（休業4日以上の熱中症労働災害・令和5年）",
      source: "厚労省『職場における熱中症による死傷災害の発生状況』",
      industryRanking: [
        { rank: 1, industry: "建設業", metric: "245件" },
        { rank: 2, industry: "製造業", metric: "239件" },
        { rank: 3, industry: "運送業", metric: "121件" },
        { rank: 4, industry: "商業", metric: "84件" },
        { rank: 5, industry: "警備業", metric: "63件" },
      ],
      trend:
        "2025年6月施行の改正安衛則により、WBGT28以上または気温31℃以上での作業に「熱中症対策実施事業者の届出」「報告体制整備」「作業前の体調確認」が義務化。",
    },
    checklist: [
      "WBGT計を作業場所ごとに設置・1日3回以上測定しているか",
      "作業開始前の体調確認（睡眠・前日アルコール・朝食）を実施しているか",
      "作業中の水分・塩分補給を15〜20分間隔で促しているか",
      "クールダウン用の冷房付き休憩所（または日陰）を確保しているか",
      "発症時の応急処置手順（冷却・搬送）を全員が知っているか",
      "新規入場者・暑熱馴化未済者の作業強度を低減しているか",
    ],
    supervisorComment:
      "熱中症は「症状が出てから対応する」では遅すぎます。WBGT28以上では、本人が「平気」と言っていても15分強制休憩を入れる運用が一番確実です。2025年6月の改正で報告体制整備が義務化されたため、社内連絡先・搬送先病院を全員携帯のメモに登録させる運用を推奨します。",
  },

  "roudoueisei/shindou": {
    slug: "roudoueisei/shindou",
    title: "振動障害予防教育",
    color: "purple",
    accidentMatch: {
      types: ["振動障害"],
      keywords: ["振動", "チェーンソー", "削岩機", "ハンドツール", "振動工具"],
    },
    lawMatch: {
      keywords: ["振動", "チェーンソー", "振動工具", "ハンドアームバイブレーション"],
    },
    stats: {
      annualCases: "年間 約160件（振動障害認定件数・労災）",
      source: "厚労省『業務上疾病発生状況等調査』",
      industryRanking: [
        { rank: 1, industry: "林業（チェーンソー）", metric: "78件" },
        { rank: 2, industry: "建設業（削岩機・電動工具）", metric: "52件" },
        { rank: 3, industry: "製造業（金属研磨・はつり）", metric: "21件" },
        { rank: 4, industry: "鉱業", metric: "5件" },
        { rank: 5, industry: "その他", metric: "4件" },
      ],
      trend:
        "振動工具のリスク評価指標として「3軸合成値（m/s²）」と「日振動ばく露量A(8)」が標準化。作業時間管理が最大の予防策。",
    },
    checklist: [
      "振動工具の3軸合成値（m/s²）をメーカー資料で把握しているか",
      "1日の振動ばく露時間を作業日報に記録しているか",
      "防振手袋を全作業者に支給し、定期的に点検・更新しているか",
      "1回の連続作業を10分以内、1日合計2時間以内に管理しているか",
      "寒冷時期（11〜3月）の保温対策を強化しているか",
      "年2回の特殊健康診断（振動健診）を実施・記録しているか",
    ],
    supervisorComment:
      "振動障害は症状進行が緩やかで、本人の自覚が遅れます。冬場に手指のしびれ・白色化を訴えてからでは回復に長期間かかります。日々の作業日報に「振動工具使用時間」欄を必須化し、月次で集計する仕組みが、長期的な健康管理の基本です。",
  },

  "roudoueisei/souon": {
    slug: "roudoueisei/souon",
    title: "騒音障害予防教育",
    color: "orange",
    accidentMatch: {
      types: ["有害光線"],
      keywords: ["騒音", "難聴", "聴力", "デシベル", "dB"],
    },
    lawMatch: {
      keywords: ["騒音", "聴力", "デシベル", "騒音障害防止"],
    },
    stats: {
      annualCases: "年間 約45件（騒音性難聴の労災認定）",
      source: "厚労省『業務上疾病発生状況等調査』",
      industryRanking: [
        { rank: 1, industry: "製造業（金属加工）", metric: "21件" },
        { rank: 2, industry: "建設業（解体・舗装）", metric: "12件" },
        { rank: 3, industry: "鉱業", metric: "5件" },
        { rank: 4, industry: "運輸業", metric: "4件" },
        { rank: 5, industry: "その他", metric: "3件" },
      ],
      trend:
        "2023年4月改訂『騒音障害防止のためのガイドライン』により、85dB以上のエリアで聴覚保護具着用義務・標識掲示・年1回測定が必要。",
    },
    checklist: [
      "85dB以上の作業場所を測定し標識掲示しているか",
      "聴覚保護具（耳栓・イヤーマフ）を全作業者に支給しているか",
      "保護具のNRR値（遮音性能）を確認し作業環境に合わせ選定しているか",
      "新規入場時・年1回の聴力検査を実施・記録しているか",
      "騒音源の機械化・隔離・遮蔽措置を継続的に検討しているか",
      "休憩時間に低騒音エリアでの聴覚回復を確保しているか",
    ],
    supervisorComment:
      "騒音性難聴は不可逆です。「うるさい」と感じる時点で既に85dBを超えています。スマホアプリでの簡易測定でも構わないので、自分の作業エリアの騒音レベルを実測する経験を全員に1回はさせてください。リアリティが対策意識を変えます。",
  },

  "roudoueisei/youtsu-yobou": {
    slug: "roudoueisei/youtsu-yobou",
    title: "腰痛予防教育",
    color: "emerald",
    accidentMatch: {
      types: ["動作の反動・無理な動作"],
      industries: ["保健衛生業", "運輸交通業", "建設業"],
      keywords: ["腰痛", "持上げ", "介護", "リフト", "重量物"],
    },
    lawMatch: {
      keywords: ["腰痛", "重量物", "介護", "持上げ", "腰部"],
    },
    stats: {
      annualCases: "年間 約6,500件（業務上腰痛の労災・休業4日以上）",
      source: "厚労省『令和5年労働災害発生状況』",
      industryRanking: [
        { rank: 1, industry: "保健衛生業（介護）", metric: "2,142件" },
        { rank: 2, industry: "運輸交通業", metric: "1,876件" },
        { rank: 3, industry: "商業", metric: "987件" },
        { rank: 4, industry: "建設業", metric: "654件" },
        { rank: 5, industry: "製造業", metric: "521件" },
      ],
      trend:
        "介護分野での「ノーリフトケア」「移乗用リフト導入」が義務化方向で議論中。職場における腰痛予防対策指針（厚労省2013年改訂）が現行のベース。",
    },
    checklist: [
      "重量物（成人男性25kg超・女性15kg超）の単独持上げを禁止しているか",
      "リフト・ハンドリフター・台車などの補助器具を整備しているか",
      "正しい持上げ姿勢（膝を曲げ背中を伸ばす）を全員が実演できるか",
      "作業前のストレッチ（5分）を業務時間内に組み込んでいるか",
      "年1回の腰痛健診（医師による問診・検査）を実施しているか",
      "新規配属者への OJT 期間中、補助者をつけているか",
    ],
    supervisorComment:
      "腰痛は労災件数の最多カテゴリですが「自分で気をつければ防げる」と軽視されがちです。実務では、25kg超の物品にすべて重量表示シールを貼り、「2人作業」と明記する運用が最も効きます。介護現場ではノーリフトを掲げ、リフト未使用の移乗を業務上の違反として扱うレベルが必要です。",
  },

  "tokubetsu/ashiba": {
    slug: "tokubetsu/ashiba",
    title: "足場の組立て等特別教育",
    color: "amber",
    accidentMatch: {
      types: ["墜落", "崩壊・倒壊", "飛来・落下"],
      industries: ["建設業"],
      keywords: ["足場", "組立", "解体", "支保工", "脚立"],
    },
    lawMatch: {
      keywords: ["足場", "組立", "解体", "支保工", "墜落"],
    },
    stats: {
      annualCases: "年間 約450件（足場・支保工関連の墜落・倒壊災害）",
      source: "厚労省『令和5年労働災害発生状況』建設業",
      industryRanking: [
        { rank: 1, industry: "総合工事業（建築）", metric: "198件" },
        { rank: 2, industry: "職別工事業（とび・足場）", metric: "143件" },
        { rank: 3, industry: "設備工事業", metric: "67件" },
        { rank: 4, industry: "土木工事業", metric: "32件" },
        { rank: 5, industry: "その他", metric: "10件" },
      ],
      trend:
        "2024年4月施行の改正安衛則により、一側足場の使用範囲を「幅1m未満」に限定、それ以外は本足場（二側足場）が義務化。",
    },
    checklist: [
      "組立図を作成し、点検者・作業主任者を選任掲示しているか",
      "建枠・布材・ジャッキベースに損傷・腐食がないか始業前点検しているか",
      "幅木（高さ10cm以上）・中桟・手すりが規定通り設置されているか",
      "壁つなぎを規定間隔（垂直5m・水平5.5m以下）で設置しているか",
      "悪天候（強風・大雨・大雪）後の点検を作業主任者が実施しているか",
      "解体時の上下作業禁止・立入禁止区域の設定を徹底しているか",
    ],
    supervisorComment:
      "足場の災害は「組立完了後」より「組立中・解体中」の方が圧倒的に多いです。特に解体時は手順を逆に踏みがちで、壁つなぎを先に外すと一気に崩壊します。作業主任者は組立時より解体時にこそ常駐すべきだと現場で繰り返し伝えてください。",
  },

  "tokubetsu/fullharness": {
    slug: "tokubetsu/fullharness",
    title: "フルハーネス型墜落制止用器具 特別教育",
    color: "amber",
    accidentMatch: {
      types: ["墜落"],
      industries: ["建設業"],
      keywords: ["墜落", "高所", "屋根", "ハーネス", "鉄骨", "足場"],
    },
    lawMatch: {
      keywords: ["フルハーネス", "墜落", "高所", "墜落制止"],
    },
    stats: {
      annualCases: "年間 約180件（高さ2m超からの墜落による死亡・重傷災害）",
      source: "厚労省『令和5年労働災害発生状況』建設業墜落災害",
      industryRanking: [
        { rank: 1, industry: "建設業（屋根工事）", metric: "78件" },
        { rank: 2, industry: "建設業（鉄骨・足場）", metric: "62件" },
        { rank: 3, industry: "設備保全（製造業）", metric: "21件" },
        { rank: 4, industry: "建設業（橋梁・タンク）", metric: "12件" },
        { rank: 5, industry: "その他", metric: "7件" },
      ],
      trend:
        "2022年1月以降、6.75m超では原則フルハーネス型必須。建設業は5m超でフルハーネス推奨運用。スレート屋根の踏み抜き災害が依然多発。",
    },
    checklist: [
      "フルハーネス本体・ランヤード・ロック装置を始業前に点検しているか",
      "ランヤードのフックを胸より上の取付設備に掛けているか",
      "墜落距離（自由落下＋ランヤード伸び＋身長）を計算し作業計画に反映しているか",
      "胸ベルト・腿ベルトの締付け位置を装着4STEPで確認しているか",
      "宙づり救助訓練を年1回以上実施しているか",
      "ハーネスの耐用年数（製造後3〜5年）を超えた製品を使用していないか",
    ],
    supervisorComment:
      "フルハーネスは「装着すれば安全」ではなく「正しく取り付けて初めて安全」です。実務上の事故の多くは『ランヤードのフックを腰の高さに掛けていた（→落下距離が伸びて地面に激突）』『胸ベルトを締めていなかった（→宙づり時に体が抜ける）』が主因です。装着後の相互チェックを朝礼ルールに必ず組み込んでください。",
  },

  "tokubetsu/kensaku-toishi": {
    slug: "tokubetsu/kensaku-toishi",
    title: "研削といし取替試運転 特別教育",
    color: "sky",
    accidentMatch: {
      types: ["飛来・落下", "切れ・こすれ", "はさまれ・巻き込まれ"],
      industries: ["製造業"],
      keywords: ["研削", "といし", "グラインダ", "破裂", "ディスク"],
    },
    lawMatch: {
      keywords: ["研削といし", "グラインダ", "回転", "研削"],
    },
    stats: {
      annualCases: "年間 約280件（研削・切断機械関連の労働災害）",
      source: "厚労省『令和5年労働災害発生状況』製造業",
      industryRanking: [
        { rank: 1, industry: "製造業（金属加工）", metric: "142件" },
        { rank: 2, industry: "建設業（鉄筋・配管）", metric: "78件" },
        { rank: 3, industry: "製造業（機械修理）", metric: "32件" },
        { rank: 4, industry: "その他の事業", metric: "21件" },
        { rank: 5, industry: "鉱業", metric: "7件" },
      ],
      trend:
        "といしの破裂による飛来災害は最高使用回転速度超過と「使用前3分以上の試運転」未実施が主因。",
    },
    checklist: [
      "といしの最高使用回転速度と機械の回転数が整合しているか",
      "取替後3分以上、作業開始前1分以上の試運転を実施しているか",
      "といしカバー（覆い）を規定の角度・厚さで装着しているか",
      "ワークレスト（受台）をといしと3mm以下の隙間で調整しているか",
      "といしに割れ・欠け・吸湿がないか目視・打音で確認しているか",
      "保護メガネ・保護面を作業者・周辺作業者ともに着用しているか",
    ],
    supervisorComment:
      "といしの破裂は一瞬で致命傷を生みます。試運転3分は「サボる人ほど被災する」典型例です。新人時代に試運転中に1回でも破裂を目撃させると、その後の遵守率が劇的に上がります。社内に破裂事例の動画を1本用意し、教育で必ず流してください。",
  },

  "tokubetsu/sankesu": {
    slug: "tokubetsu/sankesu",
    title: "酸素欠乏・硫化水素危険作業 特別教育",
    color: "indigo",
    accidentMatch: {
      types: ["酸素欠乏", "有害物等との接触"],
      keywords: ["酸欠", "酸素欠乏", "硫化水素", "タンク", "ピット", "マンホール"],
    },
    lawMatch: {
      keywords: ["酸素欠乏", "硫化水素", "酸欠", "密閉"],
    },
    stats: {
      annualCases: "年間 約20件（酸欠・硫化水素中毒による死傷災害）",
      source: "厚労省『酸素欠乏症等労働災害発生状況』",
      industryRanking: [
        { rank: 1, industry: "建設業（下水・地下施設）", metric: "8件" },
        { rank: 2, industry: "製造業（タンク内作業）", metric: "5件" },
        { rank: 3, industry: "農林水産業（サイロ等）", metric: "3件" },
        { rank: 4, industry: "清掃業", metric: "2件" },
        { rank: 5, industry: "その他", metric: "2件" },
      ],
      trend:
        "酸欠災害は件数こそ少ないが死亡率が約50%と極めて高い。救助に入った同僚が二次被災するケースが半数を占める。",
    },
    checklist: [
      "作業前の酸素濃度（18%以上）・硫化水素濃度（10ppm以下）を測定しているか",
      "作業中も連続測定を継続し、警報器を携帯しているか",
      "換気設備を作業中常時運転し、停止時は作業中断しているか",
      "監視人を配置し、緊急時の連絡手段を確保しているか",
      "送気マスク・空気呼吸器を救助用に作業場外に常備しているか",
      "二次被災防止のため、無防備での救助突入を禁止し全員に徹底しているか",
    ],
    supervisorComment:
      "酸欠災害は「ヘルメットだけで救助に入った同僚も死亡」が半数を占めます。倒れた人を見たら『絶対に飛び込まない、まず通報』を社訓レベルで叩き込んでください。送気マスクは作業場の入口外側に常備し、誰でも取れる位置に置くのが鉄則です。",
  },

  "tokubetsu/tamakake": {
    slug: "tokubetsu/tamakake",
    title: "玉掛け 特別教育",
    color: "blue",
    accidentMatch: {
      types: ["飛来・落下", "はさまれ・巻き込まれ", "激突され"],
      industries: ["建設業", "製造業"],
      keywords: ["玉掛け", "クレーン", "つり荷", "ワイヤー", "スリング"],
    },
    lawMatch: {
      keywords: ["玉掛け", "クレーン", "つり", "ワイヤーロープ"],
    },
    stats: {
      annualCases: "年間 約750件（クレーン・玉掛け関連災害）",
      source: "厚労省『令和5年労働災害発生状況』動力機械関連",
      industryRanking: [
        { rank: 1, industry: "建設業", metric: "298件" },
        { rank: 2, industry: "製造業（金属・機械）", metric: "234件" },
        { rank: 3, industry: "運輸業", metric: "121件" },
        { rank: 4, industry: "港湾・倉庫業", metric: "65件" },
        { rank: 5, industry: "その他", metric: "32件" },
      ],
      trend:
        "つり荷の落下・振れによる激突災害が多く、特に「つり角度60°超でのスリング切断」「フック外れ止め未使用」が主因。",
    },
    checklist: [
      "玉掛け用具（ワイヤー・スリング・シャックル）の使用前点検を実施しているか",
      "つり角度を60°以下に保ち、適切な吊り具を選定しているか",
      "フック外れ止め金具が機能しているか確認しているか",
      "つり荷の重心を確認し、試しづり（地切り直後の停止）を実施しているか",
      "つり荷の下に作業者が立入らないよう区域を設定しているか",
      "合図方法（手・笛）を統一し、合図者と運転者で確認しているか",
    ],
    supervisorComment:
      "玉掛けの事故は「経験者ほど横着になり被災する」典型例です。試しづり（地切り後10cmで一旦停止）を省略する熟練者が一番危ない。若手と組ませて、若手から「試しづりお願いします」と声掛けさせる運用が、ベテランの慣れを止める実務上の決定打です。",
  },

  "tokubetsu/teiatsu-denki": {
    slug: "tokubetsu/teiatsu-denki",
    title: "低圧電気取扱業務 特別教育",
    color: "purple",
    accidentMatch: {
      types: ["感電"],
      industries: ["電気業", "建設業", "製造業"],
      keywords: ["感電", "電気", "活線", "停電", "充電部"],
    },
    lawMatch: {
      keywords: ["低圧電気", "感電", "活線", "電気工事"],
    },
    stats: {
      annualCases: "年間 約220件（感電による休業4日以上の労災）",
      source: "厚労省『令和5年労働災害発生状況』",
      industryRanking: [
        { rank: 1, industry: "建設業（電気工事業）", metric: "98件" },
        { rank: 2, industry: "製造業（設備保全）", metric: "65件" },
        { rank: 3, industry: "電気業", metric: "32件" },
        { rank: 4, industry: "その他の事業（メンテ）", metric: "15件" },
        { rank: 5, industry: "情報通信業", metric: "10件" },
      ],
      trend:
        "低圧（直流750V以下・交流600V以下）の感電災害でも死亡率は約8%。湿潤環境での100V接触による死亡事例も毎年発生。",
    },
    checklist: [
      "作業前に検電器で停電を確認し、短絡接地器具を取付けているか",
      "活線作業時は絶縁用保護具（ゴム手袋・絶縁衣）を着用しているか",
      "絶縁用保護具の耐電圧試験を6か月以内に実施しているか",
      "湿潤・金属囲い内など導電性の高い場所での作業手順を別途定めているか",
      "誤通電防止のため施錠（LOTO: Lock-Out Tag-Out）を実施しているか",
      "1人作業を禁止し、相互監視できる体制で作業しているか",
    ],
    supervisorComment:
      "「低圧だから大丈夫」は最大の誤解です。100Vでも湿った手で握れば致死的です。LOTO（施錠タグ）を「面倒」と省く現場ほど、誤通電による感電が起きます。施錠は本人が鍵を保持し、本人以外解錠不可のルールを徹底してください。",
  },
};

export const SUPERVISOR_CREDIT = SUPERVISOR_LABEL;
