import type { SmallBusinessStep } from "@/types/mental-health";

/**
 * Simplified stress-check rollout track for workplaces under 50 regular
 * employees, where the program is an effort-duty (努力義務).
 *
 * The track emphasises:
 * - Outsourcing to the local Sanpo Center (地域産業保健センター) — free of
 *   charge for sub-50 workplaces and the only realistic path to a qualified
 *   implementer for many small employers.
 * - Reusing the standard MHLW 57-item simplified questionnaire so that the
 *   implementer can score results in a standard way.
 * - Skipping the labour-inspection-office reporting that would apply only to
 *   the mandatory tier, while keeping privacy and high-stress interview
 *   safeguards intact.
 *
 * Estimated days are calendar days, not business days, and assume the Sanpo
 * Center has reasonable lead time. Real schedules will vary by region.
 */
export const SMALL_BUSINESS_STEPS: SmallBusinessStep[] = [
  {
    no: 1,
    title: "実施意思決定と社内周知",
    body: "経営層が年1回のストレスチェック実施を決定。趣旨（メンタル不調の早期発見と職場環境改善）と任意受検である旨を、朝礼・社内掲示・チャットで周知する。",
    estimatedDays: 7,
  },
  {
    no: 2,
    title: "さんぽセンターへの相談予約",
    body: "地域産業保健センター（さんぽセンター）の窓口に連絡し、ストレスチェック実施支援の申込書を取得。事業場規模・業種・実施希望時期を伝える。",
    externalResource: "地域産業保健センター（全国350箇所超）",
    estimatedDays: 14,
  },
  {
    no: 3,
    title: "実施者・実施事務従事者の確定",
    body: "さんぽセンターから派遣される医師・保健師を実施者として指名。社内の人事・総務担当者を実施事務従事者として指名し、結果データの取扱権限を限定する。",
    externalResource: "さんぽセンター登録医師・保健師",
    estimatedDays: 21,
  },
  {
    no: 4,
    title: "調査票の選定と配布準備",
    body: "厚労省『職業性ストレス簡易調査票』(57項目)、または短縮版(23項目)を採用。紙配布・Webフォーム（厚労省『こころの耳』提供）から自社運用に合うものを選択。",
    estimatedDays: 28,
  },
  {
    no: 5,
    title: "受検期間の設定と実施",
    body: "おおむね2週間の受検期間を設定。受検は勤務時間内・自宅持帰り・休憩時間内のいずれでも可。未提出者への督促は実施事務従事者経由で行う。",
    estimatedDays: 49,
  },
  {
    no: 6,
    title: "結果通知と高ストレス者への案内",
    body: "実施者が結果を本人へ直接通知。高ストレス者には医師面接指導の申出方法を併せて案内。事業者は集計値（受検率・高ストレス者率）のみを受領する。",
    estimatedDays: 60,
  },
  {
    no: 7,
    title: "申出受付と医師面接の調整",
    body: "面接申出を受けたら、さんぽセンター登録医師による無料面接を予約。50人未満事業場は無料利用可。面接実施日は申出からおおむね1ヶ月以内を目安。",
    externalResource: "さんぽセンター（無料医師面接）",
    estimatedDays: 90,
  },
  {
    no: 8,
    title: "事後措置の検討と実施",
    body: "面接実施医師から意見書を受領し、就業上の措置（時間外労働制限・配置転換等）を本人と協議のうえ決定。措置の実施状況は3ヶ月後に再確認する。",
    estimatedDays: 120,
  },
  {
    no: 9,
    title: "記録の保存と次年度準備",
    body: "ストレスチェック結果・面接記録・事後措置記録を5年間保存。労基署への報告は努力義務範囲では不要。次年度の実施時期・改善点を衛生委員会または労使代表で確認。",
    estimatedDays: 365,
  },
];

/**
 * Alternative resources beyond the local Sanpo Center that sub-50 workplaces
 * routinely use. Listed in order of typical fit for the smallest workplaces.
 */
export const SMALL_BUSINESS_ALTERNATIVES = [
  {
    label: "産業保健総合支援センター（さんぽセンター）",
    body: "全国都道府県47箇所＋地域窓口350箇所超。50人未満事業場は無料で医師面接・産業保健相談を利用可。",
    recommendedFor: "10人未満〜49人の事業場",
  },
  {
    label: "外部EAP（従業員支援プログラム）契約",
    body: "民間EAP事業者と契約し、ストレスチェック実施・カウンセリング・職場復帰支援を包括的に外部委託する。",
    recommendedFor: "30〜49人で予算確保が可能な事業場",
  },
  {
    label: "業界団体・健康保険組合のサービス",
    body: "建設業労働災害防止協会・全国健康保険協会等、業界別の支援メニューに無料／低額のストレスチェック実施支援が含まれる場合がある。",
    recommendedFor: "業界団体に加入している事業場",
  },
  {
    label: "嘱託産業医による単発支援",
    body: "嘱託産業医がいる事業場は、年1回の事業場巡視に合わせてストレスチェックを実施。実施事務は内部の担当者が担う。",
    recommendedFor: "嘱託産業医のいる30〜49人事業場",
  },
];
