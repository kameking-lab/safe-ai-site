import { MAX_AREA_M2, MAX_LINEAR_METRES, MAX_VOLUME_M3, MAX_MASS_KG, applyRounding, ceilCount, compactIssues, enumIssue, finiteIssue, invalid, nonNegativeIssue, normalizeRounding, positiveIssue, resultCountIssue, resultTooLargeIssue, validResult } from "./core";
import type { CalculationOutcome, DisplayValue, LengthUnit, PortableValue, RoundingConfig, ValidationIssue } from "./types";
import { toMetres } from "./units";

export const NEXT_QUANTITY_VERSION = "1.1.0";
type Common = { rounding?: RoundingConfig };
type OutputItem = [key: string, label: string, unit: string];

function finish(id: string, input: Record<string, PortableValue>, values: Record<string, number>, items: OutputItem[], formula: string[], assumptions: string[], roundingInput?: RoundingConfig): CalculationOutcome {
  const countKeys = new Set(["pieces", "joints"]);
  const issues = compactIssues(Object.entries(values).map(([key, value]) => key === "pieces" ? resultCountIssue(key, value) : resultTooLargeIssue(key, value, key.includes("Mass") ? MAX_MASS_KG / 1000 : MAX_VOLUME_M3)));
  if (issues.length) return invalid(issues);
  const rounding = normalizeRounding(roundingInput);
  const outputs = Object.fromEntries(Object.entries(values).map(([key,value])=>[key,countKeys.has(key)?value:applyRounding(value,rounding)]));
  const displayValues: DisplayValue[] = items.map(([key,label,unit])=>({key,label,unit,value:outputs[key]}));
  return validResult({calculatorId:id, formulaVersion:NEXT_QUANTITY_VERSION, rawOutputs:values, outputs, displayValues, usedInputs:{...input,rounding:{...rounding}}, formula, rounding, assumptions:[...assumptions,"概算数量です。設計・安定・施工可否を判定しません。"]});
}

const inconsistent = (field: string, message: string): ValidationIssue => ({field,code:"inconsistent",message});

export interface PipeTrenchInput extends Common {
  shape: "pipe-trench";
  length: number; width: number; depth: number; dimensionUnit: LengthUnit;
  outerDiameter: number; bedWidth: number; bedThickness: number;
  bedPosition: "below-pipe-no-overlap" | "pipe-within-bed-envelope";
}

export function calculatePipeTrench(input: PipeTrenchInput): CalculationOutcome {
  const issues = compactIssues([
    enumIssue("dimensionUnit",input.dimensionUnit,["mm","cm","m"]),
    enumIssue("bedPosition",input.bedPosition,["below-pipe-no-overlap"]),
    ...["length","width","depth","outerDiameter","bedWidth"].map(key=>positiveIssue(key,toMetres(input[key as "length"],input.dimensionUnit),MAX_LINEAR_METRES)),
    finiteIssue("bedThickness",input.bedThickness),
    nonNegativeIssue("bedThickness",toMetres(input.bedThickness,input.dimensionUnit),MAX_LINEAR_METRES),
  ]);
  if (issues.length) return invalid(issues);
  const l=toMetres(input.length,input.dimensionUnit), w=toMetres(input.width,input.dimensionUnit), h=toMetres(input.depth,input.dimensionUnit), d=toMetres(input.outerDiameter,input.dimensionUnit), b=toMetres(input.bedWidth,input.dimensionUnit), t=toMetres(input.bedThickness,input.dimensionUnit);
  if(d>w) return invalid([inconsistent("outerDiameter","管外径が掘削幅を超えています。")]);
  if(b>w) return invalid([inconsistent("bedWidth","床付け材の幅が掘削幅を超えています。")]);
  if(t+d>h) return invalid([inconsistent("bedThickness","床材厚さと管外径の合計が掘削深さを超えています。")]);
  const excavationVolumeM3=w*h*l, pipeVolumeM3=Math.PI*d*d*l/4, bedVolumeM3=b*t*l;
  return finish("excavation-backfill",{shape:input.shape,length:input.length,width:input.width,depth:input.depth,dimensionUnit:input.dimensionUnit,outerDiameter:input.outerDiameter,bedWidth:input.bedWidth,bedThickness:input.bedThickness,bedPosition:input.bedPosition},{excavationVolumeM3,pipeVolumeM3,bedVolumeM3,bedAreaM2:b*l,deductionVolumeM3:pipeVolumeM3+bedVolumeM3,backfillVolumeM3:excavationVolumeM3-pipeVolumeM3-bedVolumeM3},[["excavationVolumeM3","掘削・地山体積","m³"],["pipeVolumeM3","管の外形体積","m³"],["bedVolumeM3","床材の施工体積","m³"],["backfillVolumeM3","埋戻し施工体積","m³"]],["掘削量=底幅×深さ×延長","管外形=π×外径²×延長/4","床材=床材幅×厚さ×延長","埋戻し=掘削−管外形−床材"],["鉛直壁・一定断面の直線1区間。管は矩形床材の上に接し、両者は重ならない。","管と床材の延長は同じ。内径・重複する包絡断面は使わない。","土量変化、余掘り、ほぐし搬入量は含めない。"],input.rounding);
}

