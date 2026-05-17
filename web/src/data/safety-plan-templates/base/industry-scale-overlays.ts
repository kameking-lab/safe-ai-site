/**
 * Industry × scale overlays.
 *
 * Each of the 10 industries pairs with each of the 3 scales (small/medium/large)
 * to produce 30 truly distinct templates. The overlay supplies scale-tuned
 * extra goals, measures, and (optionally) monthly events on top of the
 * industry's base material in `industries/*.ts`.
 *
 * Goals/measures here cite article numbers only — full statutory text is not
 * reproduced (CLAUDE.md: 法令本文の逐語転載禁止).
 */

import type {
  IndustryId,
  MonthIndex,
  MonthlyEvent,
  SafetyGoal,
  SafetyMeasure,
  ScaleId,
} from "@/types/safety-plan";

export interface IndustryScaleOverlay {
  extraGoals: SafetyGoal[];
  extraMeasures: SafetyMeasure[];
  extraMonthlyEvents: Partial<Record<MonthIndex, MonthlyEvent[]>>;
}

type OverlayMatrix = Record<IndustryId, Record<ScaleId, IndustryScaleOverlay>>;

const EMPTY_MONTHLY: Partial<Record<MonthIndex, MonthlyEvent[]>> = {};

export const INDUSTRY_SCALE_OVERLAYS: OverlayMatrix = {
  construction: {
    small: {
      extraGoals: [
        {
          category: "education-coverage",
          title: "職長・新規入場者教育の確実な実施",
          description:
            "小規模工事においても職長教育修了者を確保し、新規入場者教育を省略しない。教育記録は工事終了後5年間保存する。",
          target: "職長教育修了率 100% / 新規入場者教育実施率 100%",
          kpi: "教育記録（教育台帳）の対象者数と修了者数",
        },
      ],
      extraMeasures: [
        {
          category: "industry-specific",
          title: "建災防方式安全衛生計画書（小規模事業者用）の活用",
          description:
            "建災防が公開する小規模事業者向けの様式を活用し、現場ごとに簡易な安全衛生計画書を作成する。元請からの様式指定がある場合はそちらを優先。",
          frequency: "工事の都度",
          responsible: "現場代理人",
        },
        {
          category: "industry-specific",
          title: "外部労働衛生コンサルタント等の活用",
          description:
            "衛生管理体制が小規模なため、地域の労働衛生コンサルタント・労災防止指導員の年2回以上の指導を受け、改善実施記録を残す。",
          frequency: "半期に1回",
          responsible: "事業者",
        },
      ],
      extraMonthlyEvents: EMPTY_MONTHLY,
    },
    medium: {
      extraGoals: [
        {
          category: "ra-coverage",
          title: "工種別リスクアセスメントの定着",
          description:
            "高所作業・重機作業・電気作業・解体作業の主要工種について、着工前にRAを実施し、対策を作業手順書へ反映する。",
          target: "主要工種 100% でRA実施 / 高リスク残置 0件",
          kpi: "RA実施件数 / 対象工種数",
        },
      ],
      extraMeasures: [
        {
          category: "committee",
          title: "安全衛生協議組織（職長会・協力会社合同）の運営",
          description:
            "特定元方事業者として月1回以上の協議組織を開催し、混在作業の連絡調整、安全衛生教育の合同実施、巡視結果共有を行う。",
          frequency: "月1回以上",
          responsible: "統括安全衛生責任者",
          reference: "安衛則第635条",
        },
        {
          category: "industry-specific",
          title: "クレーン等運転業務技能講習・特別教育の計画的実施",
          description:
            "玉掛け・小型移動式クレーン・高所作業車・足場の組立て等作業主任者の有資格者数を年度計画で管理し、不足前に受講させる。",
          frequency: "年度計画ベース",
          responsible: "安全管理者",
          reference: "安衛法第59条第3項",
        },
      ],
      extraMonthlyEvents: {
        5: [
          {
            title: "協力会社合同 春の安全大会",
            category: "industry-specific",
            description:
              "全国安全週間に先立ち、協力会社を含めた合同安全大会を開催。元請方針の徹底と功労者表彰を行う。",
            required: false,
          },
        ],
      },
    },
    large: {
      extraGoals: [
        {
          category: "compliance",
          title: "店社安全衛生管理者・元方安全衛生管理者の業務徹底",
          description:
            "全現場で店社安全衛生管理者の月次巡視を実施し、評価結果を本社安全衛生委員会で集約・水平展開する。",
          target: "店社巡視実施率 100% / 是正完了 30日以内 100%",
          kpi: "巡視回数 / 是正完了率",
        },
        {
          category: "accident-reduction",
          title: "労働安全衛生マネジメントシステム（OSHMS）の運用",
          description:
            "JIS Q 45100 / ISO 45001 に基づくOSHMSを継続的に運用し、PDCAサイクルで方針・目標・実施事項を更新する。",
          target: "内部監査 年1回以上 / マネジメントレビュー 年1回以上",
          kpi: "監査指摘件数 / 是正完了件数",
        },
      ],
      extraMeasures: [
        {
          category: "committee",
          title: "店社安全衛生管理者の選任と巡視",
          description:
            "ずい道等の建設、橋梁建設等で、現場における安全衛生管理体制を補完するため店社安全衛生管理者を選任し、毎月1回以上現場を巡視する。",
          frequency: "月1回以上",
          responsible: "店社安全衛生管理者",
          reference: "安衛法第15条の3 / 安衛則第18条の6",
        },
        {
          category: "ra",
          title: "本支店レベル危険有害情報の水平展開",
          description:
            "重大災害・ヒヤリハットを48時間以内に本社安全衛生部門へ報告し、全現場への注意喚起と対策展開を実施する。",
          frequency: "発生の都度",
          responsible: "本社安全衛生部門",
        },
      ],
      extraMonthlyEvents: {
        2: [
          {
            title: "OSHMS マネジメントレビュー",
            category: "committee",
            description:
              "経営層が安全衛生方針・目標・実施結果を見直し、次年度の方針更新に反映する。",
            required: false,
          },
        ],
      },
    },
  },
  manufacturing: {
    small: {
      extraGoals: [
        {
          category: "accident-reduction",
          title: "機械はさまれ・巻き込まれ災害ゼロ",
          description:
            "プレス・ロール・ベルトコンベア等での挟まれ・巻き込まれ事故を防止する。インターロック・覆い・囲い・非常停止装置の機能を毎日始業前点検で確認する。",
          target: "挟まれ・巻き込まれ災害 0件",
          kpi: "災害発生件数 / 機械稼働時間",
        },
      ],
      extraMeasures: [
        {
          category: "equipment-check",
          title: "機械等の始業前点検（簡易チェックリスト）",
          description:
            "各機械ごとの点検項目を1枚のチェックリストに整理し、始業時に作業者が確認・記録する。点検結果は1か月分を職長が確認する。",
          frequency: "毎作業日",
          responsible: "作業者 / 職長",
          reference: "安衛則第151条の31等",
        },
        {
          category: "ra",
          title: "化学物質の簡易リスクアセスメント（CREATE-SIMPLE）",
          description:
            "厚労省版CREATE-SIMPLEを使用し、取扱化学物質ごとに15分程度のRAを実施。記録は3年間保存。",
          frequency: "新規導入時 / 年1回見直し",
          responsible: "化学物質管理者",
          reference: "安衛則第34条の2の7",
        },
      ],
      extraMonthlyEvents: EMPTY_MONTHLY,
    },
    medium: {
      extraGoals: [
        {
          category: "ra-coverage",
          title: "化学物質リスクアセスメント対象物の管理徹底",
          description:
            "リスクアセスメント対象物（674物質）を全て台帳化し、ばく露低減措置の効果を測定。皮膚等障害化学物質には不浸透性保護具を選定する。",
          target: "対象物 100% 台帳化 / ばく露低減措置 100% 実施",
          kpi: "SDS 整備率 / RA 実施率",
        },
      ],
      extraMeasures: [
        {
          category: "committee",
          title: "化学物質管理者・保護具着用管理責任者の選任と職務遂行",
          description:
            "リスクアセスメント対象物を製造・取扱う事業場で選任義務。化学物質管理者は管理状況の文書記録、保護具着用管理責任者は保護具の選定・使用管理を行う。",
          frequency: "選任時 / 異動時",
          responsible: "事業者",
          reference: "安衛則第12条の5・第12条の6",
        },
        {
          category: "inspection",
          title: "作業環境測定（粉じん・有機溶剤・特定化学物質等）",
          description:
            "対象作業場で6か月以内ごとに1回作業環境測定を実施。第3管理区分は速やかに第1・第2へ改善する措置を講ずる。",
          frequency: "6か月以内ごとに1回",
          responsible: "作業環境測定士（外部委託可）",
          reference: "作業環境測定法 / 安衛法第65条",
        },
      ],
      extraMonthlyEvents: {
        8: [
          {
            title: "化学物質取扱い再教育",
            category: "education",
            description:
              "暑熱期に保護具着用が緩みやすいため、化学物質取扱者の再教育とSDSの再確認を実施。",
            required: false,
          },
        ],
      },
    },
    large: {
      extraGoals: [
        {
          category: "accident-reduction",
          title: "機械譲渡時の通知義務遵守",
          description:
            "新設・更新機械について、機械譲渡時通知制度に基づき残留リスク情報を文書で受領し、安全教育・作業手順書へ反映する。",
          target: "対象機械 100% で通知文書受領・反映",
          kpi: "受領率 / 反映完了率",
        },
        {
          category: "compliance",
          title: "労働安全衛生マネジメントシステム（OSHMS）の認証維持",
          description:
            "JIS Q 45100 / ISO 45001 を運用し、外部認証または内部認証を維持。",
          target: "認証維持 / 内部監査 年1回 / マネジメントレビュー 年1回",
          kpi: "監査指摘件数 / 是正完了率",
        },
      ],
      extraMeasures: [
        {
          category: "ra",
          title: "機械譲渡時通知制度の運用（受領側）",
          description:
            "新規導入機械について、譲渡者が交付する残留リスクマップ・使用上の注意・使用上の制限を受領し、作業者教育・作業手順書へ反映する。",
          frequency: "機械導入の都度",
          responsible: "設備管理部門 / 安全管理者",
          reference: "基発0731第1号（機械の包括安全指針）",
        },
        {
          category: "industry-specific",
          title: "本社安全部主導の重大災害情報の全社展開",
          description:
            "重大災害・重大ヒヤリハットを72時間以内に全工場へ通知。月次の災害分析会議で再発防止策の進捗を確認。",
          frequency: "発生の都度 / 月次集約",
          responsible: "本社安全部門",
        },
      ],
      extraMonthlyEvents: {
        11: [
          {
            title: "全工場 安全衛生監査",
            category: "inspection",
            description:
              "本社安全部主導で各工場の安全衛生監査を実施し、指摘事項を翌年度計画へ反映。",
            required: false,
          },
        ],
      },
    },
  },
  transportation: {
    small: {
      extraGoals: [
        {
          category: "accident-reduction",
          title: "交通事故ゼロ・運行中死亡災害ゼロ",
          description:
            "運転者の始業前点呼・点検・健康確認を徹底し、運行中の事故・健康起因事故を防止する。",
          target: "運行中事故 0件 / 健康起因事故 0件",
          kpi: "事故件数 / 運行日数 / 健康確認実施率",
        },
      ],
      extraMeasures: [
        {
          category: "industry-specific",
          title: "始業前・終業後の点呼とアルコールチェック",
          description:
            "事業用自動車運転者に対し、対面または機器を用いた点呼を実施し、酒気帯び有無・体調・運行経路を確認する。アルコール検知器の点検記録も保存。",
          frequency: "毎運行（始業前・終業後）",
          responsible: "運行管理者",
          reference: "貨物自動車運送事業法 / 旅客自動車運送事業運輸規則",
        },
        {
          category: "industry-specific",
          title: "運転者の適性診断・運転記録証明書の確認",
          description:
            "新規・高齢・事故惹起運転者に対し、自動車事故対策機構（NASVA）等の適性診断を受診させ、結果を運転者ごとに保管する。",
          frequency: "対象者の発生時",
          responsible: "運行管理者",
        },
      ],
      extraMonthlyEvents: EMPTY_MONTHLY,
    },
    medium: {
      extraGoals: [
        {
          category: "health-promotion",
          title: "睡眠時無呼吸症候群（SAS）スクリーニング受診",
          description:
            "事業用自動車運転者を中心にSASスクリーニング検査を実施し、要精査者の治療を支援する。",
          target: "対象運転者の受診率 90% 以上",
          kpi: "受診者数 / 対象運転者数 / 治療継続率",
        },
      ],
      extraMeasures: [
        {
          category: "health-check",
          title: "運転者の特定業務従事者健康診断",
          description:
            "深夜業を含む業務に従事する運転者には6か月以内ごとに1回の健診を実施。生活習慣病・SAS等の所見管理を継続。",
          frequency: "6か月以内ごとに1回",
          responsible: "産業医 / 衛生管理者",
          reference: "安衛則第45条",
        },
        {
          category: "industry-specific",
          title: "デジタルタコグラフ・ドライブレコーダーの活用",
          description:
            "運行記録の月次レビューで、速度超過・急加減速・連続運転時間超過を抽出し、運転者にフィードバックする。",
          frequency: "月1回",
          responsible: "運行管理者",
        },
      ],
      extraMonthlyEvents: {
        12: [
          {
            title: "年末年始繁忙期の運行管理強化",
            category: "industry-specific",
            description:
              "年末年始の輸送繁忙期に向け、運転者の労働時間管理と健康確認を強化。改善基準告示の上限を超えない運行計画を徹底。",
            reference: "改善基準告示（厚労省告示第7号）",
            required: true,
          },
        ],
      },
    },
    large: {
      extraGoals: [
        {
          category: "compliance",
          title: "改善基準告示遵守 100%",
          description:
            "拘束時間・休息期間・運転時間・連続運転時間の上限を超える運行をゼロにし、運行管理システムで自動検知する。",
          target: "改善基準告示違反 0件",
          kpi: "違反検知件数 / 運行件数",
        },
      ],
      extraMeasures: [
        {
          category: "industry-specific",
          title: "テレマティクス・AI ドラレコによる運転行動分析",
          description:
            "わき見・眠気・車間距離不足等のAI検知結果を月次集計し、運転者個別の指導計画と評価制度に連動させる。",
          frequency: "月1回",
          responsible: "本社運行管理部門",
        },
        {
          category: "industry-specific",
          title: "事業所横断 ヒヤリ・ハット共有プラットフォーム",
          description:
            "全事業所のヒヤリハット・事故情報を共通システムで集約し、地理・時間・事象分類で分析。重大ヒヤリは48時間以内に全事業所へ展開。",
          frequency: "通年（月次集計）",
          responsible: "本社安全部門",
        },
      ],
      extraMonthlyEvents: {
        3: [
          {
            title: "全事業所 安全運転コンクール表彰",
            category: "education",
            description:
              "年間無事故事業所・運転者を表彰し、好事例を全社に水平展開する。",
            required: false,
          },
        ],
      },
    },
  },
  medical: {
    small: {
      extraGoals: [
        {
          category: "accident-reduction",
          title: "針刺し・切創事故の低減",
          description:
            "感染性血液・体液への曝露を防止するため、リキャップ禁止・安全装置付鋭利器材の導入・廃棄ルートの単純化を徹底する。",
          target: "針刺し・切創事故 前年比 30% 減",
          kpi: "事故報告件数 / 在籍医療従事者数",
        },
      ],
      extraMeasures: [
        {
          category: "industry-specific",
          title: "感染症対策（標準予防策・経路別予防策）",
          description:
            "標準予防策の周知、麻疹・風疹・水痘・流行性耳下腺炎・B型肝炎の抗体検査・予防接種の機会提供を実施。",
          frequency: "通年 / 雇入れ時",
          responsible: "院内感染対策担当 / 産業医",
        },
        {
          category: "industry-specific",
          title: "院内暴力・ハラスメントの相談窓口運用",
          description:
            "患者・家族からの暴言暴力に対応する手順書を整備し、相談窓口を労働者へ周知。発生時は警察・労基署への通報も視野に対応する。",
          frequency: "通年",
          responsible: "管理者 / 相談窓口担当",
        },
      ],
      extraMonthlyEvents: EMPTY_MONTHLY,
    },
    medium: {
      extraGoals: [
        {
          category: "health-promotion",
          title: "夜勤者の健康管理",
          description:
            "夜勤・交代制勤務従事者の健康診断と保健指導を強化し、生活習慣病・睡眠障害のリスクを管理する。",
          target: "深夜業健診受診率 100% / 事後措置完了率 90% 以上",
          kpi: "受診者数 / 対象者数",
        },
      ],
      extraMeasures: [
        {
          category: "industry-specific",
          title: "腰痛予防対策（介護・看護業務）",
          description:
            "厚労省「職場における腰痛予防対策指針」に基づき、移乗介助のリフト・スライディングシート導入、ノーリフトケアの教育、腰痛健康診断を実施。",
          frequency: "通年 / 健診は配置前・6か月以内ごとに1回",
          responsible: "看護部長 / 産業医",
          reference: "基発0618第1号（腰痛予防対策指針）",
        },
        {
          category: "industry-specific",
          title: "抗がん剤等ハザーダスドラッグ（HD）ばく露防止",
          description:
            "HD取扱いの作業手順書・閉鎖式調製機器の導入・廃棄ルートの分離を実施。妊娠中・授乳中の労働者の配置に配慮。",
          frequency: "通年 / 教育は年1回以上",
          responsible: "薬剤部 / 産業医",
        },
      ],
      extraMonthlyEvents: {
        6: [
          {
            title: "院内感染対策週間",
            category: "education",
            description:
              "標準予防策の再教育、手指衛生の遵守率調査、針刺し事故報告ルートの再周知を実施。",
            required: false,
          },
        ],
      },
    },
    large: {
      extraGoals: [
        {
          category: "mental-health",
          title: "医療従事者のバーンアウト予防",
          description:
            "看護・医師・救急対応職を中心にバーンアウトスケールを年2回測定し、要対応者に産業医・EAP面談を提供する。",
          target: "バーンアウト要対応者 100% 面談実施",
          kpi: "測定実施率 / 面談実施件数",
        },
      ],
      extraMeasures: [
        {
          category: "committee",
          title: "病院BCP（事業継続計画）の安全衛生統合運用",
          description:
            "災害時・パンデミック時の人員配置・PPE備蓄・代替勤務体制を、安全衛生委員会と感染制御委員会で連携運用。年1回の机上演習を実施。",
          frequency: "年1回演習 / 通年運用",
          responsible: "病院長 / 安全衛生委員会",
        },
        {
          category: "industry-specific",
          title: "多職種ラウンド（医師・看護・薬剤・臨床工学・事務）",
          description:
            "院内の安全衛生上の問題を多職種で月1回ラウンドし、是正項目を院長へ報告。",
          frequency: "月1回",
          responsible: "安全衛生委員会事務局",
        },
      ],
      extraMonthlyEvents: {
        1: [
          {
            title: "BCP 机上演習",
            category: "drill",
            description:
              "大規模災害・新興感染症を想定したBCP机上演習を実施し、各部門の対応手順を点検する。",
            required: false,
          },
        ],
      },
    },
  },
  service: {
    small: {
      extraGoals: [
        {
          category: "mental-health",
          title: "ひとり作業者・接客従事者のメンタル不調早期発見",
          description:
            "ひとり勤務・夜間勤務・対面接客のストレスを軽減するため、定期面談と相談窓口を整備する。",
          target: "面談実施率 90% 以上",
          kpi: "面談件数 / 対象者数",
        },
      ],
      extraMeasures: [
        {
          category: "industry-specific",
          title: "カスタマーハラスメント対応マニュアル",
          description:
            "厚労省「カスタマーハラスメント対策マニュアル」を参考に、対応フロー・退避基準・記録様式・相談窓口を整備し、全従業員に周知。",
          frequency: "策定後 / 年1回見直し",
          responsible: "事業者 / 店長",
          reference: "厚生労働省カスタマーハラスメント対策企業マニュアル（令和4年）",
        },
        {
          category: "industry-specific",
          title: "ひとり作業時の緊急通報手段確保",
          description:
            "ひとり勤務時に異常があった場合の通報手段（携帯電話・非常ボタン・定時連絡）を整備し、訓練を年1回実施。",
          frequency: "通年 / 訓練は年1回",
          responsible: "店長 / 事業者",
        },
      ],
      extraMonthlyEvents: EMPTY_MONTHLY,
    },
    medium: {
      extraGoals: [
        {
          category: "health-promotion",
          title: "シフト勤務者の睡眠・健康管理",
          description:
            "シフト勤務者の連続夜勤回数・勤務間インターバルを管理し、生活習慣病健診の事後措置を確実に実施。",
          target: "勤務間インターバル 11時間以上確保率 95% 以上",
          kpi: "勤務間インターバル違反件数 / シフト総数",
        },
      ],
      extraMeasures: [
        {
          category: "industry-specific",
          title: "店舗・施設の月次安全衛生パトロール",
          description:
            "本部・エリア担当による月次パトロールで、避難経路・消火設備・清掃用品保管・冷暖房・休憩設備を点検する。",
          frequency: "月1回",
          responsible: "エリアマネージャー",
        },
        {
          category: "education",
          title: "ハラスメント防止研修（パワー・セクシュアル・カスタマー）",
          description:
            "管理職・一般職向けに年1回の研修を実施し、相談窓口の利用方法・対応事例を共有する。",
          frequency: "年1回",
          responsible: "人事部 / 衛生委員会",
          reference: "労働施策総合推進法第30条の2",
        },
      ],
      extraMonthlyEvents: EMPTY_MONTHLY,
    },
    large: {
      extraGoals: [
        {
          category: "compliance",
          title: "多拠点の安全衛生標準化",
          description:
            "全拠点で安全衛生方針・手順書・教育カリキュラム・記録様式を統一し、本部主導で監査を実施。",
          target: "本部監査 全拠点 年1回以上 / 重大指摘ゼロ",
          kpi: "監査実施率 / 指摘件数",
        },
      ],
      extraMeasures: [
        {
          category: "industry-specific",
          title: "外国人労働者を含む多言語安全衛生教育",
          description:
            "雇用する外国人労働者の母語に応じた教材（英語・中国語・ベトナム語等）で教育を実施。やさしい日本語版も併用。",
          frequency: "雇入れ時 / 年1回",
          responsible: "人事部 / 店長",
          reference: "外国人労働者の雇用管理の改善等指針",
        },
        {
          category: "industry-specific",
          title: "EAP（従業員支援プログラム）契約と利用促進",
          description:
            "外部EAPと契約し、メンタル不調・ハラスメント・家族問題等の相談機会を全従業員に提供。月次利用件数を匿名集計。",
          frequency: "通年",
          responsible: "人事部",
        },
      ],
      extraMonthlyEvents: {
        7: [
          {
            title: "全拠点 安全衛生本部監査",
            category: "inspection",
            description:
              "本部安全衛生部門が全拠点を巡回監査。指摘事項は30日以内に是正完了。",
            required: false,
          },
        ],
      },
    },
  },
  retail: {
    small: {
      extraGoals: [
        {
          category: "accident-reduction",
          title: "転倒・滑り災害ゼロ",
          description:
            "売場・バックヤード・階段の滑りやすい箇所を可視化し、滑り止めマット・手すり・滑り止め靴の支給で転倒を防止する。",
          target: "転倒・滑り災害 0件",
          kpi: "災害発生件数 / 在籍者数",
        },
      ],
      extraMeasures: [
        {
          category: "industry-specific",
          title: "売場・バックヤードの整理整頓・通路確保",
          description:
            "通路幅・避難経路の確保、商品の高所積上げ禁止、台車・脚立の点検を毎日実施。",
          frequency: "毎日",
          responsible: "店長",
        },
        {
          category: "industry-specific",
          title: "万引き・強盗対応手順",
          description:
            "強盗・万引き発生時の対応（抵抗しない・通報優先・現場保存）を全従業員に周知し、年1回ロールプレイ訓練。",
          frequency: "年1回",
          responsible: "店長",
        },
      ],
      extraMonthlyEvents: EMPTY_MONTHLY,
    },
    medium: {
      extraGoals: [
        {
          category: "mental-health",
          title: "カスタマーハラスメントによる離職防止",
          description:
            "カスハラに起因するメンタル不調・離職を低減するため、対応手順と相談窓口を整備し、被害従業員のフォローを徹底。",
          target: "カスハラ起因の休職・離職 前年比 50% 減",
          kpi: "相談件数 / 対応完了率",
        },
      ],
      extraMeasures: [
        {
          category: "industry-specific",
          title: "カスタマーハラスメント対応マニュアルと従業員保護",
          description:
            "厚労省マニュアル準拠で対応フロー・退避基準・店長への引継ぎ手順を整備。録音録画の運用、警察通報基準も明記。",
          frequency: "策定後 / 年1回見直し",
          responsible: "店長 / 本部総務",
          reference: "厚生労働省カスタマーハラスメント対策企業マニュアル",
        },
        {
          category: "equipment-check",
          title: "レジ・冷凍冷蔵設備・調理機器の点検",
          description:
            "レジカウンター周辺の段差・コード、冷凍冷蔵庫の温度管理、調理機器の安全装置を月次点検。",
          frequency: "月1回",
          responsible: "店長 / 設備担当",
        },
      ],
      extraMonthlyEvents: EMPTY_MONTHLY,
    },
    large: {
      extraGoals: [
        {
          category: "compliance",
          title: "多店舗統一の安全衛生マネジメント",
          description:
            "全店舗で本部標準の安全衛生手順を運用し、本部監査と店舗自主点検を年複数回実施。",
          target: "本部監査全店舗 年1回 / 重大指摘ゼロ",
          kpi: "監査実施率 / 指摘件数",
        },
      ],
      extraMeasures: [
        {
          category: "industry-specific",
          title: "AI 防犯カメラ・センサーによる転倒予兆検知",
          description:
            "売場のAIカメラで転倒・気分不良・暴行を検知し、本部・警備会社への通報を自動化。プライバシー保護の運用ルールを併設。",
          frequency: "通年",
          responsible: "本部設備管理部門",
        },
        {
          category: "industry-specific",
          title: "外国人労働者向け多言語教育",
          description:
            "母語別の安全衛生教育・カスハラ対応教材を提供し、各店舗で雇入れ時・配置転換時に確実に教育する。",
          frequency: "雇入れ時 / 年1回",
          responsible: "本部人事部 / 店長",
        },
      ],
      extraMonthlyEvents: {
        10: [
          {
            title: "全店舗 安全衛生本部監査",
            category: "inspection",
            description:
              "全店舗の安全衛生監査を実施し、指摘事項は30日以内に是正完了。",
            required: false,
          },
        ],
      },
    },
  },
  food: {
    small: {
      extraGoals: [
        {
          category: "accident-reduction",
          title: "切創・火傷・転倒の3大災害ゼロ",
          description:
            "包丁・スライサー・揚げ油・床面の3要因に対する対策を徹底し、災害ゼロを目指す。",
          target: "切創・火傷・転倒 各 0件",
          kpi: "災害発生件数 / 在籍者数",
        },
      ],
      extraMeasures: [
        {
          category: "industry-specific",
          title: "厨房機器の始業前点検と保護具着用",
          description:
            "スライサー・フライヤー・ガスコンロ・包丁の点検を始業前に実施。耐熱手袋・耐切創手袋・滑り止め靴を支給。",
          frequency: "毎日始業前",
          responsible: "店長 / 料理長",
        },
        {
          category: "industry-specific",
          title: "床面の滑り対策と清掃手順",
          description:
            "厨房・客席の床面を業務終了時に油分・水分を除去。滑り止めマット・吸水マットを通路に配置。清掃用洗剤のSDSを掲示。",
          frequency: "毎日",
          responsible: "店長",
        },
      ],
      extraMonthlyEvents: EMPTY_MONTHLY,
    },
    medium: {
      extraGoals: [
        {
          category: "mental-health",
          title: "カスタマーハラスメント・長時間労働起因のメンタル不調防止",
          description:
            "ピーク時間帯の負担・カスハラを減らすシフト編成と相談窓口運用を実施する。",
          target: "メンタル不調による休職 前年比 30% 減",
          kpi: "相談件数 / 休職件数",
        },
      ],
      extraMeasures: [
        {
          category: "industry-specific",
          title: "HACCP・食品衛生と労働安全衛生の統合運用",
          description:
            "HACCP手順書と労働安全衛生手順を1冊で運用し、洗浄・消毒作業時の化学物質ばく露・転倒・腰痛を併せて管理。",
          frequency: "通年",
          responsible: "食品衛生責任者 / 安全衛生担当",
        },
        {
          category: "industry-specific",
          title: "ハラスメント防止研修と相談窓口",
          description:
            "パワー・セクシュアル・カスタマーハラスメントを統合した研修を年1回実施。匿名相談窓口を設置。",
          frequency: "年1回",
          responsible: "本部人事 / 店長",
          reference: "労働施策総合推進法第30条の2",
        },
      ],
      extraMonthlyEvents: {
        8: [
          {
            title: "夏季の食中毒・熱中症対策の同時推進",
            category: "industry-specific",
            description:
              "厨房・配送中の食中毒予防と従業員の熱中症予防を同時に運用。冷却機器・温度管理を強化。",
            required: true,
          },
        ],
      },
    },
    large: {
      extraGoals: [
        {
          category: "compliance",
          title: "多店舗・本部統一の安全衛生・食品衛生マネジメント",
          description:
            "全店舗で本部標準の安全衛生・食品衛生手順を運用し、本部監査を年1回以上実施。",
          target: "本部監査 全店舗 年1回以上 / 重大指摘ゼロ",
          kpi: "監査実施率 / 指摘件数",
        },
      ],
      extraMeasures: [
        {
          category: "industry-specific",
          title: "外国人技能実習生・特定技能の母語教育",
          description:
            "外国人従業員の母語に応じた安全衛生・食品衛生教材を整備し、雇入れ時・職場異動時に確実に教育。",
          frequency: "雇入れ時 / 配置転換時 / 年1回",
          responsible: "本部人事 / 店長",
        },
        {
          category: "industry-specific",
          title: "中央キッチンの大型機器（フライヤー・蒸気釜等）安全管理",
          description:
            "大型機器の年次点検・操作者教育・非常停止訓練を年1回実施。緊急時の通報手順と医療連携先を明示。",
          frequency: "年1回 / 操作者教育は配置時",
          responsible: "中央キッチン責任者",
        },
      ],
      extraMonthlyEvents: EMPTY_MONTHLY,
    },
  },
  wholesale: {
    small: {
      extraGoals: [
        {
          category: "accident-reduction",
          title: "フォークリフト・荷役災害ゼロ",
          description:
            "フォークリフトの操作・歩行者との接触・荷崩れを防止する。",
          target: "フォークリフト・荷役災害 0件",
          kpi: "災害発生件数 / 稼働時間",
        },
      ],
      extraMeasures: [
        {
          category: "industry-specific",
          title: "フォークリフト運転技能講習修了者の確保",
          description:
            "最大荷重1t以上は技能講習、1t未満は特別教育の修了者のみ運転可。修了証は写しを台帳保管。",
          frequency: "新規対象者の都度",
          responsible: "事業者",
          reference: "安衛法第61条 / 安衛則第41条",
        },
        {
          category: "industry-specific",
          title: "荷の積卸し作業計画と合図者の配置",
          description:
            "高さ2m以上の荷の積卸しは作業指揮者を選任。合図者を配置し、立入禁止区画を設定。",
          frequency: "対象作業の都度",
          responsible: "作業指揮者",
          reference: "安衛則第151条の48",
        },
      ],
      extraMonthlyEvents: EMPTY_MONTHLY,
    },
    medium: {
      extraGoals: [
        {
          category: "ra-coverage",
          title: "倉庫レイアウト・通路区分のリスクアセスメント",
          description:
            "歩行者と車両（フォークリフト・台車）の動線を分離するため、通路区分・カラーコーン・反射ベスト・センサーを導入。",
          target: "歩車分離率 100%",
          kpi: "分離通路長 / 全通路長",
        },
      ],
      extraMeasures: [
        {
          category: "industry-specific",
          title: "ピッキング作業の腰痛予防",
          description:
            "ピッキング作業の高さ・重量・反復回数を測定し、腰痛健康診断を実施。アシストスーツの導入も検討。",
          frequency: "配置前 / 6か月以内ごとに1回",
          responsible: "産業医 / 倉庫長",
          reference: "基発0618第1号（腰痛予防対策指針）",
        },
        {
          category: "equipment-check",
          title: "ラック・棚の耐震・荷崩れ防止点検",
          description:
            "保管ラックの固定状況、最大積載荷重表示、地震対策（落下防止）を月次点検。",
          frequency: "月1回",
          responsible: "倉庫長",
        },
      ],
      extraMonthlyEvents: EMPTY_MONTHLY,
    },
    large: {
      extraGoals: [
        {
          category: "compliance",
          title: "自動化・ロボット導入時の労働安全衛生マネジメント",
          description:
            "AGV・AMR・自動倉庫導入時に、機械リスクアセスメントと人との協働領域の安全対策を実施する。",
          target: "新規導入設備 100% でRA実施 / 残留リスク低減",
          kpi: "RA 実施率 / 対策完了率",
        },
      ],
      extraMeasures: [
        {
          category: "ra",
          title: "協働ロボット・AGV のリスクアセスメント",
          description:
            "ISO/TS 15066 を参照し、協働領域の力・速度・接触面積を測定。安全柵・センサー・速度制限・安全認証を確認。",
          frequency: "導入時 / 年1回見直し",
          responsible: "設備管理部門 / 安全管理者",
        },
        {
          category: "industry-specific",
          title: "WMS（倉庫管理システム）連動の安全運用ルール",
          description:
            "WMS上で危険物・重量物・要冷蔵品の取扱手順を作業指示と同時に表示。作業者の経験・資格と作業の対応を自動チェック。",
          frequency: "通年",
          responsible: "情報システム部 / 倉庫長",
        },
      ],
      extraMonthlyEvents: EMPTY_MONTHLY,
    },
  },
  warehouse: {
    small: {
      extraGoals: [
        {
          category: "accident-reduction",
          title: "転倒・墜落・はさまれ災害ゼロ",
          description:
            "ラック昇降・台車操作・棚卸し作業での転倒・墜落・はさまれを防止する。",
          target: "災害 0件",
          kpi: "災害発生件数 / 在籍者数",
        },
      ],
      extraMeasures: [
        {
          category: "industry-specific",
          title: "高所棚への昇降と脚立・はしごの安全使用",
          description:
            "脚立・はしご使用時の3点支持、開き止め金具の確認、踏み外し防止の靴底点検を徹底。",
          frequency: "毎日",
          responsible: "倉庫長 / 作業者",
          reference: "安衛則第527条等",
        },
        {
          category: "industry-specific",
          title: "棚卸し作業の安全手順",
          description:
            "棚卸し時に作業者の墜落・荷崩れ・はさまれを防ぐ手順書を整備し、繁忙期前に教育。",
          frequency: "棚卸しの都度（通常 年2〜4回）",
          responsible: "倉庫長",
        },
      ],
      extraMonthlyEvents: EMPTY_MONTHLY,
    },
    medium: {
      extraGoals: [
        {
          category: "ra-coverage",
          title: "倉庫内動線と歩車分離の最適化",
          description:
            "フォークリフト・AGV・歩行者の動線を物理的に分離し、見通しの悪い交差点にはミラー・センサーを設置。",
          target: "歩車分離率 100% / 接触事故 0件",
          kpi: "分離通路長 / 全通路長",
        },
      ],
      extraMeasures: [
        {
          category: "industry-specific",
          title: "冷凍倉庫・冷蔵倉庫の労働者保護",
          description:
            "氷点下作業者には防寒具・休憩室・連続作業時間制限・健康診断を実施。労働時間管理と暖房休憩室の整備。",
          frequency: "通年 / 健診は配置前・6か月以内ごとに1回",
          responsible: "倉庫長 / 産業医",
          reference: "安衛則第606条等",
        },
        {
          category: "equipment-check",
          title: "コンベア・パレタイザー等の年次点検",
          description:
            "搬送機器の安全装置（非常停止・センサー・カバー）を年1回専門業者で点検し、記録を3年保存。",
          frequency: "年1回",
          responsible: "設備管理部門",
        },
      ],
      extraMonthlyEvents: EMPTY_MONTHLY,
    },
    large: {
      extraGoals: [
        {
          category: "compliance",
          title: "自動倉庫・協働ロボット運用の安全衛生統合",
          description:
            "自動倉庫・ピッキングロボット・AGVの導入時にRAを実施し、人との協働領域の安全を継続管理。",
          target: "新規導入 100% でRA / 残留リスク低減",
          kpi: "RA 実施率 / 対策完了率",
        },
      ],
      extraMeasures: [
        {
          category: "ra",
          title: "協働ロボット・AGV のリスクアセスメントと運用基準",
          description:
            "ISO/TS 15066 を参照し、人とロボットの協働領域の力・速度・接触面積を測定。立入禁止区画・速度制限・センサー停止を運用。",
          frequency: "導入時 / 年1回見直し",
          responsible: "設備管理部門 / 安全管理者",
        },
        {
          category: "industry-specific",
          title: "拠点間 安全衛生標準化と本部監査",
          description:
            "全拠点で安全衛生標準書・教育カリキュラム・記録様式を統一し、本部が年1回以上の監査を実施。",
          frequency: "年1回以上",
          responsible: "本部安全衛生部門",
        },
      ],
      extraMonthlyEvents: {
        2: [
          {
            title: "全拠点 安全衛生本部監査",
            category: "inspection",
            description:
              "本部安全衛生部門が全拠点を巡回監査。是正は30日以内完了。",
            required: false,
          },
        ],
      },
    },
  },
  office: {
    small: {
      extraGoals: [
        {
          category: "health-promotion",
          title: "VDT 作業者の眼精疲労・腰痛予防",
          description:
            "情報機器作業ガイドラインに基づき、1時間ごとに10〜15分の小休止、椅子・モニタ位置の調整、定期的なストレッチを推奨。",
          target: "眼科健診・整形外科健診の希望者全員受診",
          kpi: "ガイドライン適合作業環境率",
        },
      ],
      extraMeasures: [
        {
          category: "industry-specific",
          title: "情報機器作業（VDT）の作業環境整備",
          description:
            "厚労省「情報機器作業における労働衛生管理のためのガイドライン」に基づき、照度500ルクス以上、グレア対策、椅子・机の調整を実施。",
          frequency: "通年 / 配置時",
          responsible: "総務 / 衛生推進者",
          reference: "基発0712第3号（情報機器作業ガイドライン）",
        },
        {
          category: "industry-specific",
          title: "在宅勤務・テレワーク時の作業環境配慮",
          description:
            "在宅勤務者にもVDT対策・椅子・机・照度の自己点検チェックリストを配布。安全衛生教育に在宅勤務の労働時間管理・メンタルヘルスを含める。",
          frequency: "通年 / 雇入れ時",
          responsible: "総務 / 衛生推進者",
          reference: "テレワークの適切な導入及び実施の推進のためのガイドライン",
        },
      ],
      extraMonthlyEvents: EMPTY_MONTHLY,
    },
    medium: {
      extraGoals: [
        {
          category: "mental-health",
          title: "メンタルヘルス不調者の早期発見・早期介入",
          description:
            "ストレスチェック高ストレス者の医師面接申出を促進し、長時間労働・ハラスメント要因を早期に解消。",
          target: "高ストレス者面接申出率 30% 以上 / 申出者 100% 面談実施",
          kpi: "高ストレス者数 / 面接実施件数",
        },
      ],
      extraMeasures: [
        {
          category: "industry-specific",
          title: "ハラスメント防止研修と相談窓口運用",
          description:
            "パワー・セクシュアル・マタニティ・カスタマーハラスメントを統合した研修を年1回実施。社内・社外両方の相談窓口を設置。",
          frequency: "年1回",
          responsible: "人事部 / 衛生委員会",
          reference: "労働施策総合推進法第30条の2",
        },
        {
          category: "industry-specific",
          title: "勤務間インターバル制度・フレックスタイムの安全衛生上の運用",
          description:
            "勤務間インターバル（11時間以上を目安）・フレックスタイムを安全衛生委員会で議題化し、長時間労働の抑制と健康確保を両立。",
          frequency: "通年 / 委員会で月次確認",
          responsible: "人事部 / 衛生委員会",
          reference: "労働時間等設定改善法",
        },
      ],
      extraMonthlyEvents: EMPTY_MONTHLY,
    },
    large: {
      extraGoals: [
        {
          category: "compliance",
          title: "海外赴任者・出張者の安全衛生確保",
          description:
            "海外赴任前・帰任時の健康診断、感染症予防接種、危機管理マニュアル・緊急連絡網を整備。",
          target: "赴任前健診受診率 100% / 危機管理研修受講 100%",
          kpi: "対象者数 / 実施件数",
        },
        {
          category: "mental-health",
          title: "グローバル EAP（従業員支援プログラム）の運用",
          description:
            "多言語対応のEAPを整備し、国内外の従業員・家族の相談機会を確保。",
          target: "EAP 認知率 90% 以上 / 利用機会の周知 年2回以上",
          kpi: "認知度調査 / 利用件数",
        },
      ],
      extraMeasures: [
        {
          category: "industry-specific",
          title: "海外派遣労働者の健康診断（派遣前・派遣中・帰国時）",
          description:
            "6か月以上海外派遣する労働者に派遣前・帰国時健診を実施。派遣中も現地で同等の健診を受診させる。",
          frequency: "派遣前 / 帰国時 / 派遣中6か月ごと",
          responsible: "産業医 / 人事部",
          reference: "安衛則第45条の2",
        },
        {
          category: "industry-specific",
          title: "全社統合ハラスメント・コンプライアンス委員会",
          description:
            "人事・法務・労務・産業保健スタッフが横断する委員会を運営し、ハラスメント・コンプライアンス案件を月次でレビュー。",
          frequency: "月1回",
          responsible: "人事部 / 法務部",
        },
      ],
      extraMonthlyEvents: {
        9: [
          {
            title: "海外赴任者向け危機管理研修",
            category: "education",
            description:
              "テロ・自然災害・感染症・健康危機を想定した危機管理研修を実施。家族向け資料も配布。",
            required: false,
          },
        ],
      },
    },
  },
};

export function getIndustryScaleOverlay(
  industry: IndustryId,
  scale: ScaleId,
): IndustryScaleOverlay {
  return INDUSTRY_SCALE_OVERLAYS[industry][scale];
}
