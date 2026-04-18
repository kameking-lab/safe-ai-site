export type { LawArticle } from "./law-types";
export { rodoAnzenEiseiHo } from "./rodo-anzen-eisei-ho";
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

import { mhlwLawArticles } from "./mhlw-extras";
import { rodoAnzenEiseiHo } from "./rodo-anzen-eisei-ho";
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

/** 全法令条文をまとめた配列（33法令以上） */
export const allLawArticles = [
  ...rodoAnzenEiseiHo,
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
  ...mhlwLawArticles,
];
