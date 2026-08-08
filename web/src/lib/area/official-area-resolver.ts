import {
  getSignageLocationById,
  signageLocations,
  type SignageLocation,
} from "@/data/signage-locations";

export type AreaResolutionLevel = "prefecture" | "municipality";

export type OfficialAreaCandidate = {
  id: string;
  label: string;
  prefectureIso: string;
  resolutionLevel: AreaResolutionLevel;
  resolutionLabel: string;
  scopeLabel: string;
};

export type OfficialAreaResolution = {
  normalizedQuery: string;
  exact: boolean;
  unique: OfficialAreaCandidate | null;
  candidates: OfficialAreaCandidate[];
};

type AliasEntry = {
  alias: string;
  areaId: string;
  level: AreaResolutionLevel;
};

type VerifiedCityWard = {
  canonical: string;
  reading: string;
};

type VerifiedCityWardAlias = {
  areaId: string;
  city: VerifiedCityWard;
  wards: VerifiedCityWard[];
  /** 区名を照合した自治体公式ページ。生入力の外部送信には使用しない。 */
  sourceUrl: string;
};

const PREFECTURE_READINGS: Record<string, string[]> = {
  "JP-01": ["ほっかいどう"],
  "JP-02": ["あおもり", "あおもりけん"],
  "JP-03": ["いわて", "いわてけん"],
  "JP-04": ["みやぎ", "みやぎけん"],
  "JP-05": ["あきた", "あきたけん"],
  "JP-06": ["やまがた", "やまがたけん"],
  "JP-07": ["ふくしま", "ふくしまけん"],
  "JP-08": ["いばらき", "いばらきけん"],
  "JP-09": ["とちぎ", "とちぎけん"],
  "JP-10": ["ぐんま", "ぐんまけん"],
  "JP-11": ["さいたま", "さいたまけん"],
  "JP-12": ["ちば", "ちばけん"],
  "JP-13": ["とうきょう", "とうきょうと"],
  "JP-14": ["かながわ", "かながわけん"],
  "JP-15": ["にいがた", "にいがたけん"],
  "JP-16": ["とやま", "とやまけん"],
  "JP-17": ["いしかわ", "いしかわけん"],
  "JP-18": ["ふくい", "ふくいけん"],
  "JP-19": ["やまなし", "やまなしけん"],
  "JP-20": ["ながの", "ながのけん"],
  "JP-21": ["ぎふ", "ぎふけん"],
  "JP-22": ["しずおか", "しずおかけん"],
  "JP-23": ["あいち", "あいちけん"],
  "JP-24": ["みえ", "みえけん"],
  "JP-25": ["しが", "しがけん"],
  "JP-26": ["きょうと", "きょうとふ"],
  "JP-27": ["おおさか", "おおさかふ"],
  "JP-28": ["ひょうご", "ひょうごけん"],
  "JP-29": ["なら", "ならけん"],
  "JP-30": ["わかやま", "わかやまけん"],
  "JP-31": ["とっとり", "とっとりけん"],
  "JP-32": ["しまね", "しまねけん"],
  "JP-33": ["おかやま", "おかやまけん"],
  "JP-34": ["ひろしま", "ひろしまけん"],
  "JP-35": ["やまぐち", "やまぐちけん"],
  "JP-36": ["とくしま", "とくしまけん"],
  "JP-37": ["かがわ", "かがわけん"],
  "JP-38": ["えひめ", "えひめけん"],
  "JP-39": ["こうち", "こうちけん"],
  "JP-40": ["ふくおか", "ふくおかけん"],
  "JP-41": ["さが", "さがけん"],
  "JP-42": ["ながさき", "ながさきけん"],
  "JP-43": ["くまもと", "くまもとけん"],
  "JP-44": ["おおいた", "おおいたけん"],
  "JP-45": ["みやざき", "みやざきけん"],
  "JP-46": ["かごしま", "かごしまけん"],
  "JP-47": ["おきなわ", "おきなわけん"],
};

