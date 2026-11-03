import { Capacitor,registerPlugin,type PluginListenerHandle } from '@capacitor/core';
type ResultEvent={text:string;final:boolean};
const speech=registerPlugin<{start(options:{lang:string}):Promise<void>;stop():Promise<void>;abort():Promise<void>;addListener(name:'result',fn:(event:ResultEvent)=>void):Promise<PluginListenerHandle>;addListener(name:'end',fn:()=>void):Promise<PluginListenerHandle>;addListener(name:'error',fn:(event:{error:string})=>void):Promise<PluginListenerHandle>}>('NativeSpeech');
let active=false;
class Recognition {
  lang='ja-JP';interimResults=true;continuous=false;
  onresult:((event:{results:ArrayLike<ArrayLike<{transcript?:string}>>})=>void)|null=null;
  onerror:((event:{error?:string;message?:string})=>void)|null=null;
  onend:(()=>void)|null=null;
  private listeners:PluginListenerHandle[]=[];
  private ended=false;
  private end(){if(this.ended)return;this.ended=true;active=false;this.listeners.forEach(l=>{void l.remove();});this.listeners=[];this.onend?.();}
  start(){
    if(active)throw new DOMException('Speech input already active','InvalidStateError');active=true;this.ended=false;
    void (async()=>{
      this.listeners.push(await speech.addListener('result',event=>{if(!this.ended)this.onresult?.({results:[[{transcript:event.text}]]});}));
      this.listeners.push(await speech.addListener('end',()=>this.end()));
      this.listeners.push(await speech.addListener('error',event=>{this.onerror?.(event);this.end();}));
      if(this.ended){this.listeners.forEach(l=>{void l.remove();});this.listeners=[];return;}
      await speech.start({lang:this.lang});
    })().catch(error=>{this.onerror?.({error:/permission denied/i.test(String(error?.message))?'not-allowed':'service-not-allowed'});this.end();});
  }
  stop(){void speech.stop().catch(()=>this.end());}
  abort(){this.end();void speech.abort().catch(()=>{});}
}
export function installNativeSpeech(){if(Capacitor.getPlatform()==='ios'){window.SpeechRecognition=Recognition;window.webkitSpeechRecognition=Recognition;}}
