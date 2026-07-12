/**
 * 労働安全衛生規則（安衛則）現場ことば版シャード — 第4編 特別規制（第654条〜第682条）。
 *
 * 特別安全衛生改善計画・元方事業者等/機械等貸与者等/建築物貸与者に関する特別規制
 *
 * 量産の照合先は原文（laws-fulltext スナップショット 347M50002000032.json）。
 * 執筆手順は docs/plain-language-prompts/anei-fulltext-squad-*.md、規約は
 * docs/plain-language-prompts/README.md。fidelity v2（fulltext アンカー）を
 * web/src/data/plain/plain-fulltext-anchor.test.ts が CI で全緑強制。
 * このシャードは 1 法令=複数ファイル構成の一部（束ねは ./index.ts）。
 * egovLawId: 347M50002000032
 */

import type { PlainArticle } from "../types";

// このシャードは既存 plain が 0 条（第4編 特別規制は curated 未収載）。担当部隊4が
// fulltext（347M50002000032.json）を照合先に全条を執筆して埋める。執筆時は他シャード
// （例: hen3-eisei.ts）と同じ META スキャフォールドを追加してから各条を書く:
//
//   const LAW_ID = "347M50002000032";
//   const META = {
//     egovLawId: LAW_ID,
//     sourceRevisionId: <当該条の latestRevision>,
//     generatedAt: "2026-07-13", // v2 強制モード（FIDELITY_V2_SINCE 以降）
//     model: "claude-sonnet-5",
//     checkStatus: "verified",
//   } as const;
//
// 各条は { ...META, articleNum, plainText, omissions?, sourceTextHash } で書く。
export const plainAneiHen4Tokubetsu: PlainArticle[] = [];
