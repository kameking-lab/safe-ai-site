# -*- coding: utf-8 -*-
"""マスコット画像 資産キュー式ブラウザ生成ランナー（ChatGPT / Gemini）。

前例: C:\\Users\\kanet\\20260522\\pic の実証済みブラウザ自動化
(CDP常駐Chrome接続・自タブのみ操作・ポーリング待機・多段ダウンロード・
 上限/拒否検知・既存ファイルからの再開) を土台に、
参照画像添付と ChatGPT ドライバを追加した自己完結版。

使い方:
  py -3.12 scripts/imagegen/run_queue.py                     # queue.json の pending を全消化
  py -3.12 scripts/imagegen/run_queue.py --only bow,thinking # 指定IDのみ
  py -3.12 scripts/imagegen/run_queue.py --site chatgpt      # サイト絞り込み
  py -3.12 scripts/imagegen/run_queue.py --smoke             # 先頭1件・1枚のみ

Chrome絶対ルール（pic/CLAUDE.md 準拠）:
  - CDP(9222) の常駐専用Chrome (chrome-automation プロファイル) に connect_over_cdp。
  - 自分が new_page() したタブのみ操作。既存タブは触らない。終了時は自タブのみ閉じる。
  - CDP不通時はChromeを起動せず報告して終了。
"""
import argparse, base64, datetime, hashlib, json, os, random, re, sys, time, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # repo root
HERE = os.path.dirname(os.path.abspath(__file__))
QUEUE = os.path.join(HERE, "queue.json")
OUTROOT = os.path.join(HERE, "output")
CDP = "http://localhost:9222"

QUOTA_RE = re.compile(r"(制限に達しました|利用上限|上限に達し|回数の上限|これ以上.*できません|quota|rate.?limit|try again later|後でもう一度|しばらくして|has reached|reached your|limit reached)", re.I)
REFUSE_RE = re.compile(r"(生成できません|お手伝いできません|対応していません|ポリシー|ガイドライン|policy|I can't|cannot create|can't generate|not able to)", re.I)


def log(msg):
    line = f"[{datetime.datetime.now().strftime('%H:%M:%S')}] {msg}"
    print(line, flush=True)
    with open(os.path.join(OUTROOT, "run_queue.log"), "a", encoding="utf-8") as f:
        f.write(line + "\n")


def cdp_up():
    try:
        with urllib.request.urlopen(CDP + "/json/version", timeout=4) as r:
            return r.status == 200
    except Exception:
        return False


def human_pause(page, lo=45, hi=75):
    s = random.randint(lo, hi)
    log(f"  wait {s}s (human-paced)")
    page.wait_for_timeout(s * 1000)


# ---------------------------------------------------------------- 共通部品

def big_images(page, min_px=400):
    """DOM内の生成画像候補 (src, w, h) を収集。

    srcパターンでは絞らない: ChatGPTは backend-api 経由等サイトごとに配信URLが
    変わる（実測: oaiusercontent 固定ではない）。natural寸法の閾値のみで判定し、
    アバター・アイコン類（小画像）を除外する。"""
    return page.evaluate("""(minPx) => {
        const out=[];
        document.querySelectorAll('img').forEach(im=>{
            const s=im.currentSrc||im.src||"";
            if(!s) return;
            const w=im.naturalWidth||im.width||0, h=im.naturalHeight||im.height||0;
            if(w>=minPx && h>=minPx) out.push({src:s,w,h});
        });
        return out;
    }""", min_px)


