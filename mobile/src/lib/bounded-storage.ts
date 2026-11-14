import {Preferences} from '@capacitor/preferences';
import {bounded,OperationTimeoutError} from './billing-diagnostics';

// Native writes cannot be cancelled. Keep their raw completion ordered even
// after a caller times out, so a late clear cannot erase a newer credential.
export function storageBoundary(){
 let writes:Promise<unknown>=Promise.resolve();
 const call=<T>(run:()=>Promise<T>,write:boolean)=>{
  let expired=false;
  const raw=writes.then(()=>{if(expired)throw new OperationTimeoutError();return run();});
  if(write)writes=raw.catch(()=>{});
  return bounded('session',()=>raw).finally(()=>{expired=true;});
 };
 return {read:<T>(run:()=>Promise<T>)=>call(run,false),write:<T>(run:()=>Promise<T>)=>call(run,true)};
}
const preferences=storageBoundary();
export const boundedPreferences={
 get:(options:Parameters<typeof Preferences.get>[0])=>preferences.read(()=>Preferences.get(options)),
 set:(options:Parameters<typeof Preferences.set>[0])=>preferences.write(()=>Preferences.set(options)),
 remove:(options:Parameters<typeof Preferences.remove>[0])=>preferences.write(()=>Preferences.remove(options)),
};