export interface CurbQuantityInput extends Common {
  mode: "physical-plus-internal-joints" | "effective-module";
  runM: number; productLengthM: number; jointM?: number;
  alignment?: "straight" | "arc";
}
export function calculateCurbQuantity(input: CurbQuantityInput): CalculationOutcome {
  const issues = compactIssues([enumIssue("mode",input.mode,["physical-plus-internal-joints","effective-module"]),positiveIssue("runM",input.runM,MAX_LINEAR_METRES),positiveIssue("productLengthM",input.productLengthM,MAX_LINEAR_METRES), input.mode==="physical-plus-internal-joints" ? nonNegativeIssue("jointM",input.jointM,MAX_LINEAR_METRES):null,input.alignment===undefined?null:enumIssue("alignment",input.alignment,["straight"])]);
  if(input.mode==="effective-module" && input.jointM!==undefined) issues.push(inconsistent("jointM","有効長は目地込みです。目地を別に加算できません。"));
  if(issues.length) return invalid(issues);
  const j=input.mode==="physical-plus-internal-joints"?input.jointM!:0;
  const pieces=Math.max(1,ceilCount(input.mode==="effective-module"?input.runM/input.productLengthM:(input.runM+j)/(input.productLengthM+j)));
  const joints=pieces-1, grossRunM=pieces*input.productLengthM+(input.mode==="physical-plus-internal-joints"?joints*j:0);
  const inputUsed: Record<string,PortableValue>={mode:input.mode,runM:input.runM,productLengthM:input.productLengthM,alignment:"straight"};
  if(input.mode==="physical-plus-internal-joints") inputUsed.jointM=j;
  return finish("curb-quantity",inputUsed,input.mode==="effective-module"?{pieces}:{pieces,joints,grossRunM,trimM:Math.max(0,grossRunM-input.runM)},input.mode==="effective-module"?[["pieces","必要な縁石","本"]]:[["pieces","必要な縁石","本"],["joints","内部の継目","箇所"],["grossRunM","切断前の延長","m"],["trimM","切断する余長","m"]],[input.mode==="effective-module"?"本数=ceil(総延長/目地込み有効長)":"本数=max(1,ceil((総延長+目地幅)/(製品長+目地幅)))","内部の継目=本数−1"],["同一製品を並べる直線・開いた1区間。端部切断あり、両端の目地は含めない。","有効長方式ではメーカー指定の目地込み寸法を使用。","曲線・閉じた周回・切端再利用・予備本数の最適化は含めない。"],input.rounding);
}

