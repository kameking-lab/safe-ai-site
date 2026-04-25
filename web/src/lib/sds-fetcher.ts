/**
 * SDS（化学物質安全データシート）の製品 → 含有成分マッピング。
 *
 * 一次データ: NITE-CHRIP（独立行政法人 製品評価技術基盤機構）公開API
 *   https://www.nite.go.jp/chem/chrip/chrip_search/cas/CasNumberList_json.json
 *   ただし NITE-CHRIP は CAS 番号→規制情報の検索が中心で、
 *   「製品名→含有成分」の API は公開されていない。
 *
 * したがって PoC では主要 10 製品を内蔵 DB で提供し、メーカー公開 SDS の
 * 含有率レンジ（例: 30-60%）を平均値で扱う。出典は SDS 改訂日と URL を必ず添える。
 *
 * 各 component は CAS 番号で mhlw-chemicals.ts 側と紐付き、濃度基準値 / GHS 分類を
 * 自動取得できる。
 */

export type SdsComponent = {
  cas: string;
  name: string;
  /** 含有率（%）— レンジの中央値 or 代表値 */
  contentPct: number;
  /** SDS 上の表記（"30-60%" など） */
  contentLabel?: string;
};

export type SdsProduct = {
  /** 内部 ID */
  id: string;
  /** 製品名（製品ラベル名） */
  productName: string;
  /** メーカー */
  manufacturer: string;
  /** 製品カテゴリ */
  category: string;
  /** 用途 */
  use: string;
  /** SDS 改訂日（YYYY-MM-DD） */
  sdsRevised: string;
  /** SDS 公式 URL */
  sdsUrl?: string;
  /** 含有成分 */
  components: SdsComponent[];
  /** 検索用キーワード（型番・別名等） */
  aliases?: string[];
};

/**
 * 主要 10 製品の内蔵 DB（PoC 用）。
 * 含有率は各社公開 SDS（最新版）の含有率レンジから中央値を採用。
 * 出典: 各メーカー公式 SDS（製品ページ参照）。最終判断は事業者責任。
 */
