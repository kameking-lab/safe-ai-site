/**
 * 気象庁の警報等情報JSONで使われるコードを、人が判別できる名称へ変換する。
 * 未知コードを「安全」「該当なし」にせず、コード付き未確認として残す。
 */
const JMA_WARNING_NAMES: Readonly<Record<string, string>> = {
  "02": "暴風雪警報",
  "03": "大雨警報",
  "04": "洪水警報",
  "05": "暴風警報",
  "06": "大雪警報",
  "07": "波浪警報",
  "08": "高潮警報",
  "10": "大雨注意報",
  "12": "大雪注意報",
  "13": "風雪注意報",
  "14": "雷注意報",
  "15": "強風注意報",
  "16": "波浪注意報",
  "17": "融雪注意報",
  "18": "洪水注意報",
  "19": "高潮注意報",
  "20": "濃霧注意報",
  "21": "乾燥注意報",
  "22": "なだれ注意報",
  "23": "低温注意報",
  "24": "霜注意報",
  "25": "着氷注意報",
  "26": "着雪注意報",
  "32": "暴風雪特別警報",
  "33": "大雨特別警報",
  "35": "暴風特別警報",
  "36": "大雪特別警報",
  "37": "波浪特別警報",
  "38": "高潮特別警報",
};

export function jmaWarningName(code: string): string {
  return JMA_WARNING_NAMES[code] ?? `警報等コード${code}（名称未確認）`;
}

export function formatJmaWarning(input: {
  code: string;
  status: string;
  name?: string;
}): string {
  const name = input.name?.trim() || jmaWarningName(input.code);
  return `${name}（${input.status}・コード${input.code}）`;
}
