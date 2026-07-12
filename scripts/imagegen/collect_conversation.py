# -*- coding: utf-8 -*-
"""既存のChatGPT/Gemini会話から生成済み画像を回収する（クォータ節約用）。

タイムアウトや中断で取り逃した画像を、会話URLを開き直して保存する。
  py -3.12 scripts/imagegen/collect_conversation.py <会話URL> <資産ID>
例:
  py -3.12 scripts/imagegen/collect_conversation.py https://chatgpt.com/c/xxxx bow
"""
import os, re, sys, time
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
OUTROOT = os.path.join(HERE, "output")
sys.path.insert(0, HERE)
from run_queue import big_images, download, chatgpt_streaming, existing_count, log  # noqa: E402


def main():
    if len(sys.argv) < 3:
        print(__doc__); sys.exit(1)
    url, aid = sys.argv[1], sys.argv[2]
    outdir = os.path.join(OUTROOT, aid)
    os.makedirs(outdir, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.connect_over_cdp("http://localhost:9222")
        page = browser.contexts[0].new_page()
        try:
            page.goto(url, wait_until="domcontentloaded", timeout=45000)
            page.wait_for_timeout(6000)
            # 生成継続中なら完了まで待つ（最大10分）
            start = time.time()
            while time.time() - start < 600:
                imgs = big_images(page, 500) or []
                if imgs and not chatgpt_streaming(page):
                    break
                page.wait_for_timeout(5000)
            imgs = big_images(page, 500) or []
            if not imgs:
                page.screenshot(path=os.path.join(outdir, "collect_noimg.png"))
                log(f"collect {aid}: no image found"); return
            got = existing_count(outdir, aid)
            # DOM後方（=新しい応答）から取得。参照画像エコーを避ける
            for g in reversed(imgs):
                if got >= 4:
                    break
                got += 1
                outp = os.path.join(outdir, f"{aid}_{got:02d}.png")
                how = download(page, g["src"], outp)
                if how:
                    log(f"collect {aid}: saved {os.path.basename(outp)} via={how} bytes={os.path.getsize(outp)} ({g['w']}x{g['h']})")
                else:
                    got -= 1
        finally:
            try: page.close()
            except Exception: pass
    log("collect DONE")


if __name__ == "__main__":
    main()
