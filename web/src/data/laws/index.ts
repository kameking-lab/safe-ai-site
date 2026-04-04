export type { LawArticle } from "./law-types";
export { rodoAnzenEiseiHo } from "./rodo-anzen-eisei-ho";
export { anzenEiseiKisoku } from "./anzen-eisei-kisoku";
export { craneKisoku } from "./crane-kisoku";
export { yukiKisoku } from "./yuki-kisoku";
export { tokkaKisoku } from "./tokka-kisoku";
export { sankketsuKisoku } from "./sankketsu-kisoku";

import { rodoAnzenEiseiHo } from "./rodo-anzen-eisei-ho";
import { anzenEiseiKisoku } from "./anzen-eisei-kisoku";
import { craneKisoku } from "./crane-kisoku";
import { yukiKisoku } from "./yuki-kisoku";
import { tokkaKisoku } from "./tokka-kisoku";
import { sankketsuKisoku } from "./sankketsu-kisoku";

/** 全法令条文をまとめた配列 */
export const allLawArticles = [
  ...rodoAnzenEiseiHo,
  ...anzenEiseiKisoku,
  ...craneKisoku,
  ...yukiKisoku,
  ...tokkaKisoku,
  ...sankketsuKisoku,
];
