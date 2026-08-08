import type { ConcentrationLimitEntry } from "@/lib/mhlw-chemicals";
import type { AccidentCase } from "@/lib/types/domain";

const OFFICIAL_CHEMICAL_HOSTS = new Set([
  "anzeninfo.mhlw.go.jp",
  "www.nite.go.jp",
  "nite.go.jp",
  "www.chem-info.nite.go.jp",
  "www.env.go.jp",
]);

function isOfficialHttpsUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && OFFICIAL_CHEMICAL_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

/** CAS Registry Number のチェック桁を検証する。 */
export function isValidCasNumber(cas: string): boolean {
  if (!/^\d{2,7}-\d{2}-\d$/.test(cas)) return false;
  const digits = cas.replaceAll("-", "");
  let sum = 0;
  for (let index = 0; index < digits.length - 1; index += 1) {
    sum += Number(digits[index]) * (digits.length - 1 - index);
  }
  return sum % 10 === Number(digits.at(-1));
}

/**
 * 個別化学物質ページを index / sitemap 対象にできる最低品質。
 *
 * 名前とCASだけの薄いレコードは対象外にし、公式参照先と、濃度・GHS・法規制の
 * いずれかの独自表示要素があるものに限定する。ページ自体は参照用に残す。
 */
export function isIndexableChemical(
  cas: string,
  entry: ConcentrationLimitEntry,
): boolean {
  const hasIdentity = isValidCasNumber(cas) && Boolean(entry.name?.trim());
  const hasOfficialReference = [
    entry.mhlwSdsUrl,
    entry.niteChripUrl,
    entry.prtrUrl,
  ].some(isOfficialHttpsUrl);
  const hasSubstantiveContent = Boolean(
    entry.twa ||
      entry.stel ||
      entry.ceiling ||
      entry.carcinogenicity ||
      entry.niteGhsClassifications ||
      entry.regulationTags?.length,
  );
  return hasIdentity && hasOfficialReference && hasSubstantiveContent;
}

/**
 * 事故個票の公開品質境界。
 *
 * 2026-07-24監査で、ローカル本文と同じjoho_noの厚労省個票が一致しない
 * 系統的破損を確認した。URLの形式や本文長だけでは一次資料一致を証明できないため、
 * URL・タイトル・事故型・業種・死傷・本文hashを再ETLして独立照合するまで全件を
 * index / sitemap / 関連表示からfail-closedで除外する。
 */
export function isIndexableAccident(_accident: AccidentCase): boolean {
  return false;
}
