/**
 * サイネージ表示の固定UIラベル多言語辞書（Phase C / 軸7 P1-4）。
 *
 * 方針: 全サイト i18n 化（URL変更を伴う）は行わず、朝礼サイネージ画面の「固定ラベルだけ」を
 * 辞書で多言語化する局所アプローチ。KY本文（作業内容・危険箇所・対策）は職長入力の日本語のまま
 * （本文のAI翻訳併記は P2）。建設現場に多い外国人技能実習生・特定技能者が、危険の見出しを
 * 自分の言語で把握できることを狙う。純粋関数なのでユニットテストで全言語を担保する。
 */

/** 対応言語コード。ja を既定とする。 */
export const SIGNAGE_LANGS = ["ja", "en", "vi", "zh", "tl", "id"] as const;
export type SignageLang = (typeof SIGNAGE_LANGS)[number];

/** 言語トグルに出す表示名（その言語の自称表記）。 */
export const SIGNAGE_LANG_LABELS: Record<SignageLang, string> = {
  ja: "日本語",
  en: "English",
  vi: "Tiếng Việt",
  zh: "中文",
  tl: "Tagalog",
  id: "Indonesia",
};

/** サイネージ画面で使う固定ラベルの集合。 */
export interface SignageLabelSet {
  signageTitle: string;
  backToEdit: string;
  mainWork: string;
  workPlace: string;
  riskTop3: string;
  /** リスク評価値（可能性×重大性）チップのラベル */
  riskScore: string;
  countermeasure: string;
  notEntered: string;
  teamGoal: string;
  pointingCall: string;
  chantCountdown: string;
  chantReady: string;
  chantStart: string;
  chantStop: string;
  chantGo: string;
  noData: string;
  fullscreen: string;
  exitFullscreen: string;
  print: string;
}

const LABELS: Record<SignageLang, SignageLabelSet> = {
  ja: {
    signageTitle: "KY 朝礼サイネージ表示",
    backToEdit: "← KY編集に戻る",
    mainWork: "本日の主な作業",
    workPlace: "場所",
    riskTop3: "本日のリスク Top3",
    riskScore: "評価値",
    countermeasure: "対策",
    notEntered: "（未入力）",
    teamGoal: "本日の行動目標",
    pointingCall: "指差呼称",
    chantCountdown: "唱和カウントダウン",
    chantReady: "準備ができたら開始してください。",
    chantStart: "開始",
    chantStop: "停止",
    chantGo: "唱和！本日もご安全に！",
    noData: "KYデータが見つかりません",
    fullscreen: "全画面",
    exitFullscreen: "全画面解除",
    print: "印刷",
  },
  en: {
    signageTitle: "Morning Safety (KY) Signage",
    backToEdit: "← Back to KY",
    mainWork: "Today's Main Work",
    workPlace: "Location",
    riskTop3: "Top 3 Risks Today",
    riskScore: "Risk score",
    countermeasure: "Control",
    notEntered: "(not entered)",
    teamGoal: "Today's Safety Goal",
    pointingCall: "Pointing & Calling",
    chantCountdown: "Chant Countdown",
    chantReady: "Press start when ready.",
    chantStart: "Start",
    chantStop: "Stop",
    chantGo: "Chant! Stay safe today!",
    noData: "No KY data found",
    fullscreen: "Fullscreen",
    exitFullscreen: "Exit fullscreen",
    print: "Print",
  },
  vi: {
    signageTitle: "Bảng họp sáng an toàn (KY)",
    backToEdit: "← Quay lại KY",
    mainWork: "Công việc chính hôm nay",
    workPlace: "Địa điểm",
    riskTop3: "3 rủi ro hàng đầu hôm nay",
    riskScore: "Điểm rủi ro",
    countermeasure: "Biện pháp",
    notEntered: "(chưa nhập)",
    teamGoal: "Mục tiêu an toàn hôm nay",
    pointingCall: "Chỉ tay và hô",
    chantCountdown: "Đếm ngược hô khẩu hiệu",
    chantReady: "Sẵn sàng thì nhấn bắt đầu.",
    chantStart: "Bắt đầu",
    chantStop: "Dừng",
    chantGo: "Hô to! Hôm nay an toàn nhé!",
    noData: "Không tìm thấy dữ liệu KY",
    fullscreen: "Toàn màn hình",
    exitFullscreen: "Thoát toàn màn hình",
    print: "In",
  },
  zh: {
    signageTitle: "KY 早会安全看板",
    backToEdit: "← 返回 KY",
    mainWork: "今日主要作业",
    workPlace: "地点",
    riskTop3: "今日风险 Top3",
    riskScore: "风险值",
    countermeasure: "对策",
    notEntered: "（未填写）",
    teamGoal: "今日行动目标",
    pointingCall: "手指口呼",
    chantCountdown: "齐声倒计时",
    chantReady: "准备好后请点击开始。",
    chantStart: "开始",
    chantStop: "停止",
    chantGo: "齐声！今日也请安全第一！",
    noData: "未找到 KY 数据",
    fullscreen: "全屏",
    exitFullscreen: "退出全屏",
    print: "打印",
  },
  tl: {
    signageTitle: "KY Morning Safety Signage",
    backToEdit: "← Bumalik sa KY",
    mainWork: "Pangunahing Gawain Ngayon",
    workPlace: "Lugar",
    riskTop3: "Top 3 na Panganib Ngayon",
    riskScore: "Antas ng panganib",
    countermeasure: "Panukala",
    notEntered: "(walang laman)",
    teamGoal: "Layunin sa Kaligtasan Ngayon",
    pointingCall: "Pagturo at Pagsigaw",
    chantCountdown: "Countdown ng Sigaw",
    chantReady: "Pindutin ang start kapag handa na.",
    chantStart: "Simula",
    chantStop: "Tigil",
    chantGo: "Sigaw! Mag-ingat ngayon!",
    noData: "Walang nakitang KY data",
    fullscreen: "Fullscreen",
    exitFullscreen: "Lumabas sa fullscreen",
    print: "I-print",
  },
  id: {
    signageTitle: "Papan Apel Pagi K3 (KY)",
    backToEdit: "← Kembali ke KY",
    mainWork: "Pekerjaan Utama Hari Ini",
    workPlace: "Lokasi",
    riskTop3: "3 Risiko Teratas Hari Ini",
    riskScore: "Skor risiko",
    countermeasure: "Tindakan",
    notEntered: "(belum diisi)",
    teamGoal: "Sasaran Keselamatan Hari Ini",
    pointingCall: "Tunjuk dan Seru",
    chantCountdown: "Hitung Mundur Seruan",
    chantReady: "Tekan mulai bila siap.",
    chantStart: "Mulai",
    chantStop: "Berhenti",
    chantGo: "Seru! Tetap selamat hari ini!",
    noData: "Data KY tidak ditemukan",
    fullscreen: "Layar penuh",
    exitFullscreen: "Keluar layar penuh",
    print: "Cetak",
  },
};

/** 言語コードがサポート対象か。 */
export function isSignageLang(v: unknown): v is SignageLang {
  return typeof v === "string" && (SIGNAGE_LANGS as readonly string[]).includes(v);
}

/** 指定言語のラベル集合を返す（未対応・未指定は ja にフォールバック）。 */
export function signageLabels(lang: string | null | undefined): SignageLabelSet {
  return isSignageLang(lang) ? LABELS[lang] : LABELS.ja;
}
