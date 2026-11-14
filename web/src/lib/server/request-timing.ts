/** Durations only: no member identifiers, credentials, queries, or provider payloads. */
export async function withRequestTiming(run:(measure:<T>(name:string,work:()=>Promise<T>)=>Promise<T>)=>Promise<Response>){
  const start=performance.now();const spans:string[]=[];
  async function measure<T>(name:string,work:()=>Promise<T>){
    const began=performance.now();
    try{return await work();}finally{spans.push(`${name};dur=${(performance.now()-began).toFixed(1)}`);}
  }
  const response=await run(measure);
  response.headers.set('Server-Timing',[...spans,`total;dur=${(performance.now()-start).toFixed(1)}`].join(', '));
  return response;
}