def download(page, src, out_path):
    """data直デコード → canvas → fetch → 要素スクショ の4段フォールバック（pic実証済み）。"""
    if src.startswith("data:image"):
        try:
            raw = base64.b64decode(src.split(",", 1)[1])
            if len(raw) > 3000:
                open(out_path, "wb").write(raw); return "data"
        except Exception:
            pass
    cv = page.evaluate("""(u)=>{const im=[...document.querySelectorAll('img')].find(i=>(i.currentSrc||i.src)===u);
        if(!im||!(im.naturalWidth>0))return null;try{const c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;
        c.getContext('2d').drawImage(im,0,0);return c.toDataURL('image/png').split(',')[1];}catch(e){return null;}}""", src)
    if cv:
        try:
            raw = base64.b64decode(cv)
            if len(raw) > 3000:
                open(out_path, "wb").write(raw); return "canvas"
        except Exception:
            pass
    b64 = page.evaluate("""async (u)=>{try{const r=await fetch(u,{credentials:'include'});const b=new Uint8Array(await r.arrayBuffer());
        let s='';for(let i=0;i<b.length;i++)s+=String.fromCharCode(b[i]);return btoa(s);}catch(e){return null;}}""", src)
    if b64:
        try:
            raw = base64.b64decode(b64)
            if len(raw) > 3000:
                open(out_path, "wb").write(raw); return "fetch"
        except Exception:
            pass
    try:
        h = page.evaluate_handle("""(u)=>{const im=[...document.querySelectorAll('img')].find(i=>(i.currentSrc||i.src)===u);
            if(im){im.style.position='fixed';im.style.left='0';im.style.top='0';im.style.zIndex='2147483647';im.style.background='#fff';im.style.maxHeight='none';}return im||null;}""", src)
        el = h.as_element()
        if el:
            page.wait_for_timeout(400)
            el.screenshot(path=out_path)
            page.evaluate("""(u)=>{const im=[...document.querySelectorAll('img')].find(i=>(i.currentSrc||i.src)===u);
                if(im){im.style.position='';im.style.left='';im.style.top='';im.style.zIndex='';im.style.maxHeight='';}}""", src)
            if os.path.exists(out_path) and os.path.getsize(out_path) > 3000:
                return "screenshot"
    except Exception as e:
        log(f"  screenshot fail {str(e)[:60]}")
    return None


def is_reference_echo(newfile, ref_path):
    """参照画像のエコー（添付画像がそのまま応答側に現れたもの）を判定。

    実測: fetch経由で取得されたエコーは参照とバイト同一。canvas再エンコードでも
    ファイルサイズが完全一致した事例があるため、サイズ一致も破棄条件に含める。"""
    if not ref_path or not os.path.exists(ref_path):
        return False
    try:
        nb = open(newfile, "rb").read()
        rb = open(ref_path, "rb").read()
    except OSError:
        return False
    if len(nb) == len(rb):
        return True
    return hashlib.sha1(nb).hexdigest() == hashlib.sha1(rb).hexdigest()


def is_duplicate(outdir, newfile):
    """保存済みファイルとバイト同一なら重複（同一画像がDOMに複数回現れる実測対策）。"""
    nh = hashlib.sha1(open(newfile, "rb").read()).hexdigest()
    for f in os.listdir(outdir):
        fp = os.path.join(outdir, f)
        if fp == newfile or not re.search(r"_\d+\.(png|jpg)$", f):
            continue
        if hashlib.sha1(open(fp, "rb").read()).hexdigest() == nh:
            return True
    return False


def attach_file(page, path):
    """コンポーザーの input[type=file] に参照画像をセット。表示/非表示問わず全候補を試す。"""
    inputs = page.locator('input[type="file"]')
    n = inputs.count()
    for i in range(n):
        try:
            inputs.nth(i).set_input_files(path, timeout=3000)
            page.wait_for_timeout(4000)  # サムネイル出現＝アップロード完了待ち
            return True
        except Exception:
            continue
    return False


def wait_new_images(page, baseline, max_ms, streaming_fn, min_px=400):
    """baseline以外の新画像がsrc安定＋ストリーミング終了で確定するまでポーリング。"""
    base = set(baseline)
    start = time.time(); last = None; stable_since = 0
    while (time.time() - start) * 1000 < max_ms:
        page.wait_for_timeout(4000)
        txt = ""
        try:
            txt = page.locator("body").first.inner_text()
        except Exception:
            pass
        if QUOTA_RE.search(txt or ""):
            return {"ok": False, "limited": True, "txt": (txt or "")[-800:]}
        fresh = [g for g in (big_images(page, min_px) or []) if g["src"] not in base]
        if fresh:
            cur = fresh[-1]["src"]
            st = streaming_fn(page)
            if cur == last:
                if not stable_since:
                    stable_since = time.time()
                if not st:
                    return {"ok": True, "srcs": [g["src"] for g in fresh]}
                if time.time() - stable_since > 20:
                    return {"ok": True, "srcs": [g["src"] for g in fresh]}
            else:
                last = cur; stable_since = 0
    if last:
        fresh = [g for g in (big_images(page, min_px) or []) if g["src"] not in base]
        return {"ok": True, "srcs": [g["src"] for g in fresh]}
    return {"ok": False, "timeout": True}


# ---------------------------------------------------------------- ChatGPT

def chatgpt_streaming(page):
    return page.locator('button[data-testid="stop-button"], button[aria-label*="停止"], button[aria-label*="Stop"]').first.is_visible(timeout=600)


def chatgpt_new_chat(page):
    page.goto("https://chatgpt.com/", wait_until="domcontentloaded", timeout=45000)
    page.wait_for_timeout(5000)


