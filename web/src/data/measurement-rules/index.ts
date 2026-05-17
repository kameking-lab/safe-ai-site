/**
 * Mandatory work environment measurement categories per 安衛令第21条 (10 categories).
 *
 * Sources:
 *   - 労働安全衛生法第65条 / 安衛令第21条
 *   - 作業環境測定基準（昭和51年労働省告示第46号）
 *   - JISHA (中央労働災害防止協会) 作業環境測定ガイド
 *
 * Note: Standard values (管理濃度) are not reproduced verbatim from official texts.
 * Users must confirm current values with the official MHLW tables or a certified
 * occupational hygiene consultant (労働衛生コンサルタント).
 */

import type { MeasurementCategory } from "@/types/work-environment";

export const MEASUREMENT_CATEGORIES: MeasurementCategory[] = [
  {
    id: "dust",
    name: "粉じん（土石・岩石・鉱物・金属・炭素）",
    legalBasis: "安衛令第21条第1号 / 粉じん障害防止規則第26条",
    method: "A+B",
    frequency: "semi-annually",
    triggerConditions: [
      {
        label: "研磨・研削作業",
        detail: "金属・石材等の研磨、研削、バリ取りを行う屋内作業場",
        keywords: ["研磨", "研削", "バリ取り", "グラインダー", "サンダー"],
      },
      {
        label: "鉱物・石材加工",
        detail: "石材、岩石、鉱物、セラミック等を切断・破砕する屋内作業場",
        keywords: ["石材", "岩石", "鉱物", "セラミック", "切断", "破砕"],
      },
      {
        label: "金属溶接・溶断",
        detail: "金属のアーク溶接、ガス溶断等を行う屋内作業場",
        keywords: ["溶接", "溶断", "アーク", "スパッタ", "ヒューム"],
      },
      {
        label: "鋳造・型砂作業",
        detail: "砂型を用いた鋳造、型砂処理を行う屋内作業場",
        keywords: ["鋳造", "型砂", "鋳型", "鋳鉄", "砂型"],
      },
      {
        label: "炭素粉じん取扱",
        detail: "カーボンブラック、黒鉛等の炭素系粉体を大量に取り扱う作業場",
        keywords: ["カーボン", "黒鉛", "グラファイト", "炭素"],
      },
      {
        label: "粉体取扱全般",
        detail: "粉体原料を袋詰め・投入・混合する作業等、粉じんが著しく発散する屋内作業場",
        keywords: ["粉体", "粉末", "粉塵", "ダスト", "袋詰め", "混合"],
      },
    ],
    targetParameters: [
      "全粉じん濃度 (mg/m³)",
      "遊離けい酸含有率 (%)",
      "粒径分布（呼吸性粉じん）",
    ],
    measurer: "作業環境測定士（第2種以上）",
    standardLabel: "管理濃度（粉じん）",
    unit: "mg/m³",
    hasManagementClass: true,
    notes:
      "遊離けい酸30%以上の粉じんはじん肺リスクが高く、管理濃度は特に低く設定されています。石綿含有の疑いがある場合は石綿障害予防規則も適用。",
  },
  {
    id: "heat-cold",
    name: "暑熱・寒冷・多湿",
    legalBasis: "安衛令第21条第2号 / 事務所衛生基準規則（屋外は熱中症対策ガイドライン）",
    method: "instrument",
    frequency: "semi-monthly",
    triggerConditions: [
      {
        label: "高温・炎熱環境",
        detail: "溶融金属を取り扱う炉前、鍛造、熱処理、食品加工（高温調理）等",
        keywords: ["炉前", "鍛造", "熱処理", "溶鉱炉", "窯業", "調理", "高温"],
      },
      {
        label: "冷凍・冷蔵作業",
        detail: "冷凍倉庫、冷蔵室での作業、食品冷凍加工場",
        keywords: ["冷凍", "冷蔵", "低温", "チルド", "フリーザー"],
      },
      {
        label: "多湿環境",
        detail: "染色、湿式紡績、一部化学プロセス等、湿度が著しく高い屋内作業場",
        keywords: ["多湿", "湿潤", "染色", "紡績", "湿式"],
      },
    ],
    targetParameters: [
      "気温 (°C)",
      "湿球温度 (°C)",
      "黒球温度 (°C)",
      "WBGT指数 (°C)",
      "相対湿度 (%)",
    ],
    measurer: "事業者（専門資格不要。ただし測定機器の適切な使用が必要）",
    standardLabel: "WBGT基準値（作業強度別）",
    unit: "°C (WBGT)",
    hasManagementClass: false,
    notes:
      "暑熱は管理区分による判定ではなく、WBGT値が基準値を超えた場合に作業制限・休憩・水分補給等の措置が義務付けられます。2024年熱中症対策強化法も参照のこと。",
  },
  {
    id: "noise",
    name: "騒音",
    legalBasis: "安衛令第21条第3号 / 騒音障害防止のためのガイドライン（昭和60年）",
    method: "A+B",
    frequency: "semi-annually",
    triggerConditions: [
      {
        label: "プレス・鍛造作業",
        detail: "プレス機械、鍛造機械、ハンマー等を使用する著しい騒音を発する作業場",
        keywords: ["プレス", "鍛造", "ハンマー", "鋲打ち"],
      },
      {
        label: "切削・加工機械",
        detail: "旋盤、フライス盤、鋸盤等の切削・加工機械を多数設置した屋内作業場",
        keywords: ["旋盤", "フライス", "切削", "鋸", "切断機", "機械加工"],
      },
      {
        label: "建設・破砕機械",
        detail: "コンクリートブレーカー、削岩機等を使用する作業（屋内に準じた場所）",
        keywords: ["ブレーカー", "削岩機", "コンプレッサー", "破砕"],
      },
      {
        label: "印刷機械",
        detail: "輪転機、オフセット印刷機等を多数配置した印刷工場",
        keywords: ["印刷", "輪転", "オフセット"],
      },
      {
        label: "紡績・織機",
        detail: "力織機、紡績機等を用いた屋内作業場",
        keywords: ["紡績", "織機", "力織機", "繊維"],
      },
    ],
    targetParameters: ["等価騒音レベル LAeq (dB)", "最大騒音レベル (dB)"],
    measurer: "作業環境測定士（第2種以上）",
    standardLabel: "85dB(A) 管理区分基準",
    unit: "dB(A)",
    hasManagementClass: true,
    notes:
      "騒音の管理区分は85dB(A)と90dB(A)を閾値として判定します（騒音障害防止ガイドライン）。85dB(A)以上は第2管理区分に相当し、聴覚保護具の使用・定期健康診断が必要。",
  },
  {
    id: "underground",
    name: "坑内作業場",
    legalBasis: "安衛令第21条第4号 / 炭鉱則・トンネル等建設工事規程",
    method: "A+B",
    frequency: "monthly",
    triggerConditions: [
      {
        label: "鉱山・採掘坑内",
        detail: "金属鉱山、石炭鉱山、非金属鉱山等の坑内採掘作業",
        keywords: ["坑内", "鉱山", "採掘", "鉱坑"],
      },
      {
        label: "トンネル工事",
        detail: "道路・鉄道・上下水道トンネルの掘削・覆工作業（掘進中の坑内）",
        keywords: ["トンネル", "掘削", "NATM", "シールド", "覆工"],
      },
    ],
    targetParameters: [
      "粉じん濃度 (mg/m³)",
      "酸素濃度 (%)",
      "炭酸ガス濃度 (%)",
      "一酸化炭素濃度 (ppm)",
      "硫化水素濃度 (ppm)",
      "爆発性ガス濃度 (%LEL)",
    ],
    measurer: "作業環境測定士（坑内区分）",
    standardLabel: "各有害物質の管理濃度",
    unit: "複数単位（物質により異なる）",
    hasManagementClass: true,
    notes:
      "坑内は粉じん・有害ガス・酸欠・爆発性ガスが同時に問題になります。毎月測定が必要で、緊急時は随時測定が求められます。",
  },
  {
    id: "office-hvac",
    name: "中央管理方式空調の事務所",
    legalBasis: "安衛令第21条第5号 / 事務所衛生基準規則第7条",
    method: "instrument",
    frequency: "bi-monthly",
    triggerConditions: [
      {
        label: "中央管理方式空調設備の設置",
        detail: "中央管理方式の空気調和設備（セントラル空調）を設けた建築物の室（事務所用途）",
        keywords: [
          "セントラル空調",
          "中央管理",
          "空調",
          "事務所",
          "オフィス",
          "ビル管理",
        ],
      },
    ],
    targetParameters: [
      "一酸化炭素濃度 (ppm) ※10ppm以下",
      "二酸化炭素濃度 (ppm) ※1000ppm以下",
      "浮遊粉じん量 (mg/m³) ※0.15mg/m³以下",
      "気流 (m/s) ※0.5m/s以下",
      "ホルムアルデヒド濃度 (ppm) ※0.1ppm以下",
      "温度 (°C) ※17〜28°C",
      "相対湿度 (%) ※40〜70%",
    ],
    measurer: "建築物環境衛生管理技術者（ビル管理士）または作業環境測定士",
    standardLabel: "事務所衛生基準規則第7条 各基準値",
    unit: "ppm / mg/m³",
    hasManagementClass: false,
    notes:
      "管理区分判定は適用されません。各パラメータが基準値を超えた場合は、速やかに設備の点検・調整が必要です。",
  },
  {
    id: "radiation",
    name: "放射線業務（管理区域）",
    legalBasis: "安衛令第21条第6号 / 電離放射線障害防止規則第53条",
    method: "instrument",
    frequency: "monthly",
    triggerConditions: [
      {
        label: "X線・γ線使用設備",
        detail: "工業用X線検査装置、医療用X線装置、γ線照射設備を設置した管理区域",
        keywords: ["X線", "γ線", "放射線", "非破壊検査", "医療用"],
      },
      {
        label: "放射性同位元素取扱",
        detail: "放射性同位元素（RI）を取り扱う管理区域",
        keywords: ["放射性同位元素", "RI", "アイソトープ", "核医学"],
      },
      {
        label: "加速器施設",
        detail: "粒子加速器、電子線照射装置を設置した管理区域",
        keywords: ["加速器", "電子線", "粒子線"],
      },
    ],
    targetParameters: [
      "外部放射線量率 (mSv/h)",
      "表面汚染密度 (Bq/cm²)",
      "空気中放射性物質濃度 (Bq/m³)",
    ],
    measurer: "放射線取扱主任者または作業環境測定士（放射性物質区分）",
    standardLabel: "電離則第53条 1mSv/週 相当の線量率",
    unit: "mSv/h (Bq/m³)",
    hasManagementClass: false,
    notes:
      "管理区域の設定・測定は電離放射線障害防止規則に基づきます。線量率が基準を超えた場合は管理区域の見直しと作業者への線量管理強化が必要。",
  },
  {
    id: "specific-chem",
    name: "特定化学物質",
    legalBasis: "安衛令第21条第7号 / 特定化学物質障害予防規則第36条",
    method: "A+B",
    frequency: "semi-annually",
    triggerConditions: [
      {
        label: "第1類物質取扱",
        detail: "ジクロルベンジジン、α-ナフチルアミン等の特別管理物質（第1類）を製造・取扱う屋内作業場",
        keywords: ["ジクロルベンジジン", "ベンジジン", "第1類", "特別管理"],
      },
      {
        label: "第2類物質取扱（がん原性）",
        detail: "クロム酸・重クロム酸、コバルト、ニッケル化合物等のがん原性物質を取扱う屋内作業場",
        keywords: [
          "クロム酸",
          "重クロム酸",
          "コバルト",
          "ニッケル化合物",
          "ベリリウム",
          "がん原性",
          "特化物",
        ],
      },
      {
        label: "第2類物質取扱（一般）",
        detail:
          "アクリルアミド、シアン化水素、トリクロロエチレン、ホルムアルデヒド等を取扱う屋内作業場",
        keywords: [
          "アクリルアミド",
          "シアン化水素",
          "トリクロロエチレン",
          "ホルムアルデヒド",
          "塩化ビニル",
          "特定化学物質",
          "特化物",
        ],
      },
      {
        label: "第3類物質取扱",
        detail: "アンモニア、塩酸、硝酸、硫酸等を大量に取扱う屋内作業場（漏洩危険が高い場合）",
        keywords: ["アンモニア", "塩酸", "硝酸", "硫酸", "第3類"],
      },
    ],
    targetParameters: ["各特定化学物質の空気中濃度 (ppm または mg/m³)"],
    measurer: "作業環境測定士（第1種または第2種）",
    standardLabel: "特化則別表第1 管理濃度",
    unit: "ppm / mg/m³",
    hasManagementClass: true,
    notes:
      "特別管理物質（第1類・がん原性第2類）は3ヶ月ごとの測定が必要です。測定記録は30年間保存義務。第3管理区分は作業停止または直ちに改善が必要。",
  },
  {
    id: "lead",
    name: "鉛",
    legalBasis: "安衛令第21条第8号 / 鉛中毒予防規則第52条",
    method: "A+B",
    frequency: "annually",
    triggerConditions: [
      {
        label: "鉛製錬・精錬",
        detail: "鉛の溶融・精錬・合金製造を行う屋内作業場",
        keywords: ["鉛製錬", "鉛精錬", "鉛合金", "溶融"],
      },
      {
        label: "鉛含有塗料の塗布・除去",
        detail: "鉛含有塗料の塗装・剥離・除去作業を行う屋内作業場",
        keywords: ["鉛塗料", "塗装除去", "剥離", "鉛ペンキ", "鉛スクレーパー"],
      },
      {
        label: "鉛蓄電池製造・修理",
        detail: "鉛蓄電池の製造・解体・修理を行う屋内作業場",
        keywords: ["蓄電池", "バッテリー", "鉛電池", "鉛蓄電池"],
      },
      {
        label: "はんだ付け",
        detail: "大規模なはんだ付け作業（鉛入りはんだ）を行う屋内作業場",
        keywords: ["はんだ", "ハンダ", "基板", "電子部品組立"],
      },
    ],
    targetParameters: ["鉛の空気中濃度 (mg/m³)"],
    measurer: "作業環境測定士（第2種以上）",
    standardLabel: "鉛則 管理濃度 0.05mg/m³",
    unit: "mg/m³",
    hasManagementClass: true,
    notes:
      "鉛は年1回の測定で可。ただし第3管理区分が続く場合はより頻繁な測定と即時改善が求められます。血中鉛濃度の健康診断との連携も重要。",
  },
  {
    id: "oxygen-def",
    name: "酸素欠乏危険場所",
    legalBasis: "安衛令第21条第9号 / 酸素欠乏症等防止規則第3条",
    method: "instrument",
    frequency: "semi-annually",
    triggerConditions: [
      {
        label: "タンク・ピット・マンホール",
        detail: "酸素欠乏危険場所（タンク内部、ピット、マンホール内）での作業",
        keywords: ["タンク内", "ピット", "マンホール", "地下室", "坑内"],
      },
      {
        label: "発酵・腐敗ガス発生",
        detail: "食品・飼料等の発酵により炭酸ガス・メタンが滞留するサイロ、醸造施設",
        keywords: ["サイロ", "発酵", "醸造", "メタン", "炭酸ガス"],
      },
      {
        label: "海水・海底土に接する場所",
        detail: "ケーソン、ウェルポイント工事等、海水・泥土に接する閉鎖空間",
        keywords: ["ケーソン", "海水", "泥土", "潮汐"],
      },
      {
        label: "不活性ガス使用設備",
        detail: "窒素・アルゴン・炭酸ガス等の不活性ガスを使用するタンク・配管内",
        keywords: ["窒素", "アルゴン", "不活性ガス", "CO2充填", "炭酸"],
      },
    ],
    targetParameters: ["酸素濃度 (%) ※18%以上", "硫化水素濃度 (ppm) ※10ppm以下"],
    measurer: "酸素欠乏・硫化水素危険作業主任者または作業環境測定士",
    standardLabel: "酸欠則 酸素18%以上・硫化水素10ppm以下",
    unit: "% / ppm",
    hasManagementClass: false,
    notes:
      "作業開始前の随時測定（毎作業日）が必要。管理区分制度の適用はありませんが、基準値未満は即時作業禁止となります。",
  },
  {
    id: "organic-solv",
    name: "有機溶剤",
    legalBasis: "安衛令第21条第10号 / 有機溶剤中毒予防規則第28条",
    method: "A+B",
    frequency: "semi-annually",
    triggerConditions: [
      {
        label: "塗装・コーティング作業",
        detail: "第1種・第2種有機溶剤を含む塗料・ラッカーを屋内で使用する塗装作業場",
        keywords: ["塗装", "ラッカー", "コーティング", "スプレー塗装", "吹き付け"],
      },
      {
        label: "洗浄・脱脂作業",
        detail: "トリクロロエチレン、テトラクロロエチレン等で金属・精密部品を洗浄する作業場",
        keywords: ["洗浄", "脱脂", "トリクロロエチレン", "テトラクロロエチレン", "シンナー"],
      },
      {
        label: "接着剤・シール剤使用",
        detail: "有機溶剤系接着剤・シーリング材を屋内で大量使用する作業場",
        keywords: ["接着剤", "シール剤", "シーリング", "ボンド", "溶剤系"],
      },
      {
        label: "印刷・製版",
        detail: "有機溶剤系インク・洗浄剤を使用する印刷・製版作業場",
        keywords: ["印刷インク", "製版", "有機溶剤インク", "溶剤洗浄"],
      },
      {
        label: "ドライクリーニング",
        detail: "テトラクロロエチレン等を使用するドライクリーニング工場",
        keywords: ["ドライクリーニング", "クリーニング工場", "テトラクロロ"],
      },
      {
        label: "樹脂・ゴム成形",
        detail: "有機溶剤系モノマー・離型剤を使用する樹脂成形、ゴム加工作業場",
        keywords: ["樹脂成形", "ゴム加工", "モノマー", "離型剤", "FRP"],
      },
    ],
    targetParameters: ["各有機溶剤の空気中濃度 (ppm または mg/m³)"],
    measurer: "作業環境測定士（第1種）",
    standardLabel: "有機則別表 管理濃度（物質別）",
    unit: "ppm / mg/m³",
    hasManagementClass: true,
    notes:
      "第1種有機溶剤（ベンゼン等）は特に管理濃度が低く設定されています。混合溶剤の場合は各成分の合算評価（1/管理濃度の総和が1以下）が必要です。",
  },
];

/** Find a category by its ID */
export function getCategoryById(id: string): MeasurementCategory | undefined {
  return MEASUREMENT_CATEGORIES.find((c) => c.id === id);
}

/** Frequency label for display */
export const FREQUENCY_LABEL: Record<string, string> = {
  "semi-monthly": "半月以内ごと",
  "monthly": "毎月",
  "bi-monthly": "2ヶ月以内ごと",
  "quarterly": "3ヶ月以内ごと（特別管理物質）",
  "semi-annually": "6ヶ月以内ごと",
  "annually": "1年以内ごと",
};

/** Method label for display */
export const METHOD_LABEL: Record<string, string> = {
  "A": "A測定（全域平均）",
  "B": "B測定（最高濃度点）",
  "A+B": "A測定＋B測定",
  "personal": "個人ばく露測定",
  "instrument": "測定器による直読",
};
