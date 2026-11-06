import { describe,expect,it } from 'vitest';
import { changedAlerts } from './notification-events';
const first={id:'jma-JP-13-130000-2026-11-03T10:00:00+09:00',title:'東京都：警報発表中'};
describe('shared warning event identity',()=>{
  it('deduplicates the same official event and emits a clearance only on a trusted state transition',()=>{expect(changedAlerts([first],[first])).toEqual([]);expect(changedAlerts([first],[])).toMatchObject([{id:`clear:${first.id}`,clear:true}]);});
  it('does not call a newer update of the same warning a clearance',()=>{const update={...first,id:first.id.replace('10:00','11:00')};expect(changedAlerts([first],[update])).toMatchObject([{id:update.id,clear:false}]);});
});
