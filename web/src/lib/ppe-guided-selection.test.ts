import { describe, expect, it } from 'vitest';
import { CATEGORIES, TASKS, CONDITIONS, getPpeQuestions, getPpeResult, getPpeDirectoryRoute } from './ppe-guided-selection';

describe('一次資料に基づく保護具の確認境界', () => {
 it('未入力では種類や適合を決めない', () => {
  expect(getPpeResult([])).toBeNull(); expect(getPpeResult(['respiratory'])).toBeNull();
  const result=getPpeResult(['respiratory','dust']);
  expect(result?.blocked).toBe(true); expect(result?.query).toBeUndefined();
  expect(result?.pending).toHaveLength(7);
 });
 for (const category of CATEGORIES) {
  for (const task of TASKS[category.id] ?? []) {
   for (const condition of CONDITIONS[category.id] ?? []) {
    it(category.id+'/'+task.id+'/'+condition.id+' の条件と停止境界を維持',()=>{
     const questions=getPpeQuestions(category.id);
     const answers=[category.id,task.id,condition.id,...questions.map(()=> 'confirmed')];
     const result=getPpeResult(answers);
     const baseStop=category.id==='respiratory'&&(task.id==='unknown'||task.id==='confined'||condition.id==='oxygen')||category.id==='fall'&&condition.id==='no-anchor'||category.id==='chemical'&&condition.id==='no-sds';
     expect(result?.blocked).toBe(baseStop);
     expect(result?.title).not.toMatch(/Sサイズ|1114080|6001|DS2/);
     expect(result?.officialHref).toMatch(/^https:\/\//);
     if(baseStop) expect(result?.query).toBeUndefined();
     for(let i=0;i<questions.length;i++) {
      for(const value of ['unknown','unsafe']) {
       const incomplete=[...answers]; incomplete[i+3]=value;
       const pending=getPpeResult(incomplete);
       expect(pending?.blocked).toBe(true); expect(pending?.query).toBeUndefined();
       expect(pending?.missing).toContain(questions[i].check);
      }
     }
    });
   }
  }
 }
 it('SDSだけで化学適合、酸素18%以上だけで呼吸適合を断定しない',()=>{
  expect(getPpeResult(['chemical','contact','sds'])?.blocked).toBe(true);
  expect(getPpeResult(['respiratory','dust','ventilated','confirmed'])?.blocked).toBe(true);
  expect(getPpeQuestions('chemical').map(q=>q.check).join(' ')).toContain('耐浸透');
  expect(getPpeQuestions('respiratory').map(q=>q.check).join(' ')).toContain('オイルミスト');
  expect(getPpeQuestions('fall').map(q=>q.check).join(' ')).toContain('身長');
  expect(getPpeQuestions('fall').map(q=>q.check).join(' ')).toContain('装備');
 });
});


describe('査読で確認した停止理由と購入経路', () => {
 it.each(['unknown', 'confined'])('呼吸 %s は他の回答が確認済みでも独立した停止理由を残す', task => {
  const result = getPpeResult(['respiratory', task, 'ventilated', ...getPpeQuestions('respiratory').map(() => 'confirmed')]);
  expect(result?.blocked).toBe(true);
  expect(result?.query).toBeUndefined();
  expect(result?.missing.join(' ')).toMatch(task === 'unknown' ? /特定できていません.*SDS.*ばく露濃度/ : /酸欠・有害ガス.*測定.*換気.*監視.*救助/);
  expect(result?.missing).not.toContain('局所排気や十分な換気がある');
 });
 it('薬液飛散の直リンクを条件確認へ渡し、耐衝撃の入口は維持する', () => {
  expect(getPpeDirectoryRoute('eye-face-protection', 'splash')).toBe('chemical');
  expect(getPpeDirectoryRoute('eye-face-protection', 'impact')).toBeUndefined();
 });
 it.each(['respiratory', 'fall', 'chemical'])('%s の必須規格条件を結果に持つ', category => {
  const task = TASKS[category][0].id;
  const result = getPpeResult([category, task]);
  expect(result?.importantConditions.length).toBeGreaterThan(0);
 });
});
