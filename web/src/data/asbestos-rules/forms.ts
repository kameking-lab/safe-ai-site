import type { NotificationForm } from "@/types/asbestos";

/**
 * Notification / report forms a contractor must produce or file for
 * asbestos-related demolition and renovation work in Japan.
 *
 * The list is curated to match what a contractor must keep in mind at the
 * pre-work stage. Detailed sub-forms (medical examination records, waste
 * manifest transcripts, etc.) are tracked elsewhere in the portal and are
 * not duplicated here.
 *
 * Sources: 厚生労働省「建築物等の解体等に係る石綿ばく露防止対策等」,
 * 環境省「大気汚染防止法施行通知」, JATI協会「事前調査の手引き」.
 */
export const ASBESTOS_FORMS: NotificationForm[] = [
  {
    id: "pre-investigation-report-mhlw",
    name: "建築物等の解体等の作業に関する事前調査結果等報告（労基署）",
    filedWith: "labour-standards-office",
    trigger:
      "石綿則 §3 + 安衛則 §90 — 解体・改修工事のうち、請負金額 100 万円以上（消費税込）または特定の工作物に該当する場合",
    deadline: "工事開始前まで（労基署電子申請システムでの提出が原則）",
    contents:
      "工事名・所在地・発注者・元請業者・調査者氏名と資格・調査対象部位・調査結果（材料区分ごとの含有有無）・分析依頼の有無を記載。石綿含有が明らかな場合や調査未了の部位はその旨を明記する。",
    note: "電子届出システム（GビズID）からの提出が原則。紙提出は窓口確認のうえ例外的に可。",
  },
  {
    id: "pre-investigation-report-prefecture",
    name: "特定建築材料事前調査結果報告（自治体・大気汚染防止法）",
    filedWith: "prefecture-or-city",
    trigger:
      "大気汚染防止法 §18-15 — 床面積 80 m² 以上の建築物解体、請負金額 100 万円以上の改修等の特定工事",
    deadline: "工事開始前まで（自治体の電子届出または窓口）",
    contents:
      "発注者・元請業者・特定建築材料の種類と使用箇所・除去等の方法・施工計画。労基署提出フォームと様式が共通化され、同時申請できる自治体が多い。",
  },
  {
    id: "work-notification-level-1-2",
    name: "建設工事計画届（石綿則 §5 ・安衛法 §88）",
    filedWith: "labour-standards-office",
    trigger:
      "レベル1（吹付け石綿）またはレベル2（保温材等）の除去・封じ込め・囲い込み工事",
    deadline: "工事開始の 14 日前まで",
    contents:
      "工事の場所・期間・規模、作業方法、隔離養生の方法、集じん装置の機種・能力、廃棄物の処理計画、石綿作業主任者の氏名と資格番号を添付図面とともに記載。",
  },
  {
    id: "specified-work-notification",
    name: "特定粉じん排出等作業実施届出書（大気汚染防止法 §18-17）",
    filedWith: "prefecture-or-city",
    trigger: "レベル1・レベル2の特定建築材料に係る除去等作業",
    deadline: "作業開始の 14 日前まで",
    contents:
      "発注者・受注者・作業場所・作業期間・作業方法・集じん装置・隔離養生方法・近隣説明実施有無を記載。レベル3 の特定工事は届出不要だが、作業基準遵守と記録保存は必要。",
  },
  {
    id: "onsite-display",
    name: "石綿使用建築物等解体等業務に関する事項の掲示",
    filedWith: "on-site-display",
    trigger: "石綿則 §35-2 — 全レベル共通の掲示義務",
    deadline: "作業開始日から作業終了まで掲示継続",
    contents:
      "事前調査結果・調査者氏名・調査の終了年月日・調査方法・調査対象部位・含有が確認された材料・作業時期と方法を、近隣住民が見える場所に A3 以上の大きさで掲示。",
  },
  {
    id: "investigation-record",
    name: "事前調査結果記録の保存（石綿則 §3-3）",
    filedWith: "internal-record",
    trigger: "全レベル・全工事共通",
    deadline: "工事終了日から 3 年間保存",
    contents:
      "事前調査者の氏名と資格、調査対象、調査方法、材料区分ごとの判定、分析を行った場合はその結果、判断根拠を記録。発注者にも交付。",
  },
  {
    id: "air-monitoring-record",
    name: "石綿濃度測定結果記録（石綿則 §36 / 大防法 §18-19）",
    filedWith: "internal-record",
    trigger:
      "レベル1・レベル2 の除去等作業で隔離養生を行う場合（敷地境界・作業場所近傍）",
    deadline: "作業終了後、結果を 40 年間保存（労働者の長期健康影響を考慮した期間）",
    contents:
      "測定箇所・測定方法（位相差顕微鏡法または電子顕微鏡法）・測定者・測定値・大気汚染防止法上の敷地境界基準（10 本/L）との比較を記録。",
  },
];
