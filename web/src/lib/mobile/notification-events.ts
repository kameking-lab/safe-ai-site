export type WeatherAlertEvent={id:string;title:string;body?:string};
export const alertKey=(id:string)=>id.split(/-\d{4}-\d{2}-\d{2}T/)[0];
export function changedAlerts(previous:WeatherAlertEvent[],current:WeatherAlertEvent[]){
  return [...current.filter(n=>!previous.some(p=>p.id===n.id)).map(n=>({...n,clear:false})),...previous.filter(p=>!current.some(n=>alertKey(n.id)===alertKey(p.id))).map(p=>({id:`clear:${p.id}`,title:`解除確認：${p.title}`,body:'最新の気象庁情報を確認してください。',clear:true}))];
}
