export const NEXT_MODE_EXAMPLES:Record<string,Record<string,unknown>>={
 "pipe-trench":{shape:"pipe-trench",length:10,width:1,depth:1,dimensionUnit:"m",outerDiameter:0.3,bedWidth:1,bedThickness:0.1,bedPosition:"below-pipe-no-overlap"},
 "face-area":{mode:"face-area",height:3,heightUnit:"m",horizontalPerVertical:1.5,lengthM:10,section:"uniform"},
 "two-layers":{mode:"two-layers",stoneAreaM2:10,stoneThickness:150,concreteAreaM2:10,concreteThickness:50,thicknessUnit:"mm",purchaseMode:"installed-only",massMode:"none",densityState:"loose",loosePerCompacted:1.2,looseDensityTPerM3:1.6,concreteExtraPercent:5},
};

export function nextModeExample(slug:string,raw:Record<string,unknown>,fallback:Record<string,unknown>):Record<string,unknown> {
 const mode=slug==='excavation-backfill'?raw.shape:raw.mode;
 const preset=NEXT_MODE_EXAMPLES[String(mode)];
 if(!preset) return fallback;
 const result={...preset};
 const factors:Record<string,number>={m:1,cm:100,mm:1000};
 if(mode==='pipe-trench'){const unit=String(raw.dimensionUnit??'m');result.dimensionUnit=unit;for(const key of ['length','width','depth','outerDiameter','bedWidth','bedThickness'])result[key]=Number(preset[key])*(factors[unit]??1);}
 if(mode==='face-area'){const unit=String(raw.heightUnit??'m');result.heightUnit=unit;result.height=3*(factors[unit]??1);}
 if(mode==='two-layers'){const unit=String(raw.thicknessUnit??'mm');result.thicknessUnit=unit;result.stoneThickness=.15*(factors[unit]??1000);result.concreteThickness=.05*(factors[unit]??1000);result.purchaseMode=raw.purchaseMode??'installed-only';result.massMode=raw.massMode??'none';}
 return result;
}
