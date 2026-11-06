import { billingDb,getEntitlement,lockMember } from './billing-service';
import { signageLocations } from '@/data/signage-locations';
export async function weatherLocations(userId:string){
  const rights=await getEntitlement(userId);
  const rows=await billingDb().mobileWeatherLocation.findMany({where:{userId},orderBy:[{primary:'desc'},{createdAt:'asc'}]});
  return {locations:rows.map((r,i)=>({...r,active:i<rights.limits.weatherLocations})),limit:rights.limits.weatherLocations,notifications:rights.syncState==='verified' && rights.limits.notifications};
}
export async function changeWeatherLocation(userId:string,method:string,locationId:string){
  const location=signageLocations.find(l=>l.id===locationId);if(!location)throw new Error('INVALID_REQUEST');
  // Lock is shared with purchase/reconciliation to prevent grant changes during mutation.
  await billingDb().$transaction(async tx=>{
    await lockMember(tx,userId);
    const rows=await tx.mobileWeatherLocation.findMany({where:{userId}});
    if(method==='DELETE'){await tx.mobileWeatherLocation.deleteMany({where:{userId,locationId}});return;}
    if(method==='PATCH'){
      if(!rows.some(r=>r.locationId===locationId))throw new Error('INVALID_REQUEST');
      await tx.mobileWeatherLocation.updateMany({where:{userId},data:{primary:false}});
      await tx.mobileWeatherLocation.updateMany({where:{userId,locationId},data:{primary:true}});return;
    }
    if(rows.some(r=>r.locationId===locationId))return;
    // Read the plan inside the same transaction and lock, never a client-supplied count.
    const {projectEntitlement}=await import('./entitlement');
    const legacy=await tx.subscription.findUnique({where:{userId}});const grants=await tx.mobileGrant.findMany({where:{userId}});
    const identity=await tx.mobileIdentity.findUnique({where:{userId}});
    const plan=projectEntitlement('',legacy,grants,new Date(),identity?.billingEnvironment==='SANDBOX'?'SANDBOX':'PRODUCTION');
    if(plan.syncState!=='verified')throw new Error('ENTITLEMENT_SYNC_PENDING');
    if(rows.length>=plan.limits.weatherLocations)throw new Error('LOCATION_LIMIT_REACHED');
    await tx.mobileWeatherLocation.create({data:{userId,locationId,label:location.label,primary:rows.length===0}});
  });
  return weatherLocations(userId);
}
