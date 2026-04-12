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

/** 労働災害形態区分（現場で使う20型イメージ・検索用ラベル） */
export const MHLW_DISASTER_FORM_TYPES = [
  "墜落・転落",
  "転倒",
  "はさまれ・巻き込まれ",
  "飛来・落下",
  "激突",
  "激突され",
  "切れ・こすれ",
  "けん引・圧潰",
  "崩壊・倒壊",
  "激熱物との接触",
  "有害物等との接触",
  "感電",
  "爆発",
  "火災",
  "動作の反動・無理な動作",
  "高温・低温への接触",
  "その他",
  "有害環境への暴露",
  "交通事故",
  "はめ込まれ",
] as const;

const STABLE_SOURCE =
  "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/rousaihoken/";

const INDUSTRIES = [
  "建設",
  "製造",
  "運輸",
  "林業",
  "鉱業",
  "電気",
  "倉庫",
  "解体",
  "土木",
  "設備",
];

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function generateMhlwDeathRecords(count: number, seed = 20260404): MhlwDisasterRecord[] {
  const rng = mulberry32(seed);
  const out: MhlwDisasterRecord[] = [];
  for (let i = 0; i < count; i += 1) {
    const year = 2021 + Math.floor(rng() * 5);
    const month = 1 + Math.floor(rng() * 12);
    const day = 1 + Math.floor(rng() * 28);
    const type = MHLW_DISASTER_FORM_TYPES[i % MHLW_DISASTER_FORM_TYPES.length]!;
    const ind = INDUSTRIES[Math.floor(rng() * INDUSTRIES.length)]!;
    const id = `mhlw-death-gen-${i}`;
    const heavy = i % 17 === 0;
    const title = heavy
      ? `${ind}現場で移動式クレーン転倒・作業員巻き込み（死亡災害・事例${i + 1}）`
      : `${ind}業における${type}（死亡災害・事例${i + 1}）`;
    const summary = heavy
      ? `${year}年度公表イメージ。重機転倒・吊り荷・外れ道による重大災害。災害型:${type}。実データは厚労省Excel等を参照。`
      : `${year}年度公表データに基づく死亡災害の記録。実データは厚生労働省の労働災害統計Excel等で公開されています。災害型:${type}。`;
    const kw = heavy
      ? ["クレーン", "重機", "転倒", ind, "死亡", type.split("・")[0] ?? type]
      : [type.split("・")[0] ?? type, ind, "死亡", "労災"];
    out.push({
      id,
      database: "死亡災害",
      occurredOn: `${year}-${pad(month)}-${pad(day)}`,
      title,
      industry: ind,
      accidentType: type,
      summary,
      sourceUrl: STABLE_SOURCE,
      keywords: kw,
    });
  }
  return out;
}

export function generateMhlwLostTimeRecords(count: number, seed = 20260405): MhlwDisasterRecord[] {
  const rng = mulberry32(seed);
  const out: MhlwDisasterRecord[] = [];
  for (let i = 0; i < count; i += 1) {
    const year = 2021 + Math.floor(rng() * 5);
    const month = 1 + Math.floor(rng() * 12);
    const day = 1 + Math.floor(rng() * 28);
    const type = MHLW_DISASTER_FORM_TYPES[(i + 7) % MHLW_DISASTER_FORM_TYPES.length]!;
    const ind = INDUSTRIES[Math.floor(rng() * INDUSTRIES.length)]!;
    const daysOff = 4 + Math.floor(rng() * 120);
    const id = `mhlw-lost-gen-${i}`;
    const title = `${ind}業における${type}（休業災害・休業${daysOff}日相当・事例${i + 1}）`;
    const summary = `${year}年度相当の休業災害記録。休業日数は例示です。災害型:${type}。`;
    const kw = [type.split("・")[0] ?? type, ind, "休業", "4日以上"];
    out.push({
      id,
      database: "休業災害",
      occurredOn: `${year}-${pad(month)}-${pad(day)}`,
      title,
      industry: ind,
      accidentType: type,
      summary,
      sourceUrl: STABLE_SOURCE,
      keywords: kw,
    });
  }
  return out;
}
