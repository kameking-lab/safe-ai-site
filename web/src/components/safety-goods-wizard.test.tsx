import { fireEvent, render, screen, act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SafetyGoodsWizard } from './safety-goods-wizard';
vi.mock('@/components/Analytics',()=>({trackEvent:vi.fn()}));
afterEach(()=>window.history.replaceState(null,'','/goods'));
const choose=(name:RegExp)=>fireEvent.click(screen.getByRole('button',{name}));
describe('絵から選ぶ保護具確認',()=>{
 it('最初は作業の絵6枚を表示し、未入力の商品リンクを表示しない',()=>{
  render(<SafetyGoodsWizard/>);
  expect(screen.getByRole('heading',{name:'何の作業・危険に備えますか？'})).toBeDefined();
  expect(screen.getByRole('button',{name:'高所・足場の作業'}).querySelector('img')).not.toBeNull();
  expect(screen.queryByRole('link',{name:/Amazon/})).toBeNull();
 });
 it('化学防護のSDS未確認を保持し、具体的な入手方法を表示',()=>{
  render(<SafetyGoodsWizard/>); choose(/薬液を扱う作業/); choose(/洗浄・拭取り・配管/); choose(/SDS・成分が未確認/);
  expect(screen.getByRole('heading',{name:'物質名・混合成分・濃度は分かりますか？'})).toBeDefined();
  choose(/未確認のまま確認事項を見る/);
  expect(screen.getByText('選定を保留・確認が必要')).toBeDefined();
  expect(screen.getAllByText(/希釈後の使用濃度/)[0]).toBeDefined();
  expect(screen.queryByRole('link',{name:/Amazon/})).toBeNull();
 });
 it('墜落は身長・質量・空間・取付点・救助を順に確認する',()=>{
  render(<SafetyGoodsWizard/>); choose(/高所・足場の作業/); choose(/足場・屋根・高所/); choose(/取付設備がある/);
  for(const heading of ['身長・体格に合うサイズですか？','体重＋装備の質量を照合しましたか？','落下しても下の床・障害物に届きませんか？','取付点と器具の組合せを照合しましたか？','始業前点検と救助方法を決めましたか？']) {
   expect(screen.getByRole('heading',{name:heading})).toBeDefined(); choose(/記録・資料で確認した/);
  }
  expect(screen.getByText('条件の整理が完了・適合の確認は別途必要')).toBeDefined();
  expect(screen.queryByText(/1114080N/)).toBeNull();
  choose(/ひとつ戻る/); expect(screen.getByRole('heading',{name:'始業前点検と救助方法を決めましたか？'})).toBeDefined();
  choose(/分からない・未確認/); expect(screen.getByText('選定を保留・確認が必要')).toBeDefined();
  expect(screen.queryByRole('link',{name:/Amazon/})).toBeNull();
 });
 it('呼吸は酸素18%未満の禁止を見える状態で示し、未確認は保留',()=>{
  render(<SafetyGoodsWizard/>); choose(/粉じん・ガスを吸う作業/); choose(/粉じん・研削・清掃/); choose(/換気が効いている/);
  expect(screen.getByRole('heading',{name:'酸素濃度を測りましたか？'})).toBeDefined();
  expect(screen.getByText(/酸素18%未満/)).toBeDefined();
  choose(/分からない・未確認/); choose(/未確認のまま確認事項を見る/);
  expect(screen.getByText(/不足条件が確認できるまで/)).toBeDefined();
  expect(screen.getAllByText(/酸素測定の記録/)[0]).toBeDefined();
 });
 it('ブラウザ戻るで前の質問が復元し、回答変更時は下流を破棄',()=>{
  render(<SafetyGoodsWizard/>); choose(/高所・足場の作業/); choose(/足場・屋根・高所/); choose(/取付設備がある/);
  const previous=window.history.state; choose(/記録・資料で確認した/);
  act(()=>{window.history.replaceState(previous,'','/goods');window.dispatchEvent(new PopStateEvent('popstate'));});
  expect(screen.getByRole('heading',{name:'身長・体格に合うサイズですか？'})).toBeDefined();
  choose(/分からない・未確認/); choose(/未確認のまま確認事項を見る/);
  expect(screen.getByText('選定を保留・確認が必要')).toBeDefined();
  expect(window.history.state.ppeSelection).toEqual(['fall','scaffold','anchor','unknown','result']);
  choose(/作業を選び直す/); expect(screen.getByRole('heading',{name:'何の作業・危険に備えますか？'})).toBeDefined();
  choose(/音・切粉・溶接光/); choose(/溶接・光を使う作業/); choose(/未確認のまま確認事項を見る/);
  expect(screen.getByRole('heading',{name:'作業に合う遮光面・目と顔の保護'})).toBeDefined();
 });
});


it('必須適合条件は折り畳みに入れず、詳細の確認方法だけを閉じる', () => {
 render(<SafetyGoodsWizard/>);choose(/高所・足場の作業/);choose(/足場・屋根・高所/);choose(/未確認のまま確認事項を見る/);
 const required = screen.getByRole('heading', { name: '必要な規格・適合条件' });
 expect(required.closest('details')).toBeNull();
 const mass = screen.getByText(/体重＋装備が使用可能質量以内/);
 expect(mass.closest('details')).toBeNull();
 expect(screen.getByText('詳しい確認方法・選定根拠を見る').closest('details')?.open).toBe(false);
});
