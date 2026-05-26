/**
 * Phase 6: 作業内容からの決定的な推論（必要資格・点検項目）。
 * Gemini を使わず規則ベースで「無料・即時・安定」に当てる（誤提案リスク低）。
 * 予想災害・指示事項・リスク評価は Gemini（/api/meeting/suggest）側で生成する。
 */
import type { MeetingChecklistCategory } from "@/lib/meeting/schema";

const QUAL_RULES: { re: RegExp; q: string }[] = [
  { re: /(高所|足場|墜落|フルハーネス|建方|屋根)/, q: "フルハーネス型墜落制止用器具特別教育" },
  { re: /(玉掛|揚重|吊り|吊込)/, q: "玉掛け技能講習" },
  { re: /(移動式クレーン|ラフター|クローラクレーン)/, q: "移動式クレーン運転士" },
  { re: /(溶接|溶断)/, q: "アーク溶接等特別教育" },
  { re: /(フォークリフト)/, q: "フォークリフト運転技能講習" },
  { re: /(有機溶剤|塗装|防水|シンナー|接着)/, q: "有機溶剤作業主任者" },
  { re: /(電気|感電|低圧|配線|活線|受電)/, q: "低圧電気取扱業務特別教育" },
  { re: /(掘削|土留|土止|法面|根切)/, q: "地山の掘削及び土止め支保工作業主任者" },
  { re: /(足場).{0,4}(組立|解体|変更)/, q: "足場の組立て等作業主任者" },
  { re: /(バックホウ|油圧ショベル|重機|車両系)/, q: "車両系建設機械（整地等）運転技能講習" },
  { re: /(石綿|アスベスト)/, q: "石綿作業主任者" },
  { re: /(酸欠|タンク|ピット|マンホール|地下)/, q: "酸素欠乏・硫化水素危険作業主任者" },
  { re: /(型枠支保工)/, q: "型枠支保工の組立て等作業主任者" },
];

/** 作業内容から必要資格を推定（重複なし） */
export function estimateQualifications(workContent: string): string[] {
  const out = new Set<string>();
  for (const r of QUAL_RULES) if (r.re.test(workContent)) out.add(r.q);
  return [...out];
}

const CATEGORY_KEYWORDS: Record<string, RegExp> = {
  excavation: /(掘削|土留|土止|法面|根切|埋設|地山)/,
  machine: /(重機|バックホウ|ショベル|建設機械|車両系|機械)/,
  crane: /(クレーン|揚重|玉掛|吊)/,
  scaffold: /(足場|高所|外壁|建方|屋根)/,
  electric: /(電気|配線|活線|感電|仮設電源|受電)/,
  public: /(道路|歩行者|公衆|仮囲い|第三者|交通)/,
  hazmat: /(危険物|火気|溶接|溶断|塗装|有機溶剤|ガス|石綿)/,
};

/**
 * 作業文（全業者の作業内容＋機械）から該当点検カテゴリを推論し、
 * 「未設定(na)」の項目だけ「該当(ok)」候補に切り替える（user設定の ok/ng は尊重）。
 * 一般事項は常に該当。
 */
export function inferChecklist(checklist: MeetingChecklistCategory[], workText: string): MeetingChecklistCategory[] {
  return checklist.map((cat) => {
    const re = CATEGORY_KEYWORDS[cat.key];
    const matched = cat.key === "general" || (re ? re.test(workText) : false);
    if (!matched) return cat;
    return { ...cat, items: cat.items.map((it) => (it.status === "na" ? { ...it, status: "ok" as const } : it)) };
  });
}
