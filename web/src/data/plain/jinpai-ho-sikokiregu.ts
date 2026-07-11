/**
 * じん肺法施行規則（じん肺則）現場ことば版 — コーパス収載15条の全条言い換え。
 *
 * 執筆手順は docs/plain-language-prompts/README.md。見本: sankketsu-kisoku.ts。
 * 原文: web/src/data/laws/jinpai-ho-sikokiregu.ts（egovLawId 335M50002000006）
 * 照合: web/src/data/plain/plain-fidelity.test.ts（fidelity 全緑を CI が強制）
 */

import type { PlainArticle } from "./types";

const LAW_ID = "335M50002000006";
const META = {
  egovLawId: LAW_ID,
  sourceRevisionId: "335M50002000006_20260401_508M60000100003",
  generatedAt: "2026-07-11",
  model: "claude-sonnet-5",
  checkStatus: "verified",
} as const;

export const plainJinpaiHoSikokiregu: PlainArticle[] = [
  {
    ...META,
    articleNum: "第1条", // 合併症
    plainText:
      "じん肺法第2条第1項第2号の合併症とは、じん肺管理区分が管理二または管理三と決定された人について、じん肺と合併した肺結核・結核性胸膜炎・続発性気管支炎・続発性気管支拡張症・続発性気胸・原発性肺がんの6つの疾病をいいます。",
    sourceTextHash: "ec64d6df702252c9",
  },
  {
    ...META,
    articleNum: "第2条", // 粉じん作業
    plainText:
      "じん肺法第2条第1項第3号の「粉じん作業」とは、別表に掲げる作業（鉱物などの掘削・破砕・粉砕・選別、研磨、岩石・鉱物の取扱いなど）のいずれかに当たるものです。粉じん障害防止規則第2条第1項第1号ただし書の認定を受けた作業は除きます。",
    sourceTextHash: "c745701b62ad59d9",
  },
  {
    ...META,
    articleNum: "第4条", // 胸部に関する臨床検査
    plainText:
      "じん肺健康診断のうち胸部に関する臨床検査は、既往歴・自覚症状・他覚所見の調査や胸部の聴打診などの方法で行います。",
    sourceTextHash: "f45b9ab901565587",
  },
  {
    ...META,
    articleNum: "第5条", // 肺機能検査
    plainText:
      "じん肺健康診断の肺機能検査は、スパイロメトリーによる換気機能検査、フローボリューム曲線、動脈血ガス分析などを組み合わせた方法で行います。",
    sourceTextHash: "661732ca80ee32f8",
  },
  {
    ...META,
    articleNum: "第6条", // 結核精密検査
    plainText:
      "じん肺健康診断で肺結核の所見が疑われる場合に行う結核精密検査は、喀痰検査・赤血球沈降速度測定・ツベルクリン反応検査などの方法で行います。",
    sourceTextHash: "8dc0a367ce57fea1",
  },
  {
    ...META,
    articleNum: "第10条", // じん肺健康診断の一部省略
    plainText:
      "前回のじん肺健康診断の結果やエックス線写真の像の区分に応じて、結核精密検査などの検査の一部を省略できる場合の要件を定めています。",
    sourceTextHash: "f140a5caa5992ea4",
  },
  {
    ...META,
    articleNum: "第11条", // 定期外健康診断の実施
    plainText:
      "じん肺法第9条第1項第3号の厚生労働省令で定めるときは、定期外のじん肺健康診断を実施します。対象は、合併症で1年を超えて療養した労働者が療養不要と診断されたとき、管理二の労働者が安衛則の健診で肺がんの疑いがないと診断されたとき以外のときなどです。",
    sourceTextHash: "d80ce6296593ceff",
  },
  {
    ...META,
    articleNum: "第12条", // 離職時健康診断の対象となる労働者の雇用期間
    plainText:
      "じん肺法第9条の2第1項の厚生労働省令で定める期間（離職時じん肺健康診断の対象となる労働者の雇用期間）は1年です。",
    sourceTextHash: "80279ab919c9d367",
  },
  {
    ...META,
    articleNum: "第15条", // 都道府県労働局長等の命ずる検査の範囲
    plainText:
      "都道府県労働局長または地方じん肺診査医は、じん肺管理区分の決定にあたり必要と認めるとき、エックス線写真撮影・肺機能検査などの検査を命ずることができ、その範囲を定めています。",
    sourceTextHash: "99d5ca47e8f95715",
  },
  {
    ...META,
    articleNum: "第16条", // じん肺管理区分の決定の通知
    plainText:
      "都道府県労働局長によるじん肺管理区分決定の通知は、じん肺管理区分決定通知書（様式第4号）で行います。",
    sourceTextHash: "358e4afa8a1d2448",
  },
  {
    ...META,
    articleNum: "第20条", // 随時申請の手続
    plainText:
      "労働者またはその者であった人が行うじん肺管理区分決定の随時申請は、じん肺管理区分決定申請書（様式第6号）を所轄都道府県労働局長に提出して行います。じん肺健康診断結果証明書（様式第3号）を添付します。",
    sourceTextHash: "4155b5e5c5f209a3",
  },
  {
    ...META,
    articleNum: "第22条", // 記録の作成及び保存等
    plainText:
      "事業者は、じん肺健康診断を行ったときなどは遅滞なく、その記録を様式第3号により作成し、記録とエックス線写真を保存しなければなりません。保存期間はじん肺法第17条により7年です。",
    sourceTextHash: "7d0c000cb654018a",
  },
  {
    ...META,
    articleNum: "第22条の2", // じん肺健康診断の結果の通知
    plainText:
      "事業者は、じん肺健康診断を受けた労働者に対し、遅滞なくその結果を通知しなければなりません。",
    sourceTextHash: "2e89f28a2a36167c",
  },
  {
    ...META,
    articleNum: "第26条", // 転換の勧奨
    plainText:
      "じん肺法第21条第1項による作業転換の勧奨（管理三イの労働者などに粉じん作業以外の作業への転換を勧めること）は、所轄都道府県労働局長が書面で行います。",
    sourceTextHash: "420d0707a8a25111",
  },
  {
    ...META,
    articleNum: "第37条", // 報告
    plainText:
      "事業者は、電子情報処理組織を使って、毎年12月31日現在のじん肺に関する健康管理の実施状況（労働保険番号・常時粉じん作業従事者数・じん肺管理区分ごとの数・じん肺健康診断受診延数など）を、翌年2月末日までに所轄労働基準監督署長を経由して所轄都道府県労働局長に報告しなければなりません。",
    sourceTextHash: "247f794ce37ae04e",
  },
];
