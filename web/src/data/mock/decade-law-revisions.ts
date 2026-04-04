import type { LawRevisionCore } from "@/lib/types/domain";
import { LAW_SOURCE_HUB } from "@/data/mock/law-source-hubs";

type Template = Omit<LawRevisionCore, "id" | "publishedAt" | "revisionNumber">;

const templates: Template[] = [
  {
    title: "墜落制止用器具の使用義務の明確化",
    kind: "ordinance",
    category: "省令",
    issuer: "厚生労働省",
    summary: "6.75m超の高所作業ではフルハーネス型を原則義務化。選定基準・点検記録の保存期間を明文化し、胴ベルト型の使用範囲を限定。",
    source: {
      url: LAW_SOURCE_HUB.egovRousho,
      label: "e-Gov 法令（労働安全衛生法）",
    },
  },
  {
    title: "酸素欠乏危険場所における換気設備の基準見直し",
    kind: "notice",
    category: "通達",
    issuer: "厚生労働省",
    summary: "密閉空間作業前の換気時間を最低30分に延長。ガス濃度測定の頻度を2時間ごとから1時間ごとへ短縮。記録様式を統一。",
    source: {
      url: LAW_SOURCE_HUB.mhlwRoudou,
      label: "厚生労働省 労働政策（法令等はここから）",
    },
  },
  {
    title: "電気設備工事における停電作業手順の統一通知",
    kind: "notice",
    category: "通達",
    issuer: "厚生労働省 労働基準局",
    summary: "停電範囲図の更新タイミングを作業前必須に。検電記録の様式を統一し、復電前の複数確認を義務化。",
    source: {
      url: LAW_SOURCE_HUB.mhlwRoudou,
      label: "厚生労働省 労働政策（安全衛生はここから）",
    },
  },
  {
    title: "熱中症予防のための休憩時間算定ガイドライン",
    kind: "guideline",
    category: "ガイドライン",
    issuer: "厚生労働省",
    summary: "WBGT 28℃超で15分/時の休憩、31℃超で20分/時を目安に設定。作業強度に応じた段階的な休憩基準を提示。",
    source: {
      url: LAW_SOURCE_HUB.mhlwRoudou,
      label: "厚生労働省 労働政策（熱中症関連はここから）",
    },
  },
  {
    title: "足場の組立て等作業主任者の選任要件の整理",
    kind: "law",
    category: "労働安全衛生法",
    issuer: "厚生労働省",
    summary: "主任者講習の受講記録管理の強化と現場での権限範囲を明確化。つり足場・張出し足場の点検基準を追加。",
    source: {
      url: LAW_SOURCE_HUB.egovRousho,
      label: "e-Gov 法令（労働安全衛生法）",
    },
  },
  {
    title: "石綿含有建材の除去作業における届出義務の拡大",
    kind: "law",
    category: "労働安全衛生法",
    issuer: "厚生労働省",
    summary: "解体・改修工事前のアスベスト事前調査を義務化。レベル3建材の除去にも作業計画の届出が必要に。",
    source: {
      url: LAW_SOURCE_HUB.mhlwRoudou,
      label: "厚生労働省 労働政策（化学物質・アスベストはここから）",
    },
  },
  {
    title: "化学物質管理のリスクアセスメント義務の強化",
    kind: "ordinance",
    category: "省令",
    issuer: "厚生労働省",
    summary: "SDS交付義務対象物質を674物質から900以上に拡大。自律的な化学物質管理への転換を推進。",
    source: {
      url: LAW_SOURCE_HUB.mhlwRoudou,
      label: "厚生労働省 労働政策（化学物質等）",
    },
  },
  {
    title: "建設業における週休2日制の推進指針",
    kind: "guideline",
    category: "ガイドライン",
    issuer: "国土交通省",
    summary: "公共工事の適正な工期設定と週休2日の確保に向けた指針。過労死防止の観点から労働時間管理を強化。",
    source: {
      url: "https://www.mlit.go.jp/construction/",
      label: "国土交通省 建設業",
    },
  },
  {
    title: "クレーン等の定期自主検査指針の改正",
    kind: "notice",
    category: "通達",
    issuer: "厚生労働省",
    summary: "天井クレーン・移動式クレーンの年次検査項目に疲労亀裂検査を追加。検査記録の電子保存を認可。",
    source: {
      url: LAW_SOURCE_HUB.mhlwRoudou,
      label: "厚生労働省 労働政策（安全衛生）",
    },
  },
  {
    title: "溶接ヒュームの規制強化",
    kind: "ordinance",
    category: "省令",
    issuer: "厚生労働省",
    summary: "溶接ヒュームを特定化学物質に追加。屋内溶接作業では個人ばく露測定の実施と呼吸用保護具の使用を義務化。",
    source: {
      url: LAW_SOURCE_HUB.mhlwRoudou,
      label: "厚生労働省 労働政策（化学物質・溶接ヒューム等）",
    },
  },
  {
    title: "一人親方等の安全衛生対策ガイドライン",
    kind: "guideline",
    category: "ガイドライン",
    issuer: "厚生労働省",
    summary: "労働者でない一人親方等にも保護措置を講じるよう注文者に求めるガイドライン。特殊健診相当の健康管理推奨。",
    source: {
      url: LAW_SOURCE_HUB.mhlwRoudou,
      label: "厚生労働省 労働政策（安全衛生）",
    },
  },
  {
    title: "高年齢労働者の安全と健康確保のためのガイドライン（エイジフレンドリーガイドライン）",
    kind: "guideline",
    category: "ガイドライン",
    issuer: "厚生労働省",
    summary: "60歳以上の労働者に対し、体力測定に基づく作業内容の調整や転倒防止対策の強化を事業者に求める。",
    source: {
      url: LAW_SOURCE_HUB.mhlwRoudou,
      label: "厚生労働省 労働政策",
    },
  },
  {
    title: "ドローン活用による建設現場の安全巡視ガイドライン",
    kind: "guideline",
    category: "ガイドライン",
    issuer: "国土交通省",
    summary: "ドローンによる安全巡視の許可要件と飛行ルールを整備。高所・危険箇所の遠隔確認を推進。",
    source: {
      url: "https://www.mlit.go.jp/construction/",
      label: "国土交通省 建設業",
    },
  },
  {
    title: "建設業の時間外労働の上限規制の適用",
    kind: "law",
    category: "労働安全衛生法",
    issuer: "厚生労働省",
    summary: "2024年4月から建設業にも時間外労働の上限規制を適用。年720時間・月100時間未満を法定化。",
    source: {
      url: LAW_SOURCE_HUB.egovRodoKijun,
      label: "e-Gov 法令（労働基準法）",
    },
  },
  {
    title: "安全衛生優良企業の公表制度の拡充",
    kind: "notice",
    category: "通達",
    issuer: "厚生労働省",
    summary: "安全衛生優良企業公表制度の認定基準を見直し。ICT活用による安全管理の取組みを評価項目に追加。",
    source: {
      url: LAW_SOURCE_HUB.mhlwRousai,
      label: "厚生労働省 労災保険・安全衛生",
    },
  },
  // 告示レベル
  {
    title: "粉じん障害防止規則の一部を改正する省令の施行について（告示）",
    kind: "other",
    category: "告示",
    issuer: "厚生労働省",
    summary: "特定粉じん作業の範囲拡大に伴い、呼吸用保護具の選定・管理基準を告示として制定。フィットテスト実施の義務付け。",
    source: {
      url: LAW_SOURCE_HUB.mhlwRoudou,
      label: "厚生労働省 労働政策（粉じん対策）",
    },
  },
  {
    title: "有機溶剤中毒予防規則の管理濃度に関する告示改正",
    kind: "other",
    category: "告示",
    issuer: "厚生労働省",
    summary: "トルエン・キシレン等15物質の管理濃度を最新の知見に基づき改定。測定機器の精度基準も告示で明記。",
    source: {
      url: LAW_SOURCE_HUB.mhlwRoudou,
      label: "厚生労働省 労働政策（化学物質）",
    },
  },
  {
    title: "特化則第2類物質の許容濃度告示改正（鉛化合物等）",
    kind: "other",
    category: "告示",
    issuer: "厚生労働省",
    summary: "鉛・クロム・マンガン化合物の許容濃度を国際基準に合わせて引き下げ。血中鉛濃度の健康診断基準も改定。",
    source: {
      url: LAW_SOURCE_HUB.mhlwRoudou,
      label: "厚生労働省 労働政策（特定化学物質）",
    },
  },
  {
    title: "石綿則に基づく作業の届出様式の改正（告示）",
    kind: "other",
    category: "告示",
    issuer: "厚生労働省",
    summary: "アスベスト含有建材の事前調査結果報告様式を改正。電子申請フォームへの対応と添付書類の統一化を実施。",
    source: {
      url: LAW_SOURCE_HUB.mhlwRoudou,
      label: "厚生労働省 労働政策（石綿対策）",
    },
  },
  // 追加通達
  {
    title: "建設現場における熱中症予防対策の徹底について（通達）",
    kind: "notice",
    category: "通達",
    issuer: "厚生労働省 労働基準局長",
    summary: "WBGT測定器の設置・記録義務と、熱中症発症時の救護体制の整備を事業者に求める。水分・塩分補給の基準を明記。",
    source: {
      url: LAW_SOURCE_HUB.mhlwRoudou,
      label: "厚生労働省 労働政策（熱中症）",
    },
  },
  {
    title: "足場からの墜落防止に関する技術指針の改定通達",
    kind: "notice",
    category: "通達",
    issuer: "厚生労働省 安全衛生部長",
    summary: "足場組立・解体時の先行手すり方式の導入を強く推奨。段差・開口部への覆い・手すりの二段設置基準を明確化。",
    source: {
      url: LAW_SOURCE_HUB.mhlwRoudou,
      label: "厚生労働省 労働政策（足場・墜落防止）",
    },
  },
  {
    title: "重機による労働災害防止に関する通達（建設機械安全指針）",
    kind: "notice",
    category: "通達",
    issuer: "厚生労働省 労働基準局長",
    summary: "バックホウ・クレーン等の誘導員配置基準を更新。重機の死角・接触リスクへの対策として立入禁止区域設定を義務化。",
    source: {
      url: LAW_SOURCE_HUB.mhlwRoudou,
      label: "厚生労働省 労働政策（建設機械）",
    },
  },
  {
    title: "ロックアウト・タグアウト実施のための指針通達",
    kind: "notice",
    category: "通達",
    issuer: "厚生労働省 安全衛生部",
    summary: "機械設備の保全・修理・清掃作業時のエネルギー隔離手順（LOTO）を標準化。手順書の作成・掲示を義務化。",
    source: {
      url: LAW_SOURCE_HUB.mhlwRoudou,
      label: "厚生労働省 労働政策（機械安全）",
    },
  },
  {
    title: "作業環境測定の方法及び結果の記録に関する指針（指針公示）",
    kind: "guideline",
    category: "指針",
    issuer: "厚生労働省",
    summary: "有機溶剤・特定化学物質の作業環境測定の実施頻度・測定点の設定方法・記録保存年数を指針として整理。",
    source: {
      url: LAW_SOURCE_HUB.mhlwRoudou,
      label: "厚生労働省 労働政策（作業環境）",
    },
  },
  {
    title: "個人サンプリング法による化学物質のばく露評価指針",
    kind: "guideline",
    category: "指針",
    issuer: "厚生労働省",
    summary: "個人ばく露測定の採用を推奨する指針。リスクアセスメント結果の活用と測定業者の要件を明確化。",
    source: {
      url: LAW_SOURCE_HUB.mhlwRoudou,
      label: "厚生労働省 労働政策（化学物質管理）",
    },
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