def chatgpt_send(page, prompt):
    inp = None
    for sel in ['#prompt-textarea', 'div[contenteditable="true"]', 'textarea']:
        el = page.locator(sel).first
        try:
            if el.is_visible(timeout=3000):
                inp = el; break
        except Exception:
            continue
    if not inp:
        return False
    inp.click(); page.wait_for_timeout(300)
    # 複数行プロンプトはtype()だと改行=Enterの解釈が環境依存になるためinsert_textで一括挿入
    page.keyboard.insert_text(prompt)
    page.wait_for_timeout(800)
    for sel in ['button[data-testid="send-button"]', 'button[aria-label*="送信"]',
                'button[aria-label*="Send"]', 'button#composer-submit-button']:
        b = page.locator(sel).first
        for _ in range(20):
            try:
                if b.is_visible(timeout=400) and b.is_enabled(timeout=400):
                    b.click(timeout=4000); return True
            except Exception:
                break
            page.wait_for_timeout(1000)
    page.keyboard.press("Enter")
    return True


def gen_chatgpt(page, asset, outdir, per_asset):
    prompt = asset["prompt"]
    ref = asset.get("reference")
    got = existing_count(outdir, asset["id"])
    refp = None
    if got:
        log(f"  resume: existing {got} files")
    limited = refused = False
    for attempt in range(1, per_asset + 1):
        if got >= per_asset:
            break
        chatgpt_new_chat(page)
        if ref:
            refp = ref if os.path.isabs(ref) else os.path.join(ROOT, ref)
            if attach_file(page, refp):
                log("  reference attached")
            else:
                log("  WARN: reference attach failed -> continue without ref")
                page.screenshot(path=os.path.join(outdir, f"attach_fail_a{attempt}.png"))
        tag = "" if attempt == 1 else f"（別バリエーション{attempt}。前回と同じキャラクター・作風で）"
        base = page.evaluate("()=>[...document.querySelectorAll('img')].map(i=>i.currentSrc||i.src||'')")
        if not chatgpt_send(page, prompt + tag):
            log("  send failed"); page.screenshot(path=os.path.join(outdir, f"send_fail_a{attempt}.png")); continue
        page.wait_for_timeout(3000)
        # ChatGPTの画像生成は数分かかることがある（実測: 360秒超あり）
        r = wait_new_images(page, base, 600000, chatgpt_streaming, min_px=500)
        if r.get("limited"):
            log(f"  QUOTA/LIMIT: {r.get('txt','')[:200]}")
            limited = True; break
        if not r.get("ok"):
            body = ""
            try: body = page.locator("body").inner_text()[-400:]
            except Exception: pass
            page.screenshot(path=os.path.join(outdir, f"noimg_a{attempt}.png"))
            log(f"  no image (timeout={r.get('timeout')}) tail={body.replace(chr(10),' ')[:150]}")
            if REFUSE_RE.search(body or ""):
                log("  refusal detected"); refused = True; break
            continue
        # 参照画像のエコー（送信メッセージ内サムネイル）を拾わないよう、
        # DOM後方＝新しい生成画像から優先して保存する
        for src in reversed(r["srcs"]):
            if got >= per_asset:
                break
            got += 1
            outp = os.path.join(outdir, f"{asset['id']}_{got:02d}.png")
            how = download(page, src, outp)
            if how and is_reference_echo(outp, refp if ref else None):
                os.remove(outp); got -= 1
                log("  skip reference echo")
            elif how and is_duplicate(outdir, outp):
                os.remove(outp); got -= 1
                log("  skip duplicate image")
            elif how:
                log(f"  saved {os.path.basename(outp)} via={how} bytes={os.path.getsize(outp)}")
            else:
                got -= 1; log("  download failed for one src")
        if attempt < per_asset and got < per_asset:
            human_pause(page)
    return {"got": got, "limited": limited, "refused": refused}


# ---------------------------------------------------------------- Gemini（pic実証セレクタ）

def gemini_attach(page, path):
    """Gemini: 「アップロードとツール」→「ファイルをアップロード」→file chooser（2026-07-12実測）。
    Geminiのコンポーザーは input[type=file] を常設しないため、メニュー経由で添付する。"""
    try:
        b = page.locator('button[aria-label="アップロードとツール"], button[aria-label*="アップロード"]').first
        if not b.is_visible(timeout=2500):
            return False
        b.click(); page.wait_for_timeout(800)
        item = page.locator('[role="menuitem"]:has-text("ファイルをアップロード"), button:has-text("ファイルをアップロード")').first
        with page.expect_file_chooser(timeout=6000) as fc:
            item.click()
        fc.value.set_files(path)
        page.wait_for_timeout(5000)  # サムネイル出現＝アップロード完了待ち
        return True
    except Exception as e:
        log(f"  gemini attach fail {str(e)[:80]}")
        try:
            page.keyboard.press("Escape")
        except Exception:
            pass
        return False


