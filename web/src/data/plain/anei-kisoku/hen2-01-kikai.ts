/**
 * 労働安全衛生規則（安衛則）現場ことば版シャード — 第2編 第1章 機械による危険の防止（第101条〜第151条）。
 *
 * 原動機・回転軸・工作機械・木材加工用機械・プレス機械及びシヤー・遠心機械・粉砕混合機・ロール機・高速回転体の危険防止
 *
 * 量産の照合先は原文（laws-fulltext スナップショット 347M50002000032.json）。
 * 執筆手順は docs/plain-language-prompts/anei-fulltext-squad-*.md、規約は
 * docs/plain-language-prompts/README.md。fidelity v2（fulltext アンカー）を
 * web/src/data/plain/plain-fulltext-anchor.test.ts が CI で全緑強制。
 * このシャードは 1 法令=複数ファイル構成の一部（束ねは ./index.ts）。
 * egovLawId: 347M50002000032
 */

import type { PlainArticle } from "../types";

const LAW_ID = "347M50002000032";
const META = {
  egovLawId: LAW_ID,
  sourceRevisionId: "令和7年改正（熱中症対策 第612条の2 新設）",
  generatedAt: "2026-07-11",
  model: "claude-sonnet-5",
  checkStatus: "verified",
} as const;

export const plainAneiHen2Kikai: PlainArticle[] = [
  {
      ...META,
      articleNum: "第117条",
      generatedAt: "2026-07-13",
      plainText:
        "事業者は、回転中の研削といしが労働者に危険を及ぼすおそれがあるときは、覆いを設けなければなりません。ただし、直径が50ミリメートル未満の研削といしは適用対象外です。研削盤やグラインダーなど砥石を使う機械の安全装置の基本義務で、覆いは破裂時の飛散を防ぐ目的です。",
      sourceTextHash: "46ce865103206317",
    },
  {
      ...META,
      articleNum: "第118条",
      plainText:
        "事業者は、研削といしについて、その日の作業を開始する前には1分間以上、取り替えたときには3分間以上、試運転をしなければなりません。",
      sourceTextHash: "a834b0679965bd45",
    },
  {
      ...META,
      articleNum: "第119条",
      plainText: "事業者は、研削といしをその最高使用周速度を超えて使用してはいけません。",
      sourceTextHash: "8b9b3e94c082da72",
    },
  {
      ...META,
      articleNum: "第122条",
      plainText:
        "事業者は、木材加工用丸のこ盤（横切用丸のこ盤その他反ぱつで労働者に危険を及ぼすおそれのないものを除く）には、割刃その他の反ぱつ予防装置を設けなければなりません。",
      sourceTextHash: "e2a8bdd24e920610",
    },
  {
      ...META,
      articleNum: "第123条",
      plainText:
        "事業者は、木材加工用丸のこ盤（製材用丸のこ盤及び自動送り装置を有する丸のこ盤を除く）には、歯の接触予防装置を設けなければなりません。",
      sourceTextHash: "a16f0374bad7b062",
    },
  {
      ...META,
      articleNum: "第131条",
      plainText:
        "事業者は、動力で駆動するプレス機械及びシャーを使用して作業を行うときは、安全囲いや安全装置の設置など、労働者の身体の一部が金型・刃物等の危険限界に入ることを防ぐための措置を講じなければなりません。安全プレス・両手操作式・光線式安全装置などの選定基準を含みます。",
      sourceTextHash: "6338ae4301acbd9d",
    },
];