const CAPITAL_READINGS: Record<string, string[]> = {
  "hokkaido-sapporo": ["さっぽろ", "さっぽろし"],
  "aomori-aomori": ["あおもりし"],
  "iwate-morioka": ["もりおか", "もりおかし"],
  "miyagi-sendai": ["せんだい", "せんだいし"],
  "akita-akita": ["あきたし"],
  "yamagata-yamagata": ["やまがたし"],
  "fukushima-fukushima": ["ふくしまし"],
  "ibaraki-mito": ["みと", "みとし"],
  "tochigi-utsunomiya": ["うつのみや", "うつのみやし"],
  "gunma-maebashi": ["まえばし", "まえばしし"],
  "saitama-saitama": ["さいたまし"],
  "chiba-chiba": ["ちばし"],
  "tokyo-shinjuku": ["しんじゅく", "しんじゅくく"],
  "kanagawa-yokohama": ["よこはま", "よこはまし"],
  "niigata-niigata": ["にいがたし"],
  "toyama-toyama": ["とやまし"],
  "ishikawa-kanazawa": ["かなざわ", "かなざわし"],
  "fukui-fukui": ["ふくいし"],
  "yamanashi-kofu": ["こうふ", "こうふし"],
  "nagano-nagano": ["ながのし"],
  "gifu-gifu": ["ぎふし"],
  "shizuoka-shizuoka": ["しずおかし"],
  "aichi-nagoya": ["なごや", "なごやし"],
  "mie-tsu": ["つ", "つし"],
  "shiga-otsu": ["おおつ", "おおつし"],
  "kyoto-kyoto": ["きょうとし"],
  "osaka-osaka": ["おおさかし"],
  "hyogo-kobe": ["こうべ", "こうべし"],
  "nara-nara": ["ならし"],
  "wakayama-wakayama": ["わかやまし"],
  "tottori-tottori": ["とっとりし"],
  "shimane-matsue": ["まつえ", "まつえし"],
  "okayama-okayama": ["おかやまし"],
  "hiroshima-hiroshima": ["ひろしまし"],
  "yamaguchi-yamaguchi": ["やまぐちし"],
  "tokushima-tokushima": ["とくしまし"],
  "kagawa-takamatsu": ["たかまつ", "たかまつし"],
  "ehime-matsuyama": ["まつやま", "まつやまし"],
  "kochi-kochi": ["こうちし"],
  "fukuoka-fukuoka": ["ふくおかし"],
  "saga-saga": ["さがし"],
  "nagasaki-nagasaki": ["ながさきし"],
  "kumamoto-kumamoto": ["くまもとし"],
  "oita-oita": ["おおいたし"],
  "miyazaki-miyazaki": ["みやざきし"],
  "kagoshima-kagoshima": ["かごしまし"],
  "okinawa-naha": ["なは", "なはし"],
};

const TOKYO_WARD_READINGS: Record<string, string[]> = {
  "tokyo-chiyoda": ["ちよだ", "ちよだく"],
  "tokyo-chuo": ["とうきょうちゅうおう", "とうきょうちゅうおうく"],
  "tokyo-minato": ["とうきょうみなと", "とうきょうみなとく"],
  "tokyo-bunkyo": ["ぶんきょう", "ぶんきょうく"],
  "tokyo-taito": ["たいとう", "たいとうく"],
  "tokyo-sumida": ["すみだ", "すみだく"],
  "tokyo-koto": ["こうとう", "こうとうく"],
  "tokyo-shinagawa": ["しながわ", "しながわく"],
  "tokyo-meguro": ["めぐろ", "めぐろく"],
  "tokyo-ota": ["おおた", "おおたく"],
  "tokyo-setagaya": ["せたがや", "せたがやく"],
  "tokyo-shibuya": ["しぶや", "しぶやく"],
  "tokyo-nakano": ["とうきょうなかの", "とうきょうなかのく"],
  "tokyo-suginami": ["すぎなみ", "すぎなみく"],
  "tokyo-toshima": ["としま", "としまく"],
  "tokyo-kita": ["とうきょうきた", "とうきょうきたく"],
  "tokyo-arakawa": ["あらかわ", "あらかわく"],
  "tokyo-itabashi": ["いたばし", "いたばしく"],
  "tokyo-nerima": ["ねりま", "ねりまく"],
  "tokyo-adachi": ["あだち", "あだちく"],
  "tokyo-katsushika": ["かつしか", "かつしかく"],
  "tokyo-edogawa": ["えどがわ", "えどがわく"],
};

