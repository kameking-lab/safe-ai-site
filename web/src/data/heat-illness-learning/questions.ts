import { HEAT_LEARNING_SOURCE_IDS } from "./sources";
import type { HeatLearningQuestion } from "./types";

export const HEAT_ILLNESS_KNOWLEDGE_CHECK = [
  {
    id: "two-statutory-duties",
    number: 1,
    legend: "安衛則第612条の2が定める2つの措置はどれですか。",
    context: "法令上の義務と、指針の推奨事項を分けて確認します。",
    options: [
      {
        id: "report-and-procedure",
        label: "異常の報告体制を整備・周知し、悪化防止手順を作成・周知する",
      },
      {
        id: "water-only",
        label: "飲料水を置くだけで、報告体制や緊急手順は定めない",
      },
      {
        id: "forecast-only",
        label: "天気予報を朝に一度見るだけで、作業中は見直さない",
      },
    ],
    correctOptionId: "report-and-procedure",
    rationale:
      "第1項は異常を直ちに報告できる体制の整備・周知、第2項は作業離脱、身体冷却、必要に応じた医師の診察等を含む悪化防止手順の作成・周知です。",
    kind: "statutory-duty",
    sourceIds: [
      HEAT_LEARNING_SOURCE_IDS.ordinance,
      HEAT_LEARNING_SOURCE_IDS.implementationNotice,
    ],
    locator: "労働安全衛生規則第612条の2第1項・第2項",
    emergency: false,
  },
  {
    id: "current-guideline",
    number: 2,
    legend: "2026年7月24日時点で、現行の包括的な指針はどれですか。",
    context: "廃止された旧通知を現行資料として扱わないための確認です。",
    options: [
      {
        id: "0318-current",
        label: "2026年3月18日付け基発0318第1号",
      },
      {
        id: "0420-current",
        label: "2021年4月20日付け基発0420第3号",
      },
      {
        id: "no-source-needed",
        label: "通知番号は確認せず、社内資料だけを現行資料とする",
      },
    ],
    correctOptionId: "0318-current",
    rationale:
      "基発0318第1号で新しいガイドラインが定められ、旧基発0420第3号は2026年3月18日付けで廃止されています。",
    kind: "guideline-recommendation",
    sourceIds: [HEAT_LEARNING_SOURCE_IDS.currentGuideline],
    locator: "基発0318第1号・本文および廃止規定",
    emergency: false,
  },
  {
    id: "wbgt-estimated-current",
    number: 3,
    legend:
      "環境省サイトの「実況推定値」を朝礼で伝えるとき、適切な説明はどれですか。",
    context: "値の出どころを、色や数値だけでなく言葉で区別します。",
    options: [
      {
        id: "estimated-label",
        label: "気象観測値等から計算した実況推定値で、作業地点の実測値ではない",
      },
      {
        id: "measured-here",
        label: "作業地点で黒球温度計を使って直接測った実測値である",
      },
      {
        id: "future-forecast",
        label: "明日以降だけを対象にした予測値である",
      },
    ],
    correctOptionId: "estimated-label",
    rationale:
      "環境省は実測値、実況推定値、予測値を別区分で提供しています。実況推定値を作業地点の実測値と表示してはいけません。",
    kind: "official-observation",
    sourceIds: [HEAT_LEARNING_SOURCE_IDS.wbgtDefinitions],
    locator: "① 暑さ指数（WBGT）の実測値と実況推定値",
    emergency: false,
  },
  {
    id: "wbgt-forecast",
    number: 4,
    legend: "WBGTの予測値を使う際に必要な扱いはどれですか。",
    context: "予測と現場の状態がずれる可能性を残します。",
    options: [
      {
        id: "forecast-with-limits",
        label: "将来時刻の推定として区別し、最新情報と現場条件を確認する",
      },
      {
        id: "forecast-is-measurement",
        label: "現場実測と同じ確定値として、その後は見直さない",
      },
      {
        id: "missing-means-low",
        label: "取得できない場合は低い値として扱う",
      },
    ],
    correctOptionId: "forecast-with-limits",
    rationale:
      "予測値は気象庁の数値予報データ等を用いた将来の推定です。急な天候変化で実況との差が大きくなる場合があり、取得不能を低値へ置き換えません。",
    kind: "official-observation",
    sourceIds: [HEAT_LEARNING_SOURCE_IDS.wbgtDefinitions],
    locator: "② 暑さ指数（WBGT）の予測値／⑥ 留意事項",
    emergency: false,
  },
  {
    id: "unclear-consciousness",
    number: 5,
    legend:
      "熱中症が疑われる人の意識がはっきりしない場合、最初の分岐はどれですか。",
    context: "緊急時に様子見や無理な飲水で対応を遅らせないための確認です。",
    options: [
      {
        id: "call-ambulance",
        label: "ただちに119へ連絡して救急隊を要請する",
      },
      {
        id: "force-water",
        label: "意識がはっきりするまで、口から水を飲ませ続ける",
      },
      {
        id: "leave-alone",
        label: "一人で休ませ、次の休憩時間まで待つ",
      },
    ],
    correctOptionId: "call-ambulance",
    rationale:
      "厚生労働省の対応手順は、意識がはっきりしない場合にただちに救急隊を要請するとしています。口から無理に水分を与えず、一人にしません。",
    kind: "official-emergency-guidance",
    sourceIds: [
      HEAT_LEARNING_SOURCE_IDS.emergencyResponse,
      HEAT_LEARNING_SOURCE_IDS.currentGuideline,
    ],
    locator: "熱中症者への対応①／ガイドライン・救急処置",
    emergency: true,
  },
  {
    id: "unable-to-drink",
    number: 6,
    legend:
      "意識ははっきりしていても、自力で水分をとれない場合の対応はどれですか。",
    context: "自力飲水の可否を救急分岐として確認します。",
    options: [
      {
        id: "call-ambulance-no-force",
        label: "ただちに救急隊を要請し、無理に飲ませない",
      },
      {
        id: "force-drink",
        label: "吐いても構わず、決めた量を飲ませる",
      },
      {
        id: "return-to-work",
        label: "意識があるので作業へ戻し、後で水分をとらせる",
      },
    ],
    correctOptionId: "call-ambulance-no-force",
    rationale:
      "厚生労働省の対応手順は、自力で水分をとれない場合にただちに救急隊を要請するとしています。無理な経口摂取を行いません。",
    kind: "official-emergency-guidance",
    sourceIds: [HEAT_LEARNING_SOURCE_IDS.emergencyResponse],
    locator: "熱中症者への対応②",
    emergency: true,
  },
  {
    id: "learning-boundary",
    number: 7,
    legend: "この短時間教材を使った後の扱いとして適切なのはどれですか。",
    context: "教材の限界を確認し、画面操作だけで能力や安全を確定しません。",
    options: [
      {
        id: "supplement-and-confirm",
        label: "補助的な知識確認として使い、公式資料・事業場手順・現場条件を人が確認する",
      },
      {
        id: "legal-course-replacement",
        label: "これだけで法定教育や事業場の訓練をすべて代替する",
      },
      {
        id: "automatic-safety",
        label: "全項目を選択すれば、その日の作業を自動的に安全と判定する",
      },
    ],
    correctOptionId: "supplement-and-confirm",
    rationale:
      "この教材は公式一次資料へ速く到達し、朝礼の確認を助ける補助資料です。教育計画、実地訓練、現場の安全判断を置き換えません。",
    kind: "portal-explanation",
    sourceIds: [
      HEAT_LEARNING_SOURCE_IDS.currentGuideline,
      HEAT_LEARNING_SOURCE_IDS.officialLearning,
    ],
    locator: "教材の位置付け（サイト独自説明）",
    emergency: false,
  },
] as const satisfies readonly HeatLearningQuestion[];
