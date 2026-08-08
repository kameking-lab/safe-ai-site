export type ForkliftQueryIntent = {
  hasForkliftContext: boolean;
  qualification: boolean;
  speed: boolean;
  annualInspection: boolean;
  monthlyInspection: boolean;
  genericInspection: boolean;
  offPurposeUse: boolean;
  workLeader: boolean;
};

function normalizeForkliftQuery(query: string): string {
  return query
    .normalize("NFKC")
    .replace(/フォー?クリフ卜/g, "フォークリフト")
    .replace(/スピード/g, "速度")
    .replace(/点[険檢]/g, "点検")
    .replace(/主用途外/g, "用途外")
    .replace(/\s+/g, "");
}

/**
 * フォークリフトの資格意図と運用意図を、検索・回答で同じ規則により判定する。
 * 同義語展開で追加された「技能講習」等は資格意図に使わず、設備文脈だけに使う。
 */
export function detectForkliftQueryIntent(
  explicitQuery: string,
  expandedQuery = explicitQuery,
): ForkliftQueryIntent {
  const explicit = normalizeForkliftQuery(explicitQuery);
  const expanded = normalizeForkliftQuery(expandedQuery);
  const hasForkliftContext =
    /フォークリフト/.test(expanded) ||
    /(?:リーチリフト|カウンターリフト)/.test(explicit) ||
    /フォーク(?:の|を|に|で|へ|乗|資格|免許|速度)/.test(explicit);

  if (!hasForkliftContext) {
    return {
      hasForkliftContext: false,
      qualification: false,
      speed: false,
      annualInspection: false,
      monthlyInspection: false,
      genericInspection: false,
      offPurposeUse: false,
      workLeader: false,
    };
  }

  const qualification =
    /(?:資格|免許|技能講習|特別教育|特教|講習|教育|就業制限)/.test(
      explicit,
    ) ||
    /(?:運転|操作)(?:したい|でき(?:る|ます)?|するには|に必要)/.test(
      explicit,
    ) ||
    /乗(?:るには|りたい|れる|っていい)/.test(explicit);
  const speed = /速度/.test(explicit);
  const monthlyInspection =
    /(?:月次(?:自主)?(?:検査|点検)|月例(?:検査|点検)|(?:毎月|月1回|1月(?:に)?1回|一月(?:に)?一回|一か月(?:以内|ごと)|一ヶ月(?:以内|ごと))[^。！？]{0,16}(?:自主検査|検査|点検)|(?:自主検査|検査|点検)[^。！？]{0,16}(?:毎月|月1回|1月(?:に)?1回|一月(?:に)?一回|一か月(?:以内|ごと)|一ヶ月(?:以内|ごと)))/.test(
      explicit,
    );
  const annualInspection =
    /(?:年次(?:自主)?(?:検査|点検)|(?:年1回|1年(?:に)?1回|一年(?:に)?一回|毎年|一年(?:以内|ごと))[^。！？]{0,16}(?:自主検査|検査|点検)|(?:自主検査|検査|点検)[^。！？]{0,16}(?:年1回|1年(?:に)?1回|一年(?:に)?一回|毎年|一年(?:以内|ごと)))/.test(
      explicit,
    );
  const genericInspection =
    !monthlyInspection &&
    !annualInspection &&
    /(?:定期自主検査|定期(?:検査|点検)|自主検査)/.test(explicit);
  const offPurposeUse =
    /(?:主たる用途|用途外)/.test(explicit) ||
    (/(?:人|作業者|労働者)/.test(explicit) &&
      /(?:パレット|フォーク|爪)/.test(explicit) &&
      /(?:乗せ|持ち上げ|運搬)/.test(explicit));
  const workLeader =
    /(?:作業(?:の)?指揮者|作業指揮者|指揮(?:を)?する人|指揮する者|指揮役)/.test(
      explicit,
    );

  return {
    hasForkliftContext,
    qualification,
    speed,
    annualInspection,
    monthlyInspection,
    genericInspection,
    offPurposeUse,
    workLeader,
  };
}
