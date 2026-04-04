import type { LawRevisionCore } from "@/lib/types/domain";

type Template = Omit<LawRevisionCore, "id" | "publishedAt" | "revisionNumber">;

const templates: Template[] = [
  {
    title: "墜落制止用器具の使用義務の明確化",
    kind: "ordinance",
    category: "省令",
    issuer: "厚生労働省",
    summary: "6.75m超の高所作業ではフルハーネス型を原則義務化。選定基準・点検記録の保存期間を明文化し、胴ベルト型の使用範囲を限定。",
    source: { url: "https://www.mhlw.go.jp/", label: "厚生労働省" },
  },
  {
    title: "酸素欠乏危険場所における換気設備の基準見直し",
    kind: "notice",
    category: "通達",
    issuer: "厚生労働省",
    summary: "密閉空間作業前の換気時間を最低30分に延長。ガス濃度測定の頻度を2時間ごとから1時間ごとへ短縮。記録様式を統一。",
    source: { url: "https://www.mhlw.go.jp/", label: "厚生労働省" },
  },
  {
    title: "電気設備工事における停電作業手順の統一通知",
    kind: "notice",
    category: "通達",
    issuer: "厚生労働省 労働基準局",
    summary: "停電範囲図の更新タイミングを作業前必須に。検電記録の様式を統一し、復電前の複数確認を義務化。",
    source: { url: "https://www.mhlw.go.jp/", label: "労働基準局" },
  },
  {
    title: "熱中症予防のための休憩時間算定ガイドライン",
    kind: "guideline",
    category: "ガイドライン",
    issuer: "厚生労働省",
    summary: "WBGT 28℃超で15分/時の休憩、31℃超で20分/時を目安に設定。作業強度に応じた段階的な休憩基準を提示。",
    source: { url: "https://www.mhlw.go.jp/", label: "厚生労働省" },
  },
  {
    title: "足場の組立て等作業主任者の選任要件の整理",
    kind: "law",
    category: "労働安全衛生法",
    issuer: "厚生労働省",
    summary: "主任者講習の受講記録管理の強化と現場での権限範囲を明確化。つり足場・張出し足場の点検基準を追加。",
    source: { url: "https://www.mhlw.go.jp/", label: "厚生労働省" },
  },
  {
    title: "石綿含有建材の除去作業における届出義務の拡大",
    kind: "law",
    category: "労働安全衛生法",
    issuer: "厚生労働省",
    summary: "解体・改修工事前のアスベスト事前調査を義務化。レベル3建材の除去にも作業計画の届出が必要に。",
    source: { url: "https://www.mhlw.go.jp/", label: "厚生労働省" },
  },
  {
    title: "化学物質管理のリスクアセスメント義務の強化",
    kind: "ordinance",
    category: "省令",
    issuer: "厚生労働省",
    summary: "SDS交付義務対象物質を674物質から900以上に拡大。自律的な化学物質管理への転換を推進。",
    source: { url: "https://www.mhlw.go.jp/", label: "厚生労働省" },
  },
  {
    title: "建設業における週休2日制の推進指針",
    kind: "guideline",
    category: "ガイドライン",
    issuer: "国土交通省",
    summary: "公共工事の適正な工期設定と週休2日の確保に向けた指針。過労死防止の観点から労働時間管理を強化。",
    source: { url: "https://www.mlit.go.jp/", label: "国土交通省" },
  },
  {
    title: "クレーン等の定期自主検査指針の改正",
    kind: "notice",
    category: "通達",
    issuer: "厚生労働省",
    summary: "天井クレーン・移動式クレーンの年次検査項目に疲労亀裂検査を追加。検査記録の電子保存を認可。",
    source: { url: "https://www.mhlw.go.jp/", label: "厚生労働省" },
  },
  {
    title: "溶接ヒュームの規制強化",
    kind: "ordinance",
    category: "省令",
    issuer: "厚生労働省",
    summary: "溶接ヒュームを特定化学物質に追加。屋内溶接作業では個人ばく露測定の実施と呼吸用保護具の使用を義務化。",
    source: { url: "https://www.mhlw.go.jp/", label: "厚生労働省" },
  },
  {
    title: "一人親方等の安全衛生対策ガイドライン",
    kind: "guideline",
    category: "ガイドライン",
    issuer: "厚生労働省",
    summary: "労働者でない一人親方等にも保護措置を講じるよう注文者に求めるガイドライン。特殊健診相当の健康管理推奨。",
    source: { url: "https://www.mhlw.go.jp/", label: "厚生労働省" },
  },
  {
    title: "高年齢労働者の安全と健康確保のためのガイドライン（エイジフレンドリーガイドライン）",
    kind: "guideline",
    category: "ガイドライン",
    issuer: "厚生労働省",
    summary: "60歳以上の労働者に対し、体力測定に基づく作業内容の調整や転倒防止対策の強化を事業者に求める。",
    source: { url: "https://www.mhlw.go.jp/", label: "厚生労働省" },
  },
  {
    title: "ドローン活用による建設現場の安全巡視ガイドライン",
    kind: "guideline",
    category: "ガイドライン",
    issuer: "国土交通省",
    summary: "ドローンによる安全巡視の許可要件と飛行ルールを整備。高所・危険箇所の遠隔確認を推進。",
    source: { url: "https://www.mlit.go.jp/", label: "国土交通省" },
  },
  {
    title: "建設業の時間外労働の上限規制の適用",
    kind: "law",
    category: "労働安全衛生法",
    issuer: "厚生労働省",
    summary: "2024年4月から建設業にも時間外労働の上限規制を適用。年720時間・月100時間未満を法定化。",
    source: { url: "https://www.mhlw.go.jp/", label: "厚生労働省" },
  },
  {
    title: "安全衛生優良企業の公表制度の拡充",
    kind: "notice",
    category: "通達",
    issuer: "厚生労働省",
    summary: "安全衛生優良企業公表制度の認定基準を見直し。ICT活用による安全管理の取組みを評価項目に追加。",
    source: { url: "https://www.mhlw.go.jp/", label: "厚生労働省" },
  },
];

export function buildDecadeLawRevisionMocks(): LawRevisionCore[] {
  const out: LawRevisionCore[] = [];
  let seq = 1;
  for (let year = 2016; year <= 2026; year += 1) {
    const count = year >= 2022 ? templates.length : Math.min(8, templates.length);
    for (let idx = 0; idx < count; idx += 1) {
      const t = templates[idx];
      const month = String((idx % 12) + 1).padStart(2, "0");
      const day = String(5 + (idx % 20)).padStart(2, "0");
      out.push({
        ...t,
        id: `lr-decade-${year}-${seq}`,
        publishedAt: `${year}-${month}-${day}`,
        revisionNumber: `令和/平成換算 ${year}年 第${seq}号`,
      });
      seq += 1;
    }
  }
  return out;
}
