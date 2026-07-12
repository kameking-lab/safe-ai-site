/**
 * じん肺法 現場ことば版 — コーパス収載8条の全条言い換え。
 *
 * 執筆手順は docs/plain-language-prompts/README.md。
 * 原文: web/src/data/laws/jinpai-ho.ts（egovLawId 335AC0000000030・7条）
 *       ＋ web/src/data/laws/corpus-gaps-fill.ts（第23条）
 * sourceTextHash: node scripts/plain-source-digest.mjs src/data/laws/jinpai-ho.ts
 *                 node scripts/plain-source-digest.mjs src/data/laws/corpus-gaps-fill.ts
 * 照合: web/src/data/plain/plain-fidelity.test.ts（fidelity 全緑を CI が強制）
 */

import type { PlainArticle } from "./types";

const LAW_ID = "335AC0000000030";
const META = {
  egovLawId: LAW_ID,
  sourceRevisionId: "令和元年改正",
  generatedAt: "2026-07-12",
  model: "claude-sonnet-5",
  checkStatus: "verified",
} as const;

export const plainJinpaiHo: PlainArticle[] = [
  {
    ...META,
    articleNum: "第1条", // 目的
    plainText:
      "この法律は、じん肺について適正な予防と健康管理などの必要な措置を講じることで、労働者の健康保持や福祉の増進に役立つことを目的としています。",
    sourceTextHash: "a2801ffce025b05a",
  },
  {
    ...META,
    articleNum: "第2条", // 定義
    plainText:
      "じん肺とは、粉じんを吸って肺に線維増殖性の変化が起きる病気です。合併症とは、じん肺と合併した肺結核など、じん肺の経過と密接な関係がある病気です。粉じん作業とは、その作業に従事する労働者がじん肺にかかるおそれがあると認められる作業で、範囲は厚生労働省令で定めます。労働者は労働基準法第9条に規定する労働者、事業者は労働安全衛生法第2条第3号に規定する事業者のうち粉じん作業を行う事業に係るものです。",
    sourceTextHash: "251772b217b5ce94",
  },
  {
    ...META,
    articleNum: "第3条", // じん肺健康診断
    plainText:
      "この法律のじん肺健康診断は、粉じん作業の職歴調査とエックス線写真検査、厚生労働省令で定める胸部の臨床検査・肺機能検査、結核精密検査など厚生労働省令で定める検査を行います。臨床検査・肺機能検査は、じん肺の所見がないと診断された人以外に行います。結核精密検査などは、じん肺の所見があり肺結核など合併症の疑いがある人に行います。",
    sourceTextHash: "e94e85778bb2acc9",
  },
  {
    ...META,
    articleNum: "第7条", // 就業時健康診断
    plainText:
      "事業者は、新たに常時粉じん作業に従事することになった労働者に対し、その就業の際にじん肺健康診断（就業時健康診断）を行わなければなりません。ただし、その作業に従事する日の前1年以内にじん肺健康診断を受けて管理二・管理三イと決定された労働者などは除きます。",
    sourceTextHash: "f354acafc9a95181",
  },
  {
    ...META,
    articleNum: "第8条", // 定期健康診断
    plainText:
      "事業者は、常時粉じん作業に従事する労働者に対し、定期にじん肺健康診断を行わなければなりません。管理区分が管理一の人は3年以内ごとに1回、管理二・管理三イの人は1年以内ごとに1回の頻度です。",
    sourceTextHash: "cb52b2951bbeb80f",
  },
  {
    ...META,
    articleNum: "第13条", // じん肺管理区分の決定手続等
    plainText:
      "第7条から第9条の2まで、または第11条ただし書のじん肺健康診断で所見がないと診断された人のじん肺管理区分は、管理一です。都道府県労働局長は、第12条の規定でエックス線写真や検査結果を証明する書面が提出されたとき、地方じん肺診査医の診断・審査をもとに、その労働者のじん肺管理区分を決定します。",
    sourceTextHash: "14c03692b272ef88",
  },
  {
    ...META,
    articleNum: "第21条", // 作業の転換
    plainText:
      "都道府県労働局長は、管理区分が管理三イの労働者が引き続き常時粉じん作業に従事しているとき、事業者に対し、その労働者を粉じん作業以外の作業に常時従事させるよう勧めることができます。事業者は、その勧奨を受けたとき、または管理区分が管理三ロの労働者が引き続き常時粉じん作業に従事しているときは、その労働者を粉じん作業以外の作業に常時従事させるよう努めましょう。",
    sourceTextHash: "33d2f14bfde192d5",
  },
  {
    ...META,
    articleNum: "第23条", // 管理4と決定された者の取扱い
    plainText:
      "じん肺管理区分が管理4と決定された労働者は、療養が必要とされ、事業者は粉じん作業に従事させてはいけません。合併症（肺結核・続発性気管支炎など）を含めて医療給付の対象になります。事業者は配置転換などの措置を講じる必要があります。",
    sourceTextHash: "46cc02e77867d525",
  },
];
