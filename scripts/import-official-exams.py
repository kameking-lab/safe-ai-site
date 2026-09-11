"""Import owner-authorized official PDFs; preserve figures, remove answer marks from prompts."""
import concurrent.futures, hashlib, json, pathlib, re, unicodedata, urllib.request
import pdfplumber
from PIL import ImageDraw, ImageChops, Image

ROOT = pathlib.Path(__file__).resolve().parents[1]
DATA = ROOT / 'web/src/data/exam-library'
CACHE = ROOT / 'tmp/pdfs/exam-library'
PUBLIC = ROOT / 'web/public/exam-library'

def norm(s): return unicodedata.normalize('NFKC', s)

def run(record):
    key = record['id']
    CACHE.mkdir(parents=True, exist_ok=True)
    destination = PUBLIC / key
    destination.mkdir(parents=True, exist_ok=True)
    pdf = CACHE / f'{key}.pdf'
    if not pdf.exists():
        with urllib.request.urlopen(record['pdfUrl'], timeout=60) as response:
            content = response.read()
        if not content.startswith(b'%PDF'): raise ValueError(f'Not PDF: {key}')
        pdf.write_bytes(content)
    document = pdfplumber.open(pdf)
    questions = []
    current = None
    for page_index, page in enumerate(document.pages):
        page_text = page.extract_text() or ''
        if record['subject']=='特級ボイラー技士' and '正答例' in page_text[:220]:
            break
        if '指示があるまで' in page_text:
            current = None
            continue
        lines = page.extract_text_lines()
        starts = []
        for line in lines:
            match = re.match(r'^問\s*(\d+)(?:\s|[^\d])', norm(line['text']))
            if match and line['top'] > 25:
                starts.append((line, int(match[1])))
        # The opening instruction sheet is not a question.
        if not starts and current is None: continue
        boundaries = []
        if current is not None and (not starts or starts[0][0]['top'] > 110):
            boundaries.append((45, current))
        for line, number in starts:
            source_number = number
            if record['subject']=='特級ボイラー技士': number=len(questions)+1
            current = {'id':f'{key}-q{number}', 'number':number, 'text':'', 'images':[],
                       'correctChoice':None, 'choiceCount':0, 'answerAuthority':'unconfirmed',
                       'sourcePages':[], 'sourceQuestionNumber':source_number, '_marks':[], '_choices':set()}
            questions.append(current)
            boundaries.append((max(25, line['top']-5), current))
        if not boundaries: continue
        image = page.to_image(resolution=125).original.convert('RGB')
        scale = image.width / page.width
        for segment_index, (top, question) in enumerate(boundaries):
            bottom = boundaries[segment_index+1][0]-4 if segment_index+1<len(boundaries) else page.height-35
            footer_tops=[line['top'] for line in lines if line['top']>page.height*.8 and re.search(r'\d+\s*/\s*\d+\s*$', norm(line['text']))]
            if footer_tops: bottom=min(bottom,min(footer_tops)-8)
            segment_lines = [line for line in lines if top<=line['top']<bottom]
            # Ignore page numbers and the fixed printing code, preserve scientific text as-is.
            segment_lines = [line for line in segment_lines if not re.match(r'^\S*\s*\d+\s*/\s*\d+$', norm(line['text']))]
            text = '\n'.join(line['text'] for line in segment_lines)
            normalized = norm(text)
            marks = re.findall(r'[○〇◯]\s*\(?\s*([1-5])\s*\)?', normalized)
            question['_marks'].extend(int(m) for m in marks)
            for line in segment_lines:
                option = re.match(r'^[○〇◯]?\s*\(?([1-5])\)?(?:\s|[^\d])', norm(line['text']))
                if option: question['_choices'].add(int(option[1]))
                question['_choices'].update(int(n) for n in re.findall(r'\(([1-5])\)', norm(line['text'])))
                if re.fullmatch(r'[1-5\s]+', norm(line['text'])):
                    question['_choices'].update(int(n) for n in re.findall(r'[1-5]', norm(line['text'])))
            question['text'] += ('\n' if question['text'] else '') + re.sub(r'[○〇◯](?=\s*[（(]?[１-５1-5])','',text)
            cropped = image.crop((int(25*scale), int(top*scale), int((page.width-15)*scale), int(bottom*scale)))
            draw = ImageDraw.Draw(cropped)
            # Marks can precede side-by-side diagram choices away from the left margin.
            segment_circles=[c for c in page.chars if c['text'] in '○〇◯' and top<=c['top']<bottom]
            for char in page.chars:
                if char in segment_circles and (char['x0'] < 90 or len(segment_circles)==len(marks)):
                    draw.rectangle(((char['x0']-25-1)*scale,(char['top']-top-1)*scale,
                                    (char['x1']-25+1)*scale,(char['bottom']-top+1)*scale), fill='white')
            filename=f'q{question["number"]}-p{page_index+1}-{segment_index}.webp'
            bbox=ImageChops.difference(cropped,Image.new('RGB',cropped.size,'white')).getbbox()
            if bbox: cropped=cropped.crop((0,0,cropped.width,min(cropped.height,bbox[3]+12)))
            cropped.save(destination/filename, 'WEBP', quality=88)
            question['images'].append(f'/exam-library/{key}/{filename}')
            question['sourcePages'].append(page_index+1)
    for q in questions:
        marks=q.pop('_marks'); choices=q.pop('_choices')
        q['choiceCount']=5 if choices==set(range(1,6)) else 0
        if record['answerMode']=='reference':
            q['answerAuthority']='descriptive'; q['choiceCount']=0
        elif len(marks)==1 and marks[0] in choices and q['choiceCount']==5:
            q['correctChoice']=marks[0]; q['answerAuthority']='official'
        # Preserve ambiguity rather than inventing an answer or marking false correct.
        q['extractionStatus']='complete' if q['choiceCount']==5 or q['answerAuthority']=='descriptive' else 'review-needed'
    if len({q['id'] for q in questions})!=len(questions):
        raise ValueError(f'Duplicate question number: {key}')
    papers=DATA/'papers'; papers.mkdir(exist_ok=True)
    (papers/f'{key}.json').write_text(json.dumps(questions,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    record.update(questionCount=len(questions),scoredCount=sum(q['answerAuthority']=='official' for q in questions),
                  pdfSha256=hashlib.sha256(pdf.read_bytes()).hexdigest(),pageCount=len(document.pages))
    document.close()
    return record

if __name__=='__main__':
    records=json.loads((DATA/'official-catalog.json').read_text(encoding='utf8'))
    done=[]; failures=[]
    with concurrent.futures.ProcessPoolExecutor(max_workers=3) as executor:
        futures={executor.submit(run,r):r for r in records}
        for future in concurrent.futures.as_completed(futures):
            record=futures[future]
            try:
                result=future.result(); done.append(result)
                print(json.dumps({'id':result['id'],'questions':result['questionCount'],'scored':result['scoredCount']}),flush=True)
            except Exception as error:
                failures.append({'id':record['id'],'error':str(error)}); print(str(error),flush=True)
    order={r['id']:i for i,r in enumerate(records)}
    done.sort(key=lambda r:order[r['id']])
    (DATA/'official-catalog.json').write_text(json.dumps(done,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    report={'papers':len(done),'questions':sum(r['questionCount'] for r in done),'scored':sum(r['scoredCount'] for r in done),'failures':failures}
    (ROOT/'docs/exam-learning-2026-09-11/import-result.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    print(json.dumps(report),flush=True)
    if failures: raise SystemExit(1)
