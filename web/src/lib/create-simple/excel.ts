/**
 * CREATE-SIMPLE（Excel VBA）の数値処理を JavaScript で同じ結果にするための関数群。
 *
 * - Excel の ROUNDDOWN は、値をいったん有効数字15桁に丸めてから切り捨てる
 *   （例: ROUNDDOWN(0.049999999999999996, 4) = 0.05）。Excel 本体で確認済み
 *   （web/scripts/create-simple/oracle.py は ROUNDDOWN/LOG を Excel COM で呼んで検証データを作っている）。
 * - VBA の CInt は「偶数丸め」（銀行家の丸め）。
 */

/** 有効数字15桁の仮数（整数文字列15桁）と指数を返す。x は 0 以外の有限値。 */
function decimal15(x: number): { digits: string; exponent: number; negative: boolean } {
  const negative = x < 0;
  const [mantissa, exp] = Math.abs(x).toExponential(14).split("e");
  return {
    digits: mantissa.replace(".", ""),
    exponent: Number(exp),
    negative,
  };
}

/** Excel の WorksheetFunction.RoundDown(x, digits) と同じ値を返す。 */
export function excelRoundDown(x: number, digits: number): number {
  if (!Number.isFinite(x)) throw new RangeError("ROUNDDOWN: 有限の数値ではありません");
  if (x === 0) return 0;
  const { digits: m, exponent, negative } = decimal15(x);
  const sign = negative ? "-" : "";
  // x ≒ m × 10^(exponent-14)
  const shift = exponent - 14 + digits;
  if (shift >= 0) return Number(`${sign}${m}e${exponent - 14}`);
  const drop = -shift;
  if (drop >= m.length) return 0;
  return Number(`${sign}${m.slice(0, m.length - drop)}e${-digits}`);
}

/** Excel の LOG(x)（底10）。値を有効数字15桁にそろえてから計算する。 */
export function excelLog10(x: number): number {
  if (!(x > 0)) throw new RangeError("LOG: 正の数ではありません");
  return Math.log10(Number(x.toPrecision(15)));
}

/** RoundDown(x, base - Int(Log(Abs(x))))。base=2 で有効数字3桁、3 で4桁の切り捨て。 */
export function roundDownSignificant(x: number, base: number): number {
  return excelRoundDown(x, base - Math.floor(excelLog10(Math.abs(x))));
}

/** VBA の CInt（偶数丸め）。 */
export function vbCInt(x: number): number {
  const floor = Math.floor(x);
  const diff = x - floor;
  if (diff > 0.5) return floor + 1;
  if (diff < 0.5) return floor;
  return floor % 2 === 0 ? floor : floor + 1;
}