def gemini_streaming(page):
    return page.locator('button[aria-label="停止"], button[aria-label="回答を停止"], button[aria-label*="Stop"]').first.is_visible(timeout=600)


def gemini_is_logged_in(page):
    login = page.locator('a:has-text("ログイン"), a:has-text("Sign in")').first
    try:
        if login.is_visible(timeout=2000):
            return False
    except Exception:
        pass
    return page.locator('rich-textarea, [data-ogsr-up]').first.is_visible(timeout=2500)


def gemini_new_chat(page):
    for sel in ['a[aria-label="チャットを新規作成"]', 'button[aria-label="チャットを新規作成"]',
                'a[aria-label*="新規"]', 'button[aria-label*="New chat"]']:
        b = page.locator(sel).first
        try:
            if b.is_visible(timeout=1000):
                b.click(); page.wait_for_timeout(1500); return True
        except Exception:
            continue
    return False


def gemini_send(page, prompt):
    inp = None
    for sel in ['rich-textarea div[contenteditable="true"]', 'div.ql-editor[contenteditable="true"]',
                'div[contenteditable="true"]']:
        el = page.locator(sel).first
        try:
            if el.is_visible(timeout=2000):
                inp = el; break
        except Exception:
            continue
    if not inp:
        return False
    inp.click(); page.wait_for_timeout(200)
    page.keyboard.press("Control+a"); page.keyboard.press("Backspace"); page.wait_for_timeout(200)
    page.keyboard.insert_text(prompt)
    page.wait_for_timeout(500)
    for sel in ['button[aria-label="プロンプトを送信"]', 'button[aria-label="送信"]',
                'button[aria-label="Send message"]', 'button[aria-label*="送信"]']:
        b = page.locator(sel).first
        for _ in range(30):
            try:
                if b.is_visible(timeout=400) and b.is_enabled(timeout=400):
                    b.click(timeout=4000); return True
            except Exception:
                break
            page.wait_for_timeout(1000)
    page.keyboard.press("Enter")
    return True


def gen_gemini(page, asset, outdir, per_asset):
    prompt = asset["prompt"]
    ref = asset.get("reference")
    got = existing_count(outdir, asset["id"])
    refp = None
    if got:
        log(f"  resume: existing {got} files")
    limited = refused = False
    for attempt in range(1, per_asset + 1):
        if got >= per_asset:
            break
        gemini_new_chat(page); page.wait_for_timeout(1500)
        page.keyboard.press("Escape")
        if ref:
            refp = ref if os.path.isabs(ref) else os.path.join(ROOT, ref)
            if attach_file(page, refp) or gemini_attach(page, refp):
                log("  reference attached")
            else:
                log("  WARN: reference attach failed -> continue without ref")
        tag = "" if attempt == 1 else f"（別バリエーション{attempt}。同じキャラクター・同じ作風で）"
        msg = f"次の内容で画像を生成して: {prompt}{tag}"
        base = page.evaluate("()=>[...document.querySelectorAll('img')].map(i=>i.currentSrc||i.src||'')")
        if not gemini_send(page, msg):
            log("  send failed"); continue
        page.wait_for_timeout(2500)
        r = wait_new_images(page, base, 240000, gemini_streaming, min_px=400)
        if r.get("limited"):
            log(f"  QUOTA/LIMIT: {r.get('txt','')[:200]}")
            limited = True; break
        if not r.get("ok"):
            body = ""
            try: body = page.locator("body").inner_text()[-300:]
            except Exception: pass
            page.screenshot(path=os.path.join(outdir, f"noimg_a{attempt}.png"))
            log(f"  no image (timeout={r.get('timeout')}) tail={body.replace(chr(10),' ')[:150]}")
            if REFUSE_RE.search(body or ""):
                log("  refusal detected"); refused = True; break
            continue
        for src in reversed(r["srcs"]):
            if got >= per_asset:
                break
            got += 1
            outp = os.path.join(outdir, f"{asset['id']}_{got:02d}.png")
            how = download(page, src, outp)
            if how and is_reference_echo(outp, refp if ref else None):
                os.remove(outp); got -= 1
                log("  skip reference echo")
            elif how and is_duplicate(outdir, outp):
                os.remove(outp); got -= 1
                log("  skip duplicate image")
            elif how:
                log(f"  saved {os.path.basename(outp)} via={how} bytes={os.path.getsize(outp)}")
            else:
                got -= 1; log("  download failed for one src")
        if attempt < per_asset and got < per_asset:
            human_pause(page)
    return {"got": got, "limited": limited, "refused": refused}


