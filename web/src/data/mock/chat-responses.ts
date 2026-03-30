const keywordReplyMap: Array<{ keywords: string[]; reply: string }> = [
  {
    keywords: ["施行", "いつ", "日付", "開始"],
    reply:
      "施行日を最優先で確認し、現場ルールの切替日を朝礼資料とチェックシートに反映してください。",
  },
  {
    keywords: ["保護具", "ヘルメット", "安全帯", "マスク"],
    reply:
      "対象工程に必要な保護具を手順書へ明記し、着用確認を責任者が毎日記録する運用が有効です。",
  },
  {
    keywords: ["教育", "周知", "研修", "訓練"],
    reply:
      "改正点の要点を3つに絞って短時間教育を実施し、参加記録と理解度確認を残すと運用が安定します。",
  },
];

export function buildMockChatReply(revisionTitle: string, question: string) {
  const matched = keywordReplyMap.find(({ keywords }) =>
    keywords.some((keyword) => question.includes(keyword))
  );

  const detail = matched?.reply ?? "まずは作業手順・点検記録・責任者確認の3点を優先して見直してください。";

  return `${revisionTitle} に関するダミー回答です。${detail}`;
}
