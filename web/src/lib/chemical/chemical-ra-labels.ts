/**
 * 化学物質RA 固定UIラベルの多言語辞書（Phase B P1-4・純粋）。
 *
 * 方針: サイト共通の language-context は現在 ja 限定の NOOP（多言語は将来のSSR-localeレイヤーへ移行予定）。
 * そのため、サイネージで確立した「局所辞書＋ローカルトグル」方式を踏襲し、化学物質RAの新規
 * インタラクティブ機能（SDS取込み等）の固定ラベルだけを6言語化する。物質名・SDS本文・AI生成文・
 * 法令解説は日本語のまま（将来AI翻訳併記）。不確実な訳語は作らず、確定済みの一般UI用語のみ収録。
 */

export const CHEM_LANGS = ["ja", "en", "vi", "zh", "tl", "id"] as const;
export type ChemLang = (typeof CHEM_LANGS)[number];

export const CHEM_LANG_LABELS: Record<ChemLang, string> = {
  ja: "日本語",
  en: "English",
  vi: "Tiếng Việt",
  zh: "中文",
  tl: "Tagalog",
  id: "Indonesia",
};

export interface ChemSdsLabelSet {
  sdsTitle: string;
  sdsDesc: string;
  dropHint: string;
  fileHint: string;
  reading: string;
  ghs: string;
  physical: string;
  laws: string;
  handling: string;
  measures: string;
  runRa: string;
  seeRegs: string;
  aiDisclaimer: string;
}