export interface SealantQuantityInput extends Common {
  widthMm: number; depthMm: number; lengthM: number; capacityMl: number;
  mode: "container-loss" | "extra-volume"; percent: number; extraPercent?: number;
}
export function calculateSealantQuantity(input: SealantQuantityInput): CalculationOutcome {
  const issues = compactIssues([enumIssue("mode",input.mode,["container-loss","extra-volume"]),positiveIssue("widthMm",input.widthMm,1e6),positiveIssue("depthMm",input.depthMm,1e6),positiveIssue("lengthM",input.lengthM,MAX_LINEAR_METRES),positiveIssue("capacityMl",input.capacityMl,1e12),nonNegativeIssue("percent",input.percent,1e6)]);
  if(input.mode==="container-loss" && input.percent>=100) issues.push(inconsistent("percent","容器内損失率は100%未満にしてください。"));
  if(input.extraPercent!==undefined) issues.push(inconsistent("extraPercent","損失方式と追加量方式を重ねて適用できません。"));
  if(issues.length) return invalid(issues);
  const installedMl=input.widthMm*input.depthMm*input.lengthM;
  const effectiveCapacityMl=input.mode==="container-loss"?input.capacityMl*(1-input.percent/100):input.capacityMl;
  const purchaseTargetMl=input.mode==="extra-volume"?installedMl*(1+input.percent/100):installedMl;
  const pieces=ceilCount(purchaseTargetMl/effectiveCapacityMl);
  return finish("sealant-quantity",{widthMm:input.widthMm,depthMm:input.depthMm,lengthM:input.lengthM,capacityMl:input.capacityMl,mode:input.mode,percent:input.percent},input.mode==="container-loss"?{installedMl,effectiveCapacityMl,pieces}:{installedMl,purchaseTargetMl,pieces},[["pieces","必要な容器","本"],["installedMl","目地の施工量","mL"],input.mode==="container-loss"?["effectiveCapacityMl","1本の使用可能量","mL"]:["purchaseTargetMl","追加込み購入対象量","mL"]],["施工量(mL)=幅(mm)×深さ(mm)×延長(m)",input.mode==="container-loss"?"本数=ceil(施工量/(容器容量×(1−損失率/100)))":"本数=ceil(施工量×(1+追加率/100)/容器容量)"],["矩形の目地断面。深さは実際に充填する深さ。","補正は選んだ1方式だけ。例の20%は推奨値ではない。","材料選定・目地設計・接着性能は判定しない。"],input.rounding);
}

export interface SlopeFaceInput extends Common {
  mode: "face-area"; height: number; heightUnit: LengthUnit;
  horizontalPerVertical: number; lengthM: number; section?: "uniform" | "variable";
}
export function calculateSlopeFace(input: SlopeFaceInput): CalculationOutcome {
  const issues=compactIssues([enumIssue("heightUnit",input.heightUnit,["mm","cm","m"]),positiveIssue("height",toMetres(input.height,input.heightUnit),MAX_LINEAR_METRES),nonNegativeIssue("horizontalPerVertical",input.horizontalPerVertical,1e6),positiveIssue("lengthM",input.lengthM,MAX_LINEAR_METRES),input.section===undefined?null:enumIssue("section",input.section,["uniform"])]);
  if(issues.length) return invalid(issues);
  const heightM=toMetres(input.height,input.heightUnit),horizontalDistanceM=heightM*input.horizontalPerVertical,slopedLengthM=Math.hypot(heightM,horizontalDistanceM),faceAreaM2=slopedLengthM*input.lengthM;
  const bounds=compactIssues([resultTooLargeIssue("horizontalPerVertical",horizontalDistanceM,MAX_LINEAR_METRES),resultTooLargeIssue("faceAreaM2",faceAreaM2,MAX_AREA_M2)]);
  if(bounds.length) return invalid(bounds);
  return finish("slope-angle-length",{mode:input.mode,height:input.height,heightUnit:input.heightUnit,horizontalPerVertical:input.horizontalPerVertical,lengthM:input.lengthM,section:"uniform"},{horizontalDistanceM,slopedLengthM,faceAreaM2},[["slopedLengthM","断面の法長","m"],["faceAreaM2","法面積","m²"],["horizontalDistanceM","断面の水平幅","m"]],["水平幅=高さ×水平/鉛直比","法長=hypot(高さ,水平幅)","法面積=法長×法面の延長"],["鉛直1:水平sの一定勾配・平面の矩形法面。","延長は断面に直交する長さ。小段・曲面・断面変化は含めない。","s=0は垂直面の幾何学であり施工可能という意味ではない。"],input.rounding);
}

