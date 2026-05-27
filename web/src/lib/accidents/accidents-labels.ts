/**
 * 事故DB 固定UIラベルの多言語辞書（Phase B P2-3・純粋）。
 *
 * chemical-ra-labels と同方式（局所辞書＋ローカルトグル）。事故DBのAI注意喚起など
 * インタラクティブ機能の固定ラベルだけを6言語化する。事故本文・AI生成文は日本語のまま
 * （将来AI翻訳併記）。確定済みの一般UI用語のみ収録（不確実な訳語は作らない）。
 */
export const ACC_LANGS = ["ja", "en", "vi", "zh", "tl", "id"] as const;
export type AccLang = (typeof ACC_LANGS)[number];

export const ACC_LANG_LABELS: Record<AccLang, string> = {
  ja: "日本語",
  en: "English",
  vi: "Tiếng Việt",
  zh: "中文",
  tl: "Tagalog",
  id: "Indonesia",
};

export interface AccLabelSet {
  aiTitle: string;
  aiDesc: string;
  industry: string;
  workContent: string;
  analyze: string;
  analyzing: string;
  dangerPoints: string;
  relatedCases: string;
  noCases: string;
  disclaimer: string;
}

const LABELS: Record<AccLang, AccLabelSet> = {
  ja: {
    aiTitle: "AI事故注意喚起",
    aiDesc: "業種・作業内容から、過去の労働災害事例の類似ケースと危険ポイント・再発防止策をAIが要約します（参考）。",
    industry: "業種を選択（任意）",
    workContent: "作業内容",
    analyze: "AIで分析する",
    analyzing: "分析中…",
    dangerPoints: "AIによる危険ポイント・再発防止策（参考）",
    relatedCases: "関連する過去の労働災害事例",
    noCases: "該当する事例が見つかりませんでした。",
    disclaimer: "※ AI出力は過去事例に基づく参考情報です。最終判断は公式情報・専門家に従ってください。",
  },
  en: {
    aiTitle: "AI Accident Alert",
    aiDesc: "From industry and task, AI summarizes similar past accidents, hazards and preventive measures (reference).",
    industry: "Select industry (optional)",
    workContent: "Task description",
    analyze: "Analyze with AI",
    analyzing: "Analyzing…",
    dangerPoints: "AI hazards & preventive measures (reference)",
    relatedCases: "Related past accidents",
    noCases: "No matching cases found.",
    disclaimer: "* AI output is reference based on past cases. Follow official info and experts for final decisions.",
  },
  vi: {
    aiTitle: "Cảnh báo tai nạn AI",
    aiDesc: "Từ ngành nghề và công việc, AI tóm tắt các vụ tai nạn tương tự, điểm nguy hiểm và biện pháp phòng ngừa (tham khảo).",
    industry: "Chọn ngành (tùy chọn)",
    workContent: "Nội dung công việc",
    analyze: "Phân tích bằng AI",
    analyzing: "Đang phân tích…",
    dangerPoints: "Điểm nguy hiểm & biện pháp phòng ngừa của AI (tham khảo)",
    relatedCases: "Các vụ tai nạn liên quan trong quá khứ",
    noCases: "Không tìm thấy vụ việc phù hợp.",
    disclaimer: "* Kết quả AI chỉ để tham khảo dựa trên vụ việc cũ. Hãy theo thông tin chính thức và chuyên gia.",
  },
  zh: {
    aiTitle: "AI事故警示",
    aiDesc: "根据行业和作业内容，AI汇总过去类似的劳动灾害案例、危险要点和再发防止对策（参考）。",
    industry: "选择行业（可选）",
    workContent: "作业内容",
    analyze: "用AI分析",
    analyzing: "分析中…",
    dangerPoints: "AI的危险要点与再发防止对策（参考）",
    relatedCases: "相关的过去劳动灾害案例",
    noCases: "未找到相符的案例。",
    disclaimer: "※ AI输出为基于过去案例的参考信息。最终判断请遵循官方信息与专家。",
  },
  tl: {
    aiTitle: "AI Babala sa Aksidente",
    aiDesc: "Mula sa industriya at gawain, binubuod ng AI ang mga katulad na aksidente, panganib at hakbang pang-iwas (gabay).",
    industry: "Pumili ng industriya (opsyonal)",
    workContent: "Nilalaman ng gawain",
    analyze: "Suriin gamit ang AI",
    analyzing: "Sinusuri…",
    dangerPoints: "Mga panganib at hakbang pang-iwas ng AI (gabay)",
    relatedCases: "Mga kaugnay na nakaraang aksidente",
    noCases: "Walang nahanap na tugmang kaso.",
    disclaimer: "* Gabay lamang ang AI batay sa nakaraang kaso. Sundin ang opisyal na impormasyon at eksperto.",
  },
  id: {
    aiTitle: "Peringatan Kecelakaan AI",
    aiDesc: "Dari industri dan pekerjaan, AI merangkum kecelakaan serupa, titik bahaya, dan tindakan pencegahan (referensi).",
    industry: "Pilih industri (opsional)",
    workContent: "Isi pekerjaan",
    analyze: "Analisis dengan AI",
    analyzing: "Menganalisis…",
    dangerPoints: "Titik bahaya & pencegahan dari AI (referensi)",
    relatedCases: "Kecelakaan terkait di masa lalu",
    noCases: "Tidak ada kasus yang cocok.",
    disclaimer: "* Output AI hanya referensi berdasarkan kasus lampau. Ikuti info resmi dan ahli.",
  },
};

export function isAccLang(v: unknown): v is AccLang {
  return typeof v === "string" && (ACC_LANGS as readonly string[]).includes(v);
}

export function accLabels(lang: string | null | undefined): AccLabelSet {
  return isAccLang(lang) ? LABELS[lang] : LABELS.ja;
}

const STORAGE_KEY = "safe-ai:accidents-lang:v1";

export function readStoredAccLang(): AccLang {
  if (typeof window === "undefined") return "ja";
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return isAccLang(v) ? v : "ja";
  } catch {
    return "ja";
  }
}

export function storeAccLang(lang: AccLang): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* 無視 */
  }
}