const SDS: Record<ChemLang, ChemSdsLabelSet> = {
  ja: {
    sdsTitle: "SDS取込み（PDF/画像をAIが自動読み取り）",
    sdsDesc: "手元のSDSをドロップすると、物質名・CAS・GHS分類・取扱注意・適用法令・対策をAIが抽出します（参考）。",
    dropHint: "SDSファイルをここにドロップ / クリックで選択",
    fileHint: "PDF・PNG・JPEG・WebP（約6MBまで）",
    reading: "AIがSDSを読み取っています…",
    ghs: "GHS分類",
    physical: "物理化学的性質",
    laws: "適用法令(参考)",
    handling: "取扱注意",
    measures: "対策",
    runRa: "この物質でRAを実施",
    seeRegs: "全法律の規制を見る",
    aiDisclaimer: "※ 抽出結果はAIによる参考情報です。正確な内容は公式SDS・最新法令・専門家の指導に従ってください。",
  },
  en: {
    sdsTitle: "SDS Import (AI reads PDF/image)",
    sdsDesc: "Drop your SDS and AI extracts substance name, CAS, GHS, handling, applicable laws and controls (reference).",
    dropHint: "Drop SDS file here / click to select",
    fileHint: "PDF, PNG, JPEG, WebP (up to ~6MB)",
    reading: "AI is reading the SDS…",
    ghs: "GHS classification",
    physical: "Physical/chemical properties",
    laws: "Applicable laws (ref.)",
    handling: "Handling notes",
    measures: "Controls",
    runRa: "Run RA for this substance",
    seeRegs: "See all regulations",
    aiDisclaimer: "* AI-extracted reference only. Follow the official SDS, latest law and experts for accuracy.",
  },
  vi: {
    sdsTitle: "Nhập SDS (AI đọc PDF/ảnh)",
    sdsDesc: "Thả SDS vào, AI trích xuất tên chất, CAS, phân loại GHS, lưu ý, luật áp dụng và biện pháp (tham khảo).",
    dropHint: "Thả tệp SDS vào đây / nhấp để chọn",
    fileHint: "PDF, PNG, JPEG, WebP (tối đa ~6MB)",
    reading: "AI đang đọc SDS…",
    ghs: "Phân loại GHS",
    physical: "Tính chất hóa lý",
    laws: "Luật áp dụng (tham khảo)",
    handling: "Lưu ý xử lý",
    measures: "Biện pháp",
    runRa: "Thực hiện RA cho chất này",
    seeRegs: "Xem tất cả quy định",
    aiDisclaimer: "* Kết quả AI chỉ để tham khảo. Hãy tuân theo SDS chính thức, luật mới nhất và chuyên gia.",
  },
  zh: {
    sdsTitle: "SDS导入（AI自动识别PDF/图片）",
    sdsDesc: "拖入SDS，AI将提取物质名称、CAS、GHS分类、注意事项、适用法律和对策（参考）。",
    dropHint: "将SDS文件拖到此处 / 点击选择",
    fileHint: "PDF、PNG、JPEG、WebP（约6MB以内）",
    reading: "AI正在读取SDS…",
    ghs: "GHS分类",
    physical: "物理化学性质",
    laws: "适用法律（参考）",
    handling: "操作注意",
    measures: "对策",
    runRa: "对该物质实施风险评估",
    seeRegs: "查看全部法规",
    aiDisclaimer: "※ 提取结果为AI参考信息。准确内容请遵循官方SDS、最新法律和专家指导。",
  },
  tl: {
    sdsTitle: "SDS Import (binabasa ng AI ang PDF/larawan)",
    sdsDesc: "I-drop ang SDS at kukunin ng AI ang pangalan, CAS, GHS, paalala, batas at hakbang (gabay lamang).",
    dropHint: "I-drop ang SDS dito / i-click para pumili",
    fileHint: "PDF, PNG, JPEG, WebP (hanggang ~6MB)",
    reading: "Binabasa ng AI ang SDS…",
    ghs: "Klasipikasyon ng GHS",
    physical: "Pisikal/kemikal na katangian",
    laws: "Naaangkop na batas (gabay)",
    handling: "Paalala sa paghawak",
    measures: "Mga hakbang",
    runRa: "Magsagawa ng RA para dito",
    seeRegs: "Tingnan lahat ng regulasyon",
    aiDisclaimer: "* Gabay lamang mula sa AI. Sundin ang opisyal na SDS, pinakabagong batas at eksperto.",
  },
  id: {
    sdsTitle: "Impor SDS (AI membaca PDF/gambar)",
    sdsDesc: "Jatuhkan SDS dan AI akan mengekstrak nama zat, CAS, GHS, perhatian, hukum, dan tindakan (referensi).",
    dropHint: "Jatuhkan file SDS di sini / klik untuk memilih",
    fileHint: "PDF, PNG, JPEG, WebP (hingga ~6MB)",
    reading: "AI sedang membaca SDS…",
    ghs: "Klasifikasi GHS",
    physical: "Sifat fisik/kimia",
    laws: "Hukum yang berlaku (ref.)",
    handling: "Perhatian penanganan",
    measures: "Tindakan",
    runRa: "Lakukan RA untuk zat ini",
    seeRegs: "Lihat semua regulasi",
    aiDisclaimer: "* Hasil AI hanya referensi. Ikuti SDS resmi, hukum terbaru, dan ahli.",
  },
};

export function isChemLang(v: unknown): v is ChemLang {
  return typeof v === "string" && (CHEM_LANGS as readonly string[]).includes(v);
}

/** 指定言語のSDSパネル用ラベル集合（未対応・未指定は ja）。 */
export function chemSdsLabels(lang: string | null | undefined): ChemSdsLabelSet {
  return isChemLang(lang) ? SDS[lang] : SDS.ja;
}

const STORAGE_KEY = "safe-ai:chemical-lang:v1";

/** 保存済み表示言語を読む（無効・未設定は ja）。 */
export function readStoredChemLang(): ChemLang {
  if (typeof window === "undefined") return "ja";
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return isChemLang(v) ? v : "ja";
  } catch {
    return "ja";
  }
}

/** 表示言語を保存（失敗は無視）。 */
export function storeChemLang(lang: ChemLang): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* 無視 */
  }
}
