'use client';
import { useEffect,useState } from 'react';
import { prepareDeletion,confirmDeletion,checkDeletion,type DeletionPreparation,type DeletionStatus } from '../lib/account-deletion';
import { startLogin } from '../lib/session';
export function AccountDeletionPanel(){
  // Prerendered HTML must not accept a click before React installs handlers.
  const [ready,setReady]=useState(false);
  const [preparation,setPreparation]=useState<DeletionPreparation|null>(null);const [confirmation,setConfirmation]=useState('');const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
  const show=(status:DeletionStatus|null)=>{if(status)setMessage(status.status==='completed'?'アカウントと関連する個人データの削除が完了しました。':status.status==='pending'?'削除を受け付けました。ログイン・通知は無効です。Apple連携の解除等を自動処理中です。「削除状況を確認」で完了を確認できます。':'削除はまだ確定していません。本人確認後にもう一度開始してください。');};
  useEffect(()=>{let active=true;void checkDeletion().then(status=>{if(active)show(status);}).catch(()=>{});return()=>{active=false;};},[]);
  useEffect(()=>{const changed=()=>{setPreparation(null);setConfirmation('');};window.addEventListener('anzen-session-changed',changed);setReady(true);return()=>window.removeEventListener('anzen-session-changed',changed);},[]);
  async function action(run:()=>Promise<void>){if(!ready||busy)return;setBusy(true);try{await run();}catch(e){setMessage(e instanceof Error&&e.message==='REAUTH_REQUIRED'?'削除には直近5分以内の本人確認が必要です。「本人確認のため再ログイン」からログインし、もう一度開始してください。':'処理結果を確認できません。「削除状況を確認」を押してください。未確定の場合は再ログイン後に開始できます。');}finally{setBusy(false);}}
  return <section aria-label="アカウントの削除" aria-busy={!ready||busy} className="space-y-3 rounded border border-red-300 p-4"><h2 className="font-bold">アカウントの削除</h2>
    <p>会員情報、学習・SDS検索履歴、利用履歴、警報地点、ログインと通知の登録を削除します。組織で共有する業務記録は投稿者情報を匿名化します。購入所有者の照合・不正防止に必要な最小限の取引識別子は匿名の監査情報として7年間保持します。端末に保存したアプリのデータも削除します。</p>
    <p>アカウント削除だけでは購読は解約されません。継続請求を止めるには上の購入元の購読管理から解約してください。有効な購読があっても削除を開始できます。削除後は取り消せません。</p>
    <button disabled={!ready||busy} onClick={()=>void action(async()=>{await startLogin();})}>本人確認のため再ログイン</button>
    <button disabled={!ready||busy} onClick={()=>void action(async()=>{setPreparation(await prepareDeletion());setConfirmation('');setMessage('削除する内容を確認し、「削除」と入力して確定してください。');})}>アカウント削除を開始</button>
    {preparation?<><label>確認のため「削除」と入力<input value={confirmation} onChange={e=>setConfirmation(e.target.value)} autoComplete="off"/></label><button disabled={busy||confirmation!=='削除'} onClick={()=>void action(async()=>{const status=await confirmDeletion(preparation);setPreparation(null);show(status);})}>アカウントを完全に削除する</button><button disabled={busy} onClick={()=>{setPreparation(null);setConfirmation('');}}>戻る</button></>:null}
    <button disabled={!ready||busy} onClick={()=>void action(async()=>{const status=await checkDeletion();if(status)show(status);else setMessage('この端末から確定した削除依頼はありません。');})}>削除状況を確認</button><p role="status">{ready?message:'削除操作を準備しています。'}</p>
  </section>;
}
