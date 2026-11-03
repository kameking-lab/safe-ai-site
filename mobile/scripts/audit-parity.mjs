import { readFile,writeFile,access,readdir,stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import path from 'node:path';
const read=async p=>JSON.parse(await readFile(p,'utf8'));
const inventory=await read('docs/web-parity.json');
const catalog=await read('../web/src/data/exam-library/official-catalog.json');
let questions=0,scored=0,figures=0;
const papers=[];const hashes=[];
for(const entry of catalog){
  const source=`../web/src/data/exam-library/papers/${entry.id}.json`;
  const raw=await readFile(source,'utf8');const data=JSON.parse(raw);questions+=data.length;
  scored+=data.filter(q=>q.answerAuthority==='official' && Number.isInteger(q.correctChoice)).length;
  const html=await readFile(`out/e-learning/exams/${entry.id}/index.html`,'utf8');
  assert(!html.includes('<h1>出典・安全性を再確認中です</h1>'),`Exam accidentally quarantined: ${entry.id}`);
  for(const q of data)for(const image of q.images??[]){if(!image.startsWith('/'))continue;await access(path.join('out',image));figures++;}
  papers.push({id:entry.id,questions:data.length,scored:data.filter(q=>q.answerAuthority==='official' && Number.isInteger(q.correctChoice)).length});
  hashes.push(`${entry.id}:${createHash('sha256').update(raw).digest('hex')}`);
}
for(const row of inventory.routes){
  if(row.state==='operator-only' || row.state==='owner-excluded')continue;
  if(!row.route.includes('[')){const destination=row.route==='/'?'out/index.html':`out${row.route}/index.html`;await access(destination);}
}
for(const excluded of ['ky','safety-diary','site-records/near-miss']){
  let exists=true;try{await access(`out/${excluded}/index.html`);}catch{exists=false;}assert(!exists,`Owner-excluded recording page was bundled: ${excluded}`);
}
async function files(dir){return(await Promise.all((await readdir(dir,{withFileTypes:true})).map(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]))).flat();}
const output=await files('out');let bytes=0;for(const file of output)bytes+=(await stat(file)).size;
const result={schema:1,routeFamilies:inventory.routes.length,states:inventory.routes.reduce((n,r)=>(n[r.state]=(n[r.state]??0)+1,n),{}),
  htmlPages:output.filter(f=>f.endsWith('.html')).length,bundledBytes:bytes,exam:{papers:papers.length,questions,scored,unscored:questions-scored,figureReferences:figures,sourceHash:createHash('sha256').update(hashes.join('\n')).digest('hex'),items:papers},
  delivery:'local static files and canonical web components; no remote application WebView',networkDuringBuild:'blocked',nativeDeviceVerification:'not run on Windows'};
await writeFile('docs/web-parity-result.json',JSON.stringify(result,null,2)+'\n');
console.log(`Parity verified: ${papers.length} papers / ${questions} questions (${scored} scored); ${result.htmlPages} HTML pages. Owner-excluded records absent.`);
