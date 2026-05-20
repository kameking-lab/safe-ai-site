/**
 * 漁業 / Fishery.
 *
 * Vessel-based work brings man-overboard, machinery (winch / rope) entanglement,
 * and severe weather risks. Safety regulation crosses 安衛法 with the
 * 船員法 / 船舶職員及び小型船舶操縦者法 (small-craft operator law) ecosystem.
 * For the on-shore portion (port-side fish-handling, processing), 倉庫・運送
 * patterns also apply. Key references: 漁業の労働災害防止のためのガイドライン
 * (水産庁・厚労省共管), 平成17年水産庁通達.
 */

import type {
  CircularReference,
  LawReference,
  MonthIndex,
  MonthlyEvent,
  SafetyGoal,
  SafetyMeasure,
} from "@/types/safety-plan";

export const fisheryIndustryGoals: SafetyGoal[] = [
  {
    category: "accident-reduction",
    title: "海中転落（man overboard）死亡災害ゼロ",
    description:
      "ライフジャケット（小型船舶用救命胴衣 国土交通大臣型式承認品 / TYPE A）の常時着用、船尾通路の手すり整備、夜間・荒天時の単独作業禁止を徹底する。",
    target: "海中転落事案 0件 / 救命胴衣着用率 100%",
    kpi: "出漁日数 / 海中転落報告件数",
  },
  {
    category: "accident-reduction",
    title: "漁労機械（揚網機・トロールウインチ・延縄装置）巻き込まれ災害ゼロ",
    description:
      "揚網・揚縄装置の緊急停止スイッチを操作員から手の届く位置に設置し、ロープ・ワイヤの張力区画への立入禁止標示を徹底する。",
    target: "漁労機械関連の重大災害 0件",
    kpi: "機械点検件数 / 災害発生件数",
  },
  {
    category: "compliance",
    title: "気象・海象情報に基づく出漁可否判断の標準化",
    description:
      "海上保安庁・気象庁の警報・注意報、海上風・波高基準を出漁判断書に紐付け、船長単独の判断ではなく事業者承認制とする。",
    target: "気象基準逸脱出漁 0件",
    kpi: "出漁件数 / 気象判断書記録",
  },
];

export const fisheryIndustryMeasures: SafetyMeasure[] = [
  {
    category: "industry-specific",
    title: "ライフジャケット（救命胴衣）常時着用の徹底",
    description:
      "甲板上で作業する全乗組員に小型船舶用救命胴衣の常時着用を義務付ける。膨張式は年 1 回の点検（CO2 ボンベ・気密試験）を実施し、点検記録を 3 年間保存する。",
    frequency: "出漁の都度 / 点検は年1回",
    responsible: "船長 / 安全管理者",
    reference: "船舶安全法 / 平成30年国土交通省令第19号（着用義務化）",
  },
  {
    category: "industry-specific",
    title: "漁労機械（揚網機・ウインチ）の点検と緊急停止装置の確認",
    description:
      "揚網機・トロールウインチ・延縄装置・ローラー類の張力・チェーン・油圧の状態を出漁前・出漁後に点検し、緊急停止スイッチの作動確認を毎日実施する。",
    frequency: "出漁前・出漁後（毎日） / 月次総点検",
    responsible: "機関長 / 漁労長",
    reference: "安衛則第28条 / 漁業労働災害防止ガイドライン",
  },
  {
    category: "industry-specific",
    title: "気象・海象情報の確認と出漁可否判断",
    description:
      "気象庁の警報・注意報、海上保安庁の海上風・波高情報、漁場周辺の潮流予報を出漁前にチェックし、判断書を作成・保存する。事業者の最終承認なく出漁しない。",
    frequency: "出漁の都度",
    responsible: "船長 / 事業者",
    reference: "気象業務法 / 漁業労働安全衛生指針",
  },
  {
    category: "industry-specific",
    title: "船内通信・救助連絡体制と救命設備の点検",
    description:
      "船舶間 VHF 無線、衛星携帯電話、EPIRB（非常用位置指示無線標識）の動作確認を月 1 回実施し、救命浮環・救命いかだの有効期限を管理する。",
    frequency: "月1回 / 機器点検は年1回",
    responsible: "機関長 / 通信担当",
    reference: "船舶安全法施行規則",
  },
  {
    category: "industry-specific",
    title: "陸上（港・水産加工場）作業の滑り・転倒予防",
    description:
      "魚倉・水産加工場の濡れた床面に滑り止め・吸水マットを敷設し、長靴の滑り止めパターンを点検する。冷蔵設備（冷凍庫）に閉じ込められた場合の解錠手順を周知する。",
    frequency: "通年 / 床面点検は週1回",
    responsible: "場長 / 衛生推進者",
    reference: "安衛則第544条（通路・床面の保護）",
  },
];

