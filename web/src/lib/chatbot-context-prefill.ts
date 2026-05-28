/**
 * P1-3完: 他機能（KY・打合せ書・化学物質RA・事故DB）からチャットボットへの双方向動線。
 *
 * /chatbot?context=ky&work=外壁塗装 / ?context=meeting&substance=トルエン のような
 * 文脈パラメータを、自然な質問文にプリフィルする。?q= が無い場合のみ使用。
 *
 * 設計: 純関数。UI 非依存でテスト可能。出力は「質問文」であり、現場に何かをさせる
 * 指示ではない（中核コンセプト遵守）。
 */

export type ChatbotContextParams = {
  context?: string | null;
  work?: string | null;
  substance?: string | null;
  industry?: string | null;
};

function clean(v: string | null | undefined): string {
  return (v ?? "").trim().slice(0, 60);
}

/**
 * 文脈パラメータから 1 つの質問文を組み立てる。該当が無ければ null。
 * 優先度: substance > work(+context) > industry。
 */
export function buildContextPrefill(params: ChatbotContextParams): string | null {
  const substance = clean(params.substance);
  const work = clean(params.work);
  const industry = clean(params.industry);
  const ctx = clean(params.context);

  if (substance) {
    return `${substance}を取り扱う作業の法規制（特化則・有機則・安衛則のばく露低減措置等）と、事業者が講ずべき措置・関連条文を教えてください。`;
  }

  if (work) {
    switch (ctx) {
      case "ky":
        return `「${work}」の作業について、労働安全衛生法令上で必要な措置・資格・点検と、根拠となる関連条文を教えてください。`;
      case "meeting":
        return `「${work}」に関する打合せで確認すべき労働安全衛生法令上の義務と、根拠となる関連条文を教えてください。`;
      case "accidents":
        return `「${work}」の作業で多い労働災害と、その防止のための関連条文・最低限の措置を教えてください。`;
      default:
        return `「${work}」の作業に関係する労働安全衛生法令と、事業者が講ずべき措置・関連条文を教えてください。`;
    }
  }

  if (industry) {
    return `${industry}で特に注意すべき労働安全衛生法令上の義務と、根拠となる関連条文を教えてください。`;
  }

  return null;
}
