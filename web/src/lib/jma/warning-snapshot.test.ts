import {warningOfficeAreas} from './warning-areas.mjs';
import {describe,expect,it} from 'vitest';
import {inspectR8WarningSnapshot,warningHttpIssue} from './warning-snapshot.mjs';
import {isCurrentJmaWarningRegion} from './jma-region-trust';
const now=new Date('2026-10-11T04:00:00Z');
const report={controlDatetime:'2026-10-01T00:00:00Z',reportDatetime:'2026-10-01T09:00:00+09:00',publishingOffice:'気象庁',dataTypeCode:'VPWW55',warning:{class20Items:[{areaCode:'1310400',kinds:[{status:'発表警報・注意報はなし'}]}]}};
describe('current warning snapshot validation',()=>{
 it.each(['011000','460040','471000'])('rejects a different office within the same prefecture %s',source=>{
  const wrong=source==='011000'?'014100':source==='460040'?'460100':'472000';
  const data={...report,warning:{class10Items:warningOfficeAreas[wrong].class10.map(areaCode=>({areaCode,kinds:[{status:'発表警報・注意報はなし'}]}))}};
  expect(inspectR8WarningSnapshot([data],now,wrong).ok).toBe(true);
  expect(inspectR8WarningSnapshot([data],now,source)).toEqual({ok:false,issue:'schema-mismatch'});
 });
 it('does not double-count the same 10 minutes in Date and Age',()=>expect(warningHttpIssue(new Headers({date:'Sun, 11 Oct 2026 03:50:00 GMT',age:'600'}),now)).toBeNull());
 it('future Date cannot cancel an expired Age',()=>expect(warningHttpIssue(new Headers({date:'Sun, 11 Oct 2026 04:04:00 GMT',age:'901'}),now)).toBe('stale'));
 it('runtime cache time cannot renew a 14-minute-old HTTP snapshot',()=>{
  const data={fetchedAt:now.toISOString(),byIso:{'JP-13':{level:'none' as const,sourceStatus:'live' as const,sourceFetchedAt:now.toISOString(),entries:[{sourceCode:'130000',sourceHttpDate:'Sun, 11 Oct 2026 03:46:00 GMT',sourceHttpAgeSeconds:840,level:'none' as const,headline:null,reportDatetime:report.reportDatetime,publishingOffice:'気象庁',warnings:[]}]}}};
  expect(isCurrentJmaWarningRegion(data,'JP-13',now)).toBe(true);
  expect(isCurrentJmaWarningRegion(data,'JP-13',new Date(now.getTime()+120000))).toBe(false);
 });
 it('old last announcements are current-state data, not expired forecasts',()=>expect(inspectR8WarningSnapshot([report],now).ok).toBe(true));
 it('wrong prefecture is not accepted as no warning',()=>expect(inspectR8WarningSnapshot([report],now,'040000')).toEqual({ok:false,issue:'schema-mismatch'}));
 it.each([[report,report],[{...report,dataTypeCode:'VPWW99'}],[{...report,infoType:'取消'}],[{...report,warning:{class20Items:[]}}]].map(value=>({value})))('rejects duplicated, unknown, cancelled or empty reports %#',({value})=>expect(inspectR8WarningSnapshot(value,now).ok).toBe(false));
 it.each([{date:now.toUTCString(),age:'invalid'},{date:'invalid'},{}, {date:now.toUTCString(),age:'901'},{date:'Sun, 11 Oct 2026 05:00:00 GMT'}] as Array<Record<string,string>>)('rejects unverified, expired or future HTTP metadata %#',headers=>expect(warningHttpIssue(new Headers(headers),now)).not.toBeNull());
 it('Last-Modified does not substitute for HTTP confirmation or announcement time',()=>expect(warningHttpIssue(new Headers({date:now.toUTCString(),age:'60','last-modified':'Thu, 28 May 2026 01:16:00 GMT'}),now)).toBeNull());
});