/**
 * 自治体公式ページで市区の組み合わせを確認したaliasだけを登録する。
 * 裸の「中央区」「北区」「中区」等はここから生成せず、都市名を伴う場合だけ
 * 一意に解決する。外部APIには、この辞書が返すallowlist済みareaIdだけを渡す。
 */
export const VERIFIED_CITY_WARD_ALIASES: readonly VerifiedCityWardAlias[] = [
  {
    areaId: "kanagawa-yokohama",
    city: { canonical: "横浜市", reading: "よこはまし" },
    wards: [{ canonical: "港北区", reading: "こうほくく" }],
    sourceUrl: "https://www.city.yokohama.lg.jp/kohoku/",
  },
  {
    areaId: "osaka-osaka",
    city: { canonical: "大阪市", reading: "おおさかし" },
    wards: [{ canonical: "北区", reading: "きたく" }],
    sourceUrl: "https://www.city.osaka.lg.jp/kita/",
  },
  {
    areaId: "saitama-saitama",
    city: { canonical: "さいたま市", reading: "さいたまし" },
    wards: [{ canonical: "大宮区", reading: "おおみやく" }],
    sourceUrl: "https://www.city.saitama.jp/omiya/",
  },
  {
    areaId: "hokkaido-sapporo",
    city: { canonical: "札幌市", reading: "さっぽろし" },
    wards: [{ canonical: "中央区", reading: "ちゅうおうく" }],
    sourceUrl: "https://www.city.sapporo.jp/chuo/",
  },
  {
    areaId: "fukuoka-fukuoka",
    city: { canonical: "福岡市", reading: "ふくおかし" },
    wards: [{ canonical: "博多区", reading: "はかたく" }],
    sourceUrl: "https://www.city.fukuoka.lg.jp/hakata/",
  },
  {
    areaId: "aichi-nagoya",
    city: { canonical: "名古屋市", reading: "なごやし" },
    wards: [{ canonical: "中区", reading: "なかく" }],
    sourceUrl: "https://www.city.nagoya.jp/naka/",
  },
] as const;

/**
 * 県庁所在地以外でも利用頻度の高い都市名を、外部へ生入力を送らず県の
 * allowlist済み代表地点へ解決する。市そのものの実測値とは表示しない。
 */
