import { HEAT_ILLNESS_2025_LEGAL_SOURCE } from "@/data/heat-illness-rules/legal-source";
import {
  HEAT_LEARNING_AS_OF,
  HEAT_LEARNING_SOURCE_IDS,
} from "./sources";
import type { HeatLearningDeck } from "./types";

const [reportingDuty, responseDuty] =
  HEAT_ILLNESS_2025_LEGAL_SOURCE.duties;

/**
 * サイト独自のHTML教材。公式資料の文章・図版を複製せず、各主張から
 * 確認箇所へ戻れる短い現場用説明として構成する。
 */
export const HEAT_ILLNESS_FIELD_BRIEFING = {
  id: "heat-illness-field-briefing-2026",
  title: "熱中症を防ぐ現場ブリーフィング",
  audience: "職長・現場責任者・安全衛生担当者・作業者",
  expectedMinutes: "5〜10分",
  asOf: HEAT_LEARNING_AS_OF,
  purpose:
    "朝礼や作業前確認で、熱中症の兆候、WBGTの情報区分、予防策の優先順位、安衛則第612条の2、緊急時の分岐を14枚で確認する。",
  boundary:
    "法定教育、資格判定、医学的診断の代替ではありません。公式一次資料と事業場の手順を確認し、作業開始・再開は責任者が現場条件を踏まえて判断してください。",
  slides: [
    {
      id: "what-is-heat-illness",
      number: 1,
      eyebrow: "基礎",
      title: "熱中症とは",
      lead:
        "暑さの感じ方だけで判断せず、身体の変化と作業条件を一緒に確認します。",
      claims: [
        {
          id: "heat-illness-overview",
          kind: "portal-explanation",
          text:
            "熱中症は、暑熱環境で体温調節がうまく働かなくなるなどして生じる健康障害の総称です。自己判断で病名や重症度を確定しません。",
          sourceIds: [
            HEAT_LEARNING_SOURCE_IDS.currentGuideline,
            HEAT_LEARNING_SOURCE_IDS.officialLearning,
          ],
          locator: "ガイドライン・熱中症の症状／公式学習資料",
        },
      ],
      fieldAction:
        "本人の訴えだけに頼らず、作業前から相互確認と報告先を決める。",
    },
    {
      id: "risk-conditions",
      number: 2,
      eyebrow: "危険が高まる条件",
      title: "現場で危険が高まる条件",
      lead:
        "気象条件に、作業負荷、熱源、服装、体調、暑熱順化の状態が重なると考えます。",
      claims: [
        {
          id: "combined-risk-conditions",
          kind: "guideline-recommendation",
          text:
            "高温多湿、直射日光や放射熱、風の弱さ、高負荷・長時間作業、熱がこもる服装、暑さに慣れていない時期、体調不良などを組み合わせて確認します。",
          sourceIds: [HEAT_LEARNING_SOURCE_IDS.currentGuideline],
          locator: "ガイドライン・作業環境管理、作業管理、健康管理",
        },
      ],
      fieldAction:
        "今日の作業で該当する条件に印を付け、作業方法を変えられるものから見直す。",
    },
    {
      id: "wbgt-provenance",
      number: 3,
      eyebrow: "暑さ指数",
      title: "WBGTの見方",
      lead:
        "同じWBGTでも、値の取得方法、地点、対象時刻、取得時刻を確認します。",
      claims: [
        {
          id: "wbgt-observed",
          kind: "official-observation",
          text:
            "実測値: 環境省サイトの所定観測地点で黒球温度等を用いて算出した実況値です。作業地点そのものの実測値とは限りません。",
          sourceIds: [HEAT_LEARNING_SOURCE_IDS.wbgtDefinitions],
          locator: "① 暑さ指数（WBGT）の実測値と実況推定値",
        },
        {
          id: "wbgt-estimated-current",
          kind: "official-observation",
          text:
            "実況推定値: 気象観測値等と推定式から算出した現在付近の値です。作業地点で直接測った実測値とは表示しません。",
          sourceIds: [HEAT_LEARNING_SOURCE_IDS.wbgtDefinitions],
          locator: "① 暑さ指数（WBGT）の実測値と実況推定値",
        },
        {
          id: "wbgt-forecast",
          kind: "official-observation",
          text:
            "予測値: 気象庁の数値予報データ等から算出した将来時刻の推定です。実況や現場実測ではなく、天候変化で差が生じ得ます。",
          sourceIds: [HEAT_LEARNING_SOURCE_IDS.wbgtDefinitions],
          locator: "② 暑さ指数（WBGT）の予測値／⑥ 留意事項",
        },
      ],
      fieldAction:
        "値、区分、地点、対象時刻、取得時刻、提供元を読み上げ、可能な場合は作業位置でも測定する。",
    },
    {
      id: "before-work",
      number: 4,
      eyebrow: "作業前",
      title: "作業前確認",
      lead:
        "数値を見て終わらず、作業、設備、人、緊急時の条件を確定します。",
      claims: [
        {
          id: "prework-six-items",
          kind: "portal-explanation",
          text:
            "①気象・WBGTの出どころ、②作業強度・時間帯、③日射・熱源・通風、④休憩・冷却設備、⑤体調・服装・暑熱順化、⑥報告先・救急手順を確認します。",
          sourceIds: [
            HEAT_LEARNING_SOURCE_IDS.currentGuideline,
            HEAT_LEARNING_SOURCE_IDS.wbgtDefinitions,
            HEAT_LEARNING_SOURCE_IDS.implementationNotice,
          ],
          locator: "公式資料を現場タスクへ整理したサイト独自チェック",
        },
      ],
      fieldAction:
        "不明項目を「問題なし」に置き換えず、責任者へ確認してから作業計画を確定する。",
    },
    {
      id: "hydration-rest",
      number: 5,
      eyebrow: "作業管理",
      title: "水分・塩分・休憩",
      lead:
        "飲料だけに依存せず、作業の短縮・中止、冷却、休憩場所と組み合わせます。",
      claims: [
        {
          id: "planned-rest-hydration",
          kind: "guideline-recommendation",
          text:
            "作業時間の短縮や休止、涼しい休憩場所、水分・塩分の補給を作業計画へ入れ、作業中も条件変化に応じて見直します。",
          sourceIds: [HEAT_LEARNING_SOURCE_IDS.currentGuideline],
          locator: "ガイドライン・作業環境管理および作業管理",
        },
      ],
      fieldAction:
        "休憩開始時刻、飲料の場所、補充担当、見直し時刻を曖昧な『こまめに』ではなく具体化する。",
    },
    {
      id: "acclimatization",
      number: 6,
      eyebrow: "暑さへの適応",
      title: "暑熱順化",
      lead:
        "暑熱作業を急に通常量へ戻さず、本人の状態を見ながら段階的に調整します。",
      claims: [
        {
          id: "acclimatization-plan",
          kind: "guideline-recommendation",
          text:
            "暑さに慣れていない人、休み明け、入職・配置替え直後などを確認し、作業時間や負荷を段階的に調整します。",
          sourceIds: [HEAT_LEARNING_SOURCE_IDS.currentGuideline],
          locator: "ガイドライン・暑熱順化",
        },
      ],
      fieldAction:
        "本人任せにせず、対象者、調整内容、確認担当、再評価日を決める。",
    },
    {
      id: "warning-signs",
      number: 7,
      eyebrow: "早期発見",
      title: "体調不良のサイン",
      lead:
        "いつもと違う様子を見逃さず、症状が軽く見えても作業を続けさせません。",
      claims: [
        {
          id: "symptom-observation",
          kind: "official-emergency-guidance",
          text:
            "ふらつき、頭痛、吐き気、強い疲労感、判断や受け答えの変化など、本人または周囲が異常を感じたら作業から離し、状態を確認します。",
          sourceIds: [
            HEAT_LEARNING_SOURCE_IDS.emergencyResponse,
            HEAT_LEARNING_SOURCE_IDS.currentGuideline,
          ],
          locator: "熱中症者への対応／ガイドライン・熱中症の症状",
        },
      ],
      fieldAction:
        "作業前に『いつもと違う』を伝える言葉と報告先を全員で確認する。",
    },
    {
      id: "buddy-check",
      number: 8,
      eyebrow: "相互確認",
      title: "声かけ",
      lead:
        "定型の『大丈夫ですか』だけで終えず、応答と行動の変化を確かめます。",
      claims: [
        {
          id: "mutual-monitoring",
          kind: "guideline-recommendation",
          text:
            "単独作業を避けられるか検討し、作業中の相互確認、連絡方法、異常時に離脱させる役割を決めます。",
          sourceIds: [
            HEAT_LEARNING_SOURCE_IDS.currentGuideline,
            HEAT_LEARNING_SOURCE_IDS.implementationNotice,
          ],
          locator: "ガイドライン・健康管理／安衛則第612条の2第1項",
        },
      ],
      fieldAction:
        "声かけの間隔と担当を決め、返事だけでなく動作・表情・会話の変化を確認する。",
    },
    {
      id: "emergency-response",
      number: 9,
      eyebrow: "緊急時",
      title: "緊急時対応",
      lead:
        "作業を止め、一人にせず、意識と自力飲水の可否で救急分岐します。",
      claims: [
        {
          id: "unclear-consciousness",
          kind: "official-emergency-guidance",
          text:
            "意識がはっきりしない場合は、ただちに救急隊を要請します。口から無理に水分を与えません。",
          sourceIds: [
            HEAT_LEARNING_SOURCE_IDS.emergencyResponse,
            HEAT_LEARNING_SOURCE_IDS.currentGuideline,
          ],
          locator: "熱中症者への対応①／ガイドライン・救急処置",
        },
        {
          id: "unable-to-drink",
          kind: "official-emergency-guidance",
          text:
            "自力で水分をとれない場合は、ただちに救急隊を要請します。回復したように見えても一人にせず、状態を確認し続けます。",
          sourceIds: [
            HEAT_LEARNING_SOURCE_IDS.emergencyResponse,
            HEAT_LEARNING_SOURCE_IDS.currentGuideline,
          ],
          locator: "熱中症者への対応②／ガイドライン・救急処置",
        },
      ],
      fieldAction:
        "冷却する人、119へ連絡する人、入口で救急隊を誘導する人、付き添う人を決める。",
    },
    {
      id: "call-119-and-aed",
      number: 10,
      eyebrow: "一次救命",
      title: "119番通報とAED",
      lead:
        "熱中症対応と心肺蘇生を混同せず、反応・呼吸に異常がある場合は通信指令員とAEDの音声案内に従います。",
      claims: [
        {
          id: "aed-boundary",
          kind: "official-emergency-guidance",
          text:
            "AEDは熱中症を診断する機器ではありません。反応がなく正常な呼吸がないなど心停止が疑われる場合は、119番通報、AEDの手配、心肺蘇生を行い、通信指令員と機器の案内に従います。",
          sourceIds: [HEAT_LEARNING_SOURCE_IDS.aedFirstAid],
          locator: "消防庁・応急手当WEB講習『反応の確認』『119番通報とAEDの依頼』",
        },
      ],
      fieldAction:
        "現場住所、119通報時に伝える入口、AEDの場所、持参担当を作業前に確認する。",
    },
    {
      id: "work-plan",
      number: 11,
      eyebrow: "予防の優先順位",
      title: "作業計画への反映",
      lead:
        "用品を配る前に、暑さを避ける・減らす・隔てる対策を検討します。",
      claims: [
        {
          id: "control-hierarchy",
          kind: "portal-explanation",
          text:
            "暑い時間帯を避ける、作業量や方法を変える、延期するという本質的対策を先に検討し、日よけ・送風・冷房・休憩所などの工学的対策、休憩・体調確認などの管理的対策、補助用品を組み合わせます。",
          sourceIds: [HEAT_LEARNING_SOURCE_IDS.currentGuideline],
          locator: "ガイドラインの選択肢を対策の階層で整理したサイト独自説明",
        },
      ],
      fieldAction:
        "PPE・冷却用品だけに依存せず、作業時間・作業量・作業方法を変えられない理由まで確認する。",
    },
    {
      id: "ky-check",
      number: 12,
      eyebrow: "危険予知",
      title: "KYで使う確認項目",
      lead:
        "一般的な注意を並べず、今日の作業条件に関係する危険と行動を確定します。",
      claims: [
        {
          id: "heat-ky-fields",
          kind: "portal-explanation",
          text:
            "地域・日付、WBGTの区分と時刻、作業内容・時間、熱源・日射・服装、休憩・水分、体調確認、単独作業、報告先、119と役割分担をKYへ記録します。",
          sourceIds: [
            HEAT_LEARNING_SOURCE_IDS.currentGuideline,
            HEAT_LEARNING_SOURCE_IDS.wbgtDefinitions,
            HEAT_LEARNING_SOURCE_IDS.implementationNotice,
          ],
          locator: "公式資料をKY項目へ整理したサイト独自チェック",
        },
      ],
      fieldAction:
        "AI候補や例文は未確定として読み上げ、責任者と作業者が今日の内容へ修正して承認する。",
    },
    {
      id: "manager-check",
      number: 13,
      eyebrow: "法令と管理",
      title: "管理者の確認",
      lead:
        "安衛則第612条の2の義務と、2026年指針の推奨を分けて確認します。",
      claims: [
        {
          id: `duty-${reportingDuty.id}`,
          kind: "statutory-duty",
          text: `${reportingDuty.paragraph}「${reportingDuty.title}」: ${reportingDuty.summary}`,
          sourceIds: [
            HEAT_LEARNING_SOURCE_IDS.ordinance,
            HEAT_LEARNING_SOURCE_IDS.implementationNotice,
          ],
          locator: `${HEAT_ILLNESS_2025_LEGAL_SOURCE.article} ${reportingDuty.paragraph}`,
        },
        {
          id: `duty-${responseDuty.id}`,
          kind: "statutory-duty",
          text: `${responseDuty.paragraph}「${responseDuty.title}」: ${responseDuty.summary}`,
          sourceIds: [
            HEAT_LEARNING_SOURCE_IDS.ordinance,
            HEAT_LEARNING_SOURCE_IDS.implementationNotice,
          ],
          locator: `${HEAT_ILLNESS_2025_LEGAL_SOURCE.article} ${responseDuty.paragraph}`,
        },
        {
          id: "current-guideline-identity",
          kind: "guideline-recommendation",
          text:
            "現行の包括的な指針は、2026年3月18日付け基発0318第1号です。旧基発0420第3号は同日付けで廃止されています。",
          sourceIds: [HEAT_LEARNING_SOURCE_IDS.currentGuideline],
          locator: "基発0318第1号・本文および廃止規定",
        },
      ],
      fieldAction:
        "報告体制、悪化防止手順、周知記録、責任者、見直し日を確認し、指針の推奨を追加の法定義務と表示しない。",
    },
    {
      id: "summary-quiz",
      number: 14,
      eyebrow: "まとめ",
      title: "まとめクイズ",
      lead:
        "画面を閉じる前に、今日の現場で答えられるか声に出して確認します。",
      claims: [
        {
          id: "summary-questions",
          kind: "portal-explanation",
          text:
            "①WBGTは実測・実況推定・予測のどれか、②最初に変える作業条件は何か、③休憩と見直し時刻はいつか、④異常の報告先は誰か、⑤119とAEDの担当は誰かを答えます。",
          sourceIds: [
            HEAT_LEARNING_SOURCE_IDS.currentGuideline,
            HEAT_LEARNING_SOURCE_IDS.wbgtDefinitions,
            HEAT_LEARNING_SOURCE_IDS.emergencyResponse,
            HEAT_LEARNING_SOURCE_IDS.aedFirstAid,
          ],
          locator: "14枚の要点を現場タスクへ整理したサイト独自確認",
        },
        {
          id: "unknown-means-hold",
          kind: "portal-explanation",
          text:
            "取得不能や条件不足を『警報なし』『低リスク』『適用外』に置き換えません。公式情報と現場の実測・手順を確認できるまで結論を保留します。",
          sourceIds: [
            HEAT_LEARNING_SOURCE_IDS.currentGuideline,
            HEAT_LEARNING_SOURCE_IDS.wbgtDefinitions,
          ],
          locator: "データ欠落時のサイト独自安全境界",
        },
      ],
      fieldAction:
        "答えられない項目を責任者へ報告し、別ページの7問理解度確認で公式根拠へ戻る。",
    },
  ],
} as const satisfies HeatLearningDeck;
