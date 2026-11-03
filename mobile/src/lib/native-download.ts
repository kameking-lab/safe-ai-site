import { Capacitor } from '@capacitor/core';
import { Filesystem,Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
async function shareDownload(href:string,name:string){
  const response=await fetch(href);if(!response.ok)throw new Error('ダウンロードできませんでした。');
  const blob=await response.blob();const bytes=new Uint8Array(await blob.arrayBuffer());let binary='';
  for(let offset=0;offset<bytes.length;offset+=8192)binary+=String.fromCharCode(...bytes.subarray(offset,offset+8192));
  const filename=(name||'安全AI-資料').replace(/[^\p{L}\p{N}_.-]/gu,'_').slice(0,100);
  const path=`anzen-exports/${crypto.randomUUID()}/${filename}`;
  await Filesystem.writeFile({path,directory:Directory.Cache,data:btoa(binary),recursive:true});
  const file=await Filesystem.getUri({path,directory:Directory.Cache});
  await Share.share({title:filename,files:[file.uri]});
}
export function installNativeDownloads(){
  if(Capacitor.getPlatform()!=='ios')return;
  const handle=(anchor:HTMLAnchorElement)=>{
    const url=new URL(anchor.href,location.href);
    const local=url.origin===location.origin;
    if(!((url.protocol==='blob:'&&anchor.download)||(local&&(anchor.download||/\.(pdf|pptx|png|webp|csv|svg)$/i.test(url.pathname)||url.pathname.startsWith('/api/safety-images/')))))return false;
    const name=anchor.download||decodeURIComponent(url.pathname.split('/').pop()??'安全AI-資料');
    void shareDownload(url.href,name).catch(()=>window.dispatchEvent(new CustomEvent('anzen-native-error',{detail:'資料を保存・共有できませんでした。通信状態と端末の空き容量を確認してください。'})));return true;
  };
  const click=HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click=function(){if(!handle(this))click.call(this);};
  document.addEventListener('click',event=>{const anchor=(event.target as Element|null)?.closest('a');if(anchor instanceof HTMLAnchorElement&&handle(anchor)){event.preventDefault();event.stopImmediatePropagation();}},true);
}
