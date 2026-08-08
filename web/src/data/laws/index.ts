export type { LawAmendmentHistoryEntry, LawArticle } from "./law-types";
export { egovVerifiedExcerpts } from "./egov-verified-excerpts.generated";
export { LAW_METADATA, getLawMetadata, type LawMetadata } from "./law-metadata";
export { rodoAnzenEiseiHo } from "./rodo-anzen-eisei-ho";
export { rodoAnzenEiseiHoSikokiregu } from "./rodo-anzen-eisei-ho-sikokiregu";
export { anzenEiseiKisoku } from "./anzen-eisei-kisoku";
export { craneKisoku } from "./crane-kisoku";
export { yukiKisoku } from "./yuki-kisoku";
export { tokkaKisoku } from "./tokka-kisoku";
export { sankketsuKisoku } from "./sankketsu-kisoku";
export { sagyokankyoSokuteiho } from "./sagyokankyo-sokuteiho";
export { jinpaiHo } from "./jinpai-ho";
export { denriHoushasenKisoku } from "./denri-houshasen-kisoku";
export { sekimenKisoku } from "./sekimen-kisoku";
export { funjinKisoku } from "./funjin-kisoku";
// 拡張法令（合計30法令以上）
export { rodoKijunHo } from "./rodo-kijun-ho";
export { rodoKijunHoSikokiregu } from "./rodo-kijun-ho-sikokiregu";
export { saiteiChinginHo } from "./saitei-chingin-ho";
export { rodoKeiyakuHo } from "./rodo-keiyaku-ho";
export { ikujiKaigoKyugyoHo } from "./ikuji-kaigo-kyugyo-ho";
export { rodoShaSaigaiHoshoHokenHo } from "./rodo-sha-saigai-hosho-hoken-ho";
export { shokugyoAnteiHo } from "./shokugyo-antei-ho";
export { shokugyoNoryokuKaihatsuSokushinHo } from "./shokugyo-noryoku-kaihatsu-sokushin-ho";
export { kenkoHojiZoshinShishin } from "./kenko-hoji-zoshin-shishin";
export { vdtGuideline } from "./vdt-guideline";
export { kagakuBusshitsuKanriShishin } from "./kagaku-busshitsu-kanri-shishin";
export { gondolaAnzenKisoku } from "./gondola-anzen-kisoku";
export { boilerAtsuryokuYokiAnzenKisoku } from "./boiler-atsuryoku-yoki-anzen-kisoku";
export { koaAtsuSagyoAnzenEiseiKisoku } from "./koa-atsu-sagyo-anzen-eisei-kisoku";
export { kensetsuGyoho } from "./kensetsu-gyoho";
export { joseiRodoKijunKisoku } from "./josei-rodo-kijun-kisoku";
export { nenshaRodoKijunKisoku } from "./nensha-rodo-kijun-kisoku";
export { tankiRodoShaKanriHo } from "./tanki-rodo-sha-kanri-ho";
export { mentalHealthShishin } from "./mental-health-shishin";
export { ashibaSagyoKisoku } from "./ashiba-sagyo-kisoku";
export { kajuRodoTaisaku } from "./jiritsushinkei-setsumeisho";
export { koyoKintoHo } from "./koyo-kinto-ho";
export { mhlwLawArticles } from "./mhlw-extras";
export { enKisoku } from "./en-kisoku";
export { shiAlkylEnKisoku } from "./shi-alkyl-en-kisoku";
export { jimushoEiseiKijunKisoku } from "./jimusho-eisei-kijun-kisoku";
export { kikaiKenteiKisoku } from "./kikai-kentei-kisoku";
export { hakenAnzenEisei } from "./haken-anzen-eisei";
export { corpusGapFillArticles } from "./corpus-gaps-fill";
// 50法令体制への拡張（+12法令）
export { karoshiBoshiHo } from "./karoshi-boshi-ho";
export { rosaiBoshiDantaiHo } from "./rosai-boshi-dantai-ho";
export { kenkoZoshinHo } from "./kenko-zoshin-ho";
export { jinpaiHoSikokiregu } from "./jinpai-ho-sikokiregu";
export { koatsuGasHoanHo } from "./koatsu-gas-hoanho";
export { soonKiseiHo } from "./soon-kisei-ho";
export { kashinHo } from "./kashin-ho";
export { dokugekiHo } from "./dokugeki-ho";
export { shokuhinEiseiHo } from "./shokuhin-eisei-ho";
export { kensetsuRosaiBoshiKitei } from "./kensetsu-rosai-boshi-kitei";
export { kowanRodoHo } from "./kowan-rodo-ho";
export { seninAnzenEiseiKisoku } from "./senin-anzen-eisei-kisoku";

