import {warningOfficeAreas} from './warning-areas.mjs';
/** Shared, dependency-free parser for the current JMA R8 snapshot (batch and runtime).
 * VPWW55–61 announce changes independently; report age is not a validity period.
 * Source: https://www.data.jma.go.jp/suishin/jyouhou/pdf/634.pdf pp.2–3.
 */
const active = new Set(['発表', '継続', '警報から注意報', '危険警報から注意報']);
const inactive = new Set(['発表警報・注意報はなし', '解除', 'なし']);
const special = new Set(['32','33','35','36','38']);
const warning = new Set(['02','03','04','05','06','07','08','43','44','45','46','48','49']);
const advisory = new Set(['10','12','13','14','15','16','17','18','19','20','21','22','23','24','25','26','27','28','29']);
const isoDate = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/;
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const areaCode = value => typeof value === 'string' && /^\d{4,8}$/.test(value);
export function warningLevel(code) {
  return special.has(code) ? 'special' : warning.has(code) ? 'warning' : advisory.has(code) ? 'advisory' : null;
}
export function jmaWarningJsonCodesForIso2(iso) {
  if (iso === 'JP-01') return ['011000','012000','013000','014100','015000','016000','017000'];
  if (iso === 'JP-46') return ['460040','460100'];
  if (iso === 'JP-47') return ['471000','472000','473000','474000'];
  if (!/^JP-(0[1-9]|[1-3][0-9]|4[0-7])$/.test(iso)) return [];
  return [iso.slice(3) + '0000'];
}
export const jmaWarningJsonUrl = code => 'https://www.jma.go.jp/bosai/warning/data/r8/' + code + '.json';

/** Transport age, not Last-Modified or the last warning announcement, expires a retrieval. */
export function warningHttpIssue(headers, now = new Date()) {
  const date = headers?.get('date');
  if (!date || !Number.isFinite(Date.parse(date))) return 'unverified';
  const age = headers.get('age');
  if (age !== null && !/^\d+$/.test(age)) return 'unverified';
  const issued = Date.parse(date);
  if (issued > now.getTime() + 300000) return 'future-datetime';
  if (Math.max(0, now.getTime() - issued, Number(age ?? 0) * 1000) > 900000) return 'stale';
  return null;
}

export function inspectR8WarningSnapshot(value, now = new Date(), sourceCode) {
  if (!Array.isArray(value) || value.length === 0) return {ok:false, issue:'schema-mismatch'};
  const seen = new Set();
  const areas = [];
  const headlines = [];
  let newest;
  for (const report of value) {
    if (!record(report)) return {ok:false, issue:'schema-mismatch'};
    for (const date of [report.reportDatetime, report.controlDatetime]) {
      if (typeof date !== 'string' || !isoDate.test(date) || !Number.isFinite(Date.parse(date)) || Date.parse(date) < Date.parse('2000-01-01T00:00:00Z')) return {ok:false, issue:'abnormal-datetime'};
      if (Date.parse(date) > now.getTime() + 300000) return {ok:false, issue:'future-datetime'};
    }
    if (Math.abs(Date.parse(report.reportDatetime)-Date.parse(report.controlDatetime)) > 86400000) return {ok:false, issue:'abnormal-datetime'};
    if (typeof report.publishingOffice !== 'string' || !report.publishingOffice.trim() || (typeof report.dataTypeCode !== 'string' || !/^VPWW(5[5-9]|6[01])$/.test(report.dataTypeCode)) || seen.has(report.dataTypeCode) || !record(report.warning) || (report.infoType !== undefined && !['発表','訂正'].includes(report.infoType)) || (report.headlineText !== undefined && typeof report.headlineText !== 'string')) return {ok:false, issue:'schema-mismatch'};
    seen.add(report.dataTypeCode);
    const expected = sourceCode ? warningOfficeAreas[sourceCode] : null;
    if (sourceCode && (!expected || !Array.isArray(report.warning.class10Items) || report.warning.class10Items.length !== expected.class10.length || new Set(report.warning.class10Items.map(a=>a?.areaCode)).size !== expected.class10.length || report.warning.class10Items.some(a=>!expected.class10.includes(a?.areaCode)))) return {ok:false, issue:'schema-mismatch'};
    if (expected?.class20.length && Array.isArray(report.warning.class20Items) && report.warning.class20Items.some(a=>!expected.class20.includes(a?.areaCode))) return {ok:false, issue:'schema-mismatch'};
    const groups = [report.warning.class10Items, report.warning.class20Items];
    if (groups.some(group => group !== undefined && !Array.isArray(group))) return {ok:false, issue:'schema-mismatch'};
    const items = groups.flatMap(group => group ?? []);
    if (items.length === 0) return {ok:false, issue:'schema-mismatch'};
    for (const area of items) {
      if (!record(area) || !areaCode(area.areaCode) || (sourceCode && !area.areaCode.startsWith(sourceCode.slice(0,2))) || !Array.isArray(area.kinds) || area.kinds.length === 0) return {ok:false, issue:'schema-mismatch'};
      const warnings = [];
      for (const kind of area.kinds) {
        if (!record(kind) || typeof kind.status !== 'string' || (!active.has(kind.status) && !inactive.has(kind.status)) || (kind.code !== undefined && warningLevel(kind.code) === null) || (active.has(kind.status) && kind.code === undefined)) return {ok:false, issue:'schema-mismatch'};
        warnings.push({code:kind.code, status:kind.status});
      }
      areas.push({code:area.areaCode, warnings});
    }
    if (!newest || Date.parse(report.reportDatetime) > Date.parse(newest.reportDatetime)) newest = report;
    if (report.headlineText?.trim()) headlines.push(report.headlineText.trim());
  }
  return {ok:true, payload:{reportDatetime:newest.reportDatetime, publishingOffice:newest.publishingOffice, headlineText:[...new Set(headlines)].join(' / '), areaTypes:[{areas}]}};
}
