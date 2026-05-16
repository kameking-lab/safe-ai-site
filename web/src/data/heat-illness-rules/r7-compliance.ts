/**
 * R7 (2025) amendment to the Industrial Safety and Health Regulations.
 * Centered on Article 612-2 ("Prevention of heat disorders"), which was
 * tightened to mandate WBGT-driven controls, recognition training, and
 * documented early-response procedures.
 *
 * Effective date: 2025-04-01 (R7/4/1).
 *
 * The text below paraphrases the obligations; do not copy the regulation
 * verbatim. Cross-reference: MHLW notice 基発0301第1号 (R7).
 */

import type { R7ComplianceItem } from "@/types/heat-illness";

export const R7_EFFECTIVE_FROM = "2025-04-01";

export const R7_COMPLIANCE_ITEMS: R7ComplianceItem[] = [
  {
    id: "wbgt-measurement",
    title: "WBGT実測の体制整備",
    articleRef: "安衛則第612条の2 第1項",
    requirement:
      "気温・湿度を踏まえてWBGT基準値を超えるおそれがある屋内・屋外作業について、WBGT値の測定または推計と記録を行う体制を整備する。",
    evidenceExpected: [
      "WBGT測定機器の保有台数と配備場所一覧",
      "測定頻度・地点を定めた手順書",
      "直近1か月分の測定記録（時刻・地点・WBGT値）",
    ],
    effectiveFrom: R7_EFFECTIVE_FROM,
  },
  {
    id: "acclimatization",
    title: "暑熱順化期間の確保",
    articleRef: "安衛則第612条の2 第2項",
    requirement:
      "新規入場者・長期休暇明け・配置転換直後の作業者について、7日以上をかけて段階的に作業負荷を増やす計画を作成し、その実施状況を記録する。",
    evidenceExpected: [
      "個人別暑熱順化計画（日別の作業時間・休憩計画）",
      "本人・職長による日々のチェック記録",
      "発症リスクの高い作業者の屋内補助業務への配置記録",
    ],
    effectiveFrom: R7_EFFECTIVE_FROM,
  },
  {
    id: "education-training",
    title: "熱中症予防教育の実施",
    articleRef: "安衛則第612条の2 第3項",
    requirement:
      "暑熱作業に従事する全労働者に対し、熱中症の症状・予防・初期対応・救急通報手順を含む教育を年1回以上実施し、内容と参加者を記録する。",
    evidenceExpected: [
      "教育カリキュラムと教材",
      "実施日・受講者一覧（署名簿）",
      "理解度確認テストまたは振返り記録",
    ],
    effectiveFrom: R7_EFFECTIVE_FROM,
  },
  {
    id: "early-response",
    title: "初期対応・救急体制の整備",
    articleRef: "安衛則第612条の2 第4項",
    requirement:
      "熱中症が疑われる場合の発見・通報・冷却・救急要請までの手順を文書化し、現場掲示・全員周知する。緊急時冷却装備（冷水・氷嚢等）を作業現場に配置する。",
    evidenceExpected: [
      "現場掲示用の初期対応フローチャート",
      "氷嚢・経口補水液・冷却ベスト等の在庫リスト",
      "緊急連絡網（119・産業医・家族連絡先）の整備",
    ],
    effectiveFrom: R7_EFFECTIVE_FROM,
  },
  {
    id: "buddy-monitoring",
    title: "バディ制・単独作業者の確認",
    articleRef: "安衛則第612条の2 第4項（運用通達）",
    requirement:
      "WBGT基準値超過下では、原則として2名以上での作業またはバディによる相互観察を実施する。単独作業が避けられない場合は、定時の安否確認手段を確保する。",
    evidenceExpected: [
      "バディ編成表または単独作業時の安否確認ログ",
      "無線・通報装置の配備状況",
      "監視カメラ・センサー等のテクノロジー活用記録",
    ],
    effectiveFrom: R7_EFFECTIVE_FROM,
  },
  {
    id: "ppe-correction",
    title: "防護具・作業服のWBGT補正",
    articleRef: "安衛則第612条の2（運用通達 §3）",
    requirement:
      "化学防護服・耐熱服・墜落制止用器具など発汗を阻害する装備を着用する作業については、WBGT実測値に補正値（+1〜+3 °C）を加えてリスク判定する。",
    evidenceExpected: [
      "着用装備とWBGT補正値の対応表",
      "補正後のWBGTに基づく作業中止判断記録",
    ],
    effectiveFrom: R7_EFFECTIVE_FROM,
  },
  {
    id: "manager-responsibility",
    title: "管理監督者の責任明確化",
    articleRef: "安衛則第612条の2（運用通達 §4）",
    requirement:
      "現場の管理監督者（職長等）に対し、WBGT値の確認・作業中止権限・救急通報義務を含む役割を明示する。職長教育に熱中症対応の章を含める。",
    evidenceExpected: [
      "職長教育カリキュラムでの熱中症章の有無",
      "現場別の安全責任者一覧",
      "作業中止判断ログ（誰がどの基準で中止したか）",
    ],
    effectiveFrom: R7_EFFECTIVE_FROM,
  },
  {
    id: "incident-recording",
    title: "熱中症発症の届出・記録",
    articleRef: "安衛則第97条／第612条の2",
    requirement:
      "業務上の熱中症で休業4日以上となった場合は労働者死傷病報告を提出する。発症事案は社内でも記録・原因分析し、再発防止策をPDCAに組み込む。",
    evidenceExpected: [
      "労働者死傷病報告の提出状況",
      "社内インシデント記録と原因分析書",
      "再発防止策の実施記録（教育・設備等）",
    ],
    effectiveFrom: R7_EFFECTIVE_FROM,
  },
];