const COARSE_MAJOR_CITY_ALIASES: Array<{
  areaId: string;
  aliases: string[];
}> = [
  { areaId: "hokkaido-sapporo", aliases: ["旭川市", "旭川", "あさひかわし", "あさひかわ", "函館市", "函館", "はこだてし", "はこだて"] },
  { areaId: "fukushima-fukushima", aliases: ["郡山市", "郡山", "こおりやまし", "こおりやま", "いわき市", "いわき", "いわきし"] },
  { areaId: "saitama-saitama", aliases: ["川口市", "川口", "かわぐちし", "かわぐち", "川越市", "川越", "かわごえし", "かわごえ"] },
  { areaId: "chiba-chiba", aliases: ["船橋市", "船橋", "ふなばしし", "ふなばし", "柏市", "柏", "かしわし", "かしわ"] },
  { areaId: "tokyo-shinjuku", aliases: ["八王子市", "八王子", "はちおうじし", "はちおうじ", "町田市", "町田", "まちだし", "まちだ"] },
  { areaId: "kanagawa-yokohama", aliases: ["川崎市", "川崎", "かわさきし", "かわさき", "相模原市", "相模原", "さがみはらし", "さがみはら", "横須賀市", "横須賀", "よこすかし", "よこすか"] },
  { areaId: "ishikawa-kanazawa", aliases: ["小松市", "小松", "こまつし", "こまつ"] },
  { areaId: "nagano-nagano", aliases: ["松本市", "松本", "まつもとし", "まつもと"] },
  { areaId: "shizuoka-shizuoka", aliases: ["浜松市", "浜松", "はままつし", "はままつ"] },
  { areaId: "aichi-nagoya", aliases: ["豊田市", "豊田", "とよたし", "とよた", "岡崎市", "岡崎", "おかざきし", "おかざき"] },
  { areaId: "osaka-osaka", aliases: ["堺市", "堺", "さかいし", "さかい", "東大阪市", "東大阪", "ひがしおおさかし", "ひがしおおさか"] },
  { areaId: "hyogo-kobe", aliases: ["姫路市", "姫路", "ひめじし", "ひめじ", "尼崎市", "尼崎", "あまがさきし", "あまがさき", "西宮市", "西宮", "にしのみやし", "にしのみや"] },
  { areaId: "okayama-okayama", aliases: ["倉敷市", "倉敷", "くらしきし", "くらしき"] },
  { areaId: "hiroshima-hiroshima", aliases: ["福山市", "福山", "ふくやまし", "ふくやま"] },
  { areaId: "yamaguchi-yamaguchi", aliases: ["下関市", "下関", "しものせきし", "しものせき"] },
  { areaId: "fukuoka-fukuoka", aliases: ["北九州市", "北九州", "きたきゅうしゅうし", "きたきゅうしゅう", "久留米市", "久留米", "くるめし", "くるめ"] },
  { areaId: "kumamoto-kumamoto", aliases: ["八代市", "八代", "やつしろし", "やつしろ"] },
  { areaId: "kagoshima-kagoshima", aliases: ["霧島市", "霧島", "きりしまし", "きりしま"] },
];

const PREFECTURE_REPRESENTATIVE: Record<string, string> = Object.fromEntries(
  signageLocations.map((location) => [location.prefectureIso, location.id]),
);
PREFECTURE_REPRESENTATIVE["JP-13"] = "tokyo-shinjuku";

/**
 * These ward names exist in more than one major city. The current allowlist
 * does not pretend that a bare ward name identifies the first matching city.
 */
const AMBIGUOUS_MAJOR_WARDS: Record<string, string[]> = {
  中央区: [
    "tokyo-chuo",
    "hokkaido-sapporo",
    "osaka-osaka",
    "fukuoka-fukuoka",
  ],
  ちゅうおうく: [
    "tokyo-chuo",
    "hokkaido-sapporo",
    "osaka-osaka",
    "fukuoka-fukuoka",
  ],
  北区: ["tokyo-kita", "osaka-osaka", "kyoto-kyoto"],
  きたく: ["tokyo-kita", "osaka-osaka", "kyoto-kyoto"],
  港区: ["tokyo-minato", "osaka-osaka", "aichi-nagoya"],
  みなとく: ["tokyo-minato", "osaka-osaka", "aichi-nagoya"],
  中野区: ["tokyo-nakano", "nagano-nagano"],
  なかのく: ["tokyo-nakano", "nagano-nagano"],
};

function katakanaToHiragana(value: string): string {
  return value.replace(/[\u30a1-\u30f6]/g, (character) =>
    String.fromCharCode(character.charCodeAt(0) - 0x60),
  );
}

export function normalizeAreaQuery(value: string): string {
  return katakanaToHiragana(value.normalize("NFKC"))
    .toLowerCase()
    .replace(/[\s\u3000・･,，.。/／\\()[\]（）「」『』]+/g, "")
    .trim();
}

function prefectureName(location: SignageLocation): string {
  return location.regionName.split(/\s+/)[0] ?? location.regionName;
}

