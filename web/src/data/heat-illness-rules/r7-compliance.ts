/**
 * R7 (2025) amendment to the Industrial Safety and Health Regulations.
 * Centered on Article 612-2 ("Measures at workplaces where heat illness may
 * occur").  The article has two duties: establish/report a reporting system,
 * and establish/communicate an escalation procedure.
 *
 * Effective date: 2025-06-01 (令和7年6月1日) — per 令和7年厚生労働省令第57号.
 * The effective date is unified across the site; see
 * `web/src/data/laws/anzen-eisei-kisoku.ts` (第612条の2) for the
 * authoritative article text.
 *
 * The text below paraphrases the obligations; do not copy the regulation
 * verbatim.
 */

import type { R7ComplianceItem } from "@/types/heat-illness";
import { HEAT_ILLNESS_2025_LEGAL_SOURCE } from "./legal-source";

export const R7_EFFECTIVE_FROM = HEAT_ILLNESS_2025_LEGAL_SOURCE.effectiveFrom;
export const R7_EFFECTIVE_FROM_JP = "令和7年6月1日";

export const R7_COMPLIANCE_ITEMS: R7ComplianceItem[] = [
  {
    id: "reporting-system",
    title: "異常を報告できる体制の整備と周知",
    articleRef: "安衛則第612条の2 第1項",
    requirement:
      "作業者が熱中症の自覚症状を感じた場合、又は周囲が熱中症の疑いを発見した場合に、あらかじめ定めた担当者へ直ちに報告できる体制を整備し、作業者へ周知する。",
    evidenceExpected: [
      "報告先・連絡方法・代替連絡先を定めた文書",
      "作業者への周知記録又は現場掲示",
      "報告を受けた後の責任者・連絡網",
    ],
    effectiveFrom: R7_EFFECTIVE_FROM,
  },
  {
    id: "response-procedure",
    title: "症状悪化を防ぐ手順の作成と周知",
    articleRef: "安衛則第612条の2 第2項",
    requirement:
      "作業場ごとに、作業からの離脱、身体の冷却、必要に応じた医師の診察・処置その他の症状悪化防止措置と実施手順を定め、作業者へ周知する。",
    evidenceExpected: [
      "作業離脱・冷却・医療連携を含む作業場別手順",
      "緊急連絡先と搬送先の確認記録",
      "作業者への周知記録又は現場掲示",
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
1. 目的：厚生労働省の熱中症予防対策を参考に、暑熱職場のWBGTを把握して熱中症を予防する。本手順は安衛則第612条の2の法定2項目とは区別して運用する。
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
    description: "法定2項目とは別に、予防教育として使える30分カリキュラム。",
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
  ...HEAT_ILLNESS_2025_LEGAL_SOURCE.sources,
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
