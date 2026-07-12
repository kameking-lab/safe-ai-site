/**
 * 安衛則（347M50002000032）現場ことば版シャード束ね。
 *
 * plain は本来 1 法令=1 ファイルだが、安衛則は全文ギャップ約1,000条を複数の
 * Sonnet 部隊が並列執筆するため、編/章単位のシャードファイル群へ分割している
 * （同一ファイルへの同時書き込み衝突を避ける）。各シャードは編/章の連続範囲を
 * 担当し、部隊は 1 シャード=1 PR で埋めていく（担当割: docs/plain-language-prompts/
 * anei-fulltext-squad-1〜4.md）。
 *
 * ここで全シャードを 1 つの Record に束ね、レジストリ（../index.ts）へは
 * ANEI_KISOKU_SHARDS を spread で流し込む。後方互換のため、全シャードを連結した
 * plainAnzenEiseiKisoku も従来どおり export する（fulltext アンカーテスト等が参照）。
 */
import type { PlainArticle } from "../types";
import { plainAneiHen1Tsusoku } from "./hen1-tsusoku";
import { plainAneiHen2Kikai } from "./hen2-01-kikai";
import { plainAneiHen2NiekiUnpan } from "./hen2-02-nieki-unpan";
import { plainAneiHen2KensetsuKikai } from "./hen2-03-kensetsu-kikai";
import { plainAneiHen2KatawakuBakuhatsuDenki } from "./hen2-04-katawaku-bakuhatsu-denki";
import { plainAneiHen2KussakuNiekiSagyo } from "./hen2-05-kussaku-nieki-sagyo";
import { plainAneiHen2BatsubokuTsuirakuTsuuro } from "./hen2-06-batsuboku-tsuiraku-tsuuro";
import { plainAneiHen3Eisei } from "./hen3-eisei";
import { plainAneiHen4Tokubetsu } from "./hen4-tokubetsu";

/** 安衛則シャード束（ファイル名 → エントリ配列）。../index.ts へ spread する。 */
export const ANEI_KISOKU_SHARDS: Readonly<Record<string, readonly PlainArticle[]>> = {
  "anei-kisoku/hen1-tsusoku": plainAneiHen1Tsusoku,
  "anei-kisoku/hen2-01-kikai": plainAneiHen2Kikai,
  "anei-kisoku/hen2-02-nieki-unpan": plainAneiHen2NiekiUnpan,
  "anei-kisoku/hen2-03-kensetsu-kikai": plainAneiHen2KensetsuKikai,
  "anei-kisoku/hen2-04-katawaku-bakuhatsu-denki": plainAneiHen2KatawakuBakuhatsuDenki,
  "anei-kisoku/hen2-05-kussaku-nieki-sagyo": plainAneiHen2KussakuNiekiSagyo,
  "anei-kisoku/hen2-06-batsuboku-tsuiraku-tsuuro": plainAneiHen2BatsubokuTsuirakuTsuuro,
  "anei-kisoku/hen3-eisei": plainAneiHen3Eisei,
  "anei-kisoku/hen4-tokubetsu": plainAneiHen4Tokubetsu,
};

/** 安衛則 全 plain（全シャード連結・後方互換）。 */
export const plainAnzenEiseiKisoku: readonly PlainArticle[] =
  Object.values(ANEI_KISOKU_SHARDS).flat();
