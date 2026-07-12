/**
 * 労働安全衛生規則（安衛則）現場ことば版シャード — 第2編 第2章 建設機械等（第152条〜第236条）。
 *
 * 車両系建設機械・くい打機くい抜機・ジャッキ式つり上げ機械・高所作業車・軌道装置及び手押し車両等
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

export const plainAneiHen2KensetsuKikai: PlainArticle[] = [
  {
      ...META,
      articleNum: "第153条",
      plainText:
        "事業者は、岩石の落下等で労働者に危険が生ずるおそれのある場所で車両系建設機械（ブルドーザー、トラクターショベル、ずり積機、パワーショベル、ドラグショベル及び解体用機械に限る）を使用するときは、堅固なヘッドガードを備えなければなりません。",
      sourceTextHash: "a6bd80b2a0313940",
    },
  {
      ...META,
      articleNum: "第155条",
      plainText:
        "事業者は、車両系建設機械を用いて作業を行うときは、あらかじめ第154条の調査で知り得たところに適した作業計画を定め、その計画により作業を行わなければなりません。作業計画には、使用する機械の種類・能力、運行経路、作業の方法を示し、運行経路・作業方法を関係労働者に周知させなければなりません。",
      sourceTextHash: "7b4d43beb13d6ba4",
    },
  {
      ...META,
      articleNum: "第156条",
      plainText:
        "事業者は、車両系建設機械（最高速度が毎時10キロメートル以下のものを除く）を用いて作業を行うときは、あらかじめ場所の地形・地質の状態等に応じた適正な制限速度を定め、それにより作業を行わなければなりません。事業者は、運転者にその制限速度を超えて運転させてはいけません。",
      sourceTextHash: "5571d27173d6149f",
    },
  {
      ...META,
      articleNum: "第157条",
      plainText:
        "事業者は、車両系建設機械を用いて作業を行うときは、転倒・転落による危険を防ぐため、路肩の崩壊防止、地盤の不同沈下防止、必要な幅員の保持など必要な措置を講じなければなりません。路肩や傾斜地等で転倒・転落のおそれがあるときは、誘導者を配置してその機械を誘導させなければなりません。",
      sourceTextHash: "18b45ade738967b4",
    },
  {
      ...META,
      articleNum: "第158条",
      plainText:
        "事業者は、車両系建設機械を用いて作業を行うときは、運転中の機械に接触して労働者に危険が生ずるおそれのある箇所に労働者を立ち入らせてはいけません。ただし、誘導者を配置してその機械を誘導させるときは、この限りではありません。",
      sourceTextHash: "a62decf954f49e8b",
    },
  {
      ...META,
      articleNum: "第159条",
      plainText:
        "事業者は、車両系建設機械の運転について誘導者を置くときは、一定の合図を定め、その誘導者に合図を行わせなければなりません。運転者は、その合図に従わなければなりません。",
      sourceTextHash: "437f7dc8510a253e",
    },
  {
      ...META,
      articleNum: "第164条",
      plainText:
        "事業者は、車両系建設機械を、パワー・ショベルによる荷の吊り上げやクラムシェルによる労働者の昇降など、主たる用途以外の用途に使用してはいけません。ただし、安全装置や荷の吊り上げ装置を備えるなど安全措置を講じた場合に限り、例外的に認められます。",
      sourceTextHash: "2b1a67b5512140bb",
    },
  {
      ...META,
      articleNum: "第165条",
      plainText:
        "事業者は、車両系建設機械の修理やアタッチメントの装着・取外しの作業を行うときは、作業を指揮する者を定め、その者に作業手順の決定・指揮と、安全支柱・安全ブロック等の使用状況の監視という措置を講じさせなければなりません。",
      sourceTextHash: "e6a6d6dd91e5ae0b",
    },
  {
      ...META,
      articleNum: "第194条の22",
      plainText:
        "事業者は、高所作業車（作業床が接地面に対し垂直方向にのみ昇降するものを除く）を用いて作業を行うときは、その作業床上の労働者に要求性能墜落制止用器具を使用させなければなりません。労働者は、要求性能墜落制止用器具を使用しなければなりません。",
      sourceTextHash: "4b84297c8ba3bd5a",
    },
];
