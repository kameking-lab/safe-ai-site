import {cleanup,render,screen} from '@testing-library/react';
import {afterEach,expect,it} from 'vitest';
import {LevelBadge} from './result-view';
import {PrintReport} from './print-report';
import {RISK_LEVEL_LABEL,RISK_LEVEL_STARS} from '@/lib/create-simple/labels';
import {assessCreateSimple} from '@/lib/create-simple/assess';
import {substanceFromOfficial,type OfficialSubstanceRecord} from '@/lib/create-simple/official';
import substances from '@/data/create-simple/substances.json';
import type {CsAssessmentInput,CsRiskLevel} from '@/lib/create-simple/types';
afterEach(cleanup);
it.each(Object.keys(RISK_LEVEL_LABEL) as CsRiskLevel[])('keeps %s distinct in text, Arabic numerals and monochrome symbols',level=>{
 const {container}=render(<LevelBadge level={level}/>);
 expect(screen.getByText(RISK_LEVEL_LABEL[level])).toBeDefined();
 expect(container.textContent).toContain(RISK_LEVEL_STARS[level]);
 expect(container.querySelector('[data-risk-level]')?.getAttribute('data-risk-level')).toBe(level);
 expect(container.textContent).not.toMatch(/[ⅠⅡⅢⅣ]/);expect(container.textContent).not.toContain('%');
});
it('prints the same labels and stars for computed levels and preserves percentage content',()=>{
 const record=substances.substances.find(r=>r[0]==='108-88-3')! as unknown as OfficialSubstanceRecord;
 const input:CsAssessmentInput={components:[{substance:substanceFromOfficial(record,1),contentPercent:100}],conditions:{productType:1,amountLevel:2,spray:false,largeArea:false,ventilation:'B',controlVelocityConfirmed:false,workingHours:8,frequencyType:'weekly',frequencyDays:5,exposureVariation:'small',contactArea:1500,glove:'none',gloveTraining:'none',processTemperature:null,ignitionSourceRemoved:false,explosiveAtmospherePrevented:false,organicOrMetalNearby:true,airOrWaterContact:true}};
 const result=assessCreateSimple(input);
 const {container}=render(<PrintReport title="洗浄作業" input={input} result={result} improvements={[]}/>);
 for(const badge of container.querySelectorAll('[data-risk-level]')){
  const level=badge.getAttribute('data-risk-level') as CsRiskLevel;
  expect(badge.textContent).toBe(RISK_LEVEL_LABEL[level]+RISK_LEVEL_STARS[level]);
 }
 expect(container.querySelectorAll('[data-risk-level]').length).toBeGreaterThan(5);
 expect(container.textContent).toContain('100%');expect(container.textContent).not.toMatch(/[ⅠⅡⅢⅣ]/);
});
