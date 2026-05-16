import type { CheckupRule } from "@/types/health-checkup";

/**
 * Ionizing-radiation health checkup. Although classified administratively as a
 * special health checkup, it is governed by 電離則 (electron radiation
 * regulations) and has distinct testing items and rules — kept as its own
 * category here for clarity in UI filtering.
 */
export const ELECTRON_RADIATION_CHECKUP_RULES: CheckupRule[] = [
  {
    id: "electron-radiation-checkup",
    type: "electron-radiation",
    title: "電離放射線健康診断",
    shortDescription:
      "電離則第56条で定める放射線業務（管理区域内業務など）に常時従事する労働者が対象。",
    trigger: {
      workConditions: ["radiation-work"],
    },
    frequency: {
      atHire: true,
      intervalMonths: 6,
      humanReadable: "雇入時・配置替え時および6か月以内ごとに1回",
    },
    testItems: {
      mandatory: [
        "被ばく歴の有無の調査・評価",
        "白血球数及び白血球百分率の検査",
        "赤血球数の検査及び血色素量又はヘマトクリット値の検査",
        "白内障に関する眼の検査",
        "皮膚の検査",
      ],
      omissible: [
        "実効線量が一定値以下と判定される者の血液検査（医師判断により省略可）",
      ],
    },
    relatedLaw: {
      name: "電離放射線障害防止規則",
      articles: ["第56条", "第57条"],
      summary:
        "放射線業務に常時従事する労働者で管理区域に立ち入る者に対し、雇入時・配置替え時・6か月以内ごとに健診を実施。被ばく線量に応じた血液検査・眼・皮膚検査が法定項目。",
    },
    notes: [
      "個人線量計の記録（電離則第8条）と照合し、過剰被ばくの兆候を健康管理上の判断材料とする。",
      "緊急被ばく業務に従事した者は別途、緊急時健康診断が必要（電離則第56条の2）。",
      "結果は30年間保存（健康診断個人票）。",
    ],
  },
  {
    id: "radon-checkup",
    type: "electron-radiation",
    title: "除染等業務に係る電離放射線健康診断",
    shortDescription:
      "東日本大震災に係る除染等業務、特定線量下業務に従事する労働者を対象。除染電離則に基づく。",
    trigger: {
      workConditions: ["radiation-work"],
    },
    frequency: {
      atHire: true,
      intervalMonths: 6,
      humanReadable: "雇入時・配置替え時および6か月以内ごとに1回",
    },
    testItems: {
      mandatory: [
        "被ばく歴の有無の調査",
        "白血球数及び白血球百分率",
        "赤血球数及びヘモグロビン濃度",
        "皮膚の検査",
        "眼の水晶体に関する検査",
      ],
    },
    relatedLaw: {
      name: "東日本大震災により生じた放射性物質により汚染された土壌等を除染するための業務等に係る電離放射線障害防止規則",
      articles: ["第20条"],
      summary:
        "除染等業務・特定線量下業務に常時従事する労働者に対し、雇入時・配置替え時・6か月以内ごとに健診を実施。標準の電離放射線健診と同等の項目を要求。",
    },
    notes: [
      "個人票の保存期間は30年（除染電離則第20条第3項）。",
      "国の方針改定により対象地域・業務が見直されることがあるため、運用前に最新規則を確認すること。",
    ],
  },
];