import { enKisoku } from "./en-kisoku";
import { shiAlkylEnKisoku } from "./shi-alkyl-en-kisoku";
import { jimushoEiseiKijunKisoku } from "./jimusho-eisei-kijun-kisoku";
import { kikaiKenteiKisoku } from "./kikai-kentei-kisoku";
import { hakenAnzenEisei } from "./haken-anzen-eisei";
import { rodoAnzenEiseiHo } from "./rodo-anzen-eisei-ho";
import { rodoAnzenEiseiHoSikokiregu } from "./rodo-anzen-eisei-ho-sikokiregu";
import { anzenEiseiKisoku } from "./anzen-eisei-kisoku";
import { craneKisoku } from "./crane-kisoku";
import { yukiKisoku } from "./yuki-kisoku";
import { tokkaKisoku } from "./tokka-kisoku";
import { sankketsuKisoku } from "./sankketsu-kisoku";
import { sagyokankyoSokuteiho } from "./sagyokankyo-sokuteiho";
import { jinpaiHo } from "./jinpai-ho";
import { denriHoushasenKisoku } from "./denri-houshasen-kisoku";
import { sekimenKisoku } from "./sekimen-kisoku";
import { funjinKisoku } from "./funjin-kisoku";
import { rodoKijunHo } from "./rodo-kijun-ho";
import { rodoKijunHoSikokiregu } from "./rodo-kijun-ho-sikokiregu";
import { saiteiChinginHo } from "./saitei-chingin-ho";
import { rodoKeiyakuHo } from "./rodo-keiyaku-ho";
import { ikujiKaigoKyugyoHo } from "./ikuji-kaigo-kyugyo-ho";
import { rodoShaSaigaiHoshoHokenHo } from "./rodo-sha-saigai-hosho-hoken-ho";
import { shokugyoAnteiHo } from "./shokugyo-antei-ho";
import { shokugyoNoryokuKaihatsuSokushinHo } from "./shokugyo-noryoku-kaihatsu-sokushin-ho";
import { kenkoHojiZoshinShishin } from "./kenko-hoji-zoshin-shishin";
import { vdtGuideline } from "./vdt-guideline";
import { kagakuBusshitsuKanriShishin } from "./kagaku-busshitsu-kanri-shishin";
import { gondolaAnzenKisoku } from "./gondola-anzen-kisoku";
import { boilerAtsuryokuYokiAnzenKisoku } from "./boiler-atsuryoku-yoki-anzen-kisoku";
import { koaAtsuSagyoAnzenEiseiKisoku } from "./koa-atsu-sagyo-anzen-eisei-kisoku";
import { kensetsuGyoho } from "./kensetsu-gyoho";
import { joseiRodoKijunKisoku } from "./josei-rodo-kijun-kisoku";
import { nenshaRodoKijunKisoku } from "./nensha-rodo-kijun-kisoku";
import { tankiRodoShaKanriHo } from "./tanki-rodo-sha-kanri-ho";
import { mentalHealthShishin } from "./mental-health-shishin";
import { ashibaSagyoKisoku } from "./ashiba-sagyo-kisoku";
import { kajuRodoTaisaku } from "./jiritsushinkei-setsumeisho";
import { koyoKintoHo } from "./koyo-kinto-ho";
import { karoshiBoshiHo } from "./karoshi-boshi-ho";
import { rosaiBoshiDantaiHo } from "./rosai-boshi-dantai-ho";
import { kenkoZoshinHo } from "./kenko-zoshin-ho";
import { jinpaiHoSikokiregu } from "./jinpai-ho-sikokiregu";
import { koatsuGasHoanHo } from "./koatsu-gas-hoanho";
import { soonKiseiHo } from "./soon-kisei-ho";
import { kashinHo } from "./kashin-ho";
import { dokugekiHo } from "./dokugeki-ho";
import { shokuhinEiseiHo } from "./shokuhin-eisei-ho";
import { kensetsuRosaiBoshiKitei } from "./kensetsu-rosai-boshi-kitei";
import { kowanRodoHo } from "./kowan-rodo-ho";
import { seninAnzenEiseiKisoku } from "./senin-anzen-eisei-kisoku";
import { egovVerifiedExcerpts } from "./egov-verified-excerpts.generated";

