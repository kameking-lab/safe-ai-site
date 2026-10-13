import { expect, test } from "@playwright/test";

const cases=[
 {slug:"excavation-backfill",select:"shape",mode:"pipe-trench",field:"outerDiameter",heading:"埋戻し施工体積",value:"8.29"},
 {slug:"curb-quantity",field:"runM",heading:"必要な縁石",value:"17"},
 {slug:"sealant-quantity",field:"widthMm",heading:"必要な容器",value:"59"},
 {slug:"slope-angle-length",select:"mode",mode:"face-area",field:"height",heading:"法面積",value:"54.08"},
 {slug:"aggregate-base-quantity",select:"mode",mode:"two-layers",field:"stoneThickness",heading:"砕石の施工体積（締固め後）",value:"1.5"},
];
for(const width of [390,1440])for(const spec of cases)test(`${spec.slug}/${spec.mode??"new"} at ${width}px keeps blank, example, reactive output and exports`,async({page})=>{
 await page.setViewportSize({width,height:900});
 const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
 const response=await page.goto(`/tools/construction-calculators/${spec.slug}`);
 expect(response?.status()).toBe(200);
 await expect(page.getByRole('button',{name:'例の数字で試す'})).toBeEnabled();
 if(spec.select)await page.locator(`#construction-calculator-${spec.select}`).selectOption(spec.mode!);
 const input=page.locator(`#construction-calculator-${spec.field}`);
 await expect(input).toHaveValue("");
 await expect(page.locator('#calculation-result-title')).toHaveCount(0);
 await page.getByRole('button',{name:'例の数字で試す'}).click();
 await expect(page.locator('#calculation-result-title')).toBeVisible();
 const result=page.locator('#calculation-result-title').locator('..');
 await expect(result.getByText(spec.heading,{exact:true}).locator('..')).toContainText(spec.value);
 await page.locator('svg [role="button"]').first().press('Space');
 expect(await page.evaluate(()=>document.activeElement?.id)).toMatch(/^construction-calculator-/);
 await input.fill("");await expect(page.locator('#calculation-result-title')).toHaveCount(0);
 await page.getByRole('button',{name:'例の数字で試す'}).click();
 await expect(page.locator('#calculation-result-title')).toBeVisible();
 await page.getByRole('button',{name:'計算する',exact:true}).click();
 await expect(page.getByRole('button',{name:'入力を復元'})).toHaveCount(1);
 const csv=page.waitForEvent('download');await page.getByRole('button',{name:'CSV',exact:true}).click();expect((await csv).suggestedFilename()).toMatch(/\.csv$/);
 await page.getByRole('button',{name:/入力をリセット/}).click();
 await expect(page.locator('#calculation-result-title')).toHaveCount(0);
 expect(await page.locator('form input[type="number"]').evaluateAll(inputs=>inputs.every(input=>(input as HTMLInputElement).value===''))).toBe(true);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 expect(errors).toEqual([]);
});

test('requested boundary values and distinct correction/delivery modes update visibly',async({page})=>{
 await page.goto('/tools/construction-calculators/curb-quantity');await page.getByRole('button',{name:'例の数字で試す'}).click();
 const result=()=>page.locator('#calculation-result-title').locator('..');
 const set=async(key:string,value:string)=>page.locator('#construction-calculator-'+key).fill(value);
 await set('runM','6.09');await expect(result().getByText('必要な縁石',{exact:true}).locator('..')).toContainText('10本');
 await set('runM','6.091');await expect(result().getByText('必要な縁石',{exact:true}).locator('..')).toContainText('11本');
 await page.locator('#construction-calculator-mode').selectOption('effective-module');await set('productLengthM','2');await set('runM','10');
 await expect(page.locator('#construction-calculator-jointM')).toHaveCount(0);await expect(result().getByText('必要な縁石',{exact:true}).locator('..')).toContainText('5本');
 await page.goto('/tools/construction-calculators/sealant-quantity');await page.getByRole('button',{name:'例の数字で試す'}).click();
 await page.locator('#construction-calculator-mode').selectOption('extra-volume');await expect(result().getByText('必要な容器',{exact:true}).locator('..')).toContainText('57本');
 await page.goto('/tools/construction-calculators/slope-angle-length');await page.locator('#construction-calculator-mode').selectOption('face-area');await page.getByRole('button',{name:'例の数字で試す'}).click();
 await set('horizontalPerVertical','0');await expect(result().getByText('法面積',{exact:true}).locator('..')).toContainText('30m²');
 await page.goto('/tools/construction-calculators/aggregate-base-quantity');await page.locator('#construction-calculator-mode').selectOption('two-layers');await page.locator('#construction-calculator-purchaseMode').selectOption('purchase');await page.locator('#construction-calculator-massMode').selectOption('loose');await page.getByRole('button',{name:'例の数字で試す'}).click();
 await expect(result().getByText('搬入状態の砕石質量',{exact:true}).locator('..')).toContainText('2.88t');
 await page.locator('#construction-calculator-densityState').selectOption('compacted');await expect(page.locator('#calculation-result-title')).toHaveCount(0);
});
