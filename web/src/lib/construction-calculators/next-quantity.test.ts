import { describe, expect, it } from "vitest";
import fixtures from "@/data/construction-calculators/next-five-fixtures.json";
import { calculateExcavation } from "./excavation";
import { calculateSlope } from "./slope";
import { calculateAggregateBase } from "./material-quantity";
import { calculateCurbQuantity, calculateSealantQuantity } from "./next-quantity";

// Preserve unsupported selectors and extra correction/density fields during adaptation.
function calculate(kind:string, inputs:Record<string,unknown>) {
 if(kind==="trench") return calculateExcavation({...inputs,shape:"pipe-trench",dimensionUnit:inputs.unit} as never);
 if(kind==="curb") return calculateCurbQuantity(inputs as never);
 if(kind==="sealant") return calculateSealantQuantity(inputs as never);
 if(kind==="slope") return calculateSlope({...inputs,mode:"face-area"} as never);
 return calculateAggregateBase({...inputs,mode:"two-layers"} as never);
}
const keys:Record<string,Record<string,string>>={trench:{excavationM3:"excavationVolumeM3",pipeM3:"pipeVolumeM3",bedM3:"bedVolumeM3",backfillM3:"backfillVolumeM3"},curb:{},sealant:{},slope:{horizontalM:"horizontalDistanceM",slantM:"slopedLengthM"},base:{}};
describe("preimplementation independent quantity contract",()=>{
 it.each(fixtures.cases)("$id preserves the independent expected result or rejection",fixture=>{
   const result=calculate(fixture.kind,fixture.inputs as Record<string,unknown>);
   if("expectedError" in fixture){expect(result.ok).toBe(false);return;}
   expect(result.ok).toBe(true);if(!result.ok)return;
   for(const [key,value] of Object.entries(fixture.expected??{})){
     const actual=result.result.rawOutputs[keys[fixture.kind][key]??key];
     if(key==="pieces"||key==="joints")expect(actual).toBe(value);
     else expect(Math.abs(Number(actual)-Number(value))).toBeLessThanOrEqual(1e-9);
   }
   expect(result.result.isEstimate).toBe(true);
   expect(Object.values(result.result.rawOutputs).every(Number.isFinite)).toBe(true);
 });
 for(const kind of ["trench","curb","sealant","slope","base"]){
   const normal=fixtures.cases.find(f=>f.kind===kind&&"expected" in f)!;
   const key:Record<string,string>={trench:"width",curb:"runM",sealant:"widthMm",slope:"height",base:"stoneAreaM2"};
   it.each(["",undefined,Number.NaN,Number.POSITIVE_INFINITY,-1])(`${kind} rejects required blank/missing/nonfinite/negative %s`,value=>{
     expect(calculate(kind,{...normal.inputs,[key[kind]]:value}).ok).toBe(false);
   });
 }
 it.each(["", " ", undefined, null, Number.NaN, Number.POSITIVE_INFINITY])("zero-allowed thickness never accepts blank/nonfinite %s",value=>{
   const pipe=fixtures.cases[0].inputs;
   expect(calculate("trench",{...pipe,bedThickness:value}).ok).toBe(false);
   const base=fixtures.cases.find(f=>f.id==="base-two-layers")!.inputs;
   expect(calculate("base",{...base,stoneThickness:value}).ok).toBe(false);
   expect(calculate("base",{...base,concreteThickness:value}).ok).toBe(false);
 });
});
