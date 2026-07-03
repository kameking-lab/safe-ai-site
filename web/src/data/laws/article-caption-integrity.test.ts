import { describe, expect, it } from "vitest";

import { craneKisoku } from "./crane-kisoku";
import { yukiKisoku } from "./yuki-kisoku";
import { tokkaKisoku } from "./tokka-kisoku";
import { sankketsuKisoku } from "./sankketsu-kisoku";
import { anzenEiseiKisoku } from "./anzen-eisei-kisoku";
import { ashibaSagyoKisoku } from "./ashiba-sagyo-kisoku";
import { rodoAnzenEiseiHo } from "./rodo-anzen-eisei-ho";
import { rodoAnzenEiseiHoSikokiregu } from "./rodo-anzen-eisei-ho-sikokiregu";
import { corpusGapFillArticles } from "./corpus-gaps-fill";
import { boilerAtsuryokuYokiAnzenKisoku } from "./boiler-atsuryoku-yoki-anzen-kisoku";
import { gondolaAnzenKisoku } from "./gondola-anzen-kisoku";
import { enKisoku } from "./en-kisoku";
import { denriHoushasenKisoku } from "./denri-houshasen-kisoku";
import { jimushoEiseiKijunKisoku } from "./jimusho-eisei-kijun-kisoku";
import { funjinKisoku } from "./funjin-kisoku";
import { seninAnzenEiseiKisoku } from "./senin-anzen-eisei-kisoku";
import { koaAtsuSagyoAnzenEiseiKisoku } from "./koa-atsu-sagyo-anzen-eisei-kisoku";
import { jinpaiHoSikokiregu } from "./jinpai-ho-sikokiregu";
import { sekimenKisoku } from "./sekimen-kisoku";
import { shiAlkylEnKisoku } from "./shi-alkyl-en-kisoku";
import { kikaiKenteiKisoku } from "./kikai-kentei-kisoku";
import { rodoKijunHo } from "./rodo-kijun-ho";
import { dokugekiHo } from "./dokugeki-ho";
import { shokugyoAnteiHo } from "./shokugyo-antei-ho";
import { karoshiBoshiHo } from "./karoshi-boshi-ho";
import { koatsuGasHoanHo } from "./koatsu-gas-hoanho";
import { kenkoZoshinHo } from "./kenko-zoshin-ho";
import { kashinHo } from "./kashin-ho";
import { shokuhinEiseiHo } from "./shokuhin-eisei-ho";
import { soonKiseiHo } from "./soon-kisei-ho";
import { kowanRodoHo } from "./kowan-rodo-ho";
import { hakenAnzenEisei } from "./haken-anzen-eisei";
import { rosaiBoshiDantaiHo } from "./rosai-boshi-dantai-ho";
import { jinpaiHo } from "./jinpai-ho";
import { rodoShaSaigaiHoshoHokenHo } from "./rodo-sha-saigai-hosho-hoken-ho";
import { sagyokankyoSokuteiho } from "./sagyokankyo-sokuteiho";
import {
  OFFICIAL_CAPTIONS_ANZEN_EISEI_KISOKU,
  OFFICIAL_CAPTIONS_RODO_ANZEN_EISEI_HO,
  OFFICIAL_CAPTIONS_BOILER_KISOKU,
  OFFICIAL_CAPTIONS_GONDOLA_KISOKU,
  OFFICIAL_CAPTIONS_EN_KISOKU,
  OFFICIAL_CAPTIONS_DENRI_KISOKU,
  OFFICIAL_CAPTIONS_JIMUSHO_KISOKU,
  OFFICIAL_CAPTIONS_FUNJIN_KISOKU,
  OFFICIAL_CAPTIONS_SENIN_KISOKU,
  OFFICIAL_CAPTIONS_KOATSU_KISOKU,
  OFFICIAL_CAPTIONS_JINPAI_KISOKU,
  OFFICIAL_CAPTIONS_SEKIMEN_KISOKU,
  OFFICIAL_CAPTIONS_SHI_ALKYL_KISOKU,
  OFFICIAL_CAPTIONS_KIKAI_KENTEI_KISOKU,
  OFFICIAL_CAPTIONS_ANZEN_EISEI_REI,
  OFFICIAL_CAPTIONS_RODO_KIJUN_HO,
  OFFICIAL_CAPTIONS_DOKUGEKI_HO,
  OFFICIAL_CAPTIONS_SHOKUGYO_ANTEI_HO,
  OFFICIAL_CAPTIONS_KAROSHI_BOSHI_HO,
  OFFICIAL_CAPTIONS_KOATSU_GAS_HOAN_HO,
  OFFICIAL_CAPTIONS_KENKO_ZOSHIN_HO,
  OFFICIAL_CAPTIONS_KASHIN_HO,
  OFFICIAL_CAPTIONS_SHOKUHIN_EISEI_HO,
  OFFICIAL_CAPTIONS_SOON_KISEI_HO,
  OFFICIAL_CAPTIONS_KOWAN_RODO_HO,
  OFFICIAL_CAPTIONS_HAKEN_HO,
  OFFICIAL_CAPTIONS_ROSAI_BOSHI_DANTAI_HO,
  OFFICIAL_CAPTIONS_JINPAI_HO,
  OFFICIAL_CAPTIONS_RODO_SAIGAI_HOKEN_HO,
  OFFICIAL_CAPTIONS_SAKANKAN_SOKUTEIHO,
  OFFICIAL_CAPTIONS_YUKI_KISOKU,
  OFFICIAL_CAPTIONS_SANKKETSU_KISOKU,
  OFFICIAL_CAPTIONS_TOKKA_KISOKU,
  OFFICIAL_CAPTIONS_CRANE_KISOKU,
} from "./egov-caption-snapshot";

/**
 * 安衛則・安衛法（2026-06-10 e-Govスナップショット突合・第2弾）
 *
 * 公式見出しは egov-caption-snapshot.ts（e-Gov API v2 から生成）を正本とする。
 * 値の末尾 "*" は公式に見出しの無い条（直前見出しの継承）を示し、見出し照合をスキップする。
 * "削除" は現行法令上の削除条文であり、コーパスに存在してはならない。
 */