/**
 * Document templates referenced from the R7 compliance checklist.
 * Each block is a short, ready-to-paste skeleton in Japanese; the user
 * fills in plant-specific values (job titles, room IDs, contacts).
 */
export const R7_TEMPLATE_BLOCKS = [
  {
    id: "wbgt-monitoring-procedure",
    title: "WBGT測定手順書（社内文書ひな形）",
    description: "誰が・どこで・どの頻度で測定し、どこに記録するかを定めた手順書のひな形。",
    body: `【WBGT測定手順書】
1. 目的：労働安全衛生規則第612条の2に基づき、暑熱職場のWBGT実測を行い熱中症を予防する。
2. 適用範囲：[対象現場・作業エリアを列挙]
3. 測定責任者：[職長名・代行者名]
4. 測定機器：[機種名／校正日／配備場所]
5. 測定頻度：5〜9月の作業日において、原則1時間ごと。WBGT 28 °Cを超えた時点で30分ごとに切替。
6. 測定地点：[作業中心点・日陰／日向・冷却休憩所など複数地点を列挙]
7. 記録方法：[紙日報番号／システム入力先]に時刻・地点・WBGT値・気温・湿度・対応事項を記録。
8. 異常時対応：WBGT別の作業制限（注意／警戒／厳重警戒／危険）に従い、休憩・冷却・作業中止を判断する。`,
  },
  {
    id: "acclimatization-plan",
    title: "暑熱順化計画書（個人別ひな形）",
    description: "新規入場者・復帰者向け、7日以上の段階的暑熱順化計画。",
    body: `【暑熱順化計画書】
氏名：[      ]   所属：[      ]   開始日：[      ]
過去7日以内の暑熱作業従事：[ 有 / 無 ]
[1日目] 屋外作業時間 [  ] 時間／屋内補助 [  ] 時間／WBGT上限 [  ]
[2日目] 屋外作業時間 [  ] 時間／屋内補助 [  ] 時間／WBGT上限 [  ]
[3-4日目] 屋外作業時間 [  ] 時間／屋内補助 [  ] 時間／WBGT上限 [  ]
[5-7日目] 屋外作業時間 [  ] 時間／屋内補助 [  ] 時間／WBGT上限 [  ]
監督者確認欄：[      ]   本人サイン：[      ]
備考（体調記録）：[      ]`,
  },
  {
    id: "emergency-response",
    title: "緊急対応フロー（現場掲示用ひな形）",
    description: "発症疑い時の発見→冷却→救急要請までの掲示用フロー。",
    body: `【熱中症 緊急対応フロー】
1. 発見：めまい／吐き気／けいれん／意識朦朧を確認したら直ちに作業中止。
2. 通報：職長・現場代理人へ連絡（[内線／無線チャネル]）。119通報の判断は意識障害・けいれんがあれば即実施。
3. 移動：日陰・冷房休憩室へ搬送（[搬送経路・拠点を記入]）。
4. 冷却：衣服を緩め、首・脇・鼠径部を氷嚢で冷却。皮膚に水を掛け扇風機で送風。
5. 補水：意識清明であれば経口補水液を少量ずつ。意識不明な場合は飲水させない。
6. 医療連携：産業医 [氏名／電話]、家族 [連絡先]、最寄り救急 [病院名／電話]。
7. 記録：発生時刻・WBGT値・対応内容を別紙にて記録し、後日インシデントレビューを実施。`,
  },
  {
    id: "education-curriculum",
    title: "熱中症予防教育カリキュラム（30分版ひな形）",
    description: "新規入場時・年次教育で使える30分カリキュラム。",
    body: `【熱中症予防教育 30分カリキュラム】
0:00 導入：当該事業場の昨夏発生件数と業界統計 [3分]
0:03 メカニズム：体温調節と発汗、熱中症Ⅰ〜Ⅲ度の症状 [7分]
0:10 リスク要因：暑熱順化／睡眠／飲酒／既往歴／装備 [5分]
0:15 WBGT基準と本社の作業制限ルール [5分]
0:20 緊急対応フローと救急通報手順 [5分]
0:25 質疑応答／理解度確認テスト [5分]
評価：受講者署名と理解度テスト（80%以上で合格）。不合格者は補講を実施。`,
  },
];

/**
 * Curated key sources for the documentation footer.
 * URLs are official Japanese government / industry sources only;
 * do not embed verbatim content from them.
 */
export const R7_SOURCES = [
  {
    label: "労働安全衛生規則 第612条の2（e-Gov 法令検索）",
    url: "https://laws.e-gov.go.jp/law/347M50002000032",
  },
  {
    label: "厚生労働省「職場における熱中症予防対策マニュアル」",
    url: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/roudoukijun/anzen/0000045998.html",
  },
  {
    label: "厚生労働省 職場のあんぜんサイト 熱中症予防情報",
    url: "https://anzeninfo.mhlw.go.jp/yougo/yougo23_1.html",
  },
  {
    label: "JIS Z 8504 暑熱環境－WBGT 指数に基づく作業者の熱ストレスの評価",
    url: "https://www.jisc.go.jp/",
  },
];
