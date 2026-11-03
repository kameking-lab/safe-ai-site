import { Prisma } from '@prisma/client';
import { billingDb,getEntitlement,entitlementInTransaction,lockMember } from './billing-service';
import { getJmaWarningsRuntime } from '@/lib/jma/fetch-jma-runtime';
import { isCurrentJmaWarningRegion } from '@/lib/jma/jma-region-trust';
import { buildWeatherNotifications,isAlertLevel } from '@/lib/notifications/weather-notifications';
import { signageLocations } from '@/data/signage-locations';
import { sendApns,type ApnsConfig } from './apns';
import { changedAlerts,alertKey,type WeatherAlertEvent as Alert } from './notification-events';
export async function enqueueWeather(deadline=Date.now()+45000){
  const db=billingDb();const warnings=await getJmaWarningsRuntime();const now=new Date();
  const devices=await db.mobilePushDevice.findMany({where:{enabled:true},select:{userId:true}});
  const users=[...new Set(devices.map(d=>d.userId))];const areas=new Map<string,Array<{userId:string;locationId:string}>>();
  for(const userId of users){
    if(Date.now()>deadline)break;
    const rights=await getEntitlement(userId);if(rights.syncState!=='verified'||!rights.limits.notifications)continue;
    const locations=await db.mobileWeatherLocation.findMany({where:{userId},orderBy:[{primary:'desc'},{createdAt:'asc'}]});
    for(const location of locations){const area=signageLocations.find(l=>l.id===location.locationId)?.prefectureIso;if(area)areas.set(area,[...(areas.get(area)??[]),{userId,locationId:location.locationId}]);}
  }
  for(const [area,targets] of areas){
    if(Date.now()>deadline)break;
    // A failed/stale/fallback acquisition must never generate a false clearance.
    if(!isCurrentJmaWarningRegion(warnings,area,now))continue;
    const sourceAt=new Date(warnings.byIso[area].sourceFetchedAt??warnings.fetchedAt);
    const current=buildWeatherNotifications(area,warnings,now).filter(isAlertLevel).map(n=>({id:n.id,title:n.title,body:n.body??''}));
    await db.$transaction(async tx=>{
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`anzen-weather:${area}`},0))`;
      const previous=await tx.mobileWeatherState.findUnique({where:{area}});if(previous && previous.sourceAt>=sourceAt)return;
      const changes=changedAlerts((previous?.alerts??[]) as Alert[],current);
      for(const target of targets){
        const rights=await entitlementInTransaction(tx,target.userId);if(rights.syncState!=='verified' || !rights.limits.notifications)continue;
        const locations=await tx.mobileWeatherLocation.findMany({where:{userId:target.userId},orderBy:[{primary:'desc'},{createdAt:'asc'}]});
        if(!locations.slice(0,rights.limits.weatherLocations).some(l=>l.locationId===target.locationId))continue;
        const destinations=await tx.mobilePushDevice.findMany({where:{userId:target.userId,enabled:true}});
        for(const device of destinations)for(const change of changes){
          const eventId=`${area}:${change.id}`;
          await tx.mobilePushOutbox.upsert({where:{deviceId_eventId:{deviceId:device.id,eventId}},create:{deviceId:device.id,eventId,locationId:target.locationId,payload:{aps:{alert:{title:change.title,body:(change.body??'').slice(0,1000)},sound:'default'},locationId:target.locationId,eventId},expiresAt:new Date(Date.now()+300000)},update:{}});
        }
      }
      await tx.mobileWeatherState.upsert({where:{area},create:{area,alerts:current as Prisma.InputJsonValue,sourceAt},update:{alerts:current as Prisma.InputJsonValue,sourceAt}});
    },{timeout:20000});
  }
}
export async function deliverWeather(send=sendApns,deadline=Date.now()+45000){
  const db=billingDb();const pending=await db.mobilePushOutbox.findMany({where:{status:{in:['pending','sending']},nextAttempt:{lte:new Date()}},take:30,orderBy:{nextAttempt:'asc'}});
  for(const item of pending){
    if(Date.now()>deadline)break;
    const claimed=await db.mobilePushOutbox.updateMany({where:{id:item.id,status:{in:['pending','sending']},nextAttempt:{lte:new Date()}},data:{status:'sending',nextAttempt:new Date(Date.now()+60000)}});if(!claimed.count)continue;
    const device=await db.mobilePushDevice.findUnique({where:{id:item.deviceId}});
    try{
      if(!device || !device.enabled || item.expiresAt<=new Date()){await db.mobilePushOutbox.update({where:{id:item.id},data:{status:'discarded'}});continue;}
      await getEntitlement(device.userId);
      await db.$transaction(async tx=>{
        await lockMember(tx,device.userId);
        const latest=await tx.mobilePushDevice.findUnique({where:{id:device.id}});
        const session=await tx.mobileSession.findUnique({where:{tokenHash:device.sessionHash}});
        const rights=await entitlementInTransaction(tx,device.userId);
        const locations=await tx.mobileWeatherLocation.findMany({where:{userId:device.userId},orderBy:[{primary:'desc'},{createdAt:'asc'}]});
        const area=signageLocations.find(l=>l.id===item.locationId)?.prefectureIso;
        const state=area?await tx.mobileWeatherState.findUnique({where:{area}}):null;
        const alerts=(state?.alerts??[]) as Alert[];const relativeId=item.eventId.slice((area?.length??0)+1);
        const stillCurrent=state && Date.now()-state.sourceAt.getTime()<=15*60000 && (relativeId.startsWith('clear:')?!alerts.some(a=>alertKey(a.id)===alertKey(relativeId.slice(6))):alerts.some(a=>a.id===relativeId));
        if(!latest?.enabled || !session || session.expiresAt<=new Date() || !stillCurrent || rights.syncState!=='verified' || !rights.limits.notifications || !locations.slice(0,rights.limits.weatherLocations).some(l=>l.locationId===item.locationId)){
          await tx.mobilePushOutbox.update({where:{id:item.id},data:{status:'discarded'}});return;
        }
        const config:ApnsConfig={keyId:process.env.APNS_KEY_ID??'',teamId:process.env.APNS_TEAM_ID??'',privateKey:process.env.APNS_PRIVATE_KEY??'',topic:process.env.APNS_TOPIC??'',environment:device.environment==='production'?'production':'sandbox'};
        if(!config.keyId||!config.teamId||!config.privateKey||!config.topic)throw new Error('FEATURE_UNAVAILABLE');
        const result=await send(device.token,item.id,item.eventId,item.payload,config);
        if(result.status===410 || (result.status===400 && result.reason==='BadDeviceToken')){await tx.mobilePushDevice.update({where:{id:device.id},data:{enabled:false}});await tx.mobilePushOutbox.update({where:{id:item.id},data:{status:'invalid-device'}});return;}
        if(result.status!==200)throw new Error('APNS_UNAVAILABLE');
        await tx.mobilePushOutbox.update({where:{id:item.id},data:{status:'sent'}});
      },{timeout:20000});
    }catch{
      const attempts=item.attempts+1;await db.mobilePushOutbox.update({where:{id:item.id},data:{status:attempts>=5?'failed':'pending',attempts,nextAttempt:new Date(Date.now()+Math.min(120000,2**attempts*5000))}});
    }
  }
  return {processed:pending.length};
}