export interface FoundationLayersInput extends Common {
  mode: "two-layers";
  stoneAreaM2: number; stoneThickness: number; concreteAreaM2: number; concreteThickness: number; thicknessUnit: LengthUnit;
  purchaseMode?: "installed-only" | "purchase"; massMode?: "none" | "loose";
  loosePerCompacted?: number; looseDensityTPerM3?: number; concreteExtraPercent?: number;
  densityState?: "loose" | "compacted"; compactedDensityTPerM3?: number; massVolumeState?: string;
}
export function calculateFoundationLayers(input: FoundationLayersInput): CalculationOutcome {
  const purchaseMode=input.purchaseMode??(input.loosePerCompacted!==undefined||input.concreteExtraPercent!==undefined?"purchase":"installed-only");
  const massMode=input.massMode??(input.looseDensityTPerM3!==undefined||input.compactedDensityTPerM3!==undefined?"loose":"none");
  const issues=compactIssues([enumIssue("thicknessUnit",input.thicknessUnit,["mm","cm","m"]),enumIssue("purchaseMode",purchaseMode,["installed-only","purchase"]),enumIssue("massMode",massMode,["none","loose"]),positiveIssue("stoneAreaM2",input.stoneAreaM2,MAX_AREA_M2),positiveIssue("concreteAreaM2",input.concreteAreaM2,MAX_AREA_M2),finiteIssue("stoneThickness",input.stoneThickness),finiteIssue("concreteThickness",input.concreteThickness),nonNegativeIssue("stoneThickness",toMetres(input.stoneThickness,input.thicknessUnit),MAX_LINEAR_METRES),nonNegativeIssue("concreteThickness",toMetres(input.concreteThickness,input.thicknessUnit),MAX_LINEAR_METRES)]);
  if(input.stoneThickness===0 && input.concreteThickness===0) issues.push(inconsistent("stoneThickness","両方の層厚が0です。少なくとも1層の厚さを入力してください。"));
  if(input.compactedDensityTPerM3!==undefined || (massMode==="loose" && input.densityState!==undefined && input.densityState!=="loose")) issues.push(inconsistent("densityState","搬入ほぐし体積には同じ搬入状態の密度が必要です。締固め後密度は使えません。"));
  if(purchaseMode==="purchase") {
    issues.push(...compactIssues([positiveIssue("loosePerCompacted",input.loosePerCompacted,1e6),nonNegativeIssue("concreteExtraPercent",input.concreteExtraPercent,1e6)]));
    if(massMode==="loose") issues.push(...compactIssues([positiveIssue("looseDensityTPerM3",input.looseDensityTPerM3,50)]));
  } else if(massMode!=="none") issues.push(inconsistent("massMode","搬入質量には搬入体積の算出が必要です。"));
  if(issues.length) return invalid(issues);
  const installedStoneM3=input.stoneAreaM2*toMetres(input.stoneThickness,input.thicknessUnit),installedConcreteM3=input.concreteAreaM2*toMetres(input.concreteThickness,input.thicknessUnit);
  const values:Record<string,number>={installedStoneM3,installedConcreteM3};
  const used:Record<string,PortableValue>={mode:input.mode,stoneAreaM2:input.stoneAreaM2,stoneThickness:input.stoneThickness,concreteAreaM2:input.concreteAreaM2,concreteThickness:input.concreteThickness,thicknessUnit:input.thicknessUnit,purchaseMode,massMode};
  const items:OutputItem[]=[["installedStoneM3","砕石の施工体積（締固め後）","m³"],["installedConcreteM3","捨てコンの施工体積","m³"]];
  if(purchaseMode==="purchase") {
    values.looseStoneM3=installedStoneM3*input.loosePerCompacted!;values.concretePurchaseM3=installedConcreteM3*(1+input.concreteExtraPercent!/100);
    Object.assign(used,{loosePerCompacted:input.loosePerCompacted!,concreteExtraPercent:input.concreteExtraPercent!});
    items.push(["looseStoneM3","砕石の搬入ほぐし体積","m³"],["concretePurchaseM3","捨てコンの購入対象体積","m³"]);
    if(massMode==="loose") { values.looseStoneMassT=values.looseStoneM3*input.looseDensityTPerM3!;Object.assign(used,{densityState:"loose",looseDensityTPerM3:input.looseDensityTPerM3!});items.push(["looseStoneMassT","搬入状態の砕石質量","t"]); }
  }
  return finish("aggregate-base-quantity",used,values,items,["施工砕石=砕石面積×仕上がり厚さ","施工捨てコン=捨てコン面積×厚さ",...(purchaseMode==="purchase"?["搬入砕石=施工砕石×(ほぐし体積/締固め後体積)","捨てコン購入対象=施工量×(1+追加率/100)",...(massMode==="loose"?["搬入質量=搬入ほぐし体積×同じ状態の密度"]:[])]:[])],["各層の範囲と厚さを別入力。一方の層厚0は、その層なしを表す。","係数・密度・追加率は利用者が確認した値。施工体積と購入量を区別する。","公的な基礎砕石の厚さ別m²計上とは別の購入概算。埋戻し量は算出しない。"],input.rounding);
}
