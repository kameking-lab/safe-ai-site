import json,hashlib,urllib.request,re,pathlib
from lxml import html
root=pathlib.Path(__file__).resolve().parents[1]
out=root/'web/src/data/exam-library'; out.mkdir(parents=True,exist_ok=True)
records=[]
for group in ['lckohyo','emkohyo','cskohyo']:
 url=f'https://www.exam.or.jp/{group}/'
 raw=urllib.request.urlopen(url).read(); tree=html.fromstring(raw)
 for row in tree.xpath('//tr'):
  cells=row.xpath('./td|./th')
  if not cells: continue
  name=''.join(cells[0].itertext()).strip().replace('【注意】','')
  for a in row.xpath('.//a[@href]'):
   href=urllib.parse.urljoin(url,a.get('href')); label=''.join(a.itertext()).strip()
   if '令和' not in label: continue
   m=re.search(r'令和(\d+)年(\d+)月(?:(\d+)日)?',label)
   if not m: raise RuntimeError(label)
   year=2018+int(m[1]); month=int(m[2]); day=int(m[3]) if m[3] else None
   date=f'{year}-{month:02d}'+(f'-{day:02d}' if day else '')
   descriptive=group=='cskohyo' and name not in ['産業安全一般','産業安全関係法令','労働衛生一般','労働衛生関係法令']
   descriptive=descriptive or name=='特級ボイラー技士'
   records.append(dict(id=f'{group}-'+href.rstrip('/').rsplit('/',1)[-1].removesuffix('.pdf'),group=group,subject=name,label=label,date=date,dateKind='publication' if group=='lckohyo' else 'exam',pdfUrl=href,indexUrl=url,answerMode='reference' if descriptive else 'official-choice',checkedAt='2026-09-11',sourceMode='official-pdf',indexSha256=hashlib.sha256(raw).hexdigest()))
if len({r['id'] for r in records})!=len(records): raise RuntimeError('Duplicate ID')
(out/'official-catalog.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(json.dumps({'total':len(records),'groups':{g:sum(r['group']==g for r in records) for g in ['lckohyo','emkohyo','cskohyo']},'latest':{g:max(r['date'] for r in records if r['group']==g) for g in ['lckohyo','emkohyo','cskohyo']}},ensure_ascii=False))


