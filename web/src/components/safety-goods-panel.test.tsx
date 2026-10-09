import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SafetyGoodsPanel } from './safety-goods-panel';
afterEach(()=>{vi.unstubAllGlobals();window.history.replaceState(null,'','/goods');});
const directory=()=>{ const summary=screen.getByText('用品名が分かるときは、カテゴリから探す'); if (!summary.closest('details')?.open) fireEvent.click(summary); };
describe('SafetyGoodsPanel',()=>{
 it('先頭に作業の絵を置き、用品一覧は折り畳む',()=>{
  render(<SafetyGoodsPanel/>);
  expect(screen.getByRole('heading',{name:'絵から選んで、ひとつずつ確認'})).toBeDefined();
  expect(screen.getByText('用品名が分かるときは、カテゴリから探す').parentElement?.hasAttribute('open')).toBe(false);
  directory();expect(screen.getByRole('searchbox',{name:'用品名・作業から探す'})).toBeDefined();
  expect(screen.getByRole('heading',{name:'安全課題から新技術を探す'})).toBeDefined();
 });
 it('実商品未設定では写真・評価を捏造しない',async()=>{
  vi.stubGlobal('requestAnimationFrame',vi.fn());vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({status:'not_configured',items:[],checkedAt:null})}));
  render(<SafetyGoodsPanel/>);directory();fireEvent.click(screen.getByRole('button',{name:'保護帽'}));
  fireEvent.click(screen.getByRole('button',{name:/墜落時の頭部保護/}));
  expect(await screen.findByText(/商品データの接続準備中/)).toBeDefined();expect(screen.queryByText(/^★4\.\d \(/)).toBeNull();
 });
 it('分類と別名検索で目的の用品へ進む',()=>{
  render(<SafetyGoodsPanel/>);directory();
  fireEvent.click(screen.getByRole('button',{name:/現場の補助用品/}));
  expect(screen.getByRole('button',{name:'ガス検知器・酸素濃度計'})).toBeDefined();
  fireEvent.change(screen.getByRole('searchbox',{name:'用品名・作業から探す'}),{target:{value:'防塵'}});
  expect(screen.getByRole('button',{name:/防じんマスク/})).toBeDefined();
  expect(screen.queryByRole('button',{name:'ガス検知器・酸素濃度計'})).toBeNull();
 });
 it('検索語・分類・画像入口を保って戻れる',()=>{
  render(<SafetyGoodsPanel/>);directory();
  fireEvent.change(screen.getByRole('searchbox',{name:'用品名・作業から探す'}),{target:{value:'防塵'}});
  const dust=screen.getByRole('button',{name:/防じんマスク/});
  expect(dust.querySelector('img')?.getAttribute('src')).toContain('dust-mask-required.webp');fireEvent.click(dust);
  expect(window.location.search).toBe('?category=respiratory&intent=dust');
  expect(screen.getByRole('heading',{name:'どんな作業ですか？'})).toBeDefined();
  fireEvent.click(screen.getByRole('button',{name:'用品一覧に戻る'}));directory();
  expect(screen.getByRole('searchbox',{name:'用品名・作業から探す'})).toHaveProperty('value','防塵');
 });
 it.each(['fall-protection','fall-accessories','respiratory','chemical-gloves','chemical-clothing'])('%s直接URLも必要条件を迂回させない',category=>{
  window.history.replaceState(null,'','/goods?category='+category+'&intent=dust&feature=dust&conditions=confirmed&safety=oxygen,substance,concentration,mixture,emergency,supplied');
  render(<SafetyGoodsPanel/>);
  expect(screen.getByRole('heading',{name:'どんな作業ですか？'})).toBeDefined();
  expect(screen.queryByRole('link',{name:/Amazonで一般検索/})).toBeNull();
  expect(screen.queryByRole('link',{name:/楽天で一般検索/})).toBeNull();
 });
 it.each(['unknown','supplied'])('呼吸%s入口でも未知を正常と扱わない',intent=>{
  window.history.replaceState(null,'','/goods?category=respiratory&intent='+intent);
  render(<SafetyGoodsPanel/>);expect(screen.getByRole('heading',{name:'どんな作業ですか？'})).toBeDefined();
  fireEvent.click(screen.getByRole('button',{name:/何が出ているか不明/}));
  fireEvent.click(screen.getByRole('button',{name:/未確認のまま確認事項を見る/}));
  expect(screen.getByText('選定を保留・確認が必要')).toBeDefined();expect(screen.queryByRole('link',{name:/Amazon/})).toBeNull();
 });
 it('補助用品の直接リンクから一覧へ戻ると分類を保持',()=>{
  window.history.replaceState(null,'','/goods?category=gas-detectors');render(<SafetyGoodsPanel/>);
  fireEvent.click(screen.getByRole('button',{name:'用品一覧に戻る'}));
  expect(screen.getByRole('button',{name:'ガス検知器・酸素濃度計'})).toBeDefined();
  expect(screen.getByRole('button',{name:/現場の補助用品/}).getAttribute('aria-pressed')).toBe('true');
 });
});


describe('薬液ゴーグルの経路境界', () => {
 it('feature=splash 直接URLから商品APIや検索へ進めない', () => {
  const fetchMock=vi.fn();vi.stubGlobal('fetch',fetchMock);
  window.history.replaceState(null,'','/goods?category=eye-face-protection&feature=splash');
  render(<SafetyGoodsPanel/>);
  expect(screen.getByRole('heading',{name:'どんな作業ですか？'})).toBeDefined();
  expect(screen.queryByRole('link',{name:/Amazonで一般検索/})).toBeNull();
  expect(fetchMock).not.toHaveBeenCalled();
 });
 it('用品カードの薬液飛散も化学条件へ渡す', () => {
  const fetchMock=vi.fn();vi.stubGlobal('fetch',fetchMock);
  render(<SafetyGoodsPanel/>);directory();
  fireEvent.click(screen.getByRole('button',{name:'目・顔面の保護具'}));
  fireEvent.click(screen.getByRole('button',{name:/薬液の飛散/}));
  expect(screen.getByRole('heading',{name:'どんな作業ですか？'})).toBeDefined();
  expect(screen.queryByRole('link',{name:/Amazonで一般検索/})).toBeNull();
  expect(fetchMock).not.toHaveBeenCalled();
 });
});


it('用品一覧へ戻ると折り畳みを開き、元の検索と分類を保持する', () => {
 render(<SafetyGoodsPanel/>);directory();
 fireEvent.change(screen.getByRole('searchbox',{name:'用品名・作業から探す'}),{target:{value:'防塵'}});
 fireEvent.click(screen.getByRole('button',{name:/防じんマスク/}));
 fireEvent.click(screen.getByRole('button',{name:'用品一覧に戻る'}));
 expect(screen.getByText('用品名が分かるときは、カテゴリから探す').closest('details')?.open).toBe(true);
 expect(screen.getByRole('searchbox',{name:'用品名・作業から探す'})).toHaveProperty('value','防塵');
 expect(screen.getByRole('button',{name:/すべて/}).getAttribute('aria-pressed')).toBe('true');
});
