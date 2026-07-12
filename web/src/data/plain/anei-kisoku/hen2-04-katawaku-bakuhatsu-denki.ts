/**
 * 労働安全衛生規則（安衛則）現場ことば版シャード — 第2編 第3〜5章 型わく支保工・爆発火災等・電気（第237条〜第354条）。
 *
 * 型わく支保工・爆発火災等の防止・危険物等の取扱い・化学設備・乾燥設備・アセチレン溶接装置・ガス集合溶接装置・電気による危険の防止
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

export const plainAneiHen2KatawakuBakuhatsuDenki: PlainArticle[] = [
  {
      ...META,
      articleNum: "第256条",
      plainText:
        "事業者は、危険物を製造・取扱う際、爆発や火災を防ぐため、爆発性の物を火気などの点火源に近づけたり加熱・摩擦・衝撃を与えたりしないこと、発火性の物を酸化を促す物や水に触れさせたり加熱・衝撃を与えたりしないこと、引火性の物を火気に近づけたり注いだり蒸発・加熱させたりしないこと、危険物を扱う場所を整理整頓して可燃性・酸化性の物をみだりに置かないことによらなければなりません。",
      sourceTextHash: "693ae072050f6edc",
    },
  {
      ...META,
      articleNum: "第261条",
      plainText:
        "事業者は、引火性の物の蒸気、可燃性ガスまたは可燃性の粉じんが存在して爆発・火災のおそれがある場所では、通風・換気・除じんなど必要な措置を講じなければなりません。",
      sourceTextHash: "242f0b4370a0f041",
    },
  {
      ...META,
      articleNum: "第285条",
      plainText:
        "事業者は、危険物以外の引火性の油類・可燃性の粉じんまたは危険物が存在するおそれのある配管やタンク・ドラムかん等の容器については、あらかじめこれらを除去するなど爆発・火災防止の措置を講じた後でなければ、溶接・溶断その他火気を使用する作業や火花を発するおそれのある作業をさせてはいけません。",
      sourceTextHash: "0361130a2b019d00",
    },
  {
      ...META,
      articleNum: "第332条",
      plainText:
        "事業者は、船舶の二重底やピークタンクの内部、ボイラーの胴やドームの内部など導電体に囲まれた著しく狭あいな場所、または墜落のおそれがある高さ2メートル以上の場所で交流アーク溶接等の作業を行うときは、交流アーク溶接機用自動電撃防止装置を使用しなければなりません。",
      sourceTextHash: "3efd591bf10f68fd",
    },
  {
      ...META,
      articleNum: "第333条",
      plainText:
        "事業者は、電動機を有する機械・器具で、対地電圧が150ボルトを超える移動式・可搬式のもの、水など導電性の高い液体で湿潤している場所や鉄板上など導電性の高い場所で使う移動式・可搬式のものについては、漏電による感電を防ぐため、電動機械器具が接続される電路に感電防止用漏電しゃ断装置を接続しなければなりません。",
      sourceTextHash: "de844bacbea8452e",
    },
  {
      ...META,
      articleNum: "第352条",
      plainText:
        "事業者は、絶縁用保護具、絶縁用防具、活線作業用装置・器具、絶縁用防護具、移動電線・接続器具・自動電撃防止装置・漏電遮断装置などの電気機械器具について、その日の使用を開始する前に種別に応じた点検事項を点検し、異常があれば直ちに補修または取り替えなければなりません。",
      sourceTextHash: "5197ca9c4eb3cbda",
    },
];