# ---------------------------------------------------------------- キュー処理

def existing_count(outdir, aid):
    if not os.path.isdir(outdir):
        return 0
    return len([f for f in os.listdir(outdir) if re.match(rf"{re.escape(aid)}_\d+\.(png|jpg)$", f)])


def load_queue():
    with open(QUEUE, "r", encoding="utf-8") as f:
        q = json.load(f)
    # 基準プロンプト＋ポーズ指定を合成。個別promptがあればそれを優先。
    for a in q["assets"]:
        if not a.get("prompt"):
            a["prompt"] = q["base_prompt"].replace("{pose}", a.get("pose", ""))
        if not a.get("reference"):
            a["reference"] = q.get("reference_default")
    return q


def save_meta(outdir, asset, result):
    meta_path = os.path.join(outdir, "meta.json")
    meta = {}
    if os.path.exists(meta_path):
        try:
            meta = json.load(open(meta_path, encoding="utf-8"))
        except Exception:
            meta = {}
    meta.update({
        "id": asset["id"], "site": asset["site"], "prompt": asset["prompt"],
        "reference": asset.get("reference"), "spec": asset.get("spec", {}),
        "last_run": datetime.datetime.now().isoformat(timespec="seconds"),
        "result": result,
        "files": sorted([f for f in os.listdir(outdir) if re.match(r".+_\d+\.(png|jpg)$", f)]),
    })
    # curation欄は既存値を温存（キュレーションはcurate側が書く）
    meta.setdefault("curation", {})
    json.dump(meta, open(meta_path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default="", help="カンマ区切りの資産ID")
    ap.add_argument("--site", default="", choices=["", "chatgpt", "gemini"])
    ap.add_argument("--per-asset", type=int, default=0, help="1資産あたりの目標枚数（0=queue.jsonのspec.count、既定2）")
    ap.add_argument("--smoke", action="store_true")
    args = ap.parse_args()

    os.makedirs(OUTROOT, exist_ok=True)
    if not cdp_up():
        print("CDP不通。C:\\Users\\kanet\\20260522\\pic\\scripts\\start_chrome_cdp.bat の実行が必要（Chromeは起動しません）。")
        sys.exit(3)

    queue = load_queue()
    assets = [a for a in queue["assets"] if a.get("status", "pending") == "pending"]
    if args.only:
        ids = set(args.only.split(","))
        assets = [a for a in queue["assets"] if a["id"] in ids]
    if args.site:
        assets = [a for a in assets if a["site"] == args.site]
    if args.smoke:
        assets = assets[:1]
    if not assets:
        print("対象資産なし"); return

    from playwright.sync_api import sync_playwright
    results = {}
    with sync_playwright() as p:
        browser = p.chromium.connect_over_cdp(CDP)
        page = browser.contexts[0].new_page()  # 自分のタブのみ
        try:
            gemini_ready = None
            for i, asset in enumerate(assets):
                aid = asset["id"]
                per = args.per_asset or asset.get("spec", {}).get("count", 2)
                if args.smoke:
                    per = 1
                outdir = os.path.join(OUTROOT, aid)
                os.makedirs(outdir, exist_ok=True)
                log(f"=== {aid} site={asset['site']} per={per} ===")
                if asset["site"] == "gemini":
                    if gemini_ready is None:
                        page.goto("https://gemini.google.com/app", wait_until="domcontentloaded", timeout=45000)
                        page.wait_for_timeout(3500)
                        gemini_ready = gemini_is_logged_in(page)
                        if not gemini_ready:
                            log("Gemini NOT LOGGED IN -> gemini資産をスキップ")
                    if not gemini_ready:
                        results[aid] = {"got": 0, "note": "not_logged_in"}; continue
                    r = gen_gemini(page, asset, outdir, per)
                else:
                    r = gen_chatgpt(page, asset, outdir, per)
                results[aid] = r
                save_meta(outdir, asset, r)
                if r.get("limited"):
                    log(f"{aid} limit hit -> 同サイトの残りをスキップして続行")
                    # 上限が出たサイトの残り資産はスキップ
                    assets = [a for a in assets if a["site"] != asset["site"] or a["id"] == aid]
                if i < len(assets) - 1:
                    human_pause(page)
        finally:
            page.wait_for_timeout(500)
            try:
                page.close()
            except Exception:
                pass
    log("RESULTS=" + json.dumps(results, ensure_ascii=False))
    log("DONE")


if __name__ == "__main__":
    main()