export const fisheryMonthlyExtras: Partial<Record<MonthIndex, MonthlyEvent[]>> = {
  3: [
    {
      title: "春の出漁前 船体・機関・救命設備総点検",
      category: "equipment-check",
      description:
        "船体外板・係留索・揚網機・救命胴衣・救命浮環・EPIRB を出漁シーズン前に総点検し、不具合品を取り替える。",
      required: false,
    },
  ],
  6: [
    {
      title: "全国安全週間 漁業特別取組",
      category: "industry-specific",
      description:
        "海中転落・漁労機械巻き込まれの過去事例を共有し、救命胴衣着用率・緊急停止装置作動状況を全乗組員で確認する。",
      required: false,
    },
  ],
  8: [
    {
      title: "台風・荒天期の出漁判断強化",
      category: "industry-specific",
      description:
        "気象庁・海上保安庁情報に基づき出漁可否を厳格化。事業者の最終承認なく出漁しない方針を全乗組員に再周知する。",
      required: true,
    },
  ],
  10: [
    {
      title: "秋漁繁忙期の疲労管理と単独作業禁止",
      category: "industry-specific",
      description:
        "深夜・早朝の単独作業を禁止し、休息時間と仮眠スペースを確保する。長時間労働が常態化していないかを衛生委員会で月次レビューする。",
      required: false,
    },
  ],
  12: [
    {
      title: "冬季 低体温症・凍結甲板対策",
      category: "industry-specific",
      description:
        "甲板凍結時の滑り止め敷設、防寒着・防水手袋の支給、海中転落時の低体温症救助手順（保温・搬送）を訓練する。",
      required: false,
    },
  ],
};

export const fisheryLawReferences: LawReference[] = [
  {
    name: "船舶安全法（漁業関連）",
    articles: [
      "第6条の3（救命設備）",
      "平成30年国土交通省令第19号（救命胴衣常時着用義務化）",
    ],
    summary:
      "小型船舶において作業時の救命胴衣常時着用を義務化。膨張式の場合は CO2 ボンベ・気密試験の定期点検が必要。",
  },
  {
    name: "労働安全衛生規則（漁業関連）",
    articles: [
      "第28条（機械の運転開始の合図）",
      "第544条（通路・床面の保護）",
      "第612条の2（高温多湿の屋内作業場・船内）",
    ],
    summary:
      "漁労機械の合図・通路・床面・温熱環境を定める。陸上水産加工場にも適用される。",
  },
  {
    name: "船員法 / 船舶職員及び小型船舶操縦者法",
    articles: [
      "船員法第82条（健康診断）",
      "小型船舶操縦者法 第23条の36（操縦資格）",
    ],
    summary:
      "船員の健康診断と、小型船舶を操縦する者の資格・遵守事項（救命胴衣着用等）を定める。",
  },
];

export const fisheryCircularReferences: CircularReference[] = [
  {
    number: "30国海安第143号",
    date: "2018-02-01",
    title: "小型船舶用救命胴衣の常時着用義務化について（国土交通省）",
  },
  {
    number: "水管第3450号",
    date: "2020-03-30",
    title: "漁業における労働災害防止のためのガイドライン（水産庁・厚労省）",
  },
];

export const fisheryBasicPolicy = `当社は、海中転落と漁労機械巻き込まれを二大重点リスクとし、救命胴衣の常時着用、緊急停止装置の毎日点検、気象・海象情報に基づく出漁可否判断の事業者承認制を年次計画の柱とする。船員法・船舶安全法・労働安全衛生法を一体で運用し、乗組員・陸上水産加工場従業員のいずれもが安全に従事できる職場づくりを推進する。`;