function municipalityName(location: SignageLocation): string {
  return location.regionName.split(/\s+/)[1] ?? location.regionName;
}

function removeAdministrativeSuffix(value: string): string {
  if (value === "北海道") return value;
  return value.replace(/[都道府県市区町村]$/u, "");
}

function verifiedNameForms(value: VerifiedCityWard): string[] {
  return [...new Set([
    value.canonical,
    removeAdministrativeSuffix(value.canonical),
    value.reading,
    value.reading.replace(/[しく]$/u, ""),
  ])];
}

function candidateFor(
  location: SignageLocation,
  level: AreaResolutionLevel,
): OfficialAreaCandidate {
  const prefecture = prefectureName(location);
  const municipality = municipalityName(location);
  const isTokyoWard = location.prefectureIso === "JP-13";
  return {
    id: location.id,
    label: location.label,
    prefectureIso: location.prefectureIso,
    resolutionLevel: level,
    resolutionLabel:
      level === "prefecture"
        ? `${prefecture} → ${location.label}を代表地点として表示`
        : isTokyoWard
          ? `${municipality} → 東京都区部の警報と東京都の暑さ指数を表示`
          : `${municipality} → ${prefecture}の警戒区域と代表地点の気象を表示`,
    scopeLabel: isTokyoWard
      ? "環境省WBGTは東京都内提供地点、気象警報は選択区を対象"
      : `環境省WBGTは${prefecture}内提供地点、気象値は${municipality}の代表座標を対象`,
  };
}

function buildAliases(): AliasEntry[] {
  const aliases: AliasEntry[] = [];
  const add = (
    alias: string | undefined,
    areaId: string,
    level: AreaResolutionLevel,
  ) => {
    if (!alias) return;
    const normalized = normalizeAreaQuery(alias);
    if (!normalized) return;
    aliases.push({ alias: normalized, areaId, level });
  };

  for (const location of signageLocations) {
    const municipality = municipalityName(location);
    add(location.regionName, location.id, "municipality");
    add(location.label, location.id, "municipality");
    add(municipality, location.id, "municipality");
    add(removeAdministrativeSuffix(municipality), location.id, "municipality");
    for (const reading of CAPITAL_READINGS[location.id] ?? []) {
      add(reading, location.id, "municipality");
    }
    for (const reading of TOKYO_WARD_READINGS[location.id] ?? []) {
      add(reading, location.id, "municipality");
    }
  }

  const prefectureLocations = new Map<string, SignageLocation>();
  for (const [prefectureIso, areaId] of Object.entries(
    PREFECTURE_REPRESENTATIVE,
  )) {
    const location = getSignageLocationById(areaId);
    if (location) prefectureLocations.set(prefectureIso, location);
  }
  for (const [prefectureIso, location] of prefectureLocations) {
    const prefecture = prefectureName(location);
    add(prefecture, location.id, "prefecture");
    add(removeAdministrativeSuffix(prefecture), location.id, "prefecture");
    for (const reading of PREFECTURE_READINGS[prefectureIso] ?? []) {
      add(reading, location.id, "prefecture");
    }
  }

  for (const [alias, areaIds] of Object.entries(AMBIGUOUS_MAJOR_WARDS)) {
    for (const areaId of areaIds) add(alias, areaId, "municipality");
  }

  for (const verified of VERIFIED_CITY_WARD_ALIASES) {
    const location = getSignageLocationById(verified.areaId);
    if (!location) continue;
    const prefectureForms = [
      prefectureName(location),
      removeAdministrativeSuffix(prefectureName(location)),
      ...(PREFECTURE_READINGS[location.prefectureIso] ?? []),
    ];
    const cityForms = verifiedNameForms(verified.city);
    for (const ward of verified.wards) {
      const wardForms = verifiedNameForms(ward);
      for (const city of cityForms) {
        for (const wardName of wardForms) {
          add(`${city}${wardName}`, verified.areaId, "municipality");
          for (const prefecture of prefectureForms) {
            add(
              `${prefecture}${city}${wardName}`,
              verified.areaId,
              "municipality",
            );
          }
        }
      }
    }
  }

  for (const city of COARSE_MAJOR_CITY_ALIASES) {
    for (const alias of city.aliases) add(alias, city.areaId, "prefecture");
  }

  return aliases;
}