/** 全法令条文をまとめた配列（50法令体制） */
const curatedLawArticles = [
  ...rodoAnzenEiseiHo,
  ...rodoAnzenEiseiHoSikokiregu,
  ...anzenEiseiKisoku,
  ...craneKisoku,
  ...yukiKisoku,
  ...tokkaKisoku,
  ...sankketsuKisoku,
  ...sagyokankyoSokuteiho,
  ...jinpaiHo,
  ...denriHoushasenKisoku,
  ...sekimenKisoku,
  ...funjinKisoku,
  ...rodoKijunHo,
  ...rodoKijunHoSikokiregu,
  ...saiteiChinginHo,
  ...rodoKeiyakuHo,
  ...ikujiKaigoKyugyoHo,
  ...rodoShaSaigaiHoshoHokenHo,
  ...shokugyoAnteiHo,
  ...shokugyoNoryokuKaihatsuSokushinHo,
  ...kenkoHojiZoshinShishin,
  ...vdtGuideline,
  ...kagakuBusshitsuKanriShishin,
  ...gondolaAnzenKisoku,
  ...boilerAtsuryokuYokiAnzenKisoku,
  ...koaAtsuSagyoAnzenEiseiKisoku,
  ...kensetsuGyoho,
  ...joseiRodoKijunKisoku,
  ...nenshaRodoKijunKisoku,
  ...tankiRodoShaKanriHo,
  ...mentalHealthShishin,
  ...ashibaSagyoKisoku,
  ...kajuRodoTaisaku,
  ...koyoKintoHo,
  // mhlw-extras はPDF OCR断片384件の文書種別・条番号・本文一致を人手検証
  // できていないため、公開検索・RAG共通コーパスには混ぜない。データは
  // mhlw-extras.ts から監査用にのみexportし、検証済みallowlistができるまで隔離する。
  ...enKisoku,
  ...shiAlkylEnKisoku,
  ...jimushoEiseiKijunKisoku,
  ...kikaiKenteiKisoku,
  ...hakenAnzenEisei,
  // corpus-gaps-fill は逐語条文ではなく評価不足を補う要旨として作成されたため、
  // 公開法令検索・RAG引用コーパスには混ぜない。監査用exportのみ維持する。
  ...karoshiBoshiHo,
  ...rosaiBoshiDantaiHo,
  ...kenkoZoshinHo,
  ...jinpaiHoSikokiregu,
  ...koatsuGasHoanHo,
  ...soonKiseiHo,
  ...kashinHo,
  ...dokugekiHo,
  ...shokuhinEiseiHo,
  ...kensetsuRosaiBoshiKitei,
  ...kowanRodoHo,
  ...seninAnzenEiseiKisoku,
];

const verifiedLawArticleKeys = new Set(
  egovVerifiedExcerpts.map(
    (article) => `${article.lawShort}|${article.articleNum}`,
  ),
);

/**
 * 公開検索用の収録集合。未確認curated条文は検索索引として残すが、同じ条番号に
 * hash確認済み本文がある場合は必ず確認済み側を優先する。
 *
 * 注意: この配列全体をAI回答・引用の根拠にしてはならない。AI経路は
 * `@/data/laws/verified-corpus` の `verifiedLawArticles` だけを使うこと。
 */
export const allLawArticles = [
  ...curatedLawArticles.filter(
    (article) =>
      !verifiedLawArticleKeys.has(`${article.lawShort}|${article.articleNum}`),
  ),
  ...egovVerifiedExcerpts,
];

/**
 * RAG コーパスの「curated 中核」法令・規則・指針の数（distinct `law` 値）。
 * 実データから算出するためドリフトしない。
 *
 * 算出方針（捏造防止・水増し防止）:
 *   - 専用の curated 法令データファイルの distinct `law` を数える。
 *   - mhlw-extras（compact.json = 厚労省PDF OCR断片）は公開コーパス自体から隔離。
 * 内訳(2026-05 実測): 法令・規則(命令) 47 ＋ 指針/ガイドライン/通達 8 = 計 55。
 * 表記は「法令・規則・指針等」と総称する（全てが狭義の「法令」ではないため）。
 */
export const LAW_SOURCE_COUNT: number = new Set(
  allLawArticles.map((a) => a.law)
).size;
