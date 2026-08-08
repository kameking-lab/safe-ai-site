export type HighLiftQueryIntent = {
  hasHighLiftContext: boolean;
  qualification: boolean;
  fallProtection: boolean;
};

function normalize(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[\s　、。,!?！？・「」『』（）()]/g, "");
}

/**
 * Separate high-lift qualification questions from work-platform fall-protection
 * questions. Expanded search terms are accepted only for equipment context;
 * the user's explicit wording remains authoritative for the requested duty.
 */
export function detectHighLiftQueryIntent(
  explicitQuery: string,
  contextualQuery = explicitQuery,
): HighLiftQueryIntent {
  const explicit = normalize(explicitQuery);
  const contextual = normalize(contextualQuery);
  const hasHighLiftContext = /(?:高所作業車|高作車|こうしょ作業車)/.test(
    contextual,
  );

  if (!hasHighLiftContext) {
    return {
      hasHighLiftContext: false,
      qualification: false,
      fallProtection: false,
    };
  }

  const fallProtection =
    /(?:安全帯|墜落制止用器具|要求性能墜落制止用器具|フルハーネス|ハーネス)/.test(
      explicit,
    ) ||
    /作業床.*(?:着用|装着|取り付け|取付け|使う|使用させる|使用義務)/.test(
      explicit,
    );
  const qualification =
    /(?:資格|免許|技能講習|特別教育|特教|講習|教育|就業制限)/.test(
      explicit,
    ) ||
    /(?:運転|操作)(?:したい|でき(?:る|ます)?|するには|に必要)/.test(
      explicit,
    );

  return { hasHighLiftContext, qualification, fallProtection };
}
