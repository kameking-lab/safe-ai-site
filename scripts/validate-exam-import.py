import json,pathlib,re,hashlib,collections
from pypdf import PdfReader
p=pathlib.Path('web/src/data/exam-library');c=json.loads((p/'official-catalog.json').read_text(encoding='utf8'))
report={'papers':len(c),'questions':0,'officialAnswers':0,'unconfirmed':0,'descriptive':0,'images':0,'errors':[],'sourceChecks':[]}
for r in c:
 q=json.loads((p/'papers'/f'{r["id"]}.json').read_text(encoding='utf8'))
 if len(q)!=r['questionCount']:report['errors'].append(r['id']+': count mismatch')
 if [x['number'] for x in q]!=list(range(1,len(q)+1)):report['errors'].append(r['id']+': sequence')
 report['questions']+=len(q)
 for x in q:
  report['officialAnswers' if x['answerAuthority']=='official' else x['answerAuthority']]+=1
  if x['extractionStatus']!='complete':report['errors'].append(x['id']+': extraction')
  if x['answerAuthority']=='official' and x['correctChoice'] not in range(1,6):report['errors'].append(x['id']+': answer')
  for image in x['images']:
   if not (pathlib.Path('web/public')/image.lstrip('/')).exists():report['errors'].append(x['id']+': image missing')
   report['images']+=1
 # Different PDF extractor provides an independent count of the official answer glyphs.
 if r['answerMode']=='official-choice':
  text='\n'.join(page.extract_text() or '' for page in PdfReader(pathlib.Path('tmp/pdfs/exam-library')/f'{r["id"]}.pdf').pages)
  marks=len(re.findall('[○〇◯]',text))
  report['sourceChecks'].append({'id':r['id'],'officialGlyphs':marks,'gradedQuestions':r['scoredCount'],'match':marks==r['scoredCount']})
  if marks!=r['scoredCount']:report['errors'].append(r['id']+': source answer count mismatch')
report['ok']=not report['errors'];pathlib.Path('docs/exam-learning-2026-09-11/data-validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8');print({k:v for k,v in report.items() if k!='sourceChecks'})