export const SDS_PRODUCT_DB: SdsProduct[] = [
  {
    id: "kure-556",
    productName: "KURE 5-56",
    manufacturer: "呉工業",
    category: "防錆潤滑剤",
    use: "金属の防錆・潤滑・水分除去",
    sdsRevised: "2024-03-01",
    sdsUrl: "https://www.kure.com/product/detail.php?seq=72",
    components: [
      { cas: "64742-48-9", name: "石油系炭化水素溶剤（ナフサ）", contentPct: 70, contentLabel: "60-80%" },
      { cas: "8012-95-1", name: "ミネラルオイル", contentPct: 20, contentLabel: "10-30%" },
    ],
    aliases: ["5-56", "5_56", "クレ556"],
  },
  {
    id: "ipa-99",
    productName: "イソプロピルアルコール 99%",
    manufacturer: "各社（一般工業品）",
    category: "工業用洗浄剤",
    use: "金属・電子部品の脱脂洗浄",
    sdsRevised: "2024-01-15",
    components: [
      { cas: "67-63-0", name: "2-プロパノール", contentPct: 99, contentLabel: "≥99%" },
    ],
    aliases: ["IPA", "イソプロパノール", "2-プロパノール"],
  },
  {
    id: "acetone-jis",
    productName: "アセトン JIS K 8001",
    manufacturer: "各社（一般工業品）",
    category: "有機溶剤",
    use: "塗装剥離・洗浄・希釈",
    sdsRevised: "2024-02-10",
    components: [
      { cas: "67-64-1", name: "アセトン", contentPct: 99, contentLabel: "≥99%" },
    ],
    aliases: ["アセトン", "ジメチルケトン"],
  },
  {
    id: "toluene-jis",
    productName: "トルエン 工業用",
    manufacturer: "各社（一般工業品）",
    category: "有機溶剤（第2種有機溶剤）",
    use: "塗装・希釈・接着剤",
    sdsRevised: "2024-02-10",
    components: [
      { cas: "108-88-3", name: "トルエン", contentPct: 99, contentLabel: "≥99%" },
    ],
    aliases: ["メチルベンゼン", "toluene"],
  },
  {
    id: "thinner-lacquer",
    productName: "ラッカーシンナー A種",
    manufacturer: "各社（塗料用）",
    category: "塗料用希釈剤",
    use: "ラッカー塗料の希釈・洗浄",
    sdsRevised: "2024-03-20",
    components: [
      { cas: "108-88-3", name: "トルエン", contentPct: 30, contentLabel: "20-40%" },
      { cas: "1330-20-7", name: "キシレン", contentPct: 25, contentLabel: "20-30%" },
      { cas: "67-64-1", name: "アセトン", contentPct: 15, contentLabel: "10-20%" },
      { cas: "78-93-3", name: "メチルエチルケトン", contentPct: 15, contentLabel: "10-20%" },
    ],
    aliases: ["シンナー", "ラッカー薄め液"],
  },
  {
    id: "diluted-sulfuric",
    productName: "希硫酸 35%",
    manufacturer: "各社（一般工業品）",
    category: "無機酸",
    use: "金属表面処理・電池液",
    sdsRevised: "2024-04-01",
    components: [
      { cas: "7664-93-9", name: "硫酸", contentPct: 35, contentLabel: "30-40%" },
    ],
    aliases: ["硫酸", "sulfuric acid"],
  },
  {
    id: "hcl-conc",
    productName: "塩酸 35%（工業用）",
    manufacturer: "各社（一般工業品）",
    category: "無機酸",
    use: "金属洗浄・pH 調整",
    sdsRevised: "2024-04-01",
    components: [
      { cas: "7647-01-0", name: "塩化水素", contentPct: 35, contentLabel: "35-37%" },
    ],
    aliases: ["塩酸", "塩化水素水溶液"],
  },
  {
    id: "ammonia-water-25",
    productName: "アンモニア水 25%",
    manufacturer: "各社（一般工業品）",
    category: "無機塩基",
    use: "pH 調整・洗浄",
    sdsRevised: "2024-04-01",
    components: [
      { cas: "7664-41-7", name: "アンモニア", contentPct: 25, contentLabel: "25-28%" },
    ],
    aliases: ["アンモニア", "アンモニア水"],
  },
  {
    id: "formalin-37",
    productName: "ホルマリン 37%",
    manufacturer: "各社（試薬グレード）",
    category: "防腐剤・標本固定液",
    use: "病理標本固定・防腐",
    sdsRevised: "2024-02-15",
    components: [
      { cas: "50-00-0", name: "ホルムアルデヒド", contentPct: 37, contentLabel: "35-37%" },
      { cas: "67-56-1", name: "メタノール", contentPct: 10, contentLabel: "8-15%" },
    ],
    aliases: ["ホルマリン", "ホルムアルデヒド水溶液"],
  },
  {
    id: "benzene-jis",
    productName: "ベンゼン 試薬",
    manufacturer: "各社（試薬グレード）",
    category: "特定第二類物質（特化則）",
    use: "研究・分析用",
    sdsRevised: "2024-03-10",
    components: [
      { cas: "71-43-2", name: "ベンゼン", contentPct: 99, contentLabel: "≥99%" },
    ],
    aliases: ["ベンゼン", "benzene"],
  },
];

function normalize(s: string): string {
  return s
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[\s\u3000_-]/g, "")
    .toLowerCase();
}

export type SdsSearchResult = {
  hits: SdsProduct[];
  source: "internal-db" | "nite-chrip";
};

/**
 * NITE-CHRIP からの製品検索（実装スタブ）。
 * 公式 API は CAS→規制で、製品名→成分の検索は提供されていない。
 * したがって null を返し、内蔵 DB にフォールバックする。
 */
async function searchNiteChrip(_productName: string, _manufacturer?: string): Promise<SdsProduct[] | null> {
  return null;
}

export async function searchProducts(
  productName: string,
  manufacturer?: string,
  limit = 5
): Promise<SdsSearchResult> {
  const niteHits = await searchNiteChrip(productName, manufacturer);
  if (niteHits && niteHits.length > 0) {
    return { hits: niteHits.slice(0, limit), source: "nite-chrip" };
  }

  const q = normalize(productName);
  const m = manufacturer ? normalize(manufacturer) : "";
  if (!q) return { hits: [], source: "internal-db" };

  const scored = SDS_PRODUCT_DB.map((p) => {
    let score = 0;
    const pn = normalize(p.productName);
    if (pn === q) score += 100;
    else if (pn.startsWith(q)) score += 50;
    else if (pn.includes(q)) score += 25;
    for (const a of p.aliases ?? []) {
      const an = normalize(a);
      if (an === q) score += 80;
      else if (an.includes(q)) score += 15;
    }
    if (m) {
      const mm = normalize(p.manufacturer);
      if (mm.includes(m)) score += 20;
    }
    return { p, score };
  })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  return { hits: scored.slice(0, limit).map((s) => s.p), source: "internal-db" };
}
