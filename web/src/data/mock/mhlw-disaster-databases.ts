export type MhlwDisasterRecord = {
  id: string;
  database: "死亡災害" | "休業災害";
  occurredOn: string;
  title: string;
  industry: string;
  accidentType: string;
  summary: string;
  sourceUrl: string;
  keywords: string[];
};

const deathTemplates: Omit<MhlwDisasterRecord, "id" | "occurredOn">[] = [
  { database: "死亡災害", title: "鉄骨建方作業中の墜落", industry: "建設", accidentType: "墜落・転落", summary: "鉄骨建方中、梁上を移動中にバランスを崩し約12m下に墜落。フルハーネス未着用。", sourceUrl: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000181431.html", keywords: ["墜落", "鉄骨", "フルハーネス"] },
  { database: "死亡災害", title: "屋根作業中の踏み抜き墜落", industry: "建設", accidentType: "墜落・転落", summary: "屋根の老朽化したスレートを踏み抜き約8m墜落。歩み板未設置。", sourceUrl: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000181431.html", keywords: ["墜落", "屋根", "踏み抜き"] },
  { database: "死亡災害", title: "クレーンの荷振れによる激突", industry: "建設", accidentType: "飛来・落下", summary: "移動式クレーンで吊り荷が振れ、近くの作業員に激突。合図者不在。", sourceUrl: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000181431.html", keywords: ["クレーン", "飛来落下", "合図"] },
  { database: "死亡災害", title: "トンネル工事中の崩落", industry: "建設", accidentType: "崩壊・倒壊", summary: "切羽近傍で地山が崩落し、作業員が生き埋めに。地質調査の不足が指摘。", sourceUrl: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000181431.html", keywords: ["トンネル", "崩壊", "地山"] },
  { database: "死亡災害", title: "プレス機への挟まれ", industry: "製造", accidentType: "挟まれ・巻き込まれ", summary: "金型交換中にプレス機が誤作動し挟まれ死亡。安全ブロックの不使用が原因。", sourceUrl: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000181431.html", keywords: ["プレス", "挟まれ", "安全ブロック"] },
  { database: "死亡災害", title: "高圧電線への接触による感電", industry: "建設", accidentType: "感電", summary: "建築資材の搬入時にクレーンブームが高圧電線に接触。離隔距離の確認不足。", sourceUrl: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000181431.html", keywords: ["感電", "高圧電線", "クレーン"] },
  { database: "死亡災害", title: "フォークリフトとの激突", industry: "運輸", accidentType: "激突され", summary: "倉庫内で歩行者通路が不明確な状態でフォークリフトが旋回し歩行者と接触。", sourceUrl: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000181431.html", keywords: ["フォークリフト", "激突", "歩行者"] },
  { database: "死亡災害", title: "酸素欠乏場所での意識喪失", industry: "製造", accidentType: "有害物等との接触", summary: "タンク内で酸素欠乏により意識を失い倒れた。換気と酸素濃度測定が未実施。", sourceUrl: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000181431.html", keywords: ["酸欠", "タンク", "換気"] },
  { database: "死亡災害", title: "熱中症による死亡", industry: "建設", accidentType: "高温・低温への接触", summary: "屋外作業でWBGT 33℃超の環境下、休憩なく作業を継続し倒れた。", sourceUrl: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000181431.html", keywords: ["熱中症", "WBGT", "屋外"] },
  { database: "死亡災害", title: "解体作業中の壁倒壊", industry: "建設", accidentType: "崩壊・倒壊", summary: "建物解体中に支保工を撤去した壁体が倒壊し下敷きに。解体順序の不備。", sourceUrl: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000181431.html", keywords: ["解体", "倒壊", "壁"] },
];

const lostTemplates: Omit<MhlwDisasterRecord, "id" | "occurredOn">[] = [
  { database: "休業災害", title: "階段からの転倒による骨折", industry: "製造", accidentType: "転倒", summary: "工場内の階段で足を滑らせ転倒。手すりの欠損が放置されていた。休業35日。", sourceUrl: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000181431.html", keywords: ["転倒", "階段", "骨折"] },
  { database: "休業災害", title: "旋盤の切りくずによる裂傷", industry: "製造", accidentType: "切れ・こすれ", summary: "旋盤操作中に切りくずが飛散し腕を裂傷。保護カバーが外されていた。休業20日。", sourceUrl: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000181431.html", keywords: ["旋盤", "切りくず", "裂傷"] },
  { database: "休業災害", title: "重量物の運搬中の腰痛", industry: "運輸", accidentType: "動作の反動・無理な動作", summary: "30kg超の荷物を手作業で繰り返し運搬し急性腰痛を発症。休業14日。", sourceUrl: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000181431.html", keywords: ["腰痛", "重量物", "運搬"] },
  { database: "休業災害", title: "資材の落下による打撲", industry: "建設", accidentType: "飛来・落下", summary: "上階から工具が落下し下の作業員に直撃。ネットの未設置。休業45日。", sourceUrl: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000181431.html", keywords: ["飛来", "落下", "工具"] },
  { database: "休業災害", title: "コンベヤへの巻き込まれ", industry: "製造", accidentType: "挟まれ・巻き込まれ", summary: "清掃中にコンベヤが起動し衣服が巻き込まれ手指を負傷。休業60日。", sourceUrl: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000181431.html", keywords: ["巻き込まれ", "コンベヤ", "清掃"] },
  { database: "休業災害", title: "有機溶剤による中毒症状", industry: "製造", accidentType: "有害物等との接触", summary: "塗装作業中に換気不十分な室内で有機溶剤を吸引しめまい・嘔吐。休業30日。", sourceUrl: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000181431.html", keywords: ["有機溶剤", "中毒", "換気"] },
  { database: "休業災害", title: "ケーブル溝への転落", industry: "建設", accidentType: "墜落・転落", summary: "開口部の養生が外れたケーブル溝に転落し骨折。休業40日。", sourceUrl: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000181431.html", keywords: ["転落", "開口部", "養生"] },
  { database: "休業災害", title: "グラインダー使用中の火花による火傷", industry: "製造", accidentType: "高温・低温への接触", summary: "防護なしでグラインダー作業中、火花が衣服に引火し腕を火傷。休業21日。", sourceUrl: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000181431.html", keywords: ["グラインダー", "火傷", "火花"] },
  { database: "休業災害", title: "仮設通路の段差でのつまずき", industry: "建設", accidentType: "転倒", summary: "仮設通路の段差につまずき転倒。膝を強打し休業18日。通路の照明不足。", sourceUrl: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000181431.html", keywords: ["転倒", "段差", "照明"] },
  { database: "休業災害", title: "チェーンソーのキックバック", industry: "林業", accidentType: "切れ・こすれ", summary: "伐採作業中にチェーンソーがキックバックし大腿部を裂傷。防護ズボン未着用。休業50日。", sourceUrl: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000181431.html", keywords: ["チェーンソー", "キックバック", "林業"] },
];

function generateRecords(
  templates: Omit<MhlwDisasterRecord, "id" | "occurredOn">[],
  prefix: string
): MhlwDisasterRecord[] {
  const records: MhlwDisasterRecord[] = [];
  let seq = 1;
  for (let year = 2016; year <= 2026; year += 1) {
    for (let tIdx = 0; tIdx < templates.length; tIdx += 1) {
      const t = templates[tIdx];
      const month = String((tIdx % 12) + 1).padStart(2, "0");
      const day = String(3 + (seq % 25)).padStart(2, "0");
      records.push({
        ...t,
        id: `${prefix}-${seq}`,
        occurredOn: `${year}-${month}-${day}`,
        title: `${t.title}（${year}年）`,
      });
      seq += 1;
    }
  }
  return records;
}

export const mhlwDeathDisastersMock: MhlwDisasterRecord[] = generateRecords(deathTemplates, "mhlw-death");
export const mhlwLostTimeDisastersMock: MhlwDisasterRecord[] = generateRecords(lostTemplates, "mhlw-lost");

export function searchMhlwDisasters(
  query: string,
  death = mhlwDeathDisastersMock,
  lost = mhlwLostTimeDisastersMock
): { death: MhlwDisasterRecord[]; lostTime: MhlwDisasterRecord[] } {
  const q = query.trim().toLowerCase();
  if (!q) {
    return { death, lostTime: lost };
  }
  const match = (r: MhlwDisasterRecord) =>
    r.title.toLowerCase().includes(q) ||
    r.summary.toLowerCase().includes(q) ||
    r.industry.toLowerCase().includes(q) ||
    r.accidentType.toLowerCase().includes(q) ||
    r.keywords.some((k) => k.toLowerCase().includes(q));
  return {
    death: death.filter(match),
    lostTime: lost.filter(match),
  };
}