// 見出し照合用: 括弧・空白・「の」を除去し、漢数字（見出し内の条番号引用等）を算用数字へ正規化
function normCaption(s: string): string {
  const KD: Record<string, number> = { 〇: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
  const kanjiToInt = (k: string): string => {
    let total = 0;
    let cur = 0;
    for (const ch of k) {
      if (ch in KD) cur = KD[ch];
      else if (ch === "十") { total += (cur || 1) * 10; cur = 0; }
      else if (ch === "百") { total += (cur || 1) * 100; cur = 0; }
      else if (ch === "千") { total += (cur || 1) * 1000; cur = 0; }
    }
    return String(total + cur);
  };
  return s
    .replace(/[一二三四五六七八九十百千〇]+/g, kanjiToInt)
    .replace(/[（）()\s]/g, "")
    .replace(/ツ/g, "ッ") // 法令原文の表記ゆれ（エツクス線⇔エックス線）を吸収
    .replace(/の/g, "");
}

const CORPORA_EGOV: Array<{
  lawShort: string;
  official: Record<string, string>;
  articles: Array<{ articleNum: string; articleTitle: string }>;
}> = [
  {
    lawShort: "安衛則",
    official: OFFICIAL_CAPTIONS_ANZEN_EISEI_KISOKU,
    articles: [
      ...anzenEiseiKisoku,
      ...ashibaSagyoKisoku.filter((a) => a.lawShort === "安衛則"),
      ...corpusGapFillArticles.filter((a) => a.lawShort === "安衛則"),
    ],
  },
  {
    lawShort: "安衛法",
    official: OFFICIAL_CAPTIONS_RODO_ANZEN_EISEI_HO,
    articles: [
      ...rodoAnzenEiseiHo,
      ...corpusGapFillArticles.filter((a) => a.lawShort === "安衛法"),
    ],
  },
  // 第3弾（法令単位是正 2026-06-10〜）
  {
    lawShort: "ボイラー則",
    official: OFFICIAL_CAPTIONS_BOILER_KISOKU,
    articles: [
      ...boilerAtsuryokuYokiAnzenKisoku,
      ...corpusGapFillArticles.filter((a) => a.lawShort === "ボイラー則"),
    ],
  },
  {
    lawShort: "ゴンドラ則",
    official: OFFICIAL_CAPTIONS_GONDOLA_KISOKU,
    articles: [
      ...gondolaAnzenKisoku,
      ...corpusGapFillArticles.filter((a) => a.lawShort === "ゴンドラ則"),
    ],
  },
  // 第3弾（化学物質系・2026-06-13〜）
  {
    lawShort: "鉛則",
    official: OFFICIAL_CAPTIONS_EN_KISOKU,
    articles: [
      ...enKisoku,
      ...corpusGapFillArticles.filter((a) => a.lawShort === "鉛則"),
    ],
  },
  // 第3弾（電離則・2026-06-14〜）
  {
    lawShort: "電離則",
    official: OFFICIAL_CAPTIONS_DENRI_KISOKU,
    articles: [
      ...denriHoushasenKisoku,
      ...corpusGapFillArticles.filter((a) => a.lawShort === "電離則"),
    ],
  },
  // 第3弾（粉じん則・2026-06-14〜）
  {
    lawShort: "粉じん則",
    official: OFFICIAL_CAPTIONS_FUNJIN_KISOKU,
    articles: [
      ...funjinKisoku,
      ...corpusGapFillArticles.filter((a) => a.lawShort === "粉じん則"),
    ],
  },
  // 第3弾（高圧則・2026-06-14〜）
  {
    lawShort: "高圧則",
    official: OFFICIAL_CAPTIONS_KOATSU_KISOKU,
    articles: [
      ...koaAtsuSagyoAnzenEiseiKisoku,
      ...corpusGapFillArticles.filter((a) => a.lawShort === "高圧則"),
    ],
  },
  // 第4弾（事務所則・2026-06-14〜）
  {
    lawShort: "事務所則",
    official: OFFICIAL_CAPTIONS_JIMUSHO_KISOKU,
    articles: [
      ...jimushoEiseiKijunKisoku,
      ...corpusGapFillArticles.filter((a) => a.lawShort === "事務所則"),
    ],
  },
  // 第4弾（船員安衛則・2026-06-14〜）
  {
    lawShort: "船員安衛則",
    official: OFFICIAL_CAPTIONS_SENIN_KISOKU,
    articles: [
      ...seninAnzenEiseiKisoku,
      ...corpusGapFillArticles.filter((a) => a.lawShort === "船員安衛則"),
    ],
  },
  // 第4弾（じん肺則・2026-06-14〜）
  {
    lawShort: "じん肺則",
    official: OFFICIAL_CAPTIONS_JINPAI_KISOKU,
    articles: [
      ...jinpaiHoSikokiregu,
      ...corpusGapFillArticles.filter((a) => a.lawShort === "じん肺則"),
    ],
  },
  // 第4弾（石綿則・2026-06-14〜）
  {
    lawShort: "石綿則",
    official: OFFICIAL_CAPTIONS_SEKIMEN_KISOKU,
    articles: [
      ...sekimenKisoku,
      ...corpusGapFillArticles.filter((a) => a.lawShort === "石綿則"),
    ],
  },
  // 第4弾（四アルキル鉛則・2026-06-14〜）
  {
    lawShort: "四アルキル鉛則",
    official: OFFICIAL_CAPTIONS_SHI_ALKYL_KISOKU,
    articles: [
      ...shiAlkylEnKisoku,
      ...corpusGapFillArticles.filter((a) => a.lawShort === "四アルキル鉛則"),
    ],
  },
  // 第5弾（機械等検定規則・2026-06-14〜）
  {
    lawShort: "機械等検定規則",
    official: OFFICIAL_CAPTIONS_KIKAI_KENTEI_KISOKU,
    articles: [
      ...kikaiKenteiKisoku,
      ...corpusGapFillArticles.filter((a) => a.lawShort === "機械等検定規則"),
    ],
  },
  // O12（安衛令・チャットボット構造欠落解消 2026-07-03〜）
  {
    lawShort: "安衛令",
    official: OFFICIAL_CAPTIONS_ANZEN_EISEI_REI,
    articles: [
      ...rodoAnzenEiseiHoSikokiregu,
      ...corpusGapFillArticles.filter((a) => a.lawShort === "安衛令"),
    ],
  },
  // O12（3/n）労基法 第20条(解雇の予告)追加に伴う収録条の見出し固定（e-Gov 322AC0000000049 突合 2026-07-03）。
  // 本則約130条のうち rodo-kijun-ho.ts の収録条のみを正本化する。corpus-gaps-fill.ts の労基法エントリ
  // （第39条=年次有給休暇・第66条=見出し無し条の要約）は要約テキスト・合成見出しの別データ系列のため対象外。
  {
    lawShort: "労基法",
    official: OFFICIAL_CAPTIONS_RODO_KIJUN_HO,
    articles: [...rodoKijunHo],
  },
  // 柱1第5弾（毒劇法・一般法 2026-07-03）e-Gov 325AC0000000303（rev 20250601_504AC0000000068）本則全条を正本化。
  // 旧コーパスは 第16条の2「事故の際の措置」（現行法に不存在＝第17条へ改番）等の条番号・見出し誤りを含んでいた。
  {
    lawShort: "毒劇法",
    official: OFFICIAL_CAPTIONS_DOKUGEKI_HO,
    articles: [...dokugekiHo],
  },
  // 柱1第5弾（職安法・一般法 2026-07-03）e-Gov 322AC0000000141（rev 20260401_506AC0000000050）突合。
  // 旧コーパスは第33条に第33条の2の内容を、不存在の第34条の3に第5条の3の内容を割り当てていた。
  {
    lawShort: "職安法",
    official: OFFICIAL_CAPTIONS_SHOKUGYO_ANTEI_HO,
    articles: [...shokugyoAnteiHo],
  },
  // 柱1（過労死防止法・一般法 2026-07-03）e-Gov 426AC1000000100（rev 20141101・本則無改正）全14条を正本化。
  // 旧コーパスは責務を第4〜6条に誤分割（現行は第4条「国の責務等」1条に統合）し第5条以降が1条ずつズレ、
  // 第6条「年次報告」・第14条「法制上の措置等」を欠落していた。
  {
    lawShort: "過労死防止法",
    official: OFFICIAL_CAPTIONS_KAROSHI_BOSHI_HO,
    articles: [...karoshiBoshiHo],
  },
  // 柱1第5弾（高圧ガス保安法・一般法 2026-07-03）e-Gov 326AC0000000204 本則全条（〜第86条）を正本化。
  // 旧コーパスは 完成検査を第14条（正=第20条／第14条は製造施設等の変更）・移動を第22条（正=第23条／
  // 第22条は輸入検査）と誤番し、第27条の3の見出しも保安技術管理者・保安係員（正=27条の2の職）と取り違えていた。
  {
    lawShort: "高圧ガス保安法",
    official: OFFICIAL_CAPTIONS_KOATSU_GAS_HOAN_HO,
    articles: [...koatsuGasHoanHo],
  },
  // 柱1（健康増進法・一般法 2026-07-03）e-Gov 414AC0000000103
  // （rev 20251212_507AC0000000087）本則全78条を正本化。旧コーパスは2018改正で再構成された
  // 受動喫煙章の条番号が系統的にズレ、旧第25/27/29/33/34/35/40/76条を別条見出しへ誤割当していた。
  {
    lawShort: "健康増進法",
    official: OFFICIAL_CAPTIONS_KENKO_ZOSHIN_HO,
    articles: [...kenkoZoshinHo],
  },
  // 柱1第5弾（化審法・一般法 2026-07-03）e-Gov 348AC0000000117（rev 20260701_508AC0000000022）本則全63条を正本化。
  // 旧コーパスは後半で系統的に条番号がズレ、第24条を「優先評価化学物質の指定」（正=製品の輸入の制限）・
  // 第26条を「有害性調査の指示」（正=使用の届出）・第38条を「取扱基準」（正=勧告）・第39条を「表示」（正=指導及び助言）・
  // 第41条を「報告徴収・立入検査」（正=有害性情報の報告等）と誤割当していた。優先評価化学物質は第9/10条、
  // 第二種の技術指針・表示は第36/37条、立入検査は第44条へ振替。
  {
    lawShort: "化審法",
    official: OFFICIAL_CAPTIONS_KASHIN_HO,
    articles: [...kashinHo],
  },
  // 柱1（食品衛生法・一般法 2026-07-03）e-Gov 322AC0000000233（rev 20250601）を正本化。
  // ⚠食品衛生法は公式見出しを持たない（本文内容準拠ラベル）。旧コーパスは2018改正前の条番号のままで、
  // 規格基準(旧第11条→正第13条)・営業許可(旧第52条→正第55条)・営業届出(旧第55条→正第57条)・
  // 食中毒届出(旧第58条→正第63条)・食品衛生監視員(旧第63条→正第30条)が系統的に誤っていた。
  {
    lawShort: "食品衛生法",
    official: OFFICIAL_CAPTIONS_SHOKUHIN_EISEI_HO,
    articles: [...shokuhinEiseiHo],
  },
  // 柱1（騒音規制法・一般法 2026-07-03）e-Gov 343AC0000000098（rev 20260701_508AC0000000022）本則全33条を正本化。
  // 旧コーパスは規制権限を旧「都道府県知事」のまま（正=地方分権で市町村長）とし、旧第8条「計画変更命令」
  // （正=第9条 計画変更勧告）・旧第17条「自動車騒音の許容限度」（正=第16条 許容限度）を条番号ズレで誤割当していた。
  {
    lawShort: "騒音規制法",
    official: OFFICIAL_CAPTIONS_SOON_KISEI_HO,
    articles: [...soonKiseiHo],
  },
  // 柱1（港湾労働法・一般法 2026-07-03）e-Gov 363AC0000000040（rev 20250601_504AC0000000068）本則全52条を正本化。
  // 旧コーパスは条番号・見出しが系統的に誤っていた（責務を第4条「港湾運送事業主の責務」＝正は関係者の責務／
  // 派遣事業を第8条＝正は職業紹介／許可基準を第12条＝正は許可そのもの・基準は第14条／派遣期間を第14条／
  // 港湾労働者証を第41条＝正は聴聞の特例・交付は第9条／雇用管理者を第29条＝正は指定の条件・雇用管理者は第6条）。
  {
    lawShort: "港湾労働法",
    official: OFFICIAL_CAPTIONS_KOWAN_RODO_HO,
    articles: [...kowanRodoHo],
  },
  // 柱1（労働災害防止団体法 2026-07-03）e-Gov 339AC0000000118（生JSON・取得 2026-07-03）本則全63条を正本化。
  // 旧コーパスは条番号・見出しが系統的に誤割当（第3条=種類→正は第8条・第3〜7条は削除／中央協会の業務を
  // 第6条「目的」/第10条「業務」に誤割当→正は第11条／業種別協会の業務を第26/27条→正は第36条／罰則を
  // 第57条＝鉱山特例に誤割当→正は第59〜63条）。第8条が定める2区分（中央協会・協会）を無視した業種別5協会の
  // 列挙も条文準拠へ是正。
  {
    lawShort: "労災防止団体法",
    official: OFFICIAL_CAPTIONS_ROSAI_BOSHI_DANTAI_HO,
    articles: [...rosaiBoshiDantaiHo],
  },
  // 柱1（じん肺法・一般法 2026-07-03）e-Gov 335AC0000000030（令和元年改正・生JSON 取得 2026-07-03）本則全条（第1〜46条）を正本化。
  // じん肺法施行規則（じん肺則）とは別法。旧コーパスは①第3条を現行法に不存在の「適用範囲」（正=じん肺健康診断）、
  // ②第13条を本文取り違え（事業者の書面提出＝第12条相当を「決定の申請」と誤記／正=じん肺管理区分の決定手続等）、
  // ③作業の転換を第20条（正=審査請求と訴訟との関係／作業の転換は第21条）と誤割当していた。実在条・公式見出しへ全面是正。
  {
    lawShort: "じん肺法",
    official: OFFICIAL_CAPTIONS_JINPAI_HO,
    articles: [...jinpaiHo],
  },
  // 柱1（作業環境測定法・一般法 2026-07-03）e-Gov 350AC0000000028（rev 20260401_507AC0000000033）本則を正本化。
  // 旧コーパスは廃止前の旧版に基づき条番号・見出し・本文が系統的に誤っていた（旧第3条「作業環境測定士の資格」＝
  // 正は第5条・第3条は作業環境測定の実施／旧第33条「作業環境測定機関の登録」＝公式見出しは作業環境測定機関／
  // 旧第36条「作業環境測定機関の義務」＝第36条は日本作業環境測定協会／旧第41条「報告等」＝第41条は
  // 厚生労働大臣等の権限・報告等は第42条）。第2条定義（作業環境測定＝労安法第2条第4号）の本文誤りも是正。
  {
    lawShort: "作環測法",
    official: OFFICIAL_CAPTIONS_SAKANKAN_SOKUTEIHO,
    articles: [...sagyokankyoSokuteiho],
  },
  // 柱1（有機則・特別則 2026-07-03）e-Gov 347M50002000036（rev 20260401_508M60000100003）本則全56条を正本化。
  // 旧インラインマップは第30条を「健康診断の結果の記録」（正=健康診断の結果）とし、8つの無見出し条
  // （第3条・第13条の2/3・第18条の3・第28条の3の2/3の3・第28条の4・第37条）に "*" を欠いていた。
  {
    lawShort: "有機則",
    official: OFFICIAL_CAPTIONS_YUKI_KISOKU,
    articles: [...yukiKisoku],
  },
  // 柱1（酸欠則・インライン未検証法の e-Gov 昇格 2026-07-03）e-Gov 347M50002000042
  // （rev 20260401_508M60000100003）本則全33条を正本化。これまで酸欠則はインラインマップのみで
  // e-Gov 未突合だったため CORPORA_EGOV へ昇格。コーパス収録16条は全て公式見出しと完全一致で是正不要。
  {
    lawShort: "酸欠則",
    official: OFFICIAL_CAPTIONS_SANKKETSU_KISOKU,
    articles: [...sankketsuKisoku],
  },
  // 柱1（特化則・特別則 2026-07-03）e-Gov 347M50002000039（rev 20260401_508M60000100003）本則全94条を正本化。
  // 旧インラインマップ（2026-06-10取得）は本則見出しを正しく持っていたが、17の無見出し条に "*" を欠き、
  // 緩い norm（漢数字非正規化）で照合していた。他特別則と同じ CORPORA_EGOV の厳格突合へ昇格（内容誤りは無し＝収録数不変）。
  {
    lawShort: "特化則",
    official: OFFICIAL_CAPTIONS_TOKKA_KISOKU,
    articles: [...tokkaKisoku],
  },
  // 柱1（クレーン則・インライン未検証法の e-Gov 昇格 2026-07-03・最終）e-Gov 347M50002000034
  // （rev 20260401_508M60000100003）本則全条（第1〜247条）を正本化。旧インラインマップ（2026-06-10取得）は
  // 本則見出しを正しく持っていたが、17の無見出し条に "*" を欠き、第235〜239条（削除条の範囲）を
  // 不正なキー "第235:239条" で第234条の見出しを複写していた。無見出し17条を継承見出し＋"*"、
  // 削除条5条（第235〜239条）を "削除" として CORPORA_EGOV へ移設（本則見出しの内容誤りは無し＝収録数不変）。
  // これでインライン未検証法（クレーン則・有機則・特化則・酸欠則）の e-Gov 昇格が完了し、旧インライン
  // OFFICIAL_CAPTIONS マップ・CORPORA 配列・norm 関数は全廃＝全コーパスが CORPORA_EGOV に一本化された。
  {
    lawShort: "クレーン則",
    official: OFFICIAL_CAPTIONS_CRANE_KISOKU,
    articles: [...craneKisoku],
  },
  // 柱1（労働者派遣法・一般法 2026-07-03）e-Gov 360AC0000000088（本則第1条〜第62条）を正本化。
  // 旧コーパスは条番号・見出しが系統的に誤っていた（第46条＝じん肺法特例を「労災保険法の特例」と捏造／
  // 就業条件明示を第35条の2＝正は労働者派遣の期間／派遣禁止業務を第40条の2＝正は派遣可能期間・派遣禁止は第4条／
  // 特殊健診結果通知を第45条第4項＝正は第10項／一般定期健診を第45条第9項に誤帰属）。
  {
    lawShort: "派遣法",
    official: OFFICIAL_CAPTIONS_HAKEN_HO,
    articles: [...hakenAnzenEisei],
  },
  // 柱1（労災保険法・一般法 2026-07-03）e-Gov 322AC0000000050 を正本化。⚠公式見出しを持たない（本文内容準拠ラベル）。
  // 旧コーパスは給付体系を誤帰属していた（第12条の8「療養補償給付」＝正は業務災害給付の種類の列挙で本文は休業補償給付
  // ＝第14条／第16条の第2項に遺族の範囲＝正は第16条の2／通勤の定義を第7条第3項＝正は第7条第2項）。
  {
    lawShort: "労災保険法",
    official: OFFICIAL_CAPTIONS_RODO_SAIGAI_HOKEN_HO,
    articles: [...rodoShaSaigaiHoshoHokenHo],
  },
];

describe("条番号⇄見出し整合 安衛則・安衛法（e-Gov 2026-06-10 スナップショット）", () => {
  for (const { lawShort, official, articles } of CORPORA_EGOV) {
    describe(lawShort, () => {
      it("全エントリの条番号が実在する", () => {
        for (const a of articles) {
          expect(official[a.articleNum], `${lawShort}${a.articleNum} は存在しない条番号`).toBeDefined();
        }
      });
      it("削除条文を参照していない", () => {
        for (const a of articles) {
          const cap = official[a.articleNum];
          expect(cap === "削除" || cap === "削除*", `${lawShort}${a.articleNum} は削除条文`).toBe(false);
        }
      });
      it("全エントリの見出しが公式見出しと整合する（見出しの無い条は除く）", () => {
        for (const a of articles) {
          const cap = official[a.articleNum];
          if (!cap || cap.endsWith("*")) continue; // 不存在は別テスト・継承見出しはスキップ
          expect(
            normCaption(a.articleTitle).includes(normCaption(cap)),
            `${lawShort}${a.articleNum}: corpus「${a.articleTitle}」 official「${cap}」`,
          ).toBe(true);
        }
      });
      it("条番号の重複が無い（複数ファイル横断）", () => {
        const seen = new Set<string>();
        for (const a of articles) {
          expect(seen.has(a.articleNum), `${lawShort}${a.articleNum} が重複`).toBe(false);
          seen.add(a.articleNum);
        }
      });
    });
  }

  // 今回是正した代表的な誤割当の再発防止（旧コーパスで誤っていた組）
  it("既知の誤割当が再発していない（安衛則・安衛法）", () => {
    const kisoku = OFFICIAL_CAPTIONS_ANZEN_EISEI_KISOKU;
    const ho = OFFICIAL_CAPTIONS_RODO_ANZEN_EISEI_HO;
    // 旧コーパス: 則1条を「定義」、則7条を「安全管理者の選任」、則37条を「記録の保存」等と誤割当していた
    expect(kisoku["第1条"]).toBe("共同企業体");
    expect(kisoku["第4条"]).toBe("安全管理者の選任");
    expect(kisoku["第7条"]).toBe("衛生管理者の選任");
    expect(kisoku["第16条"]).toBe("作業主任者の選任");
    expect(kisoku["第23条"]).toBe("委員会の会議");
    expect(kisoku["第37条"]).toBe("特別教育の科目の省略");
    expect(kisoku["第38条"]).toBe("特別教育の記録の保存");
    expect(kisoku["第51条"]).toBe("健康診断結果の記録の作成");
    expect(kisoku["第52条"]).toBe("健康診断結果報告");
    expect(kisoku["第355条"]).toBe("作業箇所等の調査");
    expect(kisoku["第373条"]).toBe("点検");
    expect(kisoku["第530条"]).toBe("立入禁止");
    expect(kisoku["第539条の2"]).toBe("ライフラインの設置");
    expect(kisoku["第539条の9"]).toBe("作業開始前点検");
    expect(kisoku["第562条"]).toBe("最大積載荷重");
    expect(kisoku["第564条"]).toBe("足場の組立て等の作業");
    expect(kisoku["第567条"]).toBe("点検");
    expect(kisoku["第577条"]).toBe("ガス等の発散の抑制等");
    expect(kisoku["第604条"]).toBe("照度");
    expect(kisoku["第606条"]).toBe("温湿度調節");
    expect(kisoku["第613条"]).toBe("休憩設備");
    expect(kisoku["第614条"]).toBe("有害作業場の休憩設備");
    expect(kisoku["第619条"]).toBe("清掃等の実施");
    expect(kisoku["第627条"]).toBe("給水");
    expect(kisoku["第633条"]).toBe("救急用具");
    expect(ho["第8条"]).toBe("公表");
    expect(ho["第9条"]).toBe("勧告等");
    expect(ho["第15条の2"]).toBe("元方安全衛生管理者");
    expect(ho["第16条"]).toBe("安全衛生責任者");
    expect(ho["第35条"]).toBe("重量表示");
    expect(ho["第38条"]).toBe("製造時等検査等");
    expect(ho["第44条"]).toBe("個別検定");
    expect(ho["第45条"]).toBe("定期自主検査");
    expect(ho["第64条"]).toBe("削除"); // 旧コーパスは削除条文に架空の内容を割り当てていた
    expect(ho["第68条"]).toBe("病者の就業禁止");
    expect(ho["第93条"]).toBe("産業安全専門官及び労働衛生専門官");
  });

  // O12(4/n): ストレスチェック50人根拠（安衛則52条の9系）の再発防止
  // e-Gov 347M50002000032（rev 20260701_506M60000100079）突合
  it("ストレスチェックの実施(52条の9)・報告(52条の21=常時50人以上)がコーパスに存在する", () => {
    const kisoku = OFFICIAL_CAPTIONS_ANZEN_EISEI_KISOKU;
    expect(kisoku["第52条の9"]).toBe("心理的な負担の程度を把握するための検査の実施方法");
    expect(kisoku["第52条の21"]).toBe("検査及び面接指導結果の報告");

    const jisshi = anzenEiseiKisoku.find((a) => a.articleNum === "第52条の9");
    expect(jisshi, "安衛則第52条の9(ストレスチェック実施)がコーパスに無い").toBeDefined();
    expect(jisshi!.text).toContain("法第66条の10");
    expect(jisshi!.text).toContain("1年以内ごとに1回");

    const houkoku = anzenEiseiKisoku.find((a) => a.articleNum === "第52条の21");
    expect(houkoku, "安衛則第52条の21(検査結果報告)がコーパスに無い").toBeDefined();
    // 「ストレスチェック 何人 → 50」の根拠＝常時50人以上の事業者に報告義務
    expect(houkoku!.text).toContain("常時50人以上");
    expect(houkoku!.text).toContain("労働基準監督署長に報告");
  });

  // 第3弾是正の再発防止（旧コーパスで誤っていた組）
  it("既知の誤割当が再発していない（ボイラー則）", () => {
    const b = OFFICIAL_CAPTIONS_BOILER_KISOKU;
    // 旧コーパス: 25条を「選任」、26条を「職務」、3条を「設置届」、6条を「落成検査」、
    // 7条を「ボイラー検査証」、10条を「性能検査」、64条を「第一種圧力容器の作業主任者」等と誤割当していた
    expect(b["第10条"]).toBe("設置届");
    expect(b["第14条"]).toBe("落成検査");
    expect(b["第15条"]).toBe("ボイラー検査証");
    expect(b["第23条"]).toBe("就業制限");
    expect(b["第24条"]).toBe("ボイラー取扱作業主任者の選任");
    expect(b["第25条"]).toBe("ボイラー取扱作業主任者の職務");
    expect(b["第32条"]).toBe("定期自主検査");
    expect(b["第33条"]).toBe("補修等");
    expect(b["第37条"]).toBe("ボイラー検査証の有効期間");
    expect(b["第38条"]).toBe("性能検査等");
    expect(b["第62条"]).toBe("第一種圧力容器取扱作業主任者の選任");
    expect(b["第67条"]).toBe("定期自主検査");
    expect(b["第91条"]).toBe("設置報告");
    expect(b["第92条"]).toBe("特別の教育");
    // 旧コーパスの「第141条 小型圧力容器の取扱い」は実在しない条番号だった
    expect(b["第141条"]).toBeUndefined();
  });

  // 第3弾(2/7)是正の再発防止（旧コーパスで誤っていた組）
  it("既知の誤割当が再発していない（ゴンドラ則）", () => {
    const g = OFFICIAL_CAPTIONS_GONDOLA_KISOKU;
    // 旧コーパス: 2条を「定義」、3条を「設置届」、4条を「使用検査」、9条を「検査証の備付け」、
    // 12条を「定期自主検査」、13条を「作業開始前の点検」、14条を「過負荷の禁止」、
    // 15条を「搭乗制限(乗込定員)」、16条を「墜落防止」、17条を「強風時の作業禁止」、
    // 18条を「ワイヤロープ異常時の措置」、19条を「運転の合図」、20条を「就業制限」と誤割当していた
    expect(g["第1条"]).toBe("定義");
    expect(g["第2条"]).toBe("製造許可");
    expect(g["第3条"]).toBe("検査設備等の変更報告");
    expect(g["第6条"]).toBe("使用検査");
    expect(g["第9条"]).toBe("検査証の有効期間");
    expect(g["第10条"]).toBe("設置届");
    expect(g["第11条"]).toBe("使用の制限");
    expect(g["第12条"]).toBe("特別の教育");
    expect(g["第13条"]).toBe("過負荷の制限");
    expect(g["第14条"]).toBe("脚立等の使用禁止");
    expect(g["第15条"]).toBe("操作位置からの離脱の禁止");
    expect(g["第16条"]).toBe("操作の合図");
    expect(g["第17条"]).toBe("要求性能墜落制止用器具等");
    expect(g["第18条"]).toBe("立入禁止");
    expect(g["第19条"]).toBe("悪天候時の作業禁止");
    expect(g["第20条"]).toBe("照明");
    expect(g["第21条"]).toBe("定期自主検査");
    expect(g["第22条"]).toBe("作業開始前の点検");
    expect(g["第23条"]).toBe("補修");
    // ゴンドラ則に「就業制限」「搭乗制限(乗込定員)」「検査証の備付け」という条は存在しない
    const captions = Object.values(g);
    expect(captions.includes("就業制限")).toBe(false);
    expect(captions.includes("搭乗の制限")).toBe(false);
    expect(captions.includes("検査証の備付け")).toBe(false);
  });

  // 第3弾(鉛則)是正の再発防止（旧コーパスで誤っていた組）
  it("既知の誤割当が再発していない（鉛則）", () => {
    const e = OFFICIAL_CAPTIONS_EN_KISOKU;
    // 旧コーパス: 2条を「適用除外」(正は3条)、5条を「局所排気装置の性能」(正は30条)、
    // 8条を「清潔の保持等」(正は48条そうじ)、22条を「洗浄設備」(正は47条洗身設備)、
    // 26条を「作業環境測定」(正は52条測定)、27条を「測定結果の評価」(正は52条の2)、
    // 35条を「鉛作業主任者の選任」(正は33条)、36条を「鉛作業主任者の職務」(正は34条)、
    // 39/40条を「健康診断」(正は53条)、53条を「健診結果措置」(正は57条就業禁止)と誤割当していた
    expect(e["第1条"]).toBe("定義");
    expect(e["第3条"]).toBe("適用の除外");
    expect(e["第30条"]).toBe("局所排気装置等の性能");
    expect(e["第33条"]).toBe("鉛作業主任者の選任");
    expect(e["第34条"]).toBe("作業主任者の職務");
    expect(e["第47条"]).toBe("洗身設備");
    expect(e["第48条"]).toBe("そうじ");
    expect(e["第52条"]).toBe("測定");
    expect(e["第52条の2"]).toBe("測定結果の評価");
    expect(e["第53条"]).toBe("健康診断");
    expect(e["第54条"]).toBe("健康診断の結果");
    expect(e["第57条"]).toBe("鉛中毒にかかつている者等の就業禁止");
    expect(e["第58条"]).toBe("呼吸用保護具等");
    // 鉛則第30条の性能規定は「鉛濃度0.05mg/m3以下」であり、制御風速ではない
    // 鉛則第52条の測定頻度は「1年以内ごと」であり、3月以内ごとではない
    // 鉛則第33条の根拠は「令第6条第19号」であり、第17号ではない
    // 鉛則に「第8条 清潔の保持」「第22条 洗浄設備」「第26条 作業環境測定」という見出しは存在しない
    expect(e["第8条"]).toBe("電線等の製造に係る設備");
    expect(e["第22条"]).toBe("ろ過集じん方式の集じん装置");
    expect(e["第26条"]).toBe("除じん装置");
  });

  // 第3弾(電離則)是正の再発防止（旧コーパスで誤っていた組）
  it("既知の誤割当が再発していない（電離則）", () => {
    const d = OFFICIAL_CAPTIONS_DENRI_KISOKU;
    // 旧コーパス: 1条を「定義」(正は2条。1条は基本原則)、2条を「等価線量限度」(正は5条)、
    // 2条の2を「被ばく限度」(正は4条。2条の2は存在しない)、3条を「管理区域の設定」(正は明示等)、
    // 8条を「放射線測定器の装備」(正は線量の測定)、40条を「特別教育」(正は52条の5。40条は作業衣)、
    // 42条を「放射線取扱主任者の選任(放射線取扱主任者免状)」(電離則に同条は無い。
    //   主任者はエックス線=46条/ガンマ線=52条の2で、根拠は各々の免許。放射線取扱主任者はRI法の制度)、
    // 7条を「外部放射線の測定」(正は緊急作業時被ばく限度。測定は54条)、
    // 53条を「放射線障害発生時の応急措置」(正は作業環境測定を行うべき作業場)、
    // 56条見出しを保持しつつ58条に「常時50人以上」要件を付していた(電離則58条に人数要件は無い)。
    expect(d["第1条"]).toBe("放射線障害防止の基本原則");
    expect(d["第2条"]).toBe("定義等");
    expect(d["第2条の2"]).toBeUndefined(); // 第2条の2は存在しない
    expect(d["第3条"]).toBe("管理区域の明示等");
    expect(d["第4条"]).toBe("放射線業務従事者の被ばく限度");
    expect(d["第8条"]).toBe("線量の測定");
    expect(d["第40条"]).toBe("作業衣"); // 特別教育ではない
    expect(d["第42条"]).toBe("退避"); // 放射線取扱主任者の選任ではない
    expect(d["第46条"]).toBe("エツクス線作業主任者の選任");
    expect(d["第52条の2"]).toBe("ガンマ線透過写真撮影作業主任者の選任");
    expect(d["第52条の5"]).toBe("エックス線装置等を取り扱う業務に係る特別の教育");
    expect(d["第54条"]).toBe("線量当量率等の測定等");
    expect(d["第56条"]).toBe("健康診断");
    expect(d["第57条"]).toBe("健康診断の結果の記録");
    expect(d["第58条"]).toBe("健康診断結果報告");
    // 16条・20条・21条は削除条文（コーパスに存在してはならない）
    expect(d["第16条"]).toBe("削除");
    expect(d["第20条"]).toBe("削除");
    expect(d["第21条"]).toBe("削除");
    // 電離則に「放射線取扱主任者」という作業主任者制度は無い（RI法の制度との取り違え防止）
    const captions = Object.values(d);
    expect(captions.includes("放射線取扱主任者の選任")).toBe(false);
  });

  // 第3弾(粉じん則)是正の再発防止（旧コーパスで誤っていた組）
  it("既知の誤割当が再発していない（粉じん則）", () => {
    const f = OFFICIAL_CAPTIONS_FUNJIN_KISOKU;
    // 旧コーパス: 1条を「定義」(正は事業者の責務。定義は2条)、2条を「粉じん障害防止に係る措置」(正は定義等)、
    // 4条を「局所排気装置等の設置」(正は特定粉じん発生源に係る措置)、5条を「局所排気装置等の定期自主検査」
    // (正は換気の実施等。定期自主検査は17条)、6条を「設備の補修」(正は坑内の換気。補修等は21条)、
    // 20条を「作業環境測定結果の評価」(正は点検の記録。評価は26条の2)、21条を「呼吸用保護具の使用(第3管理区分)」
    // (正は補修等)、26条を「呼吸用保護具の使用」(正は粉じん濃度の測定等)、27条を「作業環境測定」
    // (正は呼吸用保護具の使用)、3条を「湿潤化等の措置」(正は設備による注水又は注油をする場合の特例)と誤割当していた。
    expect(f["第1条"]).toBe("事業者の責務");
    expect(f["第2条"]).toBe("定義等");
    expect(f["第3条"]).toBe("設備による注水又は注油をする場合の特例");
    expect(f["第4条"]).toBe("特定粉じん発生源に係る措置");
    expect(f["第5条"]).toBe("換気の実施等");
    expect(f["第16条"]).toBe("湿潤な状態に保つための設備による湿潤化");
    expect(f["第17条"]).toBe("局所排気装置等の定期自主検査");
    expect(f["第18条"]).toBe("定期自主検査の記録");
    expect(f["第21条"]).toBe("補修等");
    expect(f["第22条"]).toBe("特別の教育");
    expect(f["第24条"]).toBe("清掃の実施");
    expect(f["第25条"]).toBe("作業環境測定を行うべき屋内作業場");
    expect(f["第26条"]).toBe("粉じん濃度の測定等");
    expect(f["第26条の2"]).toBe("測定結果の評価");
    expect(f["第26条の3"]).toBe("評価の結果に基づく措置");
    expect(f["第27条"]).toBe("呼吸用保護具の使用");
    // 粉じん則の本則は第27条で終わる。旧コーパスの「第28条 作業環境測定の記録」「第29条 掲示」は実在しない条。
    // 掲示は第23条の2、測定結果の記録(7年)は第26条の2に含まれる。
    expect(f["第28条"]).toBeUndefined();
    expect(f["第29条"]).toBeUndefined();
    expect(f["第23条の2"]).toBe("掲示");
    // 粉じん則に「洗浄設備」条は存在しない（旧コーパスは25条を「洗浄設備の設置」と誤割当。25条は作業環境測定を行うべき屋内作業場）。
    const captions = Object.values(f);
    expect(captions.includes("洗浄設備の設置")).toBe(false);
  });

  // 第4弾(船員安衛則)是正の再発防止（旧コーパスは第1条以外ほぼ全エントリが別条の見出しに誤割当だった）
  it("既知の誤割当が再発していない（船員安衛則）", () => {
    const s = OFFICIAL_CAPTIONS_SENIN_KISOKU;
    // 旧コーパス: 2条を「船舶所有者の責務」(正は安全担当者の選任)、5条を「安全衛生委員会」
    // (正は安全担当者の業務。船内安全衛生委員会は1条の3)、6条を「船内安全衛生委員会の構成」(正は改善意見の申出等)、
    // 8条を「安全衛生教育」(正は衛生担当者の業務。教育は11条)、14条を「船内作業の安全」(正は規定の作成)、
    // 16条を「高所作業」(正は船員の遵守事項。高所作業は51条)、20条を「船倉等の閉鎖区画作業」(正は器具等の整とん)、
    // 26条を「化学物質取扱作業」(正は床面等の安全)、29条を「保護具の備付け・使用」(正は船内衛生の保持。保護具は45条)、
    // 38条を「雇入時健康診断」(正は清水の積み込み及び貯蔵)、40条を「定期健康診断」(正は飲用水タンク等)、
    // 50条を「健康診断記録の保存」(正は有害気体等が発生するおそれのある場所等で行う作業)と誤割当していた。
    expect(s["第1条"]).toBe("趣旨");
    expect(s["第1条の3"]).toBe("船内安全衛生委員会");
    expect(s["第2条"]).toBe("安全担当者の選任");
    expect(s["第5条"]).toBe("安全担当者の業務");
    expect(s["第8条"]).toBe("衛生担当者の業務");
    expect(s["第11条"]).toBe("安全衛生に関する教育及び訓練");
    expect(s["第14条"]).toBe("規定の作成");
    expect(s["第16条"]).toBe("船員の遵守事項");
    expect(s["第20条"]).toBe("器具等の整とん");
    expect(s["第26条"]).toBe("床面等の安全");
    expect(s["第29条"]).toBe("船内衛生の保持");
    expect(s["第38条"]).toBe("清水の積み込み及び貯蔵");
    expect(s["第40条"]).toBe("飲用水タンク等");
    expect(s["第45条"]).toBe("保護具");
    expect(s["第50条"]).toBe("有害気体等が発生するおそれのある場所等で行う作業");
    expect(s["第51条"]).toBe("高所作業");
    // 第15条は削除条文。本則は第96条で終わる
    expect(s["第15条"]).toBe("削除");
    expect(s["第97条"]).toBeUndefined();
  });

  // 第3弾(高圧則)是正の再発防止（旧コーパスで誤っていた組）
  it("既知の誤割当が再発していない（高圧則）", () => {
    const k = OFFICIAL_CAPTIONS_KOATSU_KISOKU;
    // 旧コーパス: 1条を「定義」(正は事業者の責務。定義は1条の2)、
    // 11条を「高圧室内作業主任者の選任」(正は特別の教育。主任者選任は10条)、
    // 12条を「高圧室内作業主任者の職務」(正は潜水士。職務は10条第2項)、
    // 28条を「特別教育」(正は送気量及び送気圧。特別教育は11条)、
    // 40条を「加圧の速度」(正は健康診断結果報告。加圧の速度は14条)、
    // 41条を「減圧の速度」(正は病者の就業禁止。減圧の速度等は18条)、
    // 42条を「緊急減圧の禁止」(正は再圧室の設置)、45条を「潜水業務における送気」(正は再圧室の点検。送気量は28条)、
    // 52条を「健康診断」(正は免許を受けることができる者。健診は38条)、
    // 53条を「健康診断の記録保存」(正は免許の欠格事由)、54条を「健康診断結果の報告」(正は試験科目等。結果報告は40条)、
    // 5条を「空気の清浄(炭酸ガス1.5%送気)」(正は空気清浄装置。1.5%要件は高圧則に無い)と誤割当していた。
    expect(k["第1条"]).toBe("事業者の責務");
    expect(k["第1条の2"]).toBe("定義");
    expect(k["第10条"]).toBe("作業主任者");
    expect(k["第11条"]).toBe("特別の教育");
    expect(k["第12条"]).toBe("潜水士");
    expect(k["第12条の2"]).toBe("作業計画");
    expect(k["第14条"]).toBe("加圧の速度");
    expect(k["第15条"]).toBe("ガス分圧の制限");
    expect(k["第16条"]).toBe("酸素ばく露量の制限");
    expect(k["第18条"]).toBe("減圧の速度等");
    expect(k["第27条"]).toBe("作業計画等の準用");
    expect(k["第28条"]).toBe("送気量及び送気圧");
    expect(k["第38条"]).toBe("健康診断");
    expect(k["第40条"]).toBe("健康診断結果報告");
    expect(k["第42条"]).toBe("設置");
    expect(k["第47条"]).toBe("免許を受けることができる者");
    // 31条・35条・49条は削除条文（コーパスに存在してはならない）
    expect(k["第31条"]).toBe("削除");
    expect(k["第35条"]).toBe("削除");
    expect(k["第49条"]).toBe("削除");
    // 旧コーパスの「加圧の速度=40条」「減圧の速度=41条」「健康診断=52条」は全て誤り
    expect(k["第40条"]).not.toBe("加圧の速度");
    expect(k["第41条"]).toBe("病者の就業禁止");
    expect(k["第52条"]).not.toBe("健康診断");
  });

  // 第4弾(事務所則)是正の再発防止（旧コーパスで誤っていた組）
  it("既知の誤割当が再発していない（事務所則）", () => {
    const j = OFFICIAL_CAPTIONS_JIMUSHO_KISOKU;
    // 旧コーパス: 1条を「定義」(正は適用)、2条を「事務所の清潔」(正は気積)、3条を「気積」(正は換気)、
    // 4条を「換気」(正は温度)、5条を「燃焼器具の管理」(正は空気調和設備等による調整)、
    // 5条の2を「空気調和設備等の管理」(5条の2は不存在。空気調和は5条)、7条を「照度」(正は作業環境測定等)、
    // 10条を「便所」(正は照度等)、11条を「便所の清潔保持」(正は騒音及び振動の防止)、
    // 17条を「救急用具(常時50人以上)」(正は便所。救急用具は23条で人数要件なし)、
    // 18条を「飲料水等」(正は洗面設備等。給水は13条)、19条を「洗面設備」(正は休憩の設備)と誤割当していた。
    expect(j["第1条"]).toBe("適用");
    expect(j["第2条"]).toBe("気積");
    expect(j["第3条"]).toBe("換気");
    expect(j["第4条"]).toBe("温度");
    expect(j["第5条"]).toBe("空気調和設備等による調整");
    expect(j["第5条の2"]).toBeUndefined(); // 第5条の2は存在しない
    expect(j["第6条"]).toBe("燃焼器具");
    expect(j["第7条"]).toBe("作業環境測定等");
    expect(j["第10条"]).toBe("照度等");
    expect(j["第13条"]).toBe("給水");
    expect(j["第17条"]).toBe("便所");
    expect(j["第17条の2"]).toBe("独立個室型の便所の特例");
    expect(j["第18条"]).toBe("洗面設備等");
    expect(j["第19条"]).toBe("休憩の設備");
    expect(j["第21条"]).toBe("休養室等");
    expect(j["第23条"]).toBe("立業のためのいす*"); // 救急用具(見出し無し条)。常時50人以上の人数要件は無い
    // 本則は第23条で終わる。第24条以降は存在しない
    expect(j["第24条"]).toBeUndefined();
  });

  // 第4弾(じん肺則)是正の再発防止（旧コーパスで誤っていた組）
  it("既知の誤割当が再発していない（じん肺則）", () => {
    const j = OFFICIAL_CAPTIONS_JINPAI_KISOKU;
    // 旧コーパス: 1条を「趣旨」(正は合併症。趣旨条は無い)、3条を「じん肺健康診断の実施方法」(3条は削除)、
    // 4条を「胸部エックス線写真の像」(正は胸部に関する臨床検査)、10条を「管理区分の決定の申請」(正はじん肺健康診断の一部省略)、
    // 15条を「都道府県労働局長による決定」(正は都道府県労働局長等の命ずる検査の範囲)、
    // 23条を「記録の保存期間(7年)」(正は審査請求書の記載事項。7年保存はじん肺法17条で施行規則には期間規定なし)、
    // 38条を「通知」(正は電子情報処理組織による申請書の提出等。結果通知は22条の2)と誤割当していた。
    expect(j["第1条"]).toBe("合併症");
    expect(j["第2条"]).toBe("粉じん作業");
    expect(j["第4条"]).toBe("胸部に関する臨床検査");
    expect(j["第10条"]).toBe("じん肺健康診断の一部省略");
    expect(j["第15条"]).toBe("都道府県労働局長等の命ずる検査の範囲");
    expect(j["第16条"]).toBe("じん肺管理区分の決定の通知");
    expect(j["第22条"]).toBe("記録の作成及び保存等");
    expect(j["第22条の2"]).toBe("じん肺健康診断の結果の通知");
    expect(j["第23条"]).toBe("審査請求書の記載事項");
    expect(j["第26条"]).toBe("転換の勧奨");
    expect(j["第38条"]).toBe("電子情報処理組織による申請書の提出等");
    // 3条・30〜32条は削除条文（コーパスに存在してはならない）
    expect(j["第3条"]).toBe("削除");
    expect(j["第30条"]).toBe("削除");
    expect(j["第32条"]).toBe("削除");
    // 本則は第38条で終わる。旧コーパスの第40条「労働者の申請」・第42条「事業者の責務」は不存在
    expect(j["第40条"]).toBeUndefined();
    expect(j["第42条"]).toBeUndefined();
  });

  // 第4弾(石綿則)是正の再発防止（旧コーパスで誤っていた組）
  it("既知の誤割当が再発していない（石綿則）", () => {
    const s = OFFICIAL_CAPTIONS_SEKIMEN_KISOKU;
    // 旧コーパス: 1条を「目的」(正は事業者の責務。目的条は不存在)、
    // 6条を「建築物等の解体等の作業に係る措置」(正は吹き付けられた石綿等及び石綿含有保温材等の除去等に係る措置)、
    // 10条を「石綿作業主任者の選任」(正は第19条。10条は見出し無し条＝第9条「建築物の解体等の作業等の条件」の継続)、
    // 14条を「呼吸用保護具の使用」(正は第44条「呼吸用保護具」。14条は見出し無し条＝第13条の継続)、
    // 36条を「特別教育」(正は第27条。36条は測定及びその記録)、40条を「健康診断」(正は健康診断の実施)と誤割当していた。
    expect(s["第1条"]).toBe("事業者の責務");
    expect(s["第2条"]).toBe("定義");
    expect(s["第6条"]).toBe("吹き付けられた石綿等及び石綿含有保温材等の除去等に係る措置");
    expect(s["第19条"]).toBe("石綿作業主任者の選任");
    expect(s["第20条"]).toBe("石綿作業主任者の職務");
    expect(s["第27条"]).toBe("特別の教育");
    expect(s["第35条"]).toBe("作業の記録");
    expect(s["第36条"]).toBe("測定及びその記録");
    expect(s["第40条"]).toBe("健康診断の実施");
    expect(s["第41条"]).toBe("健康診断の結果の記録");
    expect(s["第44条"]).toBe("呼吸用保護具");
    // 旧コーパスの「目的」見出しは石綿則に存在しない（第1条は事業者の責務）
    const captions = Object.values(s);
    expect(captions.includes("目的")).toBe(false);
    // 本則は第50条で終わる。第51条以降は存在しない（旧コーパスは附則条と混同しうる）
    expect(s["第51条"]).toBeUndefined();
    // 第10条・第14条・第36条に旧コーパスの誤見出しが再発していないこと
    expect(s["第10条"]).not.toBe("石綿作業主任者の選任");
    expect(s["第14条"]).not.toBe("呼吸用保護具の使用");
    expect(s["第36条"]).not.toBe("特別の教育");
  });

  // 第4弾(四アルキル鉛則)是正の再発防止（旧コーパスは第14・15条以外ほぼ全エントリが別条の見出しに誤割当だった）
  it("既知の誤割当が再発していない（四アルキル鉛則）", () => {
    const s = OFFICIAL_CAPTIONS_SHI_ALKYL_KISOKU;
    // 旧コーパス: 2条を「四アルキル鉛等業務(定義)」(正は四アルキル鉛の製造に係る措置。業務の定義は1条「定義等」)、
    // 3条を「設備等(密閉・局排)」(3条は削除条文)、6条を「局所排気装置の性能」(正はタンク内業務に係る措置)、
    // 8条を「保護具」(正は残さい物の取扱いに係る措置。保護具等の管理は16条)、
    // 10条を「四アルキル鉛等が付着した物の処理」(正は研究に係る措置。汚染除去は11条)、
    // 19条を「健康診断」(正は立入禁止。健診は22条)、20条を「健康診断の結果の記録」(正は事故の場合の退避等。健診の結果は23条)、
    // 21条を「就業禁止」(正は特別の教育。就業禁止は26条)、22条を「緊急措置」(正は健康診断。退避は20条)と誤割当していた。
    // また14条の作業主任者選任の根拠を「令第6条第17号」としていた(正は第20号)。
    expect(s["第1条"]).toBe("定義等");
    expect(s["第2条"]).toBe("四アルキル鉛の製造に係る措置");
    expect(s["第4条"]).toBe("四アルキル鉛の混入に係る措置");
    expect(s["第6条"]).toBe("タンク内業務に係る措置");
    expect(s["第11条"]).toBe("汚染除去に係る措置");
    expect(s["第14条"]).toBe("四アルキル鉛等作業主任者の選任");
    expect(s["第15条"]).toBe("四アルキル鉛等作業主任者の職務");
    expect(s["第16条"]).toBe("保護具等の管理");
    expect(s["第18条"]).toBe("洗身");
    expect(s["第19条"]).toBe("立入禁止");
    expect(s["第20条"]).toBe("事故の場合の退避等");
    expect(s["第21条"]).toBe("特別の教育");
    expect(s["第22条"]).toBe("健康診断");
    expect(s["第23条"]).toBe("健康診断の結果");
    expect(s["第24条"]).toBe("健康診断結果報告");
    expect(s["第26条"]).toBe("四アルキル鉛中毒にかかつている労働者等の就業禁止");
    // 3条は削除条文（コーパスに存在してはならない）
    expect(s["第3条"]).toBe("削除");
    // 本則は第27条で終わる。旧コーパスの第6条「局所排気装置の性能」・第8条「保護具」は誤割当
    expect(s["第28条"]).toBeUndefined();
    expect(s["第6条"]).not.toBe("局所排気装置の性能");
    expect(s["第8条"]).not.toBe("保護具");
  });

  // 第5弾(機械等検定規則)是正の再発防止（旧コーパスはほぼ全エントリが誤割当＋本則終端を超える不存在条を捏造していた）
  it("既知の誤割当が再発していない（機械等検定規則）", () => {
    const k = OFFICIAL_CAPTIONS_KIKAI_KENTEI_KISOKU;
    // 旧コーパス: 1条を「趣旨」(正は個別検定の申請等。趣旨条は不存在)、2条を「個別検定の対象」
    // (正は個別検定の場所。対象は安衛法施行令第14条で本規則に対象条は無い)、3条を「個別検定の申請」
    // (正は個別検定の基準。申請は第1条)、6条を「個別検定の方法」(正は新規検定の申請等)、
    // 8条を「個別検定合格証明書」(正は型式検定の基準)、14条を「型式検定の対象」
    // (正は型式検定合格標章。対象は施行令第14条の2)、15条を「型式検定の申請」(正は失効の通知及び公示。
    // 新規検定の申請は第6条)と誤割当し、さらに本則(第17条で終端)に存在しない
    // 第19条「型式検定の方法」・第21条「型式検定合格証」・第23条「型式検定合格証の更新」・
    // 第27条「検定合格の表示」・第28条「検定合格機械等の使用義務」を捏造していた。
    expect(k["第1条"]).toBe("個別検定の申請等");
    expect(k["第2条"]).toBe("個別検定の場所");
    expect(k["第3条"]).toBe("個別検定の基準");
    expect(k["第6条"]).toBe("新規検定の申請等");
    expect(k["第8条"]).toBe("型式検定の基準");
    expect(k["第9条"]).toBe("型式検定合格証");
    expect(k["第10条"]).toBe("型式検定合格証の有効期間");
    expect(k["第11条"]).toBe("型式検定合格証の有効期間の更新");
    expect(k["第14条"]).toBe("型式検定合格標章");
    expect(k["第15条"]).toBe("型式検定合格証の失効の通知及び公示");
    expect(k["第17条"]).toBe("経費");
    // 本則は第17条で終わる。旧コーパスの第19/21/23/27/28条は不存在の捏造
    expect(k["第18条"]).toBeUndefined();
    expect(k["第19条"]).toBeUndefined();
    expect(k["第21条"]).toBeUndefined();
    expect(k["第23条"]).toBeUndefined();
    expect(k["第27条"]).toBeUndefined();
    expect(k["第28条"]).toBeUndefined();
    // 「個別検定の対象」「型式検定の対象」「趣旨」は本規則の見出しに存在しない（対象は安衛法施行令側）
    const captions = Object.values(k);
    expect(captions.includes("個別検定の対象")).toBe(false);
    expect(captions.includes("型式検定の対象")).toBe(false);
    expect(captions.includes("趣旨")).toBe(false);
  });

  // O12（安衛令）チャットボット構造欠落解消の固定（e-Gov 347CO0000000318 本則突合）
  it("安衛令の主要条が公式見出しと一致し委員会設置基準の根拠条が固定されている", () => {
    const r = OFFICIAL_CAPTIONS_ANZEN_EISEI_REI;
    // 作業主任者を選任すべき作業は第6条（法第14条）。第2〜5条の選任事業場条と混同しない
    expect(r["第6条"]).toBe("作業主任者を選任すべき作業");
    // 安全委員会=第8条（業種・規模で50人/100人）、衛生委員会=第9条（全業種50人以上）
    expect(r["第8条"]).toBe("安全委員会を設けるべき事業場");
    expect(r["第9条"]).toBe("衛生委員会を設けるべき事業場");
    // 既存エントリの根拠条: 職長教育=第19条、就業制限=第20条
    expect(r["第19条"]).toBe("職長等の教育を行うべき業種");
    expect(r["第20条"]).toBe("就業制限に係る業務");
    // 本則は第27条で終わる（附則の第1条等と重複させない）
    expect(r["第28条"]).toBeUndefined();
    // 衛生委員会の根拠テキストに「常時50人以上」が含まれること（チャットボットの人数根拠）
    const eiseiIinkai = rodoAnzenEiseiHoSikokiregu.find((a) => a.articleNum === "第9条");
    expect(eiseiIinkai?.text.includes("常時50人以上")).toBe(true);
  });

  // O12（3/n）労基法 第20条(解雇の予告)チャットボット構造欠落解消の固定（e-Gov 322AC0000000049 突合）
  it("労基法 第20条(解雇の予告)がコーパスに存在し公式見出し・要件が固定されている", () => {
    const r = OFFICIAL_CAPTIONS_RODO_KIJUN_HO;
    // 第20条=解雇の予告（第19条=解雇制限とは別条。混同しない）
    expect(r["第20条"]).toBe("解雇の予告");
    const kaikoYokoku = rodoKijunHo.find((a) => a.articleNum === "第20条");
    expect(kaikoYokoku).toBeDefined();
    // 予告の基本要件: 「少くとも三十日前」の予告 or「三十日分以上の平均賃金」（解雇予告手当）
    expect(kaikoYokoku?.text.includes("少くとも三十日前")).toBe(true);
    expect(kaikoYokoku?.text.includes("三十日分以上の平均賃金")).toBe(true);
    // 例外は「天災事変その他やむを得ない事由」で事業継続不能 or「労働者の責に帰すべき事由」の場合のみ
    expect(kaikoYokoku?.text.includes("天災事変")).toBe(true);
    expect(kaikoYokoku?.text.includes("労働者の責に帰すべき事由")).toBe(true);
  });

  // 柱1第5弾 毒劇法（e-Gov 325AC0000000303 rev 20250601_504AC0000000068）是正の再発防止
  it("既知の誤割当が再発していない（毒劇法）", () => {
    const d = OFFICIAL_CAPTIONS_DOKUGEKI_HO;
    // 旧コーパス: 第8条を「取扱責任者の資格」、第13条を「農業用品目の販売」、第15条を「交付の制限」と略記/誤記していた
    expect(d["第8条"]).toBe("毒物劇物取扱責任者の資格");
    expect(d["第13条"]).toBe("特定の用途に供される毒物又は劇物の販売等");
    expect(d["第15条"]).toBe("毒物又は劇物の交付の制限等");
    // 事故の際の措置は現行法で第17条。旧コーパスの「第16条の2」は現行法に存在しない
    expect(d["第17条"]).toBe("事故の際の措置");
    expect(d["第16条の2"]).toBeUndefined();
    expect(dokugekiHo.find((a) => a.articleNum === "第16条の2")).toBeUndefined();
    const jiko = dokugekiHo.find((a) => a.articleNum === "第17条");
    expect(jiko?.articleTitle).toBe("事故の際の措置");
    // 第15条の2(廃棄)の本文は現行法に存在しない「第10条の2」を参照してはならない（誤参照の再発防止）
    const haiki = dokugekiHo.find((a) => a.articleNum === "第15条の2");
    expect(haiki?.text.includes("第10条の2")).toBe(false);
    // 第24条(罰則)は現行の「拘禁刑」表記（旧「懲役」は令和4年改正・2025-06施行で一本化）
    const batsu = dokugekiHo.find((a) => a.articleNum === "第24条");
    expect(batsu?.text.includes("拘禁刑")).toBe(true);
  });

  // 柱1第5弾 職安法（e-Gov 322AC0000000141 rev 20260401_506AC0000000050）是正の再発防止
  it("既知の誤割当が再発していない（職安法）", () => {
    const s = OFFICIAL_CAPTIONS_SHOKUGYO_ANTEI_HO;
    // 第34条の3は現行法に不存在（本則は第34条=準用の後に第34条の2/3は無い）
    expect(s["第34条の3"]).toBeUndefined();
    expect(shokugyoAnteiHo.find((a) => a.articleNum === "第34条の3")).toBeUndefined();
    // 「労働条件等の明示」は第5条の3（旧コーパスの第34条の3ではない）
    expect(s["第5条の3"]).toBe("労働条件等の明示");
    const meiji = shokugyoAnteiHo.find((a) => a.articleNum === "第5条の3");
    expect(meiji?.articleTitle).toBe("労働条件等の明示");
    // 学校等の無料職業紹介は第33条の2=届出制（第33条=無料職業紹介事業は厚生労働大臣の許可制で別条）
    expect(s["第33条"]).toBe("無料職業紹介事業");
    expect(s["第33条の2"]).toBe("学校等の行う無料職業紹介事業");
    const gakko = shokugyoAnteiHo.find((a) => a.articleNum === "第33条の2");
    expect(gakko?.text.includes("届け出て")).toBe(true);
    // 第1条本文は現行の相手方法令「労働施策の総合的な推進…に関する法律」を引く（旧「雇用対策法」は改称済み）
    const mokuteki = shokugyoAnteiHo.find((a) => a.articleNum === "第1条");
    expect(mokuteki?.text.includes("労働施策の総合的な推進")).toBe(true);
    expect(mokuteki?.text.includes("雇用対策法")).toBe(false);
  });

  // 柱1 過労死防止法（e-Gov 426AC1000000100 rev 20141101・本則無改正）是正の再発防止
  it("既知の誤割当が再発していない（過労死防止法）", () => {
    const k = OFFICIAL_CAPTIONS_KAROSHI_BOSHI_HO;
    // 責務は第4条「国の責務等」1条に統合（旧コーパスは国4/地方公共団体5/事業主6の3条に誤分割）
    expect(k["第4条"]).toBe("国の責務等");
    expect(k["第5条"]).toBe("過労死等防止啓発月間"); // 旧コーパスは「地方公共団体の責務」
    expect(k["第6条"]).toBe("年次報告"); // 旧コーパスは「事業主の責務」（第6条=年次報告を欠落）
    // 大綱・調査研究等・啓発・相談体制・民間団体支援・協議会が1条ずつズレていた
    expect(k["第7条"]).toBe("過労死等の防止のための対策に関する大綱*"); // 旧「啓発月間」
    expect(k["第8条"]).toBe("調査研究等"); // 旧「大綱」
    expect(k["第9条"]).toBe("啓発"); // 旧「調査研究等」
    expect(k["第10条"]).toBe("相談体制の整備等"); // 旧「啓発」
    expect(k["第11条"]).toBe("民間団体の活動に対する支援"); // 旧「相談体制の整備」
    // 第14条(法制上の措置等)は本則末尾。旧コーパスは欠落し、その内容を第4条「国の責務」に誤帰属していた
    expect(k["第14条"]).toBe("法制上の措置等*");
    expect(k["第15条"]).toBeUndefined(); // 本則は第14条で終了
    // コーパス側: 責務は第4条に統合され地方公共団体・事業主・国民を含む
    const sekimu = karoshiBoshiHo.find((a) => a.articleNum === "第4条");
    expect(sekimu?.articleTitle).toBe("国の責務等");
    expect(sekimu?.text.includes("地方公共団体")).toBe(true);
    expect(sekimu?.text.includes("事業主")).toBe(true);
    // 第4条本文に「法制上・財政上の措置」（第14条の内容）を誤帰属していない
    expect(sekimu?.text.includes("法制上")).toBe(false);
    // 啓発月間の「11月」は第5条（旧コーパスは第7条）
    const gekkan = karoshiBoshiHo.find((a) => a.articleNum === "第5条");
    expect(gekkan?.articleTitle).toBe("過労死等防止啓発月間");
    expect(gekkan?.text.includes("11月")).toBe(true);
    // 第6条(年次報告=過労死等防止対策白書)がコーパスに存在する
    const nenji = karoshiBoshiHo.find((a) => a.articleNum === "第6条");
    expect(nenji?.articleTitle).toBe("年次報告");
    expect(nenji?.text.includes("国会")).toBe(true);
  });

  // 柱1第5弾 高圧ガス保安法（e-Gov 326AC0000000204・取得2026-07-03）是正の再発防止
  it("既知の誤割当が再発していない（高圧ガス保安法）", () => {
    const k = OFFICIAL_CAPTIONS_KOATSU_GAS_HOAN_HO;
    // 完成検査は第20条。旧コーパスは第14条(=製造施設等の変更)に誤割当していた
    expect(k["第20条"]).toBe("完成検査");
    expect(k["第14条"]).toBe("製造のための施設等の変更");
    expect(koatsuGasHoanHo.find((a) => a.articleNum === "第14条")).toBeUndefined();
    const kansei = koatsuGasHoanHo.find((a) => a.articleNum === "第20条");
    expect(kansei?.articleTitle).toBe("完成検査");
    // 移動は第23条。旧コーパスは第22条(=輸入検査)に誤割当していた
    expect(k["第23条"]).toBe("移動");
    expect(k["第22条"]).toBe("輸入検査");
    expect(koatsuGasHoanHo.find((a) => a.articleNum === "第22条")).toBeUndefined();
    const idou = koatsuGasHoanHo.find((a) => a.articleNum === "第23条");
    expect(idou?.articleTitle).toBe("移動");
    // 貯蔵所は第16条（第15条=貯蔵とは別条）
    expect(k["第16条"]).toBe("貯蔵所");
    expect(k["第15条"]).toBe("貯蔵");
    // 第27条の3は保安主任者及び保安企画推進員。保安技術管理者・保安係員は第27条の2の職掌
    expect(k["第27条の3"]).toBe("保安主任者及び保安企画推進員");
    expect(k["第27条の2"]).toBe("保安統括者、保安技術管理者及び保安係員");
    const hoan3 = koatsuGasHoanHo.find((a) => a.articleNum === "第27条の3");
    expect(hoan3?.articleTitle).toBe("保安主任者及び保安企画推進員");
  });

  // 柱1 健康増進法（e-Gov 414AC0000000103 rev 20251212_507AC0000000087）是正の再発防止。
  // 旧コーパスは2018改正（平成30年法律第78号）で再構成された受動喫煙章の条番号を未反映で系統的にズレていた。
  it("既知の誤割当が再発していない（健康増進法）", () => {
    const k = OFFICIAL_CAPTIONS_KENKO_ZOSHIN_HO;
    // 関係者の協力は第5条（第6条は「定義（健康増進事業実施者）」）。旧コーパスは第6条に誤割当していた
    expect(k["第5条"]).toBe("関係者の協力");
    expect(k["第6条"]).toBe("定義");
    expect(kenkoZoshinHo.find((a) => a.articleNum === "第6条")).toBeUndefined();
    // 喫煙禁止場所での喫煙禁止は第29条。旧コーパスは第27条（=喫煙をする際の配慮義務等）に誤割当していた
    expect(k["第27条"]).toBe("喫煙をする際の配慮義務等");
    expect(k["第29条"]).toBe("特定施設等における喫煙の禁止等");
    const kinshi = kenkoZoshinHo.find((a) => a.articleNum === "第29条");
    expect(kinshi?.articleTitle).toBe("特定施設等における喫煙の禁止等");
    expect(kinshi?.text).toContain("喫煙してはならない");
    // 管理権原者等の責務は第30条（第34条＝喫煙専用室設置施設等への勧告命令等）。旧コーパスは第34条に誤割当
    expect(k["第30条"]).toBe("特定施設等の管理権原者等の責務");
    expect(k["第34条"]).toBe("喫煙専用室設置施設等の管理権原者に対する勧告、命令等");
    // 喫煙専用室は第33条（第35条＝喫煙目的室）。旧コーパスは第35条を「喫煙専用室の基準」と誤割当していた
    expect(k["第33条"]).toBe("喫煙専用室");
    expect(k["第35条"]).toBe("喫煙目的室");
    // 喫煙専用室の気流0.2m毎秒の技術的基準は厚生労働省令（施行規則）であり法本体ではない
    const senyou = kenkoZoshinHo.find((a) => a.articleNum === "第33条");
    expect(senyou?.text).toContain("厚生労働省令");
    // 立入検査は第38条（第40条＝適用除外）。旧コーパスは第40条を「報告徴収及び立入検査」と誤割当していた
    expect(k["第38条"]).toBe("立入検査等");
    expect(k["第40条"]).toBe("適用除外");
    expect(kenkoZoshinHo.find((a) => a.articleNum === "第40条")).toBeUndefined();
    // 喫煙禁止場所での喫煙は都道府県知事の中止命令の対象（第29条2項）で、その命令違反が第77条の30万円以下
    // の過料。第76条は勧告後の命令・標識違反に対する50万円以下の過料。旧コーパスは両者を混同していた
    const kar77 = kenkoZoshinHo.find((a) => a.articleNum === "第77条");
    expect(kar77?.text).toContain("30万円");
    expect(kar77?.text).toContain("中止");
    const kar76 = kenkoZoshinHo.find((a) => a.articleNum === "第76条");
    expect(kar76?.text).toContain("50万円");
  });

  // 柱1第5弾 化審法（e-Gov 348AC0000000117 rev 20260701_508AC0000000022・取得2026-07-03）是正の再発防止
  it("既知の誤割当が再発していない（化審法）", () => {
    const k = OFFICIAL_CAPTIONS_KASHIN_HO;
    // 第24条は「製品の輸入の制限」。旧コーパスは「優先評価化学物質の指定」に誤割当していた
    expect(k["第24条"]).toBe("製品の輸入の制限");
    expect(kashinHo.find((a) => a.articleNum === "第24条")).toBeUndefined();
    // 第26条は「使用の届出」。旧コーパスは「有害性調査の指示」に誤割当していた
    expect(k["第26条"]).toBe("使用の届出");
    expect(kashinHo.find((a) => a.articleNum === "第26条")).toBeUndefined();
    // 第38条は「勧告」・第39条は「指導及び助言」・第41条は「有害性情報の報告等」
    // （旧コーパスは各々「取扱基準」「表示」「報告徴収・立入検査」に誤割当していた）
    expect(k["第38条"]).toBe("勧告");
    expect(k["第39条"]).toBe("指導及び助言");
    expect(k["第41条"]).toBe("有害性情報の報告等");
    expect(kashinHo.find((a) => a.articleNum === "第38条")).toBeUndefined();
    expect(kashinHo.find((a) => a.articleNum === "第39条")).toBeUndefined();
    expect(kashinHo.find((a) => a.articleNum === "第41条")).toBeUndefined();
    // 優先評価化学物質は第9条(製造数量等の届出)・第10条(有害性等の調査)へ振替
    expect(k["第9条"]).toBe("製造数量等の届出");
    expect(k["第10条"]).toBe("優先評価化学物質に係る有害性等の調査");
    const yusen = kashinHo.find((a) => a.articleNum === "第10条");
    expect(yusen?.text.includes("優先評価化学物質")).toBe(true);
    // 第二種の技術指針は第36条・表示は第37条／立入検査は第44条(報告の徴収は第43条)
    expect(k["第36条"]).toBe("技術上の指針の公表等");
    expect(k["第37条"]).toBe("表示等");
    expect(k["第44条"]).toBe("立入検査等");
    // 第13条=製造数量等の届出（監視化学物質）／第17条=製造の許可（第一種特定化学物質）
    expect(k["第13条"]).toBe("製造数量等の届出");
    expect(k["第17条"]).toBe("製造の許可");
    const seizo = kashinHo.find((a) => a.articleNum === "第17条");
    expect(seizo?.articleTitle).toBe("製造の許可");
    // 罰則(第57条)の「懲役」は刑法改正で「拘禁刑」へ現行化（旧コーパスは「懲役」表記）
    const batsu = kashinHo.find((a) => a.articleNum === "第57条");
    expect(batsu?.text.includes("拘禁刑")).toBe(true);
    expect(batsu?.text.includes("懲役")).toBe(false);
  });

  // 柱1 食品衛生法（e-Gov 322AC0000000233 rev 20250601・2018改正=法律46号による大規模改番）是正の再発防止
  it("既知の誤割当が再発していない（食品衛生法）", () => {
    const s = OFFICIAL_CAPTIONS_SHOKUHIN_EISEI_HO;
    // 規格基準は第13条。旧コーパスは第11条(現行=特に重要な工程の管理を要する食品)に誤割当していた
    expect(s["第13条"]).toBe("食品・添加物の規格及び基準（ポジティブリスト制度）");
    expect(s["第11条"]).toBe("特に重要な工程の管理を要する食品又は添加物");
    // 営業許可は第55条(旧第52条=器具容器包装製造営業の衛生管理)、営業届出は第57条(旧第55条)
    expect(s["第55条"]).toBe("営業の許可");
    expect(s["第52条"]).toBe("器具・容器包装製造営業の衛生管理");
    expect(s["第57条"]).toBe("営業の届出");
    // 食中毒届出は第63条(旧第58条=現行は自主回収届出)、食品衛生監視員は第30条(旧第63条)
    expect(s["第63条"]).toBe("食中毒の届出");
    expect(s["第58条"]).toBe("自主回収の届出（リコール）");
    expect(s["第30条"]).toBe("食品衛生監視員");
    // 食品の表示基準は食品表示法へ移管。現行第19条は器具容器包装の表示、第20条は虚偽誇大表示広告の禁止
    expect(s["第19条"]).toBe("器具又は容器包装に関する表示の基準");
    expect(s["第20条"]).toBe("虚偽又は誇大な表示・広告の禁止");
    // 第74条・第75条は削除条（旧コーパスは参照していない＝現状維持を固定）
    expect(s["第74条"]).toBe("削除");
    expect(s["第75条"]).toBe("削除");
    expect(shokuhinEiseiHo.find((a) => a.articleNum === "第74条")).toBeUndefined();
    expect(shokuhinEiseiHo.find((a) => a.articleNum === "第75条")).toBeUndefined();
    // コーパス側: 旧番号(第52条営業許可・第58条食中毒・第11条規格基準)がコーパスに残っていない
    expect(shokuhinEiseiHo.find((a) => a.articleNum === "第52条")).toBeUndefined();
    expect(shokuhinEiseiHo.find((a) => a.articleNum === "第11条")).toBeUndefined();
    // 営業許可(第55条)は都道府県知事の許可、食中毒届出(第63条)は医師→保健所長
    const kyoka = shokuhinEiseiHo.find((a) => a.articleNum === "第55条");
    expect(kyoka?.articleTitle).toBe("営業の許可");
    expect(kyoka?.text.includes("都道府県知事の許可")).toBe(true);
    const chudoku = shokuhinEiseiHo.find((a) => a.articleNum === "第63条");
    expect(chudoku?.text.includes("医師")).toBe(true);
    expect(chudoku?.text.includes("保健所長")).toBe(true);
    // 規格基準(第13条)本文に残留農薬ポジティブリストを含む
    const kikaku = shokuhinEiseiHo.find((a) => a.articleNum === "第13条");
    expect(kikaku?.text.includes("ポジティブリスト")).toBe(true);
    // 罰則(第81条)は現行の「拘禁刑」表記（2022改正・2025-06施行で懲役から一本化）
    const batsu = shokuhinEiseiHo.find((a) => a.articleNum === "第81条");
    expect(batsu?.text.includes("拘禁刑")).toBe(true);
    expect(batsu?.text.includes("懲役")).toBe(false);
  });

  // 柱1 騒音規制法（e-Gov 343AC0000000098 rev 20260701_508AC0000000022・取得2026-07-03）是正の再発防止
  it("既知の誤割当が再発していない（騒音規制法）", () => {
    const s = OFFICIAL_CAPTIONS_SOON_KISEI_HO;
    // 計画変更は第9条「計画変更勧告」（勧告であり命令ではない）。旧コーパスは第8条「計画変更命令」に誤割当
    expect(s["第9条"]).toBe("計画変更勧告");
    expect(s["第8条"]).toBe("特定施設の数等の変更の届出");
    expect(soonKiseiHo.find((a) => a.articleNum === "第8条")).toBeUndefined();
    const keikaku = soonKiseiHo.find((a) => a.articleNum === "第9条");
    expect(keikaku?.text.includes("勧告")).toBe(true);
    expect(keikaku?.text.includes("命令でなく") || keikaku?.text.includes("命令ではなく")).toBe(true);
    // 許容限度は第16条。旧コーパスは第17条（=測定に基づく要請及び意見）に誤割当していた
    expect(s["第16条"]).toBe("許容限度");
    expect(s["第17条"]).toBe("測定に基づく要請及び意見");
    expect(soonKiseiHo.find((a) => a.articleNum === "第17条")).toBeUndefined();
    const kyoyo = soonKiseiHo.find((a) => a.articleNum === "第16条");
    expect(kyoyo?.text.includes("自動車騒音")).toBe(true);
    // 規制権限は地方分権で市町村長へ移管済（届出受理=第6条・改善勧告命令=第12/15条）。旧コーパスは都道府県知事のまま
    const setti = soonKiseiHo.find((a) => a.articleNum === "第6条");
    expect(setti?.text.includes("市町村長")).toBe(true);
    expect(setti?.text.includes("都道府県知事")).toBe(false);
    const kaizen = soonKiseiHo.find((a) => a.articleNum === "第12条");
    expect(kaizen?.text.includes("市町村長")).toBe(true);
    const kensetsu = soonKiseiHo.find((a) => a.articleNum === "第14条");
    expect(kensetsu?.text.includes("市町村長")).toBe(true);
    expect(kensetsu?.text.includes("7日前")).toBe(true);
    // 地域指定・規制基準設定のみ都道府県知事（第3・4条）
    expect(s["第3条"]).toBe("地域の指定");
    expect(s["第4条"]).toBe("規制基準の設定");
    const chiiki = soonKiseiHo.find((a) => a.articleNum === "第3条");
    expect(chiiki?.text.includes("都道府県知事")).toBe(true);
    // 罰則(第29条)の懲役→拘禁刑（2025-06施行）。旧記載の「3月以下の懲役」は現行法に存在せず除去
    const batsu2 = soonKiseiHo.find((a) => a.articleNum === "第29条");
    expect(batsu2?.text.includes("拘禁刑")).toBe(true);
    expect(batsu2?.text.includes("懲役")).toBe(false);
  });

  // 柱1 酸欠則（e-Gov 347M50002000042 rev 20260401_508M60000100003・取得2026-07-03）インライン未検証法の昇格。
  // 是正（振替）は無く、コーパス収録16条は全て公式見出しと完全一致。昇格の忠実性と主要事実を固定する。
  it("e-Gov 昇格が忠実である（酸欠則）", () => {
    const s = OFFICIAL_CAPTIONS_SANKKETSU_KISOKU;
    // 本則全33条・削除条/見出し無し条は無く、末尾は第29条(事故等の報告)で終端
    expect(Object.keys(s).length).toBe(33);
    expect(Object.values(s).some((c) => c === "削除" || c.endsWith("*"))).toBe(false);
    expect(s["第29条"]).toBe("事故等の報告");
    expect(s["第30条"]).toBeUndefined();
    // 主要条: 作業主任者=第11条(技能講習)／特別の教育=第12条／換気=第5条／要求性能墜落制止用器具等=第6条
    expect(s["第11条"]).toBe("作業主任者");
    expect(s["第12条"]).toBe("特別の教育");
    expect(s["第5条"]).toBe("換気");
    expect(s["第6条"]).toBe("要求性能墜落制止用器具等");
    // 酸欠則の作業主任者は技能講習修了者からの選任（免許ではない）
    const shunin = sankketsuKisoku.find((a) => a.articleNum === "第11条");
    expect(shunin?.text.includes("技能講習")).toBe(true);
    // 定義(第2条): 酸素欠乏=18%未満、酸素欠乏等=硫化水素100万分の10超、第2種=令別表第6第3号の3/第9号/第12号
    const teigi = sankketsuKisoku.find((a) => a.articleNum === "第2条");
    expect(teigi?.text.includes("18パーセント未満")).toBe(true);
    expect(teigi?.text.includes("100万分の10")).toBe(true);
    expect(teigi?.text.includes("別表第6第3号の3")).toBe(true);
    // 換気(第5条)は18%以上に保つ。作業環境測定(第3条)の記録は3年間保存
    const kanki = sankketsuKisoku.find((a) => a.articleNum === "第5条");
    expect(kanki?.text.includes("18パーセント以上")).toBe(true);
    const sokutei = sankketsuKisoku.find((a) => a.articleNum === "第3条");
    expect(sokutei?.text.includes("3年間保存")).toBe(true);
  });

  // 柱1（有機則 2026-07-03）e-Gov 347M50002000036 本則全56条を正本化。
  // 旧インラインマップは第30条を「健康診断の結果の記録」（正=公式見出し「健康診断の結果」）とし、
  // 無見出し条（第3条・第13条の2/3・第18条の3・第28条の3の2/3の3・第28条の4・第37条）に "*" を欠いていた。
  it("既知の誤割当が再発していない（有機則）", () => {
    const y = OFFICIAL_CAPTIONS_YUKI_KISOKU;
    // 第30条の公式見出しは「健康診断の結果」。旧値「健康診断の結果の記録」は包含判定を通過し是正されずにいた
    expect(y["第30条"]).toBe("健康診断の結果");
    const kekka = yukiKisoku.find((a) => a.articleNum === "第30条");
    expect(kekka?.articleTitle).toBe("健康診断の結果");
    expect(kekka?.text.includes("個人票")).toBe(true);
    expect(kekka?.text.includes("5年間保存")).toBe(true);
    // 無見出し条は継承見出し＋"*" で表現し、見出し照合をスキップする
    expect(y["第3条"]).toBe("適用の除外*");
    expect(y["第13条の2"]).toBe("労働基準監督署長の許可に係る設備の特例*");
    expect(y["第18条の3"]).toBe("局所排気装置の稼働の特例*");
    expect(y["第28条の3の2"]).toBe("評価の結果に基づく措置*");
    expect(y["第37条"]).toBe("空容器の処理*");
    // 作業主任者・定期自主検査の代表条（旧インライン整合の維持）
    expect(y["第19条"]).toBe("有機溶剤作業主任者の選任");
    expect(y["第19条の2"]).toBe("有機溶剤作業主任者の職務");
    expect(y["第20条"]).toBe("局所排気装置の定期自主検査");
    // 本則は第37条で終端。第38条以降（附則）は本則見出しとして存在しない
    expect(y["第38条"]).toBeUndefined();
  });

  // 柱1（特化則 2026-07-03）e-Gov 347M50002000039 本則全94条を正本化。
  // 旧インラインマップは本則見出しを正しく持っていたが、17の無見出し条に "*" を欠いていた（内容誤りは無し）。
  it("既知の誤割当が再発していない（特化則）", () => {
    const t = OFFICIAL_CAPTIONS_TOKKA_KISOKU;
    // 代表条の公式見出し（作業主任者・測定・健診・作業記録・保護具）
    expect(t["第27条"]).toBe("特定化学物質作業主任者等の選任");
    expect(t["第28条"]).toBe("特定化学物質作業主任者の職務");
    expect(t["第30条"]).toBe("定期自主検査");
    expect(t["第36条"]).toBe("測定及びその記録");
    expect(t["第38条の4"]).toBe("作業の記録");
    expect(t["第39条"]).toBe("健康診断の実施");
    expect(t["第40条"]).toBe("健康診断の結果の記録");
    expect(t["第43条"]).toBe("呼吸用保護具");
    expect(t["第44条"]).toBe("保護衣等");
    // 無見出し条は継承見出し＋"*" で表現し、見出し照合をスキップする
    expect(t["第2条の3"]).toBe("適用の除外*");
    expect(t["第5条"]).toBe("第二類物質の製造等に係る設備*");
    expect(t["第31条"]).toBe("定期自主検査*"); // 特定化学設備の2年以内ごと検査（第30条の続き）
    expect(t["第34条"]).toBe("点検*");
    expect(t["第36条の3の2"]).toBe("評価の結果に基づく措置*");
    expect(t["第53条"]).toBe("製造許可の基準*");
    // 特化則作業主任者は「特定化学物質及び四アルキル鉛等作業主任者技能講習」修了者（第27条）
    const shunin = tokkaKisoku.find((a) => a.articleNum === "第27条");
    expect(shunin?.text.includes("特定化学物質及び四アルキル鉛等作業主任者技能講習")).toBe(true);
    expect(shunin?.text.includes("令第6条第18号")).toBe(true);
    // 特別管理物質の作業記録は30年保存（第38条の4）
    const kiroku = tokkaKisoku.find((a) => a.articleNum === "第38条の4");
    expect(kiroku?.text.includes("特別管理物質")).toBe(true);
    expect(kiroku?.text.includes("30年間保存")).toBe(true);
    // 第30条=局排等を1年以内ごと／第31条=特定化学設備を2年以内ごと（頻度の取り違え防止）
    const teiki30 = tokkaKisoku.find((a) => a.articleNum === "第30条");
    expect(teiki30?.text.includes("1年以内ごとに1回")).toBe(true);
    const teiki31 = tokkaKisoku.find((a) => a.articleNum === "第31条");
    expect(teiki31?.text.includes("2年以内ごとに1回")).toBe(true);
    // 本則は第53条で終端。第54条以降（附則）は本則見出しとして存在しない
    expect(t["第54条"]).toBeUndefined();
  });

  // 柱1（クレーン則・インライン未検証法の e-Gov 昇格 2026-07-03・最終）e-Gov 347M50002000034 本則全条を正本化。
  // 旧インラインは本則見出しは正しかったが、無見出し17条の "*" 欠落と、削除条範囲を "第235:239条" の不正キーで
  // 第234条見出しを複写する2欠陥があった。昇格の忠実性＝無見出し"*"・削除条・不正キー除去・主要見出しを固定する。
  it("e-Gov 昇格が忠実である（クレーン則）", () => {
    const c = OFFICIAL_CAPTIONS_CRANE_KISOKU;
    // 本則全条＝262見出し条＋17無見出し条(*)＋5削除条(第235〜239条)で284キー
    expect(Object.keys(c).length).toBe(284);
    // 代表条の公式見出し（旧インラインは内容正しく、ここで固定する）
    expect(c["第22条"]).toBe("就業制限");
    expect(c["第25条"]).toBe("運転の合図");
    expect(c["第34条"]).toBe("定期自主検査");
    expect(c["第74条"]).toBe("立入禁止");
    expect(c["第9条"]).toBe("クレーン検査証");
    // 無見出し条は継承見出し＋"*"（第19条は第18条 巻過ぎの防止の続き 等）
    expect(c["第19条"]).toBe("巻過ぎの防止*");
    expect(c["第18条"]).toBe("巻過ぎの防止");
    expect(c["第231条"]).toBe("条件付免許*");
    expect(c["第242条"]).toBe("移動式クレーン運転実技教習の科目*");
    // 第235〜239条は削除条（旧インラインは "第235:239条" の不正キーで第234条見出しを複写していた＝除去）
    expect(c["第235条"]).toBe("削除");
    expect(c["第239条"]).toBe("削除");
    expect(c["第235:239条"]).toBeUndefined();
    // 本則は第247条で終端。第248条以降（附則）は本則見出しとして存在しない
    expect(c["第248条"]).toBeUndefined();
    // つり上げ荷重5トン以上のクレーン運転は免許（第22条 就業制限）＝技能講習ではない
    const shunin = craneKisoku.find((a) => a.articleNum === "第22条");
    expect(shunin?.text.includes("5トン以上")).toBe(true);
    expect(shunin?.text.includes("クレーン・デリック運転士免許")).toBe(true);
  });

  // 柱1 港湾労働法（e-Gov 363AC0000000040 rev 20250601_504AC0000000068・取得2026-07-03）是正の再発防止。
  // 旧コーパスは条番号・見出しが系統的に誤っていた（責務/派遣事業/許可基準/港湾労働者証/雇用管理者が別条へ誤割当）。
  it("既知の誤割当が再発していない（港湾労働法）", () => {
    const k = OFFICIAL_CAPTIONS_KOWAN_RODO_HO;
    // 責務は第4条「関係者の責務」。旧コーパスは「港湾運送事業主の責務」と誤記していた
    expect(k["第4条"]).toBe("関係者の責務");
    const sekimu = kowanRodoHo.find((a) => a.articleNum === "第4条");
    expect(sekimu?.articleTitle).toBe("関係者の責務");
    // 第8条は「職業紹介」。旧コーパスは「港湾労働者派遣事業」に誤割当（派遣事業の許可は第12条）
    expect(k["第8条"]).toBe("職業紹介");
    const shokai = kowanRodoHo.find((a) => a.articleNum === "第8条");
    expect(shokai?.articleTitle).toBe("職業紹介");
    // 港湾労働者派遣事業の許可は第12条、許可の基準等は第14条。
    // 旧コーパスは第12条を「派遣事業の許可基準」・第14条を「派遣の役務提供期間(7日/7か月)」に誤割当していた
    expect(k["第12条"]).toBe("港湾労働者派遣事業の許可");
    expect(k["第14条"]).toBe("許可の基準等");
    const kyoka = kowanRodoHo.find((a) => a.articleNum === "第12条");
    expect(kyoka?.text.includes("事業所ごと")).toBe(true);
    // 7日/7か月の派遣役務提供期間は本則になく施行規則レベル＝コーパス本文に持ち込まない
    expect(kowanRodoHo.some((a) => a.text.includes("7日") || a.text.includes("7か月"))).toBe(false);
    // 港湾労働者証の交付は第9条第2項（旧コーパスは第41条＝聴聞の特例に誤割当）。第41条は聴聞の特例のまま
    expect(k["第41条"]).toBe("聴聞の特例");
    expect(kowanRodoHo.find((a) => a.articleNum === "第41条")).toBeUndefined();
    const todokede = kowanRodoHo.find((a) => a.articleNum === "第9条");
    expect(todokede?.text.includes("港湾労働者証")).toBe(true);
    // 雇用管理者の選任は第6条（旧コーパスは第29条＝指定の条件に誤割当）
    expect(k["第6条"]).toBe("雇用管理者");
    expect(k["第29条"]).toBe("指定の条件");
    const koyo = kowanRodoHo.find((a) => a.articleNum === "第6条");
    expect(koyo?.articleTitle).toBe("雇用管理者");
    // 均衡待遇の「派遣労働者の福祉」条は本法に存在しない（0 hits＝捏造の除去を固定）
    expect(kowanRodoHo.some((a) => a.text.includes("均衡"))).toBe(false);
    expect(Object.values(k).includes("派遣労働者の福祉")).toBe(false);
    // 罰則(第48条・無見出し)は無許可派遣等に1年以下の拘禁刑又は100万円以下の罰金（懲役→拘禁刑・2025-06施行）
    const batsu = kowanRodoHo.find((a) => a.articleNum === "第48条");
    expect(batsu?.text.includes("拘禁刑")).toBe(true);
    expect(batsu?.text.includes("懲役")).toBe(false);
    // 本則は第52条で終端。第53条以降（附則）は本則見出しとして存在しない
    expect(k["第53条"]).toBeUndefined();
  });

  // 柱1 労働者派遣法（e-Gov 360AC0000000088・取得2026-07-03）是正の再発防止。
  // 旧コーパスは条番号・見出しが系統的に誤っており、存在しない特例条（労災保険法特例）を捏造していた。
  it("既知の誤割当が再発していない（派遣法）", () => {
    const h = OFFICIAL_CAPTIONS_HAKEN_HO;
    // 第46条は「じん肺法の適用に関する特例等」。派遣法に労働者災害補償保険法の特例条は存在しない（捏造の除去）
    expect(h["第46条"]).toBe("じん肺法の適用に関する特例等");
    const jinpai = hakenAnzenEisei.find((a) => a.articleNum === "第46条");
    expect(jinpai?.articleTitle).toBe("じん肺法の適用に関する特例等");
    expect(jinpai?.text.includes("じん肺健康診断")).toBe(true);
    // 「労働者災害補償保険法の特例」という見出しは本法本則に存在しない
    expect(Object.values(h).includes("労働者災害補償保険法の特例")).toBe(false);
    // 就業条件等の明示は第34条（第35条の2は「労働者派遣の期間」）。旧コーパスは第35条の2に誤割当していた
    expect(h["第34条"]).toBe("就業条件等の明示");
    expect(h["第35条の2"]).toBe("労働者派遣の期間");
    expect(hakenAnzenEisei.find((a) => a.articleNum === "第35条の2")).toBeUndefined();
    const meiji = hakenAnzenEisei.find((a) => a.articleNum === "第34条");
    expect(meiji?.articleTitle).toBe("就業条件等の明示");
    // 派遣禁止業務（適用除外業務）は第4条（第40条の2は「労働者派遣の役務の提供を受ける期間」）。
    // 旧コーパスは「第40条の2（参考）」を派遣禁止業務に誤割当していた
    expect(h["第40条の2"]).toBe("労働者派遣の役務の提供を受ける期間");
    expect(hakenAnzenEisei.find((a) => a.articleNum === "第40条の2（参考）")).toBeUndefined();
    expect(hakenAnzenEisei.find((a) => a.articleNum === "第40条の2")).toBeUndefined();
    const kinshi = hakenAnzenEisei.find((a) => a.articleNum === "第4条");
    expect(kinshi?.text.includes("港湾運送業務")).toBe(true);
    expect(kinshi?.text.includes("建設業務")).toBe(true);
    // 労安衛法特例(第45条)の項番号: 特殊健診結果の派遣元送付は第10項（旧コーパスの第4項/第9項は誤り）
    expect(hakenAnzenEisei.find((a) => a.articleNum === "第45条第10項")).toBeDefined();
    expect(hakenAnzenEisei.find((a) => a.articleNum === "第45条第4項")).toBeUndefined();
    expect(hakenAnzenEisei.find((a) => a.articleNum === "第45条第9項")).toBeUndefined();
    // 第45条の公式見出しは「労働安全衛生法の適用に関する特例等」（旧コーパスは「労働安全衛生法等の適用に関する特例」と語順誤り）
    expect(h["第45条"]).toBe("労働安全衛生法の適用に関する特例等");
    const anei = hakenAnzenEisei.find((a) => a.articleNum === "第45条");
    expect(anei?.articleTitle).toBe("労働安全衛生法の適用に関する特例等");
    // 一般定期健診(66条1項)・雇入れ時教育(59条1項)は派遣元の義務（第45条みなしの列挙外）＝帰結として本文に固定
    expect(anei?.text.includes("一般定期健康診断（法第66条第1項）")).toBe(true);
    expect(anei?.text.includes("派遣元")).toBe(true);
    // 第44条: 年次有給休暇(労基法39条)は派遣元の義務（44条2項の列挙外）。旧コーパスは派遣先責任と誤記していた
    const rokiho = hakenAnzenEisei.find((a) => a.articleNum === "第44条");
    expect(rokiho?.text.includes("年次有給休暇（法第39条）")).toBe(true);
    expect(rokiho?.text.includes("派遣元が「使用者」として引き続き責任を負う")).toBe(true);
    // 第47条(作業環境測定法の適用の特例)が本法特例条としてコーパスに存在する
    expect(h["第47条"]).toBe("作業環境測定法の適用の特例");
    expect(hakenAnzenEisei.find((a) => a.articleNum === "第47条")).toBeDefined();
    // 第12条・第16条〜第22条は削除条（コーパスに存在してはならない）
    expect(h["第12条"]).toBe("削除");
    expect(h["第16条"]).toBe("削除");
    expect(h["第22条"]).toBe("削除");
  });

  // 柱1 労災保険法（e-Gov 322AC0000000050・取得2026-07-03・公式見出しを持たない=本文内容準拠ラベル）是正の再発防止。
  // 旧コーパスは給付体系を系統的に誤帰属していた（第12条の8を療養補償給付とし休業補償給付の本文を割当・第16条第2項に
  // 遺族の範囲・通勤の定義を第7条第3項）。
  it("既知の誤割当が再発していない（労災保険法）", () => {
    const s = OFFICIAL_CAPTIONS_RODO_SAIGAI_HOKEN_HO;
    // 第12条の8は業務災害給付の種類の列挙（療養補償給付でも休業補償給付でもない）。療養補償給付=第13条・休業補償給付=第14条
    expect(s["第12条の8"]).toBe("業務災害に関する保険給付の種類");
    expect(s["第13条"]).toBe("療養補償給付");
    expect(s["第14条"]).toBe("休業補償給付");
    // コーパス側: 休業補償給付の本文（4日目・給付基礎日額の60%）は第14条に置かれ、第12条の8には無い
    expect(rodoShaSaigaiHoshoHokenHo.find((a) => a.articleNum === "第12条の8")).toBeUndefined();
    const kyugyo = rodoShaSaigaiHoshoHokenHo.find((a) => a.articleNum === "第14条");
    expect(kyugyo?.articleTitle).toBe("休業補償給付");
    expect(kyugyo?.text.includes("第四日目")).toBe(true);
    expect(kyugyo?.text.includes("百分の六十")).toBe(true);
    // 遺族補償年金を受けることができる遺族の範囲は第16条の2（第16条の第2項ではない）。第16条は年金又は一時金の1文のみ
    expect(s["第16条"]).toBe("遺族補償給付");
    expect(s["第16条の2"]).toBe("遺族補償年金を受けることができる遺族");
    const izoku16 = rodoShaSaigaiHoshoHokenHo.find((a) => a.articleNum === "第16条");
    expect(izoku16?.text.includes("年金又は遺族補償一時金")).toBe(true);
    expect(izoku16?.text.includes("生計を維持")).toBe(false); // 遺族範囲は第16条へ混入しない
    const izoku162 = rodoShaSaigaiHoshoHokenHo.find((a) => a.articleNum === "第16条の2");
    expect(izoku162?.text.includes("生計を維持")).toBe(true);
    expect(izoku162?.text.includes("順序")).toBe(true);
    // 通勤の定義は第7条第2項（第3項は逸脱・中断）。旧コーパスは第7条第3項に誤番していた
    expect(s["第7条第2項"]).toBe("通勤の定義*");
    expect(rodoShaSaigaiHoshoHokenHo.find((a) => a.articleNum === "第7条第3項")).toBeUndefined();
    const tsukin = rodoShaSaigaiHoshoHokenHo.find((a) => a.articleNum === "第7条第2項");
    expect(tsukin?.text.includes("合理的な経路及び方法")).toBe(true);
    // 第1条（目的）・第7条（保険給付）本文は令和2年改正の複数事業労働者・複数業務要因災害を反映
    const mokuteki = rodoShaSaigaiHoshoHokenHo.find((a) => a.articleNum === "第1条");
    expect(mokuteki?.text.includes("複数事業労働者")).toBe(true);
    const hokyu = rodoShaSaigaiHoshoHokenHo.find((a) => a.articleNum === "第7条");
    expect(hokyu?.text.includes("複数業務要因災害")).toBe(true);
    expect(hokyu?.text.includes("二次健康診断等給付")).toBe(true);
  });

  // 柱1（労働災害防止団体法 2026-07-03）の再発防止（旧コーパスで誤っていた組）
  it("既知の誤割当が再発していない（労災防止団体法）", () => {
    const r = OFFICIAL_CAPTIONS_ROSAI_BOSHI_DANTAI_HO;
    // 第3〜7条は現行法で削除。旧コーパスは第3条を「労働災害防止団体（種類）」に誤割当していた
    expect(r["第3条"]).toBe("削除");
    expect(r["第6条"]).toBe("削除");
    expect(r["第7条"]).toBe("削除");
    expect(rosaiBoshiDantaiHo.some((a) => ["第3条", "第4条", "第5条", "第6条", "第7条"].includes(a.articleNum))).toBe(false);
    // 団体の「種類」は第8条（中央協会・協会の2区分）
    expect(r["第8条"]).toBe("種類");
    const shurui = rosaiBoshiDantaiHo.find((a) => a.articleNum === "第8条");
    expect(shurui?.articleTitle).toBe("種類");
    // 第8条は2区分のみを定める＝旧コーパスの業種別5協会列挙は条文内容ではない。中央協会・協会の語で条文準拠を固定
    expect(shurui?.text.includes("中央労働災害防止協会")).toBe(true);
    expect(shurui?.text.includes("労働災害防止協会")).toBe(true);
    // 中央協会の業務は第11条（旧コーパスは第6条「中災防の目的」/第10条「業務」に誤割当）。第10条は「登記」
    expect(r["第11条"]).toBe("業務");
    expect(r["第10条"]).toBe("登記");
    const gyomu = rosaiBoshiDantaiHo.find((a) => a.articleNum === "第11条");
    expect(gyomu?.articleTitle).toBe("業務");
    // RST（安全衛生教育の指導員養成）は第11条第2項＝国からの委託業務が根拠
    expect(gyomu?.text.includes("指導員")).toBe(true);
    // 安全管理士及び衛生管理士は第12条
    expect(r["第12条"]).toBe("安全管理士及び衛生管理士");
    // 業種別協会の業務は第36条（旧コーパスは第26/27条＝決算関係書類/参与に誤割当）
    expect(r["第36条"]).toBe("業務");
    expect(r["第26条"]).toBe("決算関係書類の提出等");
    expect(r["第27条"]).toBe("参与");
    // 労働災害防止規程＝第37条・その認可は第38条（旧コーパスは第36/40条に誤割当）
    expect(r["第37条"]).toBe("労働災害防止規程");
    expect(r["第38条"]).toBe("労働災害防止規程の認可");
    // 監督（報告・立入検査）は第52条、勧告等は第53条（旧コーパスは第48条を「監督」に誤割当）。第48条は「総会」
    expect(r["第52条"]).toBe("報告等");
    expect(r["第53条"]).toBe("勧告等");
    expect(r["第48条"]).toBe("総会");
    // 罰則は第59〜63条（無見出し）。旧コーパスは第57条＝鉱山特例に「罰則」を誤割当していた
    expect(r["第57条"]).toBe("鉱山に関する特例");
    expect(r["第59条"]).toBe("罰則*");
    expect(rosaiBoshiDantaiHo.some((a) => a.articleNum === "第57条")).toBe(false);
    // 旧コーパスの捏造見出し（中央労働災害防止協会の目的・業種別労働災害防止協会の目的・規程の遵守）は
    // 公式見出しに存在しない
    const caps = Object.values(r);
    expect(caps.includes("中央労働災害防止協会の目的")).toBe(false);
    expect(caps.includes("業種別労働災害防止協会の目的")).toBe(false);
    expect(caps.includes("規程の遵守")).toBe(false);
  });

  it("既知の誤割当が再発していない（じん肺法）", () => {
    const j = OFFICIAL_CAPTIONS_JINPAI_HO;
    // ①第3条は「じん肺健康診断」（旧コーパスは現行法に不存在の「適用範囲」に誤割当）
    expect(j["第3条"]).toBe("じん肺健康診断");
    const a3 = jinpaiHo.find((a) => a.articleNum === "第3条");
    expect(a3?.articleTitle).toBe("じん肺健康診断");
    // 公式見出しに「適用範囲」は存在しない
    expect(Object.values(j).includes("適用範囲")).toBe(false);
    // ②第13条は「じん肺管理区分の決定手続等」（都道府県労働局長が地方じん肺診査医の診断・審査により決定）。
    //   事業者による書面提出は第12条であり、旧コーパスは第13条に第12条相当の本文を「決定の申請」と誤記していた
    expect(j["第13条"]).toBe("じん肺管理区分の決定手続等");
    expect(j["第12条"]).toBe("事業者によるエックス線写真等の提出");
    const a13 = jinpaiHo.find((a) => a.articleNum === "第13条");
    expect(a13?.text.includes("都道府県労働局長")).toBe(true);
    // ③作業の転換は第21条（旧コーパスは第20条＝審査請求と訴訟との関係に誤割当）
    expect(j["第21条"]).toBe("作業の転換");
    expect(j["第20条"]).toBe("審査請求と訴訟との関係");
    expect(jinpaiHo.some((a) => a.articleNum === "第20条")).toBe(false);
    const a21 = jinpaiHo.find((a) => a.articleNum === "第21条");
    expect(a21?.articleTitle).toBe("作業の転換");
    // 就業時＝第7条・定期＝第8条は正しい。定期は管理一で3年以内ごと1回・管理二/管理三イで1年以内ごと1回
    expect(j["第7条"]).toBe("就業時健康診断");
    expect(j["第8条"]).toBe("定期健康診断");
    const a8 = jinpaiHo.find((a) => a.articleNum === "第8条");
    expect(a8?.text.includes("3年以内ごとに1回") && a8?.text.includes("1年以内ごとに1回")).toBe(true);
    // 第24〜31条は現行削除条。コーパスは参照していない
    expect(j["第24条"]).toBe("削除");
    expect(j["第31条"]).toBe("削除");
  });

  // 柱1（作業環境測定法）是正の再発防止（旧コーパスで誤っていた組）
  it("既知の誤割当が再発していない（作環測法）", () => {
    const s = OFFICIAL_CAPTIONS_SAKANKAN_SOKUTEIHO;
    // 旧コーパス: 第3条を「作業環境測定士の資格」（正は第5条・第3条は作業環境測定の実施）、
    // 第33条を「作業環境測定機関の登録」（公式見出しは作業環境測定機関）、
    // 第36条を「作業環境測定機関の義務」（第36条は日本作業環境測定協会）、
    // 第41条を「報告等」（第41条は厚生労働大臣等の権限・報告等は第42条）と誤割当していた
    expect(s["第3条"]).toBe("作業環境測定の実施");
    expect(s["第5条"]).toBe("作業環境測定士の資格");
    expect(s["第33条"]).toBe("作業環境測定機関");
    expect(s["第36条"]).toBe("日本作業環境測定協会");
    expect(s["第41条"]).toBe("厚生労働大臣等の権限");
    expect(s["第42条"]).toBe("報告等");
    // 資格＝第5条（試験合格＋講習修了）。作業環境測定士試験は第14条（旧本文は第7/8条を試験と誤引用）
    expect(s["第14条"]).toBe("試験");
    const shikaku = sagyokankyoSokuteiho.find((a) => a.articleNum === "第5条");
    expect(shikaku?.articleTitle).toBe("作業環境測定士の資格");
    expect(shikaku?.text.includes("試験")).toBe(true);
    expect(shikaku?.text.includes("講習")).toBe(true);
    // 定義（第2条）: 作業環境測定＝労安法第2条第4号（旧本文は第65条第1項と誤記）。第一種/第二種を定義
    const teigi = sagyokankyoSokuteiho.find((a) => a.articleNum === "第2条");
    expect(teigi?.text.includes("第2条第4号")).toBe(true);
    expect(teigi?.text.includes("第一種作業環境測定士")).toBe(true);
    expect(teigi?.text.includes("第二種作業環境測定士")).toBe(true);
    // 作業環境測定の実施（第3条）＝事業者は指定作業場を作業環境測定士に実施させ、できないときは機関へ委託
    const jisshi = sagyokankyoSokuteiho.find((a) => a.articleNum === "第3条");
    expect(jisshi?.text.includes("指定作業場")).toBe(true);
    expect(jisshi?.text.includes("委託")).toBe(true);
    // 第46条は現行法で削除。旧コーパスの「作業環境測定機関の義務」は独立条として現行法に存在しない
    expect(s["第46条"]).toBe("削除");
    const caps2 = Object.values(s);
    expect(caps2.includes("作業環境測定機関の登録")).toBe(false);
    expect(caps2.includes("作業環境測定機関の義務")).toBe(false);
    // 旧コーパスの誤った条番号（第36条=機関の義務・第41条=報告等・第3条=資格）が復活していない
    expect(sagyokankyoSokuteiho.some((a) => a.articleNum === "第36条")).toBe(false);
    expect(sagyokankyoSokuteiho.some((a) => a.articleNum === "第41条")).toBe(false);
  });
});