const AREA_ALIASES = buildAliases();

function dedupeCandidates(entries: AliasEntry[]): OfficialAreaCandidate[] {
  const byId = new Map<string, OfficialAreaCandidate>();
  for (const entry of entries) {
    const location = getSignageLocationById(entry.areaId);
    if (!location || byId.has(entry.areaId)) continue;
    byId.set(entry.areaId, candidateFor(location, entry.level));
  }
  return [...byId.values()];
}

export function resolveOfficialAreaQuery(
  query: string,
  limit = 8,
): OfficialAreaResolution {
  const normalizedQuery = normalizeAreaQuery(query);
  if (!normalizedQuery) {
    return {
      normalizedQuery,
      exact: false,
      unique: null,
      candidates: [],
    };
  }

  const exactEntries = AREA_ALIASES.filter(
    (entry) => entry.alias === normalizedQuery,
  );
  if (exactEntries.length > 0) {
    const candidates = dedupeCandidates(exactEntries).slice(0, limit);
    return {
      normalizedQuery,
      exact: true,
      unique: candidates.length === 1 ? candidates[0] ?? null : null,
      candidates,
    };
  }

  // 未収録の市区町村でも「都道府県名＋地名」なら、その都道府県の
  // 代表地点候補へ明示解決する。市区町村の実測値とは扱わない。
  const prefectureFallbacks = Object.entries(PREFECTURE_REPRESENTATIVE).flatMap(
    ([prefectureIso, areaId]) => {
      const location = getSignageLocationById(areaId);
      if (!location) return [];
      const prefecture = prefectureName(location);
      const aliases = [
        prefecture,
        removeAdministrativeSuffix(prefecture),
        ...(PREFECTURE_READINGS[prefectureIso] ?? []),
      ].map(normalizeAreaQuery);
      return aliases.some(
        (alias) =>
          normalizedQuery.startsWith(alias) && normalizedQuery.length > alias.length,
      )
        ? [{ alias: normalizedQuery, areaId, level: "prefecture" as const }]
        : [];
    },
  );
  if (prefectureFallbacks.length) {
    const candidates = dedupeCandidates(prefectureFallbacks).slice(0, limit);
    return {
      normalizedQuery,
      // 都道府県部分だけは確認できても、後続の市区町村が辞書未収録なら
      // 実在・所属を推測しない。代表地点候補を明示し、人の選択を必須にする。
      exact: false,
      unique: null,
      candidates,
    };
  }

  if (normalizedQuery.length < 2) {
    return {
      normalizedQuery,
      exact: false,
      unique: null,
      candidates: [],
    };
  }

  const suggestions = AREA_ALIASES.filter(
    (entry) =>
      entry.alias.startsWith(normalizedQuery) ||
      entry.alias.includes(normalizedQuery),
  );
  return {
    normalizedQuery,
    exact: false,
    unique: null,
    candidates: dedupeCandidates(suggestions).slice(0, limit),
  };
}

export function isCanonicalAreaId(
  value: string | null | undefined,
): value is string {
  return Boolean(value && getSignageLocationById(value));
}

export function officialAreaCandidateById(
  areaId: string,
  level: AreaResolutionLevel = "municipality",
): OfficialAreaCandidate | null {
  const location = getSignageLocationById(areaId);
  return location ? candidateFor(location, level) : null;
}

export function officialAreaCandidateByPrefectureIso(
  prefectureIso: string,
): OfficialAreaCandidate | null {
  const areaId = PREFECTURE_REPRESENTATIVE[prefectureIso.toUpperCase()];
  return areaId ? officialAreaCandidateById(areaId, "prefecture") : null;
}
